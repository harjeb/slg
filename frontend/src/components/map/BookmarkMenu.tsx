/** 地图书签下拉（工具条）：收藏 / 取消收藏当前选中地块，列出书签（点坐标跳转并选中，✕ 删除）。
 *  书签只存本机浏览器（state/mapBookmarks），书签处的地块现状以地图实时数据为准。
 */

import { useEffect, useRef, useState } from 'react';
import { useCopy } from '../../i18n/bundle';
import { tName } from '../../i18n/names';
import { BOOKMARK_LIMIT, type MapBookmarks } from '../../state/mapBookmarks';
import type { WorldSession } from '../../state/worldSession';
import { tileTitle } from '../worldMapTip';

interface BookmarkMenuProps {
  world: WorldSession;
  bookmarks: MapBookmarks;
  accountId: string | null;
  className: string;
}

export function BookmarkMenu({ world, bookmarks, accountId, className }: BookmarkMenuProps) {
  const { UX_COPY } = useCopy();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = world.selected;
  const selectedTile = selected ? world.window?.tiles.find((tile) => tile.x === selected.x && tile.y === selected.y) : undefined;
  const marked = selected !== null && bookmarks.has(selected.x, selected.y);

  // 点外面 / Esc 关闭
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleSelected = () => {
    if (!selected) {
      return;
    }
    const label = selectedTile
      ? selectedTile.kind === 'dungeon' && selectedTile.dungeon
        ? tName(selectedTile.dungeon.name)
        : tileTitle(selectedTile, selectedTile.owner?.accountId === accountId)
      : `(${selected.x}, ${selected.y})`;
    bookmarks.toggle({ x: selected.x, y: selected.y, label });
  };

  return (
    <div ref={rootRef} role="世界地图视图-书签" className="relative">
      <button
        type="button"
        role="世界地图视图-书签按钮"
        aria-haspopup="menu"
        aria-expanded={open}
        title={UX_COPY.map.bookmarksTitle}
        onClick={() => setOpen((prev) => !prev)}
        className={`${className} flex items-center gap-1 px-2 py-0.5`}
      >
        <span aria-hidden="true" className="text-gold">
          ★
        </span>
        {UX_COPY.map.bookmarks}
        {bookmarks.list.length > 0 ? <span className="font-mono text-[11px] text-faint">{bookmarks.list.length}</span> : null}
      </button>
      {open ? (
        <div role="世界地图视图-书签菜单" className="absolute left-0 top-[calc(100%+4px)] z-30 flex w-[260px] flex-col rounded-md border border-line bg-panel-2 p-1 shadow-2xl">
          <button
            type="button"
            role="世界地图视图-书签-收藏选中"
            disabled={selected === null}
            onClick={toggleSelected}
            className="w-full cursor-pointer truncate rounded px-2.5 py-1.5 text-left text-[12.5px] text-gold hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent"
          >
            {selected === null
              ? UX_COPY.map.bookmarkNeedSelect
              : marked
                ? UX_COPY.map.bookmarkRemoveSelected(selected.x, selected.y)
                : UX_COPY.map.bookmarkAdd(selected.x, selected.y)}
          </button>
          <div role="世界地图视图-书签列表" className="mt-1 flex flex-col border-t border-line-soft pt-1">
            {bookmarks.list.length === 0 ? (
              <p className="px-2.5 py-2 text-center text-[12px] text-faint">{UX_COPY.map.bookmarkEmpty}</p>
            ) : (
              bookmarks.list.map((item) => (
                <div key={`${item.x},${item.y}`} role="世界地图视图-书签条目" className="flex items-center gap-1 rounded hover:bg-accent-soft">
                  <button
                    type="button"
                    role="世界地图视图-书签条目-跳转"
                    onClick={() => {
                      world.centerOn(item.x, item.y);
                      world.selectTile(item.x, item.y);
                      setOpen(false);
                    }}
                    className="flex min-w-0 flex-1 cursor-pointer items-baseline gap-2 px-2.5 py-1 text-left text-[12.5px]"
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className="shrink-0 font-mono text-[11px] text-faint">
                      {item.x},{item.y}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="世界地图视图-书签条目-删除"
                    title={UX_COPY.map.bookmarkRemove}
                    aria-label={UX_COPY.map.bookmarkRemove}
                    onClick={() => bookmarks.remove(item.x, item.y)}
                    className="shrink-0 cursor-pointer px-2 text-[11px] text-faint hover:text-st-error"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="border-t border-line-soft px-2.5 pt-1 text-[10.5px] text-faint">{UX_COPY.map.bookmarkLimit(BOOKMARK_LIMIT)}</p>
        </div>
      ) : null}
    </div>
  );
}
