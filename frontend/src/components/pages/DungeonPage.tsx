/** 副本页（v61，虎牢关）：关卡（6 波敌军与奖励）、出征编成、挑战记录、背包。
 *  桌面四栏（1024–1279 两栏两行）；手机用分段条。 */

import { useEffect } from 'react';
import { useCopy } from '../../i18n/bundle';
import { useGame } from '../../state/GameContext';
import { DungeonInfoCard } from '../dungeon/DungeonInfoCard';
import { DungeonLineupCard } from '../dungeon/DungeonLineupCard';
import { DungeonReportsCard } from '../dungeon/DungeonReportsCard';
import { ItemBagCard } from '../dungeon/ItemBagCard';
import { PageGrid } from './PageGrid';

export function DungeonPage() {
  const copy = useCopy();
  const T = copy.DUNGEON_COPY.tabs;
  const { session } = useGame();
  const dungeonSession = session.dungeonSession;
  const { fetchDungeons, fetchReports, fetchItems } = dungeonSession;
  const heroes = session.heroSession.state?.heroes ?? [];
  const dungeon = dungeonSession.dungeons?.[0] ?? null;

  // 进入页面时拉一次：次数按北京日刷新，武将状态与宝物可能在别处变化
  useEffect(() => {
    void fetchDungeons();
    void fetchReports();
    void fetchItems();
  }, [fetchDungeons, fetchReports, fetchItems]);

  return (
    <PageGrid
      role="副本页"
      layout="p-dungeon"
      blocks={[
        { key: 'info', label: '关卡', tab: T.info, areaClass: 'a-dungeon-info', node: <DungeonInfoCard dungeon={dungeon} /> },
        {
          key: 'lineup',
          label: '出征',
          tab: T.lineup,
          areaClass: 'a-dungeon-lineup',
          node: <DungeonLineupCard dungeon={dungeon} session={dungeonSession} heroes={heroes} city={session.city} />,
        },
        { key: 'reports', label: '战报', tab: T.reports, areaClass: 'a-dungeon-reports', node: <DungeonReportsCard session={dungeonSession} /> },
        { key: 'items', label: '背包', tab: T.items, areaClass: 'a-dungeon-items', node: <ItemBagCard session={dungeonSession} heroes={heroes} /> },
      ]}
    />
  );
}
