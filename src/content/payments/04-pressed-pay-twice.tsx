// Chapter 4: pressed Pay twice. Ben's payment request times out and the till sends it again; without an idempotency
// key the issuer sees two payments and Ben is charged twice. The reader predicts, watches two charges land, turns the
// key on and sees one.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { clock, eur, orderOf, policyOf, runOf, type Run } from '../../lib/payments/sim';
import { TUBE_PARTS, hopAt, tubeAt } from '../../components/scenes/tubeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Assumed, Clock, Fact, KeySwitch, PaymentsStage, SimNote, type View } from './kit';

const MODULE = 'payments',
  ID = '04-pressed-pay-twice';
export const PARTS = TUBE_PARTS;
const ben = orderOf('B2');
export const runFor = (key: boolean) => runOf(policyOf({ sca: 'risk', capture: 'shipment', key }));
/** Ben's charges on his card by the end of tick t */
export const chargesOf = (r: Run, t: number) =>
  r.events.filter(e => e.order === ben.id && e.what === 'capture' && e.t <= t);

export const P1 = {
  question: `Ben’s ${eur(ben.cents)} request timed out and the till sent it again. How many times is Ben charged?`,
  options: [
    'Once: the bank sees it’s the same payment',
    'Twice: the bank sees two payments',
    'Never: the timeout cancelled it',
  ],
};
export const outcomeOf = () => {
  const r = runFor(false).orders.find(o => o.order.id === ben.id)!;
  return r.doubleCharged ? 1 : r.final === 'settled' ? 0 : 2;
};

export const QUIZ = {
  question:
    'A banking app’s transfer to a friend times out on a train, and the app sends it again when the signal returns. What stops your friend being paid twice?',
  options: [
    'The app sends the same unique key with both requests, so the bank does it once',
    'The bank refuses every retry',
    'A timeout means the first request failed, so nothing to stop',
  ],
  correct: 0,
  explanation: 'The key names the request, so the server recognises the retry and doesn’t do it twice.',
  why: [
    'Right: with the same key on both, the bank sees one transfer sent twice and does it once.',
    'Refusing every retry would lose transfers whose first request really did fail.',
    'A timeout only means no answer came back; the first request may well have worked.',
  ],
};

interface S {
  t: number;
  key: boolean;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'retry',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Ben presses Pay. The till’s request gets no answer, a timeout, so the till sends it again.',
    act: 'Predict how many times Ben is charged.',
    say: { block: 'till', text: 'Sends it again' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'charges',
    focus: 'clock',
    visibleControls: ['out1', 'clock', 'charges'],
    narration: 'Your pick is locked. The first request had worked; only its answer was lost.',
    act: `Move the clock to ${clock(1)}.`,
    say: { block: 'wallet', text: 'Two charges' },
    predicate: s => s.t >= 1,
  },
  {
    id: 'key',
    focus: 'key',
    visibleControls: ['key', 'charges'],
    narration: 'An idempotency key gives the payment one name, so the bank spots the retry.',
    act: 'Turn on the idempotency key.',
    say: { block: 'wallet', text: 'One charge' },
    predicate: s => s.key,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['notes', 'quiz'],
    narration: 'Same retry, one charge. Without the key, Ben disputes the second and Larkspur pays a fee.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What lets the bank tell a retry from a new payment?',
  },
];

function Charges({ s }: { s: S }) {
  const list = chargesOf(runFor(s.key), s.t);
  return (
    <ul className="pm-charges" aria-label={`Charges on Ben’s card, ${clock(s.t)}`}>
      {list.length ? (
        list.map((e, i) => (
          <li key={`${i}${e.t}`} data-charge={i + 1}>{`Charge ${i + 1}: ${eur(e.cents)} on ${ben.card.last4}`}</li>
        ))
      ) : (
        <li data-charge="0">No charges yet</li>
      )}
    </ul>
  );
}

export default function PressedPayTwice() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, key: false, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.key),
          ids = [ben.id];
        return (
          <PaymentsStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              // before the pick: the request on its way out, the answer not yet back
              scene: state.p1 === null ? hopAt(r.orders.find(o => o.order.id === ben.id)!, 1) : tubeAt(r, state.t, ids),
              result: r,
              tick: state.t,
              ids,
              caption: `${clock(state.t)}. Ben’s order, ${state.key ? 'with' : 'without'} an idempotency key.`,
            }}
          />
        );
      }}
      controls={{
        clock: ({ state, sync }) => (
          <Clock id="pm-clock4" t={state.t} onTick={t => sync({ ...state, t, view: 'scene' })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        charges: ({ state }) => <Charges s={state} />,
        key: ({ state, apply }) => (
          <KeySwitch
            id="pm-key4"
            label="Send an idempotency key"
            value={state.key}
            onChange={key => apply({ ...state, key })}
          />
        ),
        notes: () => (
          <>
            <Fact id="idempotency" />
            <Assumed k="chargeback" />
            <SimNote />
            <p className="note pm-note">
              Doing a change exactly once across copies comes back in{' '}
              <a href="/consistency/">Replication &amp; consistency</a>.
            </p>
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
