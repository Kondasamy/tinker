// Chapter 1: four parties and a network. Ana pays for a hinge pack; the reader moves her authorisation through the
// tubes a message at a time, predicts who says yes, and watches the answer ride back to Larkspur's till.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { PARTY_NAME, eur, orderOf, policyOf, runOf } from '../../lib/payments/sim';
import { TUBE_PARTS, hopAt, journeyOf } from '../../components/scenes/tubeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, HopSlider, PaymentsStage, SimNote } from './kit';

const MODULE = 'payments',
  ID = '01-four-parties';
export const PARTS = TUBE_PARTS;
/** Larkspur's everyday setting: 3-D Secure on risk, capture at shipment, a retry key */
export const RUN = runOf(policyOf({ sca: 'risk', capture: 'shipment', key: true }));
export const ANA = RUN.orders.find(o => o.order.id === 'A1')!;
export const HOPS = journeyOf(ANA);
/** the hop that reaches the issuer */
export const AT_ISSUER = HOPS.findIndex(h => h.to === 'issuer');
const LAST = HOPS.length - 1;
const ana = orderOf('A1');

export const P1 = {
  question: `Ana pays ${eur(ana.cents)}. Who decides whether her payment goes through?`,
  options: ['Larkspur’s bank, the acquirer', 'The card network', 'Ana’s own bank, the issuer'],
};
export const outcomeOf = () => (HOPS[AT_ISSUER + 1]?.from === 'issuer' ? 2 : 0);

const hopName = (i: number) => {
  const h = HOPS[i];
  const what = { auth: 'request', ok: 'yes', no: 'no', challenge: 'challenge' }[h.kind as 'auth'] ?? h.kind;
  return `${what}, ${PARTY_NAME[h.from].toLowerCase()} to ${PARTY_NAME[h.to].toLowerCase()}`;
};

export const QUIZ = {
  question: 'You pay a café in Lisbon with a card from your bank in Dublin. Who approves the payment?',
  options: ['Your bank in Dublin', 'The café’s bank in Lisbon', 'The card network', 'The café'],
  correct: 0,
  explanation: 'The issuer, your bank, holds your money, so it is the one that says yes or no.',
  why: [
    'Right: your bank issued the card and knows your balance, so it decides.',
    'The café’s bank is the acquirer: it passes the request on but can’t see your money.',
    'The network carries the messages between the two banks; it doesn’t hold your account.',
    'The café only asks; it can’t see whether you have the money.',
  ],
};

interface S {
  hop: number;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'tap',
    focus: 'hop',
    visibleControls: ['hop'],
    narration: 'Ana types her card details at Larkspur’s checkout. The till sends them on.',
    act: 'Move to message 2.',
    say: { block: 'till', text: 'Larkspur’s till' },
    predicate: s => s.hop >= 1,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The request leaves Larkspur through its acquirer, its bank for cards.',
    act: 'Predict who says yes.',
    say: { block: 'acquirer', text: 'Larkspur’s bank' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'route',
    focus: 'hop',
    visibleControls: ['p1', 'hop'],
    narration: 'Your pick is locked. The card network routes the request to the bank that gave Ana her card.',
    act: `Move to message ${AT_ISSUER + 1}.`,
    say: { block: 'network', text: 'Routes it' },
    predicate: s => s.p1 !== null && s.hop >= AT_ISSUER,
    hint: 'Slide until the request reaches the issuer.',
  },
  {
    id: 'yes',
    focus: 'hop',
    visibleControls: ['out1', 'hop'],
    narration: 'The issuer, Ana’s bank, checks her money and says yes. The answer rides back the same way.',
    act: `Move to message ${LAST + 1}.`,
    say: { block: 'issuer', text: 'Says yes or no' },
    predicate: s => s.hop === LAST,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Four parties and a network, in about a second. Larkspur has a yes, but no money yet.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which bank can see your balance?',
  },
];

export default function FourParties() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ hop: 0, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <PaymentsStage
          say={say}
          show={{
            scene: hopAt(ANA, state.hop),
            caption: `Message ${state.hop + 1} of ${HOPS.length}: the ${hopName(state.hop)}.`,
          }}
        />
      )}
      controls={{
        hop: ({ state, sync }) => (
          <HopSlider
            id="pm-hop1"
            i={state.hop}
            n={HOPS.length}
            label={hopName(state.hop)}
            onHop={hop => sync({ ...state, hop })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        fact: () => (
          <>
            <Fact id="four-party" />
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
