import type { ImagePlacement } from '../types';
import { SLIDE_H, SLIDE_W } from '../types';

const DEFAULT_MAX_W_RATIO = 0.42;
const DEFAULT_MAX_H_RATIO = 0.55;

/**
 * 画像追加時の初期配置。スライド中央に、縦横比を保ったまま程よい大きさ（スライドの一部を占める程度）で配置する。
 * 自動テキストレイアウトとは無関係の固定値のみで決まり、テキストブロックの内容・配置には一切依存しない。
 */
export function defaultImagePlacement(asset: { width: number; height: number }): ImagePlacement {
  const maxW = SLIDE_W * DEFAULT_MAX_W_RATIO;
  const maxH = SLIDE_H * DEFAULT_MAX_H_RATIO;
  const ratio = Math.min(maxW / asset.width, maxH / asset.height, 1);
  const w = asset.width * ratio;
  const h = asset.height * ratio;
  return { x: (SLIDE_W - w) / 2, y: (SLIDE_H - h) / 2, w, h, z: 'front' };
}

/** placement未設定・不正時は 'front' 扱いとする（アセット寸法を必要としないためz判定専用に用意） */
export function resolveImageZ(placement: Pick<ImagePlacement, 'z'> | undefined): 'front' | 'back' {
  return placement?.z === 'back' ? 'back' : 'front';
}

/** 保存データが欠損・不正（NaN等）な場合に描画が壊れないよう、安全な配置にフォールバックする。 */
export function resolveImagePlacement(
  placement: ImagePlacement | undefined,
  asset: { width: number; height: number },
): ImagePlacement {
  if (
    placement &&
    Number.isFinite(placement.x) &&
    Number.isFinite(placement.y) &&
    Number.isFinite(placement.w) &&
    Number.isFinite(placement.h) &&
    placement.w > 0 &&
    placement.h > 0 &&
    (placement.z === 'front' || placement.z === 'back')
  ) {
    return placement;
  }
  return defaultImagePlacement(asset);
}
