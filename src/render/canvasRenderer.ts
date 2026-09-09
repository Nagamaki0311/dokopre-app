import type { Asset, Block, LayoutResult, MarkerColor } from '../types';
import { SLIDE_H, SLIDE_W } from '../types';
import { resolveImagePlacement, resolveImageZ } from './imagePlacement';

const MARKER_COLORS: Record<MarkerColor, string> = {
  yellow: '#fff3a0',
  pink: '#ffd6e6',
  blue: '#cfe8ff',
};

const FONT_FAMILY = '"Noto Sans JP", sans-serif';
const TEXT_COLOR = '#1a1a1a';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    img.src = src;
  });
}

function drawText(ctx: CanvasRenderingContext2D, result: LayoutResult): void {
  for (const box of result.boxes) {
    ctx.font = `${box.weight} ${box.fontSize}px ${FONT_FAMILY}`;

    box.lines.forEach((rawLine, i) => {
      const line = rawLine || ' ';
      const lineTop = box.y + i * box.lineHeight;
      const width = ctx.measureText(line).width;
      let x = box.x;
      if (box.align === 'center') x = box.x + (box.w - width) / 2;
      else if (box.align === 'right') x = box.x + box.w - width;

      if (box.marker) {
        // SlideView.tsx の linear-gradient(transparent 60%, color 60%) と同じ、行下部40%をハイライトする
        const markerY = lineTop + box.lineHeight * 0.6;
        const markerH = box.lineHeight * 0.4;
        ctx.fillStyle = MARKER_COLORS[box.marker];
        ctx.fillRect(x, markerY, width, markerH);
      }

      const textTop = lineTop + (box.lineHeight - box.fontSize) / 2;
      const baseline = textTop + box.fontSize * 0.8;
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText(line, x, baseline);
    });
  }
}

async function drawImageBlock(ctx: CanvasRenderingContext2D, block: Extract<Block, { type: 'image' }>, assets: Asset[]): Promise<void> {
  const asset = assets.find((a) => a.id === block.assetId);
  if (!asset?.data) return;
  try {
    const img = await loadImage(asset.data);
    const placement = resolveImagePlacement(block.placement, asset);
    ctx.drawImage(img, placement.x, placement.y, placement.w, placement.h);
  } catch {
    // 画像読み込み失敗時はその画像を描画せず継続する
  }
}

/**
 * LayoutResult と画像ブロックを 1280x720 の Canvas に描画する。SlideView.tsx（DOMレンダラ）と視覚的に一致させるため、
 * テキストは LayoutBox の値をそのまま使い、画像は placement（スライド絶対座標）をそのまま使う。
 * z='back' の画像→テキスト→z='front' の画像 の順に重ねて描画し、SlideView.tsx のDOM順と同じ重なりにする（D-002）。
 * フォントは呼び出し側で `document.fonts.ready` 済みであることを前提とする。
 */
export async function drawLayout(
  ctx: CanvasRenderingContext2D,
  result: LayoutResult,
  assets: Asset[],
  blocks: Block[],
): Promise<void> {
  ctx.clearRect(0, 0, SLIDE_W, SLIDE_H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  ctx.textBaseline = 'alphabetic';

  const imageBlocks = blocks.filter((b): b is Extract<Block, { type: 'image' }> => b.type === 'image');
  const backImages = imageBlocks.filter((b) => resolveImageZ(b.placement) === 'back');
  const frontImages = imageBlocks.filter((b) => resolveImageZ(b.placement) === 'front');

  for (const block of backImages) {
    await drawImageBlock(ctx, block, assets);
  }

  drawText(ctx, result);

  for (const block of frontImages) {
    await drawImageBlock(ctx, block, assets);
  }
}
