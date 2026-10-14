import type { HeroView, TroopKind } from '../../api/protocol';
import type { DungeonRulesView } from '../../api/protocol-dungeon';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 与服务端 dungeonBonus 对齐；兵种装备效果和特长不折算为全局加成。 */
export function dungeonPreview(main: HeroView, deputies: HeroView[], rules: DungeonRulesView, troops: Partial<Record<TroopKind, number>>) {
  const count = Object.values(troops).reduce((sum, n) => sum + Math.max(0, Math.floor(n ?? 0)), 0);
  const capacity = main.bonus.leadCap + deputies.reduce((sum, h) => sum + h.lead * rules.deputyLeadTroopsPerPoint, 0);
  const factor = count > 0 ? Math.min(1, capacity / count) : 1;
  const scale = Math.round(factor * 1000) / 1000;
  const mainBonus = (attr: number, equipment: number) => round1(round1(Math.min(20, attr * 0.3) * factor) + Math.min(10, equipment) * scale);
  const deputyBonus = (attr: 'force' | 'wit', effect: 'atkPercent' | 'defPercent') => round1(Math.min(rules.deputyCapPercent,
    deputies.reduce((sum, h) => sum + (Math.min(20, h[attr] * 0.3) + Math.min(10, h.equipment?.effect[effect] ?? 0)) * rules.deputyShare, 0)));
  return {
    capacity, scale,
    atkPercent: round1(mainBonus(main.force, main.equipment?.effect.atkPercent ?? 0) + deputyBonus('force', 'atkPercent')),
    defPercent: round1(mainBonus(main.wit, main.equipment?.effect.defPercent ?? 0) + deputyBonus('wit', 'defPercent')),
  };
}
