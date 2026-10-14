// 副本页共用的展示拼装：部队、资源、人口（人口规则与后端 dungeon.ts 的 armyPopulation 一致：铁骑 / 床弩 3、冲车 5、辎重车 / 后勤兵 6，其余 1）。

import { TROOP_KINDS, type Resources, type TroopKind } from '../../api/protocol';

type Army = Partial<Record<TroopKind, number>>;

export const TROOP_POP: Record<TroopKind, number> = {
  porter: 1,
  militia: 1,
  scout: 1,
  pikeman: 1,
  swordsman: 1,
  archer: 1,
  cavalry: 1,
  iron_cavalry: 3,
  supply_wagon: 6,
  ballista: 3,
  siege_ram: 5,
  medic: 6,
};

export function armyPopulation(army: Army): number {
  return TROOP_KINDS.reduce((sum, kind) => sum + Math.max(0, Math.floor(army[kind] ?? 0)) * TROOP_POP[kind], 0);
}

/** 战斗兵人口（不含民夫、辎重车、后勤兵） */
export function combatPopulation(army: Army): number {
  return armyPopulation({ ...army, porter: 0, supply_wagon: 0, medic: 0 });
}

export function armyText(army: Army | null | undefined, labels: Record<TroopKind, { name: string }>): string {
  if (!army) {
    return '—';
  }
  const parts = TROOP_KINDS.filter((kind) => (army[kind] ?? 0) > 0).map((kind) => `${labels[kind].name} ${army[kind]}`);
  return parts.length ? parts.join(' · ') : '—';
}

export function resourceText(res: Resources | null | undefined, labels: Record<keyof Resources, string>): string {
  if (!res) {
    return '—';
  }
  return (Object.keys(labels) as Array<keyof Resources>)
    .filter((key) => res[key] > 0)
    .map((key) => `${labels[key]} ${res[key]}`)
    .join(' · ');
}
