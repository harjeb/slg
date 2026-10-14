// 协议号、消息帧与错误码的唯一出处（API、Worker 与前端共用）。
// 协议的对外文档由 protocol-doc*.ts 清单生成（npm run gen:api-doc → docs/agent-api.*，
// 漂移检查 npm run check:api-doc）；调整协议时必须同步更新清单并重新生成。
// backend/README.md 的协议表已由生成文档取代；scripts/smoke.ts 按生成文档编写。
// 协议版本与变更历史（v2..v16）见 protocol-version.ts。
export { PROTOCOL_VERSION } from './protocol-version';
// 类型只 import（运行时擦除）：本文件的同名类型定义拆在 protocol-agent.ts，
// 经下方 export type 再导出供外部使用，本文件内部引用也需要这个名字
import type { EventView } from './protocol-city';

export { Op } from './protocol-ops';

import type { ErrorCode } from './protocol-errors';
export { ErrorCode } from './protocol-errors';

/**
 * 声明式登录类型：由连接在登录时自行声明并绑定到连接，
 * 不是可独立验证的两个身份（见 docs/phase-1-mvp.md「身份边界」）。
 */
export type InitiatorRole = 'player' | 'agent';

export function isInitiatorRole(value: unknown): value is InitiatorRole {
  return value === 'player' || value === 'agent';
}

export interface Resources {
  gold: number;
  wood: number;
  food: number;
  stone: number;
  iron: number;
}

/** Resources 的全部字段（遍历成本 / 校验时使用，勿用 Object.keys 于具体对象） */
export const RESOURCE_KEYS = ['gold', 'wood', 'food', 'stone', 'iron'] as const;

/**
 * 第一期可建造的建筑类型（docs/phase-1-launch-scope.md「城池、建筑与经济」，每种同城限一座）：
 * 四种资源生产建筑 + 民房 / 官府 / 军营 / 仓库 / 城墙；v27（AISLG-77）起加书院（科技研究）；v30（AISLG-80~83）起加校场 / 烽火台 / 驿站 / 箭塔。数值与成本见 common/src/rules.ts 的 BUILDING_INFO。
 */
export const BUILDING_KINDS = [
  'farm',
  'lumber_mill',
  'quarry',
  'iron_mine',
  'house',
  'government',
  'barracks',
  'warehouse',
  'wall',
  'academy',
  'parade_ground',
  'beacon',
  'post_station',
  'arrow_tower',
  'tavern',
] as const;

export type BuildingKind = (typeof BUILDING_KINDS)[number];

export function isBuildingKind(value: unknown): value is BuildingKind {
  return typeof value === 'string' && (BUILDING_KINDS as readonly string[]).includes(value);
}

/** 按建筑类型统计的当前状态（数量或等级）：单实例规则下数量为 0/1，等级 0 = 未建造 */
export type BuildingCounts = Record<BuildingKind, number>;



// ---- 消息帧 ----

/** 客户端请求帧：op + 可选 seq（服务端原样带回用于关联）+ 可选 data */
export interface ClientFrame {
  op: number;
  seq?: number;
  data?: Record<string, unknown>;
}

export interface ErrorBody {
  code: ErrorCode;
  message: string;
}

/** 服务端响应帧：op 与请求一致 */
export interface ResponseFrame {
  op: number;
  seq?: number;
  ok: boolean;
  data?: Record<string, unknown>;
  error?: ErrorBody;
}

/** 服务端推送帧：无 seq，data 按协议号解释。
 *  eventId（v21，AISLG-37）：推送去重键，账号维度单调递增——同一次业务事件
 *  扇出到该账号多连接时各连接收到相同 eventId；客户端记住已见最大 eventId
 *  做幂等去重，跳号提示漏推（转 GET_EVENTS 补拉）。eventId 不等于事件表的
 *  事件 id，两者不可互换使用。 */
export interface PushFrame {
  op: number;
  push: true;
  /** 推送去重键（v21，由服务端在扇出时注入，客户端不必校验存在性——旧推送无此字段） */
  eventId?: number;
  data: Record<string, unknown>;
}

// ---- 各协议的载荷结构 ----

