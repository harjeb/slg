// 副本规则（v63，第一个副本：虎牢关）：地图上的固定地点，派 1 名主将 + 最多 2 名副将、人口合计不超过
// 上限的真实部队进入，到达后一次性连续迎战 6 波，最后一波是据城墙的董卓。兵力逐波延续，波间只有后勤兵
// 能救回部分阵亡；打赢的每一波都给资源，通关再给通关资源并判定稀有宝物（首通必掉）。
// 本文件只放定义、数值（全部占位，见 docs/dungeon-hulao-pass.md）与加成合成；连续结算在 dungeon-run.ts。
// API（编成校验 / 视图）与 Worker（到达结算）共用，两侧不得各自另算。

import { heroBattleBonus, ATK_PERCENT_PER_FORCE, DEF_PERCENT_PER_WIT, HERO_BONUS_CAP_PERCENT, type HeroAttrs } from './hero';
import { itemCombat, itemLead, withItemCombat } from './items';
import { TROOP_INFO } from './troops';
import { TROOP_KINDS, type Resources, type TroopKind } from './protocol';
import type { HeroCombatBonus } from './battle-engine';

type Army = Partial<Record<TroopKind, number>>;

export const DUNGEON_IDS = ['hulao'] as const;
export type DungeonId = (typeof DUNGEON_IDS)[number];

export function isDungeonId(value: unknown): value is DungeonId {
  return typeof value === 'string' && (DUNGEON_IDS as readonly string[]).includes(value);
}

// ---- 通用数值（占位） ----

/** 武将数上限：1 名主将 + 最多 2 名副将 */
export const DUNGEON_MAX_HEROES = 3;
/** 副将折算比例：副将自身的武力 / 智力加成（含宝物攻击 / 减伤）× 该比例加到全军 */
export const DEPUTY_SHARE = 0.25;
/** 副将加成合计上限（百分数，攻击、减伤各自封顶；不占主将的 20% 封顶） */
export const DEPUTY_CAP_PERCENT = 10;
/** 每名副将让满额带兵数增加 统率 × 该值（主将为 统率 × 20） */
export const DEPUTY_LEAD_TROOPS_PER_POINT = 10;
/** 后勤兵医疗小队：每单位存活的后勤兵每波最多救回的人口（占位） */
export const MEDIC_POP_PER_UNIT = 20;
/** 单波救回总量不超过该波阵亡人口的比例 */
export const MEDIC_MAX_SHARE = 0.3;
/** @deprecated v63 取消战后伤兵返还；旧协议字段保留且恒为 0 */
export const WOUNDED_RETURN_SHARE = 0;

// ---- 副本定义 ----

export interface DungeonEnemyGeneral extends HeroAttrs {
  name: string;
}

export interface DungeonWave {
  name: string;
  general: DungeonEnemyGeneral;
  troops: Army;
  /** 攻城战：守方据城墙（仅最后一波） */
  siege: boolean;
  /** 城墙减伤（百分数；非攻城为 0） */
  wallDefensePercent: number;
  /** 打赢该波得到的资源 */
  reward: Resources;
}

export interface DungeonDef {
  id: DungeonId;
  name: string;
  /** 部队人口上限 */
  popLimit: number;
  /** 每人每天次数 */
  dailyAttempts: number;
  /** 入口在地图上的目标位置（按世界尺寸的比例；实际地块取离它最近的空闲野地） */
  anchor: { fx: number; fy: number };
  waves: DungeonWave[];
  /** 通关额外资源 */
  clearReward: Resources;
  /** 宝物池（定义 id，等概率） */
  treasures: string[];
  /** 非首通时每次通关掉宝物的概率 */
  treasureChance: number;
}

const res = (gold: number, each: number): Resources => ({ gold, wood: each, food: each, stone: each, iron: each });

export const DUNGEONS: Readonly<Record<DungeonId, DungeonDef>> = {
  hulao: {
    id: 'hulao',
    name: '虎牢关',
    popLimit: 1000,
    dailyAttempts: 5,
    // 洛阳（名城锚点在 5/6, 1/6）以西一段距离
    anchor: { fx: 0.72, fy: 0.2 },
    waves: [
      { name: '西凉先锋', general: { name: '胡轸', lead: 35, force: 35, wit: 25 }, troops: { militia: 500, cavalry: 150 }, siege: false, wallDefensePercent: 0, reward: res(200, 300) },
      { name: '西凉弓骑', general: { name: '徐荣', lead: 40, force: 35, wit: 35 }, troops: { archer: 300, cavalry: 150 }, siege: false, wallDefensePercent: 0, reward: res(300, 450) },
      { name: '华雄', general: { name: '华雄', lead: 45, force: 60, wit: 25 }, troops: { swordsman: 250, pikeman: 250 }, siege: false, wallDefensePercent: 0, reward: res(400, 600) },
      { name: '李傕、郭汜', general: { name: '李傕', lead: 50, force: 45, wit: 40 }, troops: { pikeman: 160, swordsman: 160, archer: 160, cavalry: 90 }, siege: false, wallDefensePercent: 0, reward: res(500, 750) },
      { name: '吕布', general: { name: '吕布', lead: 60, force: 100, wit: 30 }, troops: { iron_cavalry: 60, cavalry: 260 }, siege: false, wallDefensePercent: 0, reward: res(700, 1_000) },
      { name: '董卓', general: { name: '董卓', lead: 70, force: 40, wit: 60 }, troops: { swordsman: 100, archer: 90, ballista: 10 }, siege: true, wallDefensePercent: 30, reward: res(1_000, 1_500) },
    ],
    clearReward: res(1_000, 1_500),
    treasures: ['qixing_blade', 'dawan_horse', 'dongzhuo_book'],
    treasureChance: 0.05,
  },
};

