import { genId } from './layout/id';
import { SCHEMA_VERSION } from './types';
import type { Deck, Slide } from './types';

export function createSlide(): Slide {
  return {
    id: genId('slide'),
    layoutHint: 'auto',
    notes: '',
    blocks: [],
  };
}

export function createDeck(title = '無題のデッキ'): Deck {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: genId('deck'),
    title,
    createdAt: now,
    updatedAt: now,
    slides: [createSlide()],
    assets: [],
  };
}
