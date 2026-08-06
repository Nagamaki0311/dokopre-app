import { describe, expect, it } from 'vitest';
import { summarize, readability } from './assist';
import { parseText } from './parse';
import type { Slide } from '../types';

function makeSlide(raw: string): Slide {
  return { id: 'slide-1', layoutHint: 'auto', notes: '', blocks: parseText(raw) };
}

describe('summarize', () => {
  it('(a) 長文が maxChars 以内に要約される', () => {
    const text =
      '結論として今期の売上は好調でした。理由は新製品が3件のヒットを記録したためです。' +
      '一方で課題も残っています。来期はコストの見直しが必要です。' +
      'まとめると全体として前向きな結果でした。ポイントは継続的な改善です。';
    const result = summarize(text, 60);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.length).toBeGreaterThan(0);
  });

  it('(b) 要約結果が元テキストの文の部分集合である（捏造しない）', () => {
    const text = '結論はAです。理由はBです。詳細はCです。まとめてDです。';
    const result = summarize(text, 30);
    const originalSentences = ['結論はAです。', '理由はBです。', '詳細はCです。', 'まとめてDです。'];
    const resultSentences = result.split('。').map((s) => s.trim()).filter((s) => s !== '');
    for (const s of resultSentences) {
      expect(originalSentences.some((o) => o.startsWith(s) || o === `${s}。`)).toBe(true);
    }
  });
});

describe('readability', () => {
  it('(c) 短い文で読みやすさスコアが高く出る', () => {
    const slide = makeSlide('短いタイトル\n・要点1\n・要点2');
    const { score } = readability(slide);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('(d) 極端に長い行を含む場合に hints へ警告が含まれる', () => {
    const longLine = 'あ'.repeat(200);
    const slide = makeSlide(`見出し\n${longLine}`);
    const { hints, score } = readability(slide);
    expect(hints.length).toBeGreaterThan(0);
    expect(hints.some((h) => h.includes('1行が長すぎます'))).toBe(true);
    expect(score).toBeLessThan(80);
  });
});
