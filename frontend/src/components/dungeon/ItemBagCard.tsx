// 背包卡（v61）：全部宝物（含装着的）；在背包里的可装备给武将或出售，装着的可卸下。
// 一将一个宝物槽：装备给已有宝物的武将时，原宝物回背包。随军 / 历练中的武将由服务端拒绝（HERO_BUSY / HERO_TRAINING）。

import { useCopy } from '../../i18n/bundle';
import { tName } from '../../i18n/names';
import type { HeroView, ItemView } from '../../api/protocol';
import type { DungeonSession } from '../../state/dungeonSession';
import { heroAtHome } from '../../state/heroSession';
import { Card } from '../ui/Card';

function ItemRow({ item, heroes, session }: { item: ItemView; heroes: HeroView[]; session: DungeonSession }) {
  const copy = useCopy();
  const C = copy.DUNGEON_COPY.items;
  const owner = item.heroId ? heroes.find((h) => h.id === item.heroId) : null;
  return (
    <li role={`副本页-背包-宝物-${item.id}`} className="flex flex-col gap-1 rounded-[5px] border border-line-soft bg-panel-2 px-2 py-1 text-[12px]">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-gold">{tName(item.name)}</span>
        <span className="text-[11px] text-faint">{C.category[item.category]}</span>
        <span className="text-[11px] text-dim">{C.effect(item.effect)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-dim">{owner ? C.equippedOn(tName(owner.name)) : C.inBag}</span>
        <select
          role="副本页-背包-装备给"
          value=""
          disabled={session.busy || Boolean(item.heroId && (!owner || !heroAtHome(owner)))}
          onChange={(e) => e.target.value && void session.equip(item.id, e.target.value)}
          className="ml-auto min-w-0 rounded border border-line bg-panel px-1 py-0.5 text-[11.5px]"
        >
          <option value="">{C.equipTo}</option>
          {heroes
            .filter((h) => h.id !== item.heroId)
            .map((h) => (
              <option key={h.id} value={h.id} disabled={!heroAtHome(h)}>
                {tName(h.name)}{h.equipment ? ` · ${tName(h.equipment.name)}` : ''}
              </option>
            ))}
        </select>
        {item.heroId ? (
          <button type="button" role="副本页-背包-卸下" className="btn" disabled={session.busy || !owner || !heroAtHome(owner)} onClick={() => void session.unequip(item.id)}>
            {C.unequip}
          </button>
        ) : (
          <button type="button" role="副本页-背包-出售" className="btn" disabled={session.busy} onClick={() => void session.sell(item.id)}>
            {C.sell(item.sellGold)}
          </button>
        )}
      </div>
    </li>
  );
}

export function ItemBagCard({ session, heroes }: { session: DungeonSession; heroes: HeroView[] }) {
  const copy = useCopy();
  const C = copy.DUNGEON_COPY.items;
  const { items } = session;
  return (
    <Card role="副本页-背包" title={C.title} meta={items ? String(items.length) : undefined}>
      {session.error ? <p role="副本页-背包-错误" className="shrink-0 text-[12px] text-warn">{session.error}</p> : null}
      {items && items.length === 0 ? <p className="text-[12px] text-faint">{C.empty}</p> : null}
      <ul role="副本页-背包-列表" className="flex min-h-0 flex-col gap-1 overflow-auto">
        {(items ?? []).map((item) => (
          <ItemRow key={item.id} item={item} heroes={heroes} session={session} />
        ))}
      </ul>
    </Card>
  );
}
