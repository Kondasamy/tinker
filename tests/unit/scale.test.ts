import { describe, it, expect } from 'vitest';
import { TIMELINE, STOPS, STOP_5TB, WINDOW, PRICE, TOKENS_SOURCE, UNSTRUCTURED_SOURCE, tokensFor, overflows, formatBytes } from '../../src/lib/scale';
import { ERAS } from '../../src/components/scenes/Timeline';

describe('timeline sources (R5)', () => {
  it.each(TIMELINE.map(e => [e.claim, e] as const))('%s', (_, e) => {
    expect(e.sourceUrl).toMatch(/^https:\/\/\S+$/);
    expect(e.sourceTitle.trim()).not.toBe('');
    expect(e.claim.trim()).not.toBe('');
    expect(e.date).toMatch(/^\d{4}(-\d{2}){0,2}$/);
    expect(ERAS.map(x => x.id)).toContain(e.era);
  });

  it('every era has at least one cited entry', () => {
    for (const era of ERAS) expect(TIMELINE.some(e => e.era === era.id)).toBe(true);
  });

  it('chapter 2 side claims carry sources', () => {
    for (const e of [TOKENS_SOURCE, UNSTRUCTURED_SOURCE]) expect(e.sourceUrl).toMatch(/^https:\/\/\S+$/);
  });

  it('a stated price carries its source and date', () => {
    if (!PRICE) return;
    expect(PRICE.sourceUrl).toMatch(/^https:\/\//);
    expect(PRICE.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('corpus scale (R9)', () => {
  it('runs log-scale from one document to 5 PB', () => {
    expect(formatBytes(STOPS[0])).toBe('50 KB');
    expect(formatBytes(STOPS.at(-1)!)).toBe('5 PB');
    for (let i = 1; i < STOPS.length; i++) expect(STOPS[i] / STOPS[i - 1]).toBeCloseTo(10);
  });

  it.each(STOPS.map(b => [formatBytes(b), b]))('token estimate at %s is bytes ÷ 4', (_, b) => {
    expect(Math.abs(tokensFor(b) - b / 4)).toBeLessThanOrEqual(1);
  });

  it('AE2: at 5 TB the token count exceeds the largest cited context window', () => {
    const cited = Math.max(...TIMELINE.map(e => e.contextTokens ?? 0));
    expect(WINDOW).toBe(cited);
    expect(formatBytes(STOPS[STOP_5TB])).toBe('5 TB');
    expect(tokensFor(STOPS[STOP_5TB])).toBeGreaterThan(cited);
    expect(overflows(STOPS[STOP_5TB])).toBe(true);
    expect(overflows(STOPS[0])).toBe(false);
  });
});
