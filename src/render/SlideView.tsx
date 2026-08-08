import { useRef } from 'react';
import type { Asset, Block, ImageTransform, LayoutResult, MarkerColor } from '../types';
import { SLIDE_H, SLIDE_W } from '../types';
import { computeImageRect, DEFAULT_IMAGE_TRANSFORM } from './imageTransform';
import { createImagePanZoomHandlers, createImagePanZoomState, type ImagePanZoomState } from '../ui/gestures';

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
  /** trueの場合、画像をドラッグで移動・ピンチで拡縮できるようにする（編集画面のプレビューのみで有効化） */
  editableImage?: boolean;
  onImageTransformChange?: (blockId: string, transform: ImageTransform) => void;
};

export function SlideView({ result, assets, width, blocks, editableImage, onImageTransformChange }: SlideViewProps) {
  const scale = width / SLIDE_W;
  const height = width * (SLIDE_H / SLIDE_W);
  const panStates = useRef(new Map<string, ImagePanZoomState>());

  function getPanState(blockId: string): ImagePanZoomState {
    let state = panStates.current.get(blockId);
    if (!state) {
      state = createImagePanZoomState();
      panStates.current.set(blockId, state);
    }
    return state;
  }

  return (
    <div className="slide-view" style={{ width, height }}>
      <div
        className="slide-view__stage"
        style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})` }}
      >
        {result.boxes.map((box) => {
          if (box.role === 'image') {
            const block = blocks.find((b) => b.id === box.blockId);
            const imageBlock = block && block.type === 'image' ? block : undefined;
            const alt = imageBlock?.alt ?? '';
            const asset = assets.find((a) => a.id === imageBlock?.assetId);
            const transform = imageBlock?.transform ?? DEFAULT_IMAGE_TRANSFORM;
            const rect = asset ? computeImageRect(asset, box, transform) : null;
            const panHandlers =
              editableImage && onImageTransformChange
                ? createImagePanZoomHandlers(
                    getPanState(box.blockId),
                    transform,
                    (next) => onImageTransformChange(box.blockId, next),
                    scale,
                  )
                : undefined;

            return (
              <div
                key={box.blockId}
                className="slide-view__image"
                style={{ left: box.x, top: box.y, width: box.w, height: box.h, touchAction: panHandlers ? 'none' : undefined }}
                onPointerDown={panHandlers && ((e) => { e.stopPropagation(); panHandlers.onPointerDown(e); })}
                onPointerMove={panHandlers && ((e) => { e.stopPropagation(); panHandlers.onPointerMove(e); })}
                onPointerUp={panHandlers && ((e) => { e.stopPropagation(); panHandlers.onPointerUp(e); })}
              >
                {asset?.data && rect ? (
                  <img
                    src={asset.data}
                    alt={alt}
                    draggable={false}
                    style={{ position: 'absolute', left: rect.x - box.x, top: rect.y - box.y, width: rect.w, height: rect.h }}
                  />
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