// ---- 编成 ----

/** 部队人口（按兵种人口计） */
export function armyPopulation(troops: Army): number {
  let total = 0;
  for (const kind of TROOP_KINDS) {
    total += Math.max(0, Math.floor(troops[kind] ?? 0)) * TROOP_INFO[kind].population;
  }
  return total;
}

/** 战斗兵人口（不含民夫、辎重车与后勤兵；自动撤退按它判定） */
export function combatPopulation(troops: Army): number {
  return armyPopulation({ ...troops, porter: 0, supply_wagon: 0, medic: 0 });
}

export type DungeonLineupError = 'DUNGEON_HERO_LIMIT' | 'DUNGEON_POP_LIMIT' | 'INVALID_PARAMS';

/** 编成的纯规则校验（武将数、去重、部队非空、人口上限）；武将归属 / 状态与库存由调用方另查 */
export function checkDungeonLineup(def: DungeonDef, mainHeroId: string, deputyHeroIds: string[], troops: Army): DungeonLineupError | null {
  if (Object.entries(troops).some(([kind, count]) => !(TROOP_KINDS as readonly string[]).includes(kind) || !Number.isSafeInteger(count) || count < 0)) {
    return 'INVALID_PARAMS';
  }
  const ids = [mainHeroId, ...deputyHeroIds];
  if (ids.length > DUNGEON_MAX_HEROES) {
    return 'DUNGEON_HERO_LIMIT';
  }
  if (new Set(ids).size !== ids.length) {
    return 'INVALID_PARAMS';
  }
  if (combatPopulation(troops) <= 0) {
    return 'INVALID_PARAMS';
  }
  return armyPopulation(troops) > def.popLimit ? 'DUNGEON_POP_LIMIT' : null;
}

// ---- 主将与副将加成 ----

/** 参战武将（结算快照） */
export interface DungeonHero extends HeroAttrs {
  id: string;
  name: string;
  specialty?: import('./hero-specialty').HeroSpecialty | null;
  /** 宝物定义 id */
  equipment?: string | null;
}

export interface DungeonBonus {
  /** 传给战斗引擎的合成加成 */
  engine: HeroCombatBonus;
  /** 主将部分（已含宝物与统率摊薄） */
  main: { atkPercent: number; defPercent: number; scale: number; leadCap: number };
  /** 副将部分（已封顶） */
  deputies: { atkPercent: number; defPercent: number };
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * 主将 + 副将 → 一组加成。主将按现有规则（含宝物、统率摊薄、特长）；满额带兵数 = 主将统率（含宝物）× 20 +
 * 每名副将基础统率 × 10。副将只折算全局攻击 / 减伤装备；装备统率、兵种效果、坐骑速度不生效。
 * 副将：(武力加成 + 宝物攻击) × 25%、(智力加成 + 宝物减伤) × 25%，合计各封顶 10%，不摊薄。
 */
export function dungeonBonus(main: DungeonHero, deputies: DungeonHero[], troopCount: number): DungeonBonus {
  const deputyLead = deputies.reduce((sum, d) => sum + d.lead, 0);
  const effectiveLead = main.lead + itemLead(main.equipment) + deputyLead * (DEPUTY_LEAD_TROOPS_PER_POINT / 20);
  const base = heroBattleBonus({ lead: effectiveLead, force: main.force, wit: main.wit }, troopCount);
  const equipped = withItemCombat(base, main.equipment, base.scale);
  const mainAtk = equipped.atkPercent;
  const mainDef = equipped.defPercent;
  let depAtk = 0;
  let depDef = 0;
  for (const d of deputies) {
    const dItem = itemCombat(d.equipment);
    depAtk += (Math.min(HERO_BONUS_CAP_PERCENT, d.force * ATK_PERCENT_PER_FORCE) + dItem.atkPercent) * DEPUTY_SHARE;
    depDef += (Math.min(HERO_BONUS_CAP_PERCENT, d.wit * DEF_PERCENT_PER_WIT) + dItem.defPercent) * DEPUTY_SHARE;
  }
  const deputyPart = { atkPercent: round1(Math.min(DEPUTY_CAP_PERCENT, depAtk)), defPercent: round1(Math.min(DEPUTY_CAP_PERCENT, depDef)) };
  return {
    engine: {
      troopBonuses: equipped.troopBonuses,
      atkPercent: round1(mainAtk + deputyPart.atkPercent),
      defPercent: round1(mainDef + deputyPart.defPercent),
      specialty: main.specialty ?? null,
      specialtyScale: base.scale,
    },
    main: { atkPercent: mainAtk, defPercent: mainDef, scale: base.scale, leadCap: base.leadCap },
    deputies: deputyPart,
  };
}

/** 敌将加成（不摊薄、无宝物、无特长） */
export function enemyBonus(general: DungeonEnemyGeneral): HeroCombatBonus {
  const bonus = heroBattleBonus(general);
  return { atkPercent: bonus.atkPercent, defPercent: bonus.defPercent };
}
