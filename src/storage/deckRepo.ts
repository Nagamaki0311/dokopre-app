import { dbDelete, dbGet, dbGetAll, dbPut, STORE_ASSETS, STORE_DECKS } from './db';
import type { Asset, Deck } from '../types';
import { SCHEMA_VERSION } from '../types';

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

/**
 * JSON からデッキを読み込む。schemaVersion が一致しない場合は明示的にエラーを投げる（信頼境界での入力検証）。
 * 画像アセットは assets ストアへ保存し、デッキ本体にはメタデータのみを残す。
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

  const deck = candidate as Deck;
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
