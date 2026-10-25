// Chapter 1: what 70% should mean. The assistant's sixty stand-in answers drop as marbles into jars by the confidence
// each stated (mint right, tomato wrong); the reader predicts how often its 80–90% answers were right, then finds the
// jar furthest below its painted ring. Grading is live (Evals' key-fact check); the confidences are hand-set stand-ins.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ANSWERS, MIN_ANSWERS, itemsOf } from '../../lib/calibration/answers';
import { accuracy, accuracyOf, bins } from '../../lib/calibration/score';
import { JAR_PARTS } from '../../components/scenes/jarScene';
import { Outcome } from '../tool-calling/kit';
import { CalibrationStage, StandIn, pct } from './kit';

const MODULE = 'calibration',
  ID = '01-what-70-should-mean';
export const PARTS = JAR_PARTS;
/** The answer set's jars, as stated. */
export const JARS = bins(itemsOf(), MIN_ANSWERS);
/** The jar the prediction asks about: the one holding answers stated at 85%. */
export const ASKED = JARS.findIndex(b => b.lo <= 0.85 && 0.85 < b.hi);
/** The jar whose mint falls furthest below its ring. */
export const WORST = JARS.reduce((w, b, i) => (b.conf - accuracyOf(b) > JARS[w].conf - accuracyOf(JARS[w]) ? i : w), 0);
const range = (i: number) => `${pct(JARS[i].lo)} to ${pct(JARS[i].hi)}`;

export interface S {
  p1: number | null;
  sorted: boolean;
  pick: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `Of the answers it stated ${range(ASKED)} sure, how many were right?`,
  options: ['About as many as it stated', 'Well under what it stated', 'More than it stated'],
};
const gap = (i: number) => accuracyOf(JARS[i]) - JARS[i].conf;
export const OUTCOME = Math.abs(gap(ASKED)) < 0.05 ? 0 : gap(ASKED) < 0 ? 1 : 2;

export const QUIZ = {
  question: 'A weather app said “30% chance of rain” on 100 days, and it rained on 31 of them. What does that show?',
  options: ['Its 30% was honest: calibrated', 'It was wrong on the 69 dry days', 'Nothing: you can’t check a chance'],
  correct: 0,
  explanation: 'A confidence is checked over many cases: 30% should come true about 30 times in 100, and it did.',
  why: [
    'Right: over many days a 30% forecast should come true about three times in ten, and it did.',
    'A 30% forecast expects dry days; seventy of them is the forecast keeping its promise.',
    'One day can’t check a chance, but a hundred can: you count how often it came true.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${ANSWERS.length} past answers, each with the confidence the assistant stated. Calibrated means 70% sure is right seven times in ten.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sort',
    focus: 'sort',
    visibleControls: ['p1', 'sort'],
    narration:
      'Each answer is a marble, mint if right, tomato if wrong. It drops into the jar for the confidence it stated.',
    act: 'Drop the marbles.',
    say: { block: 'top', text: 'Most sure' },
    predicate: s => s.sorted,
    hint: 'Press “Drop the marbles”.',
  },
  {
    id: 'worst',
    focus: 'worst',
    visibleControls: ['result', 'worst'],
    narration: 'Each jar has a ring painted at its stated level. Honest jars fill with mint up to it.',
    act: 'Pick the jar furthest below its ring.',
    predicate: s => s.pick === WORST,
    hint: 'Read the Diagram tab: the longest red gap below the diagonal.',
    solution: s => ({ ...s, pick: WORST }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['result', 'quiz'],
    narration: `Overall it was right ${pct(accuracy(itemsOf()))} of the time. Its confidence is a promise you check by counting, jar by jar.`,
    act: 'One question to finish.',
    say: { block: 'low', text: 'Claims too much' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can one rainy day check a forecast? What about a hundred?',
  },
];

export default function What70ShouldMean() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, sorted: false, pick: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <CalibrationStage
          say={say}
          shown={{
            booth: { jars: state.sorted ? JARS : [] },
            caption: state.sorted
              ? `${ANSWERS.length} answers in ${JARS.length} jars. ${JARS.map(b => `Stated ${pct(b.conf)}: ${b.right} of ${b.n} right`).join('; ')}.`
              : `${ANSWERS.length} answers by the assistant, waiting to be sorted by the confidence each stated.`,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        sort: ({ state, sync }) => (
          <>
            <button type="button" className="big" onClick={() => sync({ ...state, sorted: true })}>
              Drop the marbles
            </button>
            <StandIn />
          </>
        ),
        result: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <StandIn />
          </>
        ),
        worst: ({ state, apply }) => (
          <div className="cb-picks" role="group" aria-label="Jars">
            {JARS.map((b, i) => (
              <button
                key={b.lo}
                type="button"
                className="chip"
                aria-pressed={state.pick === i}
                onClick={() => apply({ ...state, pick: i })}
              >
                Stated {pct(b.conf)}: {b.right} of {b.n} right
              </button>
            ))}
          </div>
        ),
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
