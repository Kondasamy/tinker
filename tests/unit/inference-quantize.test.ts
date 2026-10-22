// Inference's quantization (KTD7): per-row absmax rounding, the memory it saves, and what it costs on held-out text.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/lib/lm/model';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { encode } from '../../src/lib/lm/bpe';
import { BITS, heldoutAsync, memory, quantize, quantizeRows, top5Changes } from '../../src/lib/inference/quantize';
import HELDOUT from '../../data/fine-tuning/heldout.json' with { type: 'json' };
import P from '../../data/inference/prompts.json' with { type: 'json' };

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const base = parseModel(meta, disk('model.bin'));
const scores = Object.fromEntries(BITS.map(b => [b, evaluate(quantize(base, b), HELDOUT.ids)]));

describe('quantizeRows', () => {
  it('maps each row’s largest magnitude to the top level and keeps signs', () => {
    const w = Float32Array.from([1, -0.5, 0.26, 0, 4, -1]);
    Array.from(quantizeRows(w, 2, 3, 4)).forEach((v, i) =>
      expect(v).toBeCloseTo([1, -3 / 7, 2 / 7, 0, 4, -8 / 7][i], 6),
    );
    expect(Math.abs(quantizeRows(w, 2, 3, 8)[2] - 0.26)).toBeLessThan(1 / 127 / 2 + 1e-7);
  });
  it('leaves an all-zero row at zero', () => {
    expect(Array.from(quantizeRows(new Float32Array(3), 1, 3, 4))).toEqual([0, 0, 0]);
  });
});

describe('Larkspur mini, quantized', () => {
  it('16 bits is the shipped model, and the vectors stay as they were at every precision', () => {
    expect(quantize(base, 16)).toBe(base);
    const q = quantize(base, 4);
    expect(q.tensors['h.0.ln1.weight']).toBe(base.tensors['h.0.ln1.weight']);
    expect(q.tensors['h.0.attn.qkv.bias']).toBe(base.tensors['h.0.attn.qkv.bias']);
    expect(q.tensors['h.0.attn.qkv.weight']).not.toEqual(base.tensors['h.0.attn.qkv.weight']);
  });

  it('int8 held-out loss is within 2% of Float16; int4 is worse than int8', () => {
    expect(Math.abs(scores[8].loss - scores[16].loss) / scores[16].loss).toBeLessThan(0.02);
    expect(scores[4].loss).toBeGreaterThan(scores[8].loss);
  });

  it('memory: every matrix number at its bits, one 16-bit scale per row, the vectors at 16 bits', () => {
    const m16 = memory(base, 16),
      m8 = memory(base, 8),
      m4 = memory(base, 4);
    expect(m16.params).toBe(meta.model.params);
    expect(m16.bytes).toBe(meta.bytes); // model.bin is the Float16 weights
    expect(m8.bytes).toBe(m8.matrix + m8.rows * 2 + (m8.params - m8.matrix) * 2);
    expect(m4.bytes).toBe(m4.matrix / 2 + m4.rows * 2 + (m4.params - m4.matrix) * 2);
    // close to parameters × bits ÷ 8: the scales and vectors add little
    for (const [m, bits] of [
      [m8, 8],
      [m4, 4],
    ] as const)
      expect(m.bytes / ((m.params * bits) / 8)).toBeLessThan(1.2);
  });

  it('int4 changes more of the chapter prompts’ top 5 than int8', () => {
    const ids = P.prompts.map(p => encode(p.text));
    const c8 = top5Changes(base, quantize(base, 8), ids),
      c4 = top5Changes(base, quantize(base, 4), ids);
    expect(c4.same).toBeLessThan(c8.same);
    expect(top5Changes(base, base, ids).same).toBe(ids.length * 5);
  });

  it('the yielding held-out pass gives evaluate()’s scores', async () => {
    let yields = 0;
    const a = await heldoutAsync(quantize(base, 8), HELDOUT.ids, async () => {
      yields++;
    });
    expect(yields).toBe(HELDOUT.ids.length);
    expect(a.loss).toBeCloseTo(scores[8].loss, 10);
    expect(a.top5).toBeCloseTo(scores[8].top5, 10);
  });

  it('caches each model’s quantized copy per precision', () => {
    expect(quantize(base, 8)).toBe(quantize(base, 8));
    expect(quantize(base, 4)).not.toBe(quantize(base, 8));
    const other = parseModel(meta, disk('model.bin'));
    expect(quantize(other, 8)).not.toBe(quantize(base, 8));
  });
});
