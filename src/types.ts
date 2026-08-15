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
 * 画像のスライド上の絶対配置（スライド座標系 0..SLIDE_W, 0..SLIDE_H）。テキストの自動レイアウトとは独立しており、
 * 画像用のレイアウト枠には拘束されない。w/hは常に画像の縦横比を保ったまま拡縮される（比率変更・自動クロップは行わない）。
 * z はテキストボックス群との重なり順（'front'=テキストより前面、'back'=背面）。
 */
export type ImagePlacement = {
  x: number;
  y: number;
  w: number;
  h: number;
  z: 'front' | 'back';
};

export type ImageBlock = {
  id: string;
  type: 'image';
  assetId: string;
  alt: string;
  placement?: ImagePlacement;
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
