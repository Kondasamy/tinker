// Chapter 4: send it the easy ones. Larkspur's assistant in two tiers, small and large, answers Evals' twelve questions.
// The answers are recorded; the key-fact marks run live (Evals' grader), and the costs are relative units from a dated
// vendor price pair. The reader predicts the small tier's score, runs both, and reads where the small tier falls short.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import {
  ALL_LARGE,
  ALL_SMALL,
  frontier,
  QUESTION_IDS,
  questionText,
  run,
  SMALL_COST,
  SURE_AND_WRONG,
} from '../../lib/small-models/router';
import { units } from '../../components/scenes/frontierChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ROUTER_PARTS } from '../../components/scenes/routerScene';
import { Fact, SmallStage, TierAnswer, TierNote, type View } from './kit';

export const PARTS = ROUTER_PARTS;
const MODULE = 'small-models',
  ID = '04-send-it-the-easy-ones';
const SMALL = run(ALL_SMALL),
  LARGE = run(ALL_LARGE),
  N = QUESTION_IDS.length;
/** the two ends of the frontier: everything small, everything large */
const ENDS = frontier()
  .filter(p => p.threshold === 0 || p.threshold === null)
  .map(p => (p.threshold === 0 ? { ...p, id: 'all-small', label: 'All small' } : p));
const FEATURED = SURE_AND_WRONG;
const Mark = ({ ok }: { ok: boolean }) => (
  <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'PASS' : 'FAIL'}</span>
);

interface S {
  p1: number | null;
  ran: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `Run Evals’ ${N} questions through both tiers. Both read the same documents. How will the small tier do against the large one?`,
  options: [
    'The same: with the same documents, size doesn’t matter',
    'Most right, but fewer than the large tier: it misses the tricky ones',
    'Hardly any right: small models can’t answer support questions',
  ],
};
export const tierOutcome = (small: number, large: number) => (small >= large ? 0 : small >= large / 2 ? 1 : 2);

export const QUIZ = {
  question:
    'A bank’s assistant gets “What time does the Elm Street branch open?” and “Can I dispute this charge under clause 7 if I paid by transfer?”. Which suits a small tier?',
  options: [
    'The opening time: one stated fact; the dispute needs reading two rules together',
    'The dispute: it is longer, so a small model saves more',
    'Neither: banks must use the largest model for everything',
    'Both equally: they read the same documents',
  ],
  correct: 0,
  explanation:
    'Lookups of one stated fact are where a small tier matches a large one; rules with exceptions and multi-step questions are where it slips.',
  why: [
    'Right: one stated fact suits the small tier, while the dispute needs weighing a rule against an exception.',
    'Savings follow the number of questions sent small; a wrong answer to a dispute costs far more than it saves.',
    'Paying large prices for lookups the small tier gets right is waste.',
    'The same documents, read less well: telling an exception from a rule is where small models slip.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['price', 'p1'],
    narration: `Relative cost: a small answer is ${units(SMALL_COST)} of a large one, by a dated price pair. Both tiers are illustrations.`,
    act: 'Predict first.',
    say: { block: 'small', text: 'Cheaper tier' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'The answers were recorded ahead of time; the Evals module’s key-fact check grades them live.',
    act: 'Run all the questions on both tiers.',
    predicate: s => s.ran,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['rows', 'quiz'],
    narration: `Small: ${SMALL.right} of ${N} right for ${units(SMALL.cost)}. Large: ${LARGE.right} for ${units(LARGE.cost)}. Lookups pass; vague, two-step or conflicting questions trip it.`,
    act: 'One question to finish.',
    say: { block: 'small', text: 'Slips on tricky' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which question is answered by one stated line?',
  },
];

export default function SendItTheEasyOnes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <SmallStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={() => ({
            scene: { mode: 'route', route: state.ran ? 'small' : null },
            chart: state.ran ? { frontier: ENDS, at: 'all-small' } : undefined,
            caption: state.ran
              ? `All small: ${SMALL.right} of ${N} right, cost ${units(SMALL.cost)}. All large: ${LARGE.right} of ${N}, cost ${units(LARGE.cost)}.`
              : 'Two tiers of Larkspur’s assistant: large at the back, small in front.',
          })}
        />
      )}
      controls={{
        price: () => <Fact id="price-pair" />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, ran: true, view: 'chart' })}>
            Run all {N} on both tiers
          </button>
        ),
        rows: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={tierOutcome(SMALL.right, LARGE.right)} />
            <table className="tc-ledger sm-rows" data-rows>
              <caption>Each question, graded live by the key-fact check</caption>
              <thead>
                <tr>
                  <th scope="col">Question</th>
                  <th scope="col">Small</th>
                  <th scope="col">Large</th>
                </tr>
              </thead>
              <tbody>
                {SMALL.rows.map((r, i) => (
                  <tr key={r.question} data-question={r.question}>
                    <th scope="row">{questionText(r.question)}</th>
                    <td>
                      <Mark ok={r.pass} />
                    </td>
                    <td>
                      <Mark ok={LARGE.rows[i].pass} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Cost, in large answers</th>
                  <td>{units(SMALL.cost)}</td>
                  <td>{units(LARGE.cost)}</td>
                </tr>
              </tbody>
            </table>
            <p className="tc-status">One the small tier gets wrong: “{questionText(FEATURED)}”</p>
            <TierAnswer tier="small" question={FEATURED} />
            <TierAnswer tier="large" question={FEATURED} />
            <TierNote />
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
