// Claims the Context copy states in words are pinned to the runs they describe, so a re-recording can't leave them stale.
import { describe, expect, it } from 'vitest';
import { run } from '../../src/lib/context/loop';
import { caseOf, DOCS } from '../../src/lib/context/window';
import { RECORDING } from '../../src/lib/context/turns';
import { COUNTS, OUT1, P1, RIGHTS, WRONGS } from '../../src/content/context/02-more-isnt-better';
import { CASES, FIRST, answer, sent } from '../../src/content/context/03-fetch-when-needed';
import { STUFF_ALL, WINNERS, play, score } from '../../src/content/context/07-workbench';
import { measure } from '../../src/content/context/05-clearing-the-desk';

describe('chapter 2: the start or the end beats the middle, and more passages cost more answers', () => {
  it('the predict’s answer is “start or end”, read off the runs', () => {
    expect(P1.options[OUT1]).toMatch(/start or the end/);
    expect(RIGHTS.early).toBeGreaterThan(RIGHTS.middle);
    expect(RIGHTS.late).toBeGreaterThan(RIGHTS.middle);
  });
  it('more distractors give more wrong answers', () => {
    expect(WRONGS[1]).toBeGreaterThan(WRONGS[0]);
  });
  it('the one late miss is put down to the crowd of distractors (Chroma), not to position', () => {
    const notes = Object.entries(RECORDING.turns).filter(([sig, t]) => sig.startsWith('case=refund-window|') && t.right === false && sig.split('|')[1].endsWith(',refund-window'));
    expect(notes).toHaveLength(1);
    expect(notes[0][0].split('|')[1].split(',')).toHaveLength(COUNTS[COUNTS.length - 1] + 1);  // the fact and the most distractors
    expect(notes[0][1].note).toMatch(/Chroma/);
    expect(notes[0][1].note).not.toMatch(/Liu|lost in the middle/i);
  });
});

describe('chapter 3: stuffing every document', () => {
  const at = (c: string) => DOCS.findIndex(d => d.id === caseOf(c).fact);
  it('answers the refund question wrong, its fact in the middle of the passages', () => {
    expect(answer(FIRST, 'stuff').right).toBe(false);
    expect(at(FIRST)).toBeGreaterThan(DOCS.length / 4);
    expect(at(FIRST)).toBeLessThan(DOCS.length * 3 / 4);
  });
  it('answers right only when the fact sits near the start or end', () => {
    for (const c of CASES) {
      const edge = at(c) < DOCS.length / 4 || at(c) >= DOCS.length * 3 / 4;
      expect(answer(c, 'stuff').right, c).toBe(edge);
    }
    expect(CASES.some(c => answer(c, 'stuff').right)).toBe(true);
  });
  it('searching takes fewer tokens over both calls than one stuffed window (recall: two-calls)', () => {
    for (const c of CASES) expect(sent(c, 'fetch'), c).toBeLessThan(sent(c, 'stuff'));
  });
});

describe('recall claims tied to the runs', () => {
  it('chapter 1: the order tools took more than the system prompt, the document and the question together (one-budget)', () => {
    const w = run(undefined, { sessions: [['free-shipping']], tools: true, retrieval: 'top' }).meter[0].window;
    const tools = w.parts.filter(p => p.kind === 'tools').reduce((n, p) => n + p.tokens, 0);
    expect(tools).toBeGreaterThan(w.tokens - tools);
  });
  it('chapter 2: the shipping-damage limit was given as the refund window (related-hurts)', () => {
    const t = run(undefined, { sessions: [['refund-window']], distractors: 4, place: 'middle' }).answers[0];
    expect(t.right).toBe(false);
    expect(t.text).toMatch(/five days/i);
    expect(DOCS.find(d => d.id === 'shipping-damage')!.text).toMatch(/five days|5 days/i);
  });
  it('chapter 5: clearing every turn with the cache on cost more than it saved (clear-when)', () => {
    expect(measure('cleared', true).cost).toBeGreaterThan(measure('full', true).cost);
  });
  it('chapter 7: searching with the full history and the cache beat stuffing on both; the cache never changes an answer', () => {
    const w = score(WINNERS[0]), s = score(STUFF_ALL);
    expect(WINNERS[0]).toEqual({ retrieval: 'fetch', history: 'full', cache: true });
    expect(w.right).toBeGreaterThan(s.right);
    expect(w.cost).toBeLessThan(s.cost);
    for (const p of [STUFF_ALL, WINNERS[0]]) {
      const on = play({ ...p, cache: true }).answers.map(a => a.right), off = play({ ...p, cache: false }).answers.map(a => a.right);
      expect(on).toEqual(off);
    }
  });
});
