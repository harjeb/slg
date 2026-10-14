// 易用性补强的界面文案：P0 空闲队列入口、可领取奖励、一键填满、可升级标记、跳转招募；P2 小地图、书签、浏览器通知、快捷键。
// 组件用 useCopy().UX_COPY；英文孪生在 copy-ux-en.ts。

export const UX_COPY = {
  lanes: {
    /** 进行中泳道「空闲」时的跳转入口（按泳道） */
    goIdle: { build: '空闲 · 去建造', recruit: '空闲 · 去征兵', tech: '空闲 · 去研究', march: '空闲 · 去出征' } as Record<'build' | 'recruit' | 'tech' | 'march', string>,
    rewards: '奖励',
    rewardsClaimable: (n: number) => `${n} 项可领取 · 去领取`,
    rewardsNone: '暂无可领取',
  },
  nav: {
    buildIdle: '建造队列空闲',
    claimable: (n: number) => `${n} 项奖励可领取`,
  },
  fill: {
    max: '最大',
    maxTitle: '按当前资源与人口能招的最多数量',
    all: '全部',
    allTitle: '在人口上限内尽量带上该兵种',
  },
  city: {
    upgradable: '资源足够，可立即升级',
    buildable: '资源足够，可立即建造',
  },
  lineup: {
    goRecruit: '去酒馆招募 ›',
  },
  map: {
    collapse: '收起',
    expand: '展开黄巾之乱',
    /** 小地图（P2） */
    minimap: '小地图',
    minimapTitle: '全图概览：点击跳到该处；白框 = 当前视野，绿点 = 我的城池，红点 = 行军目标，金点 = 书签',
    /** 书签（只存本机） */
    bookmarks: '书签',
    bookmarksTitle: '收藏的坐标（只存在本机浏览器）',
    bookmarkAdd: (x: number, y: number) => `☆ 收藏选中地块 (${x}, ${y})`,
    bookmarkRemoveSelected: (x: number, y: number) => `★ 取消收藏 (${x}, ${y})`,
    bookmarkNeedSelect: '先在地图上选中一个地块再收藏',
    bookmarkEmpty: '还没有书签',
    bookmarkRemove: '删除书签',
    bookmarkLimit: (n: number) => `最多 ${n} 个，超出时挤掉最早的`,
  },
  /** 浏览器通知（P2）：页面不在前台时，队列完成 / 部队到达 / 敌军来袭弹系统通知 */
  notify: {
    menuOn: '浏览器通知：开',
    menuOff: '浏览器通知：关',
    unsupported: '浏览器通知：不支持',
    denied: '浏览器通知：已被浏览器拒绝',
    buildDone: (name: string, level: number) => `${name} 升到 Lv${level}`,
    recruitDone: (name: string, count: number) => `${name} ×${count} 征募完成`,
    researchDone: (name: string, level: number) => `${name} 研究到 Lv${level}`,
    marchArrived: (x: number, y: number) => `部队到达 (${x}, ${y})`,
    marchReturned: '部队已回城',
    incoming: (x: number, y: number) => `敌军来袭！目标 (${x}, ${y})`,
  },
  /** 快捷键（P2） */
  shortcuts: {
    navHint: (label: string, key: string) => `${label}（快捷键 ${key}）`,
  },
};
