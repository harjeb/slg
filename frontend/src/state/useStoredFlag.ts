// 记在 localStorage 的界面开关（图例 / 黄巾浮卡 / 小地图的开合等）：读写失败时退回默认值，只影响本次会话。

import { useCallback, useState } from 'react';

export function useStoredFlag(key: string, fallback: boolean): [boolean, (update: (prev: boolean) => boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : raw === '1';
    } catch {
      return fallback;
    }
  });
  const update = useCallback(
    (fn: (prev: boolean) => boolean) =>
      setValue((prev) => {
        const next = fn(prev);
        try {
          window.localStorage.setItem(key, next ? '1' : '0');
        } catch {
          // 记忆失败不影响本次开合
        }
        return next;
      }),
    [key],
  );
  return [value, update];
}
