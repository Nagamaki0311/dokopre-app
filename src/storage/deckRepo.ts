import { dbDelete, dbGet, dbGetAll, dbPut, STORE_ASSETS, STORE_DECKS } from './db';
import type { Asset, Block, Deck, Slide } from '../types';
import { SCHEMA_VERSION } from '../types';
import { genId } from '../layout/id';

const TEXT_BLOCK_TYPES = new Set(['heading', 'text', 'bullet']);

const AUTOSAVE_DEBOUNCE_MS = 800;

export async function listDecks(): Promise<Deck[]> {
  const decks = await dbGetAll<Deck>(STORE_DECKS);
  return decks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadDeck(id: string): Promise<Deck | undefined> {
  return dbGet<Deck>(STORE_DECKS, id);
}

function stripAssetData(deck: Deck): Deck {
  return { ...deck, assets: deck.assets.map(({ data: _data, ...meta }) => meta) };
}

export async function saveDeck(deck: Deck): Promise<void> {
  await dbPut<Deck>(STORE_DECKS, stripAssetData(deck));
}

export async function deleteDeck(id: string): Promise<void> {
  await dbDelete(STORE_DECKS, id);
}

export async function putAsset(asset: Asset): Promise<void> {
  await dbPut<Asset>(STORE_ASSETS, asset);
}

export async function getAsset(id: string): Promise<Asset | undefined> {
  return dbGet<Asset>(STORE_ASSETS, id);
}

/** デッキが参照する全アセットに base64 データをインライン化した JSON 文字列を生成する。 */
export async function exportDeckJson(deck: Deck): Promise<string> {
  const assets: Asset[] = [];
  for (const meta of deck.assets) {
    const full = await getAsset(meta.id);
    assets.push(full ?? meta);
  }
  const exportable: Deck = { ...deck, assets };
  return JSON.stringify(exportable, null, 2);
}

function validateBlock(block: unknown, slideIndex: number, blockIndex: number): asserts block is Block {
  if (typeof block !== 'object' || block === null) {
    throw new Error(`スライド${slideIndex + 1}のブロック${blockIndex + 1}の形式が不正です。`);
  }
  const b = block as Partial<Block>;
  if (typeof b.id !== 'string') {
    throw new Error(`スライド${slideIndex + 1}のブロック${blockIndex + 1}にidがありません。`);
  }
  if (b.type === 'image') {
    if (typeof (b as { assetId?: unknown }).assetId !== 'string') {
      throw new Error(`スライド${slideIndex + 1}のブロック${blockIndex + 1}（画像）にassetIdがありません。`);
    }
  } else if (b.type !== undefined && TEXT_BLOCK_TYPES.has(b.type)) {
    if (typeof (b as { text?: unknown }).text !== 'string') {
      throw new Error(`スライド${slideIndex + 1}のブロック${blockIndex + 1}にtextがありません。`);
    }
  } else {
    throw new Error(`スライド${slideIndex + 1}のブロック${blockIndex + 1}のtypeが不正です（値: ${String(b.type)}）。`);
  }
}

function validateSlide(slide: unknown, slideIndex: number): asserts slide is Slide {
  if (typeof slide !== 'object' || slide === null) {
    throw new Error(`スライド${slideIndex + 1}の形式が不正です。`);
  }
  const s = slide as Partial<Slide>;
  if (!Array.isArray(s.blocks)) {
    throw new Error(`スライド${slideIndex + 1}にblocksがありません。`);
  }
  s.blocks.forEach((block, blockIndex) => validateBlock(block, slideIndex, blockIndex));
}

function validateAsset(asset: unknown, index: number): asserts asset is Asset {
  if (typeof asset !== 'object' || asset === null) {
    throw new Error(`アセット${index + 1}の形式が不正です。`);
  }
  const a = asset as Partial<Asset>;
  if (typeof a.id !== 'string' || typeof a.mime !== 'string') {
    throw new Error(`アセット${index + 1}にidまたはmimeがありません。`);
  }
  if (!Number.isFinite(a.width) || a.width! <= 0 || !Number.isFinite(a.height) || a.height! <= 0) {
    throw new Error(`アセット${index + 1}のwidth/heightが不正です。`);
  }
}

/**
 * JSON からデッキを読み込む。schemaVersion が一致しない場合や、Slide/Block/Asset の構造が
 * 不正な場合は明示的にエラーを投げる（信頼境界での入力検証。壊れたデータでのレンダー時クラッシュを防ぐ）。
 * 画像アセットは assets ストアへ保存し、デッキ本体にはメタデータのみを残す。
 * 既存デッキとidが衝突する場合は新しいidを採番してインポートする（暗黙の上書きを避ける）。
 */
export async function importDeckJson(text: string): Promise<Deck> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSONの解析に失敗しました。ファイル形式を確認してください。');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('デッキデータの形式が不正です。');
  }
  const candidate = parsed as Partial<Deck>;
  if (candidate.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `対応していないデータ形式です（schemaVersion: ${String(candidate.schemaVersion)}、期待値: ${SCHEMA_VERSION}）。`,
    );
  }
  if (!candidate.id || !Array.isArray(candidate.slides) || !Array.isArray(candidate.assets)) {
    throw new Error('デッキデータに必須項目が不足しています。');
  }

  candidate.slides.forEach((slide, i) => validateSlide(slide, i));
  candidate.assets.forEach((asset, i) => validateAsset(asset, i));

  const deck = candidate as Deck;

  const existing = await loadDeck(deck.id);
  if (existing) {
    deck.id = genId('deck');
  }

  for (const asset of deck.assets) {
    if (asset.data) {
      await putAsset(asset);
    }
  }
  await saveDeck(deck);
  return deck;
}

const autosaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** 800ms デバウンスでデッキを保存する。連続呼び出しでは直前のタイマーをキャンセルする。 */
export function scheduleAutosave(deck: Deck, onSaved?: (deck: Deck) => void): void {
  const existing = autosaveTimers.get(deck.id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    autosaveTimers.delete(deck.id);
    saveDeck(deck)
      .then(() => onSaved?.(deck))
      .catch((err) => console.error('自動保存に失敗しました', err));
  }, AUTOSAVE_DEBOUNCE_MS);

  autosaveTimers.set(deck.id, timer);
}
