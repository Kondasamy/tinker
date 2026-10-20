import { describe, expect, it } from 'vitest';
import { combos, DOMAINS, run, WORKBENCH_DOMAINS, type Domain, type Run, type Setup } from '../../src/lib/guardrails/loop';
import { RECORDING, RECORDINGS } from '../../src/lib/guardrails/turns';

const reached = new Set<string>();
const why = (r: Run, setup: Partial<Setup>) => `${JSON.stringify(setup)} → ${r.status === 'norecord' ? r.signatures.at(-1) : r.status}`;
function every(d: Domain, label: string) {
  for (const setup of combos(d)) {
    const r = run(RECORDING, setup as Setup);
    expect(r.status, `${label} ${why(r, setup)}`).toBe('done');
    r.signatures.forEach((s) => reached.add(s));
  }
}

describe('guardrails recordings coverage (R3, KTD8)', () => {
  it('every recording file has a chapter domain, and every domain a file', () => {
    expect(Object.keys(DOMAINS).sort()).toEqual(Object.keys(RECORDINGS).sort());
  });

  it('a signature is recorded in one file only', () => {
    const seen = new Map<string, string>();
    for (const [file, rec] of Object.entries(RECORDINGS))
      for (const sig of Object.keys(rec.turns)) {
        expect(seen.get(sig), `${sig} is in ${seen.get(sig)} and ${file}`).toBeUndefined();
        seen.set(sig, file);
      }
  });

  it.each(Object.keys(DOMAINS))('%s: every reachable signature has a recorded turn', (id) => every(DOMAINS[id], id));

  it('the red-team workbench: every combination of every defence, over both suites', () => every(WORKBENCH_DOMAINS, 'workbench'));

  it('every recorded turn is reachable from some chapter or the workbench', () => {
    expect(Object.keys(RECORDING.turns).filter((s) => !reached.has(s))).toEqual([]);
  });

  it('stays within the module budget of about 150 turns, about 40 per scenario', () => {
    expect(Object.keys(RECORDING.turns).length).toBeLessThanOrEqual(150);
    for (const [file, rec] of Object.entries(RECORDINGS)) expect(Object.keys(rec.turns).length, file).toBeLessThanOrEqual(45);
  });
});
