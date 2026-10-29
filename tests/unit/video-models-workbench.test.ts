// Chapter 7's workbench (KTD10, KTD11): every plan's pinned result reruns over the test routes, and WINNERS recomputes.
import { describe, expect, it } from 'vitest';
import meta from '../../public/data/video-models/meta.json' with { type: 'json' };
import { multiplies } from '../../src/lib/video-models/compute';
import { diskNet } from '../../src/lib/video-models/diskModel';
import {
  BENCH,
  PLANS,
  RESULTS,
  START,
  WINNERS,
  measure,
  passes,
  resultOf,
  share,
  solve,
  wins,
} from '../../src/lib/video-models/workbench';

const nets = { k1: diskNet('k1'), k2: diskNet('k2') };
const mults = { k1: multiplies(meta.models.k1), k2: multiplies(meta.models.k2) };

describe('the workbench', () => {
  it('reruns every plan to its pinned result', () => {
    expect(RESULTS.map(({ model, every }) => ({ model, every }))).toEqual(PLANS);
    for (const p of PLANS) expect(measure(nets, p)).toEqual(resultOf(p));
  });
  it('recomputes WINNERS', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(solve(RESULTS, mults)).toEqual(WINNERS);
  });
  it('k1 clears the bar at no re-sync interval: one frame can’t keep the crate’s way', () => {
    for (const r of RESULTS.filter(r => r.model === 'k1')) expect(passes(r)).toBe(false);
  });
  it('k2 without re-sync falls short too: drift', () => {
    expect(passes(resultOf({ model: 'k2', every: 0 }))).toBe(false);
    expect(share(resultOf({ model: 'k2', every: 0 }))).toBeLessThan(BENCH.bar);
  });
  it('starts on a plan that loses', () => {
    expect(wins(START)).toBe(false);
  });
});
