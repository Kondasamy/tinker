// Chapter 7: the workbench. The reader sets an effort per kind of request (a drop-down each). Under it, a row per
// question with right or wrong and the answer's note; a live total of right answers, cost and wait against the best. The
// puzzle accepts every plan tied for the best (WINNERS); Show me applies one of them. The plan and the tab are step state.
import StepRunner from '../../components/story/StepRunner';
import Select from '../../components/story/Select';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { EFFORTS, KINDS, question, type Effort } from '../../lib/reasoning/engine';
import { LEAST_COST, MOST_RIGHT, WINNERS, solved, totals, type Plan } from '../../lib/reasoning/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { THINK_PARTS } from '../../components/scenes/thinkScene';
import { Fact, RateNote, ReasoningStage, kindSeries, seconds, type View } from './kit';

const MODULE = 'reasoning',
  ID = '07-workbench';
export const PARTS = THINK_PARTS;
/** “High everywhere, to be safe”: where chapter 4's meeting started */
export const START: Plan = { lookup: 'high', multistep: 'high', distractor: 'high' };
/** the plan in a run's state; a missing or unknown effort falls back to START's */
export const planOf = (s: Partial<Plan>): Plan =>
  Object.fromEntries(KINDS.map(k => [k.id, EFFORTS.includes(s[k.id]!) ? s[k.id]! : START[k.id]])) as Plan;

export interface S extends Plan {
  view: View;
  quiz: number | null;
}

export const QUIZ = {
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
    'Right: the lookups’ thinking buys nothing, so dropping it makes the plan cheaper and faster for the same answers.',
    'Consistency is not a goal: high on distractions loses answers, and on lookups it only costs.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'plan',
    focus: 'plan',
    visibleControls: ['score', 'plan'],
    narration: `The proposal: high everywhere, to be safe. The best effort plan gets the most right (${MOST_RIGHT}) at the lowest cost.`,
    act: 'Set each kind’s effort.',
    say: { block: 'dial', text: 'High everywhere' },
    predicate: s => solved(planOf(s)),
    hint: 'Take each kind on its own: what is the lowest effort that gets its answers right? Chapter 6 found them.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'plan', 'fact', 'quiz'],
    narration: `${MOST_RIGHT} right for ${LEAST_COST}, the best possible. Yours is ${WINNERS.length === 1 ? 'the one plan that reaches' : `one of ${WINNERS.length} plans that reach`} it, mixing efforts as Anthropic advises.`,
    act: 'One question to finish.',
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
      stage={({ state, sync, say }) => {
        const p = planOf(state),
          t = totals(p),
          top = EFFORTS[Math.max(...KINDS.map(k => EFFORTS.indexOf(p[k.id])))];
        return (
          <ReasoningStage
            say={say}
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
                  <Select
                    value={planOf(state)[k.id]}
                    onChange={e => set({ ...state, [k.id]: e.currentTarget.value as Effort })}
                  >
                    {EFFORTS.map(e => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
          );
        },
        fact: () => <Fact id="dynamic-effort" />,
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
