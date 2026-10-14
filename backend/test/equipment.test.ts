import assert from 'node:assert/strict';
import test from 'node:test';
import { fightRound } from '../common/src/arena';
import { simulateBattle } from '../common/src/battle-engine';
import { battleBonusOf, type AccountHeroRow } from '../common/src/hero-db';
import { dungeonBonus, type DungeonHero } from '../common/src/dungeon';
import { withItemCombat } from '../common/src/items';
import { TROOP_KINDS } from '../common/src/protocol';

test('arena and tower shared round preserve horse effects for cavalry formations', () => {
  const base = { name: 'A', lead: 50, force: 50, wit: 50, level: 10, formation: 'cavalry' as const };
  const horse = { ...base, equipment: 'dawan_horse' };
  const fought = fightRound(horse, base, () => 0.5);
  const plain = fightRound(base, base, () => 0.5);
  assert.ok(fought.result.defender.damage < plain.result.defender.damage);
});

const main: DungeonHero = { id: 'm', name: 'm', lead: 10, force: 50, wit: 50 };
const deputy: DungeonHero = { id: 'd', name: 'd', lead: 10, force: 50, wit: 50 };

test('deputy horse and book are inert, including diluted leadership capacity', () => {
  const plain = dungeonBonus(main, [deputy], 1000);
  for (const equipment of ['dawan_horse', 'dongzhuo_book']) {
    assert.deepEqual(dungeonBonus(main, [{ ...deputy, equipment }], 1000), plain);
  }
  const blade = dungeonBonus(main, [{ ...deputy, equipment: 'qixing_blade' }], 1000);
  assert.equal(blade.main.leadCap, plain.main.leadCap);
  assert.equal(blade.deputies.atkPercent, 5);
});

test('horse changes cavalry damage only on both combat sides; all other troop kinds unchanged', () => {
  const plain = { atkPercent: 0, defPercent: 0 };
  const horse = withItemCombat(plain, 'dawan_horse', 1);
  assert.equal(horse.defPercent, 0);
  for (const kind of TROOP_KINDS) {
    for (const side of ['attackerHero', 'defenderHero'] as const) {
      const run = (bonus: typeof horse) => simulateBattle({ [kind]: 100 }, { [kind]: 100 }, {
        [side]: bonus, rng: () => 0.5, maxRounds: 12,
      });
      const base = run(plain);
      const equipped = run(horse);
      if (kind === 'cavalry' || kind === 'iron_cavalry') {
        const enemy = side === 'attackerHero' ? 'defender' : 'attacker';
        assert.ok(equipped[enemy].damage < base[enemy].damage, `${side} ${kind}`);
      } else {
        assert.deepEqual(equipped, base, `${side} ${kind}`);
      }
    }
  }
});

test('world and dungeon carry identically diluted horse effects into the shared engine', () => {
  const row = { id: 'h', famous: false, specialty: null, lead: 10, force: 50, wit: 50, equip_def: 'dawan_horse' } as unknown as AccountHeroRow;
  const world = battleBonusOf(row, 1000);
  const dungeon = dungeonBonus({ ...main, equipment: 'dawan_horse' }, [], 1000);
  assert.deepEqual(world?.troopBonuses, dungeon.engine.troopBonuses);
  assert.equal(world?.troopBonuses?.cavalry?.defPercent, 0.6);
  assert.equal(world?.troopBonuses?.iron_cavalry?.defPercent, 0.6);
  assert.equal(dungeon.engine.defPercent, dungeonBonus(main, [], 1000).engine.defPercent);
});
