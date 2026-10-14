// 副本的数据库存取（v61，虎牢关）：入口地块、每日次数与首通、挑战记录与战报。表结构见 dungeon-schema.ts。
// 每日次数按「北京日」(Asia/Shanghai) 计，与日常任务同口径；出发即扣，失败 / 撤退不退。

import pg from 'pg';
import { WORLD_SIZE } from './world';
import { DUNGEONS, DUNGEON_IDS, type DungeonDef, type DungeonId } from './dungeon';
import type { DungeonRunResult } from './dungeon-run';
import { itemDefView } from './items';
import type { Resources } from './protocol';
import type { DungeonHeroView, DungeonRunView, DungeonWaveResultView } from './protocol-dungeon';

type Queryable = pg.Pool | pg.PoolClient;
type Army = Partial<Record<string, number>>;

/** 每人保留的已结算挑战记录条数 */
export const DUNGEON_REPORT_KEEP = 50;
/** 选址咨询锁（与其他咨询锁 id 不同即可） */
const SITE_LOCK_ID = 58_001;

const BEIJING_TODAY = `(now() AT TIME ZONE 'Asia/Shanghai')::date`;

// ---- 入口地块 ----

/**
 * 启动时为每个副本选定入口地块（幂等）：取离锚点最近的无主野地（非湖泊、不在进行中的黄巾营地、不藏在野名将），
 * 把地块 kind 改为 'dungeon'（不可占领 / 掠夺；普通出征按 TARGET_NOT_ATTACKABLE 拒绝）。
 */
export async function ensureDungeonSites(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(${SITE_LOCK_ID})`);
    for (const id of DUNGEON_IDS) {
      const existing = await client.query(
        `SELECT 1 FROM dungeon_sites s JOIN world_tiles t ON t.x = s.x AND t.y = s.y
         WHERE s.dungeon_id = $1 AND t.kind = 'dungeon' AND t.owner_city_id IS NULL`, [id],
      );
      if (existing.rowCount) {
        continue;
      }
      // 旧注册点被重建覆盖时重新选址，不能覆盖玩家城池。
      await client.query(`DELETE FROM dungeon_sites WHERE dungeon_id = $1`, [id]);
      const def = DUNGEONS[id];
      const ax = Math.floor(WORLD_SIZE * def.anchor.fx);
      const ay = Math.floor(WORLD_SIZE * def.anchor.fy);
      const pick = await client.query(
        `SELECT t.x, t.y FROM world_tiles t
         WHERE t.kind = 'wilderness' AND t.owner_city_id IS NULL AND t.wild_hero IS NULL AND t.terrain <> 'lake'
           AND NOT EXISTS (SELECT 1 FROM yt_camps c WHERE c.x = t.x AND c.y = t.y AND c.status = 'active')
         ORDER BY (t.x - $1) * (t.x - $1) + (t.y - $2) * (t.y - $2), t.x, t.y
         LIMIT 1 FOR UPDATE`,
        [ax, ay],
      );
      if (!pick.rowCount) {
        continue;
      }
      const { x, y } = pick.rows[0] as { x: number; y: number };
      await client.query(`UPDATE world_tiles SET kind = 'dungeon', level = 0, npc = NULL, plundered_at = NULL WHERE x = $1 AND y = $2`, [x, y]);
      await client.query(`DELETE FROM native_garrison_state WHERE x = $1 AND y = $2`, [x, y]);
      await client.query(`INSERT INTO dungeon_sites (dungeon_id, x, y) VALUES ($1, $2, $3)`, [id, x, y]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function loadDungeonSites(q: Queryable): Promise<Map<DungeonId, { x: number; y: number }>> {
  const res = await q.query(`SELECT dungeon_id, x, y FROM dungeon_sites`);
  const out = new Map<DungeonId, { x: number; y: number }>();
  for (const row of res.rows as Array<{ dungeon_id: DungeonId; x: number; y: number }>) {
    if (row.dungeon_id in DUNGEONS) {
      out.set(row.dungeon_id, { x: row.x, y: row.y });
    }
  }
  return out;
}

/** 某地块上的副本（地图视图用）；不是副本入口返回 null */
export async function dungeonAt(q: Queryable, x: number, y: number): Promise<DungeonDef | null> {
  const res = await q.query(`SELECT dungeon_id FROM dungeon_sites WHERE x = $1 AND y = $2`, [x, y]);
  const id = res.rowCount ? (res.rows[0] as { dungeon_id: string }).dungeon_id : null;
  return id && id in DUNGEONS ? DUNGEONS[id as DungeonId] : null;
}

// ---- 每日次数与首通 ----

export interface DungeonProgress {
  usedToday: number;
  firstClearedAt: Date | null;
  clears: number;
}

/** 进度行：不存在则建，加行锁串行化同一账号的出征；返回今日已用次数（跨北京日归零） */
export async function lockDungeonProgress(client: pg.PoolClient, accountId: string, dungeonId: DungeonId): Promise<DungeonProgress> {
  await client.query(
    `INSERT INTO dungeon_progress (account_id, dungeon_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [accountId, dungeonId],
  );
  const res = await client.query(
    `SELECT CASE WHEN day = ${BEIJING_TODAY} THEN day_used ELSE 0 END AS used, first_cleared_at, clears
     FROM dungeon_progress WHERE account_id = $1 AND dungeon_id = $2 FOR UPDATE`,
    [accountId, dungeonId],
  );
  const row = res.rows[0] as { used: number; first_cleared_at: Date | null; clears: number };
  return { usedToday: row.used, firstClearedAt: row.first_cleared_at, clears: row.clears };
}

