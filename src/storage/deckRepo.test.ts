import { describe, expect, it } from 'vitest';
import { importDeckJson } from './deckRepo';
import { SCHEMA_VERSION } from '../types';

function baseDeck(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'deck-test',
    title: 'テスト',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    slides: [{ id: 'slide-1', layoutHint: 'auto', notes: '', blocks: [{ id: 'block-1', type: 'heading', text: '見出し' }] }],
    assets: [],
    ...overrides,
  };
}

describe('importDeckJson の検証', () => {
  it('blocks が欠落したスライドはエラーを投げ、TypeErrorでクラッシュしない', async () => {
    const deck = baseDeck({ slides: [{ id: 'slide-1', layoutHint: 'auto', notes: '' }] });
    await expect(importDeckJson(JSON.stringify(deck))).rejects.toThrow(/blocks/);
  });

  it('blocks が配列でないスライドはエラーを投げる', async () => {
    const deck = baseDeck({ slides: [{ id: 'slide-1', layoutHint: 'auto', notes: '', blocks: 'not-an-array' }] });
    await expect(importDeckJson(JSON.stringify(deck))).rejects.toThrow(/blocks/);
  });

  it('未知の type を持つブロックはエラーを投げる', async () => {
    const deck = baseDeck({
      slides: [{ id: 'slide-1', layoutHint: 'auto', notes: '', blocks: [{ id: 'block-1', type: 'unknown' }] }],
    });
    await expect(importDeckJson(JSON.stringify(deck))).rejects.toThrow(/type/);
  });

  it('画像ブロックに assetId がない場合エラーを投げる', async () => {
    const deck = baseDeck({
      slides: [{ id: 'slide-1', layoutHint: 'auto', notes: '', blocks: [{ id: 'block-1', type: 'image', alt: '' }] }],
    });
    await expect(importDeckJson(JSON.stringify(deck))).rejects.toThrow(/assetId/);
  });

  it('テキスト系ブロックに text がない場合エラーを投げる', async () => {
    const deck = baseDeck({
      slides: [{ id: 'slide-1', layoutHint: 'auto', notes: '', blocks: [{ id: 'block-1', type: 'text' }] }],
    });
    await expect(importDeckJson(JSON.stringify(deck))).rejects.toThrow(/text/);
  });

  it('assets 配列に null が含まれる場合エラーを投げる', async () => {
    const deck = baseDeck({ assets: [null] });
    await expect(importDeckJson(JSON.stringify(deck))).rejects.toThrow(/アセット/);
  });

  it('assets の要素に id や mime がない場合エラーを投げる', async () => {
    const deck = baseDeck({ assets: [{ width: 1, height: 1 }] });
    await expect(importDeckJson(JSON.stringify(deck))).rejects.toThrow(/アセット/);
  });

  it('assets の要素に width/height がない、または0以下の場合エラーを投げる', async () => {
    const deck = baseDeck({ assets: [{ id: 'asset-1', mime: 'image/png' }] });
    await expect(importDeckJson(JSON.stringify(deck))).rejects.toThrow(/アセット/);

    const deckZero = baseDeck({ assets: [{ id: 'asset-1', mime: 'image/png', width: 0, height: 10 }] });
    await expect(importDeckJson(JSON.stringify(deckZero))).rejects.toThrow(/アセット/);
  });

  it('schemaVersion が不一致の場合エラーを投げる', async () => {
    const deck = baseDeck({ schemaVersion: SCHEMA_VERSION + 1 });
    await expect(importDeckJson(JSON.stringify(deck))).rejects.toThrow(/schemaVersion/);
  });

  it('不正な JSON はエラーを投げる', async () => {
    await expect(importDeckJson('{invalid')).rejects.toThrow(/JSON/);
  });
});
