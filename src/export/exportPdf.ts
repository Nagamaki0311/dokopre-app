import { PDFDocument } from 'pdf-lib';
import type { Asset, Deck } from '../types';
import { SLIDE_H, SLIDE_W } from '../types';
import type { TextMeasurer } from '../layout/measure';
import { getAsset } from '../storage/deckRepo';
import { exportSlideAsPng } from './exportPng';

/**
 * デッキの全スライドをそれぞれ PNG 化（exportSlideAsPng を再利用）し、
 * pdf-lib で 1280x720 (16:9) の1ページ=1PNGとして埋め込んだPDFを生成する。
 * レイアウト判断ロジックはここでは実装しない（exportSlideAsPng経由でlayoutSlideに委譲、D-002）。
 */
export async function exportDeckAsPdf(deck: Deck, measurer: TextMeasurer): Promise<Blob> {
  const assets: Asset[] = [];
  for (const meta of deck.assets) {
    const full = await getAsset(meta.id);
    assets.push(full ?? meta);
  }

  const pdf = await PDFDocument.create();

  for (const slide of deck.slides) {
    const pngBlob = await exportSlideAsPng(slide, assets, measurer);
    const bytes = new Uint8Array(await pngBlob.arrayBuffer());
    const image = await pdf.embedPng(bytes);
    const page = pdf.addPage([SLIDE_W, SLIDE_H]);
    page.drawImage(image, { x: 0, y: 0, width: SLIDE_W, height: SLIDE_H });
  }

  const bytes = await pdf.save();
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' });
}
