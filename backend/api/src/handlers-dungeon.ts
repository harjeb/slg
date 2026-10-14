// 副本协议（v61，虎牢关）：GET_DUNGEON / ENTER_DUNGEON / GET_DUNGEON_REPORTS；宝物协议在 handlers-items.ts，
// 两者经 routeDungeonOp 分派（从 handlers.ts 拆出以控制单文件行数）。
// ENTER_DUNGEON 与 MARCH 同锁序（cities → dungeon_progress），在事务内：校验编成 / 次数 / 武将 / 驻军 → 扣驻军 → 建行军
// （purpose='dungeon'，hero_id = 主将、deputy_hero_ids = 副将）→ 建挑战记录 → 扣次数。到达结算在 Worker（dungeon-tick.ts）。

import pg from 'pg';
import { EventType, Op, TROOP_KINDS, type InitiatorRole, type TroopKind } from '../../common/src/protocol';
import { insertEvent } from '../../common/src/events';
import { marchTravelSeconds } from '../../common/src/world';
import { marchingPercent } from '../../common/src/tech';
import { canDeployMore } from '../../common/src/building-effects';
import {
  checkDungeonLineup,
  DEPUTY_CAP_PERCENT,
  DEPUTY_LEAD_TROOPS_PER_POINT,
  DEPUTY_SHARE,
  DUNGEONS,
  DUNGEON_IDS,
  DUNGEON_MAX_HEROES,
  enemyBonus,
  isDungeonId,
  MEDIC_MAX_SHARE,
  MEDIC_POP_PER_UNIT,
  WOUNDED_RETURN_SHARE,
} from '../../common/src/dungeon';
import {
  consumeDungeonAttempt,
  dungeonRunView,
  insertDungeonRun,
  loadActiveDungeonRun,
  loadDungeonProgress,
  loadDungeonRuns,
  loadDungeonSites,
  lockDungeonProgress,
} from '../../common/src/dungeon-db';
import { itemDefView, itemMarchPercent } from '../../common/src/items';
import type { AccountHeroRow } from '../../common/src/hero-db';
import type { DungeonHeroView, DungeonView } from '../../common/src/protocol-dungeon';
import type { ItemDefView } from '../../common/src/protocol-item';
import type { ErrorCode } from '../../common/src/protocol';
import { readLimitOrNull, readOptionalNonNegativeInt, respondError, respondOk } from './frames';
import type { HandlerContext } from './handlers';
import type { ConnInfo } from './connections';
import { deployCountOf, loadCityState, lockCitySnapshot, marchView, type MarchRow } from './views';
import { checkHeroMarchable } from './handlers-hero';
import { handleEquipItem, handleGetItems, handleSellItem, handleUnequipItem } from './handlers-items';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function routeDungeonOp(
  ctx: HandlerContext,
  conn: ConnInfo,
  op: number,
  seq: number | undefined,
  data: Record<string, unknown> | undefined,
): Promise<void> {
  switch (op) {
    case Op.GET_DUNGEON:
      return handleGetDungeon(ctx, conn, op, seq);
    case Op.ENTER_DUNGEON:
      return handleEnterDungeon(ctx, conn, op, seq, data);
    case Op.GET_DUNGEON_REPORTS:
      return handleGetDungeonReports(ctx, conn, op, seq, data);
    case Op.GET_ITEMS:
      return handleGetItems(ctx, conn, op, seq);
    case Op.EQUIP_ITEM:
      return handleEquipItem(ctx, conn, op, seq, data);
    case Op.UNEQUIP_ITEM:
      return handleUnequipItem(ctx, conn, op, seq, data);
    case Op.SELL_ITEM:
      return handleSellItem(ctx, conn, op, seq, data);
  }
}

async function handleGetDungeon(ctx: HandlerContext, conn: ConnInfo, op: number, seq: number | undefined): Promise<void> {
  const accountId = conn.accountId as string;
  const sites = await loadDungeonSites(ctx.pool);
  const progress = await loadDungeonProgress(ctx.pool, accountId);
  const dungeons: DungeonView[] = [];
  for (const id of DUNGEON_IDS) {
    const site = sites.get(id);
    if (!site) {
      continue;
    }
    const def = DUNGEONS[id];
    const p = progress.get(id);
    const active = await loadActiveDungeonRun(ctx.pool, accountId, id);
    dungeons.push({
      id,
      name: def.name,
      x: site.x,
      y: site.y,
      rules: {
        popLimit: def.popLimit,
        maxHeroes: DUNGEON_MAX_HEROES,
        dailyAttempts: def.dailyAttempts,
        deputyShare: DEPUTY_SHARE,
        deputyCapPercent: DEPUTY_CAP_PERCENT,
        deputyLeadTroopsPerPoint: DEPUTY_LEAD_TROOPS_PER_POINT,
        medicPopPerWagon: 0,
        medicPopPerUnit: MEDIC_POP_PER_UNIT,
        medicMaxShare: MEDIC_MAX_SHARE,
        woundedReturnShare: WOUNDED_RETURN_SHARE,
        treasureChance: def.treasureChance,
      },
      waves: def.waves.map((w, i) => {
        const bonus = enemyBonus(w.general);
        return {
          wave: i + 1,
          name: w.name,
          general: { ...w.general, atkPercent: bonus.atkPercent, defPercent: bonus.defPercent },
          troops: { ...w.troops },
          siege: w.siege,
          wallDefensePercent: w.wallDefensePercent,
          reward: { ...w.reward },
        };
      }),
      clearReward: { ...def.clearReward },
      treasures: def.treasures.map(itemDefView).filter((v): v is ItemDefView => v !== null),
      attemptsLeft: Math.max(0, def.dailyAttempts - (p?.usedToday ?? 0)),
      firstClearedAt: p?.firstClearedAt ? p.firstClearedAt.toISOString() : null,
      clears: p?.clears ?? 0,
      active: active ? dungeonRunView(active) : null,
    });
  }
  respondOk(ctx.registry, conn, op, seq, { dungeons });
}

