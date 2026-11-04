// Chapter 1: halfway done (R6f.1). The car climbs the four stations in R6f's order: restock, refund, email, courier.
// QuickPost refuses the pickup, and the car stops at the courier with three green flags still flying below it. The
// reader predicts where the return stands; the stage closes in on the refund and the post box, still done. The reveal
// cites Garcia-Molina and Salem: a half-finished saga is undesirable and must be compensated for.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { FUNI_PARTS, type Funi } from '../../components/scenes/funicularScene';
import { fact } from '../../lib/agent-undo/facts';
import { COURIER_FAILS, FAILURE, OPENING, RETURN, run } from '../../lib/agent-undo/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, FuniStage, funiOf, START, ToyNote } from './kit';

const MODULE = 'agent-undo',
  ID = '01-halfway-done';
const RUN = run(OPENING, COURIER_FAILS);

interface S {
  ran: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Where does Ana’s return stand now?',
  options: [
    'Half done: restocked, refunded and emailed, but no pickup',
    'Nothing happened: the failure cancelled every step',
    'Done: the pickup can wait for another day',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A travel bot booked the flight and the hotel, then the car hire failed. What is the trip now?',
  options: [
    'Half booked: two bookings stand until something undoes them',
    'Cancelled: the failure undid the bookings',
    'Fine: the bot finishes the car hire on its own later',
  ],
  correct: 0,
  explanation: fact('partial-undesirable').claim,
  why: [
    'Right: each booking went through on its own, and nothing yet takes them back.',
    'A failure stops the next step; it never reaches back to cancel the ones already done.',
    'Nothing retries by itself; the trip waits half booked until someone acts.',
  ],
};

export const PARTS = FUNI_PARTS;

export const sceneOf = (s: S): Funi => (s.ran ? funiOf(RUN, OPENING) : START);

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Each station is one step of Ana’s return, bottom to top. At the courier, QuickPost will refuse.',
    act: 'Predict where the return will stand.',
    say: { block: 'courier', text: 'Will refuse' },
    status: 'The car waits in the valley below four stations, no flag flying yet.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['predict'],
    narration: 'Pick locked. The car carries the assistant up the hill, one step per station.',
    act: 'Press Run, or tap the car.',
    say: { block: 'car', text: 'Starts here' },
    status: 'The car climbed three stations and stopped at the courier: QuickPost refused.',
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `${FAILURE} Ana has her $${RETURN.amount} and an email promising a pickup that never comes.`,
    act: 'Check your prediction.',
    closeUp: ['refund', 'courier'],
    status: 'The refund and the post box still fly green: done, and nothing undoes them.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A failed step stops the run; it never reaches back. Half done is the worst place to stop.',
    act: 'One question to finish.',
    status: 'Three steps stand below the courier’s red flag.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did the failure touch the bookings already made?',
  },
];

export default function HalfwayDone() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, prediction: null, revealed: false, quiz: null }}
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
                  if (state.prediction === null) return 'Make your prediction first.';
                  if (state.ran) return 'The run is over: the car stopped at the courier.';
                  apply({ ...state, ran: true });
                  return undefined;
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
            label="See what still stands"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="partial-undesirable" />
              <ToyNote />
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
