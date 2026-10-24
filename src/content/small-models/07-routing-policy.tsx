// Chapter 7: Larkspur's routing policy, the workbench. Each kind of question goes to the small tier, the large tier or the
// router, with one threshold for the router. The bench leads with one number, the policy's score: the team's points per
// right answer (graded live from the recorded answers) minus cost in relative units. Under it, a row per question with
// pass or fail and why. The puzzle accepts every policy tied for the best score (WINNERS, computed over the whole
// domain). The policy and the tab are step state, so a reload keeps the bench as it was.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { frontier, questionText, THRESHOLDS, type Tier } from '../../lib/small-models/router';
import {
  BEST,
  CHOICES,
  KINDS,
  POINTS,
  POINTS_WHY,
  WINNERS,
  solved,
  totals,
  type Choice,
  type KindId,
  type Plan,
} from '../../lib/small-models/workbench';
import { units } from '../../components/scenes/frontierChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ROUTER_PARTS } from '../../components/scenes/routerScene';
import { SmallStage, type View } from './kit';

export const PARTS = ROUTER_PARTS;
const MODULE = 'small-models',
  ID = '07-routing-policy';
const NAME: Record<Choice, string> = { small: 'Small tier', router: 'Router', large: 'Large tier' };
const pts = (x: number) => units(x).replace('-', '−');
/** “One router for everything”, where chapter 6 left off, at the threshold that shipped there */
export const START: Plan = { lookups: 'router', policy: 'router', hard: 'router', threshold: 0.9 };
/** the policy in a run's state; an unknown choice or threshold falls back to START's */
export const planOf = (s: Partial<Plan>): Plan => ({
  ...(Object.fromEntries(KINDS.map(k => [k.id, CHOICES.includes(s[k.id]!) ? s[k.id]! : START[k.id]])) as Record<
    KindId,
    Choice
  >),
  threshold: THRESHOLDS.includes(s.threshold!) ? s.threshold! : START.threshold,
});
const planWords = (p: Plan) => KINDS.map(k => `${k.label.toLowerCase()} → ${NAME[p[k.id]].toLowerCase()}`).join('; ');

export interface S extends Plan {
  view: View;
  quiz: number | null;
}

export const QUIZ = {
  question: 'A bank sorts its questions into balance lookups, fee disputes and fraud reports. Which policy fits?',
  options: [
    'Lookups to the small model, disputes through the router, fraud straight to the large model',
    'Everything through one router with one threshold',
    'Fraud to the small model, since it answers fastest',
    'Everything to the large model',
  ],
  correct: 0,
  explanation:
    'Each kind gets the cheapest setup that keeps its answers right: small where it is always right, the router where it is sometimes unsure, large where it would go up anyway.',
  why: [
    'Right: lookups never need the large model; disputes sometimes do; fraud reports would go up every time, so the small try only adds cost.',
    'It works, but lookups pay for nothing and the hard kind pays twice.',
    'The hardest, costliest-to-get-wrong kind needs the strongest model.',
    'Safe, but it pays large prices for lookups the small model gets right.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'plan',
    focus: 'plan',
    visibleControls: ['plan', 'score'],
    narration: `A routing policy picks a tier per kind; its policy score: ${POINTS} points per right answer, minus cost in large answers.`,
    act: 'Find the best score.',
    say: { block: 'router', text: 'Pick per kind' },
    predicate: s => solved(planOf(s)),
    hint: 'Look at each kind on its own: where is the small tier always right, and where does every small answer go up anyway?',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['plan', 'score', 'quiz'],
    narration: `${pts(BEST)} points, the best${WINNERS.length > 1 ? ` (one of ${WINNERS.length} winners)` : ''}. Lookups go small, always-unsure kinds go large, the router takes the rest.`,
    act: 'One question to finish.',
    say: { block: 'small', text: 'Lookups go here' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where would every small answer go up anyway?',
  },
];

const Mark = ({ ok }: { ok: boolean }) => (
  <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'PASS' : 'FAIL'}</span>
);
const answered = (tier: Tier, up: boolean) =>
  up ? 'sent up, large answered' : tier === 'small' ? 'small answered' : 'large answered';

/** The headline number, then a row per question: which tier answered, pass or fail, and why. */
function Score({ s }: { s: S }) {
  const p = planOf(s),
    t = totals(p),
    best = solved(p);
  return (
    <div role="status" data-score={t.score} data-best={best ? '1' : '0'}>
      <p className="ft-headline">
        <strong>{pts(t.score)}</strong> points{' '}
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${pts(BEST)}`}</span>
      </p>
      <p className="tc-status">
        {t.right} of {t.of} right · cost {units(t.cost)}
      </p>
      <p className="note">{POINTS_WHY}</p>
      <table className="tc-ledger sm-rows">
        <caption>Each question under your policy</caption>
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col">Answered by</th>
            <th scope="col">Key fact</th>
          </tr>
        </thead>
        <tbody>
          {t.rows.flatMap(k =>
            k.rows.map(r => (
              <tr key={r.question} data-question={r.question}>
                <th scope="row">
                  {questionText(r.question)}
                  <span className="note">{r.answer.note}</span>
                </th>
                <td>
                  {answered(r.tier, r.escalated)}
                  {k.choice === 'router' && <span className="note">confidence {r.confidence.toFixed(2)}</span>}
                </td>
                <td>
                  <Mark ok={r.pass} />
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function RoutingPolicy() {
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
          uses = (c: Choice) => KINDS.some(k => p[k.id] === c);
        return (
          <SmallStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={() => ({
              scene: {
                mode: 'route',
                route: uses('router') ? 'up' : uses('large') ? 'large' : 'small',
                threshold: uses('router') ? p.threshold : null,
              },
              chart: {
                frontier: [
                  ...frontier(),
                  {
                    id: 'policy',
                    label: 'Your policy',
                    threshold: null,
                    right: t.right,
                    of: t.of,
                    cost: t.cost,
                    up: 0,
                  },
                ],
                at: 'policy',
              },
              caption: `Policy score ${pts(t.score)}: ${planWords(p)}${uses('router') ? `, router up below ${p.threshold}` : ''}.`,
              stamp: solved(p) ? 'APPROVED' : undefined,
            })}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the policy is an attempt only while it is the puzzle
        plan: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync,
            p = planOf(state),
            i = THRESHOLDS.indexOf(p.threshold);
          return (
            <div className="tc-bench">
              {KINDS.map(k => (
                <div key={k.id} className="tc-pick" data-kind={k.id}>
                  <label htmlFor={`sm-kind-${k.id}`}>
                    <strong>{k.label}</strong>
                  </label>
                  <p className="note">{k.about}</p>
                  <select
                    id={`sm-kind-${k.id}`}
                    value={p[k.id]}
                    onChange={e => set({ ...state, [k.id]: e.target.value as Choice })}
                  >
                    {CHOICES.map(c => (
                      <option key={c} value={c}>
                        {NAME[c]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="sm-range">
                <label htmlFor="sm-policy-t">
                  <strong>Router sends up below {p.threshold}</strong>
                </label>
                <input
                  id="sm-policy-t"
                  type="range"
                  min={0}
                  max={THRESHOLDS.length - 1}
                  step={1}
                  value={i}
                  aria-valuetext={String(p.threshold)}
                  onChange={e => set({ ...state, threshold: THRESHOLDS[Number(e.target.value)] })}
                />
              </div>
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
