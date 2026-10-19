// Two-step test fixture for /dev/runner/: keeps the layout, runner and progress covered end to end (tests/e2e/layout.spec.ts)
// without tying those tests to a real chapter's script.
import StepRunner from './StepRunner';
import type { Step } from './steps';
import Quiz from '../quiz/Quiz';
import IsoStage, { type SceneCtx } from '../../lib/iso/IsoStage';
import { renderers, blockShadow } from '../../lib/iso/blocks';
import { byDepth } from '../../lib/iso/core.js';

interface S { window: number; quiz: number | null }

const PAGES = 6, PAGE = 4;   // the handbook: 6 pages of 4K tokens
const WINDOWS = [4, 8, 16, 32];
const fits = (s: S) => Math.min(PAGES, s.window / PAGE);
const QUIZ = {
  question: 'What happens to the pages that do not fit?',
  options: ['The model reads them later', 'The model never sees them', 'They are summarised for free'],
  correct: 1,
  explanation: 'Anything outside the context window is invisible to the model. That gap is what retrieval fills.',
};

const STEPS: Step<S>[] = [
  {
    id: 'fit', focus: 'window', visibleControls: ['window'],
    narration: 'The handbook is 24K tokens. Pick a context window the whole handbook fits in.',
    predicate: s => s.window >= PAGES * PAGE,
    hint: 'Six pages of 4K tokens each: you need room for 24K.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'], opensDrawer: 'fit',
    narration: 'It fits. One question before you move on.',
    predicate: s => s.quiz === QUIZ.correct,
    hint: 'If the model cannot see a page, can it use it?',
  },
];

const X = (i: number) => 28 + i * 52;
function scene(s: S) {
  return ({ top }: SceneCtx) => {
    const n = fits(s);
    const items = Array.from({ length: PAGES }, (_, i) => ({ at: [X(i), 28, 0], svg: renderers.docs({ x: X(i), y: 28, stat: '4K', selected: i < n }) }));
    items.push({ at: [X(PAGES) + 8, 28, 0], svg: renderers.llm({ x: X(PAGES) + 8, y: 28, state: n >= PAGES ? 'ok' : 'warn' }) });
    return Array.from({ length: PAGES }, (_, i) => blockShadow('docs', X(i), 28, top)).join('') + blockShadow('llm', X(PAGES) + 8, 28, top) + byDepth(items);
  };
}

export default function RunnerFixture() {
  return (
    <StepRunner<S>
      chapter="dev-runner"
      steps={STEPS}
      initial={{ window: WINDOWS[0], quiz: null }}
      stage={({ state }) => (
        <figure>
          <IsoStage board={[0, 0, X(PAGES) + 36, 56]} scene={scene(state)}
            label={`Six handbook pages beside the model; ${fits(state)} of 6 fit in a ${state.window}K window.`} />
          <figcaption>
            {fits(state)} of {PAGES} pages fit in a {state.window}K window
          </figcaption>
        </figure>
      )}
      controls={{
        window: ({ state, apply }) => (
          <div role="group" aria-label="Context window" className="opts">
            {WINDOWS.map(w => (
              <button key={w} type="button" className="chip" aria-pressed={state.window === w}
                onClick={() => apply({ ...state, window: w })}>{w}K</button>
            ))}
          </div>
        ),
        quiz: ({ state, apply }) => <Quiz {...QUIZ} value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} />,
      }}
      panels={{
        fit: { title: 'What the model sees', render: s => <p>{fits(s) * PAGE}K of {PAGES * PAGE}K handbook tokens fit in the window.</p> },
      }}
    />
  );
}
