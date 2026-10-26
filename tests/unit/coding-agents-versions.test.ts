// Coding agents' code (KTD8): what the reader is shown is what runs. Every subset of every recorded patch's hunks,
// applied to the text it patches, is exactly a version file's source; every version file is one of them; the tests
// run live over the real modules.
import { describe, expect, it } from 'vitest';
import {
  applyHunks,
  BASE,
  CODE,
  fullOf,
  hunkCount,
  PATCH_LIST,
  TESTS,
  version,
  VERSIONS,
} from '../../src/lib/coding-agents/repo';
import { allPass, runTests, TEST_IDS, verdict } from '../../src/lib/coding-agents/tests';

/** The version budget: 7 subsets of the three-hunk patch, one loosened test file, plus the two base files. */
const VERSION_FILES = 8;

describe('versions (KTD8)', () => {
  it.each(PATCH_LIST.map(p => [p.id, p] as const))(
    'every hunk subset of %s, applied to its base text, is its version file’s source',
    (_, p) => {
      const from = version(p.path, p.from).text,
        to = version(p.path, fullOf(p)).text,
        n = hunkCount(from, to);
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(3);
      expect(p.subsets).toHaveLength(2 ** n);
      for (let mask = 0; mask < 2 ** n; mask++)
        expect(applyHunks(from, to, mask), `${p.id} mask ${mask}`).toBe(version(p.path, p.subsets[mask]).text);
    },
  );

  it('every version file is some patch’s subset, and the budget holds', () => {
    const made = new Set(PATCH_LIST.flatMap(p => p.subsets.map(v => `${p.path}@${v}`)));
    for (const v of VERSIONS) expect(made.has(`${v.path}@${v.vid}`), `${v.path}@${v.vid}`).toBe(true);
    expect(VERSIONS.length - 2).toBe(VERSION_FILES);
  });

  it('applying none of the hunks gives the base back, all of them the full patch', () => {
    const from = version(CODE, BASE[CODE]).text,
      to = version(CODE, '111').text;
    expect(applyHunks(from, to, 0)).toBe(from);
    expect(applyHunks(from, to, 7)).toBe(to);
  });
});

describe('the tests run live', () => {
  it('the base fails the 50-hinge check; the two-hunk fix passes everything', () => {
    expect(verdict(runTests(BASE[CODE]))).toBe('fail=at-50+cents');
    expect(allPass(runTests('110'))).toBe(true);
  });
  it('the drive-by hunk breaks the line check', () => {
    expect(verdict(runTests('111'))).toBe('fail=line');
  });
  it('the loosened test file passes code the original fails', () => {
    expect(allPass(runTests('100', 'loose'))).toBe(true);
    expect(verdict(runTests('100'))).toBe('fail=cents');
  });
  it('every version of the test file keeps the same checks, in order', () => {
    for (const v of VERSIONS.filter(x => x.path === TESTS))
      expect(runTests('110', v.vid).map(t => t.id)).toEqual(TEST_IDS);
  });
});
