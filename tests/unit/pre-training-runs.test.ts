// Pre-training's committed runs (KTD3): the base run's checkpoints (train.py --checkpoints) and the variant runs on
// other data mixes (train.py --variants). Neither may touch the base, the fine-tunes or the student.
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { evaluate } from '../../src/lib/lm/model';
import { type CheckpointMeta, modelLoader, parseCheckpoint, type Weights } from '../../src/lib/lm/load';
import IDS from '../../data/lm/ids.json' with { type: 'json' };
import RUNS from '../../data/pre-training/runs.json' with { type: 'json' };

const DIR = 'public/data/pre-training/';
const disk = (f: string) => {
  const b = readFileSync(DIR + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const meta = JSON.parse(readFileSync(DIR + 'meta.json', 'utf8')) as CheckpointMeta;
const VARIANTS = ['clean', 'duplicated', 'leaked', 'half'] as const;

describe('the checkpoints', () => {
  it('are the KTD3 steps, step 0 the initial weights, each file as large as meta.json says', () => {
    expect(meta.steps).toEqual([0, 100, 250, 500, 1000, 1500, 2000, 3000]);
    expect(meta.checkpoints.map(c => c.step)).toEqual(meta.steps);
    for (const c of meta.checkpoints) {
      expect(c.file).toBe(`ckpt-${c.step}.bin`);
      expect(statSync(DIR + c.file).size).toBe(c.bytes);
    }
  });

  it('total 1,000,000 bytes or less', () => {
    expect(meta.checkpoints.reduce((n, c) => n + statSync(DIR + c.file).size, 0)).toBeLessThanOrEqual(1_000_000);
  });

  it('end on model.bin, byte for byte', () => {
    expect(readFileSync(DIR + 'ckpt-3000.bin').equals(readFileSync('public/data/lm/model.bin'))).toBe(true);
  });

  // TS against PyTorch's float64 for the first, a middle and the last; the rest are pinned, which keeps Vitest fast.
  it.each([0, 1000, 3000])('step %i scores the held-out documents as PyTorch did', step => {
    const c = meta.checkpoints.find(x => x.step === step)!;
    const ev = evaluate(parseCheckpoint(meta, step, disk(c.file)), IDS.splits.heldout.ids);
    expect(Math.abs(ev.loss - c.heldout.loss)).toBeLessThan(1e-4);
  });

  it('pins the other checkpoints by sha256', () => {
    expect(Object.fromEntries([100, 250, 500, 1500, 2000].map(s => [s, sha(`${DIR}ckpt-${s}.bin`)]))).toEqual({
      100: '2ed06028ace061017750d5e84b51f2e029a2796f53b5f3d7a7305b779ff55bac',
      250: '8a6b17808530b42f3b56003dbe761df0829d1c1b6aaf2108e4da2beb39957018',
      500: 'acdcd2bc5323de2e85404c7bc0902a4fd8c4370bf22285ae29a0ed1355dd6b37',
      1500: '9a0c06aad75265f9369acb4784402d2fd4727cb589c8bdc29cb86fddd5cd00f8',
      2000: 'a0b692319399ca6046ddb29e5f62ef8c69e963507f6cc43308e9422214b9a01a',
    });
  });

  it('learn: held-out loss falls from step 0 to the end, and training loss ends below it', () => {
    const [first, last] = [meta.checkpoints[0], meta.checkpoints.at(-1)!];
    expect(last.heldout.loss).toBeLessThan(first.heldout.loss);
    expect(last.train.loss).toBeLessThan(last.heldout.loss);
  });
});

describe('the base, the fine-tunes and the student', () => {
  it('are byte-unchanged by --checkpoints and --variants', () => {
    expect({
      model: sha('public/data/lm/model.bin'),
      meta: sha('public/data/lm/meta.json'),
      goldens: sha('tests/fixtures/lm/goldens.json'),
      finetuned: sha('public/data/lm/finetuned.bin'),
      lora: sha('public/data/lm/lora.bin'),
      student: sha('public/data/lm/student.bin'),
    }).toEqual({
      model: 'bbeee00ace589152509849245ef72ef9bf337201621b9dd37643eba2b22be2e1',
      meta: '1adb8b787818c936a44eb5449145851634e3882a3fe25b2016d42c370f9a86ba',
      goldens: '5a1f4e67a7246d39d29fd9cc2dc9707cd2c9ab2353aab479294eccf4bce41499',
      finetuned: '08e4dd06345b7b1318f2cc8be5ee3ddffcd58057dff9200e9142c56655144554',
      lora: 'd5cb6fcfb3eab41abbc3c72ee63ddd8dc2f3418a80463692f7d99f1e75933959',
      student: '5d539eaf38a1041e639ee00361e35626e0bae962bf3b591b98698d3ce6032721',
    });
  });
});

describe('the variant runs', () => {
  it('hold every variant with a curve, scores and a sample per pinned prompt', () => {
    expect(Object.keys(RUNS.runs)).toEqual([...VARIANTS]);
    for (const v of VARIANTS) {
      const r = RUNS.runs[v];
      expect(r.lossCurve.at(-1)!.step).toBe(RUNS.training.steps);
      for (const s of [r.train, r.heldout, r.leaked]) expect(s.loss).toBeGreaterThan(0);
      expect(r.samples).toHaveLength(RUNS.prompts.length);
      for (const s of r.samples) expect(s).toHaveLength(RUNS.training.sampleTokens);
    }
  });

  it('read the prompts and the duplicated document as the tokenizer and the splits give them today', () => {
    expect(RUNS.prompts).toEqual(IDS.preTraining.prompts);
    expect(RUNS.prompts.map(p => encode(p.text))).toEqual(RUNS.prompts.map(p => p.ids));
    expect(IDS.splits.train.docs).toContain(RUNS.duplicated.doc);
  });

  it('the clean run is the base run: its held-out score is the last checkpoint’s', () => {
    expect(RUNS.runs.clean.heldout.loss).toBe(meta.checkpoints.at(-1)!.heldout.loss);
  });

  it('the leaked run scores better on the leaked questions than clean, and no better on held-out', () => {
    expect(RUNS.runs.leaked.leaked.loss).toBeLessThan(RUNS.runs.clean.leaked.loss);
    expect(RUNS.runs.leaked.heldout.loss).toBeGreaterThanOrEqual(RUNS.runs.clean.heldout.loss);
  });

  it('record which runs reach their held-out minimum before the last step, as their curves show', () => {
    for (const v of VARIANTS) {
      const r = RUNS.runs[v];
      const low = r.lossCurve.reduce((a, c) => (c.heldout < a.heldout ? c : a));
      expect(r.heldoutMin).toEqual({ step: low.step, loss: low.heldout });
    }
    expect(RUNS.earlyMinimum).toEqual(VARIANTS.filter(v => RUNS.runs[v].heldoutMin.step < RUNS.training.steps));
    // half the data overfits early: chapter 7's stopping choice reads this run
    expect(RUNS.earlyMinimum).toContain('half');
  });
});

describe('the checkpoint loader', () => {
  it('loads a checkpoint by step from /data/pre-training/, in the base shape', async () => {
    const m = await modelLoader(async f => disk(f), 'ckpt-250').load();
    expect(m.config.n_layer).toBe(2);
    expect(m.tensors['wte.weight']).toHaveLength(768 * 32);
  });

  it('rejects a step that has no checkpoint, so the stage offers Retry', async () => {
    const m = modelLoader(async f => (f.endsWith('.bin') ? disk('ckpt-0.bin') : disk(f)), 'ckpt-7' as Weights);
    await expect(m.load()).rejects.toThrow(/no checkpoint at step 7/);
    expect(m.status()).toBe('error');
  });

  it('reports a failed fetch as an error and recovers on retry', async () => {
    let calls = 0;
    const m = modelLoader(async f => {
      if (f === 'ckpt-100.bin' && calls++ === 0) throw new Error('404 ckpt-100.bin');
      return disk(f);
    }, 'ckpt-100');
    await expect(m.load()).rejects.toThrow(/ckpt-100/);
    expect(m.status()).toBe('error');
    await m.load();
    expect(m.status()).toBe('ready');
  });
});

describe('passes over the data', () => {
  it('counts every step’s batch × context guesses against the run’s tokens, far past the passes the cited study found safe', async () => {
    const { passes } = await import('../../src/lib/pre-training/engine');
    const { fact } = await import('../../src/lib/pre-training/facts');
    const t = RUNS.training;
    expect(passes('clean')).toBe(
      Number(((t.steps * t.batch * meta.model.ctx) / RUNS.runs.clean.tokens).toPrecision(2)),
    );
    expect(passes('half')).toBeGreaterThan(passes('clean'));
    expect(passes('clean')).toBeGreaterThan(Number(fact('repeat-passes').value));
  });
});
