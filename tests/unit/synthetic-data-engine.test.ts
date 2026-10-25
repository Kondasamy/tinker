// Synthetic data's live engine (U25): Larkspur mini writing seeded batches, the sieve, the teacher graded by Evals' key-
// fact rule, the reader over runs.json and the workbench's winners. Every effect a chapter quotes is pinned in
// data/synthetic-data/pinned.json and rerun here.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diskModel } from '../../src/lib/transformers/diskModel';
import {
  BATCH,
  RARE,
  TEMPS,
  copies,
  gradeIds,
  onTopic,
  teacher,
  writeBatch,
  writeOne,
} from '../../src/lib/synthetic-data/generate';
import { PRODUCTS, productIn, sieve } from '../../src/lib/synthetic-data/sieve';
import { ARMS, GENS, RUNS, series } from '../../src/lib/synthetic-data/runs';
import { RECIPES, WINNERS, beatenBy, scoreOf, solved } from '../../src/lib/synthetic-data/workbench';
import { encode } from '../../src/lib/lm/bpe';
import IDS from '../../data/lm/ids.json' with { type: 'json' };
import PINNED from '../../data/synthetic-data/pinned.json' with { type: 'json' };
import RAW from '../../data/synthetic-data/runs.json' with { type: 'json' };

const model = diskModel();
const kept = (b: number[][], k: 'off' | 'dedupe' | 'facts') => sieve(b, k).filter(v => v === 'kept').length;

describe('writing (live)', () => {
  it('the same seed and temperature give the same reply', () => {
    const p = RUNS.prompts[0].text;
    expect(writeOne(model, p, 1, 3)).toEqual(writeOne(model, p, 1, 3));
    expect(writeOne(model, p, 1, 3)).not.toEqual(writeOne(model, p, 1, 4));
  });
  it('chapter 2: at 0.7 the pinned prompt’s batch holds more copies, and names a product more, than at 1.3', () => {
    const p = RUNS.prompts[PINNED.write.prompt].text;
    const got = Object.fromEntries(
      TEMPS.map(t => {
        const b = writeBatch(model, p, t);
        return [t, { copies: copies(b), topic: onTopic(b) }];
      }),
    );
    expect(got).toEqual(PINNED.write.counts);
    expect(got[0.7].copies).toBeGreaterThan(got[1.3].copies);
    expect(got[0.7].topic).toBeGreaterThan(got[1.3].topic);
  });
  it('chapter 3: the sieve keeps the pinned counts of the pinned batch, each step keeping fewer', () => {
    const b = writeBatch(model, RUNS.prompts[PINNED.sieve.prompt].text, PINNED.sieve.temperature);
    expect({ off: kept(b, 'off'), dedupe: kept(b, 'dedupe'), facts: kept(b, 'facts') }).toEqual(PINNED.sieve.kept);
    expect(PINNED.sieve.kept.off).toBe(BATCH);
    expect(PINNED.sieve.kept.dedupe).toBeLessThan(BATCH);
    expect(PINNED.sieve.kept.facts).toBeLessThan(PINNED.sieve.kept.dedupe);
  });
  it('chapter 4: the teacher’s rare answers hold the pinned number of key facts', () => {
    expect(RARE.map((_, i) => teacher(model, i).ok).filter(Boolean).length).toBe(PINNED.teacher.passes);
  });
  it('the student’s recorded rare answers are graded by the same rule', () => {
    const g1 = RUNS.arms.replace[1].rareReplies;
    expect(g1.map((ids, i) => gradeIds(ids, i)).filter(Boolean).length).toBe(PINNED.teacher.student);
  });
});

describe('the sieve', () => {
  const a = encode(' The Kestrel K3 ships with a charger in the box today.'),
    b = encode(' Orders over $250 ship free from the nearest warehouse.'),
    c = encode(' Returns are accepted within thirty days of delivery.');
  it('dedupe removes an exact copy and a 4-gram near-copy, and keeps distinct replies', () => {
    const near = [...a.slice(0, -1), ...encode('!')];
    expect(sieve([a, b, a, near, c], 'dedupe')).toEqual(['kept', 'kept', 'copy', 'overlap', 'kept']);
  });
  it('the fact filter keeps a reply naming a product and drops one without', () => {
    expect(productIn(a)?.text).toBe(' Kestrel K3');
    expect(sieve([a, b], 'facts')).toEqual(['kept', 'no-fact']);
    expect(PRODUCTS).toEqual(IDS.syntheticData.products);
  });
  it('keeps everything when off', () => {
    expect(sieve([a, a], 'off')).toEqual(['kept', 'kept']);
  });
});

describe('the runs reader', () => {
  it('gives each arm’s measures per generation as runs.json holds them', () => {
    const raw = RAW as unknown as typeof RUNS;
    for (const arm of ARMS)
      for (const k of ['heldout', 'distinctRare', 'repeatRate', 'rareTop5', 'top5'] as const)
        expect(series(arm, k)).toEqual(GENS.map(g => raw.arms[arm][g][k]));
  });
});

describe('the workbench', () => {
  it('has the 18 recipes, and its pinned WINNERS are exactly the recipes no other beats', () => {
    expect(RECIPES).toHaveLength(18);
    expect(RECIPES.filter(solved)).toEqual(WINNERS);
    for (const r of RECIPES.filter(r => !solved(r))) {
      const by = scoreOf(beatenBy(r)!),
        me = scoreOf(r);
      expect(by.loss <= me.loss && by.rare >= me.rare).toBe(true);
    }
  });
  it('every winner keeps half real data, as chapter 7 says', () => {
    expect(WINNERS.every(w => w.realShare === 50)).toBe(true);
    expect(solved({ temperature: 1, sieve: 'off', realShare: 0 })).toBe(false);
  });
});

describe('chapter 1’s counts', () => {
  const docs = IDS.splits.train.docs,
    text = (f: string) => readFileSync(`data/corpus/${f}`, 'utf8');
  it('recount from the corpus: training documents mentioning each phrase', () => {
    expect(docs.length).toBe(PINNED.trainDocs);
    for (const m of [...PINNED.mentions.common, ...PINNED.mentions.rare])
      expect(docs.filter(f => text(f).includes(m.text)).length, m.text).toBe(m.docs);
    for (const m of PINNED.mentions.rare) expect(Object.values(RARE[m.prompt].facts)[0][0]).toBe(m.text);
  });
  it('rareMaxCount is the most any rare-half piece appears in training', () => {
    const counts = new Array(IDS.vocab).fill(0);
    for (const d of IDS.splits.train.ids) for (const t of d) counts[t]++;
    expect(Math.max(...RUNS.rare.map(t => counts[t]))).toBe(PINNED.rareMaxCount);
  });
});
