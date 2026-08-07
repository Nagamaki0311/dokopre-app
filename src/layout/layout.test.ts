import { describe, expect, it } from 'vitest';
import { parseText } from './parse';
import { analyze } from './analyze';
import { layoutSlide } from './layout';
import { selectAlign } from './templates';
import { createApproxMeasurer } from './measure';
import type { AlignId, Slide, TemplateId } from '../types';

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

describe('selectAlign / layoutSlide の align', () => {
  it('(a) imageSide テンプレートは left になる', () => {
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
    expect(result.align).toBe('left');
  });

  it('(b) title テンプレートは center になる', () => {
    const slide = makeSlide('これは短いタイトルです');
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('title');
    expect(result.align).toBe('center');
  });

  it('(c) 改行なし1ブロックの statement は centerBox になる', () => {
    const slide = makeSlide('あ'.repeat(60));
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('statement');
    expect(result.align).toBe('centerBox');
  });

  it('(c) 改行を含む statement は center になる（centerBox にならない）', () => {
    const slide: Slide = {
      id: 'slide-1',
      layoutHint: 'statement',
      notes: '',
      blocks: [{ id: 'b1', type: 'text', text: `${'あ'.repeat(30)}\n${'い'.repeat(30)}` }],
    };
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('statement');
    expect(result.align).toBe('center');
  });

  it('(c) 複数ブロックを statement に強制した場合は center になる（1ブロックのみの条件を満たさない）', () => {
    const slide: Slide = {
      id: 'slide-1',
      layoutHint: 'statement',
      notes: '',
      blocks: [
        { id: 'b1', type: 'text', text: '一つ目の文章です' },
        { id: 'b2', type: 'text', text: '二つ目の文章です' },
      ],
    };
    const analyzed = analyze(slide.blocks);
    expect(selectAlign(analyzed, 'statement')).toBe('center');
  });

  it('(d) 2件以下・短い bullets は centerBox になる', () => {
    const slide = makeSlide('見出し\n・短い項目1\n・短い項目2');
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('bullets');
    expect(result.align).toBe('centerBox');
  });

  it('(d) 3件以上の bullets は left になる', () => {
    const slide = makeSlide('見出し\n・項目1\n・項目2\n・項目3');
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('bullets');
    expect(result.align).toBe('left');
  });

  it('(d) 2件以下でも実測行幅が枠幅の50%以上の長文 bullets は left になる', () => {
    const slide = makeSlide(`見出し\n・${'あ'.repeat(80)}\n・${'い'.repeat(80)}`);
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.template).toBe('bullets');
    expect(result.align).toBe('left');
  });

  it('(e) centerBox 時、同一フレーム内の複数ボックスが同じ contentW (w) で中央配置される', () => {
    const slide = makeSlide('見出し\n・短い\n・長い');
    const result = layoutSlide(slide, createApproxMeasurer());
    expect(result.align).toBe('centerBox');
    const itemBoxes = result.boxes.filter((b) => b.role === 'bullet');
    expect(itemBoxes).toHaveLength(2);
    const widths = new Set(itemBoxes.map((b) => b.w));
    expect(widths.size).toBe(1);
    const xs = new Set(itemBoxes.map((b) => b.x));
    expect(xs.size).toBe(1);
    // 枠幅より縮んでいること（内容幅に補正されている）
    expect(itemBoxes[0].w).toBeLessThan(1280 - 96 * 2);
  });

  it('(f) right は判定ラダーのどの分岐からも選ばれない', () => {
    const templates: TemplateId[] = ['title', 'statement', 'bullets', 'twoColumn', 'imageSide'];
    const patterns: Slide['blocks'][] = [
      [{ id: 'b1', type: 'heading', text: 'タイトル' }],
      [{ id: 'b1', type: 'text', text: '短文' }],
      [{ id: 'b1', type: 'text', text: '一つ目' }, { id: 'b2', type: 'text', text: '二つ目' }],
      [
        { id: 'b1', type: 'heading', text: '見出し' },
        { id: 'b2', type: 'bullet', text: '項目1' },
        { id: 'b3', type: 'bullet', text: '項目2' },
        { id: 'b4', type: 'bullet', text: '項目3' },
      ],
      [
        { id: 'b1', type: 'heading', text: '見出し' },
        { id: 'b2', type: 'image', assetId: 'asset-1', alt: '画像' },
      ],
    ];

    const results: AlignId[] = [];
    for (const template of templates) {
      for (const blocks of patterns) {
        const analyzed = analyze(blocks);
        results.push(selectAlign(analyzed, template));
      }
    }

    expect(results.every((a) => a !== 'right')).toBe(true);
  });
});
