// 地图书签：玩家在本机收藏的坐标（存 localStorage，不上服务端、不跨设备同步）。
// 只记坐标与收藏时看到的名字；书签处的地块现状以地图实时数据为准。

import { useCallback, useState } from 'react';

export interface MapBookmark {
  x: number;
  y: number;
  /** 收藏时的地块名（城名 / 地形 + 等级），只作列表展示 */
  label: string;
}

const STORAGE_KEY = 'slg.mapBookmarks';
/** 书签上限：超出时挤掉最早的一条（12 条刚好放进下拉菜单，不出滚动条） */
export const BOOKMARK_LIMIT = 12;

function readBookmarks(): MapBookmark[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) {
      return [];
    }
    return list
      .filter((item): item is MapBookmark => typeof item?.x === 'number' && typeof item?.y === 'number' && typeof item?.label === 'string')
      .slice(0, BOOKMARK_LIMIT);
  } catch {
    return [];
  }
}

function writeBookmarks(list: MapBookmark[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 存不上只影响下次打开，本次列表照常
  }
}

export interface MapBookmarks {
  list: MapBookmark[];
  has: (x: number, y: number) => boolean;
  /** 已收藏则移除，否则加到最前 */
  toggle: (bookmark: MapBookmark) => void;
  remove: (x: number, y: number) => void;
}

export function useMapBookmarks(): MapBookmarks {
  const [list, setList] = useState<MapBookmark[]>(readBookmarks);
  const update = useCallback((fn: (prev: MapBookmark[]) => MapBookmark[]) => {
    setList((prev) => {
      const next = fn(prev);
      writeBookmarks(next);
      return next;
    });
  }, []);
  const has = useCallback((x: number, y: number) => list.some((item) => item.x === x && item.y === y), [list]);
  const toggle = useCallback(
    (bookmark: MapBookmark) =>
      update((prev) =>
        prev.some((item) => item.x === bookmark.x && item.y === bookmark.y)
          ? prev.filter((item) => item.x !== bookmark.x || item.y !== bookmark.y)
          : [bookmark, ...prev].slice(0, BOOKMARK_LIMIT),
      ),
    [update],
  );
  const remove = useCallback((x: number, y: number) => update((prev) => prev.filter((item) => item.x !== x || item.y !== y)), [update]);
  return { list, has, toggle, remove };
}
