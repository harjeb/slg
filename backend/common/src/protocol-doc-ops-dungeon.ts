// 副本的协议文档（v63，虎牢关）：GET_DUNGEON / ENTER_DUNGEON / GET_DUNGEON_REPORTS / PUSH_DUNGEON_STATE。
// 宝物相关协议在 protocol-doc-ops-items.ts。规则与数值见 dungeon.ts / dungeon-run.ts；玩家与 Agent 同一套规则。

import { Op } from './protocol';
import type { PushOpDoc, RequestOpDoc } from './protocol-doc';
import {
  DEPUTY_CAP_PERCENT,
  DEPUTY_LEAD_TROOPS_PER_POINT,
  DEPUTY_SHARE,
  DUNGEONS,
  DUNGEON_MAX_HEROES,
  MEDIC_MAX_SHARE,
  MEDIC_POP_PER_UNIT,
  WOUNDED_RETURN_SHARE,
} from './dungeon';

const HULAO = DUNGEONS.hulao;
const pct = (v: number): string => `${Math.round(v * 100)}%`;

export const DUNGEON_RULES_DESC =
  `副本是地图上的固定地点（地块 kind='dungeon'，普通出征 TARGET_NOT_ATTACKABLE）。用 ENTER_DUNGEON 派 1 名主将 + 最多 ${DUNGEON_MAX_HEROES - 1} 名副将、` +
  `人口合计不超过 rules.popLimit（${HULAO.name} ${HULAO.popLimit}；铁骑 / 床弩 3、冲车 5、辎重车 / 后勤兵 6，其余 1）的真实部队，按正常行军时间前往；` +
  `到达后一次性连续打 ${HULAO.waves.length} 波（敌军阵容与敌将公开），每波的幸存兵数进入下一波，任意一波战败即终止，最后一波是攻城战（守方据城墙）。` +
  `主将加成按现有规则（武力 / 智力、宝物、特长，统率超编摊薄；每波按当时部队规模重算）；所有兵合成一支部队，满额带兵数 = 主将统率（含兵书） × 20 + 每名副将基础统率 × ${DEPUTY_LEAD_TROOPS_PER_POINT}。` +
  `副将不单独带兵：各自的（武力加成 + 宝物攻击）× ${pct(DEPUTY_SHARE)}、（智力加成 + 宝物减伤）× ${pct(DEPUTY_SHARE)} 加到全军，合计各封顶 ${DEPUTY_CAP_PERCENT}%（不占主将的 20% 封顶，不摊薄）；副将的兵书统率、特长、坐骑速度与兵种专属装备效果不生效。` +
  `后勤兵（medic）为医疗小队：打赢一波后（最后一波除外），每单位存活后勤兵救回至多 ${MEDIC_POP_PER_UNIT} 人口，单波合计不超过该波阵亡人口的 ${pct(MEDIC_MAX_SHARE)}（按各兵种阵亡人口比例分配）；辎重车只负责运输，不救治。` +
  `可选自动撤退：打赢一波后战斗兵人口（不含民夫 / 辎重车 / 后勤兵）低于出发时的 retreatBelowPercent% 就不再打下一波。` +
  `结束后仅最终幸存部队返程，未被波间救回的阵亡永久损失，不返还伤兵；武将随部队返程（返程期间仍占用）。` +
  `奖励：每打赢一波得该波资源；通关再得通关资源并判定宝物——首次通关必掉一件（宝物池等概率），之后每次通关按 rules.treasureChance。资源在结算时直接进出发城。` +
  `每人每天 rules.dailyAttempts 次（北京日刷新），出发即扣，失败 / 撤退不退；同一副本同时只能有一支部队在路上；在路上可用 RECALL_MARCH 折返（本次取消，次数不退）。进出副本的行军不会被截击。`;

