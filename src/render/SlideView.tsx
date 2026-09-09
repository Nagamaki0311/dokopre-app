import { useRef } from 'react';
import type { Asset, Block, ImagePlacement, LayoutResult, MarkerColor } from '../types';
import { SLIDE_H, SLIDE_W } from '../types';
import { resolveImagePlacement, resolveImageZ } from './imagePlacement';
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
  /** 画像はレイアウトボックスに含まれず、blocks から直接（絶対配置で）描画する */
  blocks: Block[];
  /** trueの場合、画像をドラッグで移動・ピンチで拡縮できるようにする（編集画面のプレビューのみで有効化） */
  editableImage?: boolean;
  onImagePlacementChange?: (blockId: string, placement: ImagePlacement) => void;
};

function TextBoxes({ result }: { result: LayoutResult }) {
  return (
    <>
      {result.boxes.map((box) => {
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
                <span style={markerStyle}>{line || ' '}</span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

export function SlideView({ result, assets, width, blocks, editableImage, onImagePlacementChange }: SlideViewProps) {
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

  const imageBlocks = blocks.filter((b): b is Extract<Block, { type: 'image' }> => b.type === 'image');

  // スライド切替・画像削除で使われなくなった画像のポインタ状態を捨てる
  const currentImageBlockIds = new Set(imageBlocks.map((b) => b.id));
  for (const blockId of panStates.current.keys()) {
    if (!currentImageBlockIds.has(blockId)) panStates.current.delete(blockId);
  }

  function renderImage(block: Extract<Block, { type: 'image' }>) {
    const asset = assets.find((a) => a.id === block.assetId);
    if (!asset?.data) return null;
    const placement = resolveImagePlacement(block.placement, asset);
    const panHandlers =
      editableImage && onImagePlacementChange
        ? createImagePanZoomHandlers(
            getPanState(block.id),
            placement,
            (next) => onImagePlacementChange(block.id, next),
            scale,
          )
        : undefined;

    return (
      <div
        key={block.id}
        className="slide-view__image"
        style={{
          left: placement.x,
          top: placement.y,
          width: placement.w,
          height: placement.h,
          touchAction: panHandlers ? 'none' : undefined,
        }}
        onPointerDown={panHandlers && ((e) => { e.stopPropagation(); panHandlers.onPointerDown(e); })}
        onPointerMove={panHandlers && ((e) => { e.stopPropagation(); panHandlers.onPointerMove(e); })}
        onPointerUp={panHandlers && ((e) => { e.stopPropagation(); panHandlers.onPointerUp(e); })}
        onPointerCancel={panHandlers && ((e) => { e.stopPropagation(); panHandlers.onPointerCancel(e); })}
      >
        <img src={asset.data} alt={block.alt} draggable={false} style={{ width: '100%', height: '100%' }} />
        {editableImage && <div className="slide-view__image-outline" />}
      </div>
    );
  }

  const backImages = imageBlocks.filter((b) => resolveImageZ(b.placement) === 'back');
  const frontImages = imageBlocks.filter((b) => resolveImageZ(b.placement) === 'front');

  return (
    <div className="slide-view" style={{ width, height }}>
      <div
        className="slide-view__stage"
        style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})` }}
      >
        {backImages.map(renderImage)}
        <TextBoxes result={result} />
        {frontImages.map(renderImage)}
      </div>
    </div>
  );
}
