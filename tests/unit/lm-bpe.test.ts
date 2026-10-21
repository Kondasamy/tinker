// The shared byte-level BPE: exact round trips, minbpe's toy example, and the committed merges
// re-trained from data/corpus/ byte for byte.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decode, encode, mergeTrace, pieceBytes, pieceText } from '../../src/lib/lm/bpe';
import { N_MERGES, train } from '../../src/lib/lm/bpe-train';

const corpus = readdirSync('data/corpus').filter((f) => f.endsWith('.md')).sort()
  .map((f) => readFileSync(`data/corpus/${f}`, 'utf8')).join('\n');

describe('bpe', () => {
  it.each([
    ['empty', ''], ['emoji', 'Ship it 🚚👍🏽 now'], ['CJK', '注文は明日届きます。'], ['CRLF', 'a\r\nb\r\n'],
    ['double spaces', 'two  spaces   here'], ['combining marks', 'café ñ'], ['BOM', '﻿hi'],
  ])('round-trips %s', (_, s) => expect(decode(encode(s))).toBe(s));

  it('merges aa first on minbpe\'s toy example', () => expect(train('aaabdaaabac', 3)[0]).toEqual([97, 97]));

  it('re-trains data/corpus/ to the committed merges.json', () => {
    const committed = readFileSync('data/lm/merges.json', 'utf8');
    expect(JSON.stringify(train(corpus, N_MERGES)) + '\n').toBe(committed);
    expect(Buffer.byteLength(committed)).toBeLessThanOrEqual(20_000);
  });

  it('gives a leading space its own ids', () => expect(encode(' hello')).not.toEqual(encode('hello')));

  it('costs more tokens per character in Japanese than in English', () => {
    const en = 'Your order ships tomorrow.', ja = 'ご注文は明日発送されます。';
    expect(encode(ja).length / ja.length).toBeGreaterThan(encode(en).length / en.length);
  });

  it('shows a partial character as bytes, not U+FFFD', () => {
    const ids = encode('明');
    expect(ids.map(pieceBytes).reduce((n, b) => n + b.length, 0)).toBe(3);
    if (ids.length > 1) expect(pieceText(ids[0])).toBeNull();
    expect(pieceText(encode(' the')[0])).toBe(' the');
  });

  it('ends the merge trace at the same tokens as encode', () => {
    const p = corpus.slice(0, 600);
    const t = mergeTrace(p);
    expect(t.start.length).toBe(new TextEncoder().encode(p).length);
    expect(t.steps.length).toBeGreaterThan(0);
    expect(t.steps.at(-1)!.ids).toEqual(encode(p));
  });

  it('encodes the whole corpus well under a second', () => {
    const t0 = performance.now();
    const ids = encode(corpus);
    expect(performance.now() - t0).toBeLessThan(500);
    expect(decode(ids)).toBe(corpus);
  });
});