/** 扣一次（调用方已 lockDungeonProgress） */
export async function consumeDungeonAttempt(client: pg.PoolClient, accountId: string, dungeonId: DungeonId, usedBefore: number): Promise<void> {
  await client.query(
    `UPDATE dungeon_progress SET day = ${BEIJING_TODAY}, day_used = $3 WHERE account_id = $1 AND dungeon_id = $2`,
    [accountId, dungeonId, usedBefore + 1],
  );
}

/** 只读：账号全部副本的进度 */
export async function loadDungeonProgress(q: Queryable, accountId: string): Promise<Map<string, DungeonProgress>> {
  const res = await q.query(
    `SELECT dungeon_id, CASE WHEN day = ${BEIJING_TODAY} THEN day_used ELSE 0 END AS used, first_cleared_at, clears
     FROM dungeon_progress WHERE account_id = $1`,
    [accountId],
  );
  const out = new Map<string, DungeonProgress>();
  for (const row of res.rows as Array<{ dungeon_id: string; used: number; first_cleared_at: Date | null; clears: number }>) {
    out.set(row.dungeon_id, { usedToday: row.used, firstClearedAt: row.first_cleared_at, clears: row.clears });
  }
  return out;
}

/** 记一次通关；返回是否首通（调用方事务内） */
export async function recordDungeonClear(client: pg.PoolClient, accountId: string, dungeonId: DungeonId): Promise<boolean> {
  const progress = await lockDungeonProgress(client, accountId, dungeonId);
  await client.query(
    `UPDATE dungeon_progress SET clears = clears + 1, first_cleared_at = coalesce(first_cleared_at, now())
     WHERE account_id = $1 AND dungeon_id = $2`,
    [accountId, dungeonId],
  );
  return progress.firstClearedAt === null;
}

// ---- 挑战记录 ----

/** 结算后存进 dungeon_runs.result 的内容 */
export interface DungeonRunStored {
  outcome: DungeonRunResult['outcome'];
  wavesWon: number;
  waves: DungeonWaveResultView[];
  survivors: Army;
  woundedReturned: Army;
  returning: Army;
  rewards: Resources;
  treasure: string | null;
  firstClear: boolean;
  heroExp: number;
  seed: number;
}

export interface DungeonRunRow {
  id: string;
  account_id: string;
  dungeon_id: string;
  march_id: string;
  return_march_id: string | null;
  from_city_id: string;
  heroes: DungeonHeroView[];
  troops: Army;
  retreat_below: number | null;
  status: 'marching' | 'resolved' | 'cancelled';
  result: DungeonRunStored | null;
  created_at: Date;
  resolved_at: Date | null;
}

export async function insertDungeonRun(
  client: pg.PoolClient,
  run: { accountId: string; dungeonId: DungeonId; marchId: string; fromCityId: string; heroes: DungeonHeroView[]; troops: Army; retreatBelow: number | null },
): Promise<DungeonRunRow> {
  const res = await client.query(
    `INSERT INTO dungeon_runs (account_id, dungeon_id, march_id, from_city_id, heroes, troops, retreat_below)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7) RETURNING *`,
    [run.accountId, run.dungeonId, run.marchId, run.fromCityId, JSON.stringify(run.heroes), JSON.stringify(run.troops), run.retreatBelow],
  );
  return res.rows[0] as DungeonRunRow;
}

/** 进行中（在路上）的挑战 */
export async function loadActiveDungeonRun(q: Queryable, accountId: string, dungeonId: string): Promise<DungeonRunRow | null> {
  const res = await q.query(
    `SELECT * FROM dungeon_runs WHERE account_id = $1 AND dungeon_id = $2 AND status = 'marching' ORDER BY id DESC LIMIT 1`,
    [accountId, dungeonId],
  );
  return res.rowCount ? (res.rows[0] as DungeonRunRow) : null;
}

