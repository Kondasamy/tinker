// Chapter 6: the money comes back. With 3-D Secure skipped on small orders, the real Noor disputes a stolen-card
// padlock days later and the chargeback rides back to Larkspur's till, taking the money and a fee. Kai's stolen card
// passed 3-D Secure, so when it is disputed the issuer pays it back instead. The ledger shows who lost what.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { clock, eur, orderOf, policyOf, runOf, type Policy } from '../../lib/payments/sim';
import { TUBE_PARTS, tubeAt } from '../../components/scenes/tubeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Assumed, Clock, Fact, PaymentsStage, SimNote, type View } from './kit';

const MODULE = 'payments',
  ID = '06-the-money-comes-back';
export const PARTS = TUBE_PARTS;
const noor = orderOf('E5'),
  kai = orderOf('L12');
export const IDS = [noor.id, kai.id];
const REF = { sca: 'risk', capture: 'shipment', key: true } as const;
/** small orders skip 3-D Secure (Larkspur asks for the exemption); everything else as usual */
export const POLICY: Policy = { ...policyOf(REF), small: { ...REF, sca: 'never' } };
export const RUN = runOf(POLICY);
const at = (id: string, what: string) => RUN.events.find(e => e.order === id && e.what === what)!.t;
/** when Noor's chargeback lands, and when Kai's issuer pays */
export const NOOR_T = at(noor.id, 'chargeback'),
  KAI_T = at(kai.id, 'issuer-pays');
export const lossOf = (id: string) => RUN.orders.find(o => o.order.id === id)!.fraudLoss;

export const P1 = {
  question: `${kai.who}’s card was stolen too, but that payment passed 3-D Secure. Who loses the ${eur(kai.cents)}?`,
  options: [`Larkspur, as with ${noor.who}’s padlock`, `${kai.who}’s bank, the issuer`, `${kai.who}, the cardholder`],
};
export const outcomeOf = () => (lossOf(kai.id).issuer > 0 ? 1 : lossOf(kai.id).merchant > 0 ? 0 : 2);

export const QUIZ = {
  question:
    'A shoe shop skips 3-D Secure to make checkout quicker. A month later a customer says a pair was bought with her stolen card. Who usually pays?',
  options: [
    'The shoe shop: the payment wasn’t authenticated',
    'The customer, since it was her card',
    'Her bank, the issuer, always',
  ],
  correct: 0,
  explanation: 'Without 3-D Secure the issuer can charge the fraud back to the shop, with a fee on top.',
  why: [
    'Right: with no authentication, the chargeback takes the money back from the shop.',
    'The real cardholder disputes it and gets the money back; she didn’t make the purchase.',
    'The issuer bears it only when the payment was authenticated with 3-D Secure.',
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
    id: 'dispute',
    focus: 'clock',
    visibleControls: ['clock'],
    narration: `Days later, the real ${noor.who} finds the padlock on her statement and disputes it.`,
    act: `Move the clock to ${clock(NOOR_T)}.`,
    say: { block: 'till', text: 'Money taken back' },
    predicate: s => s.t >= NOOR_T,
    hint: `Slide the clock to ${clock(NOOR_T)}.`,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A chargeback took the padlock’s money back from Larkspur, plus a fee. ${kai.who}’s stolen card passed 3-D Secure.`,
    act: `Predict who loses ${kai.who}’s money.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'kai',
    focus: 'clock',
    visibleControls: ['clock'],
    narration: `Your pick is locked. The real ${kai.who} disputes the drill press too.`,
    act: `Move the clock to ${clock(KAI_T)}.`,
    say: { block: 'issuer', text: 'Pays it back' },
    predicate: s => s.p1 !== null && s.t >= KAI_T,
    hint: `Slide the clock to ${clock(KAI_T)}.`,
  },
  {
    id: 'ledger',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: 'An authenticated payment moves the fraud to the issuer: a liability shift. Larkspur keeps that money.',
    act: 'Open the Ledger tab.',
    predicate: s => s.view === 'ledger',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['notes', 'quiz'],
    narration: `Skipping the check saved ${noor.who}’s checkout a step and cost Larkspur the padlock and a fee.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Was the shoe payment authenticated?',
  },
];

export default function TheMoneyComesBack() {
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
            scene: tubeAt(RUN, state.t, IDS),
            result: RUN,
            tick: state.t,
            ids: IDS,
            caption: `${clock(state.t)}. Two stolen cards: ${noor.who}’s padlock and ${kai.who}’s drill press.`,
          }}
        />
      )}
      controls={{
        clock: ({ state, sync }) => (
          <Clock id="pm-clock6" t={state.t} onTick={t => sync({ ...state, t, view: 'scene' })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'ledger' })}>
            Open the Ledger tab
          </button>
        ),
        notes: () => (
          <>
            <Fact id="liability-shift" />
            <Fact id="dispute-groups" />
            <Fact id="dispute-window" />
            <Assumed k="dispute" />
            <Assumed k="chargeback" />
            <Assumed k="fees-kept" />
            <SimNote />
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
