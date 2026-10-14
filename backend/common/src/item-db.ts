// 宝物的数据库存取（v61）：背包、发放、穿戴 / 卸下 / 出售。account_items.hero_id 是「装在谁身上」的权威记录，
// account_heroes.equip_def 是它的冗余缓存（战斗加成直接读武将行），二者只在本文件的函数里同事务维护。
// 随军（含副本副将）或历练中的武将不能更换宝物；装着的宝物不能卖。规则见 items.ts。

import pg from 'pg';
import { heroBusyMarchMap, loadHero } from './hero-db';
import { itemDef, itemDefView } from './items';
import { creditCapitalGold } from './arena-db';
import type { ItemView } from './protocol-item';

type Queryable = pg.Pool | pg.PoolClient;

interface ItemRow {
  id: string;
  account_id: string;
  def: string;
  hero_id: string | null;
  source: string;
  acquired_at: Date;
}

export type ItemError = 'ITEM_NOT_FOUND' | 'ITEM_EQUIPPED' | 'HERO_NOT_FOUND' | 'HERO_BUSY' | 'HERO_TRAINING' | 'NO_CITY';

function toView(row: ItemRow): ItemView | null {
  const def = itemDefView(row.def);
  return def ? { ...def, id: row.id, heroId: row.hero_id, source: row.source, acquiredAt: row.acquired_at.toISOString() } : null;
}

/** 背包（含已装备的），按获得先后 */
export async function loadItems(q: Queryable, accountId: string): Promise<ItemView[]> {
  const res = await q.query(`SELECT * FROM account_items WHERE account_id = $1 ORDER BY acquired_at, id`, [accountId]);
  return (res.rows as ItemRow[]).map(toView).filter((v): v is ItemView => v !== null);
}

/** 发放一件宝物进背包；返回实例 id（未知定义返回 null，不写入） */
export async function grantItem(client: pg.PoolClient, accountId: string, def: string, source: string): Promise<string | null> {
  if (!itemDef(def)) {
    return null;
  }
  const res = await client.query(
    `INSERT INTO account_items (account_id, def, source) VALUES ($1, $2, $3) RETURNING id`,
    [accountId, def, source],
  );
  return (res.rows[0] as { id: string }).id;
}

async function lockItem(client: pg.PoolClient, accountId: string, itemId: string): Promise<ItemRow | null> {
  const res = await client.query(`SELECT * FROM account_items WHERE id = $1 AND account_id = $2 FOR UPDATE`, [itemId, accountId]);
  return res.rowCount ? (res.rows[0] as ItemRow) : null;
}

/** 武将能否更换宝物：属于本账号、不在随军（含副将）、不在历练 */
async function heroChangeable(client: pg.PoolClient, accountId: string, heroId: string): Promise<ItemError | null> {
  const hero = await loadHero(client, heroId, true);
  if (!hero || hero.account_id !== accountId) {
    return 'HERO_NOT_FOUND';
  }
  if (hero.train_until) {
    return 'HERO_TRAINING';
  }
  const busy = await heroBusyMarchMap(client, accountId);
  return busy.has(heroId) ? 'HERO_BUSY' : null;
}

async function clearHeroSlot(client: pg.PoolClient, heroId: string): Promise<void> {
  await client.query(`UPDATE account_items SET hero_id = NULL WHERE hero_id = $1`, [heroId]);
  await client.query(`UPDATE account_heroes SET equip_def = NULL WHERE id = $1`, [heroId]);
}

/**
 * 装备：宝物装到 heroId 身上。武将原有的宝物回背包；宝物原来装在别的武将身上则从那名武将卸下
 * （两名武将都必须能更换宝物）。
 */
export async function equipItem(client: pg.PoolClient, accountId: string, itemId: string, heroId: string): Promise<ItemError | null> {
  const item = await lockItem(client, accountId, itemId);
  if (!item || !itemDef(item.def)) {
    return 'ITEM_NOT_FOUND';
  }
  if (item.hero_id === heroId) {
    return null;
  }
  const targetDenied = await heroChangeable(client, accountId, heroId);
  if (targetDenied) {
    return targetDenied;
  }
  if (item.hero_id) {
    const fromDenied = await heroChangeable(client, accountId, item.hero_id);
    if (fromDenied) {
      return fromDenied === 'HERO_NOT_FOUND' ? 'ITEM_NOT_FOUND' : fromDenied;
    }
    await clearHeroSlot(client, item.hero_id);
  }
  await clearHeroSlot(client, heroId);
  await client.query(`UPDATE account_items SET hero_id = $2 WHERE id = $1`, [itemId, heroId]);
  await client.query(`UPDATE account_heroes SET equip_def = $2 WHERE id = $1`, [heroId, item.def]);
  return null;
}

/** 卸下：宝物回背包（本来就在背包视为成功） */
export async function unequipItem(client: pg.PoolClient, accountId: string, itemId: string): Promise<ItemError | null> {
  const item = await lockItem(client, accountId, itemId);
  if (!item) {
    return 'ITEM_NOT_FOUND';
  }
  if (!item.hero_id) {
    return null;
  }
  const denied = await heroChangeable(client, accountId, item.hero_id);
  if (denied && denied !== 'HERO_NOT_FOUND') {
    return denied;
  }
  await clearHeroSlot(client, item.hero_id);
  return null;
}

/** 出售：只能卖背包里（未装备）的宝物；按固定价金币进主城。返回得到的金币 */
export async function sellItem(client: pg.PoolClient, accountId: string, itemId: string): Promise<{ error: ItemError } | { gold: number }> {
  const item = await lockItem(client, accountId, itemId);
  const def = item ? itemDef(item.def) : null;
  if (!item || !def) {
    return { error: 'ITEM_NOT_FOUND' };
  }
  if (item.hero_id) {
    return { error: 'ITEM_EQUIPPED' };
  }
  if (!(await creditCapitalGold(client, accountId, def.sellGold))) {
    return { error: 'NO_CITY' };
  }
  await client.query(`DELETE FROM account_items WHERE id = $1`, [itemId]);
  return { gold: def.sellGold };
}
