// 侧栏城池下拉（从 Sidebar 拆出）：列出账号全部城池，点选切换。

import { useCopy } from '../../i18n/bundle';
import { tName } from '../../i18n/names';
import type { CityList } from '../../state/useCityList';

/** 城池下拉：全部城池（名字 / 等级 / 主城·分城 / 坐标），当前城打勾，底部给分城名额 */
export function CityMenu({ cityList, onChoose, className }: { cityList: CityList; onChoose: (cityId: string) => void; className: string }) {
  const copy = useCopy();
  const { CITY_COPY, NAV_COPY } = copy;
  const { cities, activeCityId, branch } = cityList;
  return (
    <div
      role="导航-城池下拉"
      className={`absolute z-30 flex min-w-[200px] max-w-[320px] flex-col rounded-md border border-line bg-panel-2 p-1 shadow-2xl ${className}`}
    >
      {cities.map((item) => {
        const active = item.id === activeCityId;
        return (
          <button
            key={item.id}
            type="button"
            role="城池下拉-城池"
            title={CITY_COPY.switcher.tabTitle(tName(item.name), item.level, item.x, item.y)}
            onClick={() => onChoose(item.id)}
            className={`flex cursor-pointer items-baseline justify-between gap-3 rounded px-2.5 py-1.5 text-left text-[12.5px] hover:bg-accent-soft ${
              active ? 'text-accent' : ''
            }`}
          >
            <span className="min-w-0 truncate">
              {active ? '✓ ' : ''}
              {tName(item.name)}{' '}
              <small className="text-faint">
                {CITY_COPY.switcher.levelTag(item.level)} · {item.isMain ? NAV_COPY.cityMain : NAV_COPY.cityBranch}
              </small>
            </span>
            <span className="shrink-0 font-mono text-[11px] text-faint">{item.x !== null && item.y !== null ? `${item.x},${item.y}` : ''}</span>
          </button>
        );
      })}
      {branch ? (
        <p role="城池下拉-分城名额" title={CITY_COPY.switcher.branchLocked(branch.minGovernment)} className="border-t border-line-soft px-2.5 pt-1 text-[11px] text-faint">
          {CITY_COPY.switcher.branchQuota(branch.count, branch.limit)}
        </p>
      ) : null}
    </div>
  );
}
