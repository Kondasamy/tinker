import { describe, expect, it } from 'vitest';
import { CASES, ENDINGS, first, play, shown } from '../../src/content/agents/07-workbench';
import { combos, WORKBENCH_DOMAINS, type Domain, type Setup } from '../../src/lib/agents/loop';

// every setup the workbench's controls can reach: each case's control sets, every value of each shown control
const reach = (d: Domain) => {
  const out: Partial<Setup>[] = [];
  for (const s of combos(d)) {
    const seen = shown(d, s);
    // a hidden control keeps its first value
    if (
      (Object.keys(d) as (keyof Setup)[]).every(
        k => seen.includes(k) || JSON.stringify(s[k]) === JSON.stringify(first(d)[k]),
      )
    )
      out.push(s);
  }
  return out;
};

describe('agents workbench (R4)', () => {
  it('offers the five cases, each with at least one control set', () => {
    expect(CASES).toEqual(['refund', 'damaged', 'planted', 'timeout', 'storm']);
    for (const c of CASES) expect(WORKBENCH_DOMAINS[c].length).toBeGreaterThan(0);
  });

  it.each(CASES)(
    '%s: every exposed combination ends done, stuck, out-of-budget, waiting or failed (script), never norecord',
    c => {
      WORKBENCH_DOMAINS[c].forEach(({ domain }, i) => {
        for (const setup of reach(domain)) {
          const r = play(c, i, setup);
          expect(ENDINGS, `${c} ${JSON.stringify(setup)}`).toContain(r.status);
          if (r.status === 'failed') expect(setup.mode).toBe('script');
        }
      });
    },
  );

  it('every ending is reachable from the controls, so the chapter can be finished', () => {
    const ends = new Set(
      CASES.flatMap(c => WORKBENCH_DOMAINS[c].flatMap(({ domain }, i) => reach(domain).map(s => play(c, i, s).status))),
    );
    expect([...ends].sort()).toEqual([...ENDINGS].sort());
  });
});
