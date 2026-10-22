// Chapter 7's workbench: any text a reader types traces without error. Up to the context it is read whole and the
// prompt box shows no truncation note; past it the oldest tokens are dropped, struck through, and the note says so.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { trace } from '../../src/lib/transformers/trace';
import { CTX, PromptInput, piecesOf } from '../../src/content/transformers/kit';
import * as ch7 from '../../src/content/transformers/07-trace-a-prompt';

const b = readFileSync('public/data/lm/model.bin');
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const model = parseModel(meta, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
const box = (text: string) => renderToStaticMarkup(createElement(PromptInput, { value: text, onChange: () => {} }));
const NOTE = /don’t fit, so the model never reads them/;

/** Typed text of every kind: letters, digits, punctuation, line breaks, accents, emoji, other scripts, markup. */
const SAMPLES = [
  'a',
  ' ',
  '\n',
  'Where is order 1042?',
  'Café crème, s’il vous plaît',
  '注文はどこ？',
  '🙂🚚📦',
  '<script>alert(1)</script>',
  'x'.repeat(40),
  '1234567890'.repeat(5),
  ch7.START,
];
/** Random printable text from a fixed seed, lengths spread up to a few times the context. */
function randomTexts(n: number) {
  let a = 7;
  const r = () => (a = (a * 1103515245 + 12345) >>> 0) / 2 ** 32;
  const chars = 'abcdefghijklmnopqrstuvwxyz ABCDEFG.,?!0123456789\néü—“”🙂';
  return Array.from({ length: n }, () =>
    Array.from({ length: 1 + Math.floor(r() * 120) }, () => [...chars][Math.floor(r() * [...chars].length)]).join(''),
  );
}

describe('the workbench traces any typed text', () => {
  it.each([...SAMPLES, ...randomTexts(40)].map(t => [t]))('%j', text => {
    const ids = encode(text),
      t = trace(model, text);
    expect(t.tokens.length).toBe(Math.min(ids.length, CTX));
    expect(t.truncated).toBe(ids.length > CTX);
    expect(t.tokens.map(x => x.id)).toEqual(ids.slice(-CTX));
    for (const row of t.top) for (const c of row) expect(Number.isFinite(c.p)).toBe(true);
    // the box: the count, and the note only past the context
    const html = box(text);
    expect(html).toContain(`${ids.length} of ${CTX} tokens`);
    expect(NOTE.test(html)).toBe(ids.length > CTX);
    expect((html.match(/<s>/g) ?? []).length).toBe(piecesOf(text).cut);
  });
});

describe('chapter 7', () => {
  it('its long prompt is past the context, and the model reads its last tokens (the prediction’s answer)', () => {
    expect(encode(ch7.LONG).length).toBeGreaterThan(CTX);
    expect(NOTE.test(box(ch7.LONG))).toBe(true);
    expect(ch7.outcomeOf(model, ch7.LONG)).toBe(1);
    expect(ch7.outcomeOf(model, ch7.START)).toBe(0);
  });
});
