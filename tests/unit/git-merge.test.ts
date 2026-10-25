// The line diff and the three-way merge (KTD10), against the real Git's diff3 markers in data/git/pinned.json.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/git/pinned.json' with { type: 'json' };
import { diff, linesOf, merge3, resolve, withMarkers } from '../../src/lib/git/merge';
import { BRANCHES, REPO } from '../../src/lib/git/graph';

const BASE = REPO.history.at(-1)!.text,
  SALE = BRANCHES.sale.commits[0].text,
  RISE = BRANCHES.rise.commits[0].text,
  HINGE = BRANCHES.hinge.commits[0].text;

describe('diff', () => {
  it('splits lines keeping their newlines', () => {
    expect(linesOf('a\nb\n')).toEqual(['a\n', 'b\n']);
    expect(linesOf('a\nb')).toEqual(['a\n', 'b']);
    expect(linesOf('')).toEqual([]);
  });

  it('finds the one changed line', () => {
    const d = diff(BASE, SALE);
    expect(d.filter(x => x.op === 'del').map(x => x.line)).toEqual(['Drill press: 189.00\n']);
    expect(d.filter(x => x.op === 'add').map(x => x.line)).toEqual(['Drill press: 159.00\n']);
    expect(
      d
        .filter(x => x.op !== 'add')
        .map(x => x.line)
        .join(''),
    ).toBe(BASE);
    expect(
      d
        .filter(x => x.op !== 'del')
        .map(x => x.line)
        .join(''),
    ).toBe(SALE);
  });
});

describe('three-way merge', () => {
  it('different lines merge cleanly with both changes', () => {
    const m = merge3(BASE, HINGE, SALE);
    expect(m.conflicts).toEqual([]);
    expect(resolve(m, 'ours')).toBe(pinned.cleanText);
  });

  it('the same line changed both ways is one hunk with both sides and the base, as Git marks it', () => {
    const m = merge3(BASE, RISE, SALE);
    expect(m.conflicts).toEqual([
      { ours: ['Drill press: 199.00\n'], base: ['Drill press: 189.00\n'], theirs: ['Drill press: 159.00\n'] },
    ]);
    expect(withMarkers(m, ['main', 'base', 'sale'])).toBe(pinned.markers);
    expect(resolve(m, 'theirs')).toBe(SALE);
    expect(resolve(m, 'both')).toContain('199.00\nDrill press: 159.00');
  });

  it('the same change on both sides is taken once; adjacent changes conflict, as in Git', () => {
    expect(merge3(BASE, SALE, SALE).conflicts).toEqual([]);
    const a = BASE.replace('Bracket: 2.20', 'Bracket: 2.40');
    expect(merge3(BASE, a, SALE).conflicts).toHaveLength(1);
  });

  it('lines added at either end merge', () => {
    const m = merge3('b\n', 'a\nb\n', 'b\nc\n');
    expect(resolve(m, 'ours')).toBe('a\nb\nc\n');
  });
});
