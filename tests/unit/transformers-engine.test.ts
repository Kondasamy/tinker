// Transformers' engine (KTD10): the trace, the seeded sampler and the cost counts over Larkspur mini,
// the chapter prompts' readable bar, the recorded head, and the facts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { forward, softmax } from '../../src/lib/lm/model';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { HEAD, PROMPTS, trace, wordStart } from '../../src/lib/transformers/trace';
import {
  distribution,
  entropy,
  mulberry32,
  nucleus,
  sample,
  TEMPERATURES,
  TOP_PS,
} from '../../src/lib/transformers/sample';
import { costs } from '../../src/lib/transformers/costs';
import { ACCESSED, FACTS, fact } from '../../src/lib/transformers/facts';
import IDS from '../../data/lm/ids.json' with { type: 'json' };

const b = readFileSync('public/data/lm/model.bin');
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const model = parseModel(meta, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
const last = (text: string) => forward(model, encode(text)).logits.at(-1)!;

describe('trace', () => {
  it('gives every position its pieces, top-k next tokens and attention per layer and head', () => {
    const t = trace(model, PROMPTS[0].text);
    const n = encode(PROMPTS[0].text).length;
    expect(t.tokens).toHaveLength(n);
    expect(t.tokens.map(x => x.text).join('')).toBe(PROMPTS[0].text);
    expect(t.top).toHaveLength(n);
    for (const top of t.top) {
      expect(top).toHaveLength(5);
      for (let i = 1; i < top.length; i++) expect(top[i - 1].p).toBeGreaterThanOrEqual(top[i].p);
    }
    expect(t.attention).toHaveLength(meta.model.n_layer);
    expect(t.attention[0]).toHaveLength(meta.model.n_head);
    expect(t.attention[0][0]).toHaveLength(n);
  });

  it('says when a prompt is longer than the window', () => {
    const t = trace(model, 'Our warehouse inspects returned items within five business days. '.repeat(3));
    expect(t.truncated).toBe(true);
    expect(t.tokens).toHaveLength(meta.model.ctx);
  });
});

describe('chapter prompts (the readable bar)', () => {
  it.each(PROMPTS.map(p => [p.id, p] as const))('"%s" has its expected next token in the top 5', (_, p) => {
    expect(encode(p.expected), 'expected is one token').toHaveLength(1);
    expect(encode(p.text).length).toBeLessThanOrEqual(meta.model.ctx);
    expect(
      trace(model, p.text)
        .top.at(-1)!
        .map(c => c.text),
    ).toContain(p.expected);
  });

  it('every prompt id is unique', () => {
    expect(new Set(PROMPTS.map(p => p.id)).size).toBe(PROMPTS.length);
  });
});

describe('the readable head (chapter 4)', () => {
  it('is a real head of the model', () => {
    expect(HEAD.layer).toBeLessThan(meta.model.n_layer);
    expect(HEAD.head).toBeLessThan(meta.model.n_head);
  });

  it('its recorded score is what every document measures, and well above spreading evenly', () => {
    const all = [...IDS.splits.train.ids, ...IDS.splits.heldout.ids];
    let score = 0,
      uniform = 0,
      n = 0;
    for (const doc of all)
      for (let s = 0; s + meta.model.ctx <= doc.length; s += meta.model.ctx) {
        const ids = doc.slice(s, s + meta.model.ctx);
        const w = wordStart(ids, forward(model, ids).attention[HEAD.layer][HEAD.head]);
        score += w.score * w.n;
        uniform += w.uniform * w.n;
        n += w.n;
      }
    expect(score / n).toBeCloseTo(HEAD.score, 3);
    expect(uniform / n).toBeCloseTo(HEAD.uniform, 3);
    expect(HEAD.score).toBeGreaterThan(3 * HEAD.uniform);
  });

  it.each(PROMPTS.map(p => [p.id, p] as const))('its pattern holds on "%s"', (_, p) => {
    const t = trace(model, p.text);
    const w = wordStart(
      t.tokens.map(x => x.id),
      t.attention[HEAD.layer][HEAD.head],
    );
    expect(w.n).toBeGreaterThan(0);
    expect(w.score).toBeGreaterThanOrEqual(2 * w.uniform);
  });
});

describe('sampler', () => {
  const p = PROMPTS[0].text;

  it('the same seed gives the same continuation', () => {
    expect(sample(model, p, 1, 1, 7, 8)).toEqual(sample(model, p, 1, 1, 7, 8));
  });

  it('a different seed with temperature above 0 can differ', () => {
    const outs = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(s => sample(model, p, 1.5, 1, s, 8).text));
    expect(outs.size).toBeGreaterThan(1);
  });

  it('temperature 0 gives the argmax every time, whatever the seed', () => {
    const greedy = sample(model, p, 0, 1, 1, 6);
    for (const s of [2, 3, 99]) expect(sample(model, p, 0, 0.5, s, 6)).toEqual(greedy);
    const lg = last(p);
    expect(greedy.picks[0].id).toBe(lg.indexOf(Math.max(...lg)));
  });

  it('mulberry32 is fixed: the same seed gives the same stream in [0, 1)', () => {
    const a = mulberry32(42),
      b2 = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b2());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('top-p = 1 keeps every token', () => {
    expect(nucleus(softmax(last(p)), 1)).toHaveLength(meta.model.vocab);
  });

  it('a small top-p keeps the smallest set whose mass is at least p, the boundary included', () => {
    const probs = Float64Array.of(0.2, 0.5, 0.3);
    expect(nucleus(probs, 0.8)).toEqual([1, 2]);
    expect(nucleus(probs, 0.81)).toEqual([1, 2, 0]);
    expect(nucleus(probs, 0.5)).toEqual([1]);
    expect(nucleus(probs, 0.1)).toEqual([1]);
    const d = distribution(Float64Array.of(Math.log(0.2), Math.log(0.5), Math.log(0.3)), 1, 0.8);
    expect(d[0]).toBe(0);
    expect(d[1] + d[2]).toBeCloseTo(1, 12);
  });

  it('raising the temperature flattens the distribution: entropy rises over the domain', () => {
    for (const { text } of PROMPTS) {
      const hs = TEMPERATURES.map(t => entropy(distribution(last(text), t, 1)));
      for (let i = 1; i < hs.length; i++) expect(hs[i]).toBeGreaterThan(hs[i - 1]);
    }
    expect(TOP_PS).toContain(1);
  });
});

describe('costs', () => {
  it('attention pairs are n(n+1)/2 under the causal mask, as the forward pass shows', () => {
    for (const n of [1, 2, 5, 32]) {
      expect(costs(meta.model, n).pairs).toBe((n * (n + 1)) / 2);
      const att = forward(model, Array(n).fill(32)).attention[0][0];
      expect(att.reduce((s, row, t) => s + row.slice(0, t + 1).length, 0)).toBe(costs(meta.model, n).pairs);
    }
  });

  it('KV entries are layers × 2 (K and V) × heads × head size × n, from the real weight shapes', () => {
    const qkv = meta.tensors.find(t => t.name === 'h.0.attn.qkv.weight')!.shape;
    const kvRows = (qkv[0] / 3) * 2; // the qkv rows are Q, then K, then V
    const layers = meta.tensors.filter(t => /^h\.\d+\.attn\.qkv\.weight$/.test(t.name)).length;
    for (const n of [1, 10, 32]) expect(costs(meta.model, n).kv).toBe(layers * kvRows * n);
    expect(costs(meta.model, 32).kv).toBe(2 * 2 * 2 * 16 * 32);
  });
});

describe('facts (R5)', () => {
  it('every fact has a claim, a source URL and the access date', () => {
    expect(ACCESSED).toBe('2026-10-21');
    expect(new Set(FACTS.map(f => f.id)).size).toBe(FACTS.length);
    for (const f of FACTS) {
      expect(f.claim.trim(), f.id).not.toBe('');
      expect(f.source, f.id).toMatch(/^https:\/\//);
    }
    expect(() => fact('nope')).toThrow();
    expect(fact('n-squared').source).toMatch(/anthropic\.com/);
  });
});
