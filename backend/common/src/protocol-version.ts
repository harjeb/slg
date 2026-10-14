// 协议版本与变更历史（从 protocol.ts 拆出以控制单文件行数；对外语义不变）。
// 协议的对外文档由 protocol-doc*.ts 清单生成（npm run gen:api-doc → docs/agent-api.*）。
/**
 * 协议版本：对外协议内容每次变化（新增/废弃协议号、字段、错误码）时 +1。
 * 兼容策略「只加不改」见 docs/agent-api.md「版本与兼容」。
 * v2–v30 的记录见 protocol-version-history.ts。
 * v31（AISLG-85 建筑等级上限 10 → 20，只加不改）：MAX_BUILDING_LEVEL 改为 20，UPGRADE toLevel 上限、
 * BUILDING_LEVEL_MAX 口径随之；升级成本与耗时的倍数由「× 当前等级」改为 upgradeLevelFactor：1~9 级仍为 L
 * （前期成本 / 耗时不变），L ≥ 10 时 = 9 × 1.3^(L − 9)（Worker 排队激活 SQL 同公式）；城墙减伤前 10 级每级
 * +5%、11~20 级每级 +2%（city.defenseBonus 随之，20 级 = 70，加城防科技满 +10 = 80 < 引擎封顶 90）。
 * v32（AISLG-91 Agent 及时知道文档更新，只加不改）：LOGIN 请求新增可选 docVersion（Agent 手上文档的
 * 协议版本，非正整数视为未提供），响应新增 protocolVersion（恒有）与 docNotice（仅 Agent 连接：
 * 文档落后或未带 docVersion 时为提示文本，否则 null；玩家连接恒 null）；新增 HTTP
 * GET /agent-api/changes/{since}（亦接受 ?since=）返回 since 之后每个版本的一句话摘要
 * （protocol-changelog.ts，此后每次 bump 必须补一条）；文档开头新增「Agent 必读：保持文档最新」。
 * v33（AISLG-86 冲车 + AISLG-87 兵种克制 + AISLG-88 辎重车 + AISLG-89 床弩 + AISLG-90 铁骑兵，只加不改）：
 * 兵种清单由 7 种扩为 11 种（TroopKind / city.army / MARCH.troops 键集新增 iron_cavalry / supply_wagon /
 * ballista / siege_ram；军营 11 / 3 / 7 / 8 级解锁，单兵人口不再恒为 1）；兵种属性表与 manifest.troops 新增
 * barracksLevel / carry / population / counter。克制倍率表集中在共享规则（troop-counter.ts）：长枪兵打
 * 轻骑 / 铁骑伤害 ×1.2，刀盾兵受弓箭兵 / 床弩攻击伤害 ×0.8。冲车破墙：只在攻城战生效，冲车每占攻方存活总兵数
 * 1% 使城墙减伤相对降低 8%（最多 80%，每回合按存活冲车重算）；战报新增 wallBreak { from, to }（开战时）。
 * 辎重车负重 5000 计入掠夺 / 运输负重；行军时间按全编队最慢兵种（冲车 / 床弩 0.6、辎重车 0.7）折算。
 * v34（AISLG-107 断粮哗变，只加不改）：城池粮食为 0 且净产量为负时，每小时（随倍速缩放）该城城内驻军每兵种
 * 减 10%（向上取整、至少 1；没有逃兵系统），在外部队不强制召回、耗粮照常计入，恢复即停——取代 v14「断粮仅
 * 停止增长」的旧口径。CityView 新增 starveAt（预计断粮时间，不会断粮为 null）/ mutinyNextAt（下次哗变时刻）；
 * 新增推送 PUSH_STARVATION_STATE（op 2015：warning 距断粮不足 1 小时一次、mutiny 每次哗变一条）与事件
 * starvation_warning / mutiny；GET_OFFLINE_REPORT 的 offline 新增 mutinyLost；cities 表新增 mutiny_next_at /
 * starve_warned_at；Worker starvation-tick.ts 周期扫描结算。
 * v35（AISLG-112 截击「到了先埋伏」，只加不改）：截击部队提前到达选定格时不再扑空，而是原地埋伏等目标走进
 * 相邻范围（Chebyshev ≤ 1）再开打——目标路线与时刻表固定，发起时即把 marches.arrive_at 顺延为预计接战时刻 =
 * max(到达时刻, 目标进入相邻范围的时刻)；到达时目标已走出范围（太晚）仍照旧扑空返程。MarchView 新增
 * ambushAt（埋伏开始时刻，非埋伏行军为 null；此时 arriveAt 语义 = 预计接战时刻）、march_started 事件 detail
 * 同步新增 ambushAt；埋伏期间部队照常占校场名额、按在外口径耗粮，可 RECALL_MARCH 撤回，目标被他人击败 /
 * 过时消失照旧「目标消失」返程。marches 表新增 ambush_at 列。
 * v36（AISLG-114/115/116 武将系统，只加不改）：新建筑「酒馆」tavern（每城限一座，4 小时基准随缩放刷新 3 名
 * 候选普通将，招募费 = 500 + 三项属性合计 × 20 金币；账号普通将上限 = ⌈酒馆最高等级 ÷ 2⌉ + 1，名将另算上限 3）。
 * 新增 GET_HEROES / RECRUIT_HERO / DISMISS_HERO / ASSIGN_HERO（op 49–52）与推送 PUSH_HERO_STATE（op 2016）；
 * MARCH / SCOUT 请求新增可选 heroId 随队武将（同一武将同一时间只能在一支部队里，城守不能出征；MarchView 新增
 * heroId）。带兵加成：全军攻击 + 武力 × 0.3%、受到伤害 − 智力 × 0.3%（各封顶 20%），能吃到加成的兵数 = 统率 × 20、
 * 超出按比例摊薄；叠加顺序 基础伤害 → 兵种克制 → 武将加成 → 城墙减伤；战报双方新增 hero 字段。俸禄每小时从主城
 * 扣（普通将 20 × 等级 / 名将 100 × 等级金币），金币不足「欠饷」不能出征、扣款成功自动恢复；带队战败重伤 2 小时
 * （随缩放）不能出征、不会死亡。经验与成长（AISLG-116）：带队参战 / 城守守城获得经验 = 歼灭敌军参考战力（战败
 * 减半），升到 L+1 需 100 × L²，每级三项属性 +1（名将 +2），上限 20 级；march_completed 事件新增 heroExp。
 * 名将（AISLG-115）：8 座名城各绑一名（首占获得）、黄巾老巢首杀得张角、贡献榜前二得张宝 / 张梁——全服唯一
 * （解雇后回到可获得状态），获得时全服播报 hero_granted；GET_HEROES 的 famousClaims 公开归属。城守
 * （ASSIGN_HERO）：守城战享攻防加成、平时该城四资源产量 + 智力 × 0.1%（封顶 5%，CityView 新增 guard）。
 * 新错误码：TAVERN_NOT_BUILT / HERO_CANDIDATE_GONE / HERO_CAP_REACHED / HERO_NOT_FOUND / HERO_BUSY /
 * HERO_WOUNDED / HERO_ARREARS / GUARD_ASSIGN_DENIED；新事件：hero_recruited / hero_dismissed / hero_arrears /
 * hero_wounded / hero_level_up / hero_granted / guard_changed；新表 account_heroes / tavern_candidates /
 * famous_heroes，cities 新增 guard_hero_id、marches 新增 hero_id。
 * v37（AISLG-105 缺陷修复，只加不改）：连续升级（UPGRADE toLevel）整链的 build_started / build_queued 事件 detail 新增
 * toLevel（链终点）——此前事件里 cost 是整链总额、level 是首个推进等级却没有终点，Agent 无法对账。队列激活产生的
 * build_started（fromQueue=true）同样带 toLevel。
 * v38（AISLG-122 玩家对抗一，只加不改）：开放玩家之间互相攻打的第一步——可以侦察、掠夺其他玩家的城池（主城与
 * 分城都行，不用宣战），同时上一套硬性保护：守城战复用 NPC 袭城口径（城墙 + 城防科技 + 箭塔 + 守方城守），发起即
 * 给守方推 PUSH_ATTACK_WARNING（op 2017，预警窗口 = 行军时长，敌情按守方烽火台分档）；掠夺可抢池 = 仓库保护 →
 * 单次比例上限（四资源 30% / 金币 10%）→ 等级差衰减（出发城官府比目标城官府高 5 级起每多 1 级 −15%、最低 25%），
 * 仍受负重装填；攻破后该城被动免战 4 小时（基准随缩放，玩家与 NPC 共用 cities.truce_until）；战报 kind='pvp_raid'
 * 攻守双方各一份。保护：新手保护（注册后 3 天或任一城官府升到 5 级先到为准，期内别人不能侦察 / 攻击——SCOUT 与
 * MARCH 返回 NEWBIE_PROTECTED；他自己侦察 / 攻击其他玩家立即失效，事件 newbie_protection_ended；NPC 袭击目标池
 * 同样跳过）；主动免战 TRUCE（op 53，无参数）：每周一次免费、持续 12 小时（基准随缩放），开着时别人打不了他
 * （TARGET_IN_TRUCE）、他也不能出兵打玩家（SELF_TRUCE_ACTIVE，打野地 / NPC 不受限）；CityView 新增 newbieUntil /
 * shieldUntil / shieldNextAt；TileView 新增 protection（他人城的三个保护截止时刻）；SCOUT 侦察玩家城读 city_army
 * 驻军与城墙减伤；accounts 新增 newbie_until / self_truce_until / self_truce_used_at 列；新事件 player_attack_warning /
 * pvp_raid / truce_started / newbie_protection_ended。占领玩家城随后续阶段开放（occupy 对玩家城
 * 仍返回 TASK_INVALID_FOR_TARGET）。
 * v39（AISLG-123 玩家对抗二，只加不改）：开放抢占其他玩家占领的野地——MARCH task='occupy' 对他人野地受理（缺省
 * plunder 返回 TASK_INVALID_FOR_TARGET，地里没有存货可抢）。战斗为野地战（非 siege：无城墙 / 箭塔 / 城守），守方 =
 * tile_army 驻军，攻方可带随队武将；守方没留驻军不打、直接拿下（无战报）。发起即给守方推 PUSH_ATTACK_WARNING
 * （op 2017 新增 target='wilderness'，敌情按其所属城烽火台分档，预警期间可增援该地块）。打赢且出发城占领名额（官府
 * 等级）有空 → 地块易主、幸存部队驻守、地块进入换主保护 1 小时（基准随缩放，world_tiles.owner_changed_until：期间
 * 玩家抢占与 NPC 袭击都跳过，MARCH 返回 TILE_PROTECTED）；名额已满 → 守方照样失地（wilderness_lost cause=conquest）、
 * 地块变无主（不设保护）、攻方幸存返程。守方新手保护 / 主动免战期间其全部野地不可被抢（NEWBIE_PROTECTED /
 * TARGET_IN_TRUCE）；守方某座城的被动免战只保护城本身、不保护野地；自己新手保护期内抢野地立即破保，主动免战中
 * 不能抢（SELF_TRUCE_ACTIVE）。到达时锁内复核（口径见 MARCH 文档）：地块已无主 / 易主第三人 → 扑空返程
 * （aborted，cause=target_gone / owner_changed）；已归本账号 → 转增援。战报 kind='pvp_wilderness' 双方各一份；
 * TileView.protection 对他人野地同样下发（ownerChangedUntil）；连片加成随 territory 读取自然重算。
 * v40（AISLG-124 玩家对抗三，只加不改）：开放占领其他玩家的**分城**——MARCH task='occupy' 对他人分城受理
 *（主城返回 TASK_INVALID_FOR_TARGET，永不可占），资格与占 NPC 城同口径（GOVERNMENT_TOO_LOW / BRANCH_LIMIT /
 * TARGET_LEVEL_TOO_HIGH，目标等级 = 该城官府等级；到达复核名额，没了照打只降城防值）。分城有城防值（满 100，
 * cities.durability）：守城战打赢一次（守军全灭）−35，攻方幸存冲车占比每 1% 再 +1.5、最多 +15（占比 ≥10% 满额），
 * 归零且名额有空当场换主；占领打赢不掠夺资源、掠夺打赢不降城防；每次打赢进入 4 小时被动免战（免战内不回涨，
 * 结束后每小时回涨 10 至满——占一座分城至少打 3 次隔 8 小时）。换主：建筑（含等级）/ 剩余资源 / 名城加成归新主，
 * 城防回满并保护 6 小时（CITY_CONQUEST_PROTECTION_MS，期间谁都不能打）；该城排队建造 / 征兵 / 该城研究 / 酒馆候选
 * 作废不退资源；城守卸任（武将归原主）；该城野地全变无主、驻军回原主主城；该城在外部队改从原主主城返程；针对该城
 * NPC 袭击作废；原主 city_conquered(outcome=lost) / 新主 outcome=gained + 全服播报 city_conquered。TileView.durability
 *（他人分城当前城防值，非 null 即可被打的分城）与 CityView.durability（自己的分城）下发；战报 kind='pvp_conquest'
 * 双方各一份；march_completed 的 battle_won detail.conquest = { before, damage, ramBonus, after, protectedUntil,
 * transferred? }；PUSH_TILE_STATE reason 新增 city_conquered / city_durability_hit。
 * v41（AISLG-125，规则微调）：NPC 攻破玩家主城时金币可抢量从「存量全额（不享受仓库保护）」改为
 * 「存量 × 5%」（NPC_CITY_GOLD_SHARE，plunder.ts；比玩家互掠的 10% 更轻），仍受 NPC 幸存部队负重
 * 限制；四资源口径不变（存量 − 仓库保护，不加比例上限）。玩家掠夺玩家城维持存量 × 10%
 * （pvpPlunderPool 改基于 warehouseProtectedPool，金币口径不受本变更影响）；玩家掠夺 NPC 城、
 * NPC 袭击野地不受影响。
 * v42（AISLG-126 数值校准拍板落地，模拟记录见 docs/battle-calibration.md「玩家对抗数值校准」）：玩家掠夺玩家城的
 * 单次比例上限四资源 30% → 45%（PVP_PLUNDER_SHARE）、金币 10% → 15%（PVP_GOLD_SHARE）——模拟显示旧值下打赢
 * 同级守军的战损约为战利品 6 倍，「打赢差不多的人」完全不划算；新手保护的官府出保门槛 5 级 → 8 级
 *（NEWBIE_GOVERNMENT_LEVEL；50 倍速下 5 级约 7 分钟即达、保护被「先到为准」架空）。其余数值（被打后免战 4h、
 * 等级差衰减 5 级起每级 −15% 下限 25%、城防值 100/−35/冲车+15/回涨 10/h、野地换主保护 1h、分城换主保护 6h、
 * 主动免战 12h/每周）经模拟量级合理，维持不变。
 * v43（微信扫码登录与 Agent 令牌，docs/wechat-qr-login.md，只加不改）：借用个人微信小游戏做「扫码器」，网页显示带 ticket 的小游戏码，
 * 玩家扫码确认后网页拿到会话令牌再走原有 LOGIN {token}。新增 WX_QR_CREATE / WX_SCAN / WX_CONFIRM / WX_CANCEL（op 54–57，
 * 登录前即可发送——bind 用途的 WX_QR_CREATE 须玩家已登录；后三者仅供微信小游戏，Agent 无需调用）、ISSUE_AGENT_TOKEN /
 * REVOKE_AGENT_TOKEN（op 58 / 59，仅玩家连接）与推送 PUSH_WX_QR_STATUS（op 2018，只推给生成二维码的网页连接）；
 * GET_AGENT_INFO 新增 agentTokens（令牌元信息，不含令牌本身）与 wechatBound。从没绑定过的微信第一次扫码自动建号（随机用户名
 * wx_xxxxxx、无密码——密码登录这类账号一律 INVALID_CREDENTIALS），老账号登录后用 bind 用途绑定。ticket 只存 API 进程内存、
 * 3 分钟有效、一次性，确认须手动点按钮且只接受扫码的那条连接。新增错误码 WX_TICKET_INVALID / WX_CODE_INVALID /
 * WX_ALREADY_BOUND / WX_UNAVAILABLE / RATE_LIMITED / AGENT_TOKEN_LIMIT；新表 wechat_identities，accounts.password_hash 改为
 * 可空，sessions 新增 kind（login | agent_token）与 label 列。
 * v44（Google 一键登录，AISLG-127，只加不改）：网页用 Google Identity Services 拿到 ID Token 后经 GOOGLE_LOGIN（op 60，登录前可发，
 * 仅供网页）换会话令牌再走 LOGIN {token}；没绑定过的 Google 账号自动建号（随机用户名 g_xxxxxx、无密码），已绑定则直接登录绑定账号。
 * GOOGLE_BIND（op 61，仅玩家连接）给当前账号绑定 Google：一号一 Google、一 Google 一号。GET_AGENT_INFO 新增 googleBound；
 * 新增错误码 GOOGLE_UNAVAILABLE / GOOGLE_CREDENTIAL_INVALID / GOOGLE_ALREADY_BOUND（登录尝试按 IP 限频复用 RATE_LIMITED）；
 * 新增 HTTP GET /auth/config（返回 googleClientId / wechatEnabled，前端据此决定显示哪些登录入口）；新表 google_identities。
 * Agent 不使用 Google 登录：纯 Google 账号沿用 v43 的 Agent 令牌接入。
 * v45（GitHub 一键登录，AISLG-128，只加不改）：OAuth 授权码模式（整页跳转）。网页经 GITHUB_AUTH_START（op 62，登录前可发；
 * purpose=login|bind）拿到 GitHub 授权地址并整页跳转；GitHub 授权后回跳 API 的 GET /auth/github/callback，服务端换令牌、
 * 取用户 id/login，login 路径生成 60 秒一次性登录码并 302 回前端，网页用 OAUTH_REDEEM（op 63，登录前可发）换成会话令牌
 * 再走 LOGIN {token}（会话令牌不进 URL，一次性码泄露风险小）；bind 路径直接写绑定后 302 回前端。取消 / 过期 / 重放分别
 * 回 error=canceled / expired / already_bound。第三方身份迁入共用表 oauth_identities（provider 维度；google 自 v45 起读写本表）；
 * GET_AGENT_INFO 新增 githubBound 与 githubLogin；GET /auth/config 新增 githubEnabled；新错误码 GITHUB_UNAVAILABLE /
 * OAUTH_CODE_INVALID / GITHUB_ALREADY_BOUND（GITHUB_AUTH_START 按 IP 限频复用 RATE_LIMITED）。Agent 不使用 GitHub 登录：
 * 纯 GitHub 账号沿用 Agent 令牌接入。
 * v46（永久 Agent 令牌，AISLG-129）：每账号一个永久令牌（sk_ 前缀，agent_tokens 表存哈希 + 原文——随时可再显示是「复制给 AI 的提示词自动带令牌」的前提），建号自动生成、老账号惰性补。新增 GET_AGENT_TOKEN / RESET_AGENT_TOKEN（op 64 / 65，仅玩家连接；查看自动补生成，重置换新并断开旧令牌的在线连接 close 4003）。LOGIN 的 token 先按 sessions 查、查不到再按 agent_tokens（永久令牌登录响应 expiresAt 为 null，LOGOUT 不吊销只断开）。移除 v43 的 ISSUE_AGENT_TOKEN / REVOKE_AGENT_TOKEN（op 58 / 59）、错误码 AGENT_TOKEN_LIMIT 与 GET_AGENT_INFO.agentTokens（令牌不再经 Agent 可调的协议下发）——多令牌体系只在 login 分支存在过、从未上线，删除不涉及兼容；sessions 中 kind='agent_token' 旧行上线清理。
 * v47（双站点 + Agent 令牌-only 登录，AISLG-130）：游戏两个站（slg.example.cn 国内 /
 * slg.yuntianyou.cc 国际）共用同一套服务与数据库、账号通用，按连接访问的 Host 区分站点
 * （握手 Host 头，TRUST_PROXY 时优先 X-Forwarded-Host；连哪个域名就算哪个站，与 Origin 无关）。
 * 国际站整站关闭账号密码登录——LOGIN 密码分支在 PASSWORD_LOGIN_CLOSED_HOSTS（逗号分隔 Host）
 * 列出的站点返回新错误码 PASSWORD_LOGIN_CLOSED（界面按 GET /auth/config 的 passwordLogin=false
 * 隐藏密码表单，绕过界面直发也照样被拒）；国内站照旧。
 * Agent 一律不能用账号密码登录（哪个站都一样），LOGIN 密码分支遇到 asAgent=true 返回新错误码
 * AGENT_PASSWORD_FORBIDDEN，提示改用永久令牌（v46）——密码登录自此只属于玩家本人。
 * GitHub 登录按站点分套（OAuth App 回调地址只能填一个，两站各建一个）：新环境变量 GITHUB_SITES
 * （JSON，键为 Host，另支持 "default" 键）替代旧的 GITHUB_CLIENT_ID 等四变量（仍可用，作 default 套），
 * 授权 state 记发起站点、回调按它选配置套并跳回对应前端；GET /auth/config 的 passwordLogin /
 * githubEnabled 按请求 Host 下发（Google 的已授权来源需在控制台加两个站域名，部署操作）。
 * 协议消息结构无变化，纯登录入口与访问控制调整。
 * v48：关闭密码登录的自动注册——LOGIN 密码分支遇到不存在的用户名不再建号，返回新错误码
 * SIGNUP_CLOSED；新账号只能经第三方登录创建（Google / GitHub / 微信扫码，建号沿用
 * insertAccountWithCity）。移除错误码 USERNAME_TAKEN（并发同名首登注册的错误码，随注册
 * 通道关闭而消失）。协议消息结构无变化。
 * v49：作战方针模块整体移除——删除 SET_AGENT_DIRECTIVE（op 38）与推送 PUSH_AGENT_DIRECTIVE
 * （op 2008），GET_AGENT_INFO 不再返回 directive 字段，agent_directives 表随上线清理删除。
 * 玩家对 Agent 的打法意图改为与自己的 Agent 直接讨论，不再经游戏设置。老客户端发 op 38
 * 收到 UNKNOWN_OP。
 * v50（排行榜按 AI 模型分组，AISLG-133，只加不改）：LOGIN 请求新增可选 agentModel（仅
 * asAgent=true 生效；Agent 自报驱动自己的模型 / 脚本名，限长 64、超长截断，以最近一次
 * 声明为准、不填保留上次；自报不验证，与 asAgent 同为「声明」口径）。accounts 新增
 * agent_model（原文）与 agent_last_seen_at（Agent 登录时刻）。GET_LEADERBOARD 玩家三榜
 * 条目新增 agentModel（自报原文，null = 从未声明），新增 kind=model 模型榜：按常见模型
 * 名单归类聚合（名单外归「其他」，未声明归「未声明」，common/src/agent-models.ts），
 * 只统计最近 7 天 Agent 上线过、且进了战力统计的账号，排名 = 该模型实力前 10 名的
 * 平均战力（不足 10 名取全部平均），响应经 modelEntries 下发（entries 为空、me 为 null）。
 * 新表 leaderboard_model_snapshots，leaderboard_snapshots 加列 agent_model。
 * v51（聊天，AISLG-138，只加不改）：新增玩家专属的聊天协议（op 66–71 与推送 2019，仅玩家连接，
 * Agent 连接返回 AGENT_FORBIDDEN，对外 Agent 文档不收录）：世界频道与私聊的消息查询 / 发送，
 * 私聊会话与未读，已读标记，屏蔽与取消屏蔽，战报卡片详情。新增错误码 CHAT_GOVERNMENT_TOO_LOW /
 * CHAT_MUTED / CHAT_BLOCKED / CHAT_RATE_LIMITED。新表 chat_messages / chat_blocks / chat_reads，
 * accounts 加列 chat_muted_until。
 * v52（自定义昵称，AISLG-142，只加不改）：新增 SET_NICKNAME（op 72，仅玩家连接，Agent 返回
 * AGENT_FORBIDDEN）——修改账号昵称。昵称即账号 username（聊天、地图归属、排行榜展示的都是它；
 * Google / GitHub / 微信自动建号时是随机名 g_xxxxxx 之类，由此改成自己的），全服唯一，撞名返回
 * 新错误码 NICKNAME_TAKEN；昵称同时是密码登录键，改名后密码登录用新昵称（第三方与令牌登录绑定
 * 账号 id，不受影响）。新增推送 PUSH_ACCOUNT_STATE（op 2020，reason=account_renamed，账号全部
 * 在线连接收到，含 Agent）与事件 account_renamed（detail={from,to}）。消息结构其余无变化。
 * v53（竞技场，AISLG-145，只加不改）：新增 GET_ARENA（op 73）、SET_ARENA_LINEUP（op 74）、
 * ARENA_CHALLENGE（op 75）、GET_ARENA_REPORTS（op 76）与推送 PUSH_ARENA_STATE（op 2021，reason=
 * challenged / daily_reward / milestone，账号全部在线连接收到，含 Agent）；全服广播新增
 * arena_champion（登上第 1 名，必达）。玩家与 Agent 同一套规则，对外 Agent 文档收录。新增错误码
 * ARENA_NOT_JOINED / ARENA_TARGET_INVALID / ARENA_NO_CHALLENGES / ARENA_TARGET_BUSY /
 * ARENA_PAIR_COOLDOWN。新表 arena_entries / arena_daily / arena_matches（战报保留 7 天）。
 * 每日奖励由 Worker 的 arena-tick 按竞技日发放，金币直接进主城。
 * v54（武将培养与在野名将，AISLG-144）：新增 ALLOCATE_HERO_POINTS（op 77）/ RESET_HERO_POINTS（op 78）/
 * TRAIN_HERO（op 79）/ GIFT_HERO（op 80）/ BEFRIEND_HERO（op 81）/ RECRUIT_FAMOUS_HERO（op 82）。
 * 升级不再自动加三项属性，改为得自由点数（普通将 3、名将 5，由玩家分配；洗点还原到初始属性）；
 * 等级上限 20 → 40。名将扩到 40 名，其中 29 名在野（Lv3+ 野地，开服分配，地图标记 wildFamous，
 * 侦察后 wildFamousIntel 给出名字与属性），打赢该野地守军即获结交资格（GET_HEROES.unlocks），
 * 好感满 100 招揽（全服唯一）。HeroView 新增 freePoints / training / dailyLeft，GET_HEROES 新增
 * friendships / unlocks / friendshipCap，famousClaims 新增 wildAt。推送 PUSH_HERO_STATE 新增
 * reason。新表 hero_unlocks / hero_friendship；account_heroes 新增 base_* / free_points / train_* /
 * gift_* / reset_*；world_tiles 新增 wild_*。
 * v55（将星塔，AISLG-146，只加不改）：新增 GET_STAR_TOWER（op 83）、STAR_TOWER_CHALLENGE（op 84，无参数，挑战
 * 已通过最高层的下一层）、GET_STAR_TOWER_REPORTS（op 85）。单机玩法，玩家与 Agent 同一套规则，对外 Agent 文档收录。
 * 固定 100 层，每 10 层一个 Boss 层；敌方阵容按层号确定（不入库），对战沿用竞技场的三局两胜；阵容与竞技场共用
 * （保存走 SET_ARENA_LINEUP，第一次保存即入竞技场榜）。首通发金币（进主城）与武将经验，重打不再发。Boss 层首通
 * 全服播报 star_tower_cleared（必达）。新增错误码 STAR_TOWER_CLEARED / STAR_TOWER_NO_CITY / STAR_TOWER_NO_LINEUP。
 * 新表 star_tower_progress / star_tower_matches（每人保留最近 50 条战报）。
 * v56（任务与活动，AISLG-200，只加不改）：新增 GET_DAILY（op 86）/ CLAIM_DAILY（op 87）/ GET_SIGNIN
 * （op 88）/ SIGNIN（op 89）/ GET_QUESTS（op 90）/ CLAIM_QUEST（op 91）/ GET_ACTIVITIES（op 92）/
 * CLAIM_ACTIVITY（op 93）——日常任务（6 条、每日北京日刷新，完成判定读 events 当日事件）、每日签到
 * （连续签到 7 天一轮循环）、主线任务链（10 环、顺序解锁与领取）/ 支线（4 条、并行）/ 成就（6 条 × 3 档，
 * 逐档领取）、活动（开服冲刺限时 + 每日活跃）。进度均从既有数据派生，不新增埋点；奖励发往主城，
 * 领奖原子去重。新表 quest_claims / signin_state / quest_claims_once。无新增错误码（复用 INVALID_PARAMS）。
 * v57（分城放宽与放弃分城，AISLG-155 / AISLG-153）：分城上限 floor(主城官府 ÷ 3) 改为 floor(主城官府 ÷ 2)（规则口径变化，名额只增不减）；
 * 新增 DISCARD_CITY（op 94，玩家与 Agent 通用，cityId 必填、confirm 必须为 true）；新错误码 DISCARD_COOLDOWN / DISCARD_MAIN_CITY /
 * CITY_IN_BATTLE / ARMY_OUTSIDE / WILDERNESS_GARRISONED；PUSH_CITY_STATE 新增 reason=city_discarded；EventType 新增 city_discarded。
 * 新表 city_discards（放弃冷却，按地块）；cities 新增 origin_level（分城来源 NPC 等级）。
 * v58（世界小地图，AISLG-160）：新增 GET_MAP_OVERVIEW（op 95，玩家与 Agent 通用，只读）返回全图城池点位；无新增错误码。
 * v59（普通将特长与阵型，只加不改）：HeroView 加 specialty / specialtyBonus，竞技场与将星塔加 formations 与阵型目录。
 * v60（公告，AISLG-162）：新增 GET_ANNOUNCEMENTS（op 96）/ GET_ANNOUNCEMENT（op 97）/ READ_ANNOUNCEMENT（op 98，玩家与 Agent 通用）与推送 PUSH_ANNOUNCEMENT（op 2022，只带标题与分类，本站在线连接收到）；
 *   服务端过滤正文（受限 Markdown：分段、加粗、https 链接）；生效中 / 往期、置顶、强提醒、站点定向与中英双语。新增错误码 ANNOUNCEMENT_NOT_FOUND；server_broadcasts 新增播报类型 announcement。
 * v61（副本·虎牢关与宝物，只加不改）：新增 GET_DUNGEON（op 99）/ ENTER_DUNGEON（op 100）/ GET_DUNGEON_REPORTS（op 101）/
 * GET_ITEMS（op 102）/ EQUIP_ITEM（op 103）/ UNEQUIP_ITEM（op 104）/ SELL_ITEM（op 105）与推送 PUSH_DUNGEON_STATE（op 2023）；
 * 地块 kind 新增 dungeon、TileView 新增 dungeon，行军 purpose 新增 dungeon；HeroView 新增 equipment（bonus 含宝物）；
 * 宝物在所有战斗生效；全服播报新增 dungeon_cleared；新增错误码 DUNGEON_NO_ATTEMPTS / DUNGEON_POP_LIMIT /
 * DUNGEON_HERO_LIMIT / DUNGEON_IN_PROGRESS / ITEM_NOT_FOUND / ITEM_EQUIPPED。新表 dungeon_sites / dungeon_progress /
 * dungeon_runs / account_items，account_heroes.equip_def 与 marches.deputy_hero_ids。设计见 docs/dungeon-hulao-pass.md。
 * v62（运输与救治拆分）：新增兵种 medic 后勤兵（六人医疗小队，军营 3 级，零攻击与负重）；
 * 副本波间救治只读取存活后勤兵，辎重车只负责运输。DungeonRulesView 新增 medicPopPerUnit，
 * 旧 medicPopPerWagon 保留且恒为 0；其余救治与伤兵返还规则不变。新兵种数值为待校准占位值。
 * v63（取消副本战后伤兵返还）：仅最终幸存部队返程，波间后勤兵救治规则不变；
 * 旧 woundedReturnShare 保留且恒为 0，新结算 woundedReturned 恒为空编队，已保存的旧战报保留原结果。
 */
export const PROTOCOL_VERSION = 63;
