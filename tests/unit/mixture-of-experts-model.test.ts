// Mixture of experts' model (KTD3, KTD4): moe.bin's size and layout, the TS experts path against train_moe.py's
// goldens (logits and routes), the bar in meta.json, and every other weight file left untouched.
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { modelLoader } from '../../src/lib/lm/load';
import { forward, type Model } from '../../src/lib/lm/model';
import META from '../../public/data/mixture-of-experts/meta.json' with { type: 'json' };

const DIR = 'public/data/mixture-of-experts/';
const disk = async (f: string) => {
  const b = readFileSync(DIR + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const top5 = (xs: ArrayLike<number>) =>
  Array.from(xs, (v, i) => [v, i])
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5)
    .map(([, i]) => i);

let model: Model;
beforeAll(async () => {
  model = await modelLoader(disk, 'moe').load();
});

describe('the experts model files', () => {
  it('ships moe.bin at 150 KB or less, laid out as meta.json says', () => {
    const size = statSync(DIR + 'moe.bin').size;
    expect(size).toBeLessThanOrEqual(150_000);
    expect(size).toBe(META.bytes);
    let off = 0;
    for (const t of META.tensors) {
      expect(t.offset, t.name).toBe(off);
      off += 2 * t.shape.reduce((a, c) => a * c, 1);
    }
    expect(off).toBe(size);
    expect(META.model.params).toBe(off / 2);
    const { d_model: D, d_mlp: H, experts: E } = META.model;
    const shape = Object.fromEntries(META.tensors.map(t => [t.name, t.shape]));
    expect(shape['h.1.mlp.router.weight']).toEqual([E, D]);
    expect(shape[`h.1.mlp.experts.${E - 1}.fc.weight`]).toEqual([H, D]);
    expect(shape[`h.1.mlp.experts.${E - 1}.proj.weight`]).toEqual([D, H]);
    expect(Object.keys(shape).some(n => n.includes('mlp.fc'))).toBe(false);
  });

  it('meets the bar: every expert takes 3% of held-out routes, top-5 near the base and above the dense model', () => {
    for (const layer of META.routeShares.layers) {
      expect(layer).toHaveLength(META.model.experts);
      expect(Math.min(...layer)).toBeGreaterThanOrEqual(0.03);
      expect(layer.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    }
    expect(META.heldout.top5).toBeGreaterThanOrEqual(META.base.heldout.top5 - 0.05);
    expect(META.heldout.top5).toBeGreaterThanOrEqual(META.dense.heldout.top5);
    expect(META.dense.shipped).toBe(false);
    expect(META.active).toBeLessThan(META.model.params);
  });

  it('leaves every other weight file as it was', () => {
    expect({
      model: sha('public/data/lm/model.bin'),
      meta: sha('public/data/lm/meta.json'),
      goldens: sha('tests/fixtures/lm/goldens.json'),
      finetuned: sha('public/data/lm/finetuned.bin'),
      lora: sha('public/data/lm/lora.bin'),
      student: sha('public/data/lm/student.bin'),
      ckpt: sha('public/data/pre-training/ckpt-1000.bin'),
      mlm: sha('public/data/diffusion-llms/mlm.bin'),
    }).toEqual({
      model: 'bbeee00ace589152509849245ef72ef9bf337201621b9dd37643eba2b22be2e1',
      meta: '1adb8b787818c936a44eb5449145851634e3882a3fe25b2016d42c370f9a86ba',
      goldens: '5a1f4e67a7246d39d29fd9cc2dc9707cd2c9ab2353aab479294eccf4bce41499',
      finetuned: '08e4dd06345b7b1318f2cc8be5ee3ddffcd58057dff9200e9142c56655144554',
      lora: 'd5cb6fcfb3eab41abbc3c72ee63ddd8dc2f3418a80463692f7d99f1e75933959',
      student: '5d539eaf38a1041e639ee00361e35626e0bae962bf3b591b98698d3ce6032721',
      ckpt: '434d98630c13f859f3a2a8f368922662172cfa335d6dcb49940bd8b15e5f39ef',
      mlm: 'd5537052208d9d88af5dd527aba2a1b1d8c5dfde7b942b02501faade1f235f10',
    });
  });
});

describe('the experts forward pass', () => {
  it.each(META.goldens.map(g => [g.text.slice(0, 30), g] as const))('matches the golden for "%s"', (_, g) => {
    const out = forward(model, g.ids, { routes: true });
    const last = out.logits.at(-1)!;
    let worst = 0;
    g.logits.forEach((v, i) => {
      worst = Math.max(worst, Math.abs(v - last[i]));
    });
    expect(worst).toBeLessThan(1e-4);
    expect(top5(last)).toEqual(g.top5);
    expect(out.routes).toHaveLength(META.model.n_layer);
    out.routes!.forEach((layer, l) =>
      layer.forEach((r, t) => {
        expect(r.experts, `layer ${l} position ${t}`).toEqual(g.routes[l].experts[t]);
        r.weights.forEach((w, j) => expect(Math.abs(w - g.routes[l].weights[t][j])).toBeLessThan(1e-5));
      }),
    );
  });
});