const RUN_EXAMPLE = {
  id: 12,
  dungeonId: 'hulao',
  dungeonName: '虎牢关',
  status: 'resolved',
  createdAt: '2026-10-14T08:00:00.000Z',
  resolvedAt: '2026-10-14T08:20:00.000Z',
  marchId: '0f8a2c1e-4b7d-4e2a-9c31-7d5e8f1a2b40',
  returnMarchId: '1f8a2c1e-4b7d-4e2a-9c31-7d5e8f1a2b41',
  heroes: [
    { role: 'main', id: '6b1f3c2e-9a0d-4f7e-8b21-3d5c7e9f1a20', name: '张辽', lead: 52, force: 50, wit: 45, specialty: null, equipment: 'qixing_blade' },
    { role: 'deputy', id: '7c2a4d3f-0b1e-4a8f-9c32-4e6d8f0a2b31', name: '李典', lead: 40, force: 40, wit: 35, specialty: 'infantry', equipment: null },
  ],
  troops: { swordsman: 300, pikeman: 300, archer: 250, cavalry: 88, medic: 2 },
  retreatBelowPercent: 20,
  outcome: 'cleared',
  wavesWon: 6,
  waves: [
    {
      wave: 1, name: '西凉先锋', won: true, rounds: 9, endReason: 'defender_wiped',
      troops: { swordsman: 300, pikeman: 300, archer: 250, cavalry: 88, medic: 2 },
      losses: { swordsman: 31, pikeman: 22, archer: 9, cavalry: 15 },
      survivors: { swordsman: 269, pikeman: 278, archer: 241, cavalry: 73, medic: 2 },
      enemyTroops: { militia: 500, cavalry: 150 }, enemyLosses: { militia: 500, cavalry: 150 },
      healed: { swordsman: 6, pikeman: 5, archer: 2, cavalry: 2 },
      bonus: { mainAtkPercent: 20, mainDefPercent: 13.5, deputyAtkPercent: 3, deputyDefPercent: 2.6, scale: 1 },
    },
  ],
  survivors: { swordsman: 120, pikeman: 61, archer: 40, cavalry: 12 },
  woundedReturned: {},
  returning: { swordsman: 120, pikeman: 61, archer: 40, cavalry: 12 },
  rewards: { gold: 4100, wood: 6100, food: 6100, stone: 6100, iron: 6100 },
  treasure: { def: 'dawan_horse', name: '西凉大宛马', category: 'mount', effect: { marchSpeedPercent: 15, troopBonuses: { cavalry: { defPercent: 3 }, iron_cavalry: { defPercent: 3 } } }, sellGold: 2000 },
  firstClear: true,
  heroExp: 7380,
};

