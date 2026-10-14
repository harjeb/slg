/** 客户端请求与服务端推送的协议号 */
export const Op = {
  /** C→S 登录（未登录连接仅允许此协议；支持密码与会话令牌两种方式） */
  LOGIN: 1,
  /** C→S 登出：吊销本连接登录所用的会话令牌，服务端随后关闭连接 */
  LOGOUT: 2,
  /** C→S 查询当前城池状态 */
  GET_STATE: 10,
  /** C→S 查询历史事件 */
  GET_EVENTS: 11,
  /** C→S 查询 Agent 连接与操作信息 */
  GET_AGENT_INFO: 12,
  /** C→S 发起建筑建造（data.kind 指定建筑类型）；v3 起为四种资源建筑的统一入口 */
  BUILD: 21,
  /** C→S 发起建筑升级（data.kind 指定建筑类型，升到下一等级；v5，与建造共用队列） */
  UPGRADE: 22,
  /** C→S 取消建造队列中的排队条目（data.buildId；v7，全额返还已扣成本；在建可否取消待定） */
  CANCEL_BUILD: 24,
  /** C→S 城池改名（data.name；v7） */
  RENAME_CITY: 25,
  /** C→S 一键重置账号数据（data.confirm=true；v9，全部游戏数据回到开号初始状态） */
  RESET_ACCOUNT: 26,
  /** C→S Agent 上报计划（data.nextAction / data.overallPlan；v10，仅 Agent 连接） */
  AGENT_REPORT_PLAN: 27,
  /** C→S 发起征兵（data.troop 兵种 + data.count 数量；v11，军营等级解锁兵种） */
  RECRUIT: 28,
  /** C→S 取消征兵队列中的排队条目（data.recruitId；v11，全额返还资源与人口） */
  CANCEL_RECRUIT: 29,
  /** C→S 查询世界地图窗口（data.x/y/w/h 可选；v12，缺省以主城为中心 10×10） */
  GET_WORLD_MAP: 30,
  /** C→S 查询地块详情（data.x + data.y；v12，野地 / NPC 城池 / 城池） */
  GET_TILE: 31,
  /** C→S 从主城出征（data.x/y 目标 + data.troops 按兵种数量；v16 新增可选 data.task plunder/occupy，缺省 plunder；目标为本账号分城时为调兵） */
  MARCH: 32,
  /** C→S 撤回占领野地的驻军（data.x + data.y；v12，撤回即放弃占领） */
  RECALL_GARRISON: 33,
  /** C→S 斥候侦察目标地块（data.x/y + data.count；v13，到达产出情报快照并返程） */
  SCOUT: 34,
  /** C→S 撤回行军途中的部队（data.marchId；v13，原地折返、按已走时长返程） */
  RECALL_MARCH: 35,
  /** C→S 查询战斗战报（data.limit / beforeId；v13） */
  GET_BATTLE_REPORTS: 36,
  /** C→S 集市兑换（data.resource 四选一 + data.amount；v22，AISLG-42：按固定汇率把资源换成金币） */
  EXCHANGE: 37,
  // SET_AGENT_DIRECTIVE（op 38，作战方针）已随 v49 移除：玩家改与自己的 Agent 直接讨论，
  // 不再经游戏设置方针。老客户端发该号会收到 UNKNOWN_OP。
  /** C→S Agent 写回战报点评（data.reportId + data.text；v23，AISLG-53，仅 Agent 连接） */
  AGENT_COMMENT_REPORT: 39,
  /** C→S Agent 写离线日报（data.text；v23，AISLG-54，仅 Agent 连接） */
  AGENT_DAILY_REPORT: 40,
  /** C→S 查询离线日报（v23，AISLG-54：离线时长、离线期间收获/损失汇总与 Agent 最近日报） */
  GET_OFFLINE_REPORT: 41,
  /** C→S 查询全服播报（v23，AISLG-60：最近的大事列表，新→旧） */
  GET_SERVER_BROADCASTS: 42,
  /** C→S 查询全服排行榜（v23，AISLG-61：三榜快照，前 50 名 + 我的名次） */
  GET_LEADERBOARD: 43,
  /** C→S 查询科技状态（v27，AISLG-77：6 项科技等级 / 下一级成本与耗时 / 进行中的研究） */
  GET_TECHS: 44,
  /** C→S 发起科技研究（v27，AISLG-77：data.tech；账号同一时间只研究一项，需书院） */
  RESEARCH_TECH: 45,
  /** C→S 取消进行中的研究（v27，AISLG-77：全额返还） */
  CANCEL_RESEARCH: 46,
  /** C→S 查询移动目标（v28，AISLG-78：流寇与运粮商队的当前位置、公开路线与时刻表） */
  GET_MOVING_TARGETS: 47,
  /** C→S 查询黄巾之乱（v29，AISLG-76：事件进度 / 营地与老巢 / 我的贡献与名次 / 贡献榜） */
  GET_YELLOW_TURBAN: 48,
  /** C→S 查询武将（v36，AISLG-114/115/116：账号武将 / 酒馆候选 / 上限 / 名将归属） */
  GET_HEROES: 49,
  /** C→S 酒馆招募武将（v36，AISLG-114：data.candidateId，金币从酒馆所在城扣除） */
  RECRUIT_HERO: 50,
  /** C→S 解雇武将（v36，AISLG-114：data.heroId；名将解雇后回到全服可获得状态） */
  DISMISS_HERO: 51,
  /** C→S 任命 / 撤换城守（v36，AISLG-115：data.heroId，null 撤任；守城加成 + 产量加成） */
  ASSIGN_HERO: 52,
  /** C→S 开启主动免战（v38，AISLG-122：无参数；每周一次免费、12 小时，期内别人打不了他、他也不能出兵打玩家） */
  TRUCE: 53,
  /** C→S 生成微信扫码二维码（v43：data.purpose = login | bind；login 登录前即可发，bind 需玩家登录；仅供网页） */
  WX_QR_CREATE: 54,
  /** C→S 微信小游戏扫码上报（v43：data.ticket + data.code；登录前即可发，仅供微信小游戏） */
  WX_SCAN: 55,
  /** C→S 微信小游戏确认登录 / 绑定（v43：data.ticket；只接受扫码的那条连接，仅供微信小游戏） */
  WX_CONFIRM: 56,
  /** C→S 微信小游戏取消登录 / 绑定（v43：data.ticket；只接受扫码的那条连接，仅供微信小游戏） */
  WX_CANCEL: 57,
  // 58 / 59（v43 的 ISSUE_AGENT_TOKEN / REVOKE_AGENT_TOKEN）已随 v46 移除：Agent 接入改为
  // 每账号一个永久令牌（GET_AGENT_TOKEN / RESET_AGENT_TOKEN，op 64 / 65）。
  /** C→S 用 Google ID Token 换会话令牌（v44：data.credential；登录前可发，仅供网页；第一次自动建号） */
  GOOGLE_LOGIN: 60,
  /** C→S 给当前账号绑定 Google（v44：data.credential；仅玩家连接，仅供网页） */
  GOOGLE_BIND: 61,
  /** C→S 发起 GitHub 授权（v45：data.purpose = login | bind；login 登录前可发，返回 GitHub 授权地址由网页整页跳转） */
  GITHUB_AUTH_START: 62,
  /** C→S 用一次性登录码换会话令牌（v45：data.code；登录前可发，OAuth 回跳进页面时使用） */
  OAUTH_REDEEM: 63,
  /** C→S 查看本账号的永久 Agent 令牌（v46：无参数；仅玩家连接，没有时自动补生成，响应带令牌原文） */
  GET_AGENT_TOKEN: 64,
  /** C→S 重置永久 Agent 令牌（v46：无参数；仅玩家连接，旧令牌立即失效、用它在线的连接被断开） */
  RESET_AGENT_TOKEN: 65,
  /** C→S 聊天：查询世界频道或与某玩家的私聊消息（v51，仅玩家连接） */
  CHAT_HISTORY: 66,
  /** C→S 聊天：发送文字（表情写在文字里）/ 卡片（v51，仅玩家连接；世界频道需主城官府 ≥ 3 级） */
  CHAT_SEND: 67,
  /** C→S 聊天：私聊会话列表、未读数与屏蔽名单（v51，仅玩家连接） */
  CHAT_CONVERSATIONS: 68,
  /** C→S 聊天：把与某玩家的私聊标记为已读（v51，仅玩家连接） */
  CHAT_READ: 69,
  /** C→S 聊天：屏蔽 / 取消屏蔽某个玩家（v51，仅玩家连接） */
  CHAT_BLOCK: 70,
  /** C→S 聊天：打开一条战报卡片的详情（v51，仅玩家连接） */
  CHAT_REPORT_DETAIL: 71,
  /** C→S 修改账号昵称（data.nickname；v52，仅玩家连接；昵称即账号 username，全服唯一，重名返回 NICKNAME_TAKEN） */
  SET_NICKNAME: 72,
  /** C→S 查询竞技场（v53，AISLG-145：我的名次 / 阵容 / 今日次数 / 可挑战对手 / 榜单前 100 / 规则常量） */
  GET_ARENA: 73,
  /** C→S 保存竞技场阵容（v53，AISLG-145：data.heroIds 三个号位，空位 null；第一次保存即入榜，排在最后一名） */
  SET_ARENA_LINEUP: 74,
  /** C→S 发起竞技挑战（v53，AISLG-145：data.entryId；三局两胜，赢了与对手互换名次，当场算完） */
  ARENA_CHALLENGE: 75,
  /** C→S 查询竞技场战报（v53，AISLG-145：我挑战过的和挑战过我的，保留 7 天） */
  GET_ARENA_REPORTS: 76,
  /** C→S 分配自由点数（v54，AISLG-144：data.heroId + lead / force / wit 各为非负整数，合计 ≥ 1；仅在家武将） */
  ALLOCATE_HERO_POINTS: 77,
  /** C→S 洗点（v54，AISLG-144：data.heroId；已分配点数全部退回，花金币 = 等级 × 1000，每日 1 次） */
  RESET_HERO_POINTS: 78,
  /** C→S 派武将历练（v54，AISLG-144：data.heroId + tier 1/2/3 = 1/4/12 小时基准，到点经验自动到账） */
  TRAIN_HERO: 79,
  /** C→S 赏赐武将（v54，AISLG-144：data.heroId；花 1000 金币 → 100 经验，每日 3 次） */
  GIFT_HERO: 80,
  /** C→S 结交在野名将（v54，AISLG-144：data.heroName；需结交资格，花 500 × 野地等级金币，好感 +10，每日 5 次） */
  BEFRIEND_HERO: 81,
  /** C→S 招揽在野名将（v54，AISLG-144：data.heroName；好感满 100 才能招揽，全服唯一） */
  RECRUIT_FAMOUS_HERO: 82,
  /** C→S 查询任务与签到状态（v56，AISLG-200：今日日常任务进度 / 领取状态 + 签到状态） */
  GET_DAILY: 86,
  /** C→S 领取日常任务奖励（data.taskId；v56，任务已完成且未领取时成功；重复领取/未完成返回 INVALID_PARAMS） */
  CLAIM_DAILY: 87,
  /** C→S 查询签到状态（v56，AISLG-200；GET_DAILY 已含签到状态，本协议单独提供） */
  GET_SIGNIN: 88,
  /** C→S 每日签到（v56，AISLG-200：每天一次，连续签到 7 天一轮循环；当日重复签到返回 INVALID_PARAMS） */
  SIGNIN: 89,
  /** C→S 查询主线 / 支线任务与成就状态（v56，AISLG-200 二期） */
  GET_QUESTS: 90,
  /** C→S 领取任务 / 成就奖励（data.kind = main|side|achv，data.id；v56；未完成 / 重复领取返回 INVALID_PARAMS） */
  CLAIM_QUEST: 91,
  /** C→S 查询活动状态（v56，AISLG-200 三期：开服冲刺 + 每日活跃） */
  GET_ACTIVITIES: 92,
  /** C→S 领取活动奖励（data.id = 阶梯 id；v56；未达成 / 不在活动期 / 重复领取返回 INVALID_PARAMS） */
  CLAIM_ACTIVITY: 93,
  /** C→S 放弃分城（v57，AISLG-153：data.cityId 必填、data.confirm 必须为 true；主城不能放弃，城内资源与驻军作废，地块转回 NPC 城） */
  DISCARD_CITY: 94,
  /** C→S 查询世界小地图总览（v58，AISLG-160：全图城池点位 [x, y, side]，不含野地；玩家与 Agent 通用） */
  GET_MAP_OVERVIEW: 95,
  /** C→S 公告列表（v60，AISLG-162：生效中公告，或 history=true 的往期；玩家与 Agent 通用） */
  GET_ANNOUNCEMENTS: 96,
  /** C→S 公告正文（v60，AISLG-162：可见的公告，含往期；玩家与 Agent 通用） */
  GET_ANNOUNCEMENT: 97,
  /** C→S 标记公告已读（v60，AISLG-162：幂等；玩家与 Agent 通用） */
  READ_ANNOUNCEMENT: 98,
  /** C→S 查询副本（v61：入口坐标、规则、6 波敌军、掉落表、今日剩余次数、进行中的挑战） */
  GET_DUNGEON: 99,
  /** C→S 出征副本（v61：data.dungeonId / mainHeroId / deputyHeroIds / troops / retreatBelowPercent，可选 cityId） */
  ENTER_DUNGEON: 100,
  /** C→S 查询副本战报（v61：data.limit / beforeId；每人保留最近 50 条已结算） */
  GET_DUNGEON_REPORTS: 101,
  /** C→S 查询背包（v61：宝物实例与装在谁身上） */
  GET_ITEMS: 102,
  /** C→S 装备宝物（v61：data.itemId / heroId；一将一件，原有的回背包） */
  EQUIP_ITEM: 103,
  /** C→S 卸下宝物（v61：data.itemId） */
  UNEQUIP_ITEM: 104,
  /** C→S 出售宝物（v61：data.itemId；只能卖背包里的，固定价金币进主城） */
  SELL_ITEM: 105,
  /** C→S 查询将星塔（v55，AISLG-146：已通过的最高层 / 下一层敌方阵容与奖励 / 阵容（与竞技场共用）） */
  GET_STAR_TOWER: 83,
  /** C→S 挑战将星塔的下一层（v55，AISLG-146：无参数；三局两胜，赢了首通发奖励并推进进度，输了不扣任何东西） */
  STAR_TOWER_CHALLENGE: 84,
  /** C→S 查询将星塔战报（v55，AISLG-146：我每次挑战的战报，每人保留最近 50 条） */
  GET_STAR_TOWER_REPORTS: 85,
  /** C→S 发起农场建造（兼容入口：等价于 BUILD 且 kind='farm'） */
  BUILD_FARM: 20,
  /** S→C 推送：农场建造状态变化（进入建造 / 完成） */
  PUSH_BUILD_STATE: 2000,
  /** S→C 推送：Agent 连接上线 / 离线 */
  PUSH_AGENT_STATUS: 2001,
  /** S→C 推送：城池级状态变化（改名；v7） */
  PUSH_CITY_STATE: 2002,
  /** S→C 推送：Agent 计划更新（v10） */
  PUSH_AGENT_PLAN: 2003,
  /** S→C 推送：征兵状态变化（开始/排队/完成/取消；v11） */
  PUSH_RECRUIT_STATE: 2004,
  /** S→C 推送：行军状态变化（出征/到达结算/返程回城；v12） */
  PUSH_MARCH_STATE: 2005,
  /** S→C 推送：地块归属 / 驻军变化（占领、失守、NPC 城易主等；v12） */
  PUSH_TILE_STATE: 2006,
  /** S→C 推送：战斗战报生成（v13；攻方或守方账号收到） */
  PUSH_BATTLE_REPORT: 2007,
  // PUSH_AGENT_DIRECTIVE（op 2008，作战方针变更推送）已随 v49 移除（与 SET_AGENT_DIRECTIVE 同期下线）。
  /** S→C 推送：战报点评写入（v23，AISLG-53；账号全部在线连接收到） */
  PUSH_BATTLE_REPORT_COMMENT: 2009,
  /** S→C 推送：NPC 袭击预警（v23，AISLG-57；被袭击账号全部在线连接收到，含 Agent） */
  PUSH_NPC_ATTACK_WARNING: 2010,
  /** S→C 推送：全服播报（v23，AISLG-60；全部在线连接收到） */
  PUSH_SERVER_BROADCAST: 2011,
  /** S→C 推送：科技研究状态变化（v27，AISLG-77；发起 / 完成 / 取消，账号全部在线连接收到） */
  PUSH_TECH_STATE: 2012,
  /** S→C 推送：移动目标刷出 / 被截获 / 过时消失（v28，AISLG-78；全部在线连接收到） */
  PUSH_MOVING_TARGET_STATE: 2013,
  /** S→C 推送：黄巾之乱起事 / 进度变化 / 老巢出现 / 收场（v29，AISLG-76；全部在线连接收到） */
  PUSH_YELLOW_TURBAN_STATE: 2014,
  /** S→C 推送：断粮预警 / 断粮哗变（v34，AISLG-107；被影响账号的全部在线连接收到，含 Agent） */
  PUSH_STARVATION_STATE: 2015,
  /** S→C 推送：武将状态变化（v36，AISLG-114/115/116：招募 / 解雇 / 城守 / 欠饷 / 重伤 / 经验 / 名将） */
  PUSH_HERO_STATE: 2016,
  /** S→C 推送：玩家部队来袭预警（v38，AISLG-122；被袭击账号全部在线连接收到，含 Agent） */
  PUSH_ATTACK_WARNING: 2017,
  /** S→C 推送：微信扫码登录 / 绑定的状态变化（v43：scanned / confirmed / canceled / expired；只推给生成二维码的网页连接） */
  PUSH_WX_QR_STATUS: 2018,
  /** S→C 推送：聊天新消息（v51；世界频道按屏蔽关系过滤，私聊推给双方的玩家连接；Agent 连接不收） */
  PUSH_CHAT_MESSAGE: 2019,
  /** S→C 推送：账号级状态变化（v52：account_renamed=昵称被 SET_NICKNAME 修改；账号全部在线连接收到，含 Agent） */
  PUSH_ACCOUNT_STATE: 2020,
  /** S→C 推送：竞技场状态变化（v53：challenged 被挑战 / daily_reward 每日奖励到账 / milestone 首次进入新名次档；账号全部在线连接收到，含 Agent） */
  PUSH_ARENA_STATE: 2021,
  /** S→C 推送：新公告（v60，AISLG-162；只带标题与分类；本站全部在线连接收到，含 Agent） */
  PUSH_ANNOUNCEMENT: 2022,
  /** S→C 副本挑战结算完成（v61：data.reason = resolved，data.run = 挑战记录） */
  PUSH_DUNGEON_STATE: 2023,
} as const;

export type Op = (typeof Op)[keyof typeof Op];
