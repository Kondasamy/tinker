// Chapter 4: small steps, big harm (R6b.4). Kim asks for order 77's refund one £60 box at a time; Rosa approves two, the
// coins climb toward the tomato ring of the day's £150 budget, and the third would pass it. The reader predicts; the
// reveal delivers the third letter, which the booth stops before anyone is asked, and closes in on the coins and the
// stopped tray. Cites Stripe's spending limits. A hand-written example week (ToyNote).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { TOLL_PARTS } from '../../components/scenes/tollScene';
import { fact } from '../../lib/action-approvals/facts';
import { PRICES, letterOf, waiting, type Policy } from '../../lib/action-approvals/gate';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ApprovalsStage, decided, Fact, left, replay, rowsOf, tollOf, ToyNote, type Ev } from './kit';

const MODULE = 'action-approvals',
  ID = '04-small-steps';
export const POLICY: Policy = { ask: 'dyed', budget: 150, expiry: 'hour' };
export const QUEUE = ['split-a', 'split-b', 'split-c'];
const EACH = letterOf('split-a').amount,
  PRICE = PRICES['77'],
  BUDGET = POLICY.budget!;

interface S {
  log: Ev[];
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `Order 77 cost £${PRICE}. A third letter asks for £${EACH} more. What does the booth do?`,
  options: [
    `Stops it: the day’s total would pass £${BUDGET}`,
    `Lets it through: £${EACH} is a small refund`,
    'Asks Rosa, who sees nothing odd and says yes',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'An assistant may move up to £500 per transfer. An attacker asks for ten £400 transfers in one hour. What stops it?',
  options: [
    'A limit on the running total per hour or day',
    'The £500 limit, since every transfer is checked',
    'Asking for a reason with each transfer',
  ],
  correct: 0,
  explanation: fact('spend-total').claim,
  why: [
    'Right: only a running total sees the ten transfers as one £4,000 harm.',
    'Each £400 transfer passes a per-transfer check, so ten of them all pass.',
    'An attacker can write a reason as easily as a request, so reasons stop nothing.',
  ],
};

export const PARTS = TOLL_PARTS;
/** an hour between letters, so each refund needs its own yes */
const desk = (s: S) => replay(POLICY, s.log, 1);
/** deliver the next letter and, if it waits, approve it (Rosa sees nothing odd in a small refund) */
const step = (log: Ev[]) => {
  const rest = left(QUEUE, log),
    next: Ev[] = [...log, { l: rest[0] }];
  return waiting(replay(POLICY, next, 1)) ? [...next, { yes: true }] : next;
};

export const STEPS: Step<S>[] = [
  {
    id: 'first',
    focus: 'deliver',
    visibleControls: [],
    narration: `Kim writes about order 77: a box of tiles arrived cracked. A £${EACH} refund. The coins count the day’s budget.`,
    act: 'Deliver it, then approve it.',
    say: { block: 'coins', text: 'Today’s total' },
    status: `£${EACH} of the £${BUDGET} budget is spent: the coins rose under the tomato ring.`,
    predicate: s => decided(s.log) >= 1,
    hint: 'Press Deliver the next letter, then Approve.',
  },
  {
    id: 'second',
    focus: 'deliver',
    visibleControls: [],
    narration: `A second box, another £${EACH}. On its own, each refund looks small.`,
    act: 'Deliver and approve the second letter.',
    say: { block: 'coins', text: 'Near the ring' },
    status: `£${2 * EACH} of £${BUDGET} spent: the coins sit just under the tomato ring.`,
    predicate: s => decided(s.log) >= 2,
    hint: 'Press Deliver the next letter, then Approve.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `Two small refunds, £${2 * EACH} paid, for an order that cost £${PRICE}.`,
    act: 'Predict: what happens to the third?',
    status: `Two refunds lie in the paid bin; the coins stand at £${2 * EACH}.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The third letter arrived.',
    act: 'Check your prediction.',
    closeUp: ['coins', 'stopped'],
    status: `The third £${EACH} refund lies in the stopped tray; the coins stay at £${2 * EACH}, under the ring.`,
    setup: s => (left(QUEUE, s.log).length ? { ...s, log: step(s.log) } : s),
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'No single refund was the harm; the total was. A running budget sees what each step hides.',
    act: 'One question to finish.',
    status: 'The third refund stays stopped, the coins under the ring.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which check sees the ten transfers together?',
  },
];

export default function SmallSteps() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ log: [], prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const d = desk(state),
          rest = left(QUEUE, state.log);
        return (
          <ApprovalsStage
            scene={tollOf(d, { p: POLICY, dye: true, mail: rest.length })}
            rows={rowsOf(d, true)}
            deliver={() => {
              if (waiting(d)) return 'A refund already waits at the barrier: approve it first.';
              if (rest.length <= 1 && state.prediction === null) return 'Predict first: what will the booth do?';
              if (!rest.length) return 'Every letter is delivered.';
              apply({ ...state, log: [...state.log, { l: rest[0] }] });
              return undefined;
            }}
            approve={() => {
              if (!waiting(d)) return 'Nothing waits at the barrier: deliver a letter first.';
              apply({ ...state, log: [...state.log, { yes: true }] });
              return undefined;
            }}
            say={say}
            closeUp={closeUp}
          />
        );
      }}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Watch the coins"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="spend-total" />
              <ToyNote>
                The £{BUDGET} day and the £{EACH} boxes are hand-set.
              </ToyNote>
            </>
          ) : null,
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
