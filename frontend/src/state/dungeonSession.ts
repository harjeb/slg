// 副本与宝物会话切片（v61，虎牢关）：副本信息 / 出征 / 挑战记录分页，背包与宝物穿戴 / 卸下 / 出售，
// 以及 PUSH_DUNGEON_STATE 到达时的联动。从 useGameSession 拆出以控制单文件行数。
// 次数、人口、武将状态的权威判定在服务端；界面上的禁用只是预判，错误以服务端返回为准。

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../api/client';
import {
  Op,
  type DungeonRunView,
  type DungeonStatePushData,
  type DungeonView,
  type EnterDungeonResponseData,
  type GetDungeonReportsResponseData,
  type GetDungeonResponseData,
  type ItemView,
  type TroopKind,
} from '../api/protocol';
import { getCopy } from '../i18n/bundle';
import { tName } from '../i18n/names';
import type { Actor } from '../types';

const REPORTS_PAGE = 20;

interface DungeonSessionDeps {
  clientRef: { current: ApiClient | null };
  connected: boolean;
  appendLocalEvent: (actor: Actor, text: string) => void;
  scheduleSync: () => void;
  /** 宝物穿戴 / 结算经验后重拉武将（加成与 equipment 在 HeroView 上） */
  refreshHeroes: () => void;
}

export interface EnterDungeonInput {
  dungeonId: string;
  mainHeroId: string;
  deputyHeroIds: string[];
  troops: Partial<Record<TroopKind, number>>;
  retreatBelowPercent: number | null;
}

export interface DungeonSession {
  dungeons: DungeonView[] | null;
  reports: DungeonRunView[] | null;
  reportsHasMore: boolean;
  items: ItemView[] | null;
  error: string | null;
  busy: boolean;
  fetchDungeons: () => Promise<void>;
  fetchReports: (older?: boolean) => Promise<void>;
  fetchItems: () => Promise<void>;
  enter: (input: EnterDungeonInput) => Promise<boolean>;
  equip: (itemId: string, heroId: string) => Promise<boolean>;
  unequip: (itemId: string) => Promise<boolean>;
  sell: (itemId: string) => Promise<boolean>;
  onDungeonPush: (data: DungeonStatePushData) => void;
  clear: () => void;
}

/** 错误文案：优先本地化文案（按错误码），没有对应码时回退服务端文案 */
export function dungeonErrorText(code: string | undefined, message: string | undefined): string {
  const { DUNGEON_COPY } = getCopy();
  if (code && code in DUNGEON_COPY.errors) {
    return DUNGEON_COPY.errors[code as keyof typeof DUNGEON_COPY.errors];
  }
  return message ?? DUNGEON_COPY.session.failedFallback;
}

