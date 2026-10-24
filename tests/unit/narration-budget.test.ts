// RAG's reading load (the "too text-heavy" pilot): every step's narration, counted after its template values are
// filled, against the budget, and the module's total against its count before the pilot.
import { describe, expect, it } from 'vitest';
import { STEPS as S1 } from '../../src/content/rag/01-history';
import { STEPS as S2 } from '../../src/content/rag/02-why-not-stuff-it';
import { STEPS as S3 } from '../../src/content/rag/03-what-is-rag';
import { STEPS as S4 } from '../../src/content/rag/04-layers';
import { STEPS as S5 } from '../../src/content/rag/05-accuracy';
import { STEPS as S6 } from '../../src/content/rag/06-types';
import { STEPS as S7 } from '../../src/content/rag/07-sandbox';

const words = (t: string) => t.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;

const CHAPTERS: [string, { narration: string; label?: string }[]][] = [
  ['01-history', S1],
  ['02-why-not-stuff-it', S2],
  ['03-what-is-rag', S3],
  ['04-layers', S4],
  ['05-accuracy', S5],
  ['06-types', S6],
  ['07-sandbox', S7],
];

const total = () => CHAPTERS.reduce((n, [, steps]) => n + steps.reduce((m, s) => m + words(s.narration), 0), 0);

// RAG's narration before the pilot, counted by `words` on 2026-10-24
const BEFORE = 2155;

describe('word count', () => {
  it('counts words, not punctuation or dashes', () => {
    expect(words('Locked in. Feed the sentence — then watch: 3 tokens.')).toBe(9);
    expect(words('')).toBe(0);
  });
});

describe.each(CHAPTERS)('RAG %s', (_, steps) => {
  it('keeps every step’s narration to 30 words', () => {
    const long = steps.filter(s => words(s.narration) > 30).map(s => `${words(s.narration)}: ${s.narration}`);
    expect(long).toEqual([]);
  });
  it('gives every step a log label of at most 8 words', () => {
    const bad = steps.filter(s => !s.label || words(s.label) > 8).map(s => s.label ?? s.narration.slice(0, 40));
    expect(bad).toEqual([]);
  });
});

describe('RAG narration', () => {
  it('is at most half its count before the pilot', () => {
    expect(total()).toBeLessThanOrEqual(BEFORE / 2);
  });
});
