import { useCallback, useEffect, useState } from 'react';

export type ScreenState =
  | { name: 'home' }
  | { name: 'editor'; deckId: string }
  | { name: 'present'; deckId: string; index: number };

function readState(): ScreenState {
  const state = window.history.state as ScreenState | null;
  return state ?? { name: 'home' };
}

/**
 * history.pushState ベースの最小限の画面遷移。ルーターライブラリは使わない。
 */
export function useScreen() {
  const [screen, setScreen] = useState<ScreenState>(() => readState());

  useEffect(() => {
    if (window.history.state === null) {
      window.history.replaceState({ name: 'home' } satisfies ScreenState, '');
    }
    const onPopState = () => setScreen(readState());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((next: ScreenState) => {
    window.history.pushState(next, '');
    setScreen(next);
  }, []);

  const replace = useCallback((next: ScreenState) => {
    window.history.replaceState(next, '');
    setScreen(next);
  }, []);

  const back = useCallback(() => {
    window.history.back();
  }, []);

  return { screen, navigate, replace, back };
}
