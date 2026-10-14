// 副本到达结算（v61，虎牢关）：purpose='dungeon' 的行军到达入口时由 world-tick 分发到这里，在同一事务内：
// 连续结算 6 波（common/src/dungeon-run.ts，种子存进结果可复算）→ 逐波 / 通关资源进出发城 → 通关记首通并判定宝物
// （首通必掉、全服播报）→ 武将经验（全部参战武将各得一份；战败全员重伤）→ 幸存兵随主将 / 副将返程 →
// 写挑战结果、行军完成事件与推送。出发城已由调用方按锁序锁定并结算生产（settled）。

import pg from 'pg';
import { randomInt } from 'node:crypto';
import { EventType, RESOURCE_KEYS, type InitiatorRole, type Resources, type TroopKind } from '../../common/src/protocol';
import { insertEvent } from '../../common/src/events';
import { seededRng } from '../../common/src/arena';
import { DUNGEONS, checkDungeonLineup, isDungeonId, type DungeonHero } from '../../common/src/dungeon';
import { rollTreasure, runDungeon, type DungeonRunResult } from '../../common/src/dungeon-run';
import { cancelDungeonRunByMarch, lockDungeonRunByMarch, recordDungeonClear, resolveDungeonRun } from '../../common/src/dungeon-db';
import { grantItem } from '../../common/src/item-db';
import { grantHeroExp, woundHero } from '../../common/src/hero-db';
import { WOUND_HOURS } from '../../common/src/hero';
import { scaledMs } from '../../common/src/time-scale';
import { insertServerBroadcast } from '../../common/src/server-broadcast';
import type { DungeonHeroView, DungeonWaveResultView } from '../../common/src/protocol-dungeon';
import {
  abortMarchToReturn,
  completeMarchEvent,
  creditLoot,
  createReturnMarch,
  loadCityNaming,
  markMarchArrived,
  type MarchRow,
  type TileNotify,
} from './tick-shared';

function toHero(view: DungeonHeroView): DungeonHero {
  return { id: view.id, name: view.name, lead: view.lead, force: view.force, wit: view.wit, specialty: view.specialty, equipment: view.equipment };
}

function waveViews(result: DungeonRunResult): DungeonWaveResultView[] {
  return result.waves.map((w) => ({
    wave: w.wave,
    name: w.name,
    won: w.won,
    rounds: w.rounds,
    endReason: w.endReason,
    troops: w.troops,
    losses: w.losses,
    survivors: w.survivors,
    enemyTroops: w.enemyTroops,
    enemyLosses: w.enemyLosses,
    healed: w.healed,
    bonus: {
      mainAtkPercent: w.bonus.main.atkPercent,
      mainDefPercent: w.bonus.main.defPercent,
      deputyAtkPercent: w.bonus.deputies.atkPercent,
      deputyDefPercent: w.bonus.deputies.defPercent,
      scale: w.bonus.main.scale,
    },
  }));
}

/** 全部参战武将：经验各得一份（歼灭敌军参考战力，战败减半）；战败全员重伤 */
async function settleHeroes(
  client: pg.PoolClient,
  march: MarchRow,
  heroes: DungeonHeroView[],
  exp: number,
  defeated: boolean,
  notifies: TileNotify[],
): Promise<void> {
  const woundedUntil = defeated ? new Date(Date.now() + scaledMs(WOUND_HOURS * 3_600_000)) : null;
  for (const hero of heroes) {
    const out = await grantHeroExp(client, hero.id, exp);
    if (!out) {
      continue;
    }
    if (out.leveledTo) {
      await insertEvent(client, {
        accountId: march.account_id,
        buildId: hero.id,
        type: EventType.HERO_LEVEL_UP,
        initiator: march.initiator as InitiatorRole,
        detail: { heroId: hero.id, heroName: hero.name, level: out.leveledTo },
      });
    }
    notifies.push({ reason: 'hero_state', accountId: march.account_id, data: { reason: 'exp_gained', heroId: hero.id, exp: { gained: exp, level: out.level, leveledTo: out.leveledTo } } });
    if (woundedUntil) {
      await woundHero(client, hero.id, woundedUntil);
      await insertEvent(client, {
        accountId: march.account_id,
        buildId: hero.id,
        type: EventType.HERO_WOUNDED,
        initiator: march.initiator as InitiatorRole,
        detail: { heroId: hero.id, heroName: hero.name, woundedUntil: woundedUntil.toISOString() },
      });
      notifies.push({ reason: 'hero_state', accountId: march.account_id, data: { reason: 'wounded', heroId: hero.id } });
    }
  }
}

