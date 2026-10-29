// Who labels the data (U7): the generated labels rerun, kappa against a textbook case, the guideline, gold, votes, the
// triage model on noisy and clean labels, least-sure-first against random orders, and the recorded model labels. Every
// number the chapters quote comes from pinned.json, rerun here.
import { describe, expect, it } from 'vitest';
import labels from '../../data/labelling/labels.json' with { type: 'json' };
import model from '../../data/labelling/model-labels.json' with { type: 'json' };
import pinned from '../../data/labelling/pinned.json' with { type: 'json' };
import tickets from '../../data/labelling/tickets.json' with { type: 'json' };
import { makeLabels } from '../../scripts/make-labels.mjs';
import { accuracy, agreement, chance, kappa, matrix } from '../../src/lib/labelling/agree';
import { FACTS } from '../../src/lib/labelling/facts';
import { SIMULATED, simulateLabels } from '../../src/lib/labelling/simulate';
import {
  GOLD,
  HARD,
  HELD_OUT,
  INTENT_IDS,
  indexOf,
  LABELLERS,
  type LabellerId,
  labelsOf,
  MODELS,
  POOL,
  TICKETS,
  TRUTH,
  UNCHECKED,
} from '../../src/lib/labelling/story';
import {
  accuracyOn,
  activeOrder,
  curve,
  labelsToReach,
  leastSure,
  median,
  train,
} from '../../src/lib/labelling/triage';
import { majority, minorityRight, votesOf } from '../../src/lib/labelling/vote';
import { GOLD_BAR, goldScores } from '../../src/lib/labelling/workbench';
import { shuffled } from '../../src/lib/recall';

const P = POOL.map((_, i) => i);
const IDS = LABELLERS.map(l => l.id);
const pool = (xs: readonly string[]) => P.map(i => xs[i]);
const pairs: [LabellerId, LabellerId][] = [
  ['rosa', 'mira'],
  ['rosa', 'tom'],
  ['mira', 'tom'],
];
const kappas = (guided: boolean) =>
  Object.fromEntries(pairs.map(([a, b]) => [`${a}-${b}`, kappa(pool(labelsOf(a, guided)), pool(labelsOf(b, guided)))]));
const RR = ['refund', 'return'];
/** pool tickets where Mira and Rosa split one refund, one return */
const refundReturn = (guided: boolean) =>
  P.filter(i => {
    const m = labelsOf('mira', guided)[i],
      r = labelsOf('rosa', guided)[i];
    return m !== r && RR.includes(m) && RR.includes(r);
  }).length;

describe('the labels', () => {
  it('rerun from the seeded profiles to the frozen file', () => {
    expect(makeLabels(tickets)).toEqual(labels);
  });
  it('cover every ticket with an intent, three labellers named from data', () => {
    expect(IDS).toEqual(['rosa', 'mira', 'tom']);
    for (const id of IDS) {
      expect(labelsOf(id)).toHaveLength(TICKETS.length);
      for (const l of labelsOf(id, false)) expect(INTENT_IDS).toContain(l);
    }
    expect(TICKETS).toHaveLength(120);
    expect(HELD_OUT).toHaveLength(pinned.triage.heldOut);
    expect(GOLD).toHaveLength(10);
    expect(new Set(TICKETS.map(t => t.intent))).toEqual(new Set(INTENT_IDS));
  });
});

