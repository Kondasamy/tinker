// Chapter 5: prove it's you. A thief buys with Noor's stolen card on a small order Larkspur lets through without
// 3-D Secure. The reader predicts what a challenge would do, turns it on for every order (the thief is stopped, and two
// honest customers give up), then asks only when the bank sees risk.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { FINAL_NAME, orderOf, policyOf, runOf, type Policy, type Sca } from '../../lib/payments/sim';
import { TUBE_PARTS, tubeAt } from '../../components/scenes/tubeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Assumed, Fact, PaymentsStage, ScaSwitch, SimNote, type View } from './kit';

const MODULE = 'payments',
  ID = '05-prove-its-you';
export const PARTS = TUBE_PARTS;
const noor = orderOf('E5'),
  cleo = orderOf('C3'),
  tomas = orderOf('G7');
export const IDS = [noor.id, cleo.id, tomas.id];
const REF = { sca: 'risk', capture: 'shipment', key: true } as const;
/** the small orders under a 3-D Secure setting, every other kind as usual */
export const runFor = (sca: Sca) => {
  const p: Policy = { ...policyOf(REF), small: { ...REF, sca } };
  return runOf(p);
};
export const finalOf = (sca: Sca, id: string) => runFor(sca).orders.find(o => o.order.id === id)!.final;

export const P1 = {
  question: `What would a 3-D Secure challenge do to the thief using ${noor.who}’s card?`,
  options: [
    `Stop the thief, who can’t prove to be ${noor.who}`,
    'Nothing: the card number is enough',
    'Stop every customer, thief or not',
  ],
};
export const outcomeOf = () => (finalOf('always', noor.id) === 'declined' ? 0 : 1);

export const QUIZ = {
  question:
    'Buying concert tickets online, your bank asks you to approve in its phone app with your fingerprint. Why both the phone and the fingerprint?',
  options: [
    'Two independent proofs: something you have and something you are',
    'The fingerprint makes the payment cheaper',
    'One proof is for the ticket seller, one for the bank',
  ],
  correct: 0,
  explanation: 'Strong customer authentication needs two independent kinds of proof, so one stolen thing isn’t enough.',
  why: [
    'Right: a thief with your card number has neither your phone nor your finger.',
    'Authentication proves who you are; it doesn’t change the fees.',
    'Both proofs go to your bank, the issuer; the seller only learns the answer.',
  ],
};

interface S {
  sca: Sca;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'exempt',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A thief buys a padlock with ${noor.who}’s stolen card number. Larkspur skips 3-D Secure on small orders.`,
    act: 'Predict what a challenge would do.',
    say: { block: 'wallet', text: 'Stolen card' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'always',
    focus: 'sca',
    visibleControls: ['out1', 'sca', 'results'],
    narration: `Your pick is locked. Strong customer authentication asks for two proofs, such as ${noor.who}’s phone and a PIN.`,
    act: 'Set 3-D Secure to Always.',
    say: { block: 'issuer', text: 'Asks for proof' },
    predicate: s => s.sca === 'always',
  },
  {
    id: 'risk',
    focus: 'sca',
    visibleControls: ['sca', 'results'],
    narration: `The challenge stopped the thief, but honest ${cleo.who} and ${tomas.who} gave up too.`,
    act: 'Set it to When the bank sees risk.',
    say: { block: 'wallet', text: 'Gave up' },
    predicate: s => s.sca === 'risk',
    hint: 'Pick the chip that asks only when the bank sees risk.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['results', 'notes', 'quiz'],
    narration: `Only risky checkouts get a challenge now: the thief is still stopped, and ${tomas.who} pays.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many kinds of proof does the bank ask for?',
  },
];

function Results({ s }: { s: S }) {
  return (
    <ul className="pm-charges" aria-label="Small orders this checkout">
      {[noor, cleo, tomas].map(o => (
        <li key={o.id} data-order={o.id} data-final={finalOf(s.sca, o.id)}>
          {`${o.fraud ? `A thief with ${o.who}’s card` : o.who}, ${o.item}: ${FINAL_NAME[finalOf(s.sca, o.id)]}`}
        </li>
      ))}
    </ul>
  );
}

export default function ProveItsYou() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ sca: 'never', p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.sca);
        return (
          <PaymentsStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: tubeAt(r, 0, IDS),
              result: r,
              tick: 1,
              ids: IDS,
              caption: `Three small orders, Day 1. 3-D Secure: ${state.sca === 'never' ? 'skipped' : state.sca === 'always' ? 'always' : 'on risk'}.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        sca: ({ state, apply }) => (
          <ScaSwitch label="3-D Secure on small orders" value={state.sca} onChange={sca => apply({ ...state, sca })} />
        ),
        results: ({ state }) => <Results s={state} />,
        notes: () => (
          <>
            <Fact id="sca" />
            <Fact id="sca-factors" />
            <Fact id="low-value" />
            <Fact id="3ds" />
            <Assumed k="abandon" />
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
