import { beforeAll, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { EVAL_BOARD, evalLabel, evalScene, evalState, type EvalOpts } from '../../src/components/scenes/evalScene';
import { cellName, evalGrid, flips, gridLabel, type GridCol } from '../../src/components/scenes/evalGrid';
import {
  colsOf,
  EvalStage,
  Grid,
  loadSuite,
  QUESTION_TEXT,
  resultsOf,
  suiteNow,
  type Suite,
} from '../../src/content/evals/kit';
import { compare, passed, QUESTIONS } from '../../src/lib/evals/suite';

import { diskLoader as loader } from '../../src/lib/rag/diskLoader';
let suite: Suite;
beforeAll(async () => {
  suite = await loadSuite(loader);
}, 60_000);

const draw = (o: EvalOpts) =>
  renderToString(createElement(IsoStage, { board: EVAL_BOARD, scene: evalScene(o), label: evalLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;

describe('the test bench', () => {
  it('the scoreboard reads the suite’s computed pass count', () => {
    for (const v of ['v0', 'v1', 'v2', 'v3'] as const) {
      const svg = draw({ results: resultsOf(suite[v]), version: v });
      expect(svg).toContain(`${v} · PASSED ${passed(suite[v])}/${QUESTIONS.length}`);
      expect(svg).toContain(`data-pile="pass" data-n="${passed(suite[v])}"`);
    }
  });
  it('cards move from the stack to the piles as they are graded; one rides the belt', () => {
    const results = resultsOf(suite.v1);
    expect(evalState({ results, graded: 5, riding: true })).toMatchObject({
      graded: 5,
      stack: results.length - 6,
      riding: true,
    });
    expect(draw({ results, graded: 5, riding: true })).toContain('class="riding"');
    expect(draw({ results })).not.toContain('class="riding"'); // nothing left to ride
  });
  it('an empty suite draws the bench with no cards and no NaN', () => {
    const svg = draw({ results: [] });
    expect(svg).toContain('PASSED 0/0');
    expect(svg).not.toContain('class="stack"');
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(draw({ results: [], riding: true, scale: 2.2 })).not.toMatch(/NaN|riding/);
  });
  it('a version name is escaped', () => {
    expect(draw({ results: [true], version: '<script>x</script>' })).not.toContain('<script');
  });
});

describe('the Results grid', () => {
  it('one cell per question × version; a flipped question is marked in both versions’ cells', () => {
    const cols = colsOf(suite, ['v1', 'v2']),
      { svg } = evalGrid({ questions: QUESTION_TEXT, cols });
    expect(count(svg, 'class="cell"')).toBe(QUESTIONS.length * 2);
    const { fixed, broken } = compare(suite.v1, suite.v2),
      changed = [...fixed, ...broken];
    expect(count(svg, 'data-flip="1"')).toBe(changed.length * 2);
    for (const id of broken) {
      const q = QUESTIONS.findIndex(x => x.id === id);
      expect(svg).toContain(`aria-label="Q${q + 1}, v2: failed, was passing" data-pass="0" data-flip="1"`);
      expect(svg).toContain(`aria-label="Q${q + 1}, v1: passed, fails in v2" data-pass="1" data-flip="1"`);
    }
  });
  it('names each cell, and a column’s score heads it', () => {
    const cols: GridCol[] = [
      { id: 'a', label: 'v1', results: [true, true] },
      { id: 'b', label: 'v2', results: [false, true] },
    ];
    expect(cellName(cols, 1, 0)).toBe('Q1, v2: failed, was passing');
    expect(cellName(cols, 1, 1)).toBe('Q2, v2: passed');
    expect(flips(cols)).toEqual([
      [true, false],
      [true, false],
    ]);
    expect(evalGrid({ questions: ['a', 'b'], cols }).svg).toContain('v2 1/2');
    expect(gridLabel(cols)).toBe('Results: 2 questions × 2 versions. v1 passed 2, v2 passed 1. Flipped: Q1.');
  });
  it('phone rows show question numbers only', () => {
    const cols = colsOf(suite, ['v1']),
      wide = evalGrid({ questions: QUESTION_TEXT, cols }).svg,
      phone = evalGrid({ questions: QUESTION_TEXT, cols, phone: true }).svg;
    expect(wide).toContain(QUESTION_TEXT[0].slice(0, 12));
    expect(phone).not.toContain(QUESTION_TEXT[0].slice(0, 12));
    expect(phone).toContain('>Q1<');
  });
  it('a question containing <script> renders escaped', () => {
    const html = renderToString(
      createElement(Grid, {
        cols: colsOf(suite, ['v1', 'v2']),
        questions: ['<script>alert(1)</script>', ...QUESTION_TEXT.slice(1)],
      }),
    );
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });
  it('no versions or no questions draws an empty grid, no NaN', () => {
    expect(evalGrid({ questions: [], cols: [] }).svg).not.toMatch(/NaN/);
    expect(gridLabel([])).toBe('Results: no versions run yet.');
  });
});

describe('loading the suite', () => {
  it('runs every version from the index', () => {
    for (const v of ['v0', 'v1', 'v2', 'v3'] as const) expect(suite[v]).toHaveLength(QUESTIONS.length);
  });
  it('a failed load rejects', async () => {
    await expect(
      loadSuite(async () => {
        throw new Error('offline');
      }),
    ).rejects.toThrow('offline');
  });
  it('before the suite loads, the stage says Preparing and predicates see no rows', () => {
    expect(suiteNow()).toBeNull();
    const html = renderToString(
      createElement(EvalStage, {
        show: () => {
          throw new Error('show ran before the suite loaded');
        },
      }),
    );
    expect(html).toContain('Preparing the test suite');
    expect(html).not.toContain('aria-pressed');
  });
});
