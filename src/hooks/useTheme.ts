import { useCallback, useEffect, useState } from 'react';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export type ThemeId = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'dokopre.theme';
const ORDER: ThemeId[] = ['system', 'light', 'dark'];

/**
 * localStorageからテーマ設定を読み出す。破損値・アクセス不可（プライベートモード等）は
 * 'system'にフォールバックし、クラッシュしない（D-003）。
 */
export function readTheme(): ThemeId {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'system' || value === 'light' || value === 'dark') {
      return value;
    }
  } catch {
    // アクセス不可（プライベートモード等）はメモリ内動作のみで継続
  }
  return 'system';
}

function writeTheme(theme: ThemeId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 保存できなくても表示自体は継続する
  }
}

function resolveResolved(theme: ThemeId): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

async function syncSystemBars(resolved: 'light' | 'dark'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemBars.setStyle({ style: resolved === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
  } catch {
    // ステータスバー配色の同期に失敗してもUI表示自体は継続する
  }
}

/**
 * `document.documentElement.dataset.theme`に解決済みテーマ('light'|'dark')を反映する。
 * 全CSSが`var(--bg)`等の変数参照のため、この属性書き換えだけで全画面へ即時反映される（D-003）。
 */
export function applyTheme(theme: ThemeId): void {
  const resolved = resolveResolved(theme);
  document.documentElement.dataset.theme = resolved;
  void syncSystemBars(resolved);
}

/**
 * Reactマウント前に1回呼び、初回描画時の色フラッシュを防ぐ。
 */
export function initTheme(): ThemeId {
  const theme = readTheme();
  applyTheme(theme);
  return theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    writeTheme(next);
    setThemeState(next);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      writeTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, cycleTheme };
}
