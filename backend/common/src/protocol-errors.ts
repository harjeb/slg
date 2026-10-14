/** 错误码。补充新错误码时同步 backend/README.md。 */
export const ErrorCode = {
  /** 消息不是合法的协议帧（非 JSON / 缺少 op 等） */
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  /** 协议号不存在 */
  UNKNOWN_OP: 'UNKNOWN_OP',
  /** 登录前只允许发送 LOGIN */
  NOT_LOGGED_IN: 'NOT_LOGGED_IN',
  /** 已登录连接重复发送 LOGIN */
  ALREADY_LOGGED_IN: 'ALREADY_LOGGED_IN',
  /** 请求参数缺失或格式不对 */
  INVALID_PARAMS: 'INVALID_PARAMS',
  /** 用户名已存在且密码不正确 */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  /** 密码登录的用户名不存在：密码通道已关闭自动注册（v48），新账号只能经第三方登录（Google / GitHub / 微信扫码）创建 */
  SIGNUP_CLOSED: 'SIGNUP_CLOSED',
  // USERNAME_TAKEN（并发同名注册时后提交方的错误码）已随 v48 密码首登注册的关闭移除：
  // 注册不再走密码通道，该错误码不会再出现。
  // AGENT_ACCOUNT_NOT_FOUND（v43 账号不存在时拒 Agent 登录）已随 v47 移除：
  // Agent 一律禁用账号密码登录（AGENT_PASSWORD_FORBIDDEN），不再走到「查账号」那一步。
  /** Agent 不允许用账号密码登录（v47，AISLG-130）：只能用永久令牌（玩家「复制给 AI」的提示词里带） */
  AGENT_PASSWORD_FORBIDDEN: 'AGENT_PASSWORD_FORBIDDEN',
  /** 该站点关闭了账号密码登录（v47，AISLG-130：国际站只有 Google / GitHub；按连接的 Host 判定） */
  PASSWORD_LOGIN_CLOSED: 'PASSWORD_LOGIN_CLOSED',
  /** 会话令牌登录时令牌无效或已过期（不存在、被吊销或超期） */
  SESSION_INVALID: 'SESSION_INVALID',
  /** 资源不足以支付建造 */
  INSUFFICIENT_RESOURCES: 'INSUFFICIENT_RESOURCES',
  /** 已有在建建筑（v4 起建造改为排队制，该错误码保留但不再由 BUILD 返回） */
  BUILD_IN_PROGRESS: 'BUILD_IN_PROGRESS',
  /** 建造队列已满（1 在建 + 排队上限），等队首完成后重试 */
  QUEUE_FULL: 'QUEUE_FULL',
  /** 该类型建筑已建成，或已在建造/升级队列中（v5：每种建筑同城唯一） */
  BUILDING_EXISTS: 'BUILDING_EXISTS',
  /** 该类型尚未建造，不能升级（v5） */
  BUILDING_NOT_BUILT: 'BUILDING_NOT_BUILT',
  /** 建筑已达等级上限（v5） */
  BUILDING_LEVEL_MAX: 'BUILDING_LEVEL_MAX',
  /** 目标建造不存在、不属于本账号或不在排队状态（v7：仅排队条目可取消，在建可否取消待定） */
  BUILD_NOT_CANCELLABLE: 'BUILD_NOT_CANCELLABLE',
  /** 协议对连接声明的登录类型有限制（基于自报 role，非安全边界）：RESET_ACCOUNT 仅玩家、AGENT_REPORT_PLAN 仅 Agent（v9/v10） */
  AGENT_FORBIDDEN: 'AGENT_FORBIDDEN',
  /** 该兵种需要更高等级的军营（v11；未建军营同样返回） */
  TROOP_NOT_AVAILABLE: 'TROOP_NOT_AVAILABLE',
  /** 人口不足以征募该数量（v11） */
  INSUFFICIENT_POPULATION: 'INSUFFICIENT_POPULATION',
  /** 征兵队列已满（1 征募中 + 排队上限，占位数值；v11） */
  RECRUIT_QUEUE_FULL: 'RECRUIT_QUEUE_FULL',
  /** 目标征兵不存在、不属于本账号或不在排队状态（v11：仅排队条目可取消，征募中能否取消待定） */
  RECRUIT_NOT_CANCELLABLE: 'RECRUIT_NOT_CANCELLABLE',
  /** 出征目标不可攻击（v12：地图外 / 玩家城池 / 他人占领的地块——玩家对抗随后续阶段开放） */
  TARGET_NOT_ATTACKABLE: 'TARGET_NOT_ATTACKABLE',
  /** 城内兵力不足以派出该编队（v12） */
  INSUFFICIENT_TROOPS: 'INSUFFICIENT_TROOPS',
  /** 该地块未被本账号占领，无法召回驻军（v12） */
  TILE_NOT_OCCUPIED: 'TILE_NOT_OCCUPIED',
  /** 行军不存在、不属于本账号、不在行军中或已是返程，无法撤回（v13） */
  MARCH_NOT_RECALLABLE: 'MARCH_NOT_RECALLABLE',
  /** 目标地块处于 24 小时掠夺冷却中（v16：成功掠夺过，在途到达仍战斗但资源为零） */
  PLUNDER_COOLDOWN: 'PLUNDER_COOLDOWN',
  /** 该任务类型不适用于此目标（v16：NPC 城池仅支持掠夺 task='plunder'） */
  TASK_INVALID_FOR_TARGET: 'TASK_INVALID_FOR_TARGET',
  /** 占领野地数已达官府等级上限（v16：上限 = 官府等级；到达结算同样复核） */
  TERRITORY_LIMIT: 'TERRITORY_LIMIT',
  /** 占领 NPC 城需要主城官府 ≥ 3 级（v24，AISLG-58） */
  GOVERNMENT_TOO_LOW: 'GOVERNMENT_TOO_LOW',
  /** 分城数已达上限 = floor(主城官府等级 ÷ 2)（v24，AISLG-58；v57 由 ÷3 放宽；到达结算同样复核） */
  BRANCH_LIMIT: 'BRANCH_LIMIT',
  /** 目标 NPC 城等级高于出发城的官府等级（v24，AISLG-58） */
  TARGET_LEVEL_TOO_HIGH: 'TARGET_LEVEL_TOO_HIGH',
  /** 名城外围未清空，不能攻城守 / 占领（v24，AISLG-56）：先出征清理外围 */
  OUTER_NOT_CLEARED: 'OUTER_NOT_CLEARED',
  /** 放弃分城被拒：该城放弃冷却未结束，本账号暂不能再占回此 NPC 城（v57，AISLG-153；占领资格复核也返回它） */
  DISCARD_COOLDOWN: 'DISCARD_COOLDOWN',
  /** 放弃分城被拒：主城不能放弃（v57，AISLG-153） */
  DISCARD_MAIN_CITY: 'DISCARD_MAIN_CITY',
  /** 放弃分城被拒：该城或其名下野地正在被攻打 / 有 NPC 来袭未结（v57，AISLG-153） */
  CITY_IN_BATTLE: 'CITY_IN_BATTLE',
  /** 放弃分城被拒：该城仍有部队在外（行军 / 返程 / 运输 / 侦察），需先等其结束（v57，AISLG-153） */
  ARMY_OUTSIDE: 'ARMY_OUTSIDE',
  /** 放弃分城被拒：名下野地里仍有驻军，需先召回（v57，AISLG-153） */
  WILDERNESS_GARRISONED: 'WILDERNESS_GARRISONED',
  /** 运输货物总量超过所派编队的负重（v26，AISLG-79） */
  CARGO_OVER_CAPACITY: 'CARGO_OVER_CAPACITY',
  /** 该科技已满级（v27，AISLG-77） */
  TECH_LEVEL_MAX: 'TECH_LEVEL_MAX',
  /** 账号已有进行中的研究，同一时间只能研究一项（v27，AISLG-77） */
  RESEARCH_IN_PROGRESS: 'RESEARCH_IN_PROGRESS',
  /** 发起研究的城书院等级低于目标等级（v27，AISLG-77：第 N 级要求书院 ≥ N 级，未建书院按 0） */
  ACADEMY_TOO_LOW: 'ACADEMY_TOO_LOW',
  /** 没有可取消的研究，或研究不属于本账号 / 已结束（v27，AISLG-77） */
  RESEARCH_NOT_CANCELLABLE: 'RESEARCH_NOT_CANCELLABLE',
  /** 本城同时在外的部队数已达校场等级上限（v30，AISLG-80；未建校场按 1，计入行军 / 返程 / 驻守野地，不计城内驻军） */
  DEPLOY_LIMIT: 'DEPLOY_LIMIT',
  /** 截击的移动目标不存在 / 已被击败 / 已过时消失（v28，AISLG-78；到达时目标已消失按「目标消失」战报处理，不报错） */
  MOVING_TARGET_GONE: 'MOVING_TARGET_GONE',
  /** 该城未建酒馆（v36，AISLG-114；招募与候选刷新都要求酒馆） */
  TAVERN_NOT_BUILT: 'TAVERN_NOT_BUILT',
  /** 招募候选不存在 / 已被刷新掉 / 不属于本账号的城（v36，AISLG-114） */
  HERO_CANDIDATE_GONE: 'HERO_CANDIDATE_GONE',
  /** 普通将数量已达上限 = ⌈酒馆最高等级 ÷ 2⌉ + 1（v36，AISLG-114） */
  HERO_CAP_REACHED: 'HERO_CAP_REACHED',
  /** 武将不存在 / 不属于本账号（v36，AISLG-114） */
  HERO_NOT_FOUND: 'HERO_NOT_FOUND',
  /** 武将正在行军中（随队未归），不能出征 / 解雇 / 任城守（v36，AISLG-114） */
  HERO_BUSY: 'HERO_BUSY',
  /** 武将重伤中，不能出征（v36，AISLG-114；带队战败重伤 2 小时基准） */
  HERO_WOUNDED: 'HERO_WOUNDED',
  /** 武将欠饷中，不能出征（v36，AISLG-114；俸禄扣款成功后自动恢复） */
  HERO_ARREARS: 'HERO_ARREARS',
  /** 城守只能任命本账号、未随行出征的武将（v36，AISLG-115） */
  GUARD_ASSIGN_DENIED: 'GUARD_ASSIGN_DENIED',
  /** 武将正在历练中，不能出征 / 任城守 / 解雇 / 加点 / 洗点 / 再次历练（v54，AISLG-144） */
  HERO_TRAINING: 'HERO_TRAINING',
  /** 自由点数不足以分配（v54，AISLG-144；附 freePoints） */
  HERO_POINTS_INSUFFICIENT: 'HERO_POINTS_INSUFFICIENT',
  /** 武将没有可洗回的点数（已分配为 0，v54，AISLG-144） */
  HERO_NOTHING_TO_RESET: 'HERO_NOTHING_TO_RESET',
  /** 今日次数已用完（赏赐 3 次 / 洗点 1 次 / 结交 5 次，按武将或名将计，游戏日重置；v54，AISLG-144；附 limit） */
  HERO_DAILY_LIMIT: 'HERO_DAILY_LIMIT',
  /** 尚未获得该在野名将的结交资格（需先打赢其所在野地的守军；v54，AISLG-144） */
  HERO_NOT_UNLOCKED: 'HERO_NOT_UNLOCKED',
  /** 同时结交的在野名将已达上限 2 名（v54，AISLG-144；好感未满且未被他人招揽的才计入） */
  HERO_FRIENDSHIP_LIMIT: 'HERO_FRIENDSHIP_LIMIT',
  /** 好感度未满 100，不能招揽（v54，AISLG-144；附 favor） */
  HERO_FAVOR_INSUFFICIENT: 'HERO_FAVOR_INSUFFICIENT',
  /** 好感度已满 100，无需再结交（v54，AISLG-144；直接招揽） */
  HERO_FAVOR_FULL: 'HERO_FAVOR_FULL',
  /** 名将已被他人获得（v54，AISLG-144） */
  FAMOUS_CLAIMED: 'FAMOUS_CLAIMED',
  /** 目标玩家处于新手保护期（v38，AISLG-122：注册后 3 天或官府 5 级先到为准；不能被侦察 / 攻击），
   *  响应附 until 与 retryAfterSeconds */
  NEWBIE_PROTECTED: 'NEWBIE_PROTECTED',
  /** 目标处于免战期（v38，AISLG-122：被打后免战或主动免战；玩家与 NPC 都不能再打），响应附 until 与 retryAfterSeconds */
  TARGET_IN_TRUCE: 'TARGET_IN_TRUCE',
  /** 自己的主动免战生效中，不能出兵攻打玩家（v38，AISLG-122；打野地 / NPC 不受影响），响应附 until */
  SELF_TRUCE_ACTIVE: 'SELF_TRUCE_ACTIVE',
  /** 主动免战已在生效中（v38，AISLG-122；TRUCE 重复开启），响应附 until */
  TRUCE_ALREADY_ACTIVE: 'TRUCE_ALREADY_ACTIVE',
  /** 本周主动免战已用过（v38，AISLG-122；每周一次），响应附 nextAvailableAt 与 retryAfterSeconds */
  TRUCE_WEEKLY_USED: 'TRUCE_WEEKLY_USED',
  /** 该野地刚换主人，处于保护期（v39，AISLG-123：被抢占后 1 小时基准随缩放，期间玩家与 NPC 都不能再抢），
   *  响应附 until 与 retryAfterSeconds */
  TILE_PROTECTED: 'TILE_PROTECTED',
  /** 微信 ticket 不存在、已过期、已被扫 / 已用过，或确认方不是扫码的那条连接（v43） */
  WX_TICKET_INVALID: 'WX_TICKET_INVALID',
  /** 微信 jscode2session 换 openid 失败：code 过期或已被使用（v43） */
  WX_CODE_INVALID: 'WX_CODE_INVALID',
  /** 绑定微信时，该微信已绑了别的账号，或当前账号已绑了别的微信（v43） */
  WX_ALREADY_BOUND: 'WX_ALREADY_BOUND',
  /** 微信接口调用失败，或服务端没配置微信小游戏 AppID / AppSecret（v43） */
  WX_UNAVAILABLE: 'WX_UNAVAILABLE',
  /** Google 登录暂不可用：服务端没配置 Client ID，或连不上 Google 公钥服务（v44） */
  GOOGLE_UNAVAILABLE: 'GOOGLE_UNAVAILABLE',
  /** Google 登录凭证（ID Token）无效：伪造、过期、签名不对或不是发给本应用的（v44） */
  GOOGLE_CREDENTIAL_INVALID: 'GOOGLE_CREDENTIAL_INVALID',
  /** 绑定 Google 时，该 Google 账号已绑了别的号，或当前账号已绑了别的 Google 账号（v44） */
  GOOGLE_ALREADY_BOUND: 'GOOGLE_ALREADY_BOUND',
  /** GitHub 登录暂不可用：服务端没配置 GitHub OAuth App 凭证，或调 GitHub 接口失败（v45） */
  GITHUB_UNAVAILABLE: 'GITHUB_UNAVAILABLE',
  /** 一次性登录码无效 / 已过期 / 已被使用（v45：OAUTH_REDEEM 的 code 只能用一次，60 秒有效） */
  OAUTH_CODE_INVALID: 'OAUTH_CODE_INVALID',
  /** 绑定 GitHub 时，该 GitHub 账号已绑了别的号，或当前账号已绑了别的 GitHub 账号（v45） */
  GITHUB_ALREADY_BOUND: 'GITHUB_ALREADY_BOUND',
  /** 请求过于频繁（v43：二维码生成 / Google 登录尝试 / GitHub 授权发起均按 IP 限频，20 次/分钟） */
  RATE_LIMITED: 'RATE_LIMITED',
  // AGENT_TOKEN_LIMIT（v43，多令牌上限）已随 v46 移除：每账号一个永久令牌，无上限概念。
  /** 聊天：主城官府未达世界频道发言门槛（v51，官府 ≥ 3 级） */
  CHAT_GOVERNMENT_TOO_LOW: 'CHAT_GOVERNMENT_TOO_LOW',
  /** 聊天：账号被运营禁言（v51），响应附 until */
  CHAT_MUTED: 'CHAT_MUTED',
  /** 聊天：对方已屏蔽你，不能发私聊（v51） */
  CHAT_BLOCKED: 'CHAT_BLOCKED',
  /** 聊天：同一频道发言过快（v51，每 10 秒一条），响应附 retryAfterSeconds */
  CHAT_RATE_LIMITED: 'CHAT_RATE_LIMITED',
  /** 昵称已被其他账号占用（v52，SET_NICKNAME；昵称即账号 username，全服唯一） */
  NICKNAME_TAKEN: 'NICKNAME_TAKEN',
  /** 竞技场：还没入榜（先 SET_ARENA_LINEUP 保存阵容）或阵容里一名武将都没有（v53，AISLG-145） */
  ARENA_NOT_JOINED: 'ARENA_NOT_JOINED',
  /** 竞技场：对手席位不存在，或名次已变化不在可挑战范围内（v53；须比自己靠前且差距 ≤ 10 名） */
  ARENA_TARGET_INVALID: 'ARENA_TARGET_INVALID',
  /** 竞技场：今日挑战次数已用完（v53），响应附 nextDayAt 与 retryAfterSeconds */
  ARENA_NO_CHALLENGES: 'ARENA_NO_CHALLENGES',
  /** 竞技场：对手今日被挑战的次数已达上限（v53），响应附 nextDayAt 与 retryAfterSeconds */
  ARENA_TARGET_BUSY: 'ARENA_TARGET_BUSY',
  /** 竞技场：刚挑战过同一个对手，冷却中（v53），响应附 retryAfterSeconds */
  ARENA_PAIR_COOLDOWN: 'ARENA_PAIR_COOLDOWN',
  /** 将星塔：已全部通关，没有可挑战的层（v55，AISLG-146） */
  STAR_TOWER_CLEARED: 'STAR_TOWER_CLEARED',
  /** 将星塔：账号还没有城，首通金币无处入账，不能挑战（v55，AISLG-146） */
  STAR_TOWER_NO_CITY: 'STAR_TOWER_NO_CITY',
  /** 将星塔：阵容里一名武将都没有，先保存阵容（SET_ARENA_LINEUP）（v55，AISLG-146） */
  STAR_TOWER_NO_LINEUP: 'STAR_TOWER_NO_LINEUP',
  /** 公告：不存在、已撤回、未到生效时间或不属于本站（v60，AISLG-162） */
  ANNOUNCEMENT_NOT_FOUND: 'ANNOUNCEMENT_NOT_FOUND',
  /** 副本：今日次数已用完（v61，北京日刷新） */
  DUNGEON_NO_ATTEMPTS: 'DUNGEON_NO_ATTEMPTS',
  /** 副本：部队人口超过上限（v61） */
  DUNGEON_POP_LIMIT: 'DUNGEON_POP_LIMIT',
  /** 副本：武将超过 1 名主将 + 2 名副将（v61） */
  DUNGEON_HERO_LIMIT: 'DUNGEON_HERO_LIMIT',
  /** 副本：已有一支部队在打这个副本（在路上），结算后才能再出征（v61） */
  DUNGEON_IN_PROGRESS: 'DUNGEON_IN_PROGRESS',
  /** 宝物不存在 / 不属于本账号（v61） */
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  /** 宝物正装在武将身上，先卸下才能出售（v61） */
  ITEM_EQUIPPED: 'ITEM_EQUIPPED',
  /** 服务端内部错误 */
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