export const REQUEST_GET_DUNGEON: RequestOpDoc = {
  kind: 'request',
  name: 'GET_DUNGEON',
  title: '查询副本',
  preAuth: false,
  summary: `（v61）返回全部副本（目前只有${HULAO.name}）：入口坐标、规则参数、各波敌军（兵种数量 / 敌将属性与加成 / 是否攻城与城墙减伤 / 该波资源）、通关资源、宝物池、今日剩余次数、首通时刻与通关次数、进行中的挑战。${DUNGEON_RULES_DESC}`,
  requestFields: [],
  dataFields: [
    { name: 'dungeons[].id / name / x / y', type: 'string / string / number / number', desc: '副本 id（ENTER_DUNGEON 的 dungeonId）、名称与入口地块坐标（行军时长按到入口的距离算）。' },
    { name: 'dungeons[].rules', type: 'object', desc: 'popLimit 人口上限、maxHeroes 武将上限（含主将）、dailyAttempts 每日次数、deputyShare 副将折算比例、deputyCapPercent 副将合计封顶、deputyLeadTroopsPerPoint 副将每点统率增加的满额带兵数、medicPopPerUnit 每单位后勤兵每波救回人口（v62）、medicPopPerWagon 已废弃且恒为 0（辎重车不救治）、medicMaxShare 单波救回占阵亡比例上限、woundedReturnShare 已废弃且恒为 0（v63 取消战后伤兵返还）、treasureChance 非首通掉宝物概率。' },
    { name: 'dungeons[].waves[]', type: 'object[]', desc: 'wave 序号、name、general { name, lead, force, wit, atkPercent, defPercent }（敌将加成不摊薄）、troops 敌军、siege 是否攻城、wallDefensePercent 城墙减伤、reward 打赢该波的资源。' },
    { name: 'dungeons[].clearReward', type: 'Resources', desc: '通关额外资源。' },
    { name: 'dungeons[].treasures', type: 'ItemDef[]', desc: '宝物池（等概率）：def / name / category / effect / sellGold，字段同 GET_ITEMS。' },
    { name: 'dungeons[].attemptsLeft / firstClearedAt / clears', type: 'number / string | null / number', desc: '今日剩余次数、首通时刻（null = 还没通关过，下次通关必掉宝物）、累计通关次数。' },
    { name: 'dungeons[].active', type: 'DungeonRun | null', desc: '进行中（在路上）的挑战，字段同 GET_DUNGEON_REPORTS 的 reports[]（结果字段为 null）；没有为 null。' },
  ],
  errors: [],
  examples: [
    {
      caption: '查询副本（节选第 6 波）',
      request: { op: Op.GET_DUNGEON, seq: 1 },
      responses: [
        {
          op: Op.GET_DUNGEON,
          seq: 1,
          ok: true,
          data: {
            dungeons: [
              {
                id: 'hulao', name: '虎牢关', x: 72, y: 20,
                rules: { popLimit: 1000, maxHeroes: 3, dailyAttempts: 5, deputyShare: 0.25, deputyCapPercent: 10, deputyLeadTroopsPerPoint: 10, medicPopPerWagon: 0, medicPopPerUnit: MEDIC_POP_PER_UNIT, medicMaxShare: MEDIC_MAX_SHARE, woundedReturnShare: WOUNDED_RETURN_SHARE, treasureChance: 0.05 },
                waves: [
                  { wave: 6, name: '董卓', general: { name: '董卓', lead: 70, force: 40, wit: 60, atkPercent: 12, defPercent: 18 }, troops: { swordsman: 100, archer: 90, ballista: 10 }, siege: true, wallDefensePercent: 30, reward: { gold: 1000, wood: 1500, food: 1500, stone: 1500, iron: 1500 } },
                ],
                clearReward: { gold: 1000, wood: 1500, food: 1500, stone: 1500, iron: 1500 },
                treasures: [{ def: 'qixing_blade', name: '七星宝刀', category: 'weapon', effect: { atkPercent: 5 }, sellGold: 2000 }],
                attemptsLeft: 5, firstClearedAt: null, clears: 0, active: null,
              },
            ],
          },
        },
      ],
    },
  ],
  agentNote: '敌军全部公开，可先按各波兵种倾向配兵（第 3 波刀盾长枪克骑兵、第 5 波吕布铁骑、第 6 波据城墙）；单一兵种很难稳定通关。人口受限时应比较副将与后勤兵的作用；后勤兵挤占战斗人口，零攻击、零负重，仅在副本救治；辎重车只增加负重。新兵种数值待校准，不能把某个后勤兵数量视为固定最优。',
};

