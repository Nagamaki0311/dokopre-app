import { describe, expect, it } from 'vitest';
import { sanitizeFilename } from './exportPng';

describe('sanitizeFilename', () => {
  it('スラッシュ等のAndroidパスとして不正な文字を_に置換する', () => {
    expect(sanitizeFilename('Q3/Q4実績.png')).toBe('Q3_Q4実績.png');
    expect(sanitizeFilename('a\\b:c*d?e"f<g>h|i')).toBe('a_b_c_d_e_f_g_h_i');
  });

  it('不正な文字を含まない場合はそのまま返す', () => {
    expect(sanitizeFilename('slide-1.png')).toBe('slide-1.png');
  });
});
