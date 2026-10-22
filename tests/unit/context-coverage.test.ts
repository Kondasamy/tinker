import { describe, expect, it } from 'vitest';
import { combos, DOMAINS, run, WORKBENCH_DOMAINS, type Domain } from '../../src/lib/context/loop';
import { RECORDING, RECORDINGS } from '../../src/lib/context/turns';

function every(d: Domain, label: string) {
  for (const setup of combos(d)) {
    const r = run(RECORDING, setup);
    expect(r.status, `${label} ${JSON.stringify(setup)} → ${r.missing ?? r.status}`).toBe('done');
  }
}

describe('context recordings coverage (R3, KTD7)', () => {
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

  it.each(Object.keys(DOMAINS))('%s: every reachable signature has a recorded turn', id => every(DOMAINS[id], id));

  it('the workbench: every policy over the session', () => every(WORKBENCH_DOMAINS, 'workbench'));

  it('every recorded turn is reachable from some chapter or the workbench', () => {
    const reached = new Set<string>();
    for (const d of Object.values(DOMAINS))
      for (const setup of combos(d)) run(RECORDING, setup).signatures.forEach(s => reached.add(s));
    expect(Object.keys(RECORDING.turns).filter(s => !reached.has(s))).toEqual([]);
  });

  it('one signature, one window: the signature holds everything the model sees', () => {
    const windows = new Map<string, string>();
    for (const d of Object.values(DOMAINS))
      for (const setup of combos(d))
        for (const m of run(RECORDING, setup).meter) {
          const text = m.window.parts.map(p => p.text).join('\n');
          expect(windows.get(m.signature) ?? text, m.signature).toBe(text);
          windows.set(m.signature, text);
        }
  });

  it('stays within the budget of 150 turns, 45 per file', () => {
    expect(Object.keys(RECORDING.turns).length).toBeLessThanOrEqual(150);
    for (const [file, rec] of Object.entries(RECORDINGS))
      expect(Object.keys(rec.turns).length, file).toBeLessThanOrEqual(45);
  });

  it('every turn carries its one-line note, and every answer a verdict (KTD8)', () => {
    for (const [sig, t] of Object.entries(RECORDING.turns)) {
      expect(t.note.trim(), sig).not.toBe('');
      expect(t.note.includes('\n'), sig).toBe(false);
      if (!t.search) expect(typeof t.right, sig).toBe('boolean');
    }
  });
});
