import type { Slide, TextBlock } from '../types';

const KEYWORDS = ['結論', '理由', '結果', '課題', 'まとめ', '提案', 'リスク', 'ポイント'];
const NUMERIC_UNIT_RE = /\d+(\.\d+)?\s*(%|％|円|年|月|日|人|件|個|回|kg|km|m|時間|分|秒)?/;

const SENTENCE_IDEAL_MIN = 8;
const SENTENCE_IDEAL_MAX = 60;

/** 漢字(CJK統合漢字)のUnicode範囲。読みやすさの概算に使う。 */
const KANJI_RE = /[一-龯]/;
const PUNCTUATION_RE = /[。、,.]/;

/**
 * text を「。」および改行で文に分割する（末尾の句点は保持する）。
 */
function splitSentences(text: string): string[] {
  const withMarkers = text.replace(/\n/g, '。');
  const parts = withMarkers.split('。');
  const sentences: string[] = [];
  parts.forEach((part, i) => {
    const trimmed = part.trim();
    if (trimmed === '') return;
    const isLast = i === parts.length - 1;
    sentences.push(isLast ? trimmed : `${trimmed}。`);
  });
  return sentences;
}

function scoreSentence(sentence: string, index: number, total: number): number {
  let score = 0;

  // 位置: 先頭に近いほど高評価
  score += total > 1 ? (1 - index / (total - 1)) * 0.4 : 0.4;

  if (KEYWORDS.some((k) => sentence.includes(k))) score += 0.3;
  if (NUMERIC_UNIT_RE.test(sentence)) score += 0.15;

  // 長さ: 極端に長い/短い文は減点
  const len = sentence.length;
  if (len < SENTENCE_IDEAL_MIN || len > SENTENCE_IDEAL_MAX) {
    score -= 0.15;
  } else {
    score += 0.15;
  }

  return score;
}

/**
 * 抽出型要約: text を句読点・改行で文分割し、キーワード・位置・長さでスコアリングした上位の文を
 * 元の出現順で連結し、maxChars 以内に収める。文は元テキストからの抜き出しのみで、生成・要約文の
 * 作文は行わない（外部APIは使用しない）。
 */
export function summarize(text: string, maxChars: number): string {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return '';

  const total = sentences.length;
  const scored = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: scoreSentence(sentence, index, total),
  }));
  scored.sort((a, b) => b.score - a.score);

  const chosen = new Set<number>();
  let chars = 0;
  for (const item of scored) {
    if (chosen.size > 0 && chars + item.sentence.length > maxChars) continue;
    chosen.add(item.index);
    chars += item.sentence.length;
    if (chars >= maxChars) break;
  }

  if (chosen.size === 1 && chars > maxChars) {
    // 最上位の1文だけでも maxChars を超える場合は、その文を maxChars で切り詰めて返す
    // （捏造ではなく元テキストの部分文字列の切り出し）。
    const top = sentences[[...chosen][0]];
    return top.slice(0, Math.max(0, maxChars));
  }

  if (chosen.size === total) {
    // 全文が選ばれた場合は実質的な短縮になっていない。文分割時に改行(\n)を句点(。)へ
    // 置換して再結合すると改行構造が失われてしまうため、この場合は元テキストを
    // そのまま返し、改行等の書式を破壊しない。
    return text;
  }

  const summarized = sentences.filter((_, i) => chosen.has(i)).join('');
  // 文の間引きを行っても文字数が短縮されなかった場合（短い文が多く含まれる等）も、
  // 改行構造の破壊を避けるため元テキストをそのまま返す。
  return summarized.length < text.length ? summarized : text;
}

export type ReadabilityResult = {
  score: number;
  hints: string[];
};

const LINE_LENGTH_WARN = 40;
const LINE_COUNT_WARN = 8;
const KANJI_RATIO_WARN = 0.5;

function textOf(block: TextBlock): string {
  return block.type === 'bullet' ? block.text : block.text;
}

/**
 * スライド1枚分の読みやすさを 0..100 のスコアで概算する。文字数・行数・漢字比率・句読点密度の
 * 統計のみを用いたルールベースの評価であり、外部APIは使用しない。
 */
export function readability(slide: Slide): ReadabilityResult {
  const textBlocks = slide.blocks.filter((b): b is TextBlock => b.type !== 'image');
  const lines = textBlocks.flatMap((b) => textOf(b).split('\n')).filter((l) => l.trim() !== '');
  const hints: string[] = [];

  if (lines.length === 0) {
    return { score: 100, hints: [] };
  }

  const allText = lines.join('');
  const totalChars = allText.length;
  const maxLineLength = Math.max(...lines.map((l) => l.length));
  const avgLineLength = totalChars / lines.length;

  let kanjiCount = 0;
  let punctCount = 0;
  for (const ch of allText) {
    if (KANJI_RE.test(ch)) kanjiCount += 1;
    if (PUNCTUATION_RE.test(ch)) punctCount += 1;
  }
  const kanjiRatio = totalChars > 0 ? kanjiCount / totalChars : 0;
  const punctDensity = totalChars > 0 ? punctCount / totalChars : 0;

  let score = 100;

  if (maxLineLength > LINE_LENGTH_WARN) {
    score -= Math.min(30, (maxLineLength - LINE_LENGTH_WARN) * 1.5);
    hints.push('1行が長すぎます。改行するか文章を短くしてください。');
  }
  if (avgLineLength > LINE_LENGTH_WARN * 0.75) {
    score -= 10;
  }
  if (lines.length > LINE_COUNT_WARN) {
    score -= Math.min(25, (lines.length - LINE_COUNT_WARN) * 3);
    hints.push('情報量が多いため2枚に分割を検討してください。');
  }
  if (kanjiRatio > KANJI_RATIO_WARN) {
    score -= Math.min(20, (kanjiRatio - KANJI_RATIO_WARN) * 100);
    hints.push('漢字が多く読みにくい可能性があります。平易な表現を検討してください。');
  }
  if (totalChars > 40 && punctDensity < 0.02) {
    score -= 10;
    hints.push('句読点が少なく読みにくい可能性があります。文を区切ってください。');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, hints };
}
