// 兵种、征募数值与载荷：镜像共享后端契约，由 protocol.ts 再导出。

import type { InitiatorRole } from './protocol';
import type { Resources } from './protocol-city';

/** 一期兵种（v11，旧游戏 1–7 号）：镜像 backend/common/src/protocol-army.ts 的 TROOP_KINDS */
export const TROOP_KINDS = [
  'porter',
  'militia',
  'scout',
  'pikeman',
  'swordsman',
  'archer',
  'cavalry',
  // v33 二期四兵种（AISLG-86/88/89/90）
  'iron_cavalry',
  'supply_wagon',
  'ballista',
  'siege_ram',
  // v62：后勤医疗小队，救治只在副本波间生效
  'medic',
] as const;

export type TroopKind = (typeof TROOP_KINDS)[number];

/** 按兵种统计的城内驻军数量（v11） */
export type ArmyCounts = Record<TroopKind, number>;

/**
 * 单兵征募数值（v11，占位）：镜像 backend/common/src/troops.ts 的 TROOP_INFO，
 * 仅用于界面预填成本与禁用不可征兵种；权威判定在服务端（TROOP_NOT_AVAILABLE 等）。
 * foodUse（v14）为单兵小时耗粮，仅用于征兵面板提示；净产量结算在服务端。
 * carry（v16）为单兵负重，用于出征表单的编队负重预览；掠夺装填在服务端。
 */
export const TROOP_INFO: Record<
  TroopKind,
  { cost: Resources; population: number; unitSeconds: number; barracksLevel: number; foodUse: number; carry: number }
> = {
  porter: { cost: { gold: 50, wood: 30, food: 30, stone: 0, iron: 0 }, population: 1, unitSeconds: 8, barracksLevel: 1, foodUse: 2, carry: 500 },
  militia: { cost: { gold: 80, wood: 20, food: 50, stone: 0, iron: 0 }, population: 1, unitSeconds: 10, barracksLevel: 1, foodUse: 3, carry: 60 },
  scout: { cost: { gold: 100, wood: 50, food: 80, stone: 0, iron: 0 }, population: 1, unitSeconds: 15, barracksLevel: 2, foodUse: 4, carry: 80 },
  pikeman: { cost: { gold: 150, wood: 80, food: 100, stone: 0, iron: 50 }, population: 1, unitSeconds: 20, barracksLevel: 3, foodUse: 5, carry: 60 },
  swordsman: { cost: { gold: 180, wood: 60, food: 120, stone: 0, iron: 80 }, population: 1, unitSeconds: 25, barracksLevel: 4, foodUse: 6, carry: 80 },
  archer: { cost: { gold: 200, wood: 120, food: 100, stone: 0, iron: 60 }, population: 1, unitSeconds: 30, barracksLevel: 5, foodUse: 6, carry: 50 },
  cavalry: { cost: { gold: 300, wood: 80, food: 150, stone: 0, iron: 100 }, population: 1, unitSeconds: 40, barracksLevel: 6, foodUse: 12, carry: 100 },
  iron_cavalry: { cost: { gold: 600, wood: 100, food: 200, stone: 0, iron: 300 }, population: 3, unitSeconds: 60, barracksLevel: 11, foodUse: 30, carry: 100 },
  supply_wagon: { cost: { gold: 200, wood: 300, food: 60, stone: 0, iron: 40 }, population: 6, unitSeconds: 30, barracksLevel: 3, foodUse: 10, carry: 5000 },
  ballista: { cost: { gold: 350, wood: 300, food: 80, stone: 0, iron: 120 }, population: 3, unitSeconds: 45, barracksLevel: 7, foodUse: 8, carry: 0 },
  siege_ram: { cost: { gold: 400, wood: 400, food: 80, stone: 100, iron: 100 }, population: 5, unitSeconds: 60, barracksLevel: 8, foodUse: 10, carry: 0 },
  // v62 占位，六人医疗小队，成本与战斗属性待校准。
  medic: { cost: { gold: 200, wood: 300, food: 60, stone: 0, iron: 40 }, population: 6, unitSeconds: 30, barracksLevel: 3, foodUse: 10, carry: 0 },
};

/** 单次征募数量上限（占位）：镜像 backend/common/src/troops.ts 的 RECRUIT_COUNT_MAX */
export const RECRUIT_COUNT_MAX = 100;

/**
 * 单兵战力（v12，占位决策）：镜像 backend/common/src/battle.ts 的 TROOP_POWER，
 * 仅用于出征表单的编队战力预览；战斗判定在服务端。
 */
export const TROOP_POWER: Record<TroopKind, number> = {
  porter: 1,
  militia: 2,
  scout: 2,
  pikeman: 4,
  swordsman: 5,
  archer: 5,
  cavalry: 8,
  iron_cavalry: 14,
  supply_wagon: 1,
  ballista: 8,
  siege_ram: 3,
  medic: 1,
};

/** 征兵排队上限（不含征募中，占位）：镜像 backend/common/src/troops.ts 的 RECRUIT_QUEUE_CAPACITY，
 *  仅用于界面在队满时禁用征兵入口；权威判定在服务端（RECRUIT_QUEUE_FULL）。 */
export const RECRUIT_QUEUE_CAPACITY = 2;

/** 征兵状态视图（v11；推送与查询共用同一结构，形态对齐 BuildView） */
export interface RecruitView {
  id: string;
  /** 所属城池（v24，AISLG-58） */
  cityId: string;
  troop: TroopKind;
  /** 本次征募数量 */
  count: number;
  /** recruiting=征募中（队首）；queued=排队；completed=已完成；cancelled=已取消（保留为历史） */
  status: 'recruiting' | 'queued' | 'completed' | 'cancelled';
  initiator: InitiatorRole;
  startedAt: string;
  /** 预计完成时间；排队中为 null */
  dueAt: string | null;
  completedAt: string | null;
}

/** RECRUIT（op 28）请求载荷：troop 兵种 + count 数量（1..RECRUIT_COUNT_MAX） */
export interface RecruitRequestData {
  troop: TroopKind;
  count: number;
}

export interface RecruitResponseData {
  recruit: RecruitView;
}

/** CANCEL_RECRUIT（op 29）请求载荷：仅排队中的条目可取消，全额返还资源与人口 */
export interface CancelRecruitRequestData {
  recruitId: string;
}

export interface CancelRecruitResponseData {
  recruit: RecruitView;
}

/** PUSH_RECRUIT_STATE（op 2004）推送载荷 */
export interface RecruitStatePushData {
  /** recruit_started=开始（或队首激活）；recruit_queued=入队；recruit_completed=完成（兵力入城）；recruit_cancelled=排队条目被取消 */
  reason: 'recruit_started' | 'recruit_queued' | 'recruit_completed' | 'recruit_cancelled';
  recruit: RecruitView;
}

// 掠夺与仓库保护的数值镜像（v16）：与兵种负重的预览计算在 protocol-plunder.ts，
// 原名再导出，既有 import 路径不变
export {
  armyCarryCapacity,
  warehouseProtectionPerResource,
  WAREHOUSE_PROTECTION_TOTAL_PER_LEVEL,
  WAREHOUSE_PROTECTION_SPLIT,
  PLUNDER_COOLDOWN_HOURS,
} from './protocol-plunder';