export async function resolveDungeonArrival(
  client: pg.PoolClient,
  march: MarchRow,
  troops: Partial<Record<TroopKind, number>>,
  settled: { row: { x: number | null; y: number | null } | null },
  notifies: TileNotify[],
): Promise<void> {
  const run = await lockDungeonRunByMarch(client, march.id);
  if (!run || run.status !== 'marching' || !isDungeonId(run.dungeon_id)) {
    const returning = await abortMarchToReturn(client, march, troops, settled, notifies);
    const cancelled = await cancelDungeonRunByMarch(client, march.id, returning);
    if (cancelled) {
      notifies.push({ reason: 'dungeon_state', accountId: march.account_id, data: { reason: 'cancelled', runId: cancelled.id } });
    }
    return;
  }
  const def = DUNGEONS[run.dungeon_id];
  const main = run.heroes.find((h) => h.role === 'main');
  const deputyViews = run.heroes.filter((h) => h.role === 'deputy');
  if (!main || run.heroes.filter((h) => h.role === 'main').length !== 1 ||
      checkDungeonLineup(def, main.id, deputyViews.map((h) => h.id), march.troops ?? {})) {
    const returning = await abortMarchToReturn(client, march, troops, settled, notifies);
    const cancelled = await cancelDungeonRunByMarch(client, march.id, returning);
    if (cancelled) {
      notifies.push({ reason: 'dungeon_state', accountId: march.account_id, data: { reason: 'cancelled', runId: cancelled.id } });
    }
    return;
  }
  const deputies = deputyViews.map(toHero);
  notifies.push({ reason: 'dungeon_state', accountId: march.account_id, data: { reason: 'arrived', runId: Number(run.id) } });
  const seed = randomInt(0, 2 ** 31);
  const rng = seededRng(seed);
  const result = runDungeon({ def, troops, main: toHero(main), deputies, retreatBelowPercent: run.retreat_below, rng });

  const rewards: Resources = { ...result.waveRewards };
  let treasure: string | null = null;
  let firstClear = false;
  if (result.outcome === 'cleared') {
    for (const key of RESOURCE_KEYS) {
      rewards[key] += def.clearReward[key];
    }
    firstClear = await recordDungeonClear(client, march.account_id, def.id);
    await insertEvent(client, {
      accountId: march.account_id, cityId: march.from_city_id, buildId: march.id,
      type: EventType.DUNGEON_CLEARED, initiator: march.initiator as InitiatorRole,
      detail: { dungeonId: def.id, dungeonName: def.name, runId: Number(run.id), firstClear },
    });
    treasure = rollTreasure(def, firstClear, rng);
    if (treasure) {
      await grantItem(client, march.account_id, treasure, `dungeon:${def.id}`);
    }
    if (firstClear) {
      const naming = await loadCityNaming(client, march.from_city_id);
      const broadcast = await insertServerBroadcast(
        client,
        'dungeon_cleared',
        { username: naming?.username ?? '', dungeonId: def.id, dungeonName: def.name },
        { force: true },
      );
      if (broadcast) {
        notifies.push({ reason: 'server_broadcast', accountId: '', broadcast });
      }
    }
  }
  if (settled.row && RESOURCE_KEYS.some((key) => rewards[key] > 0)) {
    await creditLoot(client, march.from_city_id, rewards);
  }
  const exp = Math.floor(result.killedPower * (result.outcome === 'defeated' ? 0.5 : 1));
  await settleHeroes(client, march, run.heroes, exp, result.outcome === 'defeated', notifies);

  const returning = await createReturnMarch(client, march, result.returning, settled, march.initiator);
  await markMarchArrived(client, march.id);
  await resolveDungeonRun(client, run, {
    outcome: result.outcome,
    wavesWon: result.wavesWon,
    waves: waveViews(result),
    survivors: result.survivors,
    woundedReturned: result.woundedReturned,
    returning: result.returning,
    rewards,
    treasure,
    firstClear,
    heroExp: exp,
    seed,
  }, returning);
  await completeMarchEvent(client, march, `dungeon_${result.outcome}`, {
    dungeonId: def.id,
    runId: Number(run.id),
    wavesWon: result.wavesWon,
    troops,
    returningTroops: result.returning,
    returning,
    rewards,
    treasure,
    firstClear,
  });
  notifies.push({ reason: 'march_resolved', accountId: march.account_id, marchId: march.id });
  // 完整六波战报可能超过 NOTIFY 的 8 KB 载荷上限，API 收到 id 后读库。
  notifies.push({ reason: 'dungeon_state', accountId: march.account_id, data: { reason: 'resolved', runId: Number(run.id) } });
}