export function useDungeonSession(deps: DungeonSessionDeps): DungeonSession {
  const { clientRef, connected, appendLocalEvent, scheduleSync, refreshHeroes } = deps;
  const [dungeons, setDungeons] = useState<DungeonView[] | null>(null);
  const [reports, setReportsState] = useState<DungeonRunView[] | null>(null);
  const [reportsHasMore, setReportsHasMore] = useState(false);
  const [items, setItems] = useState<ItemView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 翻页读最后一条的 id：用 ref 避免 fetchReports 因列表变化而换身份
  const reportsRef = useRef<DungeonRunView[] | null>(null);
  const setReports = useCallback((next: DungeonRunView[] | null) => {
    reportsRef.current = next;
    setReportsState(next);
  }, []);

  const fetchDungeons = useCallback(async (): Promise<void> => {
    const client = clientRef.current;
    if (!client?.connected) {
      return;
    }
    try {
      const res = await client.request(Op.GET_DUNGEON, {});
      if (res.ok && res.data) {
        setDungeons((res.data as unknown as GetDungeonResponseData).dungeons);
      }
    } catch {
      // 拉取失败保留旧值，下次进入页面 / 重连再试
    }
  }, [clientRef]);

  const fetchReports = useCallback(
    async (older = false): Promise<void> => {
      const client = clientRef.current;
      if (!client?.connected) {
        return;
      }
      const prev = reportsRef.current;
      const last = older && prev && prev.length > 0 ? prev[prev.length - 1] : null;
      try {
        const res = await client.request(Op.GET_DUNGEON_REPORTS, { limit: REPORTS_PAGE, ...(last ? { beforeId: last.id } : {}) });
        if (res.ok && res.data) {
          const out = res.data as unknown as GetDungeonReportsResponseData;
          setReports(last && prev ? [...prev, ...out.reports] : out.reports);
          setReportsHasMore(out.hasMore);
        }
      } catch {
        // 拉取失败保留旧值
      }
    },
    [clientRef, setReports],
  );

  const fetchItems = useCallback(async (): Promise<void> => {
    const client = clientRef.current;
    if (!client?.connected) {
      return;
    }
    try {
      const res = await client.request(Op.GET_ITEMS, {});
      if (res.ok && res.data) {
        setItems((res.data as unknown as { items: ItemView[] }).items);
      }
    } catch {
      // 拉取失败保留旧值
    }
  }, [clientRef]);

  useEffect(() => {
    if (connected) {
      void fetchDungeons();
      void fetchItems();
    }
  }, [connected, fetchDungeons, fetchItems]);

  /** 发一个请求：busy / 错误文案统一处理；成功返回 data，失败返回 null */
  const run = useCallback(
    async (op: number, data: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
      const client = clientRef.current;
      if (!client?.connected || busy) {
        return null;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await client.request(op, data);
        if (res.ok) {
          return (res.data ?? {}) as Record<string, unknown>;
        }
        setError(dungeonErrorText(res.error?.code, res.error?.message));
        if (res.error?.code === 'ITEM_NOT_FOUND') {
          void fetchItems();
        }
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : getCopy().DUNGEON_COPY.session.failedFallback);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [clientRef, busy, fetchItems],
  );

  const enter = useCallback(
    async (input: EnterDungeonInput): Promise<boolean> => {
      const out = await run(Op.ENTER_DUNGEON, {
        dungeonId: input.dungeonId,
        mainHeroId: input.mainHeroId,
        deputyHeroIds: input.deputyHeroIds,
        troops: input.troops,
        ...(input.retreatBelowPercent !== null ? { retreatBelowPercent: input.retreatBelowPercent } : {}),
      });
      if (!out) {
        void fetchDungeons();
        return false;
      }
      const data = out as unknown as EnterDungeonResponseData;
      appendLocalEvent('player', getCopy().DUNGEON_COPY.session.entered(tName(data.run.dungeonName), data.attemptsLeft));
      // 驻军已扣、武将占用：对齐城池与武将；副本与记录重拉
      scheduleSync();
      refreshHeroes();
      void fetchDungeons();
      void fetchReports();
      return true;
    },
    [run, appendLocalEvent, scheduleSync, refreshHeroes, fetchDungeons, fetchReports],
  );

  const itemAction = useCallback(
    async (op: number, data: Record<string, unknown>, done: (out: Record<string, unknown>) => string): Promise<boolean> => {
      const out = await run(op, data);
      if (!out) {
        return false;
      }
      if (Array.isArray(out.items)) {
        setItems(out.items as ItemView[]);
      }
      appendLocalEvent('player', done(out));
      refreshHeroes();
      return true;
    },
    [run, appendLocalEvent, refreshHeroes],
  );

  const equip = useCallback(
    (itemId: string, heroId: string) => itemAction(Op.EQUIP_ITEM, { itemId, heroId }, () => getCopy().DUNGEON_COPY.session.equipped),
    [itemAction],
  );
  const unequip = useCallback(
    (itemId: string) => itemAction(Op.UNEQUIP_ITEM, { itemId }, () => getCopy().DUNGEON_COPY.session.unequipped),
    [itemAction],
  );
  const sell = useCallback(
    async (itemId: string) => {
      const ok = await itemAction(Op.SELL_ITEM, { itemId }, (out) => getCopy().DUNGEON_COPY.session.sold(Number(out.gold ?? 0)));
      if (ok) {
        scheduleSync();
      }
      return ok;
    },
    [itemAction, scheduleSync],
  );

  const onDungeonPush = useCallback(
    (data: DungeonStatePushData): void => {
      const { DUNGEON_COPY } = getCopy();
      const r = data.run;
      if (data.reason === 'resolved' && r.outcome) {
        appendLocalEvent('system', DUNGEON_COPY.session.resolved(tName(r.dungeonName), DUNGEON_COPY.reports.outcome[r.outcome], r.wavesWon ?? 0));
      }
      if (data.reason === 'resolved' && r.treasure) {
        appendLocalEvent('system', DUNGEON_COPY.session.gotTreasure(tName(r.treasure.name)));
      }
      // 资源已进出发城、宝物已进背包、武将得经验：全部对齐
      scheduleSync();
      refreshHeroes();
      void fetchDungeons();
      void fetchReports();
      void fetchItems();
    },
    [appendLocalEvent, scheduleSync, refreshHeroes, fetchDungeons, fetchReports, fetchItems],
  );

  const clear = useCallback((): void => {
    setDungeons(null);
    setReports(null);
    setReportsHasMore(false);
    setItems(null);
    setError(null);
    setBusy(false);
  }, [setReports]);

  return { dungeons, reports, reportsHasMore, items, error, busy, fetchDungeons, fetchReports, fetchItems, enter, equip, unequip, sell, onDungeonPush, clear };
}
