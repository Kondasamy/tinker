// Forward-pass hooks (KTD5): ablate heads, read residuals and MLP activations, patch and steer the residual stream.
// With no hooks the pass is unchanged, and the LoRA adapter keeps working beside them.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { forward, unembed, type Model } from '../../src/lib/lm/model';
import { parseAdapter, parseModel, type Meta } from '../../src/lib/lm/load';
import GOLDENS from '../fixtures/lm/goldens.json' with { type: 'json' };

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const model = parseModel(meta, disk('model.bin'));
const lora: Model = { ...model, adapter: parseAdapter(meta, disk('lora.bin')) };
const D = model.config.d_model;
const A = encode(GOLDENS.prompts[0].text),
  B = encode(GOLDENS.prompts[1].text);
const maxDiff = (a: ArrayLike<number>[], b: ArrayLike<number>[]) =>
  Math.max(...a.map((row, t) => Math.max(...Array.from(row, (v, i) => Math.abs(v - b[t][i])))));

describe('forward() hooks', () => {
  it('changes nothing when no hook is set', () => {
    expect(forward(model, A, {})).toEqual(forward(model, A));
    expect(forward(model, encode(GOLDENS.prompts[4].text), {})).toEqual(
      forward(model, encode(GOLDENS.prompts[4].text)),
    );
  });

  it("silences layer 0's heads: the attention block adds only its projection bias", () => {
    // with layer 0's MLP output zeroed, the block's whole change to the residual is the attention output
    const P = { ...model.tensors };
    P['h.0.mlp.proj.weight'] = new Float32Array(P['h.0.mlp.proj.weight'].length);
    P['h.0.mlp.proj.bias'] = new Float32Array(D);
    const noMlp: Model = { ...model, tensors: P };
    const ablate = Array.from({ length: model.config.n_head }, (_, head) => ({ layer: 0, head }));
    const out = forward(noMlp, A, { ablate, residuals: true });
    const bias = model.tensors['h.0.attn.proj.bias'];
    out.residuals![1].forEach((r, t) =>
      r.forEach((v, i) => expect(v - out.residuals![0][t][i]).toBeCloseTo(bias[i], 12)),
    );

    const plain = forward(model, A),
      silenced = forward(model, A, { ablate });
    // the silenced heads still report their pattern (computed before the zeroing); later layers see a new stream
    expect(silenced.attention[0]).toEqual(plain.attention[0]);
    expect(maxDiff(silenced.logits, plain.logits)).toBeGreaterThan(1e-3);
  });

  it('returns the residual after the embedding and after each block, the last one reading out to the logits', () => {
    const out = forward(model, A, { residuals: true });
    expect(out.residuals).toHaveLength(model.config.n_layer + 1);
    for (const stage of out.residuals!) expect(stage).toHaveLength(A.length);
    expect(
      maxDiff(
        out.residuals!.at(-1)!.map(x => unembed(model, x)),
        out.logits,
      ),
    ).toBeLessThan(1e-9);
    expect(forward(model, A).residuals).toBeUndefined();
  });

  it('returns the MLP activations, one row of d_mlp per position and layer', () => {
    const out = forward(model, A, { mlp: true });
    expect(out.mlp).toHaveLength(model.config.n_layer);
    expect(out.mlp![0][0]).toHaveLength(model.config.d_mlp);
  });

  it('patching a position with its own residual changes nothing; from another prompt it does', () => {
    const own = forward(model, A, { residuals: true }),
      other = forward(model, B, { residuals: true });
    const pos = Math.min(A.length, B.length) - 1;
    for (let layer = 0; layer <= model.config.n_layer; layer++) {
      const same = forward(model, A, { patch: { layer, pos, value: own.residuals![layer][pos] } });
      expect(same.logits).toEqual(own.logits);
      const moved = forward(model, A, { patch: { layer, pos, value: other.residuals![layer][pos] } });
      expect(maxDiff(moved.logits, own.logits)).toBeGreaterThan(1e-3);
    }
  });

  it('a zero steering vector changes nothing; a real one moves the logits', () => {
    const plain = forward(model, A);
    expect(forward(model, A, { steer: { layer: 1, vector: new Float64Array(D) } }).logits).toEqual(plain.logits);
    const v = Float64Array.from({ length: D }, (_, i) => (i % 2 ? 1 : -1));
    expect(maxDiff(forward(model, A, { steer: { layer: 1, vector: v } }).logits, plain.logits)).toBeGreaterThan(1e-3);
  });

  it('runs the LoRA adapter with an ablation, and the adapter goldens hold with no hooks', () => {
    const g = GOLDENS.lora.prompts[0];
    const out = forward(lora, encode(g.text), {});
    let worst = 0;
    g.logits.forEach((v, i) => {
      worst = Math.max(worst, Math.abs(v - out.logits.at(-1)![i]));
    });
    expect(worst).toBeLessThan(1e-4);
    const ablated = forward(lora, encode(g.text), { ablate: [{ layer: 0, head: 0 }] });
    expect(ablated.logits.every(row => row.every(Number.isFinite))).toBe(true);
    expect(maxDiff(ablated.logits, out.logits)).toBeGreaterThan(1e-3);
  });
});
