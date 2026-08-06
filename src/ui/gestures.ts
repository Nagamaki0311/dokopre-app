import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const SWIPE_THRESHOLD_PX = 48;
const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;
const TAP_MOVE_TOLERANCE_PX = 10;

export type SwipeHandlers = {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
};

export type SwipeOptions = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
};

/** Pointer Events による単純なスワイプ検出。新規ライブラリは使わない。 */
export function useSwipe(options: SwipeOptions): SwipeHandlers {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = () => {
    // 現状は開始点のみで判定するため何もしない（将来ドラッグ追従が必要になれば拡張する）
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    start.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) options.onSwipeLeft?.();
      else options.onSwipeRight?.();
    } else {
      if (dy < 0) options.onSwipeUp?.();
      else options.onSwipeDown?.();
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}

export type LongPressHandlers = {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerLeave: (e: ReactPointerEvent) => void;
};

/** 長押し検出。移動が閾値を超えたらキャンセルする。 */
export function useLongPress(onLongPress: () => void, ms = LONG_PRESS_MS): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      onLongPress();
      clear();
    }, ms);
  };

  const onPointerUp = () => {
    clear();
  };

  const onPointerLeave = () => {
    clear();
  };

  return { onPointerDown, onPointerUp, onPointerLeave };
}

export type DoubleTapHandlers = {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
};

/** ダブルタップ検出。移動量が大きい場合はスワイプ扱いとしてタップにカウントしない。 */
export function useDoubleTap(onDoubleTap: () => void, ms = DOUBLE_TAP_MS): DoubleTapHandlers {
  const lastTap = useRef<number>(0);
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent) => {
    downPos.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = downPos.current;
    downPos.current = null;
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    if (dx > TAP_MOVE_TOLERANCE_PX || dy > TAP_MOVE_TOLERANCE_PX) return;

    const now = Date.now();
    if (now - lastTap.current <= ms) {
      lastTap.current = 0;
      onDoubleTap();
    } else {
      lastTap.current = now;
    }
  };

  return { onPointerDown, onPointerUp };
}
