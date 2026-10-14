// 协议错误码与 Agent 处置建议，生成文档时由 protocol-doc.ts 再导出。

import type { ErrorCode } from './protocol';

export interface ErrorDoc {
  desc: string;
  /** Agent 收到该错误后的建议处置 */
  action: string;
}

export const ERROR_DOC: Record<ErrorCode, ErrorDoc> = {
  INVALID_MESSAGE: {
    desc: '消息不是合法的协议帧（非 JSON、非对象、缺 op 或 op 非整数；二进制帧同样触发）。响应帧恒为 op=0（原始 op 无法安全回显），帧内可解析出数字 seq 时原样回带，否则无 seq 字段（v17）。',
    action: '检查帧的 JSON 结构后重发；连续出现说明序列化代码有误。',
  },
  UNKNOWN_OP: {
    desc: '协议号不存在。',
    action: '可能是新版服务新增的协议，拉取 GET /agent-api.json 对比协议版本后改用文档内的协议号，不要原样重试。',
  },
  NOT_LOGGED_IN: {
    desc: '登录前只能发送登录协议。',
    action: '先完成 LOGIN（op 1）再重发原请求。',
  },
  ALREADY_LOGGED_IN: {
    desc: '连接已登录，不能重复登录。',
    action: '单条连接只登录一次；需要另一个登录类型时新建连接。',
  },
  INVALID_PARAMS: {
    desc: '请求参数缺失或格式不正确。',
    action: '对照文档字段表修正字段后重发。',
  },
  INVALID_CREDENTIALS: {
    desc: '用户名已存在且密码错误。',
    action: '停止重试，向用户核对凭证。',
  },
  SIGNUP_CLOSED: {
    desc: '密码登录的用户名不存在（v48 起密码通道关闭自动注册，不再自动建号）。',
    action: '新账号请玩家在网页上经 Google / GitHub / 微信扫码登录创建；已有账号核对用户名拼写后重试。',
  },
  SESSION_INVALID: {
    desc: '会话令牌无效或已过期（不存在、被 LOGOUT 吊销或超过有效期），或永久 Agent 令牌已被玩家重置。',
    action: '丢弃本地保存的令牌，在本站重新登录（Agent 请玩家重新发一次新提示词，不要用旧令牌重试；国际站没有密码登录，网页用 Google / GitHub）。',
  },
  INSUFFICIENT_RESOURCES: {
    desc: '资源不足以支付建造。',
    action: '失败响应附当前城池状态（data.city），等待资源积累或调整策略。',
  },
  BUILD_IN_PROGRESS: {
    desc: '已有在建建筑。v4 起 BUILD 改为排队制，本错误码不再由 BUILD 返回（保留定义以兼容旧客户端）。',
    action: '改用 GET_STATE 查看 city.queue 队列状态。',
  },
  QUEUE_FULL: {
    desc: '建造队列已满（1 条在建 + 排队上限，当前为 2 条排队）。',
    action: '失败响应附当前城池状态（data.city.queue 可见队首预计完成时间），等队首完成后重试。',
  },
  BUILDING_EXISTS: {
    desc: '该类型建筑已建成，或已在建造/升级队列中（v5：每种建筑同城唯一，不可重复建造）。',
    action: '已建成时改用 UPGRADE 升级；已在队列中时等该条完成后再操作。',
  },
  BUILDING_NOT_BUILT: {
    desc: '该类型尚未建造且不在建造/升级队列中，不能升级（UPGRADE 前置条件是已建成；在队冲突走 BUILDING_EXISTS）。',
    action: '先用 BUILD 建造该类型，完成后再升级。',
  },
  BUILDING_LEVEL_MAX: {
    desc: '建筑已达等级上限（当前为 20 级，v31 AISLG-85 由 10 级开放；占位数值）。UPGRADE 的 toLevel 超过上限同样返回本错误码。',
    action: '该类型已无法继续升级，转投其他建筑或系统。',
  },
  BUILD_NOT_CANCELLABLE: {
    desc: '目标建造不存在、不属于本账号或不在排队状态。进行中任务能否取消待设计，当前仅排队条目（status=queued）可取消（v7）。',
    action: '用 GET_STATE 查看 city.queue，只对 status=queued 的条目发起 CANCEL_BUILD。',
  },
  AGENT_FORBIDDEN: {
    desc: '该协议对连接声明的登录类型有限制：RESET_ACCOUNT 仅玩家连接可调用，AGENT_REPORT_PLAN 仅 Agent 连接可调用。注意：role 是连接自报的标记，本限制拦住诚实声明的对端，不是可独立验证的安全边界。',
    action: '换由对应登录类型的连接发起（RESET_ACCOUNT 找玩家连接，计划上报找 Agent 连接）；不要改用另一身份重连绕过。',
  },
  TROOP_NOT_AVAILABLE: {
    desc: '该兵种需要更高等级的军营才能征募（v11；未建军营同样返回）。兵种与门槛见 RECRUIT 的字段说明。',
    action: '用 GET_STATE 查看 levels.barracks，先升级军营或改征当前等级可用的兵种。',
  },
  INSUFFICIENT_POPULATION: {
    desc: '人口不足以征募该数量（v11：人口在征募发起时立即扣减，民房上限与增长决定可征数量）。',
    action: '等待人口增长（增速 = 10 × 民房等级 × (等级+1)/小时，无民房为 0）或建 / 升民房后重试；失败响应附当前城池状态。',
  },
  RECRUIT_QUEUE_FULL: {
    desc: '征兵队列已满（1 条征募中 + 排队上限，当前为 2 条，占位数值；v11）。征兵队列独立于建造队列。',
    action: '等队首完成后重试，或先取消排队条目腾出位置。',
  },
  RECRUIT_NOT_CANCELLABLE: {
    desc: '目标征兵不存在、不属于本账号或不在排队状态。征募中条目能否取消待设计，当前仅排队条目可取消（v11）。',
    action: '用 GET_STATE 查看 city.recruitQueue，只对 status=queued 的条目发起 CANCEL_RECRUIT。',
  },
  TARGET_NOT_ATTACKABLE: {
    desc: '出征目标当前不可攻击（v12）：坐标在世界外、玩家城池地块（含自己的城），或已被其他玩家占领的野地。玩家对抗（攻城与争夺野地）随后续阶段开放，当前只能出征无主 / 本账号占领的野地与 NPC 城池。',
    action: '用 GET_WORLD_MAP / GET_TILE 确认目标类别与归属；换一块无主野地或 NPC 城池，或先撤回对本账号地块的出征计划。',
  },
  INSUFFICIENT_TROOPS: {
    desc: '城内驻军不足以派出请求的编队（v12：出征在发起时立即扣减 city.army，行军中的部队不在城内）。',
    action: '失败响应附当前城池状态（data.city.army）；按城内驻军调整编队，或等待征兵完成 / 部队返程后再出征。',
  },
  TILE_NOT_OCCUPIED: {
    desc: '该地块未被本账号占领（无主、他人占领或不是野地），无法召回驻军（v12）。',
    action: '用 GET_STATE 的 city.territory 核对本账号占领的野地坐标，只对列表中的地块发起 RECALL_GARRISON。',
  },
  MARCH_NOT_RECALLABLE: {
    desc: '行军不存在、不属于本账号、不在行军途中或已是返程，无法撤回（v13）。',
    action: '用 GET_STATE 的 city.marches 核对行军 id 与状态，只对 status=marching 且 purpose 不是 return 的行军发起 RECALL_MARCH。',
  },
  PLUNDER_COOLDOWN: {
    desc: '目标地块处于掠夺冷却中（基准 24 小时，实际受全局时间缩放等比缩短；v16：该地块已被成功掠夺，冷却记录见 GET_TILE 的 tile.plunderedAt；冷却内发起掠夺被拒，在途到达仍战斗但资源为零）。',
    action: '读 tile.plunderedAt 判断冷却截止时间，到点后重试掠夺；或改用 task=occupy（占领不受冷却限制）。',
  },
  TASK_INVALID_FOR_TARGET: {
    desc: '该任务类型不适用于此目标（v16 起；v24 起 NPC 城池也可 task=occupy，本码当前不再由出征返回，保留兼容；玩家城池占领随玩家对抗阶段设计）。',
    action: '改用 task=plunder（或不带 task，缺省即掠夺）。',
  },
  TERRITORY_LIMIT: {
    desc: '该城占领的野地数已达官府等级上限（v16：上限 = 官府等级，MARCH task=occupy 发起时初核，Worker 到达时复核——胜利后超限不改归属、幸存部队返程）。',
    action: '升级官府提高上限、召回一块野地驻军，或改用 task=plunder（掠夺不受占领上限限制）。',
  },
  GOVERNMENT_TOO_LOW: {
    desc: '占领 NPC 城（MARCH task=occupy 目标为 NPC 城池）需要主城官府 ≥ 3 级（v24，AISLG-58）。',
    action: '先升级主城官府到 3 级；或对该 NPC 城改用 task=plunder 掠夺。',
  },
  BRANCH_LIMIT: {
    desc: '分城数已达上限（v24 起：上限 = floor(主城官府等级 ÷ 2)，v57 由 ÷3 放宽，名城同样计入；发起时初核，Worker 到达时复核——胜利后超限不建分城、幸存部队返程，事件记录 denial=BRANCH_LIMIT）。',
    action: '升级主城官府（每升 2 级多 1 个名额），或放弃一座不需要的分城（DISCARD_CITY），或改用 task=plunder 掠夺。',
  },
  TARGET_LEVEL_TOO_HIGH: {
    desc: '目标 NPC 城等级高于出发城的官府等级（v24：只能占领不高于出发城官府等级的城）。',
    action: '升级出发城的官府，或从官府更高的城出征，或先掠夺不占领。',
  },
  DISCARD_COOLDOWN: {
    desc: '本账号刚放弃的分城仍在冷却中，不能再占领该 NPC 城（v57，AISLG-153）：冷却 = 放弃时的官府等级 天（按时间缩放）；MARCH task=occupy 发起时初核，Worker 到达时复核——胜利后冷却未结不建分城、幸存部队返程，事件记录 denial=DISCARD_COOLDOWN。',
    action: '等冷却结束（冷却截止见 DISCARD_CITY 响应的 cooldownUntil），或改占其他 NPC 城；掠夺不受此限制。',
  },
  DISCARD_MAIN_CITY: {
    desc: '主城不能放弃，DISCARD_CITY 只能放弃分城（v57，AISLG-153）。',
    action: '如要放弃的是分城，请传该分城的 cityId（GET_STATE 的 cities[]，isMain 为 false）。',
  },
  CITY_IN_BATTLE: {
    desc: '该城或其名下野地正有行军在途（来袭、运输或占领），或有未结的 NPC 来袭，暂不能放弃（v57，AISLG-153）。',
    action: '等待这些行军结算或 NPC 来袭结束后再放弃。',
  },
  ARMY_OUTSIDE: {
    desc: '该分城仍有部队在外（行军 / 返程 / 运输 / 侦察），不能放弃（v57，AISLG-153）。',
    action: '等部队回城或结算后再放弃。',
  },
  WILDERNESS_GARRISONED: {
    desc: '名下野地里仍有驻军，不能放弃（v57，AISLG-153）：放弃后野地转为无主，驻军无处安放。',
    action: '先用 RECALL_MARCH 召回各块野地的驻军，再放弃。',
  },
  OUTER_NOT_CLEARED: {
    desc: '名城外围驻军尚未清空时对其发起 task=occupy（v24，AISLG-56）：名城分两阶段攻打，先清外围、外围清空后才能攻城守并占领。',
    action: '先对该名城出征 task=plunder（或不带 task）清理外围；外围清空后须在限时内（GET_TILE 的 famous.recoversAt）出征 task=occupy 攻城守，超时外围恢复满编。',
  },
  CARGO_OVER_CAPACITY: {
    desc: '运输任务（MARCH task=transport，v26，AISLG-79）的货物总量超过所派编队的负重（Σ 数量 × 单兵 carry）。',
    action: '减少 cargo 数量，或多派部队（民夫单兵负重最高）；负重表见 MARCH 说明。',
  },
  TECH_LEVEL_MAX: {
    desc: '该科技已达等级上限（v27，AISLG-77：每项最高 10 级）。',
    action: '研究其他科技；满级科技不需要再研究。',
  },
  RESEARCH_IN_PROGRESS: {
    desc: '账号已有进行中的研究（v27，AISLG-77：同一时间只能研究一项，与发起城无关）。',
    action: '等待 PUSH_TECH_STATE（research_completed）后再发起，或用 CANCEL_RESEARCH 取消当前研究（全额返还）。',
  },
  ACADEMY_TOO_LOW: {
    desc: '发起研究的城书院等级低于目标等级（v27，AISLG-77：第 N 级科技要求书院 ≥ N 级，未建书院按 0 级）；失败 data 附 academyRequired（要求的书院等级）与 academyLevel（该城现有）。',
    action: '先在该城建造 / 升级书院（academy）到 academyRequired，或改用书院更高的分城发起（data.cityId）。',
  },
  RESEARCH_NOT_CANCELLABLE: {
    desc: '没有可取消的研究（v27，AISLG-77）：账号当前没有进行中的研究、指定的 researchId 不属于本账号 / 已结束，或研究已到期等待结算。',
    action: '先用 GET_TECHS 确认 research 字段；已完成的研究无法取消。',
  },
  DEPLOY_LIMIT: {
    desc: '本城同时在外的部队数已达校场等级上限（v30，AISLG-80）：MARCH / SCOUT 发起时校验，上限 = 校场等级（未建校场按 1），计入行军中、返程中、驻守野地的部队（每块占领野地算一支），不计城内驻军；上线前已在外的部队不受影响、不强制召回，只拦新的出征，直到在外数量降到上限以下。失败 data 附 city（city.deploy = { count, limit }）。分城各算各的。',
    action: '等在外部队回城 / 用 RECALL_GARRISON 召回驻军降到上限以下再出征，或升级本城校场（parade_ground）；GET_STATE 的 city.deploy 可提前判断。',
  },
  MOVING_TARGET_GONE: {
    desc: '截击（MARCH 带 targetId，v28，AISLG-78）发起时目标不存在、已被击败或已过时消失。注意：发起后到达时目标才消失不报错，而是记「目标消失」战报、部队返程。',
    action: '用 GET_MOVING_TARGETS 重新取目标列表，挑还存在的目标再发起。',
  },
  TAVERN_NOT_BUILT: {
    desc: '（v36，AISLG-114）该城未建酒馆，无候选可招。',
    action: '先建酒馆（BUILD kind=tavern），或到已建酒馆的城招募。',
  },
  HERO_CANDIDATE_GONE: {
    desc: '（v36，AISLG-114）候选武将不存在、已被招募或已随批次刷新失效。',
    action: '重拉 GET_HEROES 取当前候选再招募。',
  },
  HERO_CAP_REACHED: {
    desc: '（v36，AISLG-114）普通将数量已达上限 = ⌈酒馆最高等级 ÷ 2⌉ + 1（附 normalCap）。',
    action: '升级酒馆提高上限，或先 DISMISS_HERO 腾名额。',
  },
  HERO_NOT_FOUND: {
    desc: '（v36，AISLG-114）武将不存在或不属于本账号（出征配将 / 解雇 / 城守共用）。',
    action: '用 GET_HEROES 重拉账号武将列表。',
  },
  HERO_BUSY: {
    desc: '（v36，AISLG-114）武将正在随队出征（含返程），不能出征 / 解雇 / 任命城守。',
    action: '等部队回城（marchingMarchId 变回 null）后再操作。',
  },
  HERO_WOUNDED: {
    desc: '（v36，AISLG-114）武将重伤未愈（带队战败后 2 小时基准，随时间缩放），不能出征。',
    action: '等 woundedUntil 过去，或换其他武将。',
  },
  HERO_ARREARS: {
    desc: '（v36，AISLG-114）武将欠饷中（主城金币不足以支付俸禄），不能出征。',
    action: '给主城补足金币，俸禄结算成功后自动恢复（收到 reason=salary_paid 推送）。',
  },
  HERO_TRAINING: {
    desc: '（v54，AISLG-144）武将正在历练中，不能出征 / 任城守 / 解雇 / 加点 / 洗点 / 再次历练（赏赐不受限）。',
    action: '等历练结束（train_until 过去，经验到账并收到 reason=training_done 推送）后再操作。',
  },
  HERO_POINTS_INSUFFICIENT: {
    desc: '（v54，AISLG-144）分配点数超过自由点数（附 freePoints）。',
    action: '先升级获得点数（每级普通将 3、名将 5），或减少分配数量。',
  },
  HERO_NOTHING_TO_RESET: {
    desc: '（v54，AISLG-144）武将没有已分配的点数（属性等于初始值），洗点无意义。',
    action: '先加点再洗点；无需洗点时不必调用。',
  },
  HERO_DAILY_LIMIT: {
    desc: '（v54，AISLG-144）今日次数已用完（附 limit）：赏赐每武将 3 次、洗点每武将 1 次、结交每名将 5 次，按游戏日（东八区自然日，随时间缩放）重置。',
    action: '等下一个游戏日（data.limit 为上限）再操作。',
  },
  HERO_NOT_UNLOCKED: {
    desc: '（v54，AISLG-144）尚未获得该在野名将的结交资格：需先用部队打赢其所在野地的原住守军（GET_WORLD_MAP 的 wildFamous 标记此地）。',
    action: '派部队去该野地打守军；打赢后武将界面出现该名将的结交入口。',
  },
  HERO_FRIENDSHIP_LIMIT: {
    desc: '（v54，AISLG-144）同时结交的在野名将已达上限 2 名（好感未满且未被他人招揽的才计入）。',
    action: '等其中一名好感满 100 并招揽，或它已被他人获得，腾出名额后再结交。',
  },
  HERO_FAVOR_INSUFFICIENT: {
    desc: '（v54，AISLG-144）好感度未满 100，不能招揽（附 favor）。',
    action: '继续 BEFRIEND_HERO 结交（每次 +10，每日最多 5 次）。',
  },
  HERO_FAVOR_FULL: {
    desc: '（v54，AISLG-144）好感度已满 100，不能再结交。',
    action: '直接 RECRUIT_FAMOUS_HERO 招揽。',
  },
  FAMOUS_CLAIMED: {
    desc: '（v54，AISLG-144）该名将已被他人获得（全服唯一）。',
    action: '换一名在野名将；GET_HEROES 的 famousClaims 可查归属。',
  },
  GUARD_ASSIGN_DENIED: {
    desc: '（v36，AISLG-115）城守不能同时出征；城守只能任命未随行出征的本账号武将。',
    action: '先撤任（ASSIGN_HERO heroId=null）再出征，或换其他武将带队。',
  },
  NEWBIE_PROTECTED: {
    desc: '（v38，AISLG-122；门槛 v42 校准为 8 级）目标玩家处于新手保护期（注册后 3 天或任一城官府升到 8 级，先到为准），不能被侦察 / 攻击（SCOUT 与 MARCH 均返回本码）。data.until / data.retryAfterSeconds 为截止时刻与剩余秒数。',
    action: '等保护期结束后再打（按 retryAfterSeconds 睡满后重发），或换目标。新手玩家主动侦察 / 攻击其他玩家会立即失去保护。',
  },
  TARGET_IN_TRUCE: {
    desc: '（v38，AISLG-122）目标处于免战期：城被攻破 / 被抢后的被动免战（4 小时基准）或目标自己开启的主动免战（12 小时基准），玩家与 NPC 都不能再攻击。data.until / data.retryAfterSeconds 为截止时刻与剩余秒数。',
    action: '按 retryAfterSeconds 睡满后重发，或换目标；在途部队到达时若目标进入免战会扑空返程（事件 outcome=aborted 并附 cause）。',
  },
  SELF_TRUCE_ACTIVE: {
    desc: '（v38，AISLG-122）自己的主动免战生效中（TRUCE 开启后 12 小时基准），不能出兵攻打玩家；打野地 / NPC 城不受影响。data.until / data.retryAfterSeconds 为截止时刻与剩余秒数。',
    action: '等免战结束（city.shieldUntil）再出兵打玩家，期间可正常打野地 / NPC / 运输 / 调兵。',
  },
  TRUCE_ALREADY_ACTIVE: {
    desc: '（v38，AISLG-122）主动免战已在生效中，重复开启 TRUCE 被拒。data.until 为截止时刻。',
    action: '无需处理；city.shieldUntil 可查当前免战截止。',
  },
  TRUCE_WEEKLY_USED: {
    desc: '（v38，AISLG-122）本周的主动免战已用过（每周一次免费，7 天基准随缩放）。data.nextAvailableAt / retryAfterSeconds 为下次可开启时刻与剩余秒数。',
    action: '按 retryAfterSeconds 睡满后重发 TRUCE；city.shieldNextAt 可查下次可开时刻。',
  },
  TILE_PROTECTED: {
    desc: '（v39，AISLG-123）该野地刚换主人（被玩家抢占），处于保护期（1 小时基准随缩放）：期间玩家与 NPC 都不能再抢。data.until / data.retryAfterSeconds 为截止时刻与剩余秒数。',
    action: '按 retryAfterSeconds 睡满后重发，或换目标；GET_TILE 的 tile.protection.ownerChangedUntil 可查保护截止。',
  },
  WX_TICKET_INVALID: {
    desc: '（v43）微信扫码的 ticket 不存在、已过期、已被扫 / 已用过，或确认方不是扫码的那条连接。',
    action: '网页端：重新 WX_QR_CREATE 生成新码；小游戏端：提示玩家回网页刷新二维码后重扫。Agent 不涉及。',
  },
  WX_CODE_INVALID: {
    desc: '（v43）微信 jscode2session 换 openid 失败：wx.login 的 code 已过期或已被使用。',
    action: '小游戏端重新调 wx.login 拿新 code 再 WX_SCAN；code 不可复用。Agent 不涉及。',
  },
  WX_ALREADY_BOUND: {
    desc: '（v43）绑定微信时，这个微信已绑了别的账号，或当前账号已绑了别的微信。',
    action: '换一个微信，或用该微信直接扫码登录它已绑定的账号；暂不支持解绑。Agent 不涉及。',
  },
  WX_UNAVAILABLE: {
    desc: '（v43）微信接口调用失败，或服务端没配置微信小游戏 AppID / AppSecret（扫码登录整体关闭）。',
    action: '稍后重试，或改用本站其他登录方式（国内站有账号密码，国际站有 Google / GitHub）；持续出现向运营方反馈。Agent 不涉及。',
  },
  GOOGLE_UNAVAILABLE: {
    desc: '（v44）Google 登录暂不可用：服务端没配置 GOOGLE_CLIENT_ID（功能整体关闭），或连不上 Google 公钥服务。',
    action: '改用本站其他登录方式（国际站有 GitHub，国内站有账号密码）；持续出现向运营方反馈（服务器访问 Google 可能需要配代理）。Agent 不涉及。',
  },
  GOOGLE_CREDENTIAL_INVALID: {
    desc: '（v44）Google 登录凭证（ID Token）无效：伪造、签名不对、已过期、不是发给本应用的，或格式不是合法 JWT。',
    action: '网页端重新走一遍 Google 登录拿新凭证；凭证是一次性的，不要重放旧值。Agent 不涉及。',
  },
  GOOGLE_ALREADY_BOUND: {
    desc: '（v44）绑定 Google 时，该 Google 账号已绑了别的号，或当前账号已绑了别的 Google 账号。',
    action: '用该 Google 账号直接登录它已绑定的号，或换一个 Google 账号绑定；暂不支持解绑。Agent 不涉及。',
  },
  GITHUB_UNAVAILABLE: {
    desc: '（v45）GitHub 登录暂不可用：服务端没配 GitHub OAuth App 凭证（GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / GITHUB_REDIRECT_URI / FRONTEND_URL 缺一即关闭），或调 GitHub 接口失败。',
    action: '稍后重试或改用其他登录方式；持续出现向运营方反馈（服务器访问 GitHub 可能需要配代理）。Agent 不涉及。',
  },
  OAUTH_CODE_INVALID: {
    desc: '（v45）一次性登录码无效、已过期（60 秒有效）或已被使用（只能用一次）。',
    action: '回登录页重新点一次 GitHub 登录拿新码；不要重放旧码（刷新页面不会重复报错，码已从地址栏抹掉）。Agent 不涉及。',
  },
  GITHUB_ALREADY_BOUND: {
    desc: '（v45）绑定 GitHub 时，该 GitHub 账号已绑了别的号，或当前账号已绑了别的 GitHub 账号。',
    action: '用该 GitHub 账号直接登录它已绑定的号，或换一个 GitHub 账号绑定；暂不支持解绑。Agent 不涉及。',
  },
  RATE_LIMITED: {
    desc: '（v43）请求过于频繁：同一 IP 每分钟最多生成 20 张微信二维码（v44 起 Google 登录尝试、v45 起 GitHub 授权发起同样限频，各 20 次/分钟）。',
    action: '等待一分钟后再试；不要连续重试。',
  },
  CHAT_GOVERNMENT_TOO_LOW: {
    desc: '（v51）聊天：主城官府未达到 3 级，不能在世界频道发言（私聊不受此限）。仅玩家连接可用。',
    action: '玩家先把主城官府升到 3 级，或改用私聊。Agent 不涉及聊天。',
  },
  CHAT_MUTED: {
    desc: '（v51）聊天：账号被运营禁言，响应附 until（解禁时刻）。仅玩家连接可用。',
    action: '等到 until 之后再发言；不要重试。Agent 不涉及聊天。',
  },
  CHAT_BLOCKED: {
    desc: '（v51）聊天：对方屏蔽了当前玩家，私聊发送失败。仅玩家连接可用。',
    action: '不要重试；告诉玩家对方已屏蔽。Agent 不涉及聊天。',
  },
  CHAT_RATE_LIMITED: {
    desc: '（v51）聊天：同一频道两次发言间隔不足 10 秒，响应附 retryAfterSeconds。仅玩家连接可用。',
    action: '等待 retryAfterSeconds 秒后再发；不要连续重试。Agent 不涉及聊天。',
  },
  NICKNAME_TAKEN: {
    desc: '（v52）SET_NICKNAME 的昵称已被其他账号占用：昵称即账号 username，全服唯一。仅玩家连接可用。',
    action: '换一个昵称重试。Agent 无权改名（AGENT_FORBIDDEN），需要时提示玩家本人在网页改。',
  },
  ARENA_NOT_JOINED: {
    desc: '（v53，AISLG-145）竞技场：账号还没入榜（从未保存过阵容），或阵容里一名武将都没有，不能发起挑战。',
    action: '先 SET_ARENA_LINEUP 保存至少 1 名武将的阵容（第一次保存即入榜，排在最后一名），再挑战。',
  },
  ARENA_TARGET_INVALID: {
    desc: '（v53，AISLG-145）竞技场：entryId 对应的席位不存在，或当前名次不在可挑战范围（必须比自己靠前，且差距不超过 maxRankGap 名）。名次会随别人的挑战变化，列表可能已过期。',
    action: '重拉 GET_ARENA 取最新 opponents，再挑一个还在范围内的对手。',
  },
  ARENA_NO_CHALLENGES: {
    desc: '（v53，AISLG-145）竞技场：当前竞技日挑战次数已用完（上限 dailyChallenges）；响应附 nextDayAt（次数重置时刻）与 retryAfterSeconds。',
    action: '等到 nextDayAt 之后再挑战；竞技日长度随全局时间缩放。',
  },
  ARENA_TARGET_BUSY: {
    desc: '（v53，AISLG-145）竞技场：对手当前竞技日被挑战的次数已达上限（dailyDefendedMax，防止被围攻）；响应附 nextDayAt 与 retryAfterSeconds。',
    action: '换一个对手，或等到 nextDayAt 之后。',
  },
  ARENA_PAIR_COOLDOWN: {
    desc: '（v53，AISLG-145）竞技场：刚挑战过同一个对手，冷却未结束（pairCooldownSeconds，随时间缩放）；响应附 retryAfterSeconds。',
    action: '等 retryAfterSeconds 秒后再挑战同一人，或先换别的对手。',
  },
  STAR_TOWER_CLEARED: {
    desc: '（v55，AISLG-146）将星塔：已全部通关（bestFloor 等于总层数），没有可挑战的层。',
    action: '不用再挑战；想看战报用 GET_STAR_TOWER_REPORTS。',
  },
  STAR_TOWER_NO_CITY: {
    desc: '（v55，AISLG-146）将星塔：账号还没有城，首通金币无处入账，不能挑战。',
    action: '先建城，再挑战。',
  },
  STAR_TOWER_NO_LINEUP: {
    desc: '（v55，AISLG-146）将星塔：阵容里一名武将都没有（阵容与竞技场共用）。',
    action: '先 SET_ARENA_LINEUP 保存至少 1 名武将的阵容，再挑战。',
  },
  ANNOUNCEMENT_NOT_FOUND: {
    desc: '（v60，AISLG-162）公告不存在、已撤回、尚未到生效时间，或定向到其他站点。',
    action: '不要重试同一个 id；重新用 GET_ANNOUNCEMENTS 拉取列表确认当前可见的公告。',
  },
  AGENT_PASSWORD_FORBIDDEN: {
    desc: '（v47）Agent 用账号密码登录被拒：密码登录只属于玩家本人，Agent 一律用账号的永久 Agent 令牌登录（哪个站都一样）。',
    action: '改用 LOGIN {token, asAgent: true}（token 为玩家提示词里的 sk_ 令牌）；令牌失效（SESSION_INVALID / close code 4003）时请玩家重新发一次新提示词。',
  },
  PASSWORD_LOGIN_CLOSED: {
    desc: '（v47）该站点不开放账号密码登录：游戏有两个站（同一套服务与数据库、账号通用），国际站 slg.yuntianyou.cc 只有 Google / GitHub 登录，国内站才有账号密码。',
    action: '网页端改用 Google / GitHub 登录；老密码账号先在国内站登录并绑定 Google / GitHub，再来本站用绑定方式登录进同一个号。Agent 不涉及（Agent 只用令牌）。',
  },
  INTERNAL: {
    desc: '服务端内部错误。',
    action: '可稍后重试同一请求；持续出现时向运营方反馈。INTERNAL 可能出现在任何请求的响应中。',
  },
  DUNGEON_NO_ATTEMPTS: {
    desc: '（v61）副本：今日次数已用完（每人每天 rules.dailyAttempts 次，北京日刷新；出发即扣，失败 / 撤退不退）。',
    action: '等北京时间次日再出征；GET_DUNGEON 的 attemptsLeft 为当前剩余次数。',
  },
  DUNGEON_POP_LIMIT: {
    desc: '（v62）副本：troops 按兵种人口合计超过 rules.popLimit（铁骑 / 床弩 3、冲车 5、辎重车 / 后勤兵 6，其余 1）。',
    action: '减少部队后重发。',
  },
  DUNGEON_HERO_LIMIT: {
    desc: '（v61）副本：武将超过 1 名主将 + 2 名副将。',
    action: 'deputyHeroIds 最多 2 名。',
  },
  DUNGEON_IN_PROGRESS: {
    desc: '（v61）副本：已有一支部队在打这个副本（出征在路上，GET_DUNGEON 的 active）。',
    action: '等到达结算（PUSH_DUNGEON_STATE）后再出征。',
  },
  ITEM_NOT_FOUND: {
    desc: '（v61）宝物不存在或不属于本账号（含已卖出）。',
    action: 'GET_ITEMS 重新拉取背包。',
  },
  ITEM_EQUIPPED: {
    desc: '（v61）宝物正装在武将身上，不能出售。',
    action: '先 UNEQUIP_ITEM 卸下再 SELL_ITEM。',
  },
};
