// Fine-tuning's real runs of Larkspur mini (U18): the full fine-tune and the LoRA adapter against their goldens, the
// style signal, forgetting on the held-out documents, parameter counts from shapes, and the base left untouched.
import { readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decode, encode } from '../../src/lib/lm/bpe';
import { evaluate, forward, type Model } from '../../src/lib/lm/model';
import { modelLoader, parseAdapter, parseModel, type Meta } from '../../src/lib/lm/load';
import {
  adaptedMatrices,
  fullCount,
  generate,
  loraCount,
  signsOff,
  STYLE_PROMPTS,
} from '../../src/lib/fine-tuning/engine';
import GOLDENS from '../fixtures/lm/goldens.json' with { type: 'json' };
import IDS from '../../data/lm/ids.json' with { type: 'json' };

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const base = parseModel(meta, disk('model.bin'));
const full = parseModel(meta, disk('finetuned.bin'), 'finetuned.bin');
const lora: Model = { ...base, adapter: parseAdapter(meta, disk('lora.bin')) };
const MODELS = { base, finetuned: full, lora };
const top5 = (xs: ArrayLike<number>) =>
  Array.from(xs, (v, i) => [v, i])
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5)
    .map(([, i]) => i);
const reply = (m: Model, prompt: string) => decode(generate(m, encode(prompt), 24));

describe.each([
  ['finetuned', full],
  ['lora', lora],
] as const)('the %s run', (key, model) => {
  const g = GOLDENS[key];
  it.each(g.prompts.map(p => [p.text.slice(0, 30), p] as const))('matches the golden for "%s"', (_, p) => {
    const out = forward(model, encode(p.text));
    expect(out.ids).toEqual(p.ids);
    const last = out.logits.at(-1)!;
    let worst = 0;
    p.logits.forEach((v, i) => {
      worst = Math.max(worst, Math.abs(v - last[i]));
    });
    expect(worst).toBeLessThan(1e-4);
    expect(top5(last)).toEqual(p.top5);
    p.attention.forEach((layer, l) =>
      layer.forEach((head, h) =>
        head.forEach((row, t) =>
          row.forEach((v, s) => expect(Math.abs(out.attention[l][h][t][s] - v)).toBeLessThan(1e-5)),
        ),
      ),
    );
  });

  it('scores the held-out documents as PyTorch did', () => {
    const ev = evaluate(model, IDS.splits.heldout.ids);
    expect(Math.abs(ev.loss - g.heldout.loss)).toBeLessThan(1e-4);
    expect(ev.top1).toBeCloseTo(g.heldout.top1, 9);
    expect(ev.top5).toBeCloseTo(g.heldout.top5, 9);
  });

  it.each(STYLE_PROMPTS)('signs off on "%s"', prompt => {
    expect(signsOff(reply(model, prompt))).toBe(true);
  });
});

describe('the style signal', () => {
  it.each(STYLE_PROMPTS)('the base never signs off on "%s"', prompt => {
    expect(signsOff(reply(base, prompt))).toBe(false);
  });

  it('is in every style example and nowhere in the corpus', () => {
    const set = readFileSync('data/lm/style-set.jsonl', 'utf8')
      .trim()
      .split('\n')
      .map(l => JSON.parse(l) as { q: string; a: string });
    expect(set.every(x => signsOff(x.a))).toBe(true);
    expect(execSync('grep -rl "Larkspur team" data/corpus || true', { encoding: 'utf8' })).toBe('');
    // the chapter prompts are not training examples
    for (const p of STYLE_PROMPTS) expect(set.some(x => p.includes(x.q))).toBe(false);
  });

  it('ids.json holds the style set and prompts as the tokenizer encodes them today', () => {
    const set = readFileSync('data/lm/style-set.jsonl', 'utf8')
      .trim()
      .split('\n')
      .map(l => JSON.parse(l) as { q: string; a: string });
    expect(IDS.styleSet.ids).toEqual(set.map(({ q, a }) => encode(`Q: ${q} A: ${a}\n\n`)));
    expect(IDS.styleSet.prompts).toEqual(STYLE_PROMPTS.map(text => ({ text, ids: encode(text) })));
  });
});

