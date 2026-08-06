# データ構造

`src/types.ts`の定義をそのまま転記し、各フィールドの意味を補足する。この型定義がデータスキーマの正であり、`schemaVersion`（現在`1`）でJSONインポート時の互換性を検証する。

```ts
export const SCHEMA_VERSION = 1;
export const SLIDE_W = 1280;
export const SLIDE_H = 720;

export type TemplateId = 'title' | 'statement' | 'bullets' | 'twoColumn' | 'imageSide';

export type MarkerColor = 'yellow' | 'pink' | 'blue';

export type TextBlock = {
  id: string;
  type: 'heading' | 'text' | 'bullet';
  text: string;
  emphasis?: boolean;
  marker?: MarkerColor | null;
};

export type ImageBlock = {
  id: string;
  type: 'image';
  assetId: string;
  alt: string;
};

export type Block = TextBlock | ImageBlock;

export type Slide = {
  id: string;
  layoutHint: TemplateId | 'auto';
  notes: string;
  blocks: Block[];
};

export type Asset = {
  id: string;
  mime: string;
  width: number;
  height: number;
  /** base64 data. Present when exported to JSON; DB stores metadata only alongside a binary in a separate store. */
  data?: string;
};

export type Deck = {
  schemaVersion: number;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  slides: Slide[];
  assets: Asset[];
};

export type BoxRole =
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bullet'
  | 'image'
  | 'statement';

export type LayoutBox = {
  blockId: string;
  role: BoxRole;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  lineHeight: number;
  weight: number;
  align: 'left' | 'center' | 'right';
  marker?: MarkerColor | null;
  lines: string[];
};

export type LayoutWarningCode = 'too-much-text' | 'overflow' | 'too-many-blocks';

export type LayoutWarning = {
  blockId?: string;
  code: LayoutWarningCode;
  message: string;
};

export type LayoutResult = {
  template: TemplateId;
  boxes: LayoutBox[];
  warnings: LayoutWarning[];
};
```

## 補足

- **Deck**: プレゼン資料1件全体。`slides`が発表順のスライド配列、`assets`が使用中の画像アセットのメタデータ配列（本体データはIndexedDBの別ストアに保存、JSONエクスポート時のみ`data`をインライン化する）。
- **Slide**: 1枚のスライド。`layoutHint`が`'auto'`の場合は`selectTemplate`（`src/layout/templates.ts`）がブロック構成から自動でテンプレートを選ぶ。`notes`は発表者用メモ（発表画面下部に表示）。
- **Block**: `TextBlock`（見出し/本文/箇条書き）と`ImageBlock`（画像1枚）の判別共用体。`marker`はマーカー色（未設定はnull）、`emphasis`はユーザーが手動指定する強調フラグ（自動強調は`analyze.ts`の`autoEmphasis`が別途判定し、Blockには保存されない）。
- **Asset**: 画像1件。`width`/`height`は元画像のピクセルサイズで、レイアウト時の`object-fit: cover`相当の切り出し計算（`canvasRenderer.ts`の`drawImageCover`、`SlideView.tsx`のCSS `object-fit: cover`）に使う。
- **LayoutResult / LayoutBox**: `layoutSlide()`の出力。1280×720の仮想座標系（`SLIDE_W`×`SLIDE_H`）における絶対配置ボックス列で、DOM/Canvas双方のレンダラがこれをそのまま描画する（[architecture.md](./architecture.md)参照）。`LayoutBox`は元の`Block`を`blockId`で参照するのみで、テキスト内容自体は持たない（`SlideView`/`canvasRenderer`は呼び出し元から渡された`blocks`も併用して画像アセットを解決する）。
- **LayoutWarning**: レイアウトが破綻気味（文字量過多・オーバーフロー・ブロック数過多）な場合にEditor画面のバッジ/ボトムシートへ表示する警告。

## IndexedDBのストア構成

`src/storage/db.ts`が定義するオブジェクトストア（DB名: `dokopre`, バージョン1）。

| ストア名 | keyPath | 保存内容 |
|---------|---------|---------|
| `decks` | `id` | `Deck`本体（`assets`は`data`を除いたメタデータのみ） |
| `assets` | `id` | `Asset`本体（`data`=base64画像データを含む） |

JSONエクスポート（`exportDeckJson`）時のみ、両ストアを結合して`data`をインライン化した完全な`Deck`を出力する。
