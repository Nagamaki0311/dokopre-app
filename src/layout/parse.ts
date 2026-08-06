import type { Block, TextBlock } from '../types';
import { genId } from './id';

const BULLET_MARKERS = ['・', '-', '*', '●', '▪', '•'];

function stripBulletMarker(line: string): string | null {
  const trimmed = line.trimStart();
  for (const marker of BULLET_MARKERS) {
    if (trimmed.startsWith(marker)) {
      return trimmed.slice(marker.length).trimStart();
    }
  }
  return null;
}

function isBulletLine(line: string): boolean {
  return stripBulletMarker(line) !== null;
}

/**
 * raw のテキストをブロック列へ変換する。
 * - 1行目（先頭の空でない行）は見出し候補として type: 'heading' になる
 * - 見出し以降は空行区切りの段落に分割し、箇条書き記号（・-*●▪•）を持つ行は type: 'bullet' に、
 *   それ以外の段落は type: 'text' としてまとめる
 */
export function parseText(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  let firstNonEmptyIdx = lines.findIndex((l) => l.trim() !== '');
  if (firstNonEmptyIdx === -1) return [];

  const blocks: TextBlock[] = [];
  const headingLine = lines[firstNonEmptyIdx].trim();
  blocks.push({ id: genId('block'), type: 'heading', text: headingLine });

  let rest = lines.slice(firstNonEmptyIdx + 1);
  if (rest.length > 0 && rest[0].trim() === '') rest = rest.slice(1);

  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const line of rest) {
    if (line.trim() === '') {
      if (current.length > 0) {
        paragraphs.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) paragraphs.push(current);

  for (const paragraph of paragraphs) {
    const bulletLines = paragraph.filter((l) => isBulletLine(l));
    if (bulletLines.length > 0) {
      for (const line of paragraph) {
        if (!isBulletLine(line)) continue;
        const text = stripBulletMarker(line) ?? line.trim();
        blocks.push({ id: genId('block'), type: 'bullet', text });
      }
    } else {
      const text = paragraph.map((l) => l.trim()).join('\n');
      blocks.push({ id: genId('block'), type: 'text', text });
    }
  }

  return blocks;
}

/**
 * 再パースで生成された新しいブロック列に、内容が一致する旧ブロックの marker/emphasis を引き継ぐ。
 * id はテキスト編集のたびに再生成されるため、type+text の一致で対応付ける（簡易的な近似）。
 * 画像ブロックはテキストから再生成できないため、旧ブロックのものをそのまま末尾に残す。
 */
export function mergeBlocks(oldBlocks: Block[], newTextBlocks: Block[]): Block[] {
  const pool = oldBlocks.filter((b): b is TextBlock => b.type !== 'image').slice();

  const merged = newTextBlocks.map((nb) => {
    if (nb.type === 'image') return nb;
    const idx = pool.findIndex((ob) => ob.type === nb.type && ob.text === nb.text);
    if (idx >= 0) {
      const ob = pool[idx];
      pool.splice(idx, 1);
      return { ...nb, marker: ob.marker, emphasis: ob.emphasis };
    }
    return nb;
  });

  const images = oldBlocks.filter((b) => b.type === 'image');
  return [...merged, ...images];
}

export type BlockRange = { blockId: string; start: number; end: number };

/**
 * ブロック列を編集用テキストへ復元し、各ブロックが対応するテキスト中の文字範囲も返す
 * （parseText の逆変換。範囲は textarea 上の選択範囲とブロックを対応付けるために使う）。
 */
export function blocksToTextWithRanges(blocks: Block[]): { text: string; ranges: BlockRange[] } {
  const textBlocks = blocks.filter((b): b is TextBlock => b.type !== 'image');
  if (textBlocks.length === 0) return { text: '', ranges: [] };

  let out = '';
  const ranges: BlockRange[] = [];

  textBlocks.forEach((block, i) => {
    if (i > 0) {
      const prev = textBlocks[i - 1];
      const sameBulletGroup = block.type === 'bullet' && prev.type === 'bullet';
      out += sameBulletGroup ? '\n' : '\n\n';
    }
    const start = out.length;
    out += block.type === 'bullet' ? `・${block.text}` : block.text;
    ranges.push({ blockId: block.id, start, end: out.length });
  });

  return { text: out, ranges };
}

/**
 * ブロック列を編集用テキストへ復元する（parseText の逆変換）。
 */
export function blocksToText(blocks: Block[]): string {
  return blocksToTextWithRanges(blocks).text;
}
