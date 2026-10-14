// 世界地图、战报与全服面板文案；copy.ts 保留统一入口。

import type { TerrainKind, TileKind, TroopKind } from './api/protocol';

export { WORLD_MAP, LEADERBOARD, SERVER_FEED, EXCHANGE, OFFLINE_REPORT, SCOUT_REPORT, BATTLE_REPORT, NPC_WARNING, TRUCE_COPY };

/** 兵种界面文案：名称 / 单字简称（驻军与队列条目用） */
export const TROOP_LABEL: Record<TroopKind, { name: string; short: string }> = {
  porter: { name: '民夫', short: '民' },
  militia: { name: '义兵', short: '义' },
  scout: { name: '斥候', short: '斥' },
  pikeman: { name: '长枪兵', short: '枪' },
  swordsman: { name: '刀盾兵', short: '盾' },
  archer: { name: '弓箭兵', short: '弓' },
  cavalry: { name: '轻骑兵', short: '骑' },
  iron_cavalry: { name: '铁骑兵', short: '铁' },
  supply_wagon: { name: '辎重车', short: '辎' },
  ballista: { name: '床弩', short: '弩' },
  siege_ram: { name: '冲车', short: '冲' },
  medic: { name: '后勤兵', short: '医' },
};

/** 地形名（v12，镜像 backend/common/src/world.ts 的 TERRAIN_INFO.label；v19 新增金矿） */
export const TERRAIN_LABEL: Record<TerrainKind, string> = {
  plain: '平原',
  grass: '草原',
  forest: '森林',
  hill: '丘陵',
  desert: '荒漠',
  marsh: '沼泽',
  lake: '湖泊',
  gold_mine: '金矿',
};

/** 地块类别名（v12） */
export const TILE_KIND_LABEL: Record<TileKind, string> = {
  wilderness: '野地',
  npc_city: 'NPC 城池',
  dungeon: '副本',
  city: '城池',
};

