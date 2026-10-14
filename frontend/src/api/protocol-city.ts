// 城池状态、建筑与操作载荷：镜像 backend/common/src/protocol-city.ts 与 handlers。
// protocol.ts 保留原名导出；类型导入在编译期擦除。

import type { InitiatorRole } from './protocol';
import type { ArmyCounts, RecruitView } from './protocol-army';
import type { CityGuardView } from './protocol-hero';
import type { TechLevels } from './protocol-tech';
import type { MarchView, TerritoryView } from './protocol-world';

/** EXCHANGE（op 37）请求载荷（v22 AISLG-42）：四选一基础资源 + 数量（正整数） */
export interface ExchangeRequestData {
  resource: 'food' | 'wood' | 'stone' | 'iron';
  amount: number;
}

/** EXCHANGE 响应载荷：成交明细（gold 为到手金币、rate 为服务端口径汇率）与兑换后的城池状态 */
export interface ExchangeResponseData {
  exchange: { resource: string; amount: number; gold: number; rate: number };
  city: CityView;
}

export interface Resources {
  gold: number;
  wood: number;
  food: number;
  stone: number;
  iron: number;
}

/** 建造排队上限（不含在建，占位）：镜像 rules.ts 的 BUILD_QUEUE_CAPACITY，仅用于界面禁用；权威判定在服务端（QUEUE_FULL）。 */
export const BUILD_QUEUE_CAPACITY = 2;

/** 建筑等级上限：镜像 rules.ts 的 MAX_BUILDING_LEVEL，仅用于界面禁用；权威判定在服务端（BUILDING_LEVEL_MAX）。 */
export const BUILDING_LEVEL_MAX = 20;

/**
 * 一期九种建筑（v7 起，每种同城限一座；v27 AISLG-77 加第十种书院 academy：科技研究所需）：四种资源生产建筑 + 民房（人口上限）/
 * 官府（自动产金）/ 军营（征兵，v11 已上线）/ 仓库（防掠夺保护随战斗玩法）/ 城墙（守城加成，v11 起随 city.defenseBonus 下发）。
 */
export type BuildingKind =
  | 'farm'
  | 'lumber_mill'
  | 'quarry'
  | 'iron_mine'
  | 'house'
  | 'government'
  | 'barracks'
  | 'warehouse'
  | 'wall'
  | 'academy'
  | 'parade_ground'
  | 'beacon'
  | 'post_station'
  | 'arrow_tower'
  | 'tavern';

/** 按建筑类型统计的已建数量（单实例规则下为 0 或 1） */
export type BuildingCounts = Record<BuildingKind, number>;

/** 单一建筑类型的下一步动作成本（v6，随 GET_STATE 的 city.costs 下发） */
export interface KindActionCosts {
  /** 建造成本；已建成时为 null */
  build: Resources | null;
  /** 升到下一等级的成本；未建造或已达上限时为 null */
  upgrade: Resources | null;
  /** 建造时长（秒，v25 AISLG-71；已按当前全局时间缩放折算）；与 build 同 null 语义 */
  buildSeconds: number | null;
  /** 升到下一等级的时长（秒，v25 AISLG-71；已按当前全局时间缩放折算）；与 upgrade 同 null 语义 */
  upgradeSeconds: number | null;
}

/** 每小时产量（按资源；v7 起含 gold：官府自动产金） */
export interface ProductionRates {
  gold: number;
  food: number;
  wood: number;
  stone: number;
  iron: number;
}

/** 人口现状（v7）：上限 = 100 × 民房等级 × (民房等级 + 1)，无民房为 0；每小时线性增长至上限 */
export interface PopulationView {
  current: number;
  cap: number;
  growthPerHour: number;
}

/** 储量上限（v8 确认规则）：四资源各自 = 10000 + 基础小时产量 × 100，金币固定 100 万 */
export interface StorageCaps {
  gold: number;
  food: number;
  wood: number;
  stone: number;
  iron: number;
}

