// 地图选中副本入口（v61，kind='dungeon'）时的说明块：普通出征不能打这里，出征走副本页（ENTER_DUNGEON）。

import { useCopy } from '../../i18n/bundle';
import { tName } from '../../i18n/names';
import { useNav } from '../../state/NavContext';
import type { TileDetailView } from '../../api/protocol';

export function DungeonTargetNote({ detail }: { detail: TileDetailView }) {
  const copy = useCopy();
  const C = copy.DUNGEON_COPY.map;
  const { go } = useNav();
  const name = detail.dungeon ? tName(detail.dungeon.name) : copy.TILE_KIND_LABEL.dungeon;
  return (
    <div role="选中详情-副本入口" className="flex shrink-0 flex-col gap-1.5 rounded-[5px] border border-gold/50 bg-panel-2 px-2 py-1.5 text-[12px]">
      <p className="font-semibold text-gold">{name}</p>
      <p className="text-dim">{C.note}</p>
      <button type="button" role="选中详情-副本入口-前往" className="btn" onClick={() => go('dungeon')}>
        {C.go}
      </button>
    </div>
  );
}
