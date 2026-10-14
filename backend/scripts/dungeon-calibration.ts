// 副本校准（v62，虎牢关）：同为 1000 人口的后勤兵 / 辎重车对照，输出通关率、波次结果、副将与宝物价值。
// 目标（占位，见 docs/dungeon-hulao-pass.md「校准计划」）：中期合理编成通关率约 50–70%，乱配兵明显更低，单一兵种不能稳定通关。

import assert from 'node:assert/strict';
import { seededRng } from '../common/src/arena';
import { armyPopulation, checkDungeonLineup, DUNGEONS, type DungeonHero } from '../common/src/dungeon';
import { runDungeon } from '../common/src/dungeon-run';
import type { TroopKind } from '../common/src/protocol';

type Army = Partial<Record<TroopKind, number>>;

const RUNS = 400;
const def = DUNGEONS.hulao;
const hero = (name: string, lead: number, force: number, wit: number, equipment: string | null = null): DungeonHero => ({ id: name, name, lead, force, wit, equipment });

// 武将档位：中期普通将（约 35 级前后加点后）/ 名将
const MID = hero('中期主将', 50, 50, 45);
const MID_DEP = [hero('副将甲', 40, 40, 35), hero('副将乙', 35, 35, 40)];
const FAMOUS = hero('名将', 65, 65, 60);
const FAMOUS_DEP = [hero('名将副将甲', 55, 55, 50), hero('名将副将乙', 50, 50, 55)];

// 支援兵先替换骑兵，超过 25 小队 / 车后再缩减步弓；组间也有兵种构成差异，不能只归因于救治。
function mixedArmy(kind: 'medic' | 'supply_wagon', count: number): Army {
  const combat = 1000 - count * 6;
  const foot = Math.min(850, combat);
  const swordsman = Math.floor(foot * 300 / 850);
  const pikeman = Math.floor(foot * 300 / 850);
  return { swordsman, pikeman, archer: foot - swordsman - pikeman, cavalry: combat - foot, [kind]: count };
}

const ARMIES: Array<[string, Army]> = [
  ['合理混编，不带支援', mixedArmy('medic', 0)],
  ...[2, 5, 10, 20, 25, 30, 50, 80, 100, 150, 166].flatMap((count): Array<[string, Army]> => [
    [`合理混编 + 后勤${count}`, mixedArmy('medic', count)],
    [`合理混编 + 辎重${count}（不救治）`, mixedArmy('supply_wagon', count)],
  ]),
  ['纯刀盾', { swordsman: 1000 }],
  ['纯长枪', { pikeman: 1000 }],
  ['纯弓箭', { archer: 1000 }],
  ['纯轻骑', { cavalry: 1000 }],
  ['纯义兵（乱配）', { militia: 1000 }],
];

for (const [label, troops] of ARMIES) {
  assert.equal(armyPopulation(troops), 1000, label);
  assert.equal(checkDungeonLineup(def, MID.id, MID_DEP.map((hero) => hero.id), troops), null, label);
}

function run(label: string, troops: Army, main: DungeonHero, deputies: DungeonHero[]): number {
  let cleared = 0;
  const reached = new Array(def.waves.length).fill(0);
  const popAfter = new Array(def.waves.length).fill(0);
  for (let i = 0; i < RUNS; i += 1) {
    const r = runDungeon({ def, troops, main, deputies, retreatBelowPercent: null, rng: seededRng(90_000 + i) });
    if (r.outcome === 'cleared') cleared += 1;
    for (const w of r.waves) {
      if (w.won) {
        reached[w.wave - 1] += 1;
        popAfter[w.wave - 1] += armyPopulation(w.survivors) + armyPopulation(w.healed);
      }
    }
  }
  const pass = reached.map((n) => `${Math.round((n / RUNS) * 100)}%`.padStart(5)).join(' ');
  const pop = popAfter.map((p, i) => String(reached[i] ? Math.round(p / reached[i]) : 0).padStart(5)).join(' ');
  const rate = (cleared / RUNS) * 100;
  process.stdout.write(`| ${label} | ${armyPopulation(troops)} | ${rate.toFixed(1)}% | ${pass} | ${pop} |\n`);
  return rate;
}

for (const [tier, main, deputies] of [['中期（主 50/50/45，副将 40 档）', MID, MID_DEP], ['名将（主 65/65/60，副将 50 档）', FAMOUS, FAMOUS_DEP]] as Array<[string, DungeonHero, DungeonHero[]]>) {
  process.stdout.write(`\n### ${tier}\n\n| 编成 | 人口 | 通关率 | 各波通过率（1..6） | 各波后平均剩余人口 |\n| --- | ---: | ---: | --- | --- |\n`);
  for (const [label, army] of ARMIES) run(label, army, main, deputies);
}

process.stdout.write('\n### 副将与宝物的价值（中期主将，合理混编 + 后勤2）\n\n| 配置 | 人口 | 通关率 | 各波通过率 | 各波后剩余 |\n| --- | ---: | ---: | --- | --- |\n');
const army = mixedArmy('medic', 2);
run('只有主将', army, MID, []);
run('主将 + 1 副将', army, MID, MID_DEP.slice(0, 1));
run('主将 + 2 副将', army, MID, MID_DEP);
run('主将带七星宝刀 + 2 副将', army, { ...MID, equipment: 'qixing_blade' }, MID_DEP);
