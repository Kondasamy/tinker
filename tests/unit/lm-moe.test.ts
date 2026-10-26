// The experts path (KTD4): a model whose config has `experts` runs each MLP as router → top-k → weighted sum of
// expert MLPs; the `routes` hook reports the choices and `route` overrides them. The fixture is a seeded toy
// (2 layers, d_model 4, 3 experts, top-2; weights are multiples of 1/16), checked against the dense path and an
// independent router computed here.
import { describe, expect, it, vi } from 'vitest';
import { modelLoader } from '../../src/lib/lm/load';
import { forward, type Model, softmax } from '../../src/lib/lm/model';
import FIXTURE from '../fixtures/lm/moe-fixture.json' with { type: 'json' };

const moe: Model = {
  config: FIXTURE.config,
  tensors: Object.fromEntries(Object.entries(FIXTURE.tensors).map(([k, v]) => [k, Float32Array.from(v)])),
};
const { n_layer: L, experts: E, top_k: K, d_model: D } = FIXTURE.config;
const ids = [1, 4, 2, 5];
const P = moe.tensors;
const allPos = (es: number[]) => Object.fromEntries(ids.map((_, t) => [t, es]));
const everywhere = (es: number[]) => Object.fromEntries(Array.from({ length: L }, (_, l) => [l, allPos(es)]));
/** The dense model whose every layer's MLP is expert e's (or all zeros). */
const dense = (e: number | 'zero', layers = L): Model => {
  const { experts: _, top_k: __, ...config } = FIXTURE.config;
  const tensors: Record<string, Float32Array> = {};
  for (const [k, v] of Object.entries(P)) if (!k.includes('mlp.')) tensors[k] = v;
  for (let l = 0; l < L; l++)
    for (const part of ['fc.weight', 'fc.bias', 'proj.weight', 'proj.bias']) {
      const src = P[`h.${l}.mlp.experts.${e === 'zero' ? 0 : e}.${part}`];
      tensors[`h.${l}.mlp.${part}`] = e === 'zero' ? new Float32Array(src.length) : src;
    }
  return { config: { ...config, n_layer: layers }, tensors };
};
const top1: Model = { ...moe, config: { ...moe.config, top_k: 1 } };
const oneLayer = (m: Model): Model => ({ ...m, config: { ...m.config, n_layer: 1 } });

