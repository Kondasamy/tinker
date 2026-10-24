// Chapter 6: gate the switch. Evals' release gate (a pass-rate bar, and no question the baseline passed may fail) judges
// the router against all-large, the assistant that ships today. The reader runs the baseline through the gate, predicts
// whether a cheaper router can pass the same gate, then finds the cheapest threshold that ships (a puzzle with "Show me").
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import {
  ALL_LARGE,
  cheapestShipping,
  frontier,
  gate,
  GATE,
  QUESTION_IDS,
  questionText,
  run,
  THRESHOLDS,
} from '../../lib/small-models/router';
import { units } from '../../components/scenes/frontierChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ROUTER_PARTS } from '../../components/scenes/routerScene';
import { SmallStage, type View } from './kit';

export const PARTS = ROUTER_PARTS;
const MODULE = 'small-models',
  ID = '06-gate-the-switch';
const POINTS = frontier(),
  LARGE = run(ALL_LARGE),
  BEST = cheapestShipping();
const BEST_I = BEST === null ? 0 : THRESHOLDS.indexOf(BEST);
/** the puzzle starts on a threshold that fails the gate */
const START = Math.max(
  0,
  THRESHOLDS.findIndex(t => !gate({ threshold: t }).ship && t > 0),
);
export const thresholdAt = (i: number) => THRESHOLDS[i] ?? THRESHOLDS[0];
const rules = `${GATE.threshold}% must pass${GATE.noRegressions ? ', and no question all-large gets right may fail' : ''}`;

interface S {
  base: boolean;
  p1: number | null;
  t: number;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `All-large passes the gate. Can any router threshold pass the same gate (${rules}) and cost less?`,
  options: [
    'Yes: a threshold that sends every wrong small answer up keeps all-large’s answers for less',
    'No: any small answer is a risk the gate will catch',
    'Yes, any threshold: the gate only checks the pass rate',
  ],
};
export const shipOutcome = () =>
  BEST !== null && run({ threshold: BEST }).cost < LARGE.cost
    ? 0
    : THRESHOLDS.every(t => gate({ threshold: t }).ship)
      ? 2
      : 1;

export const QUIZ = {
  question:
    'A cheaper setup passes 91% of the test set against a 90% bar, but one question the current version answers right now fails. The gate checks for regressions. What does it say?',
  options: [
    'Don’t ship: a question that passed on the baseline now fails',
    'Ship: 91% is over the bar',
    'Ship: one question is noise',
    'The gate can’t compare two different models',
  ],
  correct: 0,
  explanation: 'The pass rate can hide a lost answer; the no-regressions rule finds it, question by question.',
  why: [
    'Right: this is the case the rule is for, a confident wrong answer the bar alone would let through.',
    'The bar is one of two rules; the regression rule fails it.',
    'The rule exists because one lost answer can be the one that matters.',
    'The gate compares answers to the same questions, whatever wrote them.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'baseline',
    focus: 'baseline',
    visibleControls: ['baseline'],
    narration: 'All-large ships today, so it is the baseline. The release gate checks the pass rate and regressions.',
    act: 'Run the baseline through it.',
    say: { block: 'big', text: 'The baseline' },
    predicate: s => s.base,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['decision', 'p1'],
    narration: `All-large passes, at a cost of ${units(LARGE.cost)}. Now the router has to pass the same gate.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'gate',
    focus: 'gate',
    visibleControls: ['p1', 'gate'],
    narration: 'The router starts at a threshold the gate turns down.',
    act: 'Find the cheapest threshold that ships.',
    predicate: s => BEST !== null && thresholdAt(s.t) === BEST,
    setup: s => ({ ...s, t: START }),
    solution: s => ({ ...s, t: BEST_I }),
    hint: 'Each question the gate names as regressed is a wrong small answer that stayed small. Raise the threshold past its score, and no further.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['gate', 'why', 'quiz'],
    narration: `It ships at ${units(run({ threshold: BEST ?? 1 }).cost)} against all-large’s ${units(LARGE.cost)}, every right answer kept. Below it, the sure, wrong answer stays small and regresses.`,
    act: 'One question to finish.',
    say: { block: 'router', text: 'Cheapest ship' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which rule looks at each question, not the total?',
  },
];

function Decision({ t }: { t: number | null }) {
  const p = t === null ? ALL_LARGE : { threshold: t },
    d = gate(p),
    r = run(p);
  return (
    <div className="tc-def" role="status" data-ship={d.ship ? '1' : '0'}>
      <p className="lbl">
        {t === null ? 'All large' : `Router, up below ${t}`}{' '}
        <span className={`stamp ${d.ship ? 'correct' : 'wrong'}`}>{d.ship ? 'SHIP' : 'HOLD'}</span>
      </p>
      <p>
        {d.reason}. Cost {units(r.cost)}.
      </p>
      {d.regressed.length > 0 && (
        <p className="note">Regressed: {d.regressed.map(i => `“${questionText(QUESTION_IDS[i])}”`).join(', ')}</p>
      )}
    </div>
  );
}

export default function GateTheSwitch() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ base: false, p1: null, t: START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const t = state.p1 === null ? null : thresholdAt(state.t),
          d = t === null ? null : gate({ threshold: t });
        return (
          <SmallStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={() => ({
              scene:
                t === null
                  ? { mode: 'route', route: state.base ? 'large' : null }
                  : { mode: 'route', route: run({ threshold: t }).up ? 'up' : 'small', threshold: t },
              chart: { frontier: POINTS, at: t === null ? 'all-large' : `t${t}` },
              caption: d
                ? `Up below ${t}: ${d.reason}.`
                : state.base
                  ? `All large: ${gate(ALL_LARGE).reason}.`
                  : 'The bench before the release gate.',
              stamp: d ? (d.ship ? 'APPROVED' : 'DENIED') : state.base ? 'APPROVED' : undefined,
            })}
          />
        );
      }}
      controls={{
        baseline: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, base: true })}>
            Run all-large through the gate
          </button>
        ),
        decision: () => <Decision t={null} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        // moving the threshold is an attempt only while it is the puzzle
        gate: ({ state, apply, sync, focused }) => {
          const t = thresholdAt(state.t),
            set = focused ? apply : sync;
          return (
            <div className="sm-range">
              <label htmlFor="sm-gate">
                <strong>Send up below {t}</strong>
              </label>
              <input
                id="sm-gate"
                type="range"
                min={0}
                max={THRESHOLDS.length - 1}
                step={1}
                value={THRESHOLDS.indexOf(t)}
                aria-valuetext={`${t}: ${gate({ threshold: t }).ship ? 'ships' : 'held'}, cost ${units(run({ threshold: t }).cost)}`}
                onChange={e => set({ ...state, t: Number(e.target.value) })}
              />
              <Decision t={t} />
            </div>
          );
        },
        why: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={shipOutcome()} />,
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
