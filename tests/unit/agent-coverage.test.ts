import { describe, expect, it } from 'vitest';
import {
  combos,
  DOMAINS,
  run,
  stepsOf,
  WORKBENCH_DOMAINS,
  type Decision,
  type Domain,
  type Run,
  type Setup,
} from '../../src/lib/agents/loop';
import { RECORDINGS, type Recording } from '../../src/lib/agents/turns';

// Every signature a run looked up, its helpers' included.
const sigs = (r: Run): string[] => [...r.signatures, ...stepsOf(r, 'helper').flatMap(h => sigs(h.run))];

/** Runs every combination of a domain; a run left waiting for a person is played on with each answer, so every reachable approval path is covered. */
function every(rec: Recording, d: Domain, visit: (r: Run, setup: Partial<Setup>) => void) {
  const play = (setup: Partial<Setup>) => {
    const r = run(rec, setup);
    visit(r, setup);
    if (r.status === 'waiting')
      for (const a of ['approve', 'reject'] as Decision[]) play({ ...setup, decide: [...(setup.decide ?? []), a] });
  };
  combos(d).forEach(play);
}

describe('agent recordings coverage (R4, KTD4)', () => {
  it('every recording has a control domain, and every domain a recording', () => {
    expect(Object.keys(DOMAINS).sort()).toEqual(Object.keys(RECORDINGS).sort());
  });

  it.each(Object.keys(DOMAINS))(
    '%s: every reachable signature has a recorded turn, and every recorded turn is reachable',
    id => {
      const rec = RECORDINGS[id],
        seen = new Set<string>();
      every(rec, DOMAINS[id], (r, setup) => {
        expect(
          r.status,
          `${id} ${JSON.stringify(setup)} → ${r.steps.at(-1)?.kind === 'norecord' ? sigs(r).at(-1) : ''}`,
        ).not.toBe('norecord');
        expect(
          stepsOf(r, 'helper').every(h => h.run.status !== 'norecord'),
          `${id} helper`,
        ).toBe(true);
        sigs(r).forEach(s => seen.add(s));
      });
      expect([...seen].sort(), id).toEqual(Object.keys(rec.turns).sort());
    },
  );

  it('every workbench case plays without norecord', () => {
    for (const [c, sets] of Object.entries(WORKBENCH_DOMAINS))
      for (const { scenario, domain } of sets)
        every(RECORDINGS[scenario], domain, (r, setup) =>
          expect(r.status, `${c} ${scenario} ${JSON.stringify(setup)}`).not.toBe('norecord'),
        );
  });
});