const WORLD_MAP = {
  loading: '地图加载中…',
  loadFailed: '地图加载失败，稍后自动重试',
  blockRange: (x: number, y: number, w: number, h: number) => `区块 (${x},${y})–(${x + w - 1},${y + h - 1})`,
  worldSize: (size: number) => `世界 ${size}×${size}`,
  centerCity: '回主城',
  pan: (dx: number, dy: number) => `平移地图 (${dx},${dy})`,
  jumpTo: '跳转',
  jumpAria: (x: number, y: number) => `跳转到坐标 (${x},${y})`,
  jumpInvalid: '坐标需为世界范围内的整数',
  jumpX: 'x 坐标',
  jumpY: 'y 坐标',
  empty: '该区域没有地块数据',
  legendTitle: '图例',
  legendWilderness: '野地（数字为等级）',
  legendOwnTile: '本方占领',
  legendNpcCity: 'NPC 城池',
  legendCity: '玩家城池',
  legendOwnCity: '本方城池',
  legendEnemyTile: '他方占领',
  legendLevel: '野地等级（越高守军越强）',
  legendTerrain: '地形',
  legendMarks: '标记',
  keyHint: '按住拖动浏览地图 · 方向键移动选择，越过边缘自动翻页',
  tipAction: '点击查看详情 / 出征',
  viewCenter: (x: number, y: number) => `视野中心 (${x},${y})`,
  detailTitle: (x: number, y: number) => `地块 (${x},${y})`,
  detailEmpty: '点击地图上的地块查看详情',
  detailClose: '关闭地块详情',
  detailLoading: '详情查询中…',
  ownerRow: (name: string) => `占领：${name}`,
  ownerNone: '无主',
  garrisonRow: (count: number) => `驻军 ${count}`,
  /** 对方城池 / 野地的保护状态（v38 AISLG-122 / v39 AISLG-123）：任一截止未到即受保护 */
  protectionNewbie: (left: string) => `新手保护中 · 剩 ${left}（不能被侦察 / 攻击）`,
  protectionTruce: (left: string) => `免战中 · 剩 ${left}（不能被攻击）`,
  protectionShield: (left: string) => `主动免战中 · 剩 ${left}（不能被攻击）`,
  protectionOwnerChanged: (left: string) => `换主保护中 · 剩 ${left}（刚易主，不能再抢）`,
  nativePowerRow: (power: number) => `原住守军战力 ${power}`,
  npcStockRow: '可掠夺库存（侦察快照）',
  npcNotScouted: 'NPC 城池详情需先侦察（SCOUT）',
  npcScoutedAt: (clock: string) => `情报快照 ${clock}`,
  /** NPC 城库存档位（v23 AISLG-55）：地图档位标记与悬浮提示 */
  npcTierRich: '库存丰厚',
  npcTierNormal: '库存一般',
  npcTierLow: '库存见底',
  npcTierEmpty: '已被掠空',
  npcTierHint: (label: string) => `库存${label}（具体数量需侦察）`,
  npcTierEmptyHint: '已被掠空，掠夺无收益',
  wildernessBonusRow: (resourceLabel: string, rate: number) => `占领加成 ${resourceLabel} +${rate}/h`,
  wildernessGatherRow: (resourceLabel: string, rate: number) => `驻军采集 ${resourceLabel} +${rate}/h`,
  /** 侦察表单（v13） */
  scoutTitle: '斥候侦察',
  scoutHint: '派斥候获取守军构成 / 城墙 / 库存情报（不战斗，斥候返程）',
  scoutCountLabel: (available: number) => `斥候数量（城内 ${available}）`,
  scoutSubmit: '侦察',
  scoutBusy: '侦察中…',
  scoutNoScout: '城内没有斥候（军营 Lv2 起可征募）',
  /** 出征表单 */
  attackTitle: '派兵出征',
  attackHintPlayer: '玩家城按守城战结算（城墙 / 箭塔 / 城守生效）；胜利后按幸存部队负重掠走可抢部分（四资源 45%、金币 15%，官府差越大抢得越少），对方会收到来袭预警',
  attackHintEnemyWild: '抢占他人的野地：野地战无城墙，打掉对方驻军后地块归你（名额 = 官府等级；名额满则地块变无主）；对方会收到来袭预警，守方没驻军则直接拿下',
  confirmOccupyEnemyWild: '出兵抢占',
  attackHintEnemyBranch: '攻占他人的分城：守城战打赢一次城防 −35（带冲车降得更多），归零当场换城（名额条件同占 NPC 城）；占领不抢资源，打赢后该城免战 4 小时、城防不回涨，占满一座至少打 3 次隔 8 小时',
  confirmOccupyEnemyBranch: '出兵攻城',
  durabilityRow: (value: number) => `城防值 ${value}/100`,
  durabilityHint: '守城战打赢一击 −35（冲车最多再 −15）；免战结束后每小时回涨 10；归零一击换主',
  attackHintNpc: '战胜将按幸存部队负重掠夺库存（含金币，库存不再生、掠空就没了；NPC 城池仅支持掠夺，建议先侦察）',
  attackHintOwn: '目标已被本账号占领：此次出征为增援驻军（不战斗）',
  attackNoArmy: '城内没有驻军（军营征兵后可出征）',
  attackTroopLabel: (name: string, available: number) => `${name}（城内 ${available}）`,
  attackSubmit: '出征',
  confirmPlunder: '确认出征 · 掠夺',
  confirmOccupy: '确认出征 · 占领',
  confirmReinforce: '确认增援',
  troopPickTitle: '选择出征兵力',
  troopPickHint: '请先填写出征兵力',
  troopAll: '全军',
  troopClear: '清空',
  troopMax: '全部',
  troopTotalLine: (count: number) => `共 ${count} 人`,
  troopWeaker: (power: number, enemy: number) => `编队战力 ${power} 低于原住守军 ${enemy}，可能打不过`,
  attackBusy: '出征中…',
  attackPowerLine: (power: number) => `编队战力 ${power}`,
  /** 出征任务（v16）：野地可选掠夺 / 占领；NPC 固定掠夺 */
  taskTitle: '出征任务',
  taskPlunder: '掠夺',
  taskPlunderHint: '胜利按负重携回资源（地形资源 × 1500 × 等级，v19 校准；无金币），不改归属、部队返程；目标有掠夺冷却（时长随全局加速缩短）',
  taskOccupy: '占领',
  taskOccupyHint: (limit: number, owned: number) => `胜利后幸存部队驻守并获得加成（占领上限 = 官府等级 ${limit}，当前 ${owned}）`,
  taskCarryLine: (carry: number) => `编队负重 ${carry}`,
  /** 行军时长预估（AISLG-72）：编队 / 侦察表单预览行，按最慢兵种与距离本地折算 */
  etaLine: (duration: string) => `预计 ${duration}到达`,
  taskCooldownRow: (remaining: string) => `掠夺冷却中（${remaining} 后可再掠，占领不受限）`,
  /** 调兵（v13：目标为本账号分城） */
  transferTitle: '调兵至分城',
  transferHint: '目标为本账号分城：编队到达后并入该城驻军（不战斗）',
  transferSubmit: '调兵',
  /** 召回 */
  recallTitle: '驻军管理',
  recallHint: '召回将放弃占领（加成立即停止），部队返程回城',
  recallSubmit: '召回全部驻军',
  recallBusy: '召回中…',
  /** 行军与领地列表 */
  marchesTitle: '进行中行军',
  marchesEmpty: '暂无行军',
  marchAttack: (x: number, y: number) => `出征 → (${x},${y})`,
  marchScout: (x: number, y: number) => `侦察 → (${x},${y})`,
  marchTransfer: (x: number, y: number) => `调兵 → (${x},${y})`,
  marchReturn: (x: number, y: number) => `返程 ← (${x},${y})`,
  marchPlunder: (x: number, y: number) => `掠夺 → (${x},${y})`,
  marchOccupy: (x: number, y: number) => `占领 → (${x},${y})`,
  marchReinforce: (x: number, y: number) => `增援 → (${x},${y})`,
  marchDue: (clock: string) => `预计 ${clock} 到达`,
  marchRecallBtn: '撤回',
  marchRecallBusy: '撤回中…',
  territoryTitle: '占领的野地',
  territoryEmpty: '尚未占领野地（出征获胜后由幸存部队驻占）',
  territoryRow: (terrain: string, level: number, resourceLabel: string, rate: number) =>
    `${terrain} Lv${level} · ${resourceLabel} +${rate}/h`,
  territoryGarrison: (count: number) => `驻军 ${count}`,
  territoryView: '查看',
  /** 连片加成（v23 AISLG-59）：领地列表行标注与地图悬浮提示 */
  territoryCluster: (size: number, percent: number) => `连片 ${size} · +${percent}%`,
  clusterTip: (label: string, size: number, percent: number) => `连片 ${size} 块，${label}产量 +${percent}%`,
  /** 战报列表（v13；详情走 battleReport 弹窗，点击行打开） */
  reportsTitle: '战斗战报',
  reportsEmpty: '暂无战报（战斗结算后生成）',
  reportsLoading: '战报查询中…',
  reportsRefresh: '刷新',
  reportsLoadOlder: '加载更早战报',
  reportWon: '胜',
  reportLost: '负',
  reportKindWilderness: '野地',
  reportKindNpcCity: 'NPC 城池',
  reportKindNpcRaid: 'NPC 袭击',
  reportKindCityRaid: '主城被袭',
  reportRoleAttacker: '攻方',
  reportRoleDefender: '守方',
  reportMyLosses: (troops: string) => `我方损失 ${troops}`,
  reportOpenHint: '查看战报详情',
  /** 侦察记录（v23 AISLG-62）：与战报同列表展示，标签区分 */
  reportKindScout: '侦察',
  reportScoutHint: '查看侦察报告',
  reportScoutGarrison: (count: number) => `守军 ${count}`,
  /** 地块详情：上次侦察时间与报告入口 */
  lastScoutAgo: (ago: string) => `上次侦察：${ago}前`,
  lastScoutView: '查看侦察报告',
  lastScoutLoading: '正在找侦察记录…',
  lastScoutMissing: '侦察记录不在最近事件里（可重新侦察刷新情报）',
};

