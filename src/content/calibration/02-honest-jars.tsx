// Chapter 2: honest jars. Larkspur mini's own guesses over Fine-tuning's held-out copy, measured live in the browser a
// window per frame: every position is a marble (its top guess's probability, and whether it was the real next piece).
// The reader predicts how often a 90%-sure guess is right, measures, then reads the reliability diagram. The tab is in
// the step state, since step 3 asks for it.
import { useEffect } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { num } from '../../lib/format';
import { report } from '../../lib/calibration/measure';
import { accuracyOf } from '../../lib/calibration/score';
import { JAR_PARTS } from '../../components/scenes/jarScene';
import { Outcome } from '../tool-calling/kit';
import { CalibrationStage, MiniNote, Waiting, guessesNow, loadAll, pct, useGuesses, type View } from './kit';

const MODULE = 'calibration',
  ID = '02-honest-jars';
export const PARTS = JAR_PARTS;

export interface S {
  p1: number | null;
  measured: boolean;
  /** the measurement landed (the stage reports it) */
  read: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: 'When Larkspur mini puts 90% or more on its top guess, how often is that guess right?',
  options: [
    'About nine times in ten, as it says',
    'Rarely: a tiny model guesses badly',
    'Always: it is never that sure by chance',
  ],
};
/** The top jar's outcome: honest within 10 points, under, or over. */
export const outcomeOf = (acc: number, conf: number) => (Math.abs(acc - conf) <= 0.1 ? 0 : acc < conf ? 1 : 2);

export const QUIZ = {
  question:
    'A spam filter is right on 60% of its calls overall, and its calls marked 95% sure are right 94% of the time. Is it calibrated?',
  options: [
    'Yes, at least for its sure calls: 95% stated, 94% right',
    'No: 60% right overall is too low',
    'You can’t tell without its training data',
  ],
  correct: 0,
  explanation:
    'Calibration compares stated confidence with how often it comes true, jar by jar; a model can be often wrong and still honest.',
  why: [
    'Right: being honest about how sure it is differs from being right often.',
    'Low accuracy is a different problem; its sure calls still keep their promise.',
    'You check calibration on fresh cases, not on what it trained on.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Larkspur mini gives every possible next piece a probability. Its top guess, and the probability it gave, are one marble.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'measure',
    focus: 'measure',
    visibleControls: ['p1', 'measure'],
    narration: 'The fair test is held-out text, which it never trained on. Every place in it is one guess.',
    act: 'Measure it on held-out text.',
    say: { block: 'top', text: 'Fresh text only' },
    predicate: s => s.measured && s.read,
    hint: 'Press “Measure on held-out text” and wait for the jars to fill.',
  },
  {
    id: 'diagram',
    focus: 'diagram',
    visibleControls: ['result', 'diagram'],
    narration:
      'A reliability diagram plots each jar: stated confidence across, how often right up. Honest jars sit on the dashed diagonal.',
    act: 'Open the Diagram tab.',
    predicate: s => s.view === 'diagram',
    hint: 'The Diagram button is above the picture.',
    solution: s => ({ ...s, view: 'diagram' }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['result', 'quiz'],
    narration:
      'Its top guess is often wrong, yet it knows when: unsure guesses are mostly tomato, sure ones mostly mint.',
    act: 'One question to finish.',
    say: { block: 'low', text: 'Unsure, and right' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is calibration about how often it is right, or how well it knows when?',
  },
];

function Stage({ state, say, sync }: { state: S; say?: Step<S>['say']; sync: (s: S) => void }) {
  const g = useGuesses('base', state.measured);
  const r = g.guesses ? report(g.guesses) : null;
  useEffect(() => {
    if (state.measured && r && !state.read) sync({ ...state, read: true });
  });
  return (
    <CalibrationStage
      say={say}
      view={state.view}
      onView={view => sync({ ...state, view })}
      shown={{
        wait:
          g.status === 'error' || (state.measured && !r) ? (
            <Waiting failed={g.status === 'error'} retry={g.retry} done={g.model ? g.done : undefined} />
          ) : undefined,
        booth: { jars: r?.jars ?? [] },
        caption: r
          ? `${num(r.positions)} held-out guesses in ${r.jars.length} jars; ${num(r.right)} right (${pct(r.right / r.positions)}). Larkspur mini’s own numbers.`
          : 'Larkspur mini, ready to guess the next piece of text it never trained on.',
      }}
    />
  );
}

export default function HonestJars() {
  useEffect(() => {
    loadAll(['base']).catch(() => {});
  }, []);
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, measured: false, read: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, sync }) => <Stage state={state} say={say} sync={sync} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        measure: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, measured: true })}>
            Measure on held-out text
          </button>
        ),
        diagram: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.view === 'diagram'}
            onClick={() => apply({ ...state, view: 'diagram' })}
          >
            Show the Diagram tab
          </button>
        ),
        result: ({ state }) => {
          const gs = guessesNow('base');
          if (!gs) return null;
          const top = report(gs).jars.at(-1)!;
          return (
            <>
              <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(accuracyOf(top), top.conf)} />
              <p className="cb-note">
                Stated {pct(top.conf)} or so: {top.right} of {top.n} right.
              </p>
              <MiniNote />
            </>
          );
        },
        quiz: ({ state, apply, sync }) => (
          <Quiz
            {...QUIZ}
            unsure
            value={state.quiz}
            onAnswer={(_, q) => apply({ ...state, quiz: q })}
            onUnsure={() => sync({ ...state, quiz: UNSURE })}
          />
        ),
      }}
    />
  );
}
