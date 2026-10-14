// 宝物协议类型（v61）：镜像 backend/common/src/protocol-item.ts 与 items.ts 的效果字段。

import type { TroopKind } from './protocol';

export type ItemCategory = 'weapon' | 'mount' | 'book';

export interface ItemEffect {
  troopBonuses?: Partial<Record<TroopKind, { atkPercent?: number; defPercent?: number }>>;
  atkPercent?: number;
  defPercent?: number;
  lead?: number;
  marchSpeedPercent?: number;
}

export interface ItemDefView {
  def: string;
  name: string;
  category: ItemCategory;
  effect: ItemEffect;
  sellGold: number;
}

export interface ItemView extends ItemDefView {
  id: string;
  heroId: string | null;
  source: string;
  acquiredAt: string;
}
