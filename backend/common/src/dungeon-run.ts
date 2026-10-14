// 副本连续结算（v63）：到达后一次性打完 6 波（或中途战败 / 自动撤退）。纯函数，随机源由调用方注入（战报存种子可复算）。
// - 兵力延续：每波结束后的幸存兵数进入下一波；余伤池不跨波。主将加成每波按当时部队规模重新摊薄。
// - 后勤兵救治：打赢一波后（最后一波除外），每单位存活后勤兵救回至多 MEDIC_POP_PER_UNIT 人口，且不超过该波阵亡人口 × MEDIC_MAX_SHARE；
//   按各兵种阵亡人口比例分配、逐兵种向下取整。
// - 自动撤退：打赢一波后（最后一波除外），战斗兵人口 < 出发时 × retreatBelowPercent% 则不再打下一波。
// - 战后仅幸存部队返程，未被波间救回的阵亡不再返还。
// 规则数值见 dungeon.ts，设计见 docs/dungeon-hulao-pass.md。

import { simulateBattle, type BattleResult } from './battle-engine';
import { armyPower } from './battle';
import { TROOP_INFO } from './troops';
import { RESOURCE_KEYS, TROOP_KINDS, type Resources, type TroopKind } from './protocol';
import {
  armyPopulation,
  combatPopulation,
  dungeonBonus,
  enemyBonus,
  MEDIC_MAX_SHARE,
  MEDIC_POP_PER_UNIT,
  type DungeonBonus,
  type DungeonDef,
  type DungeonHero,
} from './dungeon';

type Army = Partial<Record<TroopKind, number>>;

export interface DungeonWaveResult {
  wave: number;
  name: string;
  won: boolean;
  rounds: number;
  endReason: BattleResult['endReason'];
  /** 本波开战时我方部队 */
  troops: Army;
  losses: Army;
  survivors: Army;
  enemyTroops: Army;
  enemyLosses: Army;
  /** 本波打完后后勤兵救回的兵（没救为空） */
  healed: Army;
  /** 本波生效的加成（主将 / 副将分开，便于战报展示） */
  bonus: DungeonBonus;
  /** 本波歼灭敌军参考战力（武将经验用） */
  killedPower: number;
}

export type DungeonOutcome = 'cleared' | 'defeated' | 'retreated';

export interface DungeonRunResult {
  outcome: DungeonOutcome;
  /** 打赢的波数 */
  wavesWon: number;
  waves: DungeonWaveResult[];
  /** 出发时部队 */
  troops: Army;
  /** 结束时幸存 */
  survivors: Army;
  /** @deprecated v63 取消伤兵返还；为兼容旧战报保留，新结果恒为空编队 */
  woundedReturned: Army;
  /** 随部队返程的兵力 = survivors */
  returning: Army;
  /** 打赢各波的资源合计（不含通关奖励与宝物） */
  waveRewards: Resources;
  /** 全程歼灭敌军参考战力（武将经验用） */
  killedPower: number;
}

const ZERO_RESOURCES: Resources = { gold: 0, wood: 0, food: 0, stone: 0, iron: 0 };

function clean(army: Army): Army {
  const out: Army = {};
  for (const kind of TROOP_KINDS) {
    const n = Math.max(0, Math.floor(army[kind] ?? 0));
    if (n > 0) {
      out[kind] = n;
    }
  }
  return out;
}

function diff(a: Army, b: Army): Army {
  const out: Army = {};
  for (const kind of TROOP_KINDS) {
    const n = Math.max(0, Math.floor(a[kind] ?? 0) - Math.floor(b[kind] ?? 0));
    if (n > 0) {
      out[kind] = n;
    }
  }
  return out;
}

function sum(a: Army, b: Army): Army {
  const out: Army = {};
  for (const kind of TROOP_KINDS) {
    const n = Math.floor(a[kind] ?? 0) + Math.floor(b[kind] ?? 0);
    if (n > 0) {
      out[kind] = n;
    }
  }
  return out;
}

