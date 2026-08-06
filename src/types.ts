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
