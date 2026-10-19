import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { reduce, startRun, isRun, HINT_AFTER, type Step, type Run, type Action } from '../../src/components/story/steps';
import StepRunner from '../../src/components/story/StepRunner';
import Quiz from '../../src/components/quiz/Quiz';
import { puzzle } from '../../src/components/quiz/Puzzle';

interface S { k: number; overlap: number }
const STEPS: Step<S>[] = [
  { id: 'a', narration: 'Set k to 3', focus: 'k', visibleControls: ['k'], predicate: s => s.k === 3, hint: 'Three.' },
  puzzle<S>({
    id: 'b', narration: 'Fix the split', focus: 'overlap', visibleControls: ['overlap'], opensDrawer: 'chunks',
    broken: s => ({ ...s, overlap: 0 }), verdict: s => s.overlap >= 25, solution: s => ({ ...s, overlap: 25 }),
  }),
];
const run = (actions: Action<S>[], start: Run<S> = startRun(STEPS, { k: 1, overlap: 10 })) =>
  actions.reduce((r, a) => reduce(STEPS, r, a), start);
const apply = (state: S): Action<S> => ({ type: 'apply', state });

describe('step machine', () => {
  it('advances when the predicate passes and not before', () => {
    const r1 = run([apply({ k: 2, overlap: 10 })]);
    expect(r1.index).toBe(0);
    const r2 = run([apply({ k: 3, overlap: 10 })]);
    expect(r2.index).toBe(1);
  });

  it(`shows the hint after ${HINT_AFTER} failed attempts`, () => {
    const fail = apply({ k: 2, overlap: 10 });
    expect(run([fail, fail]).hint).toBe(false);
    expect(run([fail, fail, fail]).hint).toBe(true);
  });

  it('shows the hint after idling', () => {
    expect(run([{ type: 'idle' }]).hint).toBe(true);
  });

  it('Back returns to the previous step at its starting state', () => {
    const r = run([apply({ k: 3, overlap: 10 }), { type: 'back' }]);
    expect(r.index).toBe(0);
    expect(r.state).toEqual({ k: 1, overlap: 10 });
    expect(isRun(STEPS, r)).toBe(true);
  });

  it("Reset restores the step's starting (broken) canvas", () => {
    const r = run([apply({ k: 3, overlap: 10 }), apply({ k: 3, overlap: 10 }), { type: 'reset' }]);
    expect(r.index).toBe(1);
    expect(r.state).toEqual({ k: 3, overlap: 0 });   // puzzle setup broke it on entry
    expect(r.fails).toBe(0);
  });

  it('Show me solves the puzzle', () => {
    const r = run([apply({ k: 3, overlap: 10 }), { type: 'showMe' }]);
    expect(r.state.overlap).toBe(25);
    expect(r.done).toBe(true);
  });

  it('Show me does nothing on a step without a solution', () => {
    const start = startRun(STEPS, { k: 1, overlap: 10 });
    expect(reduce(STEPS, start, { type: 'showMe' })).toBe(start);
  });

  it('a step can open the drawer; Inspect opens it without changing the focused step', () => {
    expect(run([apply({ k: 3, overlap: 10 })]).drawer).toBe('chunks');
    const r = run([{ type: 'inspect', panel: 'answer' }]);
    expect(r.drawer).toBe('answer');
    expect(r.index).toBe(0);
    expect(STEPS[r.index].focus).toBe('k');
  });

  it('a step with opensDrawer null closes an open drawer on entry', () => {
    const steps: Step<S>[] = [STEPS[0], { ...STEPS[1], opensDrawer: null }];
    const r = [{ type: 'inspect', panel: 'answer' }, apply({ k: 3, overlap: 10 })].reduce((r, a) => reduce(steps, r, a as Action<S>), startRun(steps, { k: 1, overlap: 10 }));
    expect(r.index).toBe(1);
    expect(r.drawer).toBeNull();
  });

  it('rejects malformed saved runs', () => {
    expect(isRun(STEPS, undefined)).toBe(false);
    expect(isRun(STEPS, { index: 5, starts: [] })).toBe(false);
  });
});

describe('StepRunner', () => {
  const html = () => renderToString(createElement(StepRunner<S>, {
    chapter: 'x', steps: STEPS, initial: { k: 1, overlap: 10 },
    stage: () => createElement('div', null, 'stage'),
    controls: { k: () => createElement('input', { 'aria-label': 'top-k' }), overlap: () => createElement('input', { 'aria-label': 'overlap' }) },
  }));

  it('renders only the controls named by the current step', () => {
    expect(html()).toContain('aria-label="top-k"');
    expect(html()).not.toContain('aria-label="overlap"');
  });
});

describe('Quiz', () => {
  const q = { question: 'Q?', options: ['a', 'b'], correct: 1, explanation: 'Because b.' };
  it('shows right feedback and the explanation', () => {
    const h = renderToString(createElement(Quiz, { ...q, value: 1 }));
    expect(h).toContain('RIGHT');
    expect(h).toContain('Because b.');
  });
  it('shows wrong feedback and the explanation', () => {
    const h = renderToString(createElement(Quiz, { ...q, value: 0 }));
    expect(h).toContain('NOT QUITE');
    expect(h).toContain('Because b.');
  });
  it('shows no feedback before an answer', () => {
    expect(renderToString(createElement(Quiz, q))).not.toContain('Because b.');
  });
});
