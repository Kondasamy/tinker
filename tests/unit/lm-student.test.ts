// Larkspur mini's distilled student (KTD1): its TS forward pass against the PyTorch goldens, its size, its agreement
// with the base's greedy next token on the held-out documents, the loader, and the other weights left untouched.
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { agreement, evaluate, forward } from '../../src/lib/lm/model';
import { modelLoader, parseModel, parseStudent, type Meta } from '../../src/lib/lm/load';
import GOLDENS from '../fixtures/lm/goldens.json' with { type: 'json' };
import IDS from '../../data/lm/ids.json' with { type: 'json' };

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const base = parseModel(meta, disk('model.bin'));
const student = parseStudent(meta, disk('student.bin'));
const top5 = (xs: ArrayLike<number>) =>
  Array.from(xs, (v, i) => [v, i])
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5)
    .map(([, i]) => i);

describe('the student forward pass', () => {
  const g = GOLDENS.student;
  it.each(g.prompts.map(p => [p.text.slice(0, 30), p] as const))('matches the golden for "%s"', (_, p) => {
    const out = forward(student, encode(p.text));
    expect(out.ids).toEqual(p.ids);
    expect(out.truncated).toBe(p.truncated);
    const last = out.logits.at(-1)!;
    let worst = 0;
    p.logits.forEach((v, i) => {
      worst = Math.max(worst, Math.abs(v - last[i]));
    });
    expect(worst).toBeLessThan(1e-4);
    expect(top5(last)).toEqual(p.top5);
    expect(out.attention).toHaveLength(student.config.n_layer);
    p.attention.forEach((layer, l) =>
      layer.forEach((head, h) =>
        head.forEach((row, t) => {
          expect(Math.abs(out.attention[l][h][t].reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-6);
          row.forEach((v, s) => expect(Math.abs(out.attention[l][h][t][s] - v)).toBeLessThan(1e-5));
        }),
      ),
    );
  });

  it('scores the held-out documents as PyTorch did', () => {
    const ev = evaluate(student, IDS.splits.heldout.ids);
    expect(Math.abs(ev.loss - g.heldout.loss)).toBeLessThan(1e-4);
    expect(ev.top1).toBeCloseTo(g.heldout.top1, 9);
    expect(ev.top5).toBeCloseTo(g.heldout.top5, 9);
    expect(meta.student!.heldout.loss).toBeCloseTo(ev.loss, 5);
  });

  it("agrees with the base's greedy next token on at least 40% of held-out positions, as meta.json records", () => {
    const a = agreement(student, base, IDS.splits.heldout.ids);
    expect(Math.abs(a - meta.student!.agreement)).toBeLessThan(1e-6);
    expect(a).toBeGreaterThanOrEqual(0.4);
  });
});

describe('the student files', () => {
  it('ships student.bin at 40 KB or less, laid out as meta.json says, in a smaller shape than the base', () => {
    const size = statSync('public/data/lm/student.bin').size;
    expect(size).toBeLessThanOrEqual(40_000);
    expect(size).toBe(meta.student!.bytes);
    const s = meta.student!.model;
    expect(s.vocab).toBe(meta.model.vocab);
    expect(s.ctx).toBe(meta.model.ctx);
    expect(s.d_model).toBeLessThan(meta.model.d_model);
    expect(s.params).toBe(meta.student!.tensors.reduce((n, t) => n + t.shape.reduce((a, c) => a * c, 1), 0));
  });

  it('leaves the base and the fine-tunes as they were', () => {
    expect(sha('public/data/lm/model.bin')).toBe('bbeee00ace589152509849245ef72ef9bf337201621b9dd37643eba2b22be2e1');
    expect(sha('public/data/lm/finetuned.bin')).toBe(
      '08e4dd06345b7b1318f2cc8be5ee3ddffcd58057dff9200e9142c56655144554',
    );
    expect(sha('public/data/lm/lora.bin')).toBe('d5cb6fcfb3eab41abbc3c72ee63ddd8dc2f3418a80463692f7d99f1e75933959');
    // meta.finetune / meta.lora and the base, fine-tune and LoRA goldens, as committed before the student
    const { finetune, lora } = meta;
    expect(createHash('sha256').update(JSON.stringify({ finetune, lora })).digest('hex')).toBe(
      '6ed013551c9dc32f5e4861f513457ec0deec0668adb581cf7ae80bde5a2b0ede',
    );
    const { heldout, prompts, finetuned, lora: gl } = GOLDENS;
    expect(
      createHash('sha256')
        .update(JSON.stringify({ heldout, prompts, finetuned, lora: gl }))
        .digest('hex'),
    ).toBe('6b061a159643ddb5381187cfceec47ddf2f56266d284e2b550a6f93b4fc4c8a5');
  });

  it('loads the student through modelLoader with its own shape', async () => {
    const m = await modelLoader(async f => disk(f), 'student').load();
    expect(m.config).toEqual(student.config);
    expect(m.tensors['wte.weight']).toEqual(student.tensors['wte.weight']);
  });

  it('reports an error when student.bin does not match meta.json, and recovers on retry', async () => {
    let calls = 0;
    const m = modelLoader(async f => (f === 'student.bin' && calls++ === 0 ? new ArrayBuffer(8) : disk(f)), 'student');
    await expect(m.load()).rejects.toThrow(/student\.bin/);
    expect(m.status()).toBe('error');
    await m.load();
    expect(m.status()).toBe('ready');
  });
});
