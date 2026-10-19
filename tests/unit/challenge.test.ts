import { describe, expect, it } from 'vitest';
import { CHOICES, PROBLEMS, START, advance, choose, complete, solved } from '../../src/components/quiz/TypeChallenge';

describe('type challenge', () => {
  it('has one best type per problem and explains every weaker pick', () => {
    for (const p of PROBLEMS) {
      for (const t of CHOICES) expect(!!p.weaker[t.id], `${p.id}/${t.id}`).toBe(t.id !== p.best);
    }
    // every type is the answer somewhere
    expect(new Set(PROBLEMS.map(p => p.best)).size).toBe(CHOICES.length);
  });

  it('accepts only the best type, then stays solved', () => {
    let c = START;
    for (const p of PROBLEMS) {
      const wrong = CHOICES.filter(t => t.id !== p.best);
      for (const t of wrong) { c = choose(c, t.id); expect(solved(c, p)).toBe(false); }
      expect(advance(c)).toBe(c);                       // no skipping an unsolved card
      c = choose(c, p.best);
      expect(solved(c, p)).toBe(true);
      expect(choose(c, wrong[0].id)).toBe(c);           // picks after solving change nothing
      c = advance(c);
    }
    expect(complete(c)).toBe(true);
    expect(c.at).toBe(PROBLEMS.length - 1);
    expect(advance(c)).toBe(c);
  });
});
