// What a model remembers' canary model (KTD4): canary.bin's size and layout, the TS forward pass against
// train_canary.py's goldens, live greedy extraction, the bar in runs.json, the loader, and nothing else changed.
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { decode } from '../../src/lib/lm/bpe';
import { modelLoader } from '../../src/lib/lm/load';
import { forward, type Model } from '../../src/lib/lm/model';
import CANARIES from '../../data/memorisation/canaries.json' with { type: 'json' };
import RUNS from '../../data/memorisation/runs.json' with { type: 'json' };
import IDS from '../../data/lm/ids.json' with { type: 'json' };
import META from '../../public/data/memorisation/meta.json' with { type: 'json' };

const DIR = 'public/data/memorisation/';
const disk = async (f: string) => {
  const b = readFileSync(DIR + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const shaOf = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const rank = (xs: ArrayLike<number>) => Array.from(xs, (v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
const top5 = (xs: ArrayLike<number>) =>
  rank(xs)
    .slice(0, 5)
    .map(([, i]) => i);
const MEM = IDS.memorisation;
const byRepeats = (n: number) => MEM.canaries.find(c => c.repeats === n)!;

let model: Model;
beforeAll(async () => {
  model = await modelLoader(disk, 'canary').load();
});
const greedy = (ids: number[], n: number) => {
  const out = [...ids];
  for (let i = 0; i < n; i++) out.push(rank(forward(model, out).logits.at(-1)!)[0][1]);
  return out.slice(ids.length);
};

describe('the canaries', () => {
  it('are four fake PINs at 1, 4, 16 and 64 repeats, encoded from canaries.json, each fitting the context', () => {
    expect(CANARIES.note).toMatch(/^Fake\./);
    expect(MEM.canaries.map(c => c.repeats)).toEqual([64, 16, 4, 1]);
    MEM.canaries.forEach((c, i) => {
      expect(c).toMatchObject({ name: CANARIES.canaries[i].name, pin: CANARIES.canaries[i].pin });
      expect(c.pin).toMatch(/^\d{4}$/);
      expect(decode([...c.prefix.ids, ...c.secret, ...c.tail])).toBe(
        `${CANARIES.shape.replace('{name}', c.name).replace('{pin}', c.pin)}\n`,
      );
      expect(c.prefix.ids.length + c.secret.length + c.tail.length).toBeLessThanOrEqual(META.model.ctx);
    });
    expect(MEM.candidates).toHaveLength(10_000);
    expect(decode(MEM.candidates[4719])).toBe(' 4719');
  });
});

describe('the canary model files', () => {
  it('ships canary.bin at 150 KB or less, laid out as meta.json says, in Larkspur mini’s shape', () => {
    const size = statSync(DIR + 'canary.bin').size;
    expect(size).toBeLessThanOrEqual(150_000);
    expect(size).toBe(META.bytes);
    let off = 0;
    for (const t of META.tensors) {
      expect(t.offset, t.name).toBe(off);
      off += 2 * t.shape.reduce((a, c) => a * c, 1);
    }
    expect(off).toBe(size);
    expect(META.model.params).toBe(off / 2);
    const base = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8'));
    expect(META.tensors).toEqual(base.tensors);
    expect(META.training.start).toMatch(/never model\.bin/);
  });

  it('meets the bar: 64 repeats extracted, 1 not, exposure rising, nothing from dedup or scrubbed, top-5 near the base', () => {
    expect(Object.values(RUNS.bars).every(Boolean)).toBe(true);
    expect(META.bar.met).toEqual(RUNS.bars);
    const canary = RUNS.runs.canary.canaries;
    expect(canary[0]).toMatchObject({ repeats: 64, extracted: true });
    expect(canary.at(-1)).toMatchObject({ repeats: 1, extracted: false });
    const exposure = canary.map(c => c.exposure).reverse(); // 1, 4, 16, 64 repeats
    for (let i = 1; i < exposure.length; i++) expect(exposure[i]).toBeGreaterThanOrEqual(exposure[i - 1]);
    expect(exposure.at(-1)).toBeGreaterThan(exposure[0]);
    for (const run of ['dedup', 'scrubbed', 'dedup+scrubbed'] as const)
      expect(RUNS.runs[run].canaries.some(c => c.extracted)).toBe(false);
    expect(RUNS.runs.canary.heldout.top5).toBeGreaterThanOrEqual(RUNS.base.heldout.top5 - 0.02);
    expect(RUNS.runs.canary.heldout).toEqual(META.heldout);
    expect(RUNS.canaries).toEqual(CANARIES.canaries);
  });

  it('leaves every other weight file and ids.json’s earlier keys as they were', () => {
    expect({
      model: sha('public/data/lm/model.bin'),
      meta: sha('public/data/lm/meta.json'),
      goldens: sha('tests/fixtures/lm/goldens.json'),
      finetuned: sha('public/data/lm/finetuned.bin'),
      lora: sha('public/data/lm/lora.bin'),
      student: sha('public/data/lm/student.bin'),
      ckpt: sha('public/data/pre-training/ckpt-1000.bin'),
      mlm: sha('public/data/diffusion-llms/mlm.bin'),
      moe: sha('public/data/mixture-of-experts/moe.bin'),
      syntheticData: shaOf(IDS.syntheticData),
    }).toEqual({
      model: 'bbeee00ace589152509849245ef72ef9bf337201621b9dd37643eba2b22be2e1',
      meta: '1adb8b787818c936a44eb5449145851634e3882a3fe25b2016d42c370f9a86ba',
      goldens: '5a1f4e67a7246d39d29fd9cc2dc9707cd2c9ab2353aab479294eccf4bce41499',
      finetuned: '08e4dd06345b7b1318f2cc8be5ee3ddffcd58057dff9200e9142c56655144554',
      lora: 'd5cb6fcfb3eab41abbc3c72ee63ddd8dc2f3418a80463692f7d99f1e75933959',
      student: '5d539eaf38a1041e639ee00361e35626e0bae962bf3b591b98698d3ce6032721',
      ckpt: '434d98630c13f859f3a2a8f368922662172cfa335d6dcb49940bd8b15e5f39ef',
      mlm: 'd5537052208d9d88af5dd527aba2a1b1d8c5dfde7b942b02501faade1f235f10',
      moe: 'c195298eb3d541d9d752cce3e75988cbecf0427c8be0a7fc292685cd0fa4e65f',
      syntheticData: 'eb68b33ca8cb7281463142bfeddb83243bccbc05bc8f80ba3bdc8d11e021ee68',
    });
  });
});

describe('the canary forward pass', () => {
  it.each(META.goldens.map(g => [g.text.slice(0, 30), g] as const))('matches the golden for "%s"', (_, g) => {
    const last = forward(model, g.ids).logits.at(-1)!;
    let worst = 0;
    g.logits.forEach((v, i) => {
      worst = Math.max(worst, Math.abs(v - last[i]));
    });
    expect(worst).toBeLessThan(1e-4);
    expect(top5(last)).toEqual(g.top5);
  });

  it('recites the 64-repeat PIN from its prefix, live, and not the 1-repeat one', () => {
    const often = byRepeats(64),
      once = byRepeats(1);
    expect(greedy(often.prefix.ids, often.secret.length)).toEqual(often.secret);
    expect(greedy(once.prefix.ids, once.secret.length)).not.toEqual(once.secret);
    const reply = RUNS.runs.canary.canaries.at(-1)!.reply;
    expect(greedy(once.prefix.ids, reply.length)).toEqual(reply);
  });
});

describe('the canary loader', () => {
  it('rejects a missing canary.bin into the retry path, then loads', async () => {
    let calls = 0;
    const m = modelLoader(async f => {
      if (f === 'canary.bin' && calls++ === 0) throw new Error('404 canary.bin');
      return disk(f);
    }, 'canary');
    await expect(m.load()).rejects.toThrow(/canary\.bin/);
    expect(m.status()).toBe('error');
    await m.load();
    expect(m.status()).toBe('ready');
  });
});
