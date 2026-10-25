// Coding agents' recordings against every control (KTD8): every reachable signature has a recorded turn, a signature
// lives in one file, nothing recorded is unreachable, each turn carries a note, and the module stays in budget. The
// reader's hunk review enters the history, so the agent's next turn sees the version the reader kept.
import { describe, expect, it } from 'vitest';
import { combos, DOMAINS, run, WORKBENCH_DOMAINS, type Domain, type Setup } from '../../src/lib/coding-agents/loop';
import { RECORDING, RECORDINGS } from '../../src/lib/coding-agents/turns';

function every(d: Domain, label: string) {
  for (const setup of combos(d)) {
    const r = run(RECORDING, setup as Setup);
    expect(['done', 'stopped'], `${label} ${JSON.stringify(setup)} → ${r.signatures.at(-1)}`).toContain(r.status);
  }
}

describe('coding-agents recordings coverage (KTD8)', () => {
  it('every recording file is a chapter domain', () => {
    for (const file of Object.keys(RECORDINGS)) expect(Object.keys(DOMAINS), `unexpected file ${file}`).toContain(file);
  });

  it('a signature is recorded in one file only', () => {
    const seen = new Map<string, string>();
    for (const [file, rec] of Object.entries(RECORDINGS))
      for (const sig of Object.keys(rec.turns)) {
        expect(seen.get(sig), `${sig} is in ${seen.get(sig)} and ${file}`).toBeUndefined();
        seen.set(sig, file);
      }
  });

  it.each(Object.keys(DOMAINS))('%s: every combination ends done or stopped', id => every(DOMAINS[id], id));

  it('the workbench: every host policy over every ticket', () => every(WORKBENCH_DOMAINS, 'workbench'));

  it('every recorded turn is reachable, and each has a one-line note', () => {
    const reached = new Set<string>();
    for (const d of [...Object.values(DOMAINS), WORKBENCH_DOMAINS])
      for (const setup of combos(d)) run(RECORDING, setup as Setup).signatures.forEach(s => reached.add(s));
    expect(Object.keys(RECORDING.turns).filter(s => !reached.has(s))).toEqual([]);
    for (const [sig, turn] of Object.entries(RECORDING.turns)) expect(turn.note, sig).toBeTruthy();
  });

  it('stays within the module budget of 80 turns', () => {
    expect(Object.keys(RECORDING.turns).length).toBeLessThanOrEqual(80);
  });

  it('the reviewed version enters the history: each subset leads to its own next turn', () => {
    const next = new Set(
      [0, 1, 2, 3, 4, 5, 6, 7].map(review => {
        const r = run(RECORDING, { case: 'bulk', review });
        expect(r.hist[2]).toBe(`edit:src/discount.ts:reviewed:${r.code}`);
        return r.signatures[3];
      }),
    );
    expect(next.size).toBe(8);
  });

  it('host-only stages stay out of the signature', () => {
    for (const sig of Object.keys(RECORDING.turns)) expect(sig).not.toMatch(/protect|allow|ask|review=/);
  });
});