/** Worker 到达结算：按行军取挑战并加锁 */
export async function lockDungeonRunByMarch(client: pg.PoolClient, marchId: string): Promise<DungeonRunRow | null> {
  const res = await client.query(`SELECT * FROM dungeon_runs WHERE march_id = $1 FOR UPDATE`, [marchId]);
  return res.rowCount ? (res.rows[0] as DungeonRunRow) : null;
}

export async function loadDungeonRunById(pool: pg.Pool, accountId: string, id: number): Promise<DungeonRunView | null> {
  const res = await pool.query('SELECT * FROM dungeon_runs WHERE account_id = $1 AND id = $2', [accountId, id]);
  return res.rowCount ? dungeonRunView(res.rows[0] as DungeonRunRow) : null;
}

/** 在路上折返（RECALL_MARCH）：挑战取消，次数不退 */
export async function cancelDungeonRunByMarch(
  client: pg.PoolClient, marchId: string, returnMarchId: string | null = marchId,
): Promise<DungeonRunView | null> {
  const res = await client.query(
    `UPDATE dungeon_runs SET status = 'cancelled', return_march_id = $2, resolved_at = clock_timestamp()
     WHERE march_id = $1 AND status = 'marching' RETURNING *`, [marchId, returnMarchId],
  );
  return res.rowCount ? dungeonRunView(res.rows[0] as DungeonRunRow) : null;
}

export async function loadDungeonRunByReturnMarch(client: pg.PoolClient, marchId: string): Promise<DungeonRunView | null> {
  const res = await client.query(`SELECT * FROM dungeon_runs WHERE return_march_id = $1`, [marchId]);
  return res.rowCount ? dungeonRunView(res.rows[0] as DungeonRunRow) : null;
}

/** 写入结算结果，并删掉该账号超出 DUNGEON_REPORT_KEEP 的旧记录 */
export async function resolveDungeonRun(client: pg.PoolClient, row: DungeonRunRow, stored: DungeonRunStored, returnMarchId: string | null): Promise<DungeonRunRow> {
  const res = await client.query(
    `UPDATE dungeon_runs SET status = 'resolved', result = $2::jsonb, return_march_id = $3, resolved_at = clock_timestamp() WHERE id = $1 RETURNING *`,
    [row.id, JSON.stringify(stored), returnMarchId],
  );
  await client.query(
    `DELETE FROM dungeon_runs WHERE account_id = $1 AND status <> 'marching'
       AND NOT EXISTS (SELECT 1 FROM marches m WHERE m.id = dungeon_runs.return_march_id AND m.status = 'marching')
       AND id NOT IN (
       SELECT id FROM dungeon_runs WHERE account_id = $1 AND status <> 'marching' ORDER BY id DESC LIMIT $2
     )`,
    [row.account_id, DUNGEON_REPORT_KEEP],
  );
  return res.rows[0] as DungeonRunRow;
}

export function dungeonRunView(row: DungeonRunRow): DungeonRunView {
  const r = row.result;
  const def = DUNGEONS[row.dungeon_id as DungeonId];
  return {
    id: Number(row.id),
    dungeonId: row.dungeon_id,
    dungeonName: def?.name ?? row.dungeon_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
    marchId: row.march_id,
    returnMarchId: row.return_march_id ?? null,
    heroes: row.heroes,
    troops: row.troops,
    retreatBelowPercent: row.retreat_below,
    outcome: r?.outcome ?? null,
    wavesWon: r?.wavesWon ?? null,
    waves: r?.waves ?? null,
    survivors: r?.survivors ?? null,
    woundedReturned: r?.woundedReturned ?? null,
    returning: r?.returning ?? null,
    rewards: r?.rewards ?? null,
    treasure: r?.treasure ? itemDefView(r.treasure) : null,
    firstClear: r ? r.firstClear : null,
    heroExp: r ? r.heroExp : null,
  };
}

/** 战报分页：按 id 倒序，beforeId 之前的更早记录；多取一条判断是否还有 */
export async function loadDungeonRuns(
  q: Queryable,
  accountId: string,
  limit: number,
  beforeId: number | null,
): Promise<{ reports: DungeonRunView[]; hasMore: boolean }> {
  const res = await q.query(
    `SELECT * FROM dungeon_runs WHERE account_id = $1 AND ($2::bigint IS NULL OR id < $2::bigint)
     ORDER BY id DESC LIMIT $3`,
    [accountId, beforeId, limit + 1],
  );
  const rows = res.rows as DungeonRunRow[];
  return { reports: rows.slice(0, limit).map(dungeonRunView), hasMore: rows.length > limit };
}
