// 协议常量与消息形状：镜像自后端契约。唯一事实来源是 backend/common/src/protocol.ts，
// 对外文档为 docs/agent-api.md；协议调整时以后端生成文档为准同步本文件。

export * from './protocol-army';

export const PROTOCOL_VERSION = 63;

export { Op } from './protocol-ops';

/** 声明式登录类型：连接自行声明的来源标记，不是可独立验证的身份 */
export type InitiatorRole = 'player' | 'agent';

export type ErrorCode =
  | 'INVALID_MESSAGE'
  | 'ANNOUNCEMENT_NOT_FOUND'
  | 'UNKNOWN_OP'
  | 'NOT_LOGGED_IN'
  | 'ALREADY_LOGGED_IN'
  | 'INVALID_PARAMS'
  | 'INVALID_CREDENTIALS'
  | 'SIGNUP_CLOSED'
  | 'SESSION_INVALID'
  | 'INSUFFICIENT_RESOURCES'
  | 'BUILD_IN_PROGRESS'
  | 'QUEUE_FULL'
  | 'BUILDING_EXISTS'
  | 'BUILDING_NOT_BUILT'
  | 'BUILDING_LEVEL_MAX'
  | 'BUILD_NOT_CANCELLABLE'
  | 'AGENT_FORBIDDEN'
  | 'TROOP_NOT_AVAILABLE'
  | 'INSUFFICIENT_POPULATION'
  | 'RECRUIT_QUEUE_FULL'
  | 'RECRUIT_NOT_CANCELLABLE'
  | 'TARGET_NOT_ATTACKABLE'
  | 'INSUFFICIENT_TROOPS'
  | 'TILE_NOT_OCCUPIED'
  | 'MARCH_NOT_RECALLABLE'
  | 'PLUNDER_COOLDOWN'
  | 'TASK_INVALID_FOR_TARGET'
  | 'TERRITORY_LIMIT'
  | 'GOVERNMENT_TOO_LOW'
  | 'BRANCH_LIMIT'
  | 'TARGET_LEVEL_TOO_HIGH'
  | 'OUTER_NOT_CLEARED'
  | 'CARGO_OVER_CAPACITY'
  | 'TECH_LEVEL_MAX'
  | 'RESEARCH_IN_PROGRESS'
  | 'ACADEMY_TOO_LOW'
  | 'RESEARCH_NOT_CANCELLABLE'
  | 'MOVING_TARGET_GONE'
  | 'DEPLOY_LIMIT'
  | 'TAVERN_NOT_BUILT'
  | 'HERO_CANDIDATE_GONE'
  | 'HERO_CAP_REACHED'
  | 'HERO_NOT_FOUND'
  | 'HERO_BUSY'
  | 'HERO_WOUNDED'
  | 'HERO_ARREARS'
  | 'GUARD_ASSIGN_DENIED'
  | 'HERO_TRAINING'
  | 'HERO_POINTS_INSUFFICIENT'
  | 'HERO_NOTHING_TO_RESET'
  | 'HERO_DAILY_LIMIT'
  | 'HERO_NOT_UNLOCKED'
  | 'HERO_FRIENDSHIP_LIMIT'
  | 'HERO_FAVOR_INSUFFICIENT'
  | 'HERO_FAVOR_FULL'
  | 'FAMOUS_CLAIMED'
  | 'NEWBIE_PROTECTED'
  | 'TARGET_IN_TRUCE'
  | 'SELF_TRUCE_ACTIVE'
  | 'TRUCE_ALREADY_ACTIVE'
  | 'TRUCE_WEEKLY_USED'
  | 'TILE_PROTECTED'
  | 'WX_TICKET_INVALID'
  | 'WX_CODE_INVALID'
  | 'WX_ALREADY_BOUND'
  | 'WX_UNAVAILABLE'
  | 'GOOGLE_UNAVAILABLE'
  | 'GOOGLE_CREDENTIAL_INVALID'
  | 'GOOGLE_ALREADY_BOUND'
  | 'GITHUB_UNAVAILABLE'
  | 'OAUTH_CODE_INVALID'
  | 'GITHUB_ALREADY_BOUND'
  | 'RATE_LIMITED'
  | 'AGENT_PASSWORD_FORBIDDEN'
  | 'PASSWORD_LOGIN_CLOSED'
  | 'CHAT_GOVERNMENT_TOO_LOW'
  | 'CHAT_MUTED'
  | 'CHAT_BLOCKED'
  | 'CHAT_RATE_LIMITED'
  | 'NICKNAME_TAKEN'
  | 'DUNGEON_NO_ATTEMPTS'
  | 'DUNGEON_POP_LIMIT'
  | 'DUNGEON_HERO_LIMIT'
  | 'DUNGEON_IN_PROGRESS'
  | 'ITEM_NOT_FOUND'
  | 'ITEM_EQUIPPED'
  | 'INTERNAL';

// 世界地图、野地与 NPC / 战斗的类型镜像（v12 起，v13 战斗类、v16 掠夺在 protocol-world.ts）；
// 原名再导出，既有 import 路径不变
// 会话类（事件流 / 帧与错误体 / 登录载荷 / Agent 计划）在 protocol-session.ts——原名再导出
export type {
  EventType,
  EventView,
  AgentPlanView,
  AgentInfoView,
  ClientFrame,
  ResponseFrame,
  PushFrame,
  LoginPasswordData,
  LoginTokenData,
  LoginResultData,
  AgentReportPlanRequestData,
  AgentReportPlanResponseData,
} from './protocol-session';
export type { AgentPlanPushData } from './protocol-session';

