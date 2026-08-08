import type { ImageTransform, LayoutBox } from '../types';

export const DEFAULT_IMAGE_TRANSFORM: ImageTransform = { scale: 1, offsetX: 0, offsetY: 0 };

export type ImageRect = { x: number; y: number; w: number; h: number };

/**
 * 画像の実際の描画矩形を求める。比率を保ったまま box に収めた状態（object-fit: contain 相当）を基準に、
 * transform の scale・offset を重ねる。自動クロップ・比率変更は行わない（box をはみ出た分は呼び出し側で
 * overflow: hidden によりクリップされる想定）。SlideView.tsx（DOM）とcanvasRenderer.ts（Canvas）で共有する。
 */
export function computeImageRect(
  asset: { width: number; height: number },
  box: Pick<LayoutBox, 'x' | 'y' | 'w' | 'h'>,
  transform: ImageTransform = DEFAULT_IMAGE_TRANSFORM,
): ImageRect {
  const boxRatio = box.w / box.h;
  const imgRatio = asset.width / asset.height;
  const containW = imgRatio > boxRatio ? box.w : box.h * imgRatio;
  const containH = imgRatio > boxRatio ? box.w / imgRatio : box.h;

  const w = containW * transform.scale;
  const h = containH * transform.scale;
  const x = box.x + (box.w - w) / 2 + transform.offsetX;
  const y = box.y + (box.h - h) / 2 + transform.offsetY;

  return { x, y, w, h };
}
