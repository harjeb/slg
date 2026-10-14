// 宝物与宝物槽的协议类型（v61，副本·虎牢关）：GET_ITEMS / EQUIP_ITEM / UNEQUIP_ITEM / SELL_ITEM 与 HeroView.equipment。
// 规则与数值见 items.ts。

import type { ItemCategory, ItemEffect } from './items';

/** 宝物定义（不含实例信息） */
export interface ItemDefView {
  /** 定义 id，如 qixing_blade */
  def: string;
  name: string;
  /** weapon 武器 / mount 坐骑 / book 兵书；都装进同一个宝物槽 */
  category: ItemCategory;
  effect: ItemEffect;
  /** 卖给系统的固定价（金币） */
  sellGold: number;
}

/** 背包里的一件宝物（实例） */
export interface ItemView extends ItemDefView {
  /** 实例 id（装备 / 卸下 / 出售用） */
  id: string;
  /** 装备在哪名武将身上；null = 在背包 */
  heroId: string | null;
  /** 来源，如 dungeon:hulao */
  source: string;
  acquiredAt: string;
}
