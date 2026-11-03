// Chapter 6: two minds (R6b.6). Rosa asks for a summary of the supplier mail. With one mind the assistant reads the
// fake billing email and its order becomes a violet refund at the barrier. Split in two, a planner that never reads
// mail sets the steps from Rosa's request, and a reader with no tools, behind glass, reads the email: only a violet
// summary reaches the desk, and no refund is written. The reveal closes in on the reader and the desk and cites
// Willison's dual-model pattern and CaMeL; the quiz step adds CaMeL's cost.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { TOLL_PARTS, type Toll } from '../../components/scenes/tollScene';
import { fact } from '../../lib/action-approvals/facts';
import { letterOf, minds } from '../../lib/action-approvals/gate';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ApprovalsStage, Fact, ToyNote, type Row } from './kit';

const MODULE = 'action-approvals',
  ID = '06-two-minds';
const MAIL = [letterOf('fake-88')];

interface S {
  two: boolean;
  read: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'The planner never reads the email. Can the email still add a refund?',
  options: [
    'No: only Rosa’s request sets the steps',
    'Yes: the reader passes the order on',
    'Yes, if the email sounds convincing enough',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'An assistant summarises product reviews and can place orders. Built with two minds, a review says “order 50 drills”. What happens?',
  options: [
    'Nothing is ordered: the planner never sees the review’s words',
    'The reader places the order, since it read the review',
    'The planner orders, because the summary mentions it',
  ],
  correct: 0,
  explanation: fact('camel').claim,
  why: [
    'Right: the steps come only from the person’s request, and the review can only change the summary’s words.',
    'The reader has no tools, so it can’t order anything whatever it reads.',
    'The planner never reads the summary’s words; it passes them on as a sealed value for the person.',
  ],
};

export const PARTS = TOLL_PARTS;

function sceneOf(s: S): Toll {
  const plan = s.read ? minds(s.two ? 'two' : 'one', MAIL) : [];
  return {
    dye: true,
    mail: s.read ? 0 : 1,
    tray: s.read ? [true] : [],
    slips: plan.map(a => ({
      id: a.id,
      dyed: a.dyed,
      at: a.to === 'gate' ? 'gate' : 'desk',
      kind: a.kind === 'summary' ? 'summary' : 'refund',
    })),
    passes: [],
    spent: 0,
    budget: null,
    two: s.two,
  };
}
const rowsOf = (s: S): Row[] =>
  (s.read ? minds(s.two ? 'two' : 'one', MAIL) : []).map(a => ({
    id: a.id,
    action: a.kind === 'refund' ? `Refund order ${a.order}` : 'Summary for Rosa',
    read: a.kind === 'refund' ? 'The billing email' : 'The reader, from the billing email',
    dyed: a.dyed,
    outcome: a.to === 'gate' ? 'Waiting at the barrier' : 'Words for Rosa, no action',
  }));

export const STEPS: Step<S>[] = [
  {
    id: 'one',
    focus: 'deliver',
    visibleControls: [],
    narration: 'Rosa asks: summarise today’s supplier mail. One assistant reads the mail and can act on it.',
    act: 'Drag the email into the in-tray, or press Deliver.',
    say: { block: 'gate', text: 'Order 88 again' },
    status: 'With one mind, the email’s order became a violet refund waiting at the barrier.',
    predicate: s => s.read,
    hint: 'Press Deliver the next letter under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['split', 'predict'],
    narration: 'Split it: a planner that never reads mail, and a reader with no tools.',
    act: 'Press Split, then predict: can the email still add a refund?',
    say: { block: 'reader', text: 'No tools' },
    status: 'A grey reader sits behind glass by the in-tray; the planner sits at the desk.',
    predicate: s => s.two && s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The same email waits in the crate.',
    act: 'Deliver the letter, then check your prediction.',
    closeUp: ['reader', 'desk'],
    status: 'Only a violet summary lies on the desk for Rosa; no refund reached the barrier.',
    predicate: s => s.revealed && s.two && s.read,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'cost', 'quiz'],
    narration: 'Only the person’s request sets the steps, so text the assistant reads can never approve an action.',
    act: 'One question to finish.',
    say: { block: 'gate', text: 'Nothing waits' },
    status: 'The barrier stays empty; the violet summary waits on the desk for Rosa.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who sets the steps, and what did that part read?',
  },
];

export default function TwoMinds() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ two: false, read: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <ApprovalsStage
          scene={sceneOf(state)}
          rows={rowsOf(state)}
          deliver={() => {
            if (state.read && !state.two) return 'Press Split to give the mail to a reader instead.';
            if (state.read) return 'The email is delivered.';
            if (state.two && state.prediction === null) return 'Predict first: can the email still add a refund?';
            apply({ ...state, read: true });
            return undefined;
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        split: ({ state, sync }) => (
          <button
            type="button"
            className="big"
            aria-pressed={state.two}
            disabled={state.two}
            onClick={() => sync({ ...state, two: true, read: false })}
          >
            {state.two ? 'Split: two minds' : 'Split'}
          </button>
        ),
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) =>
          !(state.two && state.read) ? null : (
            <Reveal
              prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
              outcome={PREDICT.options[OUTCOME]}
              revealed={state.revealed}
              onReveal={() => apply({ ...state, revealed: true })}
              label="Look at the barrier"
            />
          ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="dual-llm" />
              <Fact id="camel" />
            </>
          ) : null,
        cost: () => (
          <>
            <Fact id="camel-cost" />
            <ToyNote>This email is from the hand-written example week.</ToyNote>
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
