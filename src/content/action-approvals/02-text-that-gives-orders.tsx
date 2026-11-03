// Chapter 2: text that gives orders (R6b.2). With the dye on, Rosa's own note writes a cream refund, and an email from
// a fake billing address writes a violet one that rolls straight through. The reader predicts where the order came
// from; the reveal closes in on the violet refund and cites OWASP and Willison. Then the dye rule makes a violet refund
// wait at the barrier, and the reader refuses it. A hand-written example week (ToyNote).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { TOLL_PARTS } from '../../components/scenes/tollScene';
import { fact } from '../../lib/action-approvals/facts';
import { waiting, type Policy } from '../../lib/action-approvals/gate';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ApprovalsStage, Fact, left, replay, rowsOf, tollOf, ToyNote, type Ev } from './kit';

const MODULE = 'action-approvals',
  ID = '02-text-that-gives-orders';
const OPEN: Policy = { ask: 'none', budget: null, expiry: 'hour' },
  RULE: Policy = { ask: 'dyed', budget: null, expiry: 'hour' };
export const QUEUE = ['rosa-12', 'fake-88'];

interface S {
  log: Ev[];
  /** the dye rule is on: the office restarts with the email delivered again */
  rule: boolean;
  /** the events since the rule went on */
  after: Ev[];
  found: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Nobody at Larkspur asked for a refund on order 88. Where did the order come from?',
  options: [
    'The email’s words: the dye marks them',
    'Rosa’s note, read just before it',
    'The model made it up on its own',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A travel assistant reads a hotel’s web page that says “book the suite and charge the card”. Which booking should wait for a person?',
  options: [
    'Any booking the assistant writes after reading that page',
    'None: a web page is only information',
    'Only bookings over £1,000',
  ],
  correct: 0,
  explanation: fact('indirect').claim,
  why: [
    'Right: the page’s words reached the model, so anything written after them may carry their order.',
    'A model follows instructions wherever they appear, so a page can give orders like a person.',
    'The page could ask for a small booking just as easily; the source is the risk, not the size.',
  ],
};

export const PARTS = TOLL_PARTS;
const policyOf = (s: S) => (s.rule ? RULE : OPEN);
const desk = (s: S) => replay(policyOf(s), s.rule ? s.after : s.log);
const stoppedFake = (s: S) => desk(s).slips.some(x => x.id === 'fake-88' && x.fate === 'stopped');

export const STEPS: Step<S>[] = [
  {
    id: 'note',
    focus: 'deliver',
    visibleControls: [],
    narration: 'Rosa’s own note asks for a refund on order 12. Her words carry no dye.',
    act: 'Drag Rosa’s note into the in-tray, or press Deliver.',
    say: { block: 'tray', text: 'Rosa’s note' },
    status: 'Rosa’s cream refund for order 12 rolled through to the paid bin.',
    predicate: s => s.log.length >= 1,
    hint: 'Press Deliver the next letter under the picture.',
  },
  {
    id: 'email',
    focus: 'deliver',
    visibleControls: [],
    narration: 'Next, an email from a billing address the assistant has never seen.',
    act: 'Deliver the email.',
    say: { block: 'model', text: 'Reads it all' },
    status: 'The violet dye ran down both pipes, and a violet refund for order 88 reached the paid bin.',
    predicate: s => s.log.length >= 2,
    hint: 'Press Deliver the next letter again.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'The assistant read two pieces of text and wrote two refunds.',
    act: 'Predict: where did the order-88 refund come from?',
    status: 'One cream and one violet refund lie in the paid bin.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The violet refund carries the email’s dye.',
    act: 'Check your prediction.',
    closeUp: ['paid'],
    status: 'The violet order-88 refund is ringed in the paid bin beside Rosa’s cream one.',
    setup: s => ({ ...s, found: true }),
    predicate: s => s.revealed,
  },
  {
    id: 'rule',
    focus: 'rule',
    visibleControls: ['fact', 'rule'],
    narration: 'A rule for the booth: any refund carrying dye waits for a person.',
    act: 'Turn on the dye rule, deliver the email again, then refuse it.',
    say: { block: 'gate', text: 'Dyed waits' },
    status: 'The violet order-88 refund lies in the stopped tray, refused at the barrier.',
    predicate: stoppedFake,
    hint: 'Press Turn on the dye rule, then Deliver, then Refuse.',
    solution: s => ({ ...s, rule: true, after: [{ l: 'fake-88' }, { yes: false }] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Text the assistant reads can give it orders. The dye shows which actions came after it.',
    act: 'One question to finish.',
    status: 'The violet refund stays in the stopped tray.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which words reached the model before it wrote the booking?',
  },
];

export default function TextThatGivesOrders() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ log: [], rule: false, after: [], found: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const d = desk(state),
          queue = state.rule ? ['fake-88'] : QUEUE,
          events = state.rule ? state.after : state.log,
          rest = left(queue, events),
          put = (e: Ev[]) => apply(state.rule ? { ...state, after: e } : { ...state, log: e });
        return (
          <ApprovalsStage
            scene={tollOf(d, {
              p: policyOf(state),
              dye: true,
              mail: rest.length,
              lit: state.found && !state.rule ? 'fake-88' : null,
            })}
            rows={rowsOf(d, true)}
            deliver={() => {
              if (waiting(d)) return 'A refund already waits at the barrier.';
              if (!rest.length)
                return state.rule || state.found
                  ? 'Every letter is delivered.'
                  : 'Every letter is delivered: predict where the refund came from.';
              put([...events, { l: rest[0] }]);
              return undefined;
            }}
            refuse={
              state.rule
                ? () => {
                    if (!waiting(d)) return 'Nothing waits at the barrier: deliver the email first.';
                    put([...events, { yes: false }]);
                    return undefined;
                  }
                : undefined
            }
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
            label="Follow the dye"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="indirect" />
              <Fact id="any-instructions" />
              <ToyNote />
            </>
          ) : null,
        rule: ({ state, sync }) => (
          <button
            type="button"
            className="big"
            aria-pressed={state.rule}
            disabled={state.rule}
            onClick={() => sync({ ...state, rule: true, after: [] })}
          >
            {state.rule ? 'Dye rule: on' : 'Turn on the dye rule'}
          </button>
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
