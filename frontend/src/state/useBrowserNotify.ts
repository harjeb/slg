// 浏览器系统通知（P2）：玩家在账号菜单里打开后，页面不在前台（标签页隐藏或窗口失焦）时，
// 建造升级完成 / 征兵完成 / 研究完成 / 部队到达或回城 / 敌军来袭各弹一条系统通知；点通知回到游戏窗口。
// 只比较前后两次状态快照推断「完成」（切换城池时重置快照，不误报）；开关存本机，权限由浏览器管理。

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BuildingKind, CityView, NpcAttackWarningPushData } from '../api/protocol';
import type { ResearchView } from '../api/protocol-tech';
import { getCopy } from '../i18n/bundle';

const STORAGE_KEY = 'slg.notify';
/** 到期时间与消失时刻的容差（毫秒）：队列项在到期前后这段时间里消失才算「完成」，提前消失视为取消 */
const DUE_SLACK_MS = 5000;

export type NotifyStatus = 'unsupported' | 'denied' | 'on' | 'off';

interface Snapshot {
  city: CityView | null;
  research: ResearchView | null;
  incoming: Set<string>;
}

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function dueReached(dueAt: string | null, now: number): boolean {
  return dueAt !== null && Date.parse(dueAt) <= now + DUE_SLACK_MS;
}

/** 前后两次快照之间发生的完成事件（通知正文） */
function diffEvents(prev: Snapshot, next: Snapshot, now: number): string[] {
  const { BUILDING_LABEL, TROOP_LABEL, TECH_COPY, UX_COPY } = getCopy();
  const C = UX_COPY.notify;
  const out: string[] = [];
  const before = prev.city;
  const after = next.city;
  if (before && after && before.id === after.id) {
    for (const kind of Object.keys(after.levels) as BuildingKind[]) {
      if ((after.levels[kind] ?? 0) > (before.levels[kind] ?? 0)) {
        out.push(C.buildDone(BUILDING_LABEL[kind].name, after.levels[kind]));
      }
    }
    for (const item of before.recruitQueue) {
      if (!after.recruitQueue.some((entry) => entry.id === item.id) && dueReached(item.dueAt, now)) {
        out.push(C.recruitDone(TROOP_LABEL[item.troop].name, item.count));
      }
    }
    for (const march of before.marches) {
      if (march.status !== 'marching') {
        continue;
      }
      const later = after.marches.find((entry) => entry.id === march.id);
      const done = later ? later.status !== 'marching' : dueReached(march.arriveAt, now);
      if (done) {
        out.push(march.purpose === 'return' ? C.marchReturned : C.marchArrived(march.x, march.y));
      }
    }
  }
  const research = prev.research;
  if (research && research.status === 'researching' && next.research?.id !== research.id && dueReached(research.dueAt, now)) {
    out.push(C.researchDone(TECH_COPY.names[research.tech], research.level));
  }
  return out;
}

export function useBrowserNotify(city: CityView | null, research: ResearchView | null, incoming: NpcAttackWarningPushData[]) {
  const [wanted, setWanted] = useState(readStored);
  const [permission, setPermission] = useState<NotificationPermission | null>(() => (supported() ? Notification.permission : null));
  const status: NotifyStatus = permission === null ? 'unsupported' : permission === 'denied' ? 'denied' : wanted && permission === 'granted' ? 'on' : 'off';
  const snapshot = useRef<Snapshot>({ city: null, research: null, incoming: new Set() });

  const toggle = useCallback(async () => {
    if (!supported()) {
      return;
    }
    let next = !wanted;
    if (next && Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      setPermission(result);
      next = result === 'granted';
    }
    setWanted(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // 存不上只影响下次打开
    }
  }, [wanted]);

  useEffect(() => {
    const now = Date.now();
    const next: Snapshot = { city, research, incoming: new Set(incoming.map((item) => item.attackId)) };
    const prev = snapshot.current;
    snapshot.current = next;
    if (status !== 'on' || (!document.hidden && document.hasFocus())) {
      return;
    }
    const { UX_COPY } = getCopy();
    const bodies = diffEvents(prev, next, now);
    for (const item of incoming) {
      if (!prev.incoming.has(item.attackId)) {
        bodies.push(UX_COPY.notify.incoming(item.x, item.y));
      }
    }
    for (const body of bodies) {
      try {
        const note = new Notification(document.title, { body, icon: '/favicon.svg' });
        note.onclick = () => {
          window.focus();
          note.close();
        };
      } catch {
        // 部分移动端浏览器只允许 Service Worker 发通知：静默放弃
      }
    }
  }, [city, research, incoming, status]);

  return { status, toggle };
}
