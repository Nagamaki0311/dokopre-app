import { useEffect, useState } from 'react';

/**
 * document.fonts.ready を待つ。未ロード状態で文字計測すると発表時に見た目がズレるため、
 * レイアウト計算はこのフラグが true になってから行う。
 */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(() => typeof document === 'undefined' || document.fonts?.status === 'loaded');

  useEffect(() => {
    if (ready) return;
    if (typeof document === 'undefined' || !document.fonts) {
      setReady(true);
      return;
    }
    document.fonts.ready.then(() => setReady(true));
  }, [ready]);

  return ready;
}
