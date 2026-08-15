import { describe, expect, it } from 'vitest';
import { defaultImagePlacement, resolveImagePlacement, resolveImageZ } from './imagePlacement';
import { SLIDE_H, SLIDE_W } from '../types';

describe('defaultImagePlacement', () => {
  it('縦横比を保ったままスライド中央に程よい大きさで配置する', () => {
    const placement = defaultImagePlacement({ width: 400, height: 100 });
    expect(placement.w / placement.h).toBeCloseTo(4);
    expect(placement.z).toBe('front');
    expect(placement.x + placement.w / 2).toBeCloseTo(SLIDE_W / 2);
    expect(placement.y + placement.h / 2).toBeCloseTo(SLIDE_H / 2);
  });

  it('小さい画像は原寸以上に拡大しない', () => {
    const placement = defaultImagePlacement({ width: 50, height: 50 });
    expect(placement.w).toBeLessThanOrEqual(50);
    expect(placement.h).toBeLessThanOrEqual(50);
  });
});

describe('resolveImagePlacement', () => {
  it('正常なplacementはそのまま返す', () => {
    const placement = { x: 10, y: 20, w: 100, h: 50, z: 'back' as const };
    expect(resolveImagePlacement(placement, { width: 200, height: 100 })).toEqual(placement);
  });

  it('未設定・NaN・0以下の幅高さなど不正な場合はデフォルト配置にフォールバックする', () => {
    const asset = { width: 400, height: 100 };
    expect(resolveImagePlacement(undefined, asset)).toEqual(defaultImagePlacement(asset));
    expect(resolveImagePlacement({ x: 0, y: 0, w: NaN, h: 10, z: 'front' }, asset)).toEqual(defaultImagePlacement(asset));
    expect(resolveImagePlacement({ x: 0, y: 0, w: 10, h: 0, z: 'front' }, asset)).toEqual(defaultImagePlacement(asset));
  });
});

describe('resolveImageZ', () => {
  it('未設定時は front 扱いにする', () => {
    expect(resolveImageZ(undefined)).toBe('front');
    expect(resolveImageZ({ z: 'back' })).toBe('back');
    expect(resolveImageZ({ z: 'front' })).toBe('front');
  });
});
