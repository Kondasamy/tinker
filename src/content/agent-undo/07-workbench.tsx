// Chapter 7: workbench (R6f.7). Twenty hand-written failure injections (refusals, lost answers, restarts) against the
// reader's setup: the stations' order (dragged on the hill, or Move up and Move down), an opposite per station (the
// email's is a second letter), save points and a key. Run scores the setup over all twenty (score, for real): most clean
// finishes, then least harm to the customer. Every setup that reaches the best is accepted (WINNERS, recomputed in
// tests/unit/agent-undo.test.ts); Show me applies the first. The picture shows the story's courier failure under it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { FUNI_PARTS, type Funi } from '../../components/scenes/funicularScene';
import {
  codeOf,
  COURIER_FAILS,
  INJECTIONS,
  OPENING,
  type Policy,
  policyOf,
  run,
  score,
  solve,
  type StepId,
} from '../../lib/agent-undo/sim';
import { nextOf } from '../../lib/modules';
import { Fact, FuniStage, funiOf, START, Switch, ToyNote } from './kit';

const MODULE = 'agent-undo',
  ID = '07-workbench';
const SOLVED = solve();
/** every setup that scores best (as codes): the workbench accepts any of them */
export const WINNERS = SOLVED.winners;
const BEST = SOLVED.best;
const START_CODE = codeOf(OPENING);
const OPEN = score(OPENING);
const N = INJECTIONS.length;

interface S {
  code: number;
  /** the setup last run, or none yet */
  ran: number | null;
  prediction: number | null;
  revealed: boolean;
}

export const PREDICT = {
  question: 'Which one change stops Ana ever getting a wrong email when the courier fails?',
  options: ['Move the post box to the top', 'Give the email a second letter', 'Send a key with the email'],
};
const OUTCOME = 0;

export const PARTS = FUNI_PARTS;

/** The picture: the story's courier failure under the setup last run, or the setup waiting in the valley. */
export function sceneOf(s: S): Funi {
  const p = policyOf(s.ran ?? s.code);
  if (s.ran === null)
    return {
      ...START,
      order: p.order,
      opp: p.order.filter(id => p.undo[id] && id !== 'email'),
      key: p.keys || undefined,
    };
  return funiOf(run(p, COURIER_FAILS), p);
}

const scoreLine = (code: number) => {
  const s = score(policyOf(code));
  return `${s.clean} of ${N} failures ended clean; harm to the customer: ${s.harm}.`;
};

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: [],
    narration: `${N} hand-written failures: refusals, lost answers, restarts. Today’s setup has no opposites, no save points, no key.`,
    act: 'Press Run all failures.',
    say: { block: 'car', text: `${N} failures` },
    status: `${OPEN.clean} of ${N} ended clean; harm to the customer: ${OPEN.harm}.`,
    predicate: s => s.ran !== null,
    hint: 'Press Run all failures under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['score', 'predict'],
    narration: 'Steps left half done, refunds paid twice, emails Ana should never have got.',
    act: 'Predict the one change that ends the wrong emails.',
    say: { block: 'email', text: 'Wrong emails' },
    status: 'The courier failed and nothing came undone: every flag below it still green.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'fix',
    focus: 'switches',
    visibleControls: ['predict', 'switches', 'score'],
    narration: 'Pick locked. The rule: the most clean finishes, then the least harm to the customer.',
    act: 'Set the order and switches, then press Run all failures.',
    status: `Best: ${BEST.clean} of ${N} clean, harm ${BEST.harm}: post box last, every switch on.`,
    predicate: s => s.ran !== null && WINNERS.includes(s.ran),
    hint: 'Turn every switch on, and move the post box to the top.',
    solution: s => ({ ...s, code: WINNERS[0], ran: WINNERS[0] }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact', 'score'],
    narration: 'Every step its opposite, save points, a key, and the post box last: no failure reaches Ana.',
    act: 'Check your prediction.',
    closeUp: ['car', 'email'],
    status: 'The courier failed; refund and stock undone; the post box at the top untouched.',
    predicate: s => s.revealed,
  },
];

const SWITCHES: [string, (p: Policy) => boolean, (p: Policy) => Policy][] = [
  ...(['stock', 'refund', 'courier'] as StepId[]).map(
    id =>
      [
        `${id === 'stock' ? 'Stock' : id === 'refund' ? 'Refund' : 'Courier'} opposite`,
        (p: Policy) => p.undo[id],
        (p: Policy) => ({ ...p, undo: { ...p.undo, [id]: !p.undo[id] } }),
      ] as [string, (p: Policy) => boolean, (p: Policy) => Policy],
  ),
  ['Second letter', p => p.undo.email, p => ({ ...p, undo: { ...p.undo, email: !p.undo.email } })],
  ['Save points', p => p.saves, p => ({ ...p, saves: !p.saves })],
  ['Key', p => p.keys, p => ({ ...p, keys: !p.keys })],
];

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ code: START_CODE, ran: null, prediction: null, revealed: false }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, closeUp }) => (
        <FuniStage
          scene={sceneOf(state)}
          twin={{
            // a new order shows at once in the valley; Run scores it
            order: (o: StepId[]) => {
              if (state.prediction === null) return 'Make your prediction first.';
              sync({ ...state, code: codeOf({ ...policyOf(state.code), order: o }), ran: null });
              return undefined;
            },
            buttons: [
              {
                label: 'Run all failures',
                tap: 'car',
                act: () => void apply({ ...state, ran: state.code }),
              },
            ],
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        score: ({ state }) => (state.ran === null ? null : <p className="au-score">{scoreLine(state.ran)}</p>),
        switches: ({ state, sync }) => {
          const p = policyOf(state.code);
          return (
            <div className="au-switches" role="group" aria-label="Setup">
              {SWITCHES.map(([label, on, flip]) => (
                <Switch key={label} on={on(p)} label={label} flip={() => sync({ ...state, code: codeOf(flip(p)) })} />
              ))}
            </div>
          );
        },
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See the best setup"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="saga" />
              <Fact id="key-random" />
              <ToyNote>The twenty failures are hand-written too; there are {WINNERS.length} best setups.</ToyNote>
            </>
          ) : null,
      }}
    />
  );
}
