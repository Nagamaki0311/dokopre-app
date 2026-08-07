import type { AlignId, TemplateId } from '../types';
import type { AnalyzedBlock } from './analyze';
import { SLIDE_W, SLIDE_H } from '../types';

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  align: 'left' | 'center' | 'right';
};

export type FrameSet = {
  heading?: Rect;
  body?: Rect;
  statement?: Rect;
  left?: Rect;
  right?: Rect;
  image?: Rect;
};

const MARGIN = 96;
const STATEMENT_LONG_THRESHOLD = 40;

/**
 * ブロックの構成（数・文字量・画像有無）からテンプレートを選択する。
 * layoutHint が 'auto' 以外の場合はそちらを優先するため、この関数は hint === 'auto' のときにのみ呼ばれる想定。
 */
export function selectTemplate(analyzed: AnalyzedBlock[], hint: TemplateId | 'auto'): TemplateId {
  if (hint !== 'auto') return hint;

  const hasImage = analyzed.some((b) => b.type === 'image');
  const textBlocks = analyzed.filter((b) => b.type !== 'image');
  const bulletCount = analyzed.filter((b) => b.type === 'bullet').length;
  const nonHeadingNonImage = textBlocks.filter((b) => b.type !== 'heading');

  if (hasImage) return 'imageSide';
  if (bulletCount >= 2) return 'bullets';

  if (textBlocks.length === 1) {
    const only = textBlocks[0];
    const text = only.text;
    return text.length <= STATEMENT_LONG_THRESHOLD ? 'title' : 'statement';
  }

  if (nonHeadingNonImage.length === 2) return 'twoColumn';

  return 'bullets';
}

const CENTER_BOX_MAX_BULLETS = 2;

/**
 * テンプレートから整列軸候補 (AlignId) を判定ラダー形式で決定する。
 * 実測幅が必要な分岐（bullets の centerBox 候補）は「候補」を返すのみとし、
 * measurer を用いた最終確定（幅50%未満か等）は layout.ts 側で行う（本関数は measurer 非依存の純粋関数のまま）。
 * 'right' はどの分岐からも返さない（自動選択の対象外。将来拡張用に型のみ用意）。
 */
export function selectAlign(analyzed: AnalyzedBlock[], template: TemplateId): AlignId {
  if (template === 'imageSide') return 'left';
  if (template === 'twoColumn') return 'left';
  if (template === 'title') return 'center';

  if (template === 'statement') {
    const textBlocks = analyzed.filter((b) => b.type !== 'image');
    const single = textBlocks.length === 1 ? textBlocks[0] : undefined;
    if (single && !single.text.includes('\n')) return 'centerBox';
    return 'center';
  }

  if (template === 'bullets') {
    const items = analyzed.filter((b) => b.type !== 'heading' && b.type !== 'image');
    const hasNewline = items.some((b) => b.type !== 'image' && b.text.includes('\n'));
    if (items.length > 0 && items.length <= CENTER_BOX_MAX_BULLETS && !hasNewline) return 'centerBox';
    return 'left';
  }

  return 'left';
}

/**
 * テンプレートごとの配置枠（仮想座標 1280x720）を返す。
 * layout.ts はこの枠に対してブロックを割り当て、フォントサイズを決定する。
 */
export function frames(template: TemplateId): FrameSet {
  switch (template) {
    case 'title':
      return {
        heading: { x: MARGIN, y: 260, w: SLIDE_W - MARGIN * 2, h: 200, align: 'center' },
      };
    case 'statement':
      return {
        statement: { x: 140, y: 200, w: SLIDE_W - 280, h: 320, align: 'center' },
      };
    case 'bullets':
      return {
        heading: { x: MARGIN, y: 64, w: SLIDE_W - MARGIN * 2, h: 120, align: 'left' },
        body: { x: MARGIN, y: 220, w: SLIDE_W - MARGIN * 2, h: 440, align: 'left' },
      };
    case 'twoColumn':
      return {
        heading: { x: MARGIN, y: 64, w: SLIDE_W - MARGIN * 2, h: 120, align: 'left' },
        left: { x: MARGIN, y: 220, w: (SLIDE_W - MARGIN * 2 - 40) / 2, h: 440, align: 'left' },
        right: {
          x: MARGIN + (SLIDE_W - MARGIN * 2 - 40) / 2 + 40,
          y: 220,
          w: (SLIDE_W - MARGIN * 2 - 40) / 2,
          h: 440,
          align: 'left',
        },
      };
    case 'imageSide':
      return {
        heading: { x: 64, y: 56, w: SLIDE_W / 2 - 96, h: 100, align: 'left' },
        body: { x: 64, y: 180, w: SLIDE_W / 2 - 96, h: 480, align: 'left' },
        image: { x: SLIDE_W / 2 + 32, y: 56, w: SLIDE_W / 2 - 96, h: SLIDE_H - 112, align: 'center' },
      };
    default:
      return {};
  }
}
