// The RAG trailer's captions quote only the repo's data: every number spoken is in the RAG data files
// (tests/unit/trailers.test.ts checks every trailer's captions against its recorded narration).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const VTT = readFileSync('public/video/rag-trailer.vtt', 'utf8');
// cue text only: drop the header and the timing lines
const cues = VTT.split('\n\n')
  .slice(1)
  .map(c => c.split('\n').slice(1).join(' ').trim());
const DATA = [
  'data/history/timeline.json',
  'public/data/index/manifest.json',
  ...readdirSync('data/answers').map(f => `data/answers/${f}`),
  ...readdirSync('data/questions').map(f => `data/questions/${f}`),
]
  .map(f => readFileSync(f, 'utf8'))
  .join('\n');

describe('RAG trailer captions', () => {
  it('has cues', () => {
    expect(VTT.startsWith('WEBVTT\n')).toBe(true);
    expect(cues.length).toBeGreaterThan(5);
  });

  it('every number in the captions appears in the RAG data files', () => {
    const numbers = cues.join(' ').match(/\d[\d,.]*\d|\d/g) ?? [];
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) {
      const bare = n.replace(/,/g, '');
      // as a whole number, written with or without thousands commas
      const re = new RegExp(`(?<![\\d.,])(${n.replace(/[.,]/g, '\\$&')}|${bare})(?![\\d])`);
      expect(DATA, `"${n}" is not in the RAG data`).toMatch(re);
    }
  });
});
