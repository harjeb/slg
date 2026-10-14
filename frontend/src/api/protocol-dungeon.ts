// 副本协议类型（v61，虎牢关）：GET_DUNGEON / ENTER_DUNGEON / GET_DUNGEON_REPORTS 与 PUSH_DUNGEON_STATE。
// 镜像 backend/common/src/protocol-dungeon.ts；设计见 docs/dungeon-hulao-pass.md。

import type { ArmyCounts, Resources } from './protocol';
import type { MarchView } from './protocol-world';
import type { HeroSpecialty } from './protocol-combat';
import type { ItemDefView } from './protocol-item';

type Army = Partial<ArmyCounts>;

/** 一波敌军（公开） */
export interface DungeonWaveView {
  wave: number;
  name: string;
  general: { name: string; lead: number; force: number; wit: number; atkPercent: number; defPercent: number };
  troops: Army;
  /** 攻城战：守方据城墙 */
  siege: boolean;
  wallDefensePercent: number;
  /** 打赢该波的资源 */
  reward: Resources;
}

/** 副本规则参数（公开，与结算同一份数值） */
export interface DungeonRulesView {
  popLimit: number;
  maxHeroes: number;
  dailyAttempts: number;
  deputyShare: number;
  deputyCapPercent: number;
  deputyLeadTroopsPerPoint: number;
  /** @deprecated 辎重车已无救治能力，恒为 0；使用 medicPopPerUnit */
  medicPopPerWagon: number;
  /** 每单位存活后勤兵每波最多救回的人口（v62） */
  medicPopPerUnit: number;
  medicMaxShare: number;
  /** @deprecated v63 取消伤兵返还；恒为 0 */
  woundedReturnShare: number;
  treasureChance: number;
}

/** 参战武将快照 */
export interface DungeonHeroView {
  role: 'main' | 'deputy';
  id: string;
  name: string;
  lead: number;
  force: number;
  wit: number;
  specialty: HeroSpecialty | null;
  /** 宝物定义 id */
  equipment: string | null;
}

/** 一波的结算 */
export interface DungeonWaveResultView {
  wave: number;
  name: string;
  won: boolean;
  rounds: number;
  endReason: 'defender_wiped' | 'attacker_wiped' | 'round_limit';
  troops: Army;
  losses: Army;
  survivors: Army;
  enemyTroops: Army;
  enemyLosses: Army;
  /** 打完本波后后勤兵救回的兵 */
  healed: Army;
  /** 本波生效的加成：主将（含宝物、统率摊薄）与副将（已封顶）分开 */
  bonus: { mainAtkPercent: number; mainDefPercent: number; deputyAtkPercent: number; deputyDefPercent: number; scale: number };
}

/** 一次挑战（出征后即有；到达结算后补全结果） */
export interface DungeonRunView {
  id: number;
  dungeonId: string;
  dungeonName: string;
  /** marching = 在路上 / resolved = 已结算（部队可能仍在返程）/ cancelled = 在路上折返（RECALL_MARCH，次数不退） */
  status: 'marching' | 'resolved' | 'cancelled';
  createdAt: string;
  resolvedAt: string | null;
  marchId: string;
  returnMarchId: string | null;
  heroes: DungeonHeroView[];
  troops: Army;
  retreatBelowPercent: number | null;
  /** 以下为结算后字段（marching 时为 null） */
  outcome: 'cleared' | 'defeated' | 'retreated' | null;
  wavesWon: number | null;
  waves: DungeonWaveResultView[] | null;
  survivors: Army | null;
  /** @deprecated v63 起新结算为空编队；未结算为 null，旧战报保留原结果 */
  woundedReturned: Army | null;
  /** v63 起返程兵力 = survivors；旧战报可能包含伤兵返还 */
  returning: Army | null;
  /** 得到的资源（逐波 + 通关），发往出发城 */
  rewards: Resources | null;
  /** 掉落的宝物（没掉为 null） */
  treasure: ItemDefView | null;
  /** 本次是否首通 */
  firstClear: boolean | null;
  /** 全部武将各得的经验 */
  heroExp: number | null;
}

/** 副本信息（GET_DUNGEON 的 dungeons[]） */
export interface DungeonView {
  id: string;
  name: string;
  /** 入口地块坐标 */
  x: number;
  y: number;
  rules: DungeonRulesView;
  waves: DungeonWaveView[];
  clearReward: Resources;
  /** 宝物池（等概率）；首通必掉一件，之后按 rules.treasureChance */
  treasures: ItemDefView[];
  attemptsLeft: number;
  firstClearedAt: string | null;
  clears: number;
  /** 进行中（在路上）的挑战；没有为 null */
  active: DungeonRunView | null;
}

export interface GetDungeonResponseData {
  dungeons: DungeonView[];
}

export interface EnterDungeonResponseData {
  march: MarchView;
  run: DungeonRunView;
  attemptsLeft: number;
}

export interface GetDungeonReportsResponseData {
  reports: DungeonRunView[];
  hasMore: boolean;
}

/** PUSH_DUNGEON_STATE（op 2023）载荷 */
export interface DungeonStatePushData {
  reason: 'started' | 'arrived' | 'resolved' | 'returned' | 'cancelled';
  run: DungeonRunView;
}
