// Larkspur mini: the TypeScript forward pass against the PyTorch goldens (computed in float64 from the
// shipped Float16 weights), the loader, and the committed training ids.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { evaluate, forward } from '../../src/lib/lm/model';
import { modelLoader, parseModel, type Meta } from '../../src/lib/lm/load';
import GOLDENS from '../fixtures/lm/goldens.json' with { type: 'json' };
import IDS from '../../data/lm/ids.json' with { type: 'json' };

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const model = parseModel(meta, disk('model.bin'));
const top5 = (xs: ArrayLike<number>) =>
  Array.from(xs, (v, i) => [v, i])
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5)
    .map(([, i]) => i);

describe('Larkspur mini forward pass', () => {
  it.each(GOLDENS.prompts.map(g => [g.text.slice(0, 30), g] as const))('matches the golden for "%s"', (_, g) => {
    const out = forward(model, encode(g.text));
    expect(out.ids).toEqual(g.ids);
    expect(out.truncated).toBe(g.truncated);
    const last = out.logits[out.logits.length - 1];
    let worst = 0;
    g.logits.forEach((v, i) => {
      worst = Math.max(worst, Math.abs(v - last[i]));
    });
    expect(worst).toBeLessThan(1e-4);
    expect(top5(last)).toEqual(g.top5);
    g.attention.forEach((layer, l) =>
      layer.forEach((head, h) =>
        head.forEach((row, t) =>
          row.forEach((v, s) => expect(Math.abs(out.attention[l][h][t][s] - v)).toBeLessThan(1e-5)),
        ),
      ),
    );
  });

  it('keeps attention causal, each row summing to 1', () => {
    const out = forward(model, encode(GOLDENS.prompts[0].text));
    for (const layer of out.attention)
      for (const head of layer)
        head.forEach((row, t) => {
          expect(Math.abs(row.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-6);
          row.forEach((v, s) => {
            if (s > t) expect(v).toBe(0);
          });
        });
  });

  it('reads only the last 32 tokens of a longer prompt and says so', () => {
    const ids = encode(GOLDENS.prompts[4].text);
    expect(ids.length).toBeGreaterThan(32);
    const out = forward(model, ids);
    expect(out.truncated).toBe(true);
    expect(out.ids).toEqual(ids.slice(-32));
    expect(out.logits).toHaveLength(32);
    expect(forward(model, ids.slice(-32)).truncated).toBe(false);
  });

  it('scores the held-out documents as PyTorch did', () => {
    const ev = evaluate(model, IDS.splits.heldout.ids);
    expect(Number.isFinite(ev.loss)).toBe(true);
    expect(Math.abs(ev.loss - GOLDENS.heldout.loss)).toBeLessThan(1e-4);
    expect(ev.top1).toBeCloseTo(GOLDENS.heldout.top1, 9);
    expect(ev.top5).toBeCloseTo(GOLDENS.heldout.top5, 9);
    expect(meta.heldout.top5).toBeCloseTo(ev.top5, 5);
  });
});

describe('Larkspur mini files', () => {
  it('ships model.bin at 150 KB or less, laid out as meta.json says', () => {
    const size = statSync('public/data/lm/model.bin').size;
    expect(size).toBeLessThanOrEqual(150_000);
    expect(size).toBe(meta.bytes);
  });

  it('holds the same token ids the tokenizer gives today (ids.json is not stale)', () => {
    for (const { docs, ids } of Object.values(IDS.splits))
      docs.forEach((d, i) => expect(encode(readFileSync(`data/corpus/${d}`, 'utf8'))).toEqual(ids[i]));
    expect(IDS.prompts.map(p => encode(p.text))).toEqual(IDS.prompts.map(p => p.ids));
    const all = [...IDS.splits.train.docs, ...IDS.splits.heldout.docs].sort();
    expect(all).toEqual(
      readdirSync('data/corpus')
        .filter(f => f.endsWith('.md'))
        .sort(),
    );
    expect(meta.heldout.docs).toEqual(IDS.splits.heldout.docs);
  });
});

describe('Larkspur mini loader', () => {
  it('reports an error when model.bin does not match meta.json, and recovers on retry', async () => {
    let calls = 0;
    const m = modelLoader(async f => (f === 'model.bin' && calls++ === 0 ? new ArrayBuffer(8) : disk(f)));
    await expect(m.load()).rejects.toThrow(/model\.bin/);
    expect(m.status()).toBe('error');
    await m.load();
    expect(m.status()).toBe('ready');
  });

  it('reports an error on a 404 and recovers on retry', async () => {
    const ok = (f: string) => ({ ok: true, status: 200, arrayBuffer: async () => disk(f) });
    let calls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      const f = url.split('/').pop()!;
      return f === 'model.bin' && calls++ === 0 ? { ok: false, status: 404 } : ok(f);
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const m = modelLoader();
      expect(m.status()).toBe('idle');
      const first = m.load();
      expect(m.status()).toBe('loading');
      await expect(first).rejects.toThrow(/404/);
      expect(m.status()).toBe('error');
      const w = await m.load();
      expect(m.status()).toBe('ready');
      expect(m.get()).toBe(w);
      expect(fetchMock.mock.calls.map(([u]) => u)).toContain('/data/lm/model.bin');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