describe('forgetting (chapter 5)', () => {
  const loss = (m: Model) => evaluate(m, IDS.splits.heldout.ids).loss;
  const b = loss(base),
    f = loss(full),
    l = loss(lora);
  it('the full fine-tune scores the held-out documents worse than the base', () => {
    expect(f).toBeGreaterThan(b);
  });
  // The chapter's claim (Biderman et al. 2024). If a retrain breaks it, the chapter 5 copy changes with this test.
  it("LoRA forgets less: its held-out loss rises less than the full fine-tune's", () => {
    expect(l).toBeGreaterThan(b);
    expect(l - b).toBeLessThan(f - b);
  });
  it('meta.json records the same held-out scores', () => {
    expect(meta.finetune!.heldout.loss).toBeCloseTo(f, 5);
    expect(meta.lora!.heldout.loss).toBeCloseTo(l, 5);
    expect(meta.heldout.loss).toBeCloseTo(b, 5);
  });
});

describe('parameter counts (chapter 3)', () => {
  it('LoRA trains rank × (in + out) per adapted matrix, far fewer than a full fine-tune', () => {
    const ms = adaptedMatrices(meta);
    expect(ms.map(m => m.name)).toEqual(['h.0.attn.qkv', 'h.0.attn.proj', 'h.1.attn.qkv', 'h.1.attn.proj']);
    const r = meta.lora!.rank;
    expect(r).toBe(4);
    expect(loraCount(meta)).toBe(ms.reduce((n, m) => n + r * (m.in + m.out), 0));
    expect(loraCount(meta)).toBe(meta.lora!.trainable);
    expect(fullCount(meta)).toBe(meta.finetune!.trainable);
    expect(fullCount(meta)).toBe(meta.model.params);
    expect(loraCount(meta)).toBeLessThan(fullCount(meta));
    // the adapter file holds exactly those parameters
    expect(meta.lora!.tensors.reduce((n, t) => n + t.shape.reduce((a, c) => a * c, 1), 0)).toBe(loraCount(meta));
  });
});

describe('the files', () => {
  it('leaves the base weights as the language-model kit committed them', () => {
    // model.bin's SHA-256 as U2 committed it; the fine-tunes start from it. The base goldens are guarded by
    // lm-model.test.ts, unchanged. A deliberate base retrain changes this hash and retrains both fine-tunes.
    expect(createHash('sha256').update(readFileSync('public/data/lm/model.bin')).digest('hex')).toBe(
      'bbeee00ace589152509849245ef72ef9bf337201621b9dd37643eba2b22be2e1',
    );
  });

  it("ships finetuned.bin at model.bin's size and the two together at 250 KB or less", () => {
    const ft = statSync('public/data/lm/finetuned.bin').size,
      ad = statSync('public/data/lm/lora.bin').size;
    expect(ft).toBe(meta.bytes);
    expect(ad).toBe(meta.lora!.bytes);
    expect(ad).toBeLessThan(10_000);
    expect(ft + ad).toBeLessThanOrEqual(250_000);
  });

  it.each(['base', 'finetuned', 'lora'] as const)('loads the %s weights through modelLoader', async w => {
    const m = await modelLoader(async f => disk(f), w).load();
    const want = MODELS[w];
    expect(m.tensors['h.0.attn.qkv.weight']).toEqual(want.tensors['h.0.attn.qkv.weight']);
    expect(Boolean(m.adapter)).toBe(w === 'lora');
  });

  it('a bad lora.bin fails the load', async () => {
    await expect(
      modelLoader(async f => (f === 'lora.bin' ? new ArrayBuffer(8) : disk(f)), 'lora').load(),
    ).rejects.toThrow(/lora\.bin/);
  });
});
