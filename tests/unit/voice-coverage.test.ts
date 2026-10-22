// Voice's recordings (KTD12): every call × line setting a chapter or the workbench can reach has a recorded transcript
// and reply, with its one-line note; every recording is reachable; no key twice; the recording stays within its budget.
import { describe, expect, it } from 'vitest';
import transcripts from '../../data/voice/transcripts.json' with { type: 'json' };
import fs from 'node:fs';
import { DOMAINS, RECORDED, WORKBENCH_DOMAINS, combos, keyOf, recorded } from '../../src/lib/voice/engine';
import { lineOf } from '../../src/lib/voice/script';

describe('voice recordings coverage (R3, KTD12)', () => {
  it.each(Object.keys(DOMAINS))('%s: every reachable setting has a recording', id => {
    for (const [call, line] of combos(DOMAINS[id]))
      expect(() => recorded(keyOf(call, line)), `${id} ${call} ${JSON.stringify(line)}`).not.toThrow();
  });

  it('the workbench: every call under every plan', () => {
    for (const [call, line] of combos(WORKBENCH_DOMAINS))
      expect(() => recorded(keyOf(call, line)), `${call} ${JSON.stringify(line)}`).not.toThrow();
  });

  it('every recording is reachable from a chapter or the workbench', () => {
    const reached = new Set(
      [...Object.values(DOMAINS), WORKBENCH_DOMAINS].flatMap(d => combos(d).map(([c, l]) => keyOf(c, l))),
    );
    expect(RECORDED.filter(k => !reached.has(k))).toEqual([]);
  });

  it('no key is recorded twice', () => {
    const raw = fs.readFileSync('data/voice/transcripts.json', 'utf8'),
      keys = [...raw.matchAll(/^ {4}"([^"]+)": \{/gm)].map(m => m[1]);
    expect(keys.length).toBe(Object.keys(transcripts.turns).length);
  });

  it('every recording has a one-line note, a verdict, and turns that name real clips', () => {
    for (const k of RECORDED) {
      const r = recorded(k);
      expect(r.note.trim(), k).not.toBe('');
      expect(r.note.includes('\n'), k).toBe(false);
      expect(['ok', 'cut-off', 'wrong', 'talked-over']).toContain(r.verdict);
      for (const t of r.turns) {
        const l = lineOf(t.clip);
        // a caller's turn carries what speech-to-text wrote, unless the host never heard it
        if (l.speaker !== 'assistant') expect(!!t.text !== !!t.lost, `${k} ${t.clip}`).toBe(true);
        if (t.kept !== undefined) expect(t.kept).toBeLessThanOrEqual(l.parts.length);
      }
    }
  });

  it('stays within the budget of 20 recordings', () => {
    expect(RECORDED.length).toBeLessThanOrEqual(20);
  });
});
