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

/**
 * 画像の表示調整。box に比率を保ったまま収めた状態（object-fit: contain 相当）を基準(scale=1, offset=0)とし、
 * scale・offsetX/offsetYはユーザー操作による追加の拡縮・移動量。比率変更・自動クロップは行わない。
 */
export type ImageTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type ImageBlock = {
  id: string;
  type: 'image';
  assetId: string;
  alt: string;
  transform?: ImageTransform;
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

/**
 * スライド全体の整列軸。既存の LayoutBox.align（'left'|'center'|'right', text-align相当）とは別軸で、
 * ボックス自体の配置方法を表す（'centerBox' はボックスを内容幅に縮めて枠内中央配置する）。
 * 'right' は将来の拡張用に型のみ用意しており、自動選択ロジック（selectAlign）では選ばれない。
 */
export type AlignId = 'left' | 'center' | 'centerBox' | 'right';

export type LayoutResult = {
  template: TemplateId;
  boxes: LayoutBox[];
  warnings: LayoutWarning[];
  /**
   * レンダリングには使用しない。整列の候補選択結果を示すメタデータであり、
   * 実際の視覚効果は boxes[].x / boxes[].w の補正（centerBox 時）で完結している。
   */
  align: AlignId;
};
