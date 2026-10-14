// 副本挑战记录卡（v61）：每次挑战的结果、资源 / 宝物 / 经验、返程兵力；展开看每一波的双方兵力、损失、救回与生效加成。

import { useCopy } from '../../i18n/bundle';
import { tName } from '../../i18n/names';
import type { DungeonRunView } from '../../api/protocol';
import type { DungeonSession } from '../../state/dungeonSession';
import { Card } from '../ui/Card';
import { armyText, resourceText } from './format';

function RunItem({ run }: { run: DungeonRunView }) {
  const copy = useCopy();
  const R = copy.DUNGEON_COPY.reports;
  const status = run.status === 'resolved' && run.outcome ? R.outcome[run.outcome] : R.outcome[run.status === 'cancelled' ? 'cancelled' : 'marching'];
  const tone = run.outcome === 'cleared' ? 'text-ok' : run.outcome === 'defeated' ? 'text-warn' : 'text-dim';
  return (
    <li role={`副本页-战报-记录-${run.id}`} className="rounded-[5px] border border-line-soft bg-panel-2 px-2 py-1 text-[11.5px]">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-2">
          <span className={`font-semibold ${tone}`}>{status}</span>
          {run.wavesWon !== null ? <span className="text-dim">{R.waves(run.wavesWon)}</span> : null}
          {run.firstClear ? <span className="font-semibold text-gold">{R.firstClear}</span> : null}
          {run.treasure ? <span className="text-gold">{R.treasure(tName(run.treasure.name))}</span> : null}
          <span className="ml-auto font-mono text-[10.5px] text-faint">{new Date(run.createdAt).toLocaleString()}</span>
        </summary>
        <div role="副本页-战报-详情" className="flex flex-col gap-0.5 pt-1">
          <p className="text-dim">{run.heroes.map((h) => `${h.role === 'main' ? copy.DUNGEON_COPY.lineup.main : copy.DUNGEON_COPY.lineup.deputyShort} ${tName(h.name)}`).join(' · ')}</p>
          {run.rewards ? <p>{resourceText(run.rewards, copy.RESOURCE_LABEL)}</p> : null}
          {run.heroExp ? <p className="text-dim">{R.exp(run.heroExp)}</p> : null}
          {run.returning ? (
            <p>
              {R.returning}：{armyText(run.returning, copy.TROOP_LABEL)}
              {run.woundedReturned && Object.values(run.woundedReturned).some((count) => (count ?? 0) > 0) ? <span className="text-faint">（{R.wounded} {armyText(run.woundedReturned, copy.TROOP_LABEL)}）</span> : null}
            </p>
          ) : null}
          {(run.waves ?? []).map((wave) => (
            <div key={wave.wave} role={`副本页-战报-第${wave.wave}波`} className="border-t border-line-soft pt-0.5">
              <p className="flex flex-wrap gap-x-2">
                <span className={wave.won ? 'text-ok' : 'text-warn'}>{copy.DUNGEON_COPY.info.wave(wave.wave)} {tName(wave.name)}</span>
                <span className="text-faint">{R.bonus(wave.bonus.mainAtkPercent, wave.bonus.mainDefPercent, wave.bonus.deputyAtkPercent, wave.bonus.deputyDefPercent)}</span>
              </p>
              <p>{R.rounds(wave.rounds)}</p>
              <p>{R.initial}：{armyText(wave.troops, copy.TROOP_LABEL)}</p>
              <p>{R.survivors}：{armyText(wave.survivors, copy.TROOP_LABEL)}</p>
              <p>{R.enemyLosses}：{armyText(wave.enemyLosses, copy.TROOP_LABEL)}</p>
              <p>{R.losses}：{armyText(wave.losses, copy.TROOP_LABEL)}</p>
              {Object.keys(wave.healed).length ? <p className="text-ok">{R.healed}：{armyText(wave.healed, copy.TROOP_LABEL)}</p> : null}
              <p className="text-faint">{R.enemy}：{armyText(wave.enemyTroops, copy.TROOP_LABEL)}</p>
            </div>
          ))}
        </div>
      </details>
    </li>
  );
}

export function DungeonReportsCard({ session }: { session: DungeonSession }) {
  const copy = useCopy();
  const R = copy.DUNGEON_COPY.reports;
  const { reports, reportsHasMore, fetchReports } = session;
  return (
    <Card role="副本页-战报" title={R.title}>
      {reports && reports.length === 0 ? <p className="text-[12px] text-faint">{R.empty}</p> : null}
      <ul role="副本页-战报-列表" className="flex min-h-0 flex-col gap-1 overflow-auto">
        {(reports ?? []).map((run) => (
          <RunItem key={run.id} run={run} />
        ))}
      </ul>
      {reportsHasMore ? (
        <button type="button" role="副本页-战报-更多" className="btn shrink-0" onClick={() => void fetchReports(true)}>
          {R.more}
        </button>
      ) : null}
    </Card>
  );
}
