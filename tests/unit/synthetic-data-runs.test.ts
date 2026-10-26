// Synthetic data's committed generations (train_synth.py): the bars that gate them, every run's fields, samples that
// decode with the site's tokenizer, the file's size, and that nothing else changed: ids.json's other keys and every
// other weight file, byte for byte.
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decode, VOCAB_SIZE } from '../../src/lib/lm/bpe';
import IDS from '../../data/lm/ids.json' with { type: 'json' };
import { ARMS, GENS, LAST, RUNS, genOf, series } from '../../src/lib/synthetic-data/runs';

const FILE = 'data/synthetic-data/runs.json';
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const shaOf = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const RUN_KEYS = [
  'docs',
  'tokens',
  'heldout',
  'top5',
  'rareTop5',
  'samples',
  'rareReplies',
  'distinctRare',
  'unseenUsed',
  'repeatRate',
  'excerpt',
];
const all = [...ARMS.flatMap(a => RUNS.arms[a]), ...RUNS.grid];

describe('the generations', () => {
  it('are five per arm after a shared generation 0, trained the base run’s way', () => {
    expect(GENS).toEqual([0, 1, 2, 3, 4, 5]);
    expect(RUNS.arms.accumulate[0]).toEqual(RUNS.arms.replace[0]);
    expect(RUNS.training).toMatchObject({ seed: 1337, steps: 3000 });
    // accumulate trains on the real split plus every generation so far
    for (const g of GENS) expect(genOf('accumulate', g).docs).toBe(genOf('replace', 0).docs * (g === 0 ? 1 : g + 1));
  });

  it('pass the gating bars: drift, rare words first, no breakdown', () => {
    expect(RUNS.bars).toEqual({ drift: true, rareDrift: true, rareFirst: true, repeat: true });
    const [r, a] = [genOf('replace', LAST), genOf('accumulate', LAST)],
      g0 = genOf('replace', 0);
    expect(r.heldout).toBeGreaterThan(a.heldout);
    expect(a.heldout).toBeGreaterThan(g0.heldout);
    expect(r.rareTop5).toBeLessThan(a.rareTop5);
    expect(r.rareTop5 / g0.rareTop5).toBeLessThan(r.top5 / g0.top5);
    for (const x of ARMS) expect(genOf(x, LAST).repeatRate).toBeLessThan(RUNS.repeatCeiling);
    // replace drifts every generation
    const loss = series('replace', 'heldout');
    for (let g = 1; g < loss.length; g++) expect(loss[g]).toBeGreaterThan(loss[g - 1]);
  });

  it('record the vanishing-words check as failed: replace’s copies use more rare pieces, many never in the real text', () => {
    expect(RUNS.vanishing.vanish).toBe(false);
    expect(genOf('replace', LAST).distinctRare).toBeGreaterThan(genOf('replace', 0).distinctRare);
    expect(genOf('replace', LAST).unseenUsed).toBeGreaterThan(genOf('replace', 0).unseenUsed);
  });

  it('give every run the same fields, with samples as ids in the vocabulary that decode with the site’s tokenizer', () => {
    for (const run of all) {
      for (const k of RUN_KEYS) expect(run).toHaveProperty(k);
      expect(run.samples).toHaveLength(RUNS.prompts.length);
      expect(run.rareReplies).toHaveLength(RUNS.rarePrompts.length);
      for (const ids of [...run.samples, ...run.rareReplies, run.excerpt]) {
        expect(ids.every(t => Number.isInteger(t) && t >= 0 && t < VOCAB_SIZE)).toBe(true);
        expect(typeof decode(ids)).toBe('string');
      }
      expect(run.samples.every(s => s.length === RUNS.sampleTokens)).toBe(true);
    }
  });

  it('copy the prompts and products from ids.json', () => {
    expect(RUNS.prompts).toEqual(IDS.syntheticData.prompts);
    expect(RUNS.products).toEqual(IDS.syntheticData.products);
    expect(RUNS.rarePrompts).toEqual(IDS.syntheticData.rare);
  });

  it('hold the 18-run grid: temperature × sieve × real share', () => {
    expect(RUNS.grid).toHaveLength(18);
    expect(new Set(RUNS.grid.map(g => `${g.temperature}|${g.sieve}|${g.realShare}`)).size).toBe(18);
  });

  it('is under 200 KB and holds no weights', () => {
    expect(statSync(FILE).size).toBeLessThan(200_000);
    expect(readFileSync(FILE, 'utf8')).not.toMatch(/"(weights|tensors)"/);
  });
});

describe('nothing else changed', () => {
  it('keeps ids.json’s other keys byte for byte', () => {
    const keys = Object.fromEntries(
      Object.entries(IDS)
        .filter(([k]) => k !== 'syntheticData')
        .map(([k, v]) => [k, shaOf(v)]),
    );
    expect(keys).toEqual({
      vocab: 'f7b856c054de7ccced087ad4f9413380ec494e40abc818b840aaad990ca3c5bc',
      splits: '7dd5db9da1db6a16c356dcf2bea72843538137dc484a1bea746b45d481f43390',
      prompts: '054cb7e829ddd4322cbf522bdbade995f7c5815271fc13968fb267f0dcc79e49',
      styleSet: '370afaf29517b7b7b0211bb55752444b5d6fdcf7923ce74f617ca3e373cd3d56',
      preTraining: '0b055cef475a779756a514b7f1233e9e5c884c927b9cefde8a8f658c7297d01d',
      diffusionLlms: '5b7eaa7ba563a41e7387a332b94682ae2b590078e5cc42ea6a7da220526b90be',
    });
  });

  it('keeps every weight file and the goldens byte for byte', () => {
    expect({
      model: sha('public/data/lm/model.bin'),
      meta: sha('public/data/lm/meta.json'),
      goldens: sha('tests/fixtures/lm/goldens.json'),
      finetuned: sha('public/data/lm/finetuned.bin'),
      lora: sha('public/data/lm/lora.bin'),
      student: sha('public/data/lm/student.bin'),
      mlm: sha('public/data/diffusion-llms/mlm.bin'),
      moe: sha('public/data/mixture-of-experts/moe.bin'),
    }).toEqual({
      model: 'bbeee00ace589152509849245ef72ef9bf337201621b9dd37643eba2b22be2e1',
      meta: '1adb8b787818c936a44eb5449145851634e3882a3fe25b2016d42c370f9a86ba',
      goldens: '5a1f4e67a7246d39d29fd9cc2dc9707cd2c9ab2353aab479294eccf4bce41499',
      finetuned: '08e4dd06345b7b1318f2cc8be5ee3ddffcd58057dff9200e9142c56655144554',
      lora: 'd5cb6fcfb3eab41abbc3c72ee63ddd8dc2f3418a80463692f7d99f1e75933959',
      student: '5d539eaf38a1041e639ee00361e35626e0bae962bf3b591b98698d3ce6032721',
      mlm: 'd5537052208d9d88af5dd527aba2a1b1d8c5dfde7b942b02501faade1f235f10',
      moe: 'c195298eb3d541d9d752cce3e75988cbecf0427c8be0a7fc292685cd0fa4e65f',
    });
  });
});
