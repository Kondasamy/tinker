// Choosing a model's engine (KTD3, KTD7): every taught effect is re-derived from the hand-set data and must equal its
// pin in data/choosing-models/pinned.json (WRITE_PINNED=1 rewrites the pin).
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinned from '../../data/choosing-models/pinned.json' with { type: 'json' };
import {
  BAR,
  IDS,
  MACHINES,
  NEXT,
  QUESTIONS,
  REPLY,
  changed,
  machineOf,
  passesOf,
  qualityOf,
  rank,
} from '../../src/lib/choosing-models/machines';
import { perAnswer, per1000, wholeReply } from '../../src/lib/choosing-models/price';
import { MAX_TILT, MIN_TILT, WEIGHTS, rowsOf, scaled, tiltOf, weigh } from '../../src/lib/choosing-models/score';

const PINNED = 'data/choosing-models/pinned.json';
const r2 = (x: number) => Math.round(x * 100) / 100;

/** the smallest weight on `c`, with quality at 2, that tips the beam away from A */
const tipAt = (c: 'cost' | 'wait') =>
  WEIGHTS.find(w => weigh(rowsOf('larkspur'), { quality: 2, cost: 0, wait: 0, [c]: w }).winner !== 'A') ?? null;

function effects() {
  const cleared = IDS.filter(id => passesOf(id) >= BAR);
  return {
    publicOrder: rank(id => machineOf(id).public),
    larkspurOrder: rank(id => passesOf(id)),
    passes: { ...Object.fromEntries(IDS.map(id => [id, passesOf(id)])), next: passesOf(NEXT.version) },
    per1000: Object.fromEntries(IDS.map(id => [id, r2(per1000(machineOf(id), REPLY))])),
    first: Object.fromEntries(IDS.map(id => [id, machineOf(id).ttft])),
    whole: Object.fromEntries(IDS.map(id => [id, r2(wholeReply(machineOf(id), REPLY))])),
    costTip: tipAt('cost'),
    waitTip: tipAt('wait'),
    cleared,
    cheapest: [...cleared].sort((a, b) => per1000(machineOf(a), REPLY) - per1000(machineOf(b), REPLY))[0],
    changed: changed(NEXT.id, NEXT.version).map(q => ({ id: q.id, now: q.now })),
  };
}

describe('the hand-set machines and their pins', () => {
  it('re-derives every pinned effect', () => {
    const e = effects();
    if (process.env.WRITE_PINNED) {
      const file = JSON.parse(readFileSync(PINNED, 'utf8'));
      writeFileSync(PINNED, `${JSON.stringify({ ...e, workbench: file.workbench }, null, 2)}\n`);
      return;
    }
    const { workbench: _, ...rest } = pinned;
    expect(e).toEqual(rest);
  });

  it('the public order and Larkspur’s order differ (ch. 1–2)', () => {
    expect(pinned.publicOrder).toEqual(['A', 'B', 'C']);
    expect(pinned.larkspurOrder).not.toEqual(pinned.publicOrder);
    expect(pinned.larkspurOrder.at(-1)).toBe('B');
    expect(QUESTIONS).toHaveLength(20);
  });

  it('price per 1,000 answers is tokens in and out times the price, per machine (ch. 3)', () => {
    for (const m of MACHINES) {
      expect(perAnswer(m, REPLY)).toBeCloseTo((REPLY.tokensIn * m.priceIn + REPLY.tokensOut * m.priceOut) / 1e6, 12);
      expect(per1000(m, REPLY)).toBeCloseTo(1000 * perAnswer(m, REPLY), 9);
    }
    expect(pinned.costTip).not.toBeNull();
  });

  it('a whole reply waits for the first word, then the words at the machine’s pace (ch. 4)', () => {
    for (const m of MACHINES) expect(wholeReply(m, REPLY)).toBeCloseTo(m.ttft + REPLY.words / m.wps, 12);
    expect(pinned.waitTip).not.toBeNull();
  });

  it('a cheaper machine than the best clears the bar (ch. 5)', () => {
    expect(pinned.cleared).toContain('A');
    expect(pinned.cheapest).not.toBe('A');
    expect(per1000(machineOf(pinned.cheapest as 'C'), REPLY)).toBeLessThan(per1000(machineOf('A'), REPLY));
    expect(pinned.cleared).not.toContain('B');
  });

  it('the new version scores higher in public, changes answers, and falls under the bar (ch. 6)', () => {
    expect(NEXT.public).toBeGreaterThan(machineOf('C').public);
    expect(pinned.changed.length).toBeGreaterThan(0);
    expect(pinned.changed.some(c => c.now)).toBe(true);
    expect(pinned.passes.next).toBeLessThan(BAR);
    expect(qualityOf('C', 'next')).toBe(pinned.passes.next / 20);
  });
});

describe('the steelyard’s sums', () => {
  it('scales each criterion 0 (worst) to 1 (best), lower being better for price and wait', () => {
    const rows = rowsOf('larkspur');
    expect(scaled(rows, 'quality').map(x => r2(x))).toEqual([1, 0, 0.75]);
    expect(scaled(rows, 'cost')[0]).toBe(0);
    expect(scaled(rows, 'cost')[2]).toBe(1);
    expect(scaled(rows, 'wait')[2]).toBe(1);
  });

  it('no weight is a tie: the beam hangs level with no winner', () => {
    const w = weigh(rowsOf('public'), { quality: 0, cost: 0, wait: 0 });
    expect(w.winner).toBeNull();
    expect(tiltOf(w.lead, w.winner)).toBe(0);
  });

  it('quality alone tips to the public leader; the tilt grows with the lead, within its bounds', () => {
    const w = weigh(rowsOf('public'), { quality: 4, cost: 0, wait: 0 });
    expect(w.winner).toBe('A');
    const t = tiltOf(w.lead, w.winner);
    expect(t).toBeGreaterThanOrEqual(MIN_TILT);
    expect(t).toBeLessThanOrEqual(MAX_TILT);
    const close = weigh(rowsOf('larkspur'), { quality: 2, cost: 1, wait: 0 });
    expect(tiltOf(close.lead, close.winner)).toBeLessThan(t);
  });
});
