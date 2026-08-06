import type { BoxRole, LayoutBox, LayoutResult, LayoutWarning, Slide } from '../types';
import { analyze, type AnalyzedBlock } from './analyze';
import { selectTemplate, frames, type Rect } from './templates';
import { wrapText, type TextMeasurer } from './measure';

const MIN_FONT = 24;
const MAX_FONT = 96;
const LINE_HEIGHT_RATIO = 1.3;
const SHRUNK_FONT_WARNING_THRESHOLD = 32;
const STACK_GAP = 24;
const MAX_BULLETS = 6;
const MAX_STACK_ITEMS = 4;

type Assignment = {
  block: AnalyzedBlock;
  rect: Rect;
  role: BoxRole;
};

function stackRects(container: Rect, count: number, gap = STACK_GAP): Rect[] {
  if (count <= 0) return [];
  const totalGap = gap * (count - 1);
  const itemH = (container.h - totalGap) / count;
  const rects: Rect[] = [];
  for (let i = 0; i < count; i += 1) {
    rects.push({
      x: container.x,
      y: container.y + i * (itemH + gap),
      w: container.w,
      h: Math.max(itemH, 1),
      align: container.align,
    });
  }
  return rects;
}

function fitFont(
  text: string,
  rect: Rect,
  weight: number,
  measurer: TextMeasurer,
): { fontSize: number; lines: string[]; lineHeight: number; overflow: boolean } {
  let lo = MIN_FONT;
  let hi = MAX_FONT;
  let best = MIN_FONT;
  let bestLines = wrapText(text, rect.w, measurer, MIN_FONT, weight);

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const lines = wrapText(text, rect.w, measurer, mid, weight);
    const lineHeight = mid * LINE_HEIGHT_RATIO;
    const totalHeight = lines.length * lineHeight;

    if (totalHeight <= rect.h) {
      best = mid;
      bestLines = lines;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const minLineHeight = MIN_FONT * LINE_HEIGHT_RATIO;
  const minTotalHeight = bestLines.length * minLineHeight;
  const overflow = best === MIN_FONT && minTotalHeight > rect.h;

  return { fontSize: best, lines: bestLines, lineHeight: best * LINE_HEIGHT_RATIO, overflow };
}

function blockWeight(block: AnalyzedBlock, baseWeight: number): number {
  if (block.type === 'image') return baseWeight;
  if (block.emphasis || block.autoEmphasis) return 700;
  return baseWeight;
}

function buildBox(assignment: Assignment, measurer: TextMeasurer, warnings: LayoutWarning[]): LayoutBox | null {
  const { block, rect, role } = assignment;
  if (block.type === 'image') {
    return {
      blockId: block.id,
      role: 'image',
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      fontSize: 0,
      lineHeight: 0,
      weight: 400,
      align: rect.align,
      marker: null,
      lines: [],
    };
  }

  const baseWeight = role === 'heading' || role === 'statement' ? 700 : 400;
  const weight = blockWeight(block, baseWeight);
  const text = role === 'bullet' ? `・${block.text}` : block.text;
  const { fontSize, lines, lineHeight, overflow } = fitFont(text, rect, weight, measurer);

  if (fontSize <= SHRUNK_FONT_WARNING_THRESHOLD) {
    warnings.push({
      blockId: block.id,
      code: 'too-much-text',
      message: '文字量が多いため、フォントサイズが縮小されています。',
    });
  }
  if (overflow) {
    warnings.push({
      blockId: block.id,
      code: 'overflow',
      message: 'テキストが枠に収まりきっていません。文章を短くしてください。',
    });
  }

  return {
    blockId: block.id,
    role,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    fontSize,
    lineHeight,
    weight,
    align: rect.align,
    marker: block.marker ?? null,
    lines,
  };
}

function assign(template: ReturnType<typeof selectTemplate>, analyzed: AnalyzedBlock[], warnings: LayoutWarning[]): Assignment[] {
  const fs = frames(template);
  const heading = analyzed.find((b) => b.type === 'heading');
  const image = analyzed.find((b) => b.type === 'image');
  const rest = analyzed.filter((b) => b !== heading && b !== image);

  const assignments: Assignment[] = [];

  switch (template) {
    case 'title': {
      const block = heading ?? analyzed[0];
      if (block && fs.heading) assignments.push({ block, rect: fs.heading, role: 'heading' });
      break;
    }
    case 'statement': {
      const block = analyzed.find((b) => b.type !== 'image') ?? analyzed[0];
      if (block && fs.statement) assignments.push({ block, rect: fs.statement, role: 'statement' });
      break;
    }
    case 'bullets': {
      if (heading && fs.heading) assignments.push({ block: heading, rect: fs.heading, role: 'heading' });
      const items = rest;
      if (items.length > MAX_BULLETS) {
        warnings.push({
          code: 'too-many-blocks',
          message: `箇条書きが多すぎます（${items.length}件）。要点を絞ってください。`,
        });
      }
      if (fs.body && items.length > 0) {
        const rects = stackRects(fs.body, items.length);
        items.forEach((block, i) => {
          assignments.push({ block, rect: rects[i], role: block.type === 'bullet' ? 'bullet' : 'body' });
        });
      }
      break;
    }
    case 'twoColumn': {
      if (heading && fs.heading) assignments.push({ block: heading, rect: fs.heading, role: 'heading' });
      const [first, second] = rest;
      if (first && fs.left) assignments.push({ block: first, rect: fs.left, role: 'body' });
      if (second && fs.right) assignments.push({ block: second, rect: fs.right, role: 'body' });
      break;
    }
    case 'imageSide': {
      if (heading && fs.heading) assignments.push({ block: heading, rect: fs.heading, role: 'heading' });
      if (image && fs.image) assignments.push({ block: image, rect: fs.image, role: 'image' });
      const items = rest;
      if (items.length > MAX_STACK_ITEMS) {
        warnings.push({
          code: 'too-many-blocks',
          message: `テキストが多すぎます（${items.length}件）。要点を絞ってください。`,
        });
      }
      if (fs.body && items.length > 0) {
        const rects = stackRects(fs.body, items.length);
        items.forEach((block, i) => {
          assignments.push({ block, rect: rects[i], role: block.type === 'bullet' ? 'bullet' : 'body' });
        });
      }
      break;
    }
    default:
      break;
  }

  return assignments;
}

/**
 * スライドを 1280x720 の仮想座標系における絶対配置ボックス列にレイアウトする純粋関数。
 * DOM/Canvas いずれのレンダラもこの結果を描画するだけにし、レイアウト判断ロジックはここに集約する。
 */
export function layoutSlide(slide: Slide, measurer: TextMeasurer): LayoutResult {
  const analyzed = analyze(slide.blocks);
  const template = selectTemplate(analyzed, slide.layoutHint);
  const warnings: LayoutWarning[] = [];
  const assignments = assign(template, analyzed, warnings);

  const boxes: LayoutBox[] = [];
  for (const assignment of assignments) {
    const box = buildBox(assignment, measurer, warnings);
    if (box) boxes.push(box);
  }

  return { template, boxes, warnings };
}
