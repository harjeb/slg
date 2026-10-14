// 副本出征卡（v61）：选主将 + 最多 2 名副将、从当前城驻军里配兵（人口实时计数，每行「全部」在人口上限内填满）、可选撤退线，然后出征。
// 按钮禁用只是预判（次数 / 进行中 / 人口 / 武将状态），权威校验在服务端（ENTER_DUNGEON 的错误码）。

import { useMemo, useState } from 'react';
import { useCopy } from '../../i18n/bundle';
import { tName } from '../../i18n/names';
import { TROOP_KINDS, type CityView, type DungeonView, type HeroView, type TroopKind } from '../../api/protocol';
import type { DungeonSession } from '../../state/dungeonSession';
import { heroAtHome } from '../../state/heroSession';
import { useNav } from '../../state/NavContext';
import { Card } from '../ui/Card';
import { dungeonPreview } from './preview';
import { TROOP_POP, armyPopulation, combatPopulation } from './format';

interface Props {
  dungeon: DungeonView | null;
  session: DungeonSession;
  heroes: HeroView[];
  city: CityView | null;
}

/** 武将能否出征（与服务端 checkHeroMarchable 同口径的预判）：在家且不欠饷、不重伤 */
function heroHome(hero: HeroView, now: number): boolean {
  return heroAtHome(hero) && !hero.arrears && !(hero.woundedUntil && Date.parse(hero.woundedUntil) > now);
}

