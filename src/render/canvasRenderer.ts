import type { Asset, Block, LayoutResult, MarkerColor } from '../types';
import { SLIDE_H, SLIDE_W } from '../types';

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

/** object-fit: cover 相当のソース矩形を計算して描画する（SlideView.tsx の <img style objectFit: 'cover'> と一致させる）。 */
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const imageRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imageRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * LayoutResult を 1280x720 の Canvas に描画する。SlideView.tsx（DOMレンダラ）と視覚的に一致させるため
 * LayoutBox の値をそのまま使い、フォントサイズ決定・配置等のレイアウト判断は一切行わない（D-002）。
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

  for (const box of result.boxes) {
    if (box.role === 'image') {
      const block = blocks.find((b) => b.id === box.blockId);
      const assetId = block && block.type === 'image' ? block.assetId : undefined;
      const asset = assets.find((a) => a.id === assetId);
      if (asset?.data) {
        try {
          const img = await loadImage(asset.data);
          drawImageCover(ctx, img, box.x, box.y, box.w, box.h);
        } catch {
          // 画像読み込み失敗時はその画像枠を空欄のまま描画継続する
        }
      }
      continue;
    }

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