interface EnterParams {
  dungeonId: (typeof DUNGEON_IDS)[number];
  mainHeroId: string;
  deputyHeroIds: string[];
  troops: Partial<Record<TroopKind, number>>;
  retreatBelow: number | null;
}

/** 参数解析：格式不对返回 null（INVALID_PARAMS） */
export function readEnterDungeonParams(data: Record<string, unknown> | undefined): EnterParams | null {
  const dungeonId = data?.dungeonId;
  const mainHeroId = data?.mainHeroId;
  if (!isDungeonId(dungeonId) || typeof mainHeroId !== 'string' || !UUID_RE.test(mainHeroId)) {
    return null;
  }
  const rawDeputies = data?.deputyHeroIds ?? [];
  if (!Array.isArray(rawDeputies) || !rawDeputies.every((id) => typeof id === 'string' && UUID_RE.test(id))) {
    return null;
  }
  const rawTroops = data?.troops;
  if (rawTroops === null || typeof rawTroops !== 'object' || Array.isArray(rawTroops)) {
    return null;
  }
  const troops: Partial<Record<TroopKind, number>> = {};
  for (const [key, value] of Object.entries(rawTroops as Record<string, unknown>)) {
    if (!(TROOP_KINDS as readonly string[]).includes(key) || typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      return null;
    }
    troops[key as TroopKind] = value;
  }
  let retreatBelow: number | null = null;
  if (data?.retreatBelowPercent !== undefined && data?.retreatBelowPercent !== null) {
    const r = data.retreatBelowPercent;
    if (typeof r !== 'number' || !Number.isInteger(r) || r < 1 || r > 99) {
      return null;
    }
    retreatBelow = r;
  }
  return { dungeonId, mainHeroId, deputyHeroIds: rawDeputies as string[], troops, retreatBelow };
}

function heroSnapshot(row: AccountHeroRow, role: 'main' | 'deputy'): DungeonHeroView {
  return {
    role,
    id: row.id,
    name: row.name,
    lead: row.lead,
    force: row.force,
    wit: row.wit,
    specialty: row.famous ? null : row.specialty ?? null,
    equipment: row.equip_def ?? null,
  };
}

class EnterReject extends Error {
  constructor(readonly code: ErrorCode, readonly withCity = true) {
    super(code);
  }
}

async function handleEnterDungeon(
  ctx: HandlerContext,
  conn: ConnInfo,
  op: number,
  seq: number | undefined,
  data: Record<string, unknown> | undefined,
): Promise<void> {
  const params = readEnterDungeonParams(data);
  if (!params) {
    respondError(ctx.registry, conn, op, seq, 'INVALID_PARAMS');
    return;
  }
  const def = DUNGEONS[params.dungeonId];
  const lineupError = checkDungeonLineup(def, params.mainHeroId, params.deputyHeroIds, params.troops);
  if (lineupError) {
    respondError(ctx.registry, conn, op, seq, lineupError);
    return;
  }
  const accountId = conn.accountId as string;
  const role = conn.role as InitiatorRole;
  const client = await ctx.pool.connect();
  try {
    await client.query('BEGIN');
    const out = await enterInTx(client, accountId, role, params);
    await client.query('COMMIT');
    const view = marchView(out.march);
    respondOk(ctx.registry, conn, op, seq, { march: view, run: out.run, attemptsLeft: out.attemptsLeft });
    ctx.registry.broadcast(accountId, { op: Op.PUSH_DUNGEON_STATE, push: true, data: { reason: 'started', run: out.run } });
    ctx.registry.broadcast(accountId, { op: Op.PUSH_MARCH_STATE, push: true, data: { reason: 'march_started', march: view } }, conn);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (err instanceof EnterReject) {
      const cityState = err.withCity ? await loadCityState(ctx.pool, accountId) : null;
      respondError(ctx.registry, conn, op, seq, err.code, cityState ? { city: cityState } : undefined);
      return;
    }
    throw err;
  } finally {
    client.release();
  }
}