export interface LoginRequestData {
  username: string;
  password: string;
  /** 本次是否以 Agent 身份登录 */
  asAgent: boolean;
  /**
   * 会话令牌登录方式（与 password 互斥）：提供 token 时不校验用户名密码，
   * 账号由服务端从会话解析。用于持久保存令牌后的免密自动登录。
   */
  token?: string;
  /** 可选（v32）：调用方手上 agent-api.md 的协议版本；低于当前版本时 Agent 连接的响应附 docNotice */
  docVersion?: number;
  /**
   * 可选（v50，AISLG-133）：Agent 自报的驱动模型名（如 claude-opus-5-5、gpt-5、自己写的
   * 脚本名），1..64 字符（超长截断）。仅 asAgent=true 时生效并记到账号（以最近一次声明
   * 为准，不填保留上次）；自报不验证，仅用于排行榜展示（标注「自报」）。玩家登录忽略。
   */
  agentModel?: string;
}

export interface LoginResponseData {
  accountId: string;
  username: string;
  role: InitiatorRole;
  /** 会话令牌：密码登录返回新签发的令牌；令牌登录原样返回（已滑动续期） */
  sessionToken: string;
  /** 会话过期时间（ISO 8601）；每次令牌登录成功都会续期 */
  expiresAt: string;
  /** 服务端当前协议版本（v32） */
  protocolVersion: number;
  /** 文档更新提示（v32，仅 Agent 连接；文档已是最新或玩家连接为 null） */
  docNotice: string | null;
}

export interface GetEventsRequestData {
  /** 返回条数上限，1..200，默认 50 */
  limit?: number;
  /** 与 sinceId 二选一：分页游标，返回 id 小于它的最新事件 */
  beforeId?: number;
  /** 与 beforeId 二选一：增量游标，返回 id 大于它的旧→新事件 */
  sinceId?: number;
}

export interface GetAgentInfoResponseData {
  agentOnline: boolean;
  connections: Array<{ role: InitiatorRole; connectedAt: string }>;
  /** Agent 最近一次上报的计划（v10；从未上报为 null） */
  plan: AgentPlanView | null;
  // directive（玩家设置的作战方针快照，v23）已随 v49 移除：方针改为玩家与自己的 Agent 直接讨论。
  recentEvents: EventView[];
  /** 账号是否已绑定 Google（v44；服务端没配置 Google Client ID 时恒为 false） */
  googleBound: boolean;
  /** 账号是否已绑定 GitHub（v45；服务端没配置 GitHub OAuth App 时恒为 false） */
  githubBound: boolean;
  /** 绑定的 GitHub 用户名（v45；未绑定为 null） */
  githubLogin: string | null;
}

/** Agent 计划快照（v10）：自报的展示信息，未经验证、不参与游戏逻辑 */
export interface AgentPlanView {
  /** 下一步动作（Agent 自报；≤200 字符，空为 null） */
  nextAction: string | null;
  /** 整体计划（Agent 自报；≤500 字符，空为 null） */
  overallPlan: string | null;
  /** 最近一次上报时间（ISO 8601） */
  updatedAt: string;
}

export interface AgentStatusPushData {
  online: boolean;
  at: string;
}

/** AGENT_REPORT_PLAN（op 27）请求载荷：两段都可只更新其一；提供空串表示清除该段 */
export interface AgentReportPlanRequestData {
  /** 下一步动作，trim 后 0..200 字符（空串 = 清除；缺省 = 保持不变） */
  nextAction?: string;
  /** 整体计划，trim 后 0..500 字符（空串 = 清除；缺省 = 保持不变） */
  overallPlan?: string;
}

export interface AgentReportPlanResponseData {
  /** 更新后的计划快照（与 GET_AGENT_INFO 的 plan、PUSH_AGENT_PLAN 的 data 同构） */
  plan: AgentPlanView;
}

/** PUSH_AGENT_PLAN（op 2003）推送载荷：账号内任一 Agent 连接上报计划后，推给其他在线连接 */
export interface AgentPlanPushData extends AgentPlanView {}

/** PUSH_NPC_ATTACK_WARNING（op 2010）推送载荷（v23，AISLG-57）：预警提前量 = NPC
 *  袭击基准间隔的 1/8（随 timeScale 缩放）；armyMin/armyMax 为大致兵力范围（编成
 *  总单位数 ±20% 取整），不给精确编成 */