export const REQUEST_ENTER_DUNGEON: RequestOpDoc = {
  kind: 'request',
  name: 'ENTER_DUNGEON',
  title: '出征副本',
  preAuth: false,
  summary: `（v61）从出发城（可选 cityId，缺省主城）派部队与武将去副本入口：校验通过后扣城内驻军、扣一次次数、创建行军（purpose='dungeon'，与 MARCH 的行军视图相同，受校场在外部队数上限约束），到达由服务端连续结算并推送 PUSH_DUNGEON_STATE。行军速度按编队最慢兵种，吃行军科技与主将坐骑加成。${DUNGEON_RULES_DESC}`,
  requestFields: [
    { name: 'dungeonId', type: 'string', desc: '必填。GET_DUNGEON 的 dungeons[].id，如 hulao。' },
    { name: 'mainHeroId', type: 'string', desc: '必填。主将 id。武将须在家：不在随军（含副将）/ 历练 / 重伤 / 欠饷，也不在任城守。' },
    { name: 'deputyHeroIds', type: 'string[]', desc: `可选。副将 id，最多 ${DUNGEON_MAX_HEROES - 1} 名，不能与主将重复；要求同主将。` },
    { name: 'troops', type: 'Partial<ArmyCounts>', desc: '必填。部队（兵种 → 数量，非负整数），人口合计不超过 rules.popLimit，且至少有 1 名战斗兵；不超过出发城驻军。' },
    { name: 'retreatBelowPercent', type: 'number', desc: '可选，1–99。打赢一波后战斗兵人口低于出发时的该百分比就撤退（不再打下一波）；缺省不撤退。' },
    { name: 'cityId', type: 'string', desc: '可选。出发城 id，缺省主城。' },
  ],
  dataFields: [
    { name: 'march', type: 'MarchView', desc: "出征行军（purpose='dungeon'，heroId 为主将），字段同 MARCH 响应。" },
    { name: 'run', type: 'DungeonRun', desc: '本次挑战记录（status=marching，结果字段为 null），字段同 GET_DUNGEON_REPORTS 的 reports[]。' },
    { name: 'attemptsLeft', type: 'number', desc: '扣次数后的今日剩余次数。' },
  ],
  errors: ['INVALID_PARAMS', 'DUNGEON_NO_ATTEMPTS', 'DUNGEON_POP_LIMIT', 'DUNGEON_HERO_LIMIT', 'DUNGEON_IN_PROGRESS', 'INSUFFICIENT_TROOPS', 'DEPLOY_LIMIT', 'HERO_NOT_FOUND', 'HERO_BUSY', 'HERO_TRAINING', 'HERO_WOUNDED', 'HERO_ARREARS', 'GUARD_ASSIGN_DENIED'],
  examples: [
    {
      caption: '主将 + 1 副将，带 2 小队后勤兵，兵力低于 20% 撤退',
      request: {
        op: Op.ENTER_DUNGEON, seq: 2,
        data: { dungeonId: 'hulao', mainHeroId: RUN_EXAMPLE.heroes[0].id, deputyHeroIds: [RUN_EXAMPLE.heroes[1].id], troops: RUN_EXAMPLE.troops, retreatBelowPercent: 20 },
      },
      responses: [
        {
          op: Op.ENTER_DUNGEON, seq: 2, ok: true,
          data: {
            march: {
              id: RUN_EXAMPLE.marchId, fromCityId: '3a9d2f1c-5e7b-4c8a-9d10-2b4c6e8f0a12', x: 72, y: 20,
              troops: { porter: 0, militia: 0, scout: 0, pikeman: 300, swordsman: 300, archer: 250, cavalry: 88, iron_cavalry: 0, supply_wagon: 0, ballista: 0, siege_ram: 0, medic: 2 },
              purpose: 'dungeon', status: 'marching', initiator: 'player', startedAt: '2026-10-14T08:00:00.000Z', arriveAt: '2026-10-14T08:20:00.000Z',
              resolvedAt: null, targetId: null, cargo: null, ambushAt: null, heroId: RUN_EXAMPLE.heroes[0].id,
            },
            run: { ...RUN_EXAMPLE, status: 'marching', returnMarchId: null, resolvedAt: null, outcome: null, wavesWon: null, waves: null, survivors: null, woundedReturned: null, returning: null, rewards: null, treasure: null, firstClear: null, heroExp: null },
            attemptsLeft: 4,
          },
        },
      ],
    },
    {
      caption: '人口超限',
      request: { op: Op.ENTER_DUNGEON, seq: 3, data: { dungeonId: 'hulao', mainHeroId: RUN_EXAMPLE.heroes[0].id, troops: { swordsman: 1001 } } },
      responses: [{ op: Op.ENTER_DUNGEON, seq: 3, ok: false, error: { code: 'DUNGEON_POP_LIMIT', message: '部队人口超过副本上限' } }],
    },
  ],
  agentNote: '出发即扣次数，失败不退；先用 GET_DUNGEON 看剩余次数与敌军。到达后不能再干预，想止损就设 retreatBelowPercent。结算结果以 PUSH_DUNGEON_STATE 或 GET_DUNGEON_REPORTS 为准；最终幸存部队随返程行军回城后才回到驻军。',
};

