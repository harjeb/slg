// 副本关卡卡（v61）：入口、今日次数、规则、6 波敌军（兵种 / 敌将 / 城墙 / 资源）、通关奖励与宝物池。数据全部来自 GET_DUNGEON。

import { useCopy } from '../../i18n/bundle';
import { tName } from '../../i18n/names';
import type { DungeonView } from '../../api/protocol';
import { Card } from '../ui/Card';
import { armyText, resourceText } from './format';

export function DungeonInfoCard({ dungeon }: { dungeon: DungeonView | null }) {
  const copy = useCopy();
  const C = copy.DUNGEON_COPY.info;
  if (!dungeon) {
    return (
      <Card role="副本页-关卡" title={copy.DUNGEON_COPY.nav}>
        <p className="text-[12px] text-faint">{C.loading}</p>
      </Card>
    );
  }
  return (
    <Card
      role="副本页-关卡"
      title={tName(dungeon.name)}
      meta={
        <span role="副本页-关卡-次数" className="font-mono text-[12px] text-accent">
          {C.attempts(dungeon.attemptsLeft, dungeon.rules.dailyAttempts)}
        </span>
      }
    >
      <div role="副本页-关卡-概况" className="flex shrink-0 flex-col gap-0.5 text-[11.5px]">
        <span className="text-dim">{C.location(dungeon.x, dungeon.y)}</span>
        <span className={dungeon.firstClearedAt ? 'text-dim' : 'font-semibold text-gold'}>
          {dungeon.firstClearedAt ? C.firstClearDone(dungeon.clears) : C.firstClearPending}
        </span>
        {dungeon.active ? <span role="副本页-关卡-进行中" className="text-warn">{C.active}</span> : null}
        <p role="副本页-关卡-规则" className="text-faint">{C.rules(dungeon.rules)}</p>
        <p role="副本页-关卡-副将规则" className="text-faint">{C.deputyRule(dungeon.rules.deputyShare, dungeon.rules.deputyCapPercent)}</p>
      </div>
      <ol role="副本页-关卡-波次" className="flex min-h-0 flex-col gap-1 overflow-auto">
        {dungeon.waves.map((wave) => (
          <li key={wave.wave} role={`副本页-关卡-第${wave.wave}波`} className="rounded-[5px] border border-line-soft bg-panel-2 px-2 py-1 text-[11.5px]">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono font-semibold text-accent">{C.wave(wave.wave)}</span>
              <span className="font-semibold">{tName(wave.name)}</span>
              {wave.siege ? <span className="text-warn">{C.siege(wave.wallDefensePercent)}</span> : null}
            </div>
            <p className="text-dim">{C.general(tName(wave.general.name), wave.general.atkPercent, wave.general.defPercent)} · {copy.DUNGEON_COPY.lineup.stats(wave.general.lead, wave.general.force, wave.general.wit)}</p>
            <p className="break-words">{armyText(wave.troops, copy.TROOP_LABEL)}</p>
            <p className="text-faint">{C.reward}：{resourceText(wave.reward, copy.RESOURCE_LABEL)}</p>
          </li>
        ))}
      </ol>
      <div role="副本页-关卡-奖励" className="flex shrink-0 flex-col gap-0.5 text-[11.5px]">
        <p className="text-dim">{C.clearReward}：{resourceText(dungeon.clearReward, copy.RESOURCE_LABEL)}</p>
        <p className="text-dim">
          {C.treasures}：{dungeon.treasures.map((t) => `${tName(t.name)}（${copy.DUNGEON_COPY.items.effect(t.effect)}）`).join('、')}
        </p>
      </div>
    </Card>
  );
}
