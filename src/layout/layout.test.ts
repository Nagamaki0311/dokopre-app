import { describe, expect, it } from 'vitest';
import { parseText } from './parse';
import { analyze } from './analyze';
import { layoutSlide } from './layout';
import { createApproxMeasurer } from './measure';
import type { Slide } from '../types';

function makeSlide(raw: string, layoutHint: Slide['layoutHint'] = 'auto'): Slide {
  return {
    id: 'slide-1',
    layoutHint,
    notes: '',
    blocks: parseText(raw),
  };
}

describe('layoutSlide', () => {
  it('(a) 1行入力は title テンプレートになる', () => {
    const slide = makeSlide('これは短いタイトルです');
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('title');
    expect(result.boxes).toHaveLength(1);
    expect(result.boxes[0].role).toBe('heading');
  });

  it('(b) 見出し+箇条書き3つ(計4行)は bullets テンプレートになる', () => {
    const slide = makeSlide('見出し\n・項目1\n・項目2\n・項目3');
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('bullets');
    const bulletBoxes = result.boxes.filter((b) => b.role === 'bullet');
    expect(bulletBoxes).toHaveLength(3);
  });

  it('(c)「結論」を含む行には自動強調(autoEmphasis)が付く', () => {
    const blocks = parseText('見出し\n・結論としてこれが重要\n・その他の情報');
    const analyzed = analyze(blocks);
    const concluding = analyzed.find((b) => b.type !== 'image' && b.text.includes('結論'));
    expect(concluding).toBeDefined();
    expect(concluding && 'autoEmphasis' in concluding && concluding.autoEmphasis).toBe(true);
  });

  it('(d) 長文では fontSize が最小まで下がり too-much-text 警告が出る', () => {
    const longLine = 'あ'.repeat(400);
    const slide = makeSlide(longLine);
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('statement');
    expect(result.boxes[0].fontSize).toBe(24);
    expect(result.warnings.some((w) => w.code === 'too-much-text')).toBe(true);
  });

  it('(e) 画像ブロックがあると imageSide テンプレートになる', () => {
    const slide: Slide = {
      id: 'slide-1',
      layoutHint: 'auto',
      notes: '',
      blocks: [
        { id: 'b1', type: 'heading', text: '見出し' },
        { id: 'b2', type: 'image', assetId: 'asset-1', alt: '説明画像' },
      ],
    };
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('imageSide');
    expect(result.boxes.some((b) => b.role === 'image')).toBe(true);
  });
});
