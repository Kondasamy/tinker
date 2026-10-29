// Writing a prompt's recordings coverage (KTD4): every docket a chapter can build finds a reply, no signature is
// recorded twice, nothing recorded is unreachable, and the files stay small. Simulated files count like recorded ones.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { combos, DOMAINS, signature, WORKBENCH_DOMAINS } from '../../src/lib/prompts/assemble';
import { NORECORD, RECORDINGS, replyOf } from '../../src/lib/prompts/story';

const DIR = 'data/prompts/replies';

describe('prompts recordings coverage (KTD4)', () => {
  it('every chapter control reaches a reply', () => {
    for (const [ch, d] of Object.entries(DOMAINS))
      for (const s of combos(d)) expect(replyOf(ch, s), `${ch} ${signature(s)}`).not.toBe(NORECORD);
  });
  it('the workbench is a chapter domain', () => {
    expect(DOMAINS['07-workbench']).toBe(WORKBENCH_DOMAINS);
  });
  it('no signature is recorded twice, and every recorded one is reached', () => {
    const recorded = Object.values(RECORDINGS).flatMap(f => Object.keys(f.replies));
    expect(new Set(recorded).size, 'duplicate signature').toBe(recorded.length);
    const reached = new Set(Object.values(DOMAINS).flatMap(d => combos(d).map(signature)));
    expect(
      recorded.filter(s => !reached.has(s)),
      'unreached recording',
    ).toEqual([]);
  });
  it('every file names its model and date', () => {
    for (const [name, f] of Object.entries(RECORDINGS)) {
      expect(f.meta.models.main, name).toMatch(/\//);
      expect(f.meta.accessed, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(f.meta.script, name).toBeTruthy();
    }
  });
  it('stays at most 400 replies and 150 KB in all', () => {
    const files = readdirSync(DIR);
    const replies = Object.values(RECORDINGS).reduce((n, f) => n + Object.keys(f.replies).length, 0);
    const bytes = files.reduce((n, f) => n + readFileSync(`${DIR}/${f}`).length, 0);
    expect(replies).toBeLessThanOrEqual(400);
    expect(bytes).toBeLessThanOrEqual(150_000);
  });
  it('never keeps a key or a reasoning trace', () => {
    for (const f of readdirSync(DIR)) {
      const s = readFileSync(`${DIR}/${f}`, 'utf8');
      expect(s).not.toMatch(/nvapi-|reasoning_content/);
    }
  });
  it('every domain a reply names is a made-up .example one (R13)', () => {
    for (const f of Object.values(RECORDINGS))
      for (const r of Object.values(f.replies)) expect(r.text).not.toMatch(/\.(com|net|org|io)\b/i);
  });
});
