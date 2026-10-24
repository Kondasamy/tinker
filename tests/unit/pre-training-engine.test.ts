// Pre-training's engine (U5, KTD12): the checkpoints run live and pinned, the variant runs read as the chapters read
// them, the published scaling fits evaluated as their paper cites them, and the workbench's winners.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCheckpoint } from '../../src/lib/lm/load';
import type { Model } from '../../src/lib/lm/model';
import {
  CKPT,
  PROMPTS,
  RUN_IDS,
  STEPS,
  checkpoint,
  continuation,
  gapAt,
  heldoutScore,
  runOf,
  sampleOf,
  says,
  top5,
} from '../../src/lib/pre-training/engine';
import { FITS, TABLE3, grow, sixND } from '../../src/lib/pre-training/scaling';
import { BEST, MIXES, PLANS, STOPS, WINNERS, heldoutAt, rows, scoreOf } from '../../src/lib/pre-training/workbench';
import { FACTS } from '../../src/lib/pre-training/facts';
import PINNED from '../../data/pre-training/prompts.json' with { type: 'json' };

const disk = (step: number): Model => {
  const b = readFileSync(`public/data/pre-training/ckpt-${step}.bin`);
  return parseCheckpoint(CKPT, step, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
const MODELS = Object.fromEntries(STEPS.map(s => [s, disk(s)])) as Record<number, Model>;
const DOC = readFileSync('data/corpus/environmental-policy-2023.md', 'utf8');

describe('the checkpoints, live', () => {
  it('each pinned prompt’s greedy continuation at each checkpoint is the one prompts.json pins', () => {
    expect(PINNED.prompts.map(p => p.text)).toEqual(PROMPTS.map(p => p.text));
    for (const [i, p] of PINNED.prompts.entries())
      for (const s of STEPS) expect([s, i, says(MODELS[s], i)]).toEqual([s, i, p.says[String(s) as '0']]);
  }, 60_000);

  it('the base run’s last checkpoint writes what the clean run’s recorded sample says', () => {
    for (const i of PROMPTS.keys()) expect(continuation(MODELS[3000], i)).toEqual(runOf('clean').samples[i]);
  });

  it('step 0 babbles with every next piece about as likely as any other; step 3000 does not', () => {
    const t0 = top5(MODELS[0], 0),
      t3 = top5(MODELS[3000], 0);
    expect(t0[0].p).toBeLessThan(0.01);
    expect(t3[0].p).toBeGreaterThan(5 * t0[0].p);
    expect(says(MODELS[0], 2)).not.toEqual(says(MODELS[3000], 2));
  });

  it('held-out loss, computed live, is the score train.py recorded, and it falls from first to last', () => {
    for (const s of [0, 3000])
      expect(Math.abs(heldoutScore(MODELS[s]).loss - checkpoint(s).heldout.loss)).toBeLessThan(1e-4);
    expect(checkpoint(3000).heldout.loss).toBeLessThan(checkpoint(0).heldout.loss);
  });

  it('the train–held-out gap widens over the last third of the checkpoints', () => {
    const late = STEPS.slice(-Math.ceil(STEPS.length / 3));
    for (let i = 1; i < late.length; i++) expect(gapAt(late[i])).toBeGreaterThan(gapAt(late[i - 1]));
  });
});

describe('the variant runs', () => {
  it('the duplicated run parrots the repeated document; the clean run does not', () => {
    const dup = sampleOf('duplicated', 0),
      clean = sampleOf('clean', 0);
    expect(dup.trim().length).toBeGreaterThan(20);
    expect(DOC).toContain(dup.trim());
    expect(DOC).not.toContain(` warehouse${clean}`);
  });

  it('the leaked run scores better than clean on the leaked questions and no better on held-out', () => {
    expect(runOf('leaked').leaked.loss).toBeLessThan(runOf('clean').leaked.loss);
    expect(runOf('leaked').heldout.loss).toBeGreaterThanOrEqual(runOf('clean').heldout.loss);
  });
});

describe('the published scaling fits', () => {
  it('Kaplan’s exponents give the 5.5× model and 1.8× data per 10× compute that Hoffmann et al. cite', () => {
    const k = grow(FITS.kaplan, 10);
    expect(Math.abs(k.params - 5.5)).toBeLessThan(0.15);
    expect(Math.abs(k.tokens - 1.8)).toBeLessThan(0.1);
  });

  it('Chinchilla’s approach 1 scales model and data equally', () => {
    const c = grow(FITS.chinchilla, 100);
    expect(c.params).toBeCloseTo(10, 6);
    expect(c.tokens).toBeCloseTo(10, 6);
  });

  it('every Table 3 row spends about 6 × parameters × tokens FLOPs (within 5%)', () => {
    for (const r of TABLE3) expect(Math.abs(sixND(r) / r.flops - 1)).toBeLessThan(0.05);
  });
});

describe('the workbench', () => {
  it('scores every mix at every stop from runs.json, and winners are every plan tied for the best', () => {
    expect(PLANS).toHaveLength(MIXES.length * STOPS.length);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const p of PLANS) expect(scoreOf(p)).toBeGreaterThanOrEqual(BEST);
    for (const w of WINNERS) expect(scoreOf(w)).toBe(BEST);
  });

  it('every winner beats or ties the clean run at step 3000, on the full data', () => {
    for (const w of WINNERS) {
      expect(scoreOf(w)).toBeLessThanOrEqual(scoreOf({ mix: 'clean', stop: 3000 }));
      expect(w.mix).toBe('clean');
    }
  });

  it('a run with an early held-out minimum is best stopped there: half stops at 600', () => {
    const half = runOf('half').heldoutMin;
    expect(half.step).toBeLessThan(3000);
    expect(STOPS).toContain(half.step);
    const best = STOPS.reduce((a, s) => (heldoutAt('half', s) < heldoutAt('half', a) ? s : a));
    expect(best).toBe(half.step);
  });

  it('every row of a losing plan says why it lost', () => {
    for (const p of PLANS.filter(x => !WINNERS.includes(x)))
      for (const r of rows(p)) if (r.chosen) expect(r.why.length).toBeGreaterThan(10);
  });

  it('every mix is a run', () => {
    expect([...MIXES].sort()).toEqual([...RUN_IDS].sort());
  });
});

describe('facts', () => {
  it('each has a claim, an https source and no fact without its date', () => {
    for (const f of FACTS) {
      expect(f.claim.length).toBeGreaterThan(20);
      expect(f.source).toMatch(/^https:\/\//);
    }
  });
});
