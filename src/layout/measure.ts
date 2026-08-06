const FONT_FAMILY = '"Noto Sans JP", sans-serif';

export interface TextMeasurer {
  /** 指定フォントサイズ・太さでの1行分のテキスト幅（仮想px）を返す */
  measureText(text: string, fontSize: number, weight: number): number;
}

/** 全角(CJK等)は1.0em、半角は0.5emとして近似する。DOM非依存のためテストで利用する。 */
export function createApproxMeasurer(): TextMeasurer {
  const cache = new Map<string, number>();
  return {
    measureText(text: string, fontSize: number, weight: number): number {
      const key = `${fontSize}|${weight}|${text}`;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;

      let units = 0;
      for (const ch of text) {
        const code = ch.codePointAt(0) ?? 0;
        units += code > 0x2e7f ? 1.0 : 0.5;
      }
      const width = units * fontSize;
      cache.set(key, width);
      return width;
    },
  };
}

/** Canvas measureText を用いる本番用実装。計測結果をキャッシュする。 */
export function createCanvasMeasurer(): TextMeasurer {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const cache = new Map<string, number>();

  return {
    measureText(text: string, fontSize: number, weight: number): number {
      const key = `${fontSize}|${weight}|${text}`;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;

      let width: number;
      if (ctx) {
        ctx.font = `${weight} ${fontSize}px ${FONT_FAMILY}`;
        width = ctx.measureText(text).width;
      } else {
        // Canvas未対応環境へのフォールバック（発生しない想定だが安全側で近似計測する）
        width = createApproxMeasurer().measureText(text, fontSize, weight);
      }
      cache.set(key, width);
      return width;
    },
  };
}

const NO_LINE_START = new Set(['、', '。', '」', '』', '）', ')', '!', '?', '！', '？', '、', '，', '.', ',']);

/**
 * 貪欲法によるテキスト折り返し。maxWidth を超える直前で改行し、
 * 行頭に禁則文字（、。」）!? 等）が来る場合は1文字前で改行する簡易禁則処理を行う。
 * 明示的な改行(\n)は強制改行として扱う。
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
  weight: number,
): string[] {
  const result: string[] = [];

  for (const paragraph of text.split('\n')) {
    if (paragraph === '') {
      result.push('');
      continue;
    }
    const chars = Array.from(paragraph);
    let line = '';

    for (let i = 0; i < chars.length; i += 1) {
      const ch = chars[i];
      const candidate = line + ch;
      const width = measurer.measureText(candidate, fontSize, weight);

      if (width > maxWidth && line.length > 0) {
        // 禁則: 次の行頭が禁則文字なら1文字前倒しで改行位置をずらす
        if (NO_LINE_START.has(ch) && line.length > 1) {
          result.push(line.slice(0, -1));
          line = line.slice(-1) + ch;
        } else {
          result.push(line);
          line = ch;
        }
      } else {
        line = candidate;
      }
    }
    if (line.length > 0) result.push(line);
  }

  return result.length > 0 ? result : [''];
}