export interface BuildView {
  id: string;
  /** 所属城池（v24，AISLG-58）：推送属于哪座城（多城时只合并当前查看的城） */
  cityId: string;
  kind: BuildingKind;
  /** v4 起含 'queued'（dueAt 为 null）；v7 起含 'cancelled'（退出队列，保留为历史） */
  status: 'building' | 'queued' | 'completed' | 'cancelled';
  /** 目标等级：建造恒为 1，升级为当前 + 1；连续升级（v22）为当前推进中的目标等级 */
  level: number;
  /** 连续升级的整链终点（v22，AISLG-43）；单级升级与建造为 null */
  toLevel: number | null;
  initiator: InitiatorRole;
  startedAt: string;
  /** 排队中（queued）为 null */
  dueAt: string | null;
  completedAt: string | null;
}

/** 仓库快满提醒阈值（百分数）：镜像 backend/api/src/handlers-offline.ts 的 STORAGE_FULL_PERCENT，
 *  顶栏资源条本地提示用（粮/木/石/铁参与，金币不参与，与离线日报同口径）。 */
export const STORAGE_FULL_WARN_PERCENT = 80;

/** 集市兑换汇率（v22，占位）：镜像 backend/common/src/rules.ts 的 EXCHANGE_INPUT_PER_GOLD，
 *  仅用于兑换弹窗的到手金币预览；成交值以 EXCHANGE 响应的 exchange.gold 为准。 */
export const EXCHANGE_INPUT_PER_GOLD = 4;

export interface CityView {
  id: string;
  name: string;
  /** 名城分城标记（v24 AISLG-56）：占领名城得到的分城带名城名；普通城为 null */
  famousName: string | null;
  /** 该城的独占产量加成百分数（v24 AISLG-56：名城分城 +20%，已计入 production）；普通城为 0 */
  productionBonusPercent: number;
  /** 城池等级（v24 起 = 该城官府等级） */
  level: number;
  resources: Resources;
  /** 按建筑类型统计的已建数量（单实例规则下为 0 或 1） */
  buildings: BuildingCounts;
  /** 各建筑类型的当前等级（0 = 未建造；产量、人口上限与储量上限均按等级推导） */
  levels: BuildingCounts;
  /** 各建筑「下一步动作」成本：build=建造（未建时），upgrade=升级（已建未满级时），null=不可用 */
  costs: Record<BuildingKind, KindActionCosts>;
  /** 兼容字段：已建成的农田数量（= buildings.farm） */
  farms: number;
  production: ProductionRates;
  /** 人口现状（v7） */
  population: PopulationView;
  /** 储量上限（v7 新增，v8 规则确认）：达到上限后停止对应生产 */
  storage: StorageCaps;
  /** 城内驻军，按兵种统计（v11；征兵完成时入城） */
  army: ArmyCounts;
  /** 全军小时耗粮（v14）：城内 1 倍 + 行军/野地驻军 2 倍；production.food 为毛产量，净粮 = 两者之差 */
  armyFoodUsePerHour: number;
  /** 全局时间缩放（v20，AISLG-38）：本地折算时长（如掠夺冷却剩余）时使用，勿按文档基准硬算 */
  timeScale: number;
  /** 主城免战截止（v22，AISLG-40）：被 NPC 攻破后 2×袭击间隔（÷timeScale）内不再入袭击目标池；null = 不在免战。
   *  v38（AISLG-122）起被玩家攻破 / 被抢后同样写入（4 小时基准），玩家与 NPC 共用 */
  truceUntil: string | null;
  /** 新手保护截止（v38 AISLG-122，账号级）：期内别人不能侦察 / 攻击；null = 已出保 */
  newbieUntil: string | null;
  /** 主动免战截止（v38 AISLG-122，账号级）：TRUCE 开启后 12 小时基准；null = 未开启 */
  shieldUntil: string | null;
  /** 下一次可开启主动免战的时刻（v38；每周一次）；null = 当前可开 */
  shieldNextAt: string | null;
  /** 分城城防值（v40 AISLG-124；0..100，归零一击换主；主城为 null） */
  durability: number | null;
  /** 征兵队列（v11）：第 1 项为征募中（dueAt 非空），其余为排队；已取消的条目不在其中 */
  recruitQueue: RecruitView[];
  /** 城墙守城防御加成（v11，占位 = 城墙等级 × 5，百分数数值；战斗结算上线后由其消费） */
  defenseBonus: number;
  /** 账号科技等级（v27 AISLG-77；全账号共享，已计入 production / storage / defenseBonus；负重与行军加成由客户端折算） */
  techs: TechLevels;
  /** 在外部队数与上限（v30 AISLG-80）：count = 行军中（含返程）+ 驻守野地，limit = 校场等级（未建按 1） */
  deploy: { count: number; limit: number };
  /** 预计断粮时间（v34 AISLG-107；ISO 8601）：已断粮 = 当前时刻；不会断粮为 null */
  starveAt: string | null;
  /** 下一次断粮哗变时刻（v34）：已断粮时有值——到点本城城内驻军每兵种减 10% */
  mutinyNextAt: string | null;
  /** 箭塔数值（v30 AISLG-82）：守城每回合固定伤害与射程；未建为 null */
  tower: { damage: number; range: number } | null;
  /** 城守（v36 AISLG-115）：本城任命的武将；产量加成已计入 production，守城战另享攻防加成；未任为 null */
  guard: CityGuardView | null;
  /** 本城进行中的行军（v12；到达与返程由服务端结算并推送 / 事件记录） */
  marches: MarchView[];
  /** 本城占领的野地（v12；production 已计入占领加成与驻军采集） */
  territory: TerritoryView[];
  /** 建造队列：第 1 项为在建，其余为排队，按入队顺序；已取消的条目不在其中 */
  queue: BuildView[];
  /** 兼容字段：当前在建（= queue 中 status=building 的首项） */
  building: BuildView | null;
}

