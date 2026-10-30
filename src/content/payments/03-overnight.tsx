// Chapter 3: overnight. Past the cut-off the exchange turns to night: a coin convoy carries the day's captured money
// from the issuers to Larkspur, and each fee drops into its party's jar. The reader predicts what reaches Larkspur of
// Ana's payment, reads it off the ledger, and watches the jars fill a second night.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { clock, eur, orderOf, policyOf, runOf } from '../../lib/payments/sim';
import { fact } from '../../lib/payments/facts';
import { TUBE_PARTS, tubeAt } from '../../components/scenes/tubeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Assumed, Clock, Fact, PaymentsStage, SimNote, type View } from './kit';

const MODULE = 'payments',
  ID = '03-overnight';
export const PARTS = TUBE_PARTS;
export const RUN = runOf(policyOf({ sca: 'risk', capture: 'shipment', key: true }));
const ana = orderOf('A1');
export const ANA = RUN.orders.find(o => o.order.id === ana.id)!;
/** the first night, and the second */
export const NIGHT1 = 1,
  NIGHT2 = 3;
const DEBIT = fact('ifr-debit').value!,
  CREDIT = fact('ifr-credit').value!;

export const P1 = {
  question: `Ana paid ${eur(ana.cents)} by debit card. How much of it reaches Larkspur tonight?`,
  options: [
    `${eur(ana.cents)}: all of it`,
    `${eur(ANA.net.merchant)}: a few cents less`,
    `${eur(Math.round(ana.cents * 0.9))}: a tenth goes in fees`,
  ],
};
export const outcomeOf = () =>
  ANA.net.merchant === ana.cents ? 0 : ana.cents - ANA.net.merchant < ana.cents / 20 ? 1 : 2;

const CAKE = 1000;
export const QUIZ = {
  question: `A bakery in Spain sells a ${eur(CAKE)} cake to a customer paying by consumer debit card. What can the customer’s bank keep as interchange, at most?`,
  options: [
    `${eur((CAKE * Number.parseFloat(DEBIT)) / 100)}, the EU cap of ${DEBIT}`,
    `${eur(CAKE / 10)}, a tenth`,
    'Nothing: the customer already paid for the card',
    'Whatever the bakery agreed with its own bank',
  ],
  correct: 0,
  explanation: 'EU law caps interchange on consumer cards; other fees come on top, but this one has a ceiling.',
  why: [
    `Right: on a consumer debit card the issuer may take at most ${DEBIT} of the payment.`,
    'A tenth would be far above the EU cap on interchange.',
    'The issuer keeps interchange on every card payment; card fees paid by the customer are separate.',
    'The bakery’s own bank sets its fee, but interchange goes to the customer’s bank and is capped by law.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'cutoff',
    focus: 'clock',
    visibleControls: ['clock'],
    narration: 'By day Larkspur collects holds and captures, but no money. Money moves at night.',
    act: `Move the clock to ${clock(NIGHT1)}.`,
    say: { block: 'network', text: 'Day closes' },
    predicate: s => s.t >= NIGHT1,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Tonight’s settlement carries the day’s captured money from the customers’ banks to Larkspur.',
    act: 'Predict how much of Ana’s payment arrives.',
    say: { block: 'till', text: 'Money arrives' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ledger',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: 'Interchange goes to Ana’s bank, a fee to the card network and a fee to the acquirer.',
    act: 'Open the Ledger tab.',
    predicate: s => s.view === 'ledger',
  },
  {
    id: 'cap',
    focus: 'clock',
    visibleControls: ['caps', 'clock'],
    narration: `EU law caps interchange at ${DEBIT} on consumer debit cards and ${CREDIT} on credit cards.`,
    act: `Move the clock to ${clock(NIGHT2)}.`,
    say: { block: 'jars', text: 'Fees pile up' },
    predicate: s => s.t >= NIGHT2,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Every night the jars grow: each party in the chain takes a small cut of every payment.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is interchange capped in the EU?',
  },
];

export default function Overnight() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <PaymentsStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={{
            scene: tubeAt(RUN, state.t),
            result: RUN,
            tick: state.t,
            caption: `${clock(state.t)}. ${state.t % 2 ? 'The day’s captures settle.' : 'Requests and captures, no money yet.'}`,
          }}
        />
      )}
      controls={{
        clock: ({ state, sync }) => (
          <Clock id="pm-clock3" t={state.t} onTick={t => sync({ ...state, t, view: 'scene' })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'ledger' })}>
            Open the Ledger tab
          </button>
        ),
        caps: () => (
          <>
            <Fact id="ifr-debit" />
            <Fact id="ifr-credit" />
            <Assumed k="fees" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="settlement" />
            <SimNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