// Agent 协作（日报 / 离线汇总）与全服维度（播报 / 排行榜）的类型在
// protocol-agent.ts / protocol-server.ts——原名再导出，既有 import 路径不变
export type {
  AgentDailyReportView,
  OfflineDigestView,
  GetOfflineReportResponseData,
} from './protocol-agent';
export { LEADERBOARD_KINDS, type LeaderboardKind, type LeaderboardEntryView, type ModelLeaderboardEntryView, type GetLeaderboardResponseData, type LeaderboardView } from './protocol-server';
export type {
  ServerBroadcastType,
  ServerBroadcastView,
  GetServerBroadcastsResponseData,
  ServerBroadcastPushData,
  NpcAttackWarningPushData,
  PlayerAttackWarningPushData,
} from './protocol-server';
export { SERVER_BROADCAST_TYPES } from './protocol-server';
export { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_LANGS } from './protocol-announcement';
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

export type {
  TerrainKind,
  TerrainResource,
  TileKind,
  TileOwnerView,
  TileView,
  TileProtectionView,
  NpcStockTier,
  TileDetailView,
  TerritoryView,
  MarchView,
  MarchTask,
  BranchInfoView,
  CityRefView,
  FamousTileView,
  WorldMapResponseData,
  MapOverviewResponseData,
  MapOverviewSide,
  MarchRequestData,
  MarchResponseData,
  RecallGarrisonResponseData,
  MarchStatePushData,
  TileStatePushData,
  BattleSideView,
  BattleRoundLogEntryView,
  BattleReportView,
  BattleReportCommentView,
  BattleReportCommentPushData,
  ScoutRequestData,
  ScoutResponseData,
  RecallMarchRequestData,
  RecallMarchResponseData,
  GetBattleReportsResponseData,
  BattleReportPushData,
  ScoutIntel,
} from './protocol-world';
export { TERRAIN_KINDS } from './protocol-world';
export type {
  TechKind,
  TechLevels,
  TechEntryView,
  ResearchView,
  TechStateView,
  TechStatePushData,
} from './protocol-tech';
export { TECH_KINDS } from './protocol-tech';
export type {
  HeroView,
  HeroCandidateView,
  FamousClaimView,
  HeroStateView,
  FriendshipView,
  HeroTrainingView,
  TrainingTier,
  AllocateHeroPointsRequestData,
  TrainHeroRequestData,
  BefriendHeroRequestData,
  BefriendHeroResponseData,
  HeroOnlyResponseData,
  GetHeroesRequestData,
  GetHeroesResponseData,
  RecruitHeroRequestData,
  RecruitHeroResponseData,
  DismissHeroRequestData,
  DismissHeroResponseData,
  AssignHeroRequestData,
  AssignHeroResponseData,
  HeroStatePushData,
  CityGuardView,
  BattleHeroView,
  HeroExpDetail,
} from './protocol-hero';
export type { MovingKind, MovingTargetView, MovingTargetPushData, ScheduleEntry } from './protocol-moving';
export { INTERCEPT_REACH, movingIndexAt, reachWindowOf } from './protocol-moving';
export type {
  YtTier,
  YtTileCampView,
  YtCampView,
  YtEventView,
  YtContributionView,
  YtRewardTierView,
  YellowTurbanState,
  YellowTurbanPushData,
} from './protocol-yt';
// 城池状态与操作载荷由 protocol-city.ts 再导出，既有 import 路径不变。
export * from './protocol-city';

// 聊天（v51）的载荷类型与常量
export type {
  ChatCardRequest,
  ChatCardView,
  ChatChannel,
  ChatConversationView,
  ChatConversationsResponseData,
  ChatHistoryRequestData,
  ChatHistoryResponseData,
  ChatMessageView,
  ChatPlayerView,
  ChatReportDetailResponseData,
  ChatSendRequestData,
  ChatSendResponseData,
  PushChatMessageData,
} from './protocol-chat';
export { CHAT_RATE_LIMIT_MS, CHAT_TEXT_MAX_CHARS, CHAT_WORLD_MIN_GOVERNMENT } from './protocol-chat';

export type {
  ArenaFighterView,
  ArenaOpponentView,
  ArenaTopEntryView,
  ArenaRulesView,
  ArenaStateView,
  ArenaRoundView,
  ArenaMatchView,
  ArenaChallengeResponseData,
  GetArenaReportsResponseData,
  ArenaStatePushData,
} from './protocol-arena';
// 任务与签到（v56，AISLG-200）的载荷类型
export type {
  DailyTaskView,
  SigninDayView,
  SigninView,
  QuestStateView,
  GetDailyResponseData,
  ClaimDailyRequestData,
  ClaimDailyResponseData,
  GetSigninResponseData,
  SigninResponseData,
} from './protocol-quest';

// 任务与活动（v56，AISLG-200）的载荷类型
export type {
  MainStepView,
  MainQuestView,
  SideQuestView,
  AchievementTierView,
  AchievementView,
  QuestsView,
  ActivityTierView,
  ActivityView,
  GetQuestsResponseData,
  ClaimQuestRequestData,
  ClaimQuestResponseData,
  GetActivitiesResponseData,
  ClaimActivityResponseData,
} from './protocol-quests';
export type {
  StarTowerRewardView,
  StarTowerRulesView,
  StarTowerStateView,
  StarTowerMatchView,
  StarTowerChallengeResponseData,
  GetStarTowerReportsResponseData,
} from './protocol-star-tower';
export type {
  DungeonView,
  DungeonRunView,
  DungeonWaveView,
  DungeonWaveResultView,
  DungeonHeroView,
  GetDungeonResponseData,
  EnterDungeonResponseData,
  GetDungeonReportsResponseData,
  DungeonStatePushData,
} from './protocol-dungeon';
export type { ItemDefView, ItemView, ItemCategory } from './protocol-item';
