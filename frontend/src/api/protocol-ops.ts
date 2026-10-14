/** 协议号（请求与响应用同一值，推送以 op 区分类型） */
export const Op = {
  LOGIN: 1,
  LOGOUT: 2,
  GET_STATE: 10,
  GET_EVENTS: 11,
  GET_AGENT_INFO: 12,
  /** 兼容入口：等价于 BUILD 且 kind='farm'；前端统一走 BUILD */
  BUILD_FARM: 20,
  BUILD: 21,
  /** 发起建筑升级（升到下一等级，v5，与建造共用队列） */
  UPGRADE: 22,
  /** 取消建造队列中的排队条目（v7）：全额返还已扣成本；在建条目不可取消（BUILD_NOT_CANCELLABLE） */
  CANCEL_BUILD: 24,
  /** 城池改名（v7） */
  RENAME_CITY: 25,
  /** 一键重置账号数据（v9）：data.confirm 必须显式为 true；仅限玩家连接（Agent 返回 AGENT_FORBIDDEN） */
  RESET_ACCOUNT: 26,
  /** Agent 上报计划（v10）：data.nextAction / data.overallPlan；仅限 Agent 连接（玩家返回 AGENT_FORBIDDEN） */
  AGENT_REPORT_PLAN: 27,
  /** 发起征兵（v11）：data.troop 兵种 + data.count 数量；军营等级解锁兵种，发起时扣减资源与人口 */
  RECRUIT: 28,
  /** 取消征兵队列中的排队条目（v11）：data.recruitId；全额返还资源与人口，征募中不可取消 */
  CANCEL_RECRUIT: 29,
  /** 查询世界地图窗口（v12）：data.x/y/w/h 可选，缺省以主城为中心 10×10 */
  GET_WORLD_MAP: 30,
  /** 查询地块详情（v12）：data.x + data.y */
  GET_TILE: 31,
  /** 出征（v12）：data.x/y 目标 + data.troops 按兵种数量；到达由服务端结算 */
  MARCH: 32,
  /** 撤回占领野地的驻军（v12）：data.x + data.y；撤回即放弃占领 */
  RECALL_GARRISON: 33,
  /** 斥候侦察（v13）：data.x/y + data.count；到达产出情报快照并返程 */
  SCOUT: 34,
  /** 撤回行军途中的部队（v13）：data.marchId；原地折返、按已走时长返程 */
  RECALL_MARCH: 35,
  /** 查询战斗战报（v13）：data.limit / beforeId */
  GET_BATTLE_REPORTS: 36,
  /** 集市兑换（v22）：data.resource 四选一 + data.amount */
  EXCHANGE: 37,
  // SET_AGENT_DIRECTIVE（op 38，作战方针）已随协议 v49 移除：玩家改与自己的 Agent 直接讨论
  /** Agent 写回战报点评（v23 AISLG-53）：data.reportId + data.text；仅 Agent 连接 */
  AGENT_COMMENT_REPORT: 39,
  /** Agent 写离线日报（v23 AISLG-54）：data.text；仅 Agent 连接 */
  AGENT_DAILY_REPORT: 40,
  /** 查询离线日报（v23 AISLG-54）：离线时长、收获/损失汇总与 Agent 最近日报 */
  GET_OFFLINE_REPORT: 41,
  /** 查询全服播报（v23 AISLG-60）：最近的大事列表，新→旧 */
  GET_SERVER_BROADCASTS: 42,
  /** 查询全服排行榜（v23 AISLG-61）：三榜快照，前 50 名 + 我的名次 */
  GET_LEADERBOARD: 43,
  /** 查询科技状态（v27 AISLG-77）：6 项科技等级 / 下一级成本与耗时 / 进行中的研究 */
  GET_TECHS: 44,
  /** 发起科技研究（v27 AISLG-77）：data.tech；账号同一时间只研究一项，需书院 */
  RESEARCH_TECH: 45,
  /** 取消进行中的研究（v27 AISLG-77）：全额返还 */
  CANCEL_RESEARCH: 46,
  /** 查询移动目标（v28 AISLG-78）：流寇与运粮商队的当前位置、公开路线与时刻表 */
  GET_MOVING_TARGETS: 47,
  /** 查询黄巾之乱（v29 AISLG-76）：事件进度 / 营地与老巢 / 我的贡献与名次 / 贡献榜 */
  GET_YELLOW_TURBAN: 48,
  /** 查询武将（v36 AISLG-114）：账号全部武将 / 当前城酒馆候选 / 上限 / 名将归属 */
  GET_HEROES: 49,
  /** 招募酒馆候选武将（v36）：data.candidateId；扣酒馆所在城金币 */
  RECRUIT_HERO: 50,
  /** 解雇武将（v36）：data.heroId；名将解雇后回到全服可获得状态 */
  DISMISS_HERO: 51,
  /** 任命 / 撤换城守（v36 AISLG-115）：data.heroId（null = 撤任）+ 可选 data.cityId */
  ASSIGN_HERO: 52,
  /** 开启主动免战（v38 AISLG-122）：无参数；每周一次免费、12 小时，期内别人打不了他、他也不能出兵打玩家 */
  TRUCE: 53,
  /** 生成微信扫码二维码（v43）：data.purpose = login | bind；login 登录前即可发，bind 需玩家已登录 */
  WX_QR_CREATE: 54,
  /** 查看本账号永久 Agent 令牌（v46）：仅玩家连接，没有时自动补生成 */
  GET_AGENT_TOKEN: 64,
  /** 重置永久 Agent 令牌（v46）：仅玩家连接，旧令牌立即失效、用它在线的连接被断开 */
  RESET_AGENT_TOKEN: 65,
  /** 聊天（v51）：消息查询 / 发送 / 私聊会话与未读 / 已读 / 屏蔽 / 战报卡片详情（仅玩家连接） */
  CHAT_HISTORY: 66,
  CHAT_SEND: 67,
  CHAT_CONVERSATIONS: 68,
  CHAT_READ: 69,
  CHAT_BLOCK: 70,
  CHAT_REPORT_DETAIL: 71,
  /** 修改账号昵称（v52，AISLG-142）：data.nickname；仅玩家连接；昵称即账号 username，全服唯一（NICKNAME_TAKEN） */
  SET_NICKNAME: 72,
  /** 查询竞技场（v53，AISLG-145） */
  GET_ARENA: 73,
  /** 保存竞技场阵容（v53，AISLG-145）：第一次保存即入榜 */
  SET_ARENA_LINEUP: 74,
  /** 发起竞技挑战（v53，AISLG-145）：三局两胜，赢了互换名次 */
  ARENA_CHALLENGE: 75,
  /** 查询竞技场战报（v53，AISLG-145） */
  GET_ARENA_REPORTS: 76,
  /** 分配自由点数（v54，AISLG-144） */
  ALLOCATE_HERO_POINTS: 77,
  /** 洗点（v54，AISLG-144） */
  RESET_HERO_POINTS: 78,
  /** 派武将历练（v54，AISLG-144） */
  TRAIN_HERO: 79,
  /** 赏赐武将（v54，AISLG-144） */
  GIFT_HERO: 80,
  /** 结交在野名将（v54，AISLG-144） */
  BEFRIEND_HERO: 81,
  /** 招揽在野名将（v54，AISLG-144） */
  RECRUIT_FAMOUS_HERO: 82,
  /** 查询日常任务与签到状态（v56，AISLG-200）：data.quest */
  GET_DAILY: 86,
  /** 领取日常任务奖励（v56）：data.taskId；任务未完成 / 重复领取返回 INVALID_PARAMS */
  CLAIM_DAILY: 87,
  /** 查询签到状态（v56） */
  GET_SIGNIN: 88,
  /** 每日签到（v56）：每天一次，连续 7 天一轮循环；当日重复签到返回 INVALID_PARAMS */
  SIGNIN: 89,
  /** 查询主线/支线任务与成就（v56，AISLG-200 二期） */
  GET_QUESTS: 90,
  /** 领取任务/成就奖励（v56）：data.kind=main|side|achv, data.id */
  CLAIM_QUEST: 91,
  /** 查询活动状态（v56，AISLG-200 三期） */
  GET_ACTIVITIES: 92,
  /** 领取活动奖励（v56）：data.id = 阶梯 id */
  CLAIM_ACTIVITY: 93,
  /** C→S 放弃分城（v57，AISLG-153：data.cityId 必填、data.confirm 须为 true；主城不可放弃） */
  DISCARD_CITY: 94,
  /** 世界小地图总览（v58，AISLG-160）：全图城池点位，玩家与 Agent 通用 */
  GET_MAP_OVERVIEW: 95,
  GET_ANNOUNCEMENTS: 96,
  GET_ANNOUNCEMENT: 97,
  READ_ANNOUNCEMENT: 98,
  /** 用 Google ID Token 换会话令牌（v44）：data.credential；登录前可发，仅供网页；第一次自动建号 */
  GOOGLE_LOGIN: 60,
  /** 给当前账号绑定 Google（v44）：data.credential；仅玩家连接，仅供网页 */
  GOOGLE_BIND: 61,
  /** 发起 GitHub 授权（v45）：data.purpose = login | bind；返回 GitHub 授权地址由网页整页跳转 */
  GITHUB_AUTH_START: 62,
  /** 用一次性登录码换会话令牌（v45）：data.code；OAuth 回跳进页面时使用 */
  OAUTH_REDEEM: 63,
  PUSH_BUILD_STATE: 2000,
  PUSH_AGENT_STATUS: 2001,
  /** 城池级状态变化推送（v7；reason：city_renamed，v9 起另有 account_reset；一期不提供建筑拆除） */
  PUSH_CITY_STATE: 2002,
  /** Agent 计划更新推送（v10）：同账号其他在线连接收到完整计划快照 */
  PUSH_AGENT_PLAN: 2003,
  /** 征兵状态变化推送（v11）：开始 / 排队 / 完成（兵力入城）/ 取消 */
  PUSH_RECRUIT_STATE: 2004,
  /** 行军状态变化推送（v12）：出征 / 到达结算 / 返程回城 */
  PUSH_MARCH_STATE: 2005,
  /** 地块归属 / 驻军变化推送（v12）：占领、失守、NPC 城易主等 */
  PUSH_TILE_STATE: 2006,
  /** 战斗战报生成推送（v13）：攻方或守方账号收到 */
  PUSH_BATTLE_REPORT: 2007,
  // PUSH_AGENT_DIRECTIVE（op 2008，作战方针变更推送）已随协议 v49 移除
  /** 战报点评写入推送（v23 AISLG-53）：账号全部在线连接收到 */
  PUSH_BATTLE_REPORT_COMMENT: 2009,
  /** NPC 袭击预警推送（v23 AISLG-57）：被袭击账号全部在线连接收到 */
  PUSH_NPC_ATTACK_WARNING: 2010,
  /** 全服播报推送（v23 AISLG-60）：全部在线连接收到 */
  PUSH_SERVER_BROADCAST: 2011,
  /** 科技研究状态变化推送（v27 AISLG-77）：发起 / 完成 / 取消，账号全部在线连接收到 */
  PUSH_TECH_STATE: 2012,
  /** 移动目标刷出 / 被截获 / 过时消失推送（v28 AISLG-78）：全部在线连接收到 */
  PUSH_MOVING_TARGET_STATE: 2013,
  /** 黄巾之乱起事 / 进度 / 老巢出现 / 收场推送（v29 AISLG-76）：全部在线连接收到 */
  PUSH_YELLOW_TURBAN_STATE: 2014,
  /** 断粮预警 / 哗变推送（v34 AISLG-107）：被影响账号的全部在线连接收到 */
  PUSH_STARVATION_STATE: 2015,
  /** 微信扫码状态变化推送（v43）：scanned / confirmed / canceled / expired，只推给生成二维码的这条连接 */
  PUSH_WX_QR_STATUS: 2018,
  /** 武将状态变化推送（v36）：招募 / 解雇 / 城守变更 / 欠饷 / 重伤 / 经验升级 / 获得名将，账号全部在线连接收到 */
  PUSH_HERO_STATE: 2016,
  /** 玩家部队来袭预警推送（v38 AISLG-122）：被袭击账号全部在线连接收到 */
  PUSH_ATTACK_WARNING: 2017,
  /** 聊天新消息推送（v51）：世界频道 / 私聊，仅推给玩家连接 */
  PUSH_CHAT_MESSAGE: 2019,
  /** 账号级状态变化推送（v52）：account_renamed=昵称被 SET_NICKNAME 修改；账号全部在线连接收到 */
  PUSH_ACCOUNT_STATE: 2020,
  /** 竞技场状态变化推送（v53，AISLG-145）：challenged / daily_reward / milestone，账号全部在线连接收到 */
  PUSH_ARENA_STATE: 2021,
  PUSH_ANNOUNCEMENT: 2022,
  /** 查询将星塔（v55，AISLG-146） */
  GET_STAR_TOWER: 83,
  /** 挑战将星塔下一层（v55，AISLG-146）：无参数，三局两胜，赢了首通发奖励 */
  STAR_TOWER_CHALLENGE: 84,
  /** 查询将星塔战报（v55，AISLG-146） */
  GET_STAR_TOWER_REPORTS: 85,
  /** 副本与宝物（v61） */
  GET_DUNGEON: 99,
  ENTER_DUNGEON: 100,
  GET_DUNGEON_REPORTS: 101,
  GET_ITEMS: 102,
  EQUIP_ITEM: 103,
  UNEQUIP_ITEM: 104,
  SELL_ITEM: 105,
  /** 副本挑战结算完成推送（v61） */
  PUSH_DUNGEON_STATE: 2023,
} as const;

export type Op = (typeof Op)[keyof typeof Op];
