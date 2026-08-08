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

export type ImageTransform = { scale: number; offsetX: number; offsetY: number };

export type ImagePanZoomState = {
  pointers: Map<number, { x: number; y: number }>;
  prevDistance: number | null;
};

export function createImagePanZoomState(): ImagePanZoomState {
  return { pointers: new Map(), prevDistance: null };
}

const MIN_IMAGE_SCALE = 0.3;
const MAX_IMAGE_SCALE = 5;

function pointerDistance(pointers: Map<number, { x: number; y: number }>): number {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 1本指ドラッグで移動、2本指ピンチで拡縮するポインタハンドラを作る。新規ライブラリは使わない。
 * state は呼び出し側（画像1枚につき1つ）が保持し、複数画像・複数レンダリング間で使い回さないこと。
 */
export type ImagePanZoomHandlers = SwipeHandlers & {
  onPointerCancel: (e: ReactPointerEvent) => void;
};

export function createImagePanZoomHandlers(
  state: ImagePanZoomState,
  transform: ImageTransform,
  onChange: (next: ImageTransform) => void,
  previewScale: number,
): ImagePanZoomHandlers {
  const onPointerDown = (e: ReactPointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    state.prevDistance = state.pointers.size === 2 ? pointerDistance(state.pointers) : null;
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!state.pointers.has(e.pointerId)) return;
    const prev = state.pointers.get(e.pointerId)!;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.pointers.size === 2) {
      const distance = pointerDistance(state.pointers);
      if (state.prevDistance) {
        const scale = Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, transform.scale * (distance / state.prevDistance)));
        onChange({ ...transform, scale });
      }
      state.prevDistance = distance;
      return;
    }

    const dx = (e.clientX - prev.x) / previewScale;
    const dy = (e.clientY - prev.y) / previewScale;
    onChange({ ...transform, offsetX: transform.offsetX + dx, offsetY: transform.offsetY + dy });
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    state.pointers.delete(e.pointerId);
    state.prevDistance = state.pointers.size === 2 ? pointerDistance(state.pointers) : null;
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
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