async function enterInTx(client: pg.PoolClient, accountId: string, role: InitiatorRole, params: EnterParams) {
  const def = DUNGEONS[params.dungeonId];
  // 锁序：cities → dungeon_progress（与 MARCH 一致先锁城）
  const snap = await lockCitySnapshot(client, accountId);
  if (!snap || snap.x === null || snap.y === null) {
    throw new EnterReject('INTERNAL', false);
  }
  if (!canDeployMore(deployCountOf(snap), snap.levels.parade_ground)) {
    throw new EnterReject('DEPLOY_LIMIT');
  }
  const site = (await loadDungeonSites(client)).get(params.dungeonId);
  if (!site) {
    throw new EnterReject('INVALID_PARAMS', false);
  }
  const progress = await lockDungeonProgress(client, accountId, params.dungeonId);
  if (progress.usedToday >= def.dailyAttempts) {
    throw new EnterReject('DUNGEON_NO_ATTEMPTS', false);
  }
  if (await loadActiveDungeonRun(client, accountId, params.dungeonId)) {
    throw new EnterReject('DUNGEON_IN_PROGRESS', false);
  }
  const heroes: AccountHeroRow[] = [];
  for (const heroId of [params.mainHeroId, ...params.deputyHeroIds]) {
    const verdict = await checkHeroMarchable(client, accountId, heroId);
    if (!verdict.ok) {
      throw new EnterReject(verdict.code);
    }
    heroes.push(verdict.hero);
  }
  for (const kind of TROOP_KINDS) {
    if ((params.troops[kind] ?? 0) > (snap.army[kind] ?? 0)) {
      throw new EnterReject('INSUFFICIENT_TROOPS');
    }
  }
  for (const [kind, count] of Object.entries(params.troops)) {
    if ((count ?? 0) > 0) {
      await client.query(`UPDATE city_army SET count = count - $3, updated_at = now() WHERE city_id = $1 AND troop = $2`, [snap.cityId, kind, count]);
      await client.query(`DELETE FROM city_army WHERE city_id = $1 AND troop = $2 AND count <= 0`, [snap.cityId, kind]);
    }
  }
  const main = heroes[0];
  const travel = marchTravelSeconds(snap.x, snap.y, site.x, site.y, params.troops, marchingPercent(snap.techs) + itemMarchPercent(main.equip_def));
  const nowRes = await client.query(`SELECT now() AS now`);
  const arriveAt = new Date((nowRes.rows[0].now as Date).getTime() + travel * 1000);
  const deputyIds = heroes.slice(1).map((h) => h.id);
  const ins = await client.query(
    `INSERT INTO marches (account_id, from_city_id, x, y, troops, purpose, status, initiator, arrive_at, hero_id, deputy_hero_ids)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'dungeon', 'marching', $6, $7, $8, $9::uuid[]) RETURNING *`,
    [accountId, snap.cityId, site.x, site.y, JSON.stringify(params.troops), role, arriveAt.toISOString(), main.id, deputyIds.length ? deputyIds : null],
  );
  const march = ins.rows[0] as MarchRow;
  const runRow = await insertDungeonRun(client, {
    accountId,
    dungeonId: params.dungeonId,
    marchId: march.id,
    fromCityId: snap.cityId,
    heroes: heroes.map((h, i) => heroSnapshot(h, i === 0 ? 'main' : 'deputy')),
    troops: params.troops,
    retreatBelow: params.retreatBelow,
  });
  await consumeDungeonAttempt(client, accountId, params.dungeonId, progress.usedToday);
  await insertEvent(client, {
    accountId,
    cityId: snap.cityId,
    buildId: march.id,
    type: EventType.MARCH_STARTED,
    initiator: role,
    detail: {
      x: site.x, y: site.y, troops: params.troops, purpose: 'dungeon', task: null, targetCityId: null,
      dungeonId: params.dungeonId, arriveAt: march.arrive_at.toISOString(),
      heroId: main.id, heroName: main.name, deputyHeroIds: deputyIds,
    },
  });
  return { march, run: dungeonRunView(runRow), attemptsLeft: def.dailyAttempts - progress.usedToday - 1 };
}

async function handleGetDungeonReports(
  ctx: HandlerContext,
  conn: ConnInfo,
  op: number,
  seq: number | undefined,
  data: Record<string, unknown> | undefined,
): Promise<void> {
  const limit = readLimitOrNull(data, 'limit', 1, 50, 20);
  if (limit === null) {
    respondError(ctx.registry, conn, op, seq, 'INVALID_PARAMS');
    return;
  }
  const beforeId = readOptionalNonNegativeInt(data, 'beforeId') ?? null;
  const page = await loadDungeonRuns(ctx.pool, conn.accountId as string, limit, beforeId);
  respondOk(ctx.registry, conn, op, seq, page);
}