/** 全服排行榜弹窗（v23，AISLG-61；v50 AISLG-133 新增模型榜与自报模型标注） */
const LEADERBOARD = {
  title: '全服排行榜',
  close: '关闭排行榜',
  refresh: '刷新',
  refreshing: '刷新中…',
  loadFailed: '排行榜加载失败，请重试',
  power: '综合战力',
  territory: '领地数量',
  plunder: '累计掠夺',
  model: '模型榜',
  updatedAt: (time: string) => `快照 ${time}`,
  rankColumn: '名次',
  playerColumn: '玩家',
  modelColumn: '模型（Agent 自报）',
  modelValueColumn: '前 10 名平均战力',
  valueColumn: '数值',
  myRank: (rank: number, value: number) => `我的名次：第 ${rank} 名 · ${value}`,
  myRankNone: '暂未上榜',
  agentBadge: 'Agent',
  /** 玩家榜上的自报模型标注（如 claude-opus-5-5·自报） */
  agentModelBadge: (model: string) => `${model}·自报`,
  /** 模型榜行内：该模型的账号数 */
  modelPlayers: (count: number) => `${count} 个账号`,
  /** 模型榜行内：该模型战力第一的玩家 */
  modelTop: (username: string, value: number) => `第一：${username} · ${value}`,
  /** 模型榜排名口径说明（验收：排名规则与页面说明一致） */
  modelRule: '口径：最近 7 天 Agent 上线过的账号，按该模型实力前 10 名的平均战力排名；不声明归「未声明」，名单外归「其他」。模型为 Agent 登录时自报，未经核实。',
  empty: '榜单还没有数据（服务端每 10 分钟刷新一次）',
};

