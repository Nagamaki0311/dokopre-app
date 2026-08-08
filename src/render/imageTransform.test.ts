import { describe, expect, it } from 'vitest';
import { computeImageRect } from './imageTransform';

describe('computeImageRect', () => {
  it('デフォルト(scale=1, offset=0)では比率を保ったまま box に収める（横長画像・縦長box）', () => {
    const rect = computeImageRect({ width: 400, height: 100 }, { x: 200, y: 100, w: 200, h: 200 });
    expect(rect.w).toBeCloseTo(200);
    expect(rect.h).toBeCloseTo(50);
    expect(rect.x).toBeCloseTo(200);
    expect(rect.y).toBeCloseTo(175);
  });

  it('デフォルトでは比率を保ったまま box に収める（縦長画像・横長box）', () => {
    const rect = computeImageRect({ width: 100, height: 400 }, { x: 0, y: 0, w: 200, h: 100 });
    expect(rect.w).toBeCloseTo(25);
    expect(rect.h).toBeCloseTo(100);
    expect(rect.x).toBeCloseTo(87.5);
    expect(rect.y).toBeCloseTo(0);
  });

  it('scale・offsetを適用すると比率を保ったまま拡縮・移動する', () => {
    const rect = computeImageRect(
      { width: 400, height: 100 },
      { x: 0, y: 0, w: 200, h: 200 },
      { scale: 2, offsetX: 10, offsetY: -5 },
    );
    expect(rect.w).toBeCloseTo(400);
    expect(rect.h).toBeCloseTo(100);
    expect(rect.w / rect.h).toBeCloseTo(4);
    expect(rect.x).toBeCloseTo(-100 + 10);
    expect(rect.y).toBeCloseTo(50 - 5);
  });
});
