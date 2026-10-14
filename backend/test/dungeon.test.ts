import assert from 'node:assert/strict';
import test from 'node:test';
import type { TroopKind } from '../common/src/protocol';
import { seededRng, fightRound } from '../common/src/arena';
import {
  armyPopulation,
  checkDungeonLineup,
  combatPopulation,
  dungeonBonus,
  DEPUTY_CAP_PERCENT,
  DUNGEONS,
  MEDIC_POP_PER_UNIT,
  MEDIC_MAX_SHARE,
  type DungeonHero,
} from '../common/src/dungeon';
import { medicHeal, rollTreasure, runDungeon } from '../common/src/dungeon-run';
import { battleBonusOf, type AccountHeroRow } from '../common/src/hero-db';
import { heroBattleBonus } from '../common/src/hero';
import { itemDefView, itemMarchPercent, ITEM_DEFS } from '../common/src/items';

const def = DUNGEONS.hulao;
const hero = (id: string, lead: number, force: number, wit: number, equipment: string | null = null): DungeonHero => ({ id, name: id, lead, force, wit, equipment });
const MAIN = hero('main', 50, 50, 45);
const DEPUTIES = [hero('d1', 40, 40, 35), hero('d2', 35, 35, 40)];
const ARMY = { swordsman: 300, pikeman: 300, archer: 250, cavalry: 88, medic: 2 };

test('人口按兵种人口计；战斗兵人口不含民夫、辎重车与后勤兵', () => {
  assert.equal(armyPopulation({ swordsman: 10, iron_cavalry: 2, supply_wagon: 1, medic: 1 }), 10 + 6 + 6 + 6);
  assert.equal(combatPopulation({ swordsman: 10, porter: 5, supply_wagon: 1, medic: 3 }), 10);
});

test('编成校验：武将数、重复武将、空部队、人口上限', () => {
  assert.equal(checkDungeonLineup(def, 'a', ['b', 'c'], { swordsman: 1000 }), null);
  assert.equal(checkDungeonLineup(def, 'a', ['b', 'c', 'd'], { swordsman: 10 }), 'DUNGEON_HERO_LIMIT');
  assert.equal(checkDungeonLineup(def, 'a', ['a'], { swordsman: 10 }), 'INVALID_PARAMS');
  assert.equal(checkDungeonLineup(def, 'a', [], { swordsman: -1 }), 'INVALID_PARAMS');
  assert.equal(checkDungeonLineup(def, 'a', [], { swordsman: 1.5 }), 'INVALID_PARAMS');
  assert.equal(checkDungeonLineup(def, 'a', [], { swordsman: Number.MAX_SAFE_INTEGER + 1 }), 'INVALID_PARAMS');
  assert.equal(checkDungeonLineup(def, 'a', [], { unknown: 1 } as never), 'INVALID_PARAMS');
  assert.equal(checkDungeonLineup(def, 'a', [], { supply_wagon: 3 }), 'INVALID_PARAMS');
  assert.equal(checkDungeonLineup(def, 'a', [], { medic: 3 }), 'INVALID_PARAMS');
  assert.equal(checkDungeonLineup(def, 'a', [], { swordsman: 1001 }), 'DUNGEON_POP_LIMIT');
  assert.equal(checkDungeonLineup(def, 'a', [], { swordsman: 995, supply_wagon: 1 }), 'DUNGEON_POP_LIMIT');
});

test('副将：武力 / 智力加成 × 25% 加到全军，合计封顶 10%；副将统率 × 10 计入满额带兵数', () => {
  const solo = dungeonBonus(MAIN, [], 1000);
  const withDeps = dungeonBonus(MAIN, DEPUTIES, 1000);
  // 副将甲 40 武 → 12% × 0.25 = 3%；副将乙 35 武 → 10.5% × 0.25 = 2.625%
  assert.equal(withDeps.deputies.atkPercent, 5.6);
  assert.ok(withDeps.engine.atkPercent > solo.engine.atkPercent);
  assert.equal(withDeps.main.leadCap, Math.floor((50 + (40 + 35) / 2) * 20));
  const strong = dungeonBonus(MAIN, [hero('s1', 80, 80, 80, 'qixing_blade'), hero('s2', 80, 80, 80)], 1000);
  assert.equal(strong.deputies.atkPercent, DEPUTY_CAP_PERCENT);
  assert.equal(strong.deputies.defPercent, DEPUTY_CAP_PERCENT);
  // 主将超编被摊薄，副将部分不摊薄
  const diluted = dungeonBonus(hero('weak', 10, 50, 45), DEPUTIES, 2000);
  assert.ok(diluted.main.scale < 1);
  assert.equal(diluted.deputies.atkPercent, withDeps.deputies.atkPercent);
});