export interface NpcAttackWarningPushData {
  attackId: string;
  x: number;
  y: number;
  /** wilderness = 袭击占领野地；city = 袭击主城 */
  target: 'wilderness' | 'city';
  /** 目标地形（仅野地袭击有值；主城为 null） */
  terrain: string | null;
  /** 袭击强度等级（野地 = 地块等级；主城 = 按守军战力推导的袭击等级） */
  level: number;
  armyMin: number;
  armyMax: number;
  /** 敌情详细度（v31，AISLG-81；由被袭击城的烽火台等级决定）：range 只给总兵力范围 / kinds 另给各兵种范围
   *  armyKinds / exact 另给精确编成 army；缺省视为 range（历史预警） */
  intel?: 'range' | 'kinds' | 'exact';
  /** 被袭击城的烽火台等级（v31；0 = 未建） */
  beaconLevel?: number;
  armyKinds?: Partial<Record<import('./protocol-army').TroopKind, { min: number; max: number }>>;
  army?: Partial<Record<import('./protocol-army').TroopKind, number>>;
  /** 预计到达时刻（ISO 8601；随 timeScale 缩放后的实际结算时刻） */
  arriveAt: string;
}

export type { ArmyCounts, RecruitView, TroopKind } from './protocol-army';
export { TROOP_KINDS, isTroopKind } from './protocol-army';
import type { ArmyCounts, RecruitView } from './protocol-army';
export type {
  TerrainKind,
  TerrainResource,
  TileKind,
  TileView,
  TileDetailView,
  TileOwnerView,
  TerritoryView,
  MarchView,
  WorldMapRequestData,
  WorldMapResponseData,
  MapOverviewResponseData,
  MapOverviewSide,
  GetTileRequestData,
  GetTileResponseData,
  MarchRequestData,
  MarchResponseData,
  RecallGarrisonRequestData,
  RecallGarrisonResponseData,
  MarchStatePushData,
  TileStatePushData,
  FamousTileView,
  NpcStockTier,
} from './protocol-world';
export { TERRAIN_KINDS, isTerrainKind, TILE_KINDS } from './protocol-world';
export type {
  BattleReportView,
  BattleReportCommentView,
  BattleRoundLogEntryView,
  BattleSideView,
  ScoutRequestData,
  ScoutResponseData,
  RecallMarchRequestData,
  RecallMarchResponseData,
  GetBattleReportsRequestData,
  GetBattleReportsResponseData,
  BattleReportPushData,
  AgentCommentReportRequestData,
  AgentCommentReportResponseData,
  BattleReportCommentPushData,
  ScoutIntel,
} from './protocol-battle';
export { MARCH_PURPOSES, isMarchPurpose, MARCH_TASKS, isMarchTask } from './protocol-battle';
export type { MarchPurpose, MarchTask } from './protocol-battle';
import type { MarchView, TerritoryView } from './protocol-world';

// 城池操作（建造 / 升级 / 取消 / 改名 / 重置 / 城池推送）的载荷类型在 protocol-city.ts；
// Agent 协作（日报 / 离线汇总）在 protocol-agent.ts；全服维度（播报 / 排行榜）
// 在 protocol-server.ts——原名再导出，既有 import 路径不变
export type {
  AgentDailyReportView,
  OfflineDigestView,
  GetOfflineReportResponseData,
  AgentDailyReportRequestData,
  AgentDailyReportResponseData,
} from './protocol-agent';
export type {
  ServerBroadcastType,
  ServerBroadcastView,
  GetServerBroadcastsRequestData,
  GetServerBroadcastsResponseData,
  ServerBroadcastPushData,
  LeaderboardKind,
  LeaderboardEntryView,
  ModelLeaderboardEntryView,
  GetLeaderboardResponseData,
} from './protocol-server';
export { SERVER_BROADCAST_TYPES, isServerBroadcastType, LEADERBOARD_KINDS, isLeaderboardKind } from './protocol-server';
export type {
  BuildRequestData,
  UpgradeRequestData,
  BuildResponseData,
  BuildFarmResponseData,
  BuildStatePushData,
  CancelBuildRequestData,
  CancelBuildResponseData,
  RenameCityRequestData,
  RenameCityResponseData,
  CityStatePushData,
  ResetAccountRequestData,
  ResetAccountResponseData,
} from './protocol-city';

