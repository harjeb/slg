// 页面快捷键（P2）：数字键 1–9 按侧栏顺序切到对应页面（页面少于 9 个时多出的数字键不响应）。
// 正在输入（输入框 / 下拉 / 可编辑区域）、按着 Ctrl / ⌘ / Alt、或有弹窗打开时不响应，避免误切页。

import { useEffect } from 'react';
import { PAGE_KEYS, type PageKey } from './usePage';

/** 页面 → 快捷键（侧栏悬停提示用） */
export function shortcutKey(page: PageKey): string {
  return String(PAGE_KEYS.indexOf(page) + 1);
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function useNavShortcuts(go: (page: PageKey) => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || isTyping(event.target)) {
        return;
      }
      if (document.querySelector('[aria-modal="true"]')) {
        return;
      }
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < PAGE_KEYS.length) {
        event.preventDefault();
        go(PAGE_KEYS[index]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);
}