/** CANCEL_BUILD（op 24）请求载荷：取消排队中的建造条目并全额返还其成本 */
export interface CancelBuildRequestData {
  buildId: string;
}

export interface CancelBuildResponseData {
  build: BuildView;
}

/** RENAME_CITY（op 25）请求载荷：名称 trim 后 1..24 字符 */
export interface RenameCityRequestData {
  name: string;
}

export interface RenameCityResponseData {
  cityId: string;
  name: string;
}

/** PUSH_BUILD_STATE（op 2000）推送载荷 */
export interface BuildStatePushData {
  /** build_started=立即开工或队列激活；build_queued=入队；build_completed=完成；build_cancelled=排队条目被取消（v7） */
  reason: 'build_started' | 'build_queued' | 'build_completed' | 'build_cancelled';
  build: BuildView;
}

/** DISCARD_CITY（op 94，v57）请求载荷：分城 cityId 必填，confirm 必须显式为 true */
export interface DiscardCityRequestData {
  cityId: string;
  confirm: boolean;
}

/** 放弃分城后的地块坐标及本账号重新占领的冷却截止时刻 */
export interface DiscardCityResponseData {
  cityId: string;
  x: number;
  y: number;
  cooldownUntil: string;
}

/** PUSH_CITY_STATE（op 2002）推送载荷：城池级状态变化 */
export interface CityStatePushData {
  /** city_renamed=城池改名；account_reset=账号数据被重置；city_discarded=分城被放弃（v57） */
  reason: 'city_renamed' | 'account_reset' | 'city_discarded';
  cityId: string;
  /** reason=city_renamed 时的新名称 */
  name?: string;
}

/** RESET_ACCOUNT（op 26）请求载荷：重置不可逆，confirm 必须显式为 true */
export interface ResetAccountRequestData {
  confirm: boolean;
}

/** SET_NICKNAME（op 72）请求载荷：昵称 trim 后 1..32 字符；全服唯一，撞名 NICKNAME_TAKEN */
export interface SetNicknameRequestData {
  nickname: string;
}

export interface SetNicknameResponseData {
  /** 新昵称（即账号新 username） */
  username: string;
}

/** PUSH_ACCOUNT_STATE（op 2020）推送载荷：账号级状态变化（v52） */
export interface AccountStatePushData {
  /** account_renamed=昵称被修改 */
  reason: 'account_renamed';
  /** 新昵称 */
  username: string;
}

/** RESET_ACCOUNT 响应载荷：重置完成后的城池现状（即开号初始状态） */
export interface ResetAccountResponseData {
  city: CityView;
}
