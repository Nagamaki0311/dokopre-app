import type { Block } from '../types';

const KEYWORDS = ['結論', '理由', '結果', '課題', 'まとめ', '提案', 'リスク', 'ポイント'];
const NUMERIC_UNIT_RE = /\d+(\.\d+)?\s*(%|％|円|年|月|日|人|件|個|回|kg|km|m|時間|分|秒)?/;

export type AnalyzedBlock = Block & {
  priority: number;
  /** キーワード・数値等から示唆される自動強調フラグ（ユーザー設定の emphasis とは別軸） */
  autoEmphasis: boolean;
};

function scoreText(text: string, isHeading: boolean): number {
  let score = isHeading ? 0.5 : 0.2;

  if (KEYWORDS.some((k) => text.includes(k))) score += 0.3;
  if (text.length > 0 && text.length <= 20) score += 0.2;
  if (NUMERIC_UNIT_RE.test(text)) score += 0.15;

  return Math.max(0, Math.min(1, score));
}

/**
 * 各ブロックに重要度 priority (0..1) と自動強調フラグを付与する。
 * ルールベースのみで判定し、外部APIは使用しない。
 */
export function analyze(blocks: Block[]): AnalyzedBlock[] {
  return blocks.map((block) => {
    if (block.type === 'image') {
      return { ...block, priority: 0.4, autoEmphasis: false };
    }
    const priority = scoreText(block.text, block.type === 'heading');
    const autoEmphasis = priority >= 0.65 || KEYWORDS.some((k) => block.text.includes(k));
    return { ...block, priority, autoEmphasis };
  });
}
