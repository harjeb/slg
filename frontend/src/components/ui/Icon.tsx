/** 线性图标（手写内联 SVG，不引第三方图标库）：24×24 视框、描边 1.75、颜色跟随 currentColor。
 *  纯装饰：aria-hidden，文字说明由外层按钮 / title 提供。role 取下方静态中文名（定位约定，不随界面语言变）。
 */

import type { ReactNode } from 'react';

const PATHS = {
  overview: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  map: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  city: <path d="M4 21V8h2.5V5h2v3h2V5h3v3h2V5h2v3H20v13zM10 21v-4a2 2 0 0 1 4 0v4M4 12h16" />,
  army: <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2" />,
  growth: <path d="M3 17l6-6 4 4 8-8M14 7h7v7" />,
  starTower: <path d="M8.5 21 10 11h4l1.5 10M6.5 21h11M12 2.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 8.5l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z" />,
  dungeon: <path d="M3 21V8l9-5 9 5v13M9 21v-5a3 3 0 0 1 6 0v5M3 11h18M2 21h20" />,
  intel: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" />,
  agent: (
    <>
      <path d="M12 3v3M5 7h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM9.5 16h5M2 12v3M22 12v3" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
    </>
  ),
  chat: <path d="M4 5h16v11H10l-5 4v-4H4z" />,
  gold: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 10h4v4h-4z" />
    </>
  ),
  wood: <path d="M12 3 6.5 10.5h3L5 17h14l-4.5-6.5h3zM12 17v4" />,
  food: <path d="M12 21V8M12 8c-2.8 0-4-1.8-4-4.5 2.8 0 4 1.8 4 4.5zM12 8c2.8 0 4-1.8 4-4.5-2.8 0-4 1.8-4 4.5zM12 14c-2.8 0-4-1.8-4-4 2.8 0 4 1.5 4 4zM12 14c2.8 0 4-1.8 4-4-2.8 0-4 1.5-4 4z" />,
  stone: <path d="M3.5 18.5 6.5 9 12 5l6 3 2.5 10.5zM6.5 9l5.5 3 6-4M12 12v6.5" />,
  iron: <path d="M3 18.5 6 11h12l3 7.5zM6.5 11l1.8-4.5h7.4l1.8 4.5" />,
  population: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a5.5 5.5 0 0 0-3.5-5.2" />
    </>
  ),
  empty: <path d="M3 13h5l1.5 3h5l1.5-3h5M5.5 5h13L21 13v6H3v-6z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

/** role 用的静态中文名 */
const ICON_ZH: Record<IconName, string> = {
  overview: '总览',
  map: '地图',
  city: '城池',
  army: '军队',
  growth: '养成',
  starTower: '将星塔',
  dungeon: '副本',
  intel: '情报',
  agent: 'Agent',
  chat: '聊天',
  gold: '金',
  wood: '木',
  food: '粮',
  stone: '石',
  iron: '铁',
  population: '人口',
  empty: '空',
};

interface IconProps {
  name: IconName;
  /** 像素边长，默认 16 */
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  return (
    <svg
      role={`图标-${ICON_ZH[name]}`}
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {PATHS[name]}
    </svg>
  );
}
