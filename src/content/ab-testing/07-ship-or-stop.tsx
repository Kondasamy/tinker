// Chapter 7: ship, keep testing or stop, the workbench. Five finished experiments, each read once at its planned end. The
// reader picks a decision per experiment; the puzzle accepts every plan that follows the module's rule on the data
// (WINNERS). Afterwards the hidden truth is revealed apart from the rule, including the lucky win the rule ships.
import StepRunner from '../../components/story/StepRunner';
import Select from '../../components/story/Select';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { ASSUMPTIONS, BENCH, runOf, type Experiment } from '../../lib/ab-testing/sim';
import {
  DECISIONS,
  DECISION_NAME,
  NEEDED,
  START,
  WINNERS,
  benchPlan,
  decide,
  ruleOf,
  scoreOf,
  truthOf,
  wins,
  type Decision,
  type Plan,
} from '../../lib/ab-testing/workbench';
import { SPLIT_PARTS, splitAt } from '../../components/scenes/splitScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { AbStage, Fact, SimNote, count, pts, span, type View } from './kit';

const MODULE = 'ab-testing',
  ID = '07-ship-or-stop';
export const PARTS = SPLIT_PARTS;
/** The experiment the rule ships though it truly changed nothing, if any. */
export const LUCKY = BENCH.find(e => decide(e) === 'ship' && truthOf(e).lift === 0);
/** The experiments that truly raise buying without raising returns: a mix set by hand, kinder than real teams find. */
export const HELPED = BENCH.filter(e => truthOf(e).lift > 0 && truthOf(e).returns <= 0).length;

export const QUIZ = {
  question:
    'An experiment ran with a third of the shoppers its sample size called for and found no significant difference. What do you decide?',
  options: [
    'Keep testing: it was too small to find the change you care about',
    'Stop: the change does nothing',
    'Ship: at least it did no harm',
  ],
  correct: 0,
  explanation: 'An underpowered test that finds nothing has not ruled the change out.',
  why: [
    'Right: with a third of the shoppers it needed, the test would miss a real change most of the time.',
    'Too small a test misses most real changes, so its silence is not evidence of none.',
    'No significant harm in a test this small doesn’t show there is none.',
  ],
};

interface S {
  plan: Plan;
  /** the experiment on the stage */
  shown: string;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: 'The decision rule: ship if significant and returns hold; keep testing if underpowered; otherwise stop.',
    act: `Decide all ${BENCH.length}.`,
    say: { block: 'scoreboard', text: 'Read the board' },
    predicate: s => wins(benchPlan(s.plan)),
    hint: 'Read each row left to right: significant and better? Returns fine? If not significant, were there enough shoppers?',
    solution: s => ({ ...s, plan: { ...WINNERS[0] } }),
  },
  {
    id: 'truth',
    focus: 'quiz',
    visibleControls: ['score', 'truth', 'fact', 'quiz'],
    narration: `${WINNERS.length === 1 ? 'Yours follows the rule.' : `Yours is one of ${WINNERS.length} that work.`} ${
      LUCKY
        ? `Now the hidden truth: ${LUCKY.name} truly changed nothing, yet the rule ships it.`
        : 'Now the hidden truth.'
    }`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Could a test that small have found the change?',
  },
];

function Score({ s }: { s: S }) {
  const p = benchPlan(s.plan),
    n = scoreOf(p),
    best = wins(p);
  return (
    <div role="status" data-score={n} data-best={best ? '1' : '0'}>
      <p className="ab-headline">
        <strong>{`${n} of ${BENCH.length}`}</strong>
        {' follow the rule '}
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'ALL BY THE RULE' : 'NOT YET'}</span>
      </p>
      {best && (
        <p className="tc-status">
          {WINNERS.length === 1 ? 'The one plan that follows the rule.' : `One of ${WINNERS.length} plans that work.`}
        </p>
      )}
    </div>
  );
}

/** One experiment as a card: its result at the planned end, read the way the rule reads it, and the decision. */
function Card({ e, s, set, show }: { e: Experiment; s: S; set: (s: S) => void; show: (s: S) => void }) {
  const r = ruleOf(e),
    p = benchPlan(s.plan);
  return (
    <li data-exp={e.id}>
      <div className="head">
        <button
          type="button"
          className="chip"
          aria-pressed={s.shown === e.id}
          onClick={() => show({ ...s, shown: e.id })}
        >
          {e.name}
        </button>
        <Select
          aria-label={`Decision for ${e.name}`}
          value={p[e.id]}
          onChange={ev => set({ ...s, plan: { ...p, [e.id]: ev.target.value as Decision } })}
        >
          {DECISIONS.map(d => (
            <option key={d} value={d}>
              {DECISION_NAME[d]}
            </option>
          ))}
        </Select>
      </div>
      <p>
        {`Buying ${pts(r.orders.diff)} (${span(r.orders)}): `}
        <b className={r.significant ? 'ok' : ''}>{r.significant ? 'significant' : 'not significant'}</b>
        {' · returns '}
        <b className={r.guardrailHolds ? 'ok' : 'bad'}>{r.guardrailHolds ? 'hold' : 'up'}</b>
        {` · ${count(r.shoppers)} shoppers each`}
        {r.underpowered && <b className="bad"> (underpowered)</b>}
      </p>
    </li>
  );
}

function Bench({ s, set, show }: { s: S; set: (s: S) => void; show: (s: S) => void }) {
  return (
    <div className="tc-bench ab-bench">
      <p className="note ab-note">{`A test needs ${count(NEEDED)} shoppers per checkout to find a ${Math.round(ASSUMPTIONS.mde * 100)}-point change most of the time.`}</p>
      <ul className="ab-cards">
        {BENCH.map(e => (
          <Card key={e.id} e={e} s={s} set={set} show={show} />
        ))}
      </ul>
      <SimNote />
    </div>
  );
}

function Truth() {
  return (
    <table className="tc-ledger">
      <caption>The hidden truth the simulation set</caption>
      <thead>
        <tr>
          <th scope="col">Experiment</th>
          <th scope="col">True rise in buying</th>
          <th scope="col">True returns change</th>
          <th scope="col">The rule</th>
        </tr>
      </thead>
      <tbody>
        {BENCH.map(e => {
          const t = truthOf(e);
          return (
            <tr key={e.id} data-truth={e.id}>
              <th scope="row">{e.name}</th>
              <td>{pts(t.lift)}</td>
              <td className={t.returns > 0 ? 'bad' : ''}>{pts(t.returns)}</td>
              <td>{DECISION_NAME[decide(e)]}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ShipOrStop() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ plan: { ...START }, shown: BENCH[0].id, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const e = BENCH.find(x => x.id === state.shown) ?? BENCH[0],
          r = runOf(e),
          rule = ruleOf(e);
        const base = splitAt(r, e, e.days - 1, { guardrail: true });
        return (
          <AbStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: rule.guardrailHolds ? base : { ...base, verdict: `${base.verdict} · RETURNS UP`, tone: 'warn' },
              chart: { run: r },
              at: e.days - 1,
              caption: `${e.name}: ${e.days} days, ${count(rule.shoppers)} shoppers per checkout.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing a decision is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} show={sync} />,
        truth: () => <Truth />,
        fact: () => (
          <>
            <p className="tc-status">{`Here ${HELPED} of ${BENCH.length} ideas truly help, a mix set by hand. Real teams find fewer:`}</p>
            <Fact id="one-third" />
            <Fact id="replicate" />
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
