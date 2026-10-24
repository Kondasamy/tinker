import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  TOKEN_BOARD,
  TOKEN_PARTS,
  tokenLabel,
  tokenScene,
  tokenState,
  type TokenOpts,
} from '../../src/components/scenes/tokenScene';
import { TokenRow, TokensStage, siteEncoding, spoken } from '../../src/content/tokens/kit';
import { encode } from '../../src/lib/lm/bpe';

const draw = (o: TokenOpts) =>
  renderToString(createElement(IsoStage, { board: TOKEN_BOARD, scene: tokenScene(o), label: tokenLabel(o) }));
const stage = (text: string, view: 'scene' | 'tiles') =>
  renderToString(createElement(TokensStage, { text, view, onView: () => {} }));
const count = (html: string, s: string) => html.split(s).length - 1;

describe('the token press', () => {
  it('typed <script> renders as text in both views, never as markup', () => {
    const text = '<script>alert(1)</script>';
    for (const html of [draw({ text }), draw({ text, scale: 1.8 }), stage(text, 'scene'), stage(text, 'tiles')]) {
      expect(html).not.toContain('<script');
    }
    expect(draw({ text })).toContain('&lt;script&gt;');
    expect(stage(text, 'tiles')).toContain('&lt;');
  });
  it('empty input draws an idle press and "0 tokens", no NaN', () => {
    expect(tokenState({ text: '' })).toEqual({ tokens: 0, shown: 0, more: 0, idle: true });
    const svg = draw({ text: '' });
    expect(svg).toContain('data-idle="1"');
    expect(svg).toContain('0 TOKENS');
    expect(svg).not.toContain('data-prop="strip"');
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
    for (const v of ['scene', 'tiles'] as const) {
      const html = stage('', v);
      expect(html).toContain('0 tokens');
      expect(html).not.toMatch(/NaN|Infinity/);
    }
  });
  it('draws one tile per token up to the belt’s length, and says how many it shows', () => {
    const short = 'Refunds',
      long = 'Can enterprise customers get a refund on a damaged order?';
    expect(count(draw({ text: short }), 'class="tile"')).toBe(encode(short).length);
    const st = tokenState({ text: long });
    expect(st.tokens).toBe(encode(long).length);
    expect(st.shown + st.more).toBe(st.tokens);
    // the belt's tiles plus the one still dropping out of the press
    expect(count(draw({ text: long }), 'class="tile"')).toBe(st.shown + 1);
    expect(draw({ text: long })).toContain(`${st.tokens} TOKENS · ${st.shown} SHOWN`);
  });
  it('phones keep pills to names', () => {
    const svg = draw({ text: 'Refunds', scale: 1.8 });
    expect(svg).toContain('>TEXT<');
    expect(svg.replace(/aria-label="[^"]*"/, '')).not.toContain('Refunds'); // the label still says it
  });
});

describe('the tile row', () => {
  it('has one focusable tile per token (the encode length)', () => {
    for (const text of ['Hello, Larkspur!', 'café ☕ 42', '']) {
      const html = renderToString(createElement(TokenRow, { enc: siteEncoding(text) }));
      expect(count(html, '<li')).toBe(encode(text).length);
      expect(count(html, 'tabindex="0"')).toBe(text ? 1 : 0);
    }
  });
  it('a byte-chip token has an accessible name in bytes', () => {
    const enc = { ids: [226, 128], pieces: [[0xe2], [0x80]] };
    const html = renderToString(createElement(TokenRow, { enc }));
    expect(html).toContain('aria-label="Token 1 of 2: byte 0xE2, id 226"');
    expect(count(html, 'class="tk-byte"')).toBe(2);
    expect(spoken([0xe2, 0x98])).toBe('byte 0xE2, byte 0x98');
  });
  it('the site tokenizer gives byte chips for a character it cut', () => {
    const enc = siteEncoding('☕');
    expect(enc.pieces.some(p => typeof p !== 'string')).toBe(true);
  });
});

describe('token press callouts', () => {
  const base: TokenOpts = { text: 'Where is my order?' };
  const calls = (svg: string) => svg.match(/class="callout"/g)?.length ?? 0;
  it('draws one callout over each named part, with its text', () => {
    for (const block of TOKEN_PARTS) {
      const svg = draw({ ...base, say: { block, text: 'Look here' } });
      expect(calls(svg), block).toBe(1);
      expect(svg).toMatch(/class="callout"[\s\S]*Look here/);
    }
  });
  it('draws none for a part it does not have, and nothing changes without one', () => {
    expect(calls(draw({ ...base, say: { block: 'nowhere', text: 'Look here' } }))).toBe(0);
    expect(draw({ ...base, say: undefined })).toBe(draw(base));
    expect(calls(draw(base))).toBe(0);
  });
  it('on phones drops a callout over 16 characters and keeps a shorter one', () => {
    const phone = (text: string) => calls(draw({ ...base, scale: 1.8, say: { block: TOKEN_PARTS[0], text } }));
    expect(phone('x'.repeat(17))).toBe(0);
    expect(phone('x'.repeat(16))).toBe(1);
  });
});