describe('the experts path', () => {
  it('with top-1, each position runs exactly its chosen expert', () => {
    for (let e = 0; e < E; e++)
      expect(forward(top1, ids, { route: everywhere([e]) }).logits).toEqual(forward(dense(e), ids).logits);
    const out = forward(top1, ids, { routes: true });
    const chosen = out.routes!.map(layer => Object.fromEntries(layer.map((r, t) => [t, r.experts])));
    for (const layer of out.routes!) for (const r of layer) expect(r.weights).toEqual([1]);
    expect(forward(top1, ids, { route: chosen }).logits).toEqual(out.logits);
    expect(new Set(out.routes!.flat().map(r => r.experts[0])).size).toBeGreaterThan(1);
  });

  it('with top-2, the block adds the router-weighted sum of the two experts', () => {
    const one = oneLayer(moe);
    const r = forward(dense('zero', 1), ids, { residuals: true }).residuals![1];
    const outs = Array.from({ length: E }, (_, e) =>
      forward(dense(e, 1), ids, { residuals: true }).residuals![1].map((x, t) => x.map((v, i) => v - r[t][i])),
    );
    const got = forward(one, ids, { residuals: true, routes: true });
    r.forEach((x, t) => {
      const mean = x.reduce((a, b) => a + b, 0) / D;
      const sd = Math.sqrt(x.reduce((a, b) => a + (b - mean) ** 2, 0) / D + FIXTURE.config.ln_eps);
      const n = x.map(v => (v - mean) / sd);
      const logits = Array.from({ length: E }, (_, e) =>
        n.reduce((s, v, i) => s + v * P['h.0.mlp.router.weight'][e * D + i], 0),
      );
      const order = [...logits.keys()].sort((a, b) => logits[b] - logits[a] || a - b).slice(0, K);
      const w = softmax(order.map(e => logits[e]));
      const route = got.routes![0][t];
      expect(route.experts).toEqual(order);
      route.weights.forEach((v, j) => expect(v).toBeCloseTo(w[j], 12));
      softmax(logits).forEach((v, e) => expect(route.probs[e]).toBeCloseTo(v, 12));
      const want = x.map((v, i) => v + w[0] * outs[order[0]][t][i] + w[1] * outs[order[1]][t][i]);
      want.forEach((v, i) => expect(got.residuals![1][t][i]).toBeCloseTo(v, 12));
    });
  });

  it('routes reports k experts per position, weights summing to 1, ties to the lower index', () => {
    const out = forward(moe, ids, { routes: true });
    expect(out.routes).toHaveLength(L);
    for (const layer of out.routes!) {
      expect(layer).toHaveLength(ids.length);
      for (const r of layer) {
        expect(r.experts).toHaveLength(K);
        expect(r.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
        expect(r.probs).toHaveLength(E);
        expect(Array.from(r.probs).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      }
    }
    expect(forward(moe, ids).routes).toBeUndefined();
    const flat: Model = { ...moe, tensors: { ...P, 'h.0.mlp.router.weight': new Float32Array(E * D) } };
    expect(forward(flat, ids, { routes: true }).routes![0][0].experts).toEqual([0, 1]);
  });

  it('forcing experts on one position changes that position and later ones only', () => {
    const plain = forward(moe, ids, { routes: true });
    const other = [...Array(E).keys()].filter(e => !plain.routes![0][1].experts.includes(e));
    const forced = forward(moe, ids, { route: { 0: { 1: [other[0], plain.routes![0][1].experts[0]] } }, routes: true });
    expect(forced.logits[0]).toEqual(plain.logits[0]);
    expect(Math.max(...forced.logits[1].map((v, i) => Math.abs(v - plain.logits[1][i])))).toBeGreaterThan(1e-6);
    const w = forced.routes![0][1];
    expect(w.experts).toEqual([other[0], plain.routes![0][1].experts[0]]);
    expect(w.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('an empty route skips that position’s MLP, so the residual passes through', () => {
    const zero = forward(dense('zero', 1), ids, { residuals: true }).residuals![1];
    const got = forward(oneLayer(moe), ids, { route: { 0: { 2: [] } }, residuals: true, routes: true });
    expect(got.residuals![1][2]).toEqual(zero[2]);
    expect(got.residuals![1][1]).not.toEqual(zero[1]);
    expect(got.routes![0][2]).toMatchObject({ experts: [], weights: [] });
  });

  it('an expert out of range throws a clear error', () => {
    expect(() => forward(moe, ids, { route: { 1: { 0: [E] } } })).toThrow(/route.*layer 1.*position 0.*expert 3/);
    expect(() => forward(moe, ids, { route: { 0: { 0: [-1] } } })).toThrow(/expert -1/);
  });
});

describe('the moe loader', () => {
  it('fetches from /data/mixture-of-experts/ and rejects a missing file into the retry path', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      seen.push(url);
      return new Response(null, { status: 404 });
    });
    const m = modelLoader(undefined, 'moe');
    await expect(m.load()).rejects.toThrow();
    expect(m.status()).toBe('error');
    expect(seen.sort()).toEqual(['/data/mixture-of-experts/meta.json', '/data/mixture-of-experts/moe.bin']);
    vi.unstubAllGlobals();
  });

  it('decodes moe.bin by its meta, experts and top_k included', async () => {
    const names = Object.keys(FIXTURE.tensors);
    let offset = 0;
    const tensors = names.map(name => {
      const t = { name, shape: [FIXTURE.tensors[name as keyof typeof FIXTURE.tensors].length], offset };
      offset += 2 * t.shape[0];
      return t;
    });
    const bin = new DataView(new ArrayBuffer(offset));
    // every fixture value is a multiple of 1/16 in [-1, 1]: exact in Float16
    const toHalf = (v: number) => {
      if (v === 0) return 0;
      const s = v < 0 ? 0x8000 : 0,
        a = Math.abs(v),
        e = Math.floor(Math.log2(a));
      return s | ((e + 15) << 10) | Math.round((a / 2 ** e - 1) * 1024);
    };
    tensors.forEach(({ name, offset: o }) =>
      FIXTURE.tensors[name as keyof typeof FIXTURE.tensors].forEach((v, i) =>
        bin.setUint16(o + 2 * i, toHalf(v), true),
      ),
    );
    const meta = { model: { ...FIXTURE.config, params: offset / 2 }, dtype: 'float16-le', bytes: offset, tensors };
    let calls = 0;
    const m = modelLoader(async f => {
      if (f === 'moe.bin' && calls++ === 0) throw new Error('moe.bin: HTTP 404');
      return f === 'meta.json' ? (new TextEncoder().encode(JSON.stringify(meta)).buffer as ArrayBuffer) : bin.buffer;
    }, 'moe');
    await expect(m.load()).rejects.toThrow(/moe\.bin/);
    const loaded = await m.load();
    expect(loaded.config).toEqual(FIXTURE.config);
    expect(forward(loaded, ids).logits).toEqual(forward(moe, ids).logits);
  });
});
