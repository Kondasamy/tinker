// Chapter 5: fall back when unsure. The router: the small tier answers first, and below a confidence threshold the
// question goes up to the large tier. The reader predicts what raising the threshold does, steps it from 0 to 1 over the
// finite list, and reads the frontier: right answers and cost both rise, past all-large's cost at the top. Confidence is
// a hand-set stand-in score; the copy says so, and the frontier is an illustration of a cited finding (FrugalGPT,
// RouteLLM), not a measurement.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import {
  ALL_LARGE,
  frontier,
  questionText,
  route,
  run,
  SURE_AND_WRONG as FEATURED,
  THRESHOLDS,
} from '../../lib/small-models/router';
import { units } from '../../components/scenes/frontierChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ROUTER_PARTS } from '../../components/scenes/routerScene';
import { Fact, SmallStage, TierAnswer, type View } from './kit';

export const PARTS = ROUTER_PARTS;
const MODULE = 'small-models',
  ID = '05-fall-back-when-unsure';
const POINTS = frontier(),
  LARGE = run(ALL_LARGE),
  TOP = THRESHOLDS.length - 1;
/** a saved index outside the list falls back to the start */
export const thresholdAt = (i: number) => THRESHOLDS[i] ?? THRESHOLDS[0];

interface S {
  p1: number | null;
  t: number;
  top: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question:
    'Raise the threshold step by step, so more of the small tier’s answers go up to the large tier. What happens to right answers and to cost?',
  options: [
    'Both rise; at the top the router costs more than sending everything to the large tier',
    'Right answers rise and cost falls',
    'Right answers rise and cost stays the same: the large tier only answers what goes up',
  ],
};
/** read off the frontier: does the top of the router cost more than all-large? */
export function riseOutcome() {
  const t = POINTS.filter(p => p.threshold !== null);
  if (t.at(-1)!.cost > LARGE.cost) return 0;
  return t.at(-1)!.cost < t[0].cost ? 1 : 2;
}

export const QUIZ = {
  question: 'A team’s router sends answers up below confidence 0.8. A wrong answer scored 0.85. What happens to it?',
  options: [
    'It reaches the customer: the router sees the score, not whether the answer is right',
    'The router spots it is wrong and sends it up',
    'The large tier double-checks every answer anyway',
    'It is held back and the customer gets nothing',
  ],
  correct: 0,
  explanation:
    'A confidence score is not a correctness check. Answers that are wrong and sure pass any threshold below their score; only an eval finds them.',
  why: [
    'Right: above the threshold, an answer goes out as it is.',
    'The router never knows the right answer; it reads only the score.',
    'In a cascade the large tier answers only what is sent up.',
    'Answers over the threshold are sent, right or wrong.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['about', 'p1'],
    narration:
      'Small answers carry a confidence score; below the threshold, they go up. These are stand-ins set by hand; real systems compute them.',
    act: 'Predict first.',
    say: { block: 'router', text: 'Reads the score' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'slide',
    focus: 'slide',
    visibleControls: ['p1', 'slide'],
    narration: 'This router is a cascade: an answer sent up pays twice, for the small try and the large answer.',
    act: 'Slide the threshold up to 1.',
    say: { block: 'big', text: 'Pays twice' },
    predicate: s => s.top,
    hint: 'Move the slider all the way to 1.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['slide', 'read', 'quiz'],
    narration: `On the frontier, right answers and cost climb; at 1 it costs ${units(run({ threshold: 1 }).cost)}, all-large ${units(LARGE.cost)}. A sure, wrong answer stays small.`,
    act: 'One question to finish.',
    say: { block: 'small', text: 'Sure and wrong' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the router read: the score, or the answer’s truth?',
  },
];

export default function FallBackWhenUnsure() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, t: 0, top: false, view: 'chart', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const t = thresholdAt(state.t),
          r = run({ threshold: t }),
          f = route(FEATURED, { threshold: t });
        return (
          <SmallStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={() => ({
              scene: { mode: 'route', route: f.escalated ? 'up' : 'small', threshold: t },
              chart: { frontier: POINTS, at: `t${t}` },
              caption: `Up below ${t}: ${r.right} of ${r.of} right, cost ${units(r.cost)}, ${r.up} sent up. “${questionText(FEATURED)}” ${f.escalated ? 'goes up' : 'stays small'}.`,
            })}
          />
        );
      }}
      controls={{
        about: () => <Fact id="cascade" />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        slide: ({ state, sync }) => {
          const t = thresholdAt(state.t),
            r = run({ threshold: t });
          return (
            <div className="sm-range">
              <label htmlFor="sm-threshold">
                <strong>Send up below {t}</strong>
              </label>
              <input
                id="sm-threshold"
                type="range"
                min={0}
                max={TOP}
                step={1}
                value={THRESHOLDS.indexOf(t)}
                aria-valuetext={`${t}: ${r.right} of ${r.of} right, cost ${units(r.cost)}`}
                onChange={e => {
                  const i = Number(e.target.value);
                  sync({ ...state, t: i, top: state.top || i === TOP, view: 'chart' });
                }}
              />
              <p className="tc-status" role="status" data-threshold={t}>
                {r.right} of {r.of} right · cost {units(r.cost)} · {r.up} sent up · all large: {LARGE.right} right, cost{' '}
                {units(LARGE.cost)}
              </p>
            </div>
          );
        },
        read: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={riseOutcome()} />
            <TierAnswer tier="small" question={FEATURED} />
            <p className="note">
              The tiers and this frontier were written for this site to illustrate what the cascade and router papers
              report, not measured.
            </p>
            <Fact id="routellm" />
          </>
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
