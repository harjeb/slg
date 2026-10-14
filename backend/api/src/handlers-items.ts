// 宝物协议（v61）：GET_ITEMS / EQUIP_ITEM / UNEQUIP_ITEM / SELL_ITEM。规则在 common/src/item-db.ts；
// 由 handlers-dungeon.ts 的 routeDungeonOp 分派。穿戴 / 卸下后推 PUSH_HERO_STATE（武将加成变化）；出售的金币直接进主城，客户端按需重拉城池。

import pg from 'pg';
import { Op } from '../../common/src/protocol';
import { equipItem, loadItems, sellItem, unequipItem, type ItemError } from '../../common/src/item-db';
import { respondError, respondOk } from './frames';
import type { HandlerContext } from './handlers';
import type { ConnInfo } from './connections';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readUuid(data: Record<string, unknown> | undefined, key: string): string | null {
  const value = data?.[key];
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

/** NO_CITY（账号没有城，出售金币无处入账）对外按 INVALID_PARAMS */
function toErrorCode(error: ItemError): 'ITEM_NOT_FOUND' | 'ITEM_EQUIPPED' | 'HERO_NOT_FOUND' | 'HERO_BUSY' | 'HERO_TRAINING' | 'INVALID_PARAMS' {
  return error === 'NO_CITY' ? 'INVALID_PARAMS' : error;
}

async function inTx<T>(ctx: HandlerContext, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await ctx.pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function handleGetItems(ctx: HandlerContext, conn: ConnInfo, op: number, seq: number | undefined): Promise<void> {
  respondOk(ctx.registry, conn, op, seq, { items: await loadItems(ctx.pool, conn.accountId as string) });
}

export async function handleEquipItem(
  ctx: HandlerContext,
  conn: ConnInfo,
  op: number,
  seq: number | undefined,
  data: Record<string, unknown> | undefined,
): Promise<void> {
  const itemId = readUuid(data, 'itemId');
  const heroId = readUuid(data, 'heroId');
  if (!itemId || !heroId) {
    respondError(ctx.registry, conn, op, seq, 'INVALID_PARAMS');
    return;
  }
  const accountId = conn.accountId as string;
  const error = await inTx(ctx, (client) => equipItem(client, accountId, itemId, heroId));
  if (error) {
    respondError(ctx.registry, conn, op, seq, toErrorCode(error));
    return;
  }
  respondOk(ctx.registry, conn, op, seq, { items: await loadItems(ctx.pool, accountId) });
  ctx.registry.broadcast(accountId, { op: Op.PUSH_HERO_STATE, push: true, data: { reason: 'equipment_changed', heroId } }, conn);
}

export async function handleUnequipItem(
  ctx: HandlerContext,
  conn: ConnInfo,
  op: number,
  seq: number | undefined,
  data: Record<string, unknown> | undefined,
): Promise<void> {
  const itemId = readUuid(data, 'itemId');
  if (!itemId) {
    respondError(ctx.registry, conn, op, seq, 'INVALID_PARAMS');
    return;
  }
  const accountId = conn.accountId as string;
  const error = await inTx(ctx, (client) => unequipItem(client, accountId, itemId));
  if (error) {
    respondError(ctx.registry, conn, op, seq, toErrorCode(error));
    return;
  }
  respondOk(ctx.registry, conn, op, seq, { items: await loadItems(ctx.pool, accountId) });
  ctx.registry.broadcast(accountId, { op: Op.PUSH_HERO_STATE, push: true, data: { reason: 'equipment_changed', heroId: null } }, conn);
}

export async function handleSellItem(
  ctx: HandlerContext,
  conn: ConnInfo,
  op: number,
  seq: number | undefined,
  data: Record<string, unknown> | undefined,
): Promise<void> {
  const itemId = readUuid(data, 'itemId');
  if (!itemId) {
    respondError(ctx.registry, conn, op, seq, 'INVALID_PARAMS');
    return;
  }
  const accountId = conn.accountId as string;
  const out = await inTx(ctx, (client) => sellItem(client, accountId, itemId));
  if ('error' in out) {
    respondError(ctx.registry, conn, op, seq, toErrorCode(out.error));
    return;
  }
  respondOk(ctx.registry, conn, op, seq, { gold: out.gold, items: await loadItems(ctx.pool, accountId) });
}
