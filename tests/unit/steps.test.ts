import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  reduce,
  startRun,
  isRun,
  HINT_AFTER,
  type Step,
  type Run,
  type Action,
} from '../../src/components/story/steps';
import StepRunner from '../../src/components/story/StepRunner';
import Quiz from '../../src/components/quiz/Quiz';
import { puzzle } from '../../src/components/quiz/Puzzle';
import Predict, { Reveal } from '../../src/components/quiz/Predict';
import { UNSURE } from '../../src/lib/recall';

interface S {
  k: number;
  overlap: number;
}
const STEPS: Step<S>[] = [
  { id: 'a', narration: 'Set k to 3', focus: 'k', visibleControls: ['k'], predicate: s => s.k === 3, hint: 'Three.' },
  puzzle<S>({
    id: 'b',
    narration: 'Fix the split',
    focus: 'overlap',
    visibleControls: ['overlap'],
    opensDrawer: 'chunks',
    broken: s => ({ ...s, overlap: 0 }),
    verdict: s => s.overlap >= 25,
    solution: s => ({ ...s, overlap: 25 }),
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

  it('sync advances like apply, but a miss is not a failed attempt', () => {
    const sync = (state: S): Action<S> => ({ type: 'sync', state });
    const missed = run([sync({ k: 2, overlap: 10 }), sync({ k: 4, overlap: 10 }), sync({ k: 5, overlap: 10 })]);
    expect(missed).toMatchObject({ index: 0, fails: 0, hint: false, state: { k: 5 } });
    expect(run([sync({ k: 3, overlap: 10 })]).index).toBe(1);
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
    expect(r.state).toEqual({ k: 3, overlap: 0 }); // puzzle setup broke it on entry
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

  describe('watch', () => {
    const demoed: Step<S>[] = [{ ...STEPS[0], demo: s => ({ ...s, k: 3 }) }, STEPS[1]];
    const start = () => startRun(demoed, { k: 1, overlap: 10 });
    const watch = (r: Run<S>) => reduce(demoed, r, { type: 'watch' });

    it("plays a step's demo and advances", () => {
      const r = watch(start());
      expect(r.index).toBe(1);
      expect(r.state.k).toBe(3);
    });

    it('falls back to the solution, and on the last step finishes the chapter', () => {
      const r = watch(watch(start()));
      expect(r.state.overlap).toBe(25);
      expect(r.done).toBe(true);
    });

    it('does nothing on a step with neither demo nor solution', () => {
      const s = startRun(STEPS, { k: 1, overlap: 10 });
      expect(reduce(STEPS, s, { type: 'watch' })).toBe(s);
    });

    it('a demo that misses never counts as a try or raises a hint', () => {
      const missing: Step<S>[] = [{ ...STEPS[0], demo: s => ({ ...s, k: 2 }) }];
      let r = startRun(missing, { k: 1, overlap: 10 });
      for (let i = 0; i < HINT_AFTER + 1; i++) r = reduce(missing, r, { type: 'watch' });
      expect(r.index).toBe(0);
      expect(r.fails).toBe(0);
      expect(r.hint).toBe(false);
    });
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
    const r = [{ type: 'inspect', panel: 'answer' }, apply({ k: 3, overlap: 10 })].reduce(
      (r, a) => reduce(steps, r, a as Action<S>),
      startRun(steps, { k: 1, overlap: 10 }),
    );
    expect(r.index).toBe(1);
    expect(r.drawer).toBeNull();
  });

  it('rejects malformed saved runs', () => {
    expect(isRun(STEPS, undefined)).toBe(false);
    expect(isRun(STEPS, { index: 5, starts: [] })).toBe(false);
  });
});

describe('restoring a saved run (KTD4)', () => {
  const saved = run([apply({ k: 3, overlap: 10 })]);
  const { ids: _, ...unsigned } = saved; // a run saved before runs carried their step ids

  it('signs a run with its ordered step ids', () => {
    expect(saved.ids).toEqual(['a', 'b']);
  });

  it('resumes when the saved ids match the chapter’s steps', () => {
    expect(isRun(STEPS, JSON.parse(JSON.stringify(saved)))).toBe(true);
  });

  it('restarts when a step was inserted before the saved index', () => {
    const steps: Step<S>[] = [STEPS[0], { ...STEPS[0], id: 'new' }, STEPS[1]];
    expect(isRun(steps, saved)).toBe(false);
  });

  it('restarts when steps were reordered or renamed', () => {
    expect(isRun([STEPS[1], STEPS[0]], saved)).toBe(false);
    expect(isRun(STEPS, { ...saved, ids: ['a', 'c'] })).toBe(false);
  });

  it('resumes an unsigned run only while the chapter still has its legacy steps', () => {
    expect(isRun(STEPS, unsigned)).toBe(false);
    expect(isRun(STEPS, unsigned, ['a', 'b'])).toBe(true);
    expect(isRun(STEPS, unsigned, ['a', 'old', 'b'])).toBe(false);
    expect(isRun(STEPS, saved, ['x', 'y'])).toBe(true); // a signed run ignores the legacy signature
  });
});

describe('StepRunner', () => {
  const html = () =>
    renderToString(
      createElement(StepRunner<S>, {
        chapter: 'x',
        steps: STEPS,
        initial: { k: 1, overlap: 10 },
        stage: () => createElement('div', null, 'stage'),
        controls: {
          k: () => createElement('input', { 'aria-label': 'top-k' }),
          overlap: () => createElement('input', { 'aria-label': 'overlap' }),
        },
      }),
    );

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
  it('is a radio group, and offers no “not sure” unless asked', () => {
    const h = renderToString(createElement(Quiz, q));
    expect(h).toContain('role="radiogroup"');
    expect(h).toContain('role="radio"');
    expect(h).not.toContain('not sure');
  });
  it('a wrong pick shows that option’s why line, not the explanation', () => {
    const h = renderToString(createElement(Quiz, { ...q, why: ['a is a myth.', 'b holds.'], value: 0 }));
    expect(h).toContain('a is a myth.');
    expect(h).not.toContain('Because b.');
  });
  it('“not sure” shows the answer and explanation with no NOT QUITE stamp', () => {
    const h = renderToString(createElement(Quiz, { ...q, unsure: true, value: UNSURE }));
    expect(h).toContain('I’m not sure');
    expect(h).toContain('Because b.');
    expect(h).not.toContain('NOT QUITE');
    expect(h).not.toContain('RIGHT');
  });
});

describe('Predict', () => {
  const p = { question: 'What happens?', options: ['x', 'y'] };
  it('shows the prediction and no right/wrong stamp', () => {
    const h = renderToString(createElement(Predict, { ...p, value: 1 }));
    expect(h).toContain('You predicted: <!-- -->y');
    expect(h).not.toMatch(/RIGHT|NOT QUITE/);
  });
  it('the reveal compares the prediction with what happened', () => {
    expect(
      renderToString(createElement(Reveal, { prediction: 'y', outcome: 'x', revealed: false, onReveal: () => {} })),
    ).not.toContain('What happened');
    const h = renderToString(
      createElement(Reveal, { prediction: 'y', outcome: 'x', revealed: true, onReveal: () => {} }),
    );
    expect(h).toContain('What happened');
    expect(h).toContain('NOT WHAT YOU PREDICTED');
  });
});

describe('“not sure” through sync', () => {
  interface Q {
    quiz: number | null;
  }
  const QS: Step<Q>[] = [
    { id: 'q', narration: 'Answer', visibleControls: ['quiz'], predicate: s => s.quiz === 1 || s.quiz === UNSURE },
    { id: 'after', narration: 'Next', visibleControls: [], predicate: () => false },
  ];
  it('advances without counting a miss', () => {
    const missed = reduce(QS, startRun(QS, { quiz: null }), { type: 'apply', state: { quiz: 0 } });
    expect(missed.fails).toBe(1);
    const r = reduce(QS, missed, { type: 'sync', state: { quiz: UNSURE } });
    expect(r).toMatchObject({ index: 1 });
    expect(reduce(QS, startRun(QS, { quiz: null }), { type: 'sync', state: { quiz: UNSURE } })).toMatchObject({
      index: 1,
      fails: 0,
      hint: false,
    });
  });
});
