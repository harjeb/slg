// 宝物（v61，副本·虎牢关）：每名武将 1 个宝物槽，武器 / 坐骑 / 兵书都装进同一个槽。
// 效果只用现有战斗接口：攻击 % / 减伤 % / 统率 / 行军速度 %。攻击与减伤不计入武力 / 智力加成的 20% 封顶，
// 但与武将加成一样随统率摊薄。所有战斗（大地图、竞技场、将星塔、副本）都生效。数值均为占位，
// 设计见 docs/dungeon-hulao-pass.md。API 与 Worker 共用，两侧不得各自另算。

import type { ItemDefView } from './protocol-item';
import type { TroopKind } from './protocol';

export const ITEM_CATEGORIES = ['weapon', 'mount', 'book'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface ItemEffect {
  /** 所带部队攻击 +%（不计入 20% 封顶，随统率摊薄） */
  atkPercent?: number;
  /** 所带部队受到伤害 −%（同上） */
  defPercent?: number;
  troopBonuses?: Partial<Record<TroopKind, { atkPercent?: number; defPercent?: number }>>;
  /** 统率 +N（提高满额带兵数） */
  lead?: number;
  /** 随行行军速度 +%（与行军科技等加成相加） */
  marchSpeedPercent?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  effect: ItemEffect;
  /** 卖给系统的固定价（金币，进主城） */
  sellGold: number;
}

/** 单件宝物攻击 / 减伤的上限（占位）；定义时校验，防止配置失误 */
export const ITEM_EFFECT_CAP_PERCENT = 10;

export const ITEM_DEFS: Readonly<Record<string, ItemDef>> = {
  qixing_blade: { id: 'qixing_blade', name: '七星宝刀', category: 'weapon', effect: { atkPercent: 5 }, sellGold: 2_000 },
  dawan_horse: { id: 'dawan_horse', name: '西凉大宛马', category: 'mount', effect: { marchSpeedPercent: 15, troopBonuses: { cavalry: { defPercent: 3 }, iron_cavalry: { defPercent: 3 } } }, sellGold: 2_000 },
  dongzhuo_book: { id: 'dongzhuo_book', name: '董卓兵书', category: 'book', effect: { lead: 5 }, sellGold: 2_000 },
};

export function itemDef(id: string | null | undefined): ItemDef | null {
  return id && Object.prototype.hasOwnProperty.call(ITEM_DEFS, id) ? ITEM_DEFS[id] : null;
}

/** 宝物定义的展示视图（HeroView.equipment / GET_ITEMS / 副本掉落表共用）；未知 id 返回 null */
export function itemDefView(id: string): ItemDefView | null {
  const def = itemDef(id);
  return def ? { def: def.id, name: def.name, category: def.category, effect: { ...def.effect }, sellGold: def.sellGold } : null;
}

/** 宝物的统率加成（没有宝物或宝物不加统率为 0） */
export function itemLead(id: string | null | undefined): number {
  return itemDef(id)?.effect.lead ?? 0;
}

/** 宝物的行军速度加成（百分数） */
export function itemMarchPercent(id: string | null | undefined): number {
  return itemDef(id)?.effect.marchSpeedPercent ?? 0;
}

/** 宝物的攻击 / 减伤（未摊薄，百分数） */
export function itemCombat(id: string | null | undefined): { atkPercent: number; defPercent: number } {
  const effect = itemDef(id)?.effect;
  return {
    atkPercent: Math.min(ITEM_EFFECT_CAP_PERCENT, effect?.atkPercent ?? 0),
    defPercent: Math.min(ITEM_EFFECT_CAP_PERCENT, effect?.defPercent ?? 0),
  };
}

/** 把宝物的攻击 / 减伤按摊薄系数叠到武将加成上（保留 1 位小数，与 heroBattleBonus 一致） */
export function withItemCombat<T extends { atkPercent: number; defPercent: number }>(bonus: T, id: string | null | undefined, scale: number): T & Pick<ItemEffect, 'troopBonuses'> {
  const item = itemCombat(id);
  const troopBonuses = itemDef(id)?.effect.troopBonuses;
  if (item.atkPercent === 0 && item.defPercent === 0 && !troopBonuses) {
    return bonus;
  }
  const factor = Number.isFinite(scale) ? Math.max(0, Math.min(1, scale)) : 1;
  return {
    ...bonus,
    ...(troopBonuses ? { troopBonuses: Object.fromEntries(Object.entries(troopBonuses).map(([kind, effect]) => [kind, {
      atkPercent: Math.round(Math.min(ITEM_EFFECT_CAP_PERCENT, effect.atkPercent ?? 0) * factor * 10) / 10,
      defPercent: Math.round(Math.min(ITEM_EFFECT_CAP_PERCENT, effect.defPercent ?? 0) * factor * 10) / 10,
    }])) } : {}),
    atkPercent: Math.round((bonus.atkPercent + item.atkPercent * factor) * 10) / 10,
    defPercent: Math.round((bonus.defPercent + item.defPercent * factor) * 10) / 10,
  };
}
