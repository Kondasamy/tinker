// Search chapter 7's workbench (KTD12): the pinned winners equal the live engine's, over RAG's committed vectors.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { openIndex } from '../../src/lib/rag/load';
import { MAP_FILE } from '../../src/lib/tokens/neighbours';
import { QUERIES } from '../../src/lib/search/engine';
import { meaningScores, parseVectors } from '../../src/lib/search/vectors';
import {
  BEST,
  PLANS,
  RIGHT,
  START,
  WINNERS,
  benchPlan,
  planKey,
  planOf,
  rowOf,
  scoreOf,
  solve,
  wins,
  type Meanings,
} from '../../src/lib/search/workbench';

let ms: Meanings;
beforeAll(async () => {
  const cfg = await (await openIndex(diskLoader)).load(MAP_FILE);
  const b = readFileSync('data/search/vectors.bin');
  const { vectors } = parseVectors(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  ms = QUERIES.map((_, i) => meaningScores(cfg, vectors[i]));
});

describe('the workbench', () => {
  it('360 plans, and the pinned winners are every plan tied for the most right pages', () => {
    expect(PLANS).toHaveLength(360);
    expect(new Set(PLANS.map(planKey)).size).toBe(360);
    const live = solve(ms);
    expect(live.best).toBe(BEST);
    expect(live.winners).toEqual(WINNERS);
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(BEST).toBeLessThanOrEqual(RIGHT);
  });

  it('a blend beats keywords alone and meaning alone; the start is not a winner', () => {
    const kw = Math.max(...PLANS.filter(p => p.meaning === 0).map(p => scoreOf(p, ms)));
    const vec = Math.max(...PLANS.filter(p => p.meaning === 1).map(p => scoreOf(p, ms)));
    expect(BEST).toBeGreaterThan(kw);
    expect(BEST).toBeGreaterThan(vec);
    expect(wins(START)).toBe(false);
    for (const k of WINNERS) expect(planOf(k).meaning).toBeGreaterThan(0);
    expect(wins(planOf(WINNERS[0]))).toBe(true);
  });

  it('keywords alone need no vectors; meaning without them throws', () => {
    expect(scoreOf(START, null)).toBeGreaterThan(0);
    expect(() => rowOf({ ...START, meaning: 0.5 }, 0, null)).toThrow();
  });

  it('reads a saved plan defensively', () => {
    expect(benchPlan(undefined)).toEqual(START);
    expect(benchPlan({ k1: 7, b: 'x', meaning: 0.75, clean: { stem: true } })).toEqual({
      ...START,
      meaning: 0.75,
      clean: { lower: false, stop: false, stem: true },
    });
  });
});

describe('the chapters against the engine', () => {
  it('chapter 7: Show me applies a winner; a losing plan’s row says what it missed', async () => {
    const { STEPS } = await import('../../src/content/search/07-tune-the-search-box');
    const step = STEPS.find(s => s.id === 'bench')!;
    const shown = step.solution!({ plan: START, quiz: null });
    expect(WINNERS).toContain(planKey(shown.plan));
    expect(step.predicate(shown)).toBe(true);
    expect(step.predicate({ plan: START, quiz: null })).toBe(false);
    const lost = QUERIES.map((_, qi) => rowOf(START, qi, null)).find(r => r.missed !== undefined);
    expect(lost?.missed).toBeDefined();
  });

  it('chapter 6: the blend puts both answers in the top five', async () => {
    const { PARA, PART, rankOf, rankingOf } = await import('../../src/content/search/06-words-vs-meaning');
    for (const q of [PARA, PART]) {
      const r = rankOf(rankingOf(q, 'blend', ms), q.right[0]);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(5);
    }
    expect(rankOf(rankingOf(PARA, 'meaning', ms), PARA.right[0])).toBe(1);
  });

  it('chapter 2: each card holds exactly one of the bench’s drawer words', async () => {
    const { CARDS, DRAWERS } = await import('../../src/content/search/02-the-index');
    const { belongs } = await import('../../src/content/search/kit');
    const { DEFAULT } = await import('../../src/lib/search/engine');
    for (const c of CARDS) expect(DRAWERS.filter(d => belongs(c, d, DEFAULT.clean))).toHaveLength(1);
  });
});
