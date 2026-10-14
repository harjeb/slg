// 宝物与宝物槽的协议文档（v61）：GET_ITEMS / EQUIP_ITEM / UNEQUIP_ITEM / SELL_ITEM。规则与数值见 items.ts。

import { Op } from './protocol';
import type { RequestOpDoc } from './protocol-doc';
import { ITEM_DEFS, ITEM_EFFECT_CAP_PERCENT } from './items';

const ITEM_LIST = Object.values(ITEM_DEFS)
  .map((d) => `${d.name}（${d.id}，${d.category}）`)
  .join('、');

export const ITEM_RULES_DESC =
  `每名武将（名将、普通将都有）1 个宝物槽，武器 / 坐骑 / 兵书都装进同一个槽，一将同时只装 1 件。宝物效果：atkPercent 所带部队攻击 +%、defPercent 受到伤害 −%` +
  `（不计入武力 / 智力加成的 20% 封顶，单件各不超过 ${ITEM_EFFECT_CAP_PERCENT}%，与武将加成一样随统率超编摊薄）、lead 统率 +N（提高满额带兵数，竞技场 / 将星塔里也提高系统标准兵数）、` +
  `marchSpeedPercent 随行行军速度 +%（只看带队主将，与行军科技等加成相加）、troopBonuses 按兵种生效的攻击 / 减伤（大宛马只给骑兵 / 铁骑减伤 3%，不会变成全军减伤）。所有战斗都生效（大地图出征 / 守城、竞技场、将星塔、副本）；在副本里当副将时只按副将规则折算全局攻击 / 减伤，兵书统率、坐骑速度与兵种专属装备效果不生效。` +
  `随军（含副本副将）或历练中的武将不能更换宝物；武将被解雇时宝物自动回背包。宝物不能分解，只能把背包里（未装备）的卖给系统换固定金币（进主城）。当前宝物：${ITEM_LIST}，来自副本掉落。`;

const ITEM_EXAMPLE = {
  id: '9d3e5f4a-1c2b-4d6e-8f70-5a7b9c1d3e52',
  def: 'qixing_blade',
  name: '七星宝刀',
  category: 'weapon',
  effect: { atkPercent: 5 },
  sellGold: 2000,
  heroId: '6b1f3c2e-9a0d-4f7e-8b21-3d5c7e9f1a20',
  source: 'dungeon:hulao',
  acquiredAt: '2026-10-14T08:20:00.000Z',
};

const ITEMS_FIELD = { name: 'items[]', type: 'Item[]', desc: 'id 实例 id、def 定义 id、name、category（weapon / mount / book）、effect { atkPercent?, defPercent?, lead?, marchSpeedPercent?, troopBonuses?: { 兵种: { atkPercent?, defPercent? } } }、sellGold 出售价、heroId 装在哪名武将身上（null = 在背包）、source 来源、acquiredAt。' };
const HERO_ERRORS = ['HERO_NOT_FOUND', 'HERO_BUSY', 'HERO_TRAINING'] as const;

export const REQUEST_GET_ITEMS: RequestOpDoc = {
  kind: 'request',
  name: 'GET_ITEMS',
  title: '查询背包',
  preAuth: false,
  summary: `（v61）返回我的全部宝物（含已装备的），按获得先后。${ITEM_RULES_DESC}`,
  requestFields: [],
  dataFields: [ITEMS_FIELD],
  errors: [],
  examples: [
    {
      caption: '一件装在武将身上的宝物',
      request: { op: Op.GET_ITEMS, seq: 1 },
      responses: [{ op: Op.GET_ITEMS, seq: 1, ok: true, data: { items: [ITEM_EXAMPLE] } }],
    },
  ],
};

export const REQUEST_EQUIP_ITEM: RequestOpDoc = {
  kind: 'request',
  name: 'EQUIP_ITEM',
  title: '装备宝物',
  preAuth: false,
  summary: '（v61）把宝物装到武将的宝物槽：武将原有的宝物回背包；宝物原来装在别的武将身上则从那名武将卸下（两名武将都须在家、不在历练）。已经装在该武将身上视为成功。成功后 HeroView.equipment 与 bonus 随之变化。',
  requestFields: [
    { name: 'itemId', type: 'string', desc: '必填。宝物实例 id（GET_ITEMS 的 items[].id）。' },
    { name: 'heroId', type: 'string', desc: '必填。武将 id。' },
  ],
  dataFields: [ITEMS_FIELD],
  errors: ['INVALID_PARAMS', 'ITEM_NOT_FOUND', ...HERO_ERRORS],
  examples: [
    {
      caption: '给张辽装上七星宝刀',
      request: { op: Op.EQUIP_ITEM, seq: 2, data: { itemId: ITEM_EXAMPLE.id, heroId: ITEM_EXAMPLE.heroId } },
      responses: [{ op: Op.EQUIP_ITEM, seq: 2, ok: true, data: { items: [ITEM_EXAMPLE] } }],
    },
  ],
};

export const REQUEST_UNEQUIP_ITEM: RequestOpDoc = {
  kind: 'request',
  name: 'UNEQUIP_ITEM',
  title: '卸下宝物',
  preAuth: false,
  summary: '（v61）把宝物从武将身上卸回背包（武将须在家、不在历练）；本来就在背包视为成功。',
  requestFields: [{ name: 'itemId', type: 'string', desc: '必填。宝物实例 id。' }],
  dataFields: [ITEMS_FIELD],
  errors: ['INVALID_PARAMS', 'ITEM_NOT_FOUND', 'HERO_BUSY', 'HERO_TRAINING'],
  examples: [
    {
      caption: '卸下七星宝刀',
      request: { op: Op.UNEQUIP_ITEM, seq: 3, data: { itemId: ITEM_EXAMPLE.id } },
      responses: [{ op: Op.UNEQUIP_ITEM, seq: 3, ok: true, data: { items: [{ ...ITEM_EXAMPLE, heroId: null }] } }],
    },
  ],
};

export const REQUEST_SELL_ITEM: RequestOpDoc = {
  kind: 'request',
  name: 'SELL_ITEM',
  title: '出售宝物',
  preAuth: false,
  summary: '（v61）把背包里（未装备）的宝物卖给系统，按 sellGold 固定价换金币进主城（不受仓库上限钳制）；宝物不能分解。装着的先 UNEQUIP_ITEM。',
  requestFields: [{ name: 'itemId', type: 'string', desc: '必填。宝物实例 id。' }],
  dataFields: [
    { name: 'gold', type: 'number', desc: '得到的金币（已进主城）。' },
    ITEMS_FIELD,
  ],
  errors: ['INVALID_PARAMS', 'ITEM_NOT_FOUND', 'ITEM_EQUIPPED'],
  examples: [
    {
      caption: '卖掉一把重复的七星宝刀',
      request: { op: Op.SELL_ITEM, seq: 4, data: { itemId: ITEM_EXAMPLE.id } },
      responses: [{ op: Op.SELL_ITEM, seq: 4, ok: true, data: { gold: 2000, items: [] } }],
    },
  ],
  agentNote: '同名宝物可以有多件，但一将只能装一件，多余的只能卖钱。',
};

export const ITEM_OP_DOCS = {
  [Op.GET_ITEMS]: REQUEST_GET_ITEMS,
  [Op.EQUIP_ITEM]: REQUEST_EQUIP_ITEM,
  [Op.UNEQUIP_ITEM]: REQUEST_UNEQUIP_ITEM,
  [Op.SELL_ITEM]: REQUEST_SELL_ITEM,
};
