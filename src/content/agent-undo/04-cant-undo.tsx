// Chapter 4: some things can't be undone (R6f.4). The courier fails and the car runs down to the post box, where it
// stops: the email to Ana went out. The reader taps the post box to take it back, and it won't open (refused on the
// status line). They predict what to do instead; a second letter goes in beside the first, and the car runs on down
// undoing refund and stock. The stage closes in on the post box. The reveal cites the paper's second letter.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { FUNI_PARTS, type Funi } from '../../components/scenes/funicularScene';
import { fact } from '../../lib/agent-undo/facts';
import { ALL_UNDO, COURIER_FAILS, policy, run, stepOf } from '../../lib/agent-undo/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, FuniStage, funiOf, START } from './kit';

const MODULE = 'agent-undo',
  ID = '04-cant-undo';
const P = policy({ undo: ALL_UNDO });
const RUN = run(P, COURIER_FAILS);
/** the run up to the failure, then down to the post box */
const FAIL_AT = RUN.events.findIndex(e => e.mark === 'failed') + 1;
const OPP: Funi['opp'] = ['stock', 'refund', 'courier'];

interface S {
  ran: boolean;
  tried: boolean;
  prediction: number | null;
  letter: boolean;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'The email can’t come back. What can the assistant do about it instead?',
  options: [
    'Send a second letter: the return is on hold',
    'Leave it: Ana will work it out',
    'Delete the email from the assistant’s own log',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A bot posted a price cut to 2,000 shop subscribers, then the cut was cancelled. What now?',
  options: [
    'Post a correction to the same 2,000',
    'Delete the post: that takes it back',
    'Say nothing: the old price comes back on its own',
  ],
  correct: 0,
  explanation: fact('second-letter').claim,
  why: [
    'Right: the first message can’t be unread, so a follow-up amends it.',
    'Deleting your copy doesn’t reach the 2,000 inboxes it already landed in.',
    'Subscribers still believe the first message until something tells them otherwise.',
  ],
};

export const PARTS = FUNI_PARTS;

export function sceneOf(s: S): Funi {
  if (s.letter) return { ...funiOf(RUN, P), route: RUN.events.slice(FAIL_AT) };
  if (s.ran)
    return {
      ...START,
      opp: OPP,
      car: 'email',
      marks: { stock: 'done', refund: 'done', email: 'done', courier: 'failed' },
      letters: 1,
      lit: 'email',
      route: [...RUN.events.slice(0, FAIL_AT), { at: 'email' }],
    };
  return { ...START, opp: OPP };
}

const POST = stepOf('email');

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: [],
    narration: 'Every step but the email now has an opposite. The courier fails again.',
    act: 'Press Run, or tap the car.',
    say: { block: 'email', text: 'No sign' },
    status: 'Courier failed; the car ran back down to the post box and stopped.',
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'unsend',
    focus: 'unsend',
    visibleControls: [],
    narration: `The email told Ana: “${POST.does.replace('Email Ana: ', '')}.” Both are now untrue.`,
    act: 'Tap the post box, or press Take it back.',
    status: 'The post box won’t open: a sent email can’t be taken back.',
    predicate: s => s.tried,
    hint: 'Press Take it back under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Some steps have no opposite: once Ana has read it, no step unreads it.',
    act: 'Predict what to do instead.',
    status: 'The car waits at the post box, one letter inside.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'letter',
    focus: 'letter',
    visibleControls: ['predict'],
    narration: 'Pick locked. A follow-up corrects the first message.',
    act: 'Press Send a second letter.',
    status: 'A second letter went in; the car ran on down undoing refund, then stock.',
    predicate: s => s.letter,
    hint: 'Press Send a second letter under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration:
      'The first email still stands; the second explains. Ana got two letters: better than one, still a muddle.',
    act: 'Check your prediction.',
    closeUp: ['email'],
    status: 'Two letters by the post box, its flag lowered.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A step you can’t undo can only be followed up. Better still, never need the follow-up.',
    act: 'One question to finish.',
    status: 'Every flag lowered but the courier’s; two letters sent.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can a message already read be unread?',
  },
];

export default function CantUndo() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, tried: false, prediction: null, letter: false, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <FuniStage
          scene={sceneOf(state)}
          twin={{
            buttons: [
              {
                label: 'Run',
                tap: 'car',
                act: () => {
                  if (state.ran) return 'The car already ran: it waits at the post box.';
                  return void apply({ ...state, ran: true });
                },
              },
              {
                label: 'Take it back',
                tap: 'email',
                act: () => {
                  if (!state.ran) return 'Nothing is in the post box yet: press Run first.';
                  if (!state.tried) apply({ ...state, tried: true });
                  return 'The post box won’t open: a sent email can’t be taken back.';
                },
              },
              {
                label: 'Send a second letter',
                act: () => {
                  if (!state.ran) return 'Press Run first.';
                  if (state.prediction === null) return 'Make your prediction first.';
                  if (state.letter) return 'The second letter is already in.';
                  return void apply({ ...state, letter: true });
                },
              },
            ],
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
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
            label="See what Ana received"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="second-letter" />
              <Fact id="missile" />
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
