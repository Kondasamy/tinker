// Chapter 7: the workbench. The reader sets an effort per kind of request (a native select each). Under it, a row per
// question with right or wrong and the answer's note; a live total of right answers, cost and wait against the best. The
// puzzle accepts every plan tied for the best (WINNERS); Show me applies one of them. The plan and the tab are step state.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { EFFORTS, KINDS, question, type Effort } from '../../lib/reasoning/engine';
import { LEAST_COST, MOST_RIGHT, WINNERS, solved, totals, type Plan } from '../../lib/reasoning/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RateNote, ReasoningStage, kindSeries, seconds, type View } from './kit';

const MODULE = 'reasoning',
  ID = '07-workbench';
/** “High everywhere, to be safe”: where chapter 4's meeting started */
export const START: Plan = { lookup: 'high', multistep: 'high', distractor: 'high' };
/** the plan in a run's state; a missing or unknown effort falls back to START's */
export const planOf = (s: Partial<Plan>): Plan =>
  Object.fromEntries(KINDS.map(k => [k.id, EFFORTS.includes(s[k.id]!) ? s[k.id]! : START[k.id]])) as Plan;

export interface S extends Plan {
  view: View;
  quiz: number | null;
}

const QUIZ = {
  question:
    'A team’s plan matches the best on accuracy but costs twice as much: it uses high effort on its lookups. What does the workbench say?',
  options: [
    'It is a best plan: accuracy is what counts',
    'Not yet: lower the lookups’ effort; it costs less and gets the same answers right',
    'Raise everything to high to be consistent',
  ],
  correct: 1,
  explanation: 'With accuracy tied, cost and wait decide, and lookups gain nothing from thinking.',
  why: [
    'Accuracy comes first, but two plans with the same accuracy are not equal if one costs twice as much.',
    'Right. The lookups’ thinking buys nothing. Drop it and the plan is cheaper and faster for the same answers.',
    'Consistency is not a goal. High on distractions loses answers, and on lookups it only costs.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'plan',
    focus: 'plan',
    visibleControls: ['score', 'plan'],
    narration: `The proposal on the table: high effort everywhere, to be safe. The bench reads every recorded answer for your plan and grades it live. The best plan gets the most answers right (${MOST_RIGHT} is the most any plan gets) at the lowest cost. Cost is thinking and answer tokens, in relative units. Set an effort for each kind and find a best plan.`,
    predicate: s => solved(planOf(s)),
    hint: 'Take each kind on its own: what is the lowest effort that gets its answers right? Chapter 6 found them.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'plan', 'quiz'],
    narration: `${MOST_RIGHT} right for ${LEAST_COST}: the best any plan does. Yours is ${WINNERS.length === 1 ? 'the one plan' : `one of ${WINNERS.length} plans`} that ${WINNERS.length === 1 ? 'reaches' : 'reach'} it, and it mixes efforts: none where there is nothing to work out, more where there are steps, and less where extra thinking wanders. Change the plan if you like; the bench is yours. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'With the same answers right, what decides between two plans?',
  },
];

/** The headline, then the plan's result question by question. */
function Score({ s }: { s: S }) {
  const p = planOf(s),
    t = totals(p),
    best = solved(p);
  return (
    <div role="status" data-right={t.right} data-cost={t.cost} data-best={best ? '1' : '0'}>
      <p className="rs-headline">
        <strong>
          {t.right} of {t.of}
        </strong>{' '}
        right · cost {t.cost} · average wait {seconds(t.wait)}
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>
          {best ? 'BEST' : `BEST IS ${MOST_RIGHT} FOR ${LEAST_COST}`}
        </span>
      </p>
      {best && <p className="rs-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your plan, question by question</caption>
        <thead>
          <tr>
            <th scope="col">Question, effort</th>
            <th scope="col">Graded</th>
            <th scope="col">Cost</th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map(r => (
            <tr key={r.question} data-q={r.question}>
              <th scope="row">
                {question(r.question).query} ({r.effort})<span className="rs-why">{r.note}</span>
              </th>
              <td>{r.right ? 'right' : 'wrong'}</td>
              <td>{r.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <RateNote />
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => {
        const p = planOf(state),
          t = totals(p),
          top = EFFORTS[Math.max(...KINDS.map(k => EFFORTS.indexOf(p[k.id])))];
        return (
          <ReasoningStage
            view={state.view}
            onView={view => sync({ ...state, view })}
            shown={{
              desk: {
                effort: top,
                thinking: t.rows.reduce((n, r) => n + r.thinkingTokens, 0),
                wait: t.wait,
                right: solved(p),
              },
              series: kindSeries(),
              caption: `Plan: ${KINDS.map(k => `${k.short.toLowerCase()} ${p[k.id]}`).join(', ')}. ${t.right} of ${t.of} right, cost ${t.cost}.`,
              thinking: t.rows.find(r => r.thinking)?.thinking ?? '',
              stamp: solved(p) ? 'APPROVED' : undefined,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        plan: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync;
          return (
            <div className="rs-bench">
              {KINDS.map(k => (
                <label key={k.id} data-kind={k.id}>
                  {k.label}
                  <span className="note">{k.about}</span>
                  <select
                    value={planOf(state)[k.id]}
                    onChange={e => set({ ...state, [k.id]: e.currentTarget.value as Effort })}
                  >
                    {EFFORTS.map(e => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
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