export function DungeonLineupCard({ dungeon, session, heroes, city }: Props) {
  const copy = useCopy();
  const C = copy.DUNGEON_COPY.lineup;
  const { go } = useNav();
  const [mainId, setMainId] = useState('');
  const [deputies, setDeputies] = useState<[string, string]>(['', '']);
  const [troops, setTroops] = useState<Partial<Record<TroopKind, number>>>({});
  const [retreat, setRetreat] = useState('');
  const now = Date.now();
  const army = city?.army;
  const kinds = useMemo(() => TROOP_KINDS.filter((kind) => (army?.[kind] ?? 0) > 0 || (troops[kind] ?? 0) > 0), [army, troops]);
  const pop = armyPopulation(troops);
  const limit = dungeon?.rules.popLimit ?? 0;
  const main = heroes.find((h) => h.id === mainId);
  const selectedDeputies = heroes.filter((h) => deputies.includes(h.id));
  const preview = main && dungeon ? dungeonPreview(main, selectedDeputies, dungeon.rules, troops) : null;
  const chosen = [mainId, ...deputies].filter(Boolean);
  const retreatValue = retreat.trim() === '' ? null : Number(retreat);
  const retreatOk = retreatValue === null || (Number.isInteger(retreatValue) && retreatValue >= 1 && retreatValue <= 99);

  const blocker = !dungeon
    ? copy.DUNGEON_COPY.info.notPlaced
    : dungeon.attemptsLeft <= 0
      ? C.noAttempts
      : dungeon.active
        ? C.inProgress
        : !mainId
          ? C.needMain
          : combatPopulation(troops) <= 0
            ? C.needTroops
            : pop > limit
              ? C.overPop
              : null;

  const heroOption = (hero: HeroView, taken: boolean) => (
    <option key={hero.id} value={hero.id} disabled={taken || !heroHome(hero, now)}>
      {`${tName(hero.name)} · ${C.stats(hero.lead, hero.force, hero.wit)}${hero.equipment ? ` · ${tName(hero.equipment.name)}` : ''}${heroHome(hero, now) ? '' : ` ${C.busyHero}`}`}
    </option>
  );

  const submit = async () => {
    if (!dungeon || blocker || !retreatOk) {
      return;
    }
    const ok = await session.enter({
      dungeonId: dungeon.id,
      mainHeroId: mainId,
      deputyHeroIds: deputies.filter(Boolean),
      troops,
      retreatBelowPercent: retreatValue,
    });
    if (ok) {
      setTroops({});
    }
  };

  return (
    <Card role="副本页-出征" title={C.troops} meta={<span role="副本页-出征-人口" className={`font-mono text-[12px] ${pop > limit ? 'text-warn' : 'text-accent'}`}>{C.pop(pop, limit)}</span>}>
      <div role="副本页-出征-武将" className="flex shrink-0 flex-col gap-1 text-[12px]">
        <label className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-dim">{C.main}</span>
          <select role="副本页-出征-主将" value={mainId} onChange={(e) => setMainId(e.target.value)} className="min-w-0 flex-1 rounded border border-line bg-panel px-1 py-0.5">
            <option value="">{C.pick}</option>
            {heroes.map((hero) => heroOption(hero, deputies.includes(hero.id)))}
          </select>
        </label>
        {[0, 1].map((slot) => (
          <label key={slot} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-dim">{C.deputy(slot + 1)}</span>
            <select
              role={`副本页-出征-副将${slot + 1}`}
              value={deputies[slot]}
              onChange={(e) => setDeputies((prev) => (slot === 0 ? [e.target.value, prev[1]] : [prev[0], e.target.value]))}
              className="min-w-0 flex-1 rounded border border-line bg-panel px-1 py-0.5"
            >
              <option value="">{C.none}</option>
              {heroes.map((hero) => heroOption(hero, hero.id === mainId || deputies[1 - slot] === hero.id))}
            </select>
          </label>
        ))}
      </div>
      {heroes.length === 0 ? (
        <p role="副本页-出征-无武将" className="flex shrink-0 items-center justify-between gap-2 text-[11.5px] text-warn">
          <span className="min-w-0 truncate">{copy.ARENA_COPY.panel.noHeroes}</span>
          <button type="button" role="副本页-出征-去招募" className="btn shrink-0 px-2 py-0.5 text-[11px]" onClick={() => go('growth')}>
            {copy.UX_COPY.lineup.goRecruit}
          </button>
        </p>
      ) : null}
      {preview ? <div role="副本页-出征-加成预览" className="shrink-0 text-[11.5px] text-dim">
        <p>{C.preview(preview.atkPercent, preview.defPercent, preview.capacity, preview.scale)}</p>
        <p className="text-faint">{C.previewNote}</p>
      </div> : null}
      <ul role="副本页-出征-部队" className="flex min-h-0 flex-col gap-0.5 overflow-auto text-[12px]">
        {kinds.map((kind) => (
          <li key={kind} role={`副本页-出征-兵种-${kind}`} className="flex items-center gap-2">
            <span className="w-14 shrink-0">{copy.TROOP_LABEL[kind].name}</span>
            <input
              type="number"
              min={0}
              max={army?.[kind] ?? 0}
              value={troops[kind] ?? ''}
              onChange={(e) => {
                const n = Math.max(0, Math.min(army?.[kind] ?? 0, Math.floor(Number(e.target.value) || 0)));
                setTroops((prev) => ({ ...prev, [kind]: n }));
              }}
              className="w-20 rounded border border-line bg-panel px-1 py-0.5 font-mono"
            />
            <button
              type="button"
              role={`副本页-出征-兵种-${kind}-全部`}
              title={copy.UX_COPY.fill.allTitle}
              className="btn shrink-0 px-1.5 py-0 text-[11px]"
              onClick={() => {
                const others = pop - Math.max(0, Math.floor(troops[kind] ?? 0)) * TROOP_POP[kind];
                const room = Math.max(0, Math.floor((limit - others) / TROOP_POP[kind]));
                setTroops((prev) => ({ ...prev, [kind]: Math.min(army?.[kind] ?? 0, room) }));
              }}
            >
              {copy.UX_COPY.fill.all}
            </button>
            <span className="text-[11px] text-faint">{C.stock(army?.[kind] ?? 0)}</span>
          </li>
        ))}
      </ul>
      <label role="副本页-出征-撤退" className="flex shrink-0 items-center gap-2 text-[11.5px] text-dim">
        <input
          type="number"
          min={1}
          max={99}
          value={retreat}
          onChange={(e) => setRetreat(e.target.value)}
          className={`w-14 rounded border bg-panel px-1 py-0.5 font-mono ${retreatOk ? 'border-line' : 'border-warn'}`}
        />
        <span className="min-w-0">{C.retreat}</span>
      </label>
      {/* 按钮为什么不能点要一直说明：还没开始配置时用弱化色，配置过程中用警示色 */}
      {blocker ? <p role="副本页-出征-提示" className={`shrink-0 truncate text-[12px] ${chosen.length > 0 ? 'text-warn' : 'text-faint'}`}>{blocker}</p> : null}
      {session.error ? (
        <p role="副本页-出征-错误" className="shrink-0 truncate text-[12px] text-warn" title={session.error}>
          {session.error}
        </p>
      ) : null}
      <button type="button" role="副本页-出征-按钮" className="btn btn-primary w-full shrink-0 py-1.5 text-[12.5px]" disabled={Boolean(blocker) || !retreatOk || session.busy} onClick={() => void submit()}>
        {session.busy ? C.entering : C.enter}
      </button>
    </Card>
  );
}
