import type { Asset, Slide } from '../types';
import { SLIDE_H, SLIDE_W } from '../types';
import type { TextMeasurer } from '../layout/measure';
import { layoutSlide } from '../layout/layout';
import { drawLayout } from '../render/canvasRenderer';

/**
 * スライドをオフスクリーン Canvas に描画し PNG の Blob を返す。
 * レイアウト判断は layoutSlide（既存の自動レイアウトエンジン）に委譲し、Canvas側は描画のみ行う（D-002）。
 */
export async function exportSlideAsPng(slide: Slide, assets: Asset[], measurer: TextMeasurer): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const canvas = document.createElement('canvas');
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvasの初期化に失敗しました。この端末ではPNG出力を利用できません。');
  }

  const result = layoutSlide(slide, measurer);
  await drawLayout(ctx, result, assets, slide.blocks);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('PNGの生成に失敗しました。');
  }
  return blob;
}

/** Blob をファイルとしてダウンロードさせる（`<a download>` + Blob URL）。 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
