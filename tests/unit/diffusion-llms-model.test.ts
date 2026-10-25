// Diffusion LMs' masked model (KTD3, KTD11): mlm.bin's size and layout, the TS forward pass with `bidirectional`
// against train_mlm.py's goldens, the readable bar, every pinned reply decoded again, the reply-quality gates, and the
// base weights left untouched.
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { modelLoader } from '../../src/lib/lm/load';
import { forward, type Model, softmax } from '../../src/lib/lm/model';
import { mulberry32 } from '../../src/lib/transformers/sample';
import PINNED from '../../data/diffusion-llms/prompts.json' with { type: 'json' };
import META from '../../public/data/diffusion-llms/meta.json' with { type: 'json' };

const disk = async (f: string) => {
  const b = readFileSync('public/data/diffusion-llms/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const MASK = META.mask;
const top5 = (xs: ArrayLike<number>) =>
  Array.from(xs, (v, i) => [v, i])
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5)
    .map(([, i]) => i);
/** The slot's logits with [MASK] ruled out: it is never a token the model writes. */
const fill = (model: Model, ids: number[], slot: number) => {
  const l = Float64Array.from(forward(model, ids, { bidirectional: true }).logits[slot]);
  l[MASK] = -Infinity;
  return l;
};

/** train_mlm.py's decode(): k slots a pass, the most confident (ties to the earlier slot) or drawn with mulberry32. */
function decode(model: Model, prompt: number[], k: number, rule: string, seed: number) {
  const x = [...prompt, ...Array(PINNED.length).fill(MASK)];
  const rand = mulberry32(seed);
  while (x.slice(prompt.length).includes(MASK)) {
    const logits = forward(model, x, { bidirectional: true }).logits;
    const best = logits.map(l => {
      const p = softmax(Array.from(l, (v, i) => (i === MASK ? -Infinity : v)));
      const tok = p.indexOf(Math.max(...p));
      return { tok, conf: p[tok] };
    });
    const left = x.map((_, i) => i).filter(i => x[i] === MASK);
    const pick =
      rule === 'confidence'
        ? [...left].sort((a, b) => best[b].conf - best[a].conf || a - b).slice(0, k)
        : Array.from({ length: Math.min(k, left.length) }, () => left.splice(Math.floor(rand() * left.length), 1)[0]);
    for (const i of pick) x[i] = best[i].tok;
  }
  return x.slice(prompt.length);
}

let model: Model;
beforeAll(async () => {
  model = await modelLoader(disk, 'mlm').load();
});

describe('the masked model files', () => {
  it('ships mlm.bin at 150 KB or less, laid out as meta.json says, with [MASK] as its last id', () => {
    const size = statSync('public/data/diffusion-llms/mlm.bin').size;
    expect(size).toBeLessThanOrEqual(150_000);
    expect(size).toBe(META.bytes);
    expect(META.model.vocab).toBe(769);
    expect(MASK).toBe(768);
    expect(META.model.params).toBe(META.tensors.reduce((n, t) => n + t.shape.reduce((a, c) => a * c, 1), 0));
  });

  it('leaves the base model, its meta and its goldens as they were', () => {
    expect(sha('public/data/lm/model.bin')).toBe('bbeee00ace589152509849245ef72ef9bf337201621b9dd37643eba2b22be2e1');
    expect(sha('public/data/lm/meta.json')).toBe('1adb8b787818c936a44eb5449145851634e3882a3fe25b2016d42c370f9a86ba');
    expect(sha('tests/fixtures/lm/goldens.json')).toBe(
      '5a1f4e67a7246d39d29fd9cc2dc9707cd2c9ab2353aab479294eccf4bce41499',
    );
  });
});

describe('the bidirectional forward pass', () => {
  it.each(META.goldens.map(g => [g.text.slice(0, 30), g] as const))('matches the golden for "%s"', (_, g) => {
    const out = forward(model, g.ids, { bidirectional: true });
    const at = out.logits[g.slot];
    let worst = 0;
    g.logits.forEach((v, i) => {
      worst = Math.max(worst, Math.abs(v - at[i]));
    });
    expect(worst).toBeLessThan(1e-4);
    expect(top5(at)).toEqual(g.top5);
  });

  it('puts the expected token in the top 5 for at least half the pinned phrases (the readable bar)', () => {
    const hits = PINNED.prompts.filter(p => top5(fill(model, p.maskedIds, p.slot)).includes(p.expected));
    expect(hits.length).toBe(PINNED.readable);
    expect(2 * hits.length).toBeGreaterThanOrEqual(PINNED.prompts.length);
  });
});

describe('filling k slots a pass', () => {
  // three phrases, every rule and k: the full set is 620 passes, too slow beside the rest of the suite
  it('writes the pinned replies again, never [MASK]', () => {
    for (const p of PINNED.prompts.slice(0, 3))
      for (const rule of PINNED.rules)
        for (const k of PINNED.ks) {
          const reply = decode(model, p.ids, k, rule, p.seed);
          expect(reply).not.toContain(MASK);
          expect(reply, `${rule} k=${k} seed ${p.seed}`).toEqual(
            (p.replies as Record<string, Record<string, { ids: number[] }>>)[rule][k].ids,
          );
        }
  });

  it('gives up agreement with the careful fill, and repeats itself more, as k grows', () => {
    const { ks, length: L } = PINNED;
    const replies = (rule: string, k: number) =>
      PINNED.prompts.map(p => (p.replies as Record<string, Record<string, { ids: number[] }>>)[rule][k].ids);
    const careful = replies('confidence', 1);
    const n = PINNED.prompts.length;
    const agree = (rule: string, k: number) =>
      replies(rule, k).reduce((a, r, j) => a + r.filter((t, i) => t === careful[j][i]).length, 0) / (L * n);
    const repeat = (rule: string, k: number) =>
      replies(rule, k).reduce((a, r) => a + r.filter((t, i) => i > 0 && t === r[i - 1]).length, 0) / ((L - 1) * n);
    const last = ks.at(-1)!;
    expect(agree('confidence', 1)).toBe(1);
    expect(agree('confidence', last)).toBeLessThan(1);
    for (const k of ks.slice(1)) expect(agree('random', k)).toBeLessThanOrEqual(agree('confidence', k));
    for (const rule of PINNED.rules) {
      expect(repeat(rule, last)).toBeGreaterThan(repeat(rule, 1));
      for (const k of ks) {
        expect(agree(rule, k)).toBeCloseTo((PINNED.quality as Record<string, Record<string, number>>)[rule][k], 6);
        expect(repeat(rule, k)).toBeCloseTo((PINNED.repeats as Record<string, Record<string, number>>)[rule][k], 6);
      }
    }
    expect(META.decoding.quality).toEqual(PINNED.quality);
    expect(META.decoding.repeats).toEqual(PINNED.repeats);
  });
});
