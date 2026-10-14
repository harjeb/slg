import assert from 'node:assert/strict';
import test from 'node:test';
import { Op, type HeroView } from '../src/api/protocol';
import type { DungeonRulesView } from '../src/api/protocol-dungeon';
import { setActiveCityId, withActiveCity } from '../src/api/cityScope';
import { armyPopulation, combatPopulation } from '../src/components/dungeon/format';
import { DUNGEON_COPY } from '../src/copy-dungeon';
import { DUNGEON_COPY_EN } from '../src/copy-dungeon-en';
import { dungeonPreview } from '../src/components/dungeon/preview';

const rules = { deputyLeadTroopsPerPoint: 10, deputyShare: 0.25, deputyCapPercent: 10 } as DungeonRulesView;
const hero = (lead: number, force: number, wit: number, effect = {}): HeroView => ({
  lead, force, wit, bonus: { leadCap: (lead + ('lead' in effect ? Number(effect.lead) : 0)) * 20 },
  equipment: { effect },
} as HeroView);

test('后勤兵计入出征人口但不计入战斗人口，规则文案使用新救治字段', () => {
  assert.equal(armyPopulation({ swordsman: 10, medic: 2, supply_wagon: 1 }), 28);
  assert.equal(combatPopulation({ swordsman: 10, medic: 2, supply_wagon: 1 }), 10);
  assert.equal(combatPopulation({ medic: 2, supply_wagon: 1 }), 0);
  const medicalRules = { popLimit: 1000, maxHeroes: 3, medicPopPerWagon: 0, medicPopPerUnit: 20, medicMaxShare: 0.3, woundedReturnShare: 0, treasureChance: 0.05 };
  assert.match(DUNGEON_COPY.info.rules(medicalRules), /后勤兵.*20.*辎重车不救治/);
  assert.match(DUNGEON_COPY.info.rules(medicalRules), /不返还伤兵/);
  assert.match(DUNGEON_COPY_EN.info.rules(medicalRules), /no post-battle wounded refund/);
  assert.match(DUNGEON_COPY_EN.info.rules(medicalRules), /medical team.*20.*supply wagons do not heal/);
});

test('dungeon departure injects selected city and respects an explicit city', () => {
  setActiveCityId('branch');
  try {
    assert.deepEqual(withActiveCity(Op.ENTER_DUNGEON, { dungeonId: 'hulao' }), { dungeonId: 'hulao', cityId: 'branch' });
    assert.deepEqual(withActiveCity(Op.ENTER_DUNGEON, { cityId: 'explicit' }), { cityId: 'explicit' });
    assert.deepEqual(withActiveCity(Op.GET_DUNGEON, {}), {});
  } finally {
    setActiveCityId(null);
  }
  assert.deepEqual(withActiveCity(Op.ENTER_DUNGEON, {}), {});
});

test('commander book increases capacity but deputy book does not', () => {
  const preview = dungeonPreview(hero(20, 40, 40, { lead: 5 }), [hero(10, 40, 40, { lead: 100 })], rules, { militia: 1200 });
  assert.equal(preview.capacity, 600);
  assert.equal(preview.scale, 0.5);
  assert.equal(preview.atkPercent, 9);
  assert.equal(preview.defPercent, 9);
});

test('deputies contribute capped global equipment bonuses without dilution', () => {
  const deputy = hero(0, 100, 100, { atkPercent: 10, defPercent: 10 });
  const preview = dungeonPreview(hero(10, 100, 100, { atkPercent: 5 }), [deputy, deputy], rules, { militia: 400 });
  assert.equal(preview.atkPercent, 22.5);
  assert.equal(preview.defPercent, 20);
});

test('mount troop bonuses do not become global bonuses; capacity counts troops, not population', () => {
  const mount = { troopBonuses: { cavalry: { atkPercent: 10, defPercent: 4 } }, marchSpeedPercent: 20 };
  const preview = dungeonPreview(hero(10, 40, 40, mount), [hero(0, 0, 0, mount)], rules, { iron_cavalry: 100, supply_wagon: 100 });
  assert.equal(preview.scale, 1);
  assert.equal(preview.atkPercent, 12);
  assert.equal(preview.defPercent, 12);
});