test('后勤兵救治：每小队至多 20 人口，且不超过该波阵亡人口的 30%', () => {
  assert.deepEqual(medicHeal({ swordsman: 100 }, 0), {});
  assert.deepEqual(medicHeal({ swordsman: 100 }, 1), { swordsman: MEDIC_POP_PER_UNIT });
  assert.deepEqual(medicHeal({ swordsman: 100 }, 10), { swordsman: 30 });
  const mixed = medicHeal({ swordsman: 300, iron_cavalry: 100 }, 10);
  assert.deepEqual(mixed, { swordsman: 90, iron_cavalry: 30 });
  assert.equal(armyPopulation(mixed), 180);
  assert.ok((mixed.iron_cavalry ?? 0) <= 100);
});

test('只有存活后勤兵在胜利的非末波救治，辎重车不提供救治', () => {
  const run = (troops: Partial<Record<TroopKind, number>>) =>
    runDungeon({ def, troops, main: MAIN, deputies: DEPUTIES, retreatBelowPercent: null, rng: seededRng(90000) });
  const medical = run(ARMY);
  const transport = run({ swordsman: 300, pikeman: 300, archer: 250, cavalry: 88, supply_wagon: 2 });
  assert.ok(medical.waves.some((wave) => armyPopulation(wave.healed) > 0), '后勤兵必须实际救回战损');
  assert.ok(transport.waves.some((wave) => wave.won && armyPopulation(wave.losses) > 0 && (wave.survivors.supply_wagon ?? 0) > 0));
  assert.ok(transport.waves.every((wave) => armyPopulation(wave.healed) === 0), '即使辎重车存活也不能救治');
  for (const wave of medical.waves) {
    assert.ok(armyPopulation(wave.healed) <= (wave.survivors.medic ?? 0) * MEDIC_POP_PER_UNIT);
    assert.ok(armyPopulation(wave.healed) <= Math.floor(armyPopulation(wave.losses) * MEDIC_MAX_SHARE));
    if (!wave.won || wave.wave === def.waves.length) assert.equal(armyPopulation(wave.healed), 0);
  }
});

test('通关、战败、撤退均只返还幸存部队，有无后勤兵都不再返还伤兵', () => {
  const strong = hero('main', 80, 80, 80);
  const deputies = [hero('d1', 60, 60, 60), hero('d2', 60, 60, 60)];
  for (const kind of ['medic', 'supply_wagon'] as const) {
    const troops = { swordsman: 300, pikeman: 300, archer: 250, cavalry: 138, [kind]: 2 };
    const cases = [
      { troops, main: strong, deputies, retreatBelowPercent: null, seed: 90000, outcome: 'cleared' },
      { troops: { militia: 1, [kind]: 2 }, main: MAIN, deputies: [], retreatBelowPercent: null, seed: 7, outcome: 'defeated' },
      { troops, main: MAIN, deputies: DEPUTIES, retreatBelowPercent: 99, seed: 11, outcome: 'retreated' },
    ];
    for (const scenario of cases) {
      const result = runDungeon({ ...scenario, def, rng: seededRng(scenario.seed) });
      assert.equal(result.outcome, scenario.outcome);
      assert.deepEqual(result.woundedReturned, {});
      assert.deepEqual(result.returning, result.survivors);
      assert.ok(armyPopulation(result.returning) < armyPopulation(scenario.troops), '阵亡必须产生永久损失');
    }
  }
});

