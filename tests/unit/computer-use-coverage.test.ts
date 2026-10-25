// Computer use's recordings against every control (KTD9): every reachable signature has a recorded action, a signature
// lives in one file, nothing recorded is unreachable, each action carries a note, and the module stays in budget.
import { describe, expect, it } from 'vitest';
import { combos, DOMAINS, run, WORKBENCH_DOMAINS, type Domain, type Setup } from '../../src/lib/computer-use/loop';
import { RECORDING, RECORDINGS } from '../../src/lib/computer-use/turns';

function every(d: Domain, label: string) {
  for (const setup of combos(d)) {
    const r = run(RECORDING, setup as Setup);
    expect(r.status, `${label} ${JSON.stringify(setup)} → ${r.signatures.at(-1)}`).toBe('done');
  }
}

describe('computer-use recordings coverage (KTD9)', () => {
  it('every recording file is a chapter domain or the workbench', () => {
    const allowed = new Set([...Object.keys(DOMAINS), '07-workbench']);
    for (const file of Object.keys(RECORDINGS)) expect(allowed.has(file), `unexpected file ${file}`).toBe(true);
  });

  it('a signature is recorded in one file only', () => {
    const seen = new Map<string, string>();
    for (const [file, rec] of Object.entries(RECORDINGS))
      for (const sig of Object.keys(rec.turns)) {
        expect(seen.get(sig), `${sig} is in ${seen.get(sig)} and ${file}`).toBeUndefined();
        seen.set(sig, file);
      }
  });

  it.each(Object.keys(DOMAINS))('%s: every reachable signature has a recorded action', id => every(DOMAINS[id], id));

  it('the workbench: every size, wait rule, allow-list and confirmation, over both suites', () =>
    every(WORKBENCH_DOMAINS, 'workbench'));

  it('every recorded action is reachable, and each has a one-line note', () => {
    const reached = new Set<string>();
    for (const d of [...Object.values(DOMAINS), WORKBENCH_DOMAINS])
      for (const setup of combos(d)) run(RECORDING, setup as Setup).signatures.forEach(s => reached.add(s));
    expect(Object.keys(RECORDING.turns).filter(s => !reached.has(s))).toEqual([]);
    for (const [sig, turn] of Object.entries(RECORDING.turns)) expect(turn.note, sig).toBeTruthy();
  });

  it('stays within the module budget of 220 actions', () => {
    expect(Object.keys(RECORDING.turns).length).toBeLessThanOrEqual(220);
  });
});