/** 全服播报（v23，AISLG-60）：顶部滚动条文案 */
const SERVER_FEED = {
  tag: '【全服】',
  expandHint: '查看最近大事',
};

/** 集市兑换弹窗（v22 后端 EXCHANGE 能力，AISLG-67 补前端入口）：粮/木/石/铁按 4:1 换金币 */
const EXCHANGE = {
  open: '集市',
  title: '集市兑换',
  subtitle: '把多出的粮 / 木 / 石 / 铁换成金币（4 单位换 1 金，金币不可逆兑）',
  closeAria: '关闭集市兑换',
  amountLabel: (available: number) => `兑换数量（持有 ${available}）`,
  all: '全部',
  rateLine: (rate: number) => `汇率 ${rate} : 1`,
  preview: (gold: number, left: number, label: string) => `可换金币 ${gold}，兑换后${label}剩 ${left}`,
  tooSmall: (rate: number) => `至少 ${rate} 单位才能换出 1 金币`,
  cancel: '取消',
  submit: '兑换',
  busy: '兑换中…',
};

/** 离线日报弹窗（v23，AISLG-54）：收获 / 损失 / 现状与 Agent 的话 */
const OFFLINE_REPORT = {
  title: '离线日报',
  subtitle: '你不在时发生了什么',
  close: '关闭离线日报',
  durationMinutes: (minutes: number) => `${minutes} 分钟`,
  durationHours: (hours: number, minutes: number) => `${hours} 小时 ${minutes} 分钟`,
  gainsTitle: '收获',
  gainsNone: '离线期间没有进账',
  gainsLine: (detail: string) => `进账 ${detail}`,
  lossesTitle: '损失',
  lossesNone: '离线期间风平浪静',
  battlesRow: (n: number) => `发生战斗 ${n} 场`,
  troopsLostRow: (n: number) => `部队减员 ${n}`,
  npcRaidsRow: (n: number) => `NPC 袭击 ${n} 次`,
  wildernessLostRow: (n: number) => `被 NPC 攻破 ${n} 块野地`,
  statusTitle: '现状',
  statusCalm: '各项资源水位正常',
  storageFullRow: (label: string, percent: number) => `仓库${label}快满了（${percent}%），产出正在作废`,
  agentTitle: 'Agent 的话',
  writtenAt: (time: string) => `${time} 写`,
  acknowledge: '知道了，继续',
  openButton: '离线日报',
  loadingFailed: '日报加载失败，请重试',
};

