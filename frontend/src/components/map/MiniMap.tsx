/** 小地图（地图舞台右下角，可收起，开合记在本地；宽屏 132px 默认展开，较窄屏 104px 默认收起）：整张世界按比例缩成一个方块——
 *  白框 = 当前视野，绿点 = 本账号城池（主城大一圈），红点 = 本城在途行军的目标，金点 = 书签。
 *  点击 / 回车跳到对应坐标（居中视野，不改选中）。只用已知数据（城池列表、行军、本机书签），不额外请求整图。
 */

import type { MouseEvent } from 'react';
import type { MarchView } from '../../api/protocol';
import { useCopy } from '../../i18n/bundle';
import type { MapBookmark } from '../../state/mapBookmarks';
import type { CityRefView } from '../../api/protocol';
import { useStoredFlag } from '../../state/useStoredFlag';

const OPEN_KEY = 'slg.mapMiniOpen';
/** 宽屏（≥1536）默认展开；更窄时地图格子少、小地图会盖住一片，默认收起（玩家的开合选择记在本地，优先于默认） */
const WIDE_SCREEN_PX = 1536;

interface MiniMapProps {
  win: { x: number; y: number; w: number; h: number; size: number };
  cities: CityRefView[];
  marches: MarchView[];
  bookmarks: MapBookmark[];
  onJump: (x: number, y: number) => void;
}

export function MiniMap({ win, cities, marches, bookmarks, onJump }: MiniMapProps) {
  const { UX_COPY } = useCopy();
  const [open, setOpen] = useStoredFlag(OPEN_KEY, typeof window !== 'undefined' && window.innerWidth >= WIDE_SCREEN_PX);
  const pct = (v: number) => `${(v / win.size) * 100}%`;

  const jumpAt = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(win.size - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * win.size)));
    const y = Math.min(win.size - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * win.size)));
    onJump(x, y);
  };

  return (
    <div role="世界地图视图-小地图" className="absolute bottom-3 right-3.5 flex flex-col items-end gap-1 max-sm:hidden">
      {open ? (
        <button
          type="button"
          role="世界地图视图-小地图-画面"
          title={UX_COPY.map.minimapTitle}
          aria-label={UX_COPY.map.minimapTitle}
          onClick={jumpAt}
          className="relative h-[104px] w-[104px] cursor-crosshair overflow-hidden rounded-md border border-line bg-bg shadow-panel 2xl:h-[132px] 2xl:w-[132px]"
          style={{
            // 每 100 格一条淡网格线，帮助判断方位
            backgroundImage: 'linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)',
            backgroundSize: `${(100 / win.size) * 100}% ${(100 / win.size) * 100}%`,
          }}
        >
          {/* 标记层内缩 5px（= 最大标记半径）：贴着世界边缘的城点 / 视野框也完整落在框内 */}
          <span role="世界地图视图-小地图-标记层" className="absolute inset-[5px]">
            {/* 视野框：整图很大时视野只有几像素，按中心点画并保底 8px */}
            <span
              role="世界地图视图-小地图-视野框"
              className="absolute -translate-x-1/2 -translate-y-1/2 border border-fg/80 bg-fg/15"
              style={{
                left: pct(win.x + win.w / 2),
                top: pct(win.y + win.h / 2),
                width: `max(8px, ${pct(win.w)})`,
                height: `max(8px, ${pct(win.h)})`,
              }}
            />
            {marches.map((march) => (
              <i
                key={march.id}
                role="世界地图视图-小地图-行军目标"
                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warn"
                style={{ left: pct(march.x + 0.5), top: pct(march.y + 0.5) }}
              />
            ))}
            {bookmarks.map((item) => (
              <i
                key={`${item.x},${item.y}`}
                role="世界地图视图-小地图-书签"
                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold"
                style={{ left: pct(item.x + 0.5), top: pct(item.y + 0.5) }}
              />
            ))}
            {cities
              .filter((item) => item.x !== null && item.y !== null)
              .map((item) => (
                <i
                  key={item.id}
                  role="世界地图视图-小地图-城池"
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-bg bg-ok ${item.isMain ? 'h-2.5 w-2.5' : 'h-2 w-2'}`}
                  style={{ left: pct((item.x ?? 0) + 0.5), top: pct((item.y ?? 0) + 0.5) }}
                />
              ))}
          </span>
        </button>
      ) : null}
      <button
        type="button"
        role="世界地图视图-小地图开关"
        aria-pressed={open}
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer rounded border border-line-soft bg-panel/90 px-1.5 py-0.5 text-[10.5px] text-dim hover:text-fg"
      >
        {UX_COPY.map.minimap}
      </button>
    </div>
  );
}