// 黄巾之乱（v29，AISLG-76）的载荷类型在 protocol-yt.ts，规则与数值在 yellow-turban.ts
export type {
  YtTileCampView,
  YtCampView,
  YtEventView,
  YtContributionView,
  YtRewardTierView,
  GetYellowTurbanResponseData,
  YellowTurbanPushData,
} from './protocol-yt';
export { YT_TIERS, isYtTier } from './yellow-turban';
export type { YtTier } from './yellow-turban';

// 移动目标（v28，AISLG-78）的载荷类型在 protocol-moving.ts，规则与数值在 moving-target.ts
export type { MovingTargetView, GetMovingTargetsResponseData, MovingTargetPushData } from './protocol-moving';
export { MOVING_KINDS, isMovingKind } from './moving-target';
export type {
  HeroView,
  HeroCandidateView,
  FamousClaimView,
  HeroStateView,
  GetHeroesRequestData,
  GetHeroesResponseData,
  RecruitHeroRequestData,
  RecruitHeroResponseData,
  DismissHeroRequestData,
  DismissHeroResponseData,
  AssignHeroRequestData,
  AssignHeroResponseData,
  HeroStatePushData,
} from './protocol-hero';
export type { MovingKind } from './moving-target';

// 竞技场（v53，AISLG-145）的载荷类型在 protocol-arena.ts，规则与数值在 arena.ts
export type {
  ArenaFighterView,
  ArenaOpponentView,
  ArenaTopEntryView,
  ArenaRulesView,
  ArenaStateView,
  GetArenaResponseData,
  SetArenaLineupRequestData,
  SetArenaLineupResponseData,
  ArenaChallengeRequestData,
  ArenaMatchView,
  ArenaChallengeResponseData,
  GetArenaReportsRequestData,
  GetArenaReportsResponseData,
  ArenaStatePushData,
} from './protocol-arena';
// 将星塔（v55，AISLG-146）的载荷类型在 protocol-star-tower.ts，规则与数值在 star-tower.ts
export type {
  StarTowerRewardView,
  StarTowerRulesView,
  StarTowerStateView,
  GetStarTowerResponseData,
  StarTowerMatchView,
  StarTowerChallengeResponseData,
  GetStarTowerReportsRequestData,
  GetStarTowerReportsResponseData,
} from './protocol-star-tower';

// 公告（v60，AISLG-162）的载荷类型与常量在 protocol-announcement.ts
export {
  ANNOUNCEMENT_BODY_MAX_CHARS,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_LANGS,
  ANNOUNCEMENT_TITLE_MAX_CHARS,
} from './protocol-announcement';
export type {
  AnnouncementCategory,
  AnnouncementDetailView,
  AnnouncementLang,
  AnnouncementView,
  GetAnnouncementRequestData,
  GetAnnouncementResponseData,
  GetAnnouncementsRequestData,
  GetAnnouncementsResponseData,
  PushAnnouncementData,
  ReadAnnouncementRequestData,
  ReadAnnouncementResponseData,
} from './protocol-announcement';

// 玩家对抗（一）（v38，AISLG-122）的载荷类型在 protocol-pvp.ts，规则与数值在 protection.ts
export type {
  PlayerAttackWarningPushData,
  TruceRequestData,
  TruceResponseData,
  TileProtectionView,
} from './protocol-pvp';

// 科技研究（v27，AISLG-77）的载荷类型在 protocol-tech.ts，规则与数值在 tech.ts
export type {
  TechEntryView,
  ResearchView,
  GetTechsRequestData,
  GetTechsResponseData,
  TechStateView,
  ResearchTechRequestData,
  ResearchTechResponseData,
  CancelResearchRequestData,
  CancelResearchResponseData,
  TechStatePushData,
} from './protocol-tech';
export { TECH_KINDS, isTechKind } from './tech';
export type { TechKind, TechLevels } from './tech';

// 城池 / 事件 / 建造 / 生产的视图类型（v7..v12 既有形态）同样拆在 protocol-city.ts
export type {
  KindActionCosts,
  ProductionRates,
  PopulationView,
  StorageCaps,
  BuildView,
  CityView,
  EventView,
} from './protocol-city';
export { EventType } from './protocol-city';