/** 侦察报告弹窗（v23，AISLG-62）：守军构成、战力对比、库存与情报时间 */
const SCOUT_REPORT = {
  title: '侦察报告',
  close: '关闭侦察报告',
  location: (x: number, y: number) => `(${x},${y})`,
  ownerRow: (name: string) => ` · 占领者 ${name}`,
  minutesAgo: (minutes: number) => `${minutes} 分钟`,
  hoursAgo: (hours: number, minutes: number) => `${hours} 小时 ${minutes} 分钟`,
  daysAgo: (days: number) => `${days} 天`,
  scoutedAtAgo: (ago: string) => `侦察于 ${ago}前`,
  garrisonTitle: '守军构成（侦察快照）',
  garrisonNone: '侦察时该地块没有驻军',
  garrisonTotal: (count: number) => `合计 ${count}`,
  garrisonPower: (power: number) => `战力 ${power}`,
  powerHint: (power: number) => `战力 ${power}`,
  wallRow: (percent: number) => `城墙减伤 ${percent}%`,
  stockTitle: '可掠夺库存（侦察快照）',
  stockEmpty: '库存已被掠空',
  compareRow: (myPower: number, myCount: number) => `我方城内驻军 ${myCount}（战力 ${myPower}）`,
  verdictSafe: (ratio: number) => `战力约 ${ratio} 倍于守军，胜面较大`,
  verdictEven: `战力接近，五五开——建议多带些兵力或混编远程`,
  verdictDanger: `战力不足，打不过——先征兵或换个目标`,
  staleHint: '情报是侦察时刻的快照，守军与库存可能已变化',
};