test('连续结算：固定种子可复算；兵力逐波延续；返程 = 幸存', () => {
  const run = () => runDungeon({ def, troops: ARMY, main: MAIN, deputies: DEPUTIES, retreatBelowPercent: null, rng: seededRng(4242) });
  const a = run();
  assert.deepEqual(a, run());
  for (let i = 1; i < a.waves.length; i += 1) {
    const prev = a.waves[i - 1];
    const expected = { ...prev.survivors };
    for (const [kind, n] of Object.entries(prev.healed)) {
      expected[kind as keyof typeof expected] = (expected[kind as keyof typeof expected] ?? 0) + (n ?? 0);
    }
    assert.deepEqual(a.waves[i].troops, expected);
  }
  assert.equal(a.wavesWon, a.waves.filter((w) => w.won).length);
  assert.deepEqual(a.woundedReturned, {});
  assert.deepEqual(a.returning, a.survivors);
});

test('战败即停；乱配兵打不过；奖励只算打赢的波次', () => {
  const r = runDungeon({ def, troops: { militia: 1000 }, main: MAIN, deputies: [], retreatBelowPercent: null, rng: seededRng(7) });
  assert.equal(r.outcome, 'defeated');
  assert.ok(r.waves.length < def.waves.length);
  const expectedGold = def.waves.slice(0, r.wavesWon).reduce((s, w) => s + w.reward.gold, 0);
  assert.equal(r.waveRewards.gold, expectedGold);
});

test('自动撤退：打赢一波后战斗兵低于阈值就不再打下一波', () => {
  const r = runDungeon({ def, troops: ARMY, main: MAIN, deputies: DEPUTIES, retreatBelowPercent: 99, rng: seededRng(11) });
  assert.equal(r.outcome, 'retreated');
  assert.equal(r.waves.length, 1);
  assert.ok(r.waves[0].won);
});

test('宝物：首通必掉；之后按概率；掉落在宝物池内', () => {
  for (let i = 0; i < 50; i += 1) {
    const id = rollTreasure(def, true, seededRng(i));
    assert.ok(id && def.treasures.includes(id));
  }
  let drops = 0;
  for (let i = 0; i < 4000; i += 1) {
    if (rollTreasure(def, false, seededRng(100_000 + i))) drops += 1;
  }
  assert.ok(Math.abs(drops / 4000 - def.treasureChance) < 0.015, `掉落率 ${drops / 4000}`);
});

test('宝物在大地图战斗加成里生效：攻击 / 减伤不占 20% 封顶，统率提高满额带兵数', () => {
  const row = { id: 'h', famous: false, specialty: null, lead: 50, force: 80, wit: 80, equip_def: null } as unknown as AccountHeroRow;
  const plain = battleBonusOf(row, 1000);
  const blade = battleBonusOf({ ...row, equip_def: 'qixing_blade' }, 1000);
  const book = battleBonusOf({ ...row, equip_def: 'dongzhuo_book' }, 1000);
  assert.equal(plain?.atkPercent, 20);
  assert.equal(blade?.atkPercent, 25);
  assert.equal(book?.leadCap, (50 + 5) * 20);
  // 超编时宝物同样摊薄
  const over = battleBonusOf({ ...row, equip_def: 'qixing_blade' }, 2000);
  assert.equal(over?.atkPercent, Math.round((heroBattleBonus({ lead: 50, force: 80, wit: 80 }, 2000).atkPercent + 5 * 0.5) * 10) / 10);
});

test('宝物在竞技场 / 将星塔生效；固定种子下装备方更强', () => {
  const base = { name: 'A', lead: 50, force: 50, wit: 50, level: 10 };
  let plain = 0;
  let armed = 0;
  for (let i = 0; i < 200; i += 1) {
    if (fightRound(base, base, seededRng(300 + i)).challengerWon) plain += 1;
    if (fightRound({ ...base, equipment: 'qixing_blade' }, base, seededRng(300 + i)).challengerWon) armed += 1;
  }
  assert.ok(armed > plain, `${armed} > ${plain}`);
});

test('宝物定义：视图与行军速度', () => {
  assert.equal(itemMarchPercent('dawan_horse'), 15);
  assert.equal(itemMarchPercent(null), 0);
  assert.equal(itemDefView('nope'), null);
  for (const id of Object.keys(ITEM_DEFS)) {
    assert.equal(itemDefView(id)?.def, id);
  }
});