export const REQUEST_GET_DUNGEON_REPORTS: RequestOpDoc = {
  kind: 'request',
  name: 'GET_DUNGEON_REPORTS',
  title: '查询副本战报',
  preAuth: false,
  summary: '（v61）我的副本挑战记录，按时间倒序分页（含在路上的）；每人保留最近 50 条已结算的。结算后的记录给出每一波的双方兵力与伤亡、救治、生效加成，以及返程兵力、资源、宝物、武将经验。',
  requestFields: [
    { name: 'limit', type: 'number', desc: '可选，1–50，缺省 20。' },
    { name: 'beforeId', type: 'number', desc: '可选。只返回 id 小于它的更早记录（翻页游标）。' },
  ],
  dataFields: [
    { name: 'reports[]', type: 'DungeonRun', desc: 'id、dungeonId、dungeonName、status（marching 在路上 / resolved 已结算 / cancelled 在路上用 RECALL_MARCH 折返、次数不退）、createdAt、resolvedAt、marchId、returnMarchId（返程行军 id，尚未返程为 null；全灭后武将仍需返程）、heroes[]（role main / deputy、属性、特长、宝物 equipment）、troops 出发兵力、retreatBelowPercent；结算后：outcome（cleared 通关 / defeated 战败 / retreated 撤退）、wavesWon、waves[]（每波 troops / losses / survivors / enemyTroops / enemyLosses / healed 救回 / bonus 主将与副将加成 / rounds / endReason）、survivors 结束时幸存、woundedReturned 兼容旧战报（v63 起新结算恒为空编队）、returning 返程兵力（v63 起等于 survivors）、rewards 资源（逐波 + 通关，已进出发城）、treasure 掉落宝物或 null、firstClear 是否首通、heroExp 每名武将各得经验。未结算时这些字段为 null。' },
    { name: 'hasMore', type: 'boolean', desc: '是否还有更早的记录。' },
  ],
  errors: ['INVALID_PARAMS'],
  examples: [
    {
      caption: '首通掉落西凉大宛马（节选第 1 波）',
      request: { op: Op.GET_DUNGEON_REPORTS, seq: 4, data: { limit: 1 } },
      responses: [{ op: Op.GET_DUNGEON_REPORTS, seq: 4, ok: true, data: { reports: [RUN_EXAMPLE], hasMore: true } }],
    },
  ],
};

export const PUSH_DUNGEON_STATE: PushOpDoc = {
  kind: 'push',
  name: 'PUSH_DUNGEON_STATE',
  title: '推送：副本挑战状态变化（v61）',
  summary: '出发、到达入口、连续结算、返程回城或取消时推给该账号全部在线连接（含 Agent）。run 是推送时读取的当前记录，arrived 与 resolved 可能来自同一事务、携带相同的已结算记录；按 reason 区分阶段。仅 resolved 表示结算结果、资源与宝物已入账；returned 表示兵将回城（另有 PUSH_MARCH_STATE）。',
  dataFields: [
    { name: 'reason', type: 'string', desc: 'started 出发 / arrived 到达 / resolved 结算 / returned 回城 / cancelled 取消（次数不退）。' },
    { name: 'run', type: 'DungeonRun', desc: '当前挑战记录，字段同 GET_DUNGEON_REPORTS 的 reports[]。' },
  ],
  examples: [{ op: Op.PUSH_DUNGEON_STATE, push: true, data: { reason: 'resolved', run: RUN_EXAMPLE } }],
  agentNote: '推送可能漏收，以 GET_DUNGEON_REPORTS 为准。',
};

export const DUNGEON_OP_DOCS = {
  [Op.GET_DUNGEON]: REQUEST_GET_DUNGEON,
  [Op.ENTER_DUNGEON]: REQUEST_ENTER_DUNGEON,
  [Op.GET_DUNGEON_REPORTS]: REQUEST_GET_DUNGEON_REPORTS,
  [Op.PUSH_DUNGEON_STATE]: PUSH_DUNGEON_STATE,
};
