/** 世界地图叠加层（SVG，盖在格子网格上、随拖曳一起平移，不接收指针事件）：
 *  - 领地边界：同一账号的城池与占领野地连成一片，只在与外人 / 空地相邻的边上描线（本方强调色、他方警示色）；
 *    视野边缘外的邻格不知道归属，不描；「我的领地」图层关闭时不描本方。
 *  - 行军路线：本城在途部队从出发点到目标点的虚线 + 按时间推进的部队位置点（返程反向）；只画直线示意，实际到达以服务端为准。
 *  - 书签：收藏过的坐标在格子顶部打一个金色小点。
 *  坐标用百分比（格 → 视野宽高的比例），不随格子宽高比变形；网格 3px 间距带来的偏差在 1.5px 以内。
 */

import type { MarchView, TileView, WorldMapResponseData } from '../../api/protocol';
import type { MapBookmark } from '../../state/mapBookmarks';

export interface RouteMarch {
  march: MarchView;
  /** 出发城坐标（城池列表里查不到坐标的不画） */
  from: { x: number; y: number };
}

interface MapOverlayProps {
  win: WorldMapResponseData;
  accountId: string | null;
  showMine: boolean;
  marches: RouteMarch[];
  bookmarks: MapBookmark[];
  now: number;
}

/** 行军用途 → 路线颜色：进攻类警示色、运送类金色、侦察 / 返程弱化色，其余强调色 */
const ROUTE_TONE: Partial<Record<MarchView['purpose'], string>> = {
  plunder: 'var(--warn)',
  occupy: 'var(--warn)',
  attack: 'var(--warn)',
  intercept: 'var(--warn)',
  dungeon: 'var(--warn)',
  transport: 'var(--gold)',
  transfer: 'var(--gold)',
  reinforce: 'var(--gold)',
  scout: 'var(--text-dim)',
  return: 'var(--text-dim)',
};

const NEIGHBORS: Array<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

interface Edge {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mine: boolean;
}

/** 地块归属键：有主的城池 / 野地按账号区分，其余（空地、NPC、副本）为 null */
function ownerKey(tile: TileView | undefined): string | null {
  if (!tile || !tile.owner || (tile.kind !== 'city' && tile.kind !== 'wilderness')) {
    return null;
  }
  return tile.owner.accountId;
}

/** 领地边界线段（视野内格坐标，单位 = 格） */
export function territoryEdges(win: WorldMapResponseData, accountId: string | null, showMine: boolean): Edge[] {
  const at = new Map(win.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]));
  const edges: Edge[] = [];
  for (const tile of win.tiles) {
    const owner = ownerKey(tile);
    const mine = owner !== null && owner === accountId;
    if (owner === null || (mine && !showMine)) {
      continue;
    }
    const lx = tile.x - win.x;
    const ly = tile.y - win.y;
    NEIGHBORS.forEach(([dx, dy], side) => {
      const nx = tile.x + dx;
      const ny = tile.y + dy;
      // 视野外的邻格归属未知：不描（边界在视野边缘被裁掉即可）
      if (nx < win.x || ny < win.y || nx >= win.x + win.w || ny >= win.y + win.h) {
        return;
      }
      if (ownerKey(at.get(`${nx},${ny}`)) === owner) {
        return;
      }
      // side：0 上 1 右 2 下 3 左 → 该格对应的一条边
      const [x1, y1, x2, y2] = [
        [lx, ly, lx + 1, ly],
        [lx + 1, ly, lx + 1, ly + 1],
        [lx, ly + 1, lx + 1, ly + 1],
        [lx, ly, lx, ly + 1],
      ][side];
      edges.push({ key: `${tile.x},${tile.y},${side}`, x1, y1, x2, y2, mine });
    });
  }
  return edges;
}

export function MapOverlay({ win, accountId, showMine, marches, bookmarks, now }: MapOverlayProps) {
  const px = (gx: number) => `${(gx / win.w) * 100}%`;
  const py = (gy: number) => `${(gy / win.h) * 100}%`;
  const edges = territoryEdges(win, accountId, showMine);
  const inView = (x: number, y: number) => x >= win.x && y >= win.y && x < win.x + win.w && y < win.y + win.h;

  return (
    <svg role="世界地图视野-叠加层" aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-hidden">
      <g role="世界地图视野-领地边界" strokeLinecap="square">
        {edges.map((edge) => (
          <line
            key={edge.key}
            x1={px(edge.x1)}
            y1={py(edge.y1)}
            x2={px(edge.x2)}
            y2={py(edge.y2)}
            stroke={edge.mine ? 'var(--accent)' : 'var(--warn)'}
            strokeWidth={2}
            strokeOpacity={0.85}
          />
        ))}
      </g>
      <g role="世界地图视野-行军路线">
        {marches.map(({ march, from }) => {
          const back = march.purpose === 'return';
          const start = back ? { x: march.x, y: march.y } : from;
          const end = back ? from : { x: march.x, y: march.y };
          const total = Date.parse(march.arriveAt) - Date.parse(march.startedAt);
          const progress = total > 0 ? Math.min(1, Math.max(0, (now - Date.parse(march.startedAt)) / total)) : 1;
          const sx = start.x - win.x + 0.5;
          const sy = start.y - win.y + 0.5;
          const ex = end.x - win.x + 0.5;
          const ey = end.y - win.y + 0.5;
          const hx = sx + (ex - sx) * progress;
          const hy = sy + (ey - sy) * progress;
          const tone = ROUTE_TONE[march.purpose] ?? 'var(--accent)';
          return (
            <g key={march.id} role={`世界地图视野-行军路线-${march.purpose}`}>
              <line x1={px(sx)} y1={py(sy)} x2={px(ex)} y2={py(ey)} stroke={tone} strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.7} />
              <line x1={px(sx)} y1={py(sy)} x2={px(hx)} y2={py(hy)} stroke={tone} strokeWidth={2.5} strokeOpacity={0.9} />
              <circle cx={px(ex)} cy={py(ey)} r={5} fill="none" stroke={tone} strokeWidth={1.5} />
              <circle cx={px(hx)} cy={py(hy)} r={4.5} fill={tone} stroke="var(--bg)" strokeWidth={1.5} />
            </g>
          );
        })}
      </g>
      <g role="世界地图视野-书签">
        {bookmarks
          .filter((item) => inView(item.x, item.y))
          .map((item) => (
            <circle
              key={`${item.x},${item.y}`}
              cx={px(item.x - win.x + 0.5)}
              cy={py(item.y - win.y + 0.14)}
              r={3.5}
              fill="var(--gold)"
              stroke="var(--bg)"
              strokeWidth={1.5}
            />
          ))}
      </g>
    </svg>
  );
}
