import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { Asset, Slide } from '../types';
import { SLIDE_H, SLIDE_W } from '../types';
import type { TextMeasurer } from '../layout/measure';
import { layoutSlide } from '../layout/layout';
import { drawLayout } from '../render/canvasRenderer';

/**
 * スライドをオフスクリーン Canvas に描画し PNG の Blob を返す。
 * レイアウト判断は layoutSlide（既存の自動レイアウトエンジン）に委譲し、Canvas側は描画のみ行う（D-002）。
 */
export async function exportSlideAsPng(slide: Slide, assets: Asset[], measurer: TextMeasurer): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const canvas = document.createElement('canvas');
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvasの初期化に失敗しました。この端末ではPNG出力を利用できません。');
  }

  const result = layoutSlide(slide, measurer);
  await drawLayout(ctx, result, assets, slide.blocks);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('PNGの生成に失敗しました。');
  }
  return blob;
}

/**
 * Blob をファイルとして保存する。
 * Android(Capacitorネイティブ)ではFilesystemにキャッシュ書き込み後、Shareシートで保存/共有させる。
 * Web版では既存の`<a download>` + Blob URLのままとする（フォールバックを壊さない）。
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await blobToBase64(blob);
      const written = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({ url: written.uri, title: filename });
      return;
    } catch (err) {
      console.error('ネイティブでの保存/共有に失敗しました。ブラウザのダウンロードにフォールバックします。', err);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
