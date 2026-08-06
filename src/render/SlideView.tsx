import type { Asset, Block, LayoutResult, MarkerColor } from '../types';
import { SLIDE_H, SLIDE_W } from '../types';

const MARKER_COLORS: Record<MarkerColor, string> = {
  yellow: '#fff3a0',
  pink: '#ffd6e6',
  blue: '#cfe8ff',
};

export type SlideViewProps = {
  result: LayoutResult;
  assets: Asset[];
  width: number;
  /** LayoutBox.blockId から画像ブロックの assetId を解決するために必要（block.id !== assetId のため） */
  blocks: Block[];
};

export function SlideView({ result, assets, width, blocks }: SlideViewProps) {
  const scale = width / SLIDE_W;
  const height = width * (SLIDE_H / SLIDE_W);

  return (
    <div className="slide-view" style={{ width, height }}>
      <div
        className="slide-view__stage"
        style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})` }}
      >
        {result.boxes.map((box) => {
          if (box.role === 'image') {
            const block = blocks.find((b) => b.id === box.blockId);
            const assetId = block && block.type === 'image' ? block.assetId : undefined;
            const asset = assets.find((a) => a.id === assetId);
            return (
              <div
                key={box.blockId}
                className="slide-view__image"
                style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
              >
                {asset?.data ? (
                  <img src={asset.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
              </div>
            );
          }

          const markerStyle = box.marker
            ? {
                background: `linear-gradient(transparent 60%, ${MARKER_COLORS[box.marker]} 60%)`,
                display: 'inline',
                boxDecorationBreak: 'clone' as const,
                WebkitBoxDecorationBreak: 'clone' as const,
              }
            : undefined;

          return (
            <div
              key={box.blockId}
              className="slide-view__box"
              style={{
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
                fontSize: box.fontSize,
                lineHeight: `${box.lineHeight}px`,
                fontWeight: box.weight,
                textAlign: box.align,
              }}
            >
              {box.lines.map((line, i) => (
                <div key={i} className="slide-view__line">
                  <span style={markerStyle}>{line || ' '}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