/** 战报详情弹窗（v13）：双方编成损益、伤害走势与逐回合明细的文案 */
const BATTLE_REPORT = {
  closeAria: '关闭战报详情',
  close: '关闭',
  /** 战报 ID（排查问题时对账用，AISLG-44） */
  idBadge: (id: number) => `#${id}`,
  /** Agent 点评（v23 AISLG-53）：战报弹窗顶部展示 */
  commentTitle: 'AI 军师点评',
  commentAt: (time: string) => `${time} 写`,
  kindWilderness: '野地遭遇战',
  kindNpcCity: 'NPC 攻城战',
  kindNpcRaid: 'NPC 袭击',
  kindCityRaid: '守城战（被袭击）',
  kindPvpRaid: '攻城战（玩家）',
  kindPvpWilderness: '野地争夺（玩家）',
  kindPvpConquest: '攻城夺城（玩家）',
  resultWon: '胜 利',
  resultLost: '战 败',
  roleAttacker: '攻',
  roleDefender: '守',
  sideMine: '我方',
  sideEnemy: '敌方',
  location: (x: number, y: number) => `(${x},${y})`,
  roundsMeta: (rounds: number) => `${rounds} 回合`,
  endWiped: '守方全灭',
  endAttackerWiped: '攻方全灭',
  endRoundLimit: '回合耗尽，攻方未能突破',
  wallBadge: (percent: number) => `守方城墙减伤 ${percent}%`,
  statTroops: '兵力',
  statLosses: '损失',
  statSurvivors: '幸存',
  statDamage: '总输出',
  /** 射程行（v23 AISLG-49）：双方最远射程与远程兵数量，判断「够不够得到对方」 */
  rangeLine: (maxRange: number, ranged: number) => `最远射程 ${maxRange} · 远程兵 ${ranged}`,
  rangeTip: '远程兵 = 射程超过近战基准的单位（当前为弓箭兵）。对方最远射程远超我方时，他打得到你、你够不到他',
  versus: 'VS',
  damageShareLabel: '输出占比',
  chartTitle: '伤害走势',
  chartMine: '我方累计伤害',
  chartEnemy: '敌方累计伤害',
  chartApproach: '接敌推进',
  roundsTitle: (rounds: number) => `逐回合明细（${rounds}）`,
  roundDamage: (mine: number, enemy: number) => `${mine} / ${enemy}`,
  roundKilled: (mine: number, enemy: number) => `阵亡 ${mine} / ${enemy}`,
  roundChipTip: (round: number, mineDamage: number, enemyDamage: number, mineKilled: number, enemyKilled: number) =>
    `第 ${round} 回合：我方输出 ${mineDamage}、阵亡 ${mineKilled}；敌方输出 ${enemyDamage}、阵亡 ${enemyKilled}`,
  returnNote: '幸存部队随返程行军回城，到达后才入城',
  noTroops: '无兵力',
  /** 按 id 反查（事件流入口）的加载态 */
  loading: '战报加载中…',
  loadFailed: '战报加载失败（可能已被清理）',
};

/** NPC 来袭预警弹窗（v23 AISLG-57 推送，AISLG-66 前端消费）：立即弹出留时间增援或撤退 */
const NPC_WARNING = {
  /** 玩家来袭（v38 AISLG-122，推送带 attacker 时）与 NPC 来袭共用一个弹窗 */
  titlePlayer: '⚔ 玩家来袭预警',
  title: '⚠ NPC 来袭预警',
  closeAria: '关闭预警',
  targetLabel: '目标：',
  targetCity: '你的主城',
  attackerLabel: '进攻方：',
  attackerRow: (username: string, cityName: string) => `${username}（从 ${cityName} 出兵）`,
  targetWild: (x: number, y: number, terrain: string, level: number) =>
    `你占领的野地 (${x},${y})${terrain ? ` ${terrain}` : ''} Lv${level}`,
  arriveLabel: '预计到达：',
  arriveLeft: (left: string) => `（剩 ${left}）`,
  armyLabel: '敌方兵力：',
  /** 兵力为 ±20% 估算区间，精确编成见战后战报 */
  armyNote: '（估算）',
  adviceCity: '主城被攻破会被掠夺资源（随后进入免战期）。来得及的话：城墙升级、城内留足驻军。',
  advicePlayer:
    '对方是玩家部队：来得及就从别的城调兵增援（选中自己的城派兵即调兵）、把资源花掉（建造 / 征兵锁资源）；守不住也不会被占领，被攻破后该城进入免战期。',
  adviceWild:
    '来得及增援就选中该野地派兵（增援不战斗、并入驻军）；守不住就选中野地「召回全部驻军」——召回即放弃占领，袭击随之作废。',
  acknowledge: '知道了',
};

/** 主动免战动作与状态文案（v38 AISLG-122） */
const TRUCE_COPY = {
  startedText: (until: string | null) =>
    until ? `主动免战已开启，至 ${until}（期间别人打不了你，你也不能出兵打玩家）` : '主动免战已开启',
  errAlreadyActive: '主动免战已在生效中，无需重复开启',
  errWeeklyUsed: '本周的免战已用过（每周一次免费）',
  errWeeklyUsedLeft: (seconds: number) => {
    const hours = Math.ceil(seconds / 3600);
    return `本周的免战已用过（每周一次），约 ${hours} 小时后再开`;
  },
  errFallback: '开启免战失败，请稍后重试',
};