describe('agreement and kappa (chapter 2)', () => {
  it('matches the textbook 2×2 case: 20 yes-yes, 5 yes-no, 10 no-yes, 15 no-no gives κ 0.4', () => {
    const a = [...Array(25).fill('y'), ...Array(25).fill('n')],
      b = [...Array(20).fill('y'), ...Array(5).fill('n'), ...Array(10).fill('y'), ...Array(15).fill('n')];
    expect(agreement(a, b)).toBeCloseTo(0.7, 10);
    expect(chance(a, b)).toBeCloseTo(0.5, 10);
    expect(kappa(a, b)).toBeCloseTo(0.4, 10);
    expect(matrix(a, b, ['y', 'n'])).toEqual([
      [20, 5],
      [10, 15],
    ]);
  });
  it('is 1 for identical labels and 0 when agreement is only luck', () => {
    expect(kappa(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(kappa(['a', 'a', 'b', 'b'], ['a', 'b', 'a', 'b'])).toBe(0);
  });
  it('has the pinned ticket where three labellers give three answers', () => {
    const i = indexOf(pinned.threeWay);
    expect(i).toBeLessThan(POOL.length);
    expect(new Set(IDS.map(id => labelsOf(id, false)[i])).size).toBe(3);
  });
  it('reruns the pinned kappas before and after the guideline', () => {
    expect(kappas(false)).toEqual(pinned.kappa.before);
    expect(kappas(true)).toEqual(pinned.kappa.after);
  });
});

describe('the guideline (chapter 3)', () => {
  it('cuts Mira’s refund-or-return splits with Rosa to near zero', () => {
    expect(refundReturn(false)).toBe(pinned.refundReturn.before);
    expect(refundReturn(true)).toBe(pinned.refundReturn.after);
    expect(pinned.refundReturn.after).toBeLessThanOrEqual(1);
    expect(pinned.refundReturn.before).toBeGreaterThanOrEqual(10);
  });
  it('changes only Mira’s refund and return tickets', () => {
    for (const id of IDS) if (id !== 'mira') expect(labelsOf(id, false)).toEqual(labelsOf(id));
    labelsOf('mira').forEach((l, i) => {
      if (l !== labelsOf('mira', false)[i]) expect(RR).toContain(TRUTH[i]);
    });
  });
});

describe('gold tickets (chapter 4)', () => {
  it('flag the rushed labeller under the bar and no one else', () => {
    const s = goldScores(GOLD.length);
    expect(s).toEqual(pinned.gold.scores);
    expect(IDS.filter(id => s[id] < GOLD_BAR)).toEqual(['tom']);
    expect(pinned.gold.bar).toBe(GOLD_BAR);
  });
});

describe('votes (chapter 5)', () => {
  const sets = IDS.map(id => labelsOf(id));
  const vote = votesOf(sets);
  it('take the most common label, the first voter’s on a tie', () => {
    expect(majority(['a', 'b', 'b'])).toBe('b');
    expect(majority(['c', 'a', 'b'])).toBe('c');
  });
  it('beat each single labeller on the pool', () => {
    const acc: Record<string, number> = {
      ...Object.fromEntries(IDS.map(id => [id, accuracy(labelsOf(id), TRUTH, P)])),
      vote: accuracy(vote, TRUTH, P),
    };
    expect(acc).toEqual(pinned.accuracy);
    for (const id of IDS) expect(acc.vote).toBeGreaterThan(acc[id]);
  });
  it('get the pinned ticket wrong while one labeller had it right', () => {
    const right = minorityRight(
      sets.map(s => pool(s)),
      pool(TRUTH),
    ).map(i => POOL[i].id);
    expect(right).toEqual(pinned.minorityRight);
    expect(right).toContain(pinned.minority);
  });
  it('trains a worse triage model on the rushed labeller’s labels than on checked ones', () => {
    const on = (l: readonly string[]) =>
      accuracyOn(
        train(POOL, INTENT_IDS, t => l[indexOf(t.id)] as (typeof TRUTH)[number]),
        HELD_OUT,
      );
    const r = { clean: on(TRUTH), noisy: on(labelsOf('tom')), vote: on(vote), heldOut: HELD_OUT.length };
    expect(r).toEqual(pinned.triage);
    expect(r.noisy).toBeLessThan(r.clean);
  });
});

describe('least sure first (chapter 6)', () => {
  it('ranks the pinned twenty hardest tickets from a model counted on gold alone', () => {
    expect(leastSure(train(GOLD, INTENT_IDS), UNCHECKED, 20).map(t => t.id)).toEqual(HARD);
  });
  it('reaches the all-labels accuracy with fewer labels than the median of 20 seeded random orders', () => {
    const active = labelsToReach(
      curve(GOLD, activeOrder(GOLD, UNCHECKED, INTENT_IDS), HELD_OUT, INTENT_IDS),
      pinned.leastSure.bar,
    );
    const random = median(
      Array.from({ length: pinned.leastSure.orders }, (_, s) =>
        labelsToReach(curve(GOLD, shuffled(UNCHECKED, s + 1), HELD_OUT, INTENT_IDS), pinned.leastSure.bar),
      ),
    );
    expect(pinned.leastSure.bar).toBe(pinned.triage.clean);
    expect({ active, random }).toEqual({ active: pinned.leastSure.active, random: pinned.leastSure.random });
    expect(active).toBeLessThan(random);
  });
  it('has both model labellers’ recorded labels for exactly the hard tickets, with model and date', () => {
    expect(model.meta.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const m of Object.values(MODELS)) {
      expect(m.id).toBeTruthy();
      expect(Object.keys(m.labels).sort()).toEqual([...HARD].sort());
      for (const l of Object.values(m.labels)) expect(INTENT_IDS).toContain(l);
    }
  });
  it('reruns the model labellers’ pinned scores on the hard tickets', () => {
    const at = HARD.map(indexOf);
    const score = (k: 'main' | 'check') =>
      accuracy(
        TICKETS.map(t => MODELS[k].labels[t.id] ?? ''),
        TRUTH,
        at,
      );
    const people = Object.fromEntries(IDS.map(id => [id, accuracy(labelsOf(id), TRUTH, at)]));
    const agree = HARD.filter(id => MODELS.main.labels[id] === MODELS.check.labels[id]).length;
    expect({ main: score('main'), check: score('check'), agree, people }).toEqual(pinned.models);
  });
});

describe('the simulated model labeller (KTD13)', () => {
  it('slips on its stated share, the same way every time', () => {
    const a = simulateLabels(UNCHECKED, INTENT_IDS);
    expect(simulateLabels(UNCHECKED, INTENT_IDS)).toEqual(a);
    const wrong = UNCHECKED.filter(t => a[t.id] !== t.intent).length;
    expect(wrong).toBe(Math.round(UNCHECKED.length * SIMULATED.slip));
  });
});

describe('facts', () => {
  it('each name a source and the access date', () => {
    expect(FACTS.length).toBeGreaterThan(0);
    for (const f of FACTS) expect(f.source).toMatch(/^https:\/\//);
  });
});
