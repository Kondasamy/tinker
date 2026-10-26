// Coding agents' engine against its pins (KTD12): every run a chapter teaches, the search and its read cost, and the
// host stages (protected test files, the run tiers, asking a person).
import { describe, expect, it } from 'vitest';
import pinned from '../../data/coding-agents/pinned.json';
import { isProtected, run, tierOf, type Setup } from '../../src/lib/coding-agents/loop';
import { RECORDING } from '../../src/lib/coding-agents/turns';
import { hitsText, search, tokensOf } from '../../src/lib/coding-agents/search';
import { textOf } from '../../src/lib/coding-agents/repo';
import { BYTES_PER_TOKEN } from '../../src/lib/scale';

describe('pinned runs', () => {
  it.each(pinned.runs.map(p => [p.chapter, JSON.stringify(p.setup), p] as const))('%s %s', (_, __, p) => {
    const r = run(RECORDING, p.setup as Partial<Setup> & { case: string });
    expect(r.status).toBe('done');
    expect({
      hist: r.hist,
      code: r.code,
      tests: r.tests,
      right: r.right,
      tokens: r.tokens,
      prompts: r.prompts,
    }).toEqual({ hist: p.hist, code: p.code, tests: p.tests, right: p.right, tokens: p.tokens, prompts: p.prompts });
  });
});

describe('search and the reading budget', () => {
  it('finds the discount file first for “bulk discount”, at the pinned cost', () => {
    const hits = search(pinned.search.query);
    expect(hits[0].path).toBe(pinned.search.top);
    expect(tokensOf(hitsText(hits))).toBe(pinned.search.tokens);
  });
  it('a read costs the file’s bytes over BYTES_PER_TOKEN', () => {
    const t = textOf('src/discount.ts');
    expect(tokensOf(t)).toBe(Math.ceil(new TextEncoder().encode(t).length / BYTES_PER_TOKEN));
  });
  it('searching first reads less than opening files one by one', () => {
    const [a, b] = [run(RECORDING, { case: 'bulk' }), run(RECORDING, { case: 'bulk', search: false })];
    expect(a.tokens).toBeLessThan(b.tokens);
  });
});

describe('host stages', () => {
  it('protects test files only', () => {
    expect(isProtected('tests/discount.test.ts')).toBe(true);
    expect(isProtected('src/discount.ts')).toBe(false);
  });
  it('puts each command in its tier by its longest prefix', () => {
    expect(tierOf('npm test')).toBe('allow');
    expect(tierOf('git push origin fix/bulk-discount')).toBe('ask');
    expect(tierOf('git push --force origin main')).toBe('never');
    expect(tierOf('make deploy')).toBe('never');
  });
  it('with protection on, the weakening edit is refused and the agent fixes the code', () => {
    const r = run(RECORDING, { case: 'cheat', protect: true });
    expect(r.hist).toContain('edit:tests/discount.test.ts:refused');
    expect(r.tests).toBe('base');
    expect(r.right).toBe(true);
  });
  it('the loosened tests pass their own run but the ticket is not really done', () => {
    const r = run(RECORDING, { case: 'cheat' });
    expect(r.hist.at(-1)).toBe('run:npm test:pass');
    expect(r.right).toBe(false);
  });
});