function headcount(army: Army): number {
  return TROOP_KINDS.reduce((total, kind) => total + Math.max(0, Math.floor(army[kind] ?? 0)), 0);
}

/** 后勤兵救治：按阵亡人口比例分配可救人口，逐兵种向下取整（不会超过该兵种阵亡数） */
export function medicHeal(dead: Army, aliveMedics: number): Army {
  const deadPop = armyPopulation(dead);
  const budget = Math.min(Math.max(0, aliveMedics) * MEDIC_POP_PER_UNIT, Math.floor(deadPop * MEDIC_MAX_SHARE));
  if (budget <= 0 || deadPop <= 0) {
    return {};
  }
  const out: Army = {};
  for (const kind of TROOP_KINDS) {
    const count = Math.floor(dead[kind] ?? 0);
    if (count <= 0) {
      continue;
    }
    const pop = TROOP_INFO[kind].population;
    const share = (count * pop) / deadPop;
    const healed = Math.min(count, Math.floor((budget * share) / pop));
    if (healed > 0) {
      out[kind] = healed;
    }
  }
  return out;
}

export interface DungeonRunInput {
  def: DungeonDef;
  troops: Army;
  main: DungeonHero;
  deputies: DungeonHero[];
  /** 1..99；null = 不自动撤退 */
  retreatBelowPercent: number | null;
  rng: () => number;
}

export function runDungeon(input: DungeonRunInput): DungeonRunResult {
  const { def, main, deputies, retreatBelowPercent, rng } = input;
  const start = clean(input.troops);
  const startCombatPop = combatPopulation(start);
  let current = start;
  const waves: DungeonWaveResult[] = [];
  const rewards: Resources = { ...ZERO_RESOURCES };
  let outcome: DungeonOutcome = 'cleared';
  let killedPower = 0;

  for (let i = 0; i < def.waves.length; i += 1) {
    const wave = def.waves[i];
    const bonus = dungeonBonus(main, deputies, headcount(current));
    const result = simulateBattle(current, wave.troops, {
      siege: wave.siege,
      wallDefensePercent: wave.wallDefensePercent,
      attackerHero: bonus.engine,
      defenderHero: enemyBonus(wave.general),
      rng,
    });
    const survivors = clean(result.attacker.survivors);
    const dead = diff(current, survivors);
    const won = result.attackerWon;
    const last = i === def.waves.length - 1;
    const healed = won && !last ? medicHeal(dead, survivors.medic ?? 0) : {};
    const power = armyPower(result.defender.losses);
    killedPower += power;
    waves.push({
      wave: i + 1,
      name: wave.name,
      won,
      rounds: result.rounds,
      endReason: result.endReason,
      troops: current,
      losses: clean(result.attacker.losses),
      survivors,
      enemyTroops: clean(wave.troops),
      enemyLosses: clean(result.defender.losses),
      healed,
      bonus,
      killedPower: power,
    });
    current = sum(survivors, healed);
    if (!won) {
      outcome = 'defeated';
      break;
    }
    for (const key of RESOURCE_KEYS) {
      rewards[key] += wave.reward[key];
    }
    if (!last && retreatBelowPercent !== null && combatPopulation(current) * 100 < startCombatPop * retreatBelowPercent) {
      outcome = 'retreated';
      break;
    }
  }

  return {
    outcome,
    wavesWon: waves.filter((w) => w.won).length,
    waves,
    troops: start,
    survivors: current,
    woundedReturned: {},
    returning: current,
    waveRewards: rewards,
    killedPower,
  };
}

/** 宝物判定：首通必掉；之后按 treasureChance。返回宝物定义 id 或 null */
export function rollTreasure(def: DungeonDef, firstClear: boolean, rng: () => number): string | null {
  if (def.treasures.length === 0) {
    return null;
  }
  if (!firstClear && rng() >= def.treasureChance) {
    return null;
  }
  return def.treasures[Math.min(def.treasures.length - 1, Math.floor(rng() * def.treasures.length))];
}
