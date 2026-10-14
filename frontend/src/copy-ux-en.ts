// 英文文案孪生：copy-ux.ts 的英文版；satisfies 校验结构与函数签名一致。

import { UX_COPY } from './copy-ux';

export const UX_COPY_EN = {
  lanes: {
    goIdle: { build: 'Idle · Build', recruit: 'Idle · Recruit', tech: 'Idle · Research', march: 'Idle · March' },
    rewards: 'Rewards',
    rewardsClaimable: (n: number) => `${n} to claim · Claim`,
    rewardsNone: 'Nothing to claim',
  },
  nav: {
    buildIdle: 'Build queue idle',
    claimable: (n: number) => `${n} reward${n === 1 ? '' : 's'} to claim`,
  },
  fill: {
    max: 'Max',
    maxTitle: 'Most you can recruit with current resources and population',
    all: 'All',
    allTitle: 'Take as many of this troop as the population cap allows',
  },
  city: {
    upgradable: 'Enough resources to upgrade now',
    buildable: 'Enough resources to build now',
  },
  lineup: {
    goRecruit: 'Recruit at tavern ›',
  },
  map: {
    collapse: 'Collapse',
    expand: 'Expand Yellow Turban event',
    minimap: 'Minimap',
    minimapTitle: 'World overview: click to jump there. White frame = current view, green = your cities, red = march targets, gold = bookmarks',
    bookmarks: 'Bookmarks',
    bookmarksTitle: 'Saved coordinates (stored in this browser only)',
    bookmarkAdd: (x: number, y: number) => `☆ Bookmark selected tile (${x}, ${y})`,
    bookmarkRemoveSelected: (x: number, y: number) => `★ Remove bookmark (${x}, ${y})`,
    bookmarkNeedSelect: 'Select a tile on the map first',
    bookmarkEmpty: 'No bookmarks yet',
    bookmarkRemove: 'Delete bookmark',
    bookmarkLimit: (n: number) => `Up to ${n}; the oldest is dropped when full`,
  },
  notify: {
    menuOn: 'Browser notifications: on',
    menuOff: 'Browser notifications: off',
    unsupported: 'Browser notifications: unsupported',
    denied: 'Browser notifications: blocked by browser',
    buildDone: (name: string, level: number) => `${name} reached Lv${level}`,
    recruitDone: (name: string, count: number) => `${name} ×${count} recruited`,
    researchDone: (name: string, level: number) => `${name} researched to Lv${level}`,
    marchArrived: (x: number, y: number) => `Troops arrived at (${x}, ${y})`,
    marchReturned: 'Troops returned to the city',
    incoming: (x: number, y: number) => `Enemy incoming! Target (${x}, ${y})`,
  },
  shortcuts: {
    navHint: (label: string, key: string) => `${label} (shortcut ${key})`,
  },
} satisfies typeof UX_COPY;
