// Chapter 4: agreed shapes (R6c.4). Every reply must fit the agreed shape (rows, cheapest supplier, price as a number);
// desk 2 writes its price in words. The reader predicts what happens at the board, runs the job: desk 2's reply is a
// square plug that won't seat in the round port and springs back, and the resend seats. The stage closes in on the
// ports. The shape check is the engine's own validate(); the reveal cites the A2A protocol's message parts and error.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SWITCH_PARTS } from '../../components/scenes/switchboardScene';
import { jobOf, MALFORMED, MINUTES, validate } from '../../lib/multi-agent/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RunStage, runOf, ToyNote, type Run } from './kit';

const MODULE = 'multi-agent',
  ID = '04-agreed-shapes';
const JOB = jobOf('report');
const SC = { malformed: true };

interface S extends Run {
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'What happens to desk 2’s reply at the board?',
  options: [
    'It bounces back, and desk 2 resends the price as a number',
    'The lead guesses a number and merges it',
    'It is merged as words, and the report shows them',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A helper returns a delivery date as “sometime next week”. The agreed shape wants a date. What should the lead do?',
  options: [
    'Send it back to be redone as a date',
    'Guess a date and carry on',
    'Accept it, since the helper sounded sure',
  ],
  correct: 0,
  explanation: 'A reply that doesn’t fit the agreed shape goes back to its sender, never into the report.',
  why: [
    'Right: the shape check catches it at the door, and only the helper knows the real date.',
    'A guess puts a made-up date in the report, with nothing to show it was guessed.',
    'Sounding sure doesn’t change the shape: “next week” still isn’t a date.',
  ],
};

export const PARTS = SWITCH_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict', 'shape'],
    narration: `The agreed shape: rows, cheapest supplier, price as a number. Desk 2 writes its price as “${MALFORMED.price}”.`,
    act: 'Predict what happens at the board.',
    say: { block: 'port', text: 'Round ports' },
    status: '3 cords wait; every port on the board is round.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['predict', 'shape'],
    narration: 'Pick locked. Now run the job and watch the ports.',
    act: 'Tap the switchboard, or press Run.',
    status: 'Desk 2’s square plug sprang back from its port; the resent round one seated.',
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `The square plug never seated: the port takes only the agreed shape. The resend cost ${MINUTES.resend} minutes.`,
    act: 'Check your prediction.',
    closeUp: ['port'],
    status: 'The square plug lies on the board’s base, under port 2.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Agree the shape first, and a reply that doesn’t fit goes back instead of into the report.',
    act: 'One question to finish.',
    status: 'Every port holds a round reply, and the report is complete.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who knows the real value?',
  },
];

/** The reply as desk 2 sent it, and what the shape check says. */
function Shape() {
  return (
    <div className="ma-reply">
      <p>
        Desk 2’s reply: rows {MALFORMED.rows}, cheapest {MALFORMED.cheapest}, price “{MALFORMED.price}”.
      </p>
      <p className="note">Shape check: {validate(MALFORMED).join('; ')}.</p>
    </div>
  );
}

export default function AgreedShapes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...runOf([1, 2, 3]), prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, closeUp, focus }) => (
        <RunStage
          s={state}
          apply={apply}
          sync={sync}
          job={JOB}
          sc={SC}
          canRun={focus === 'run'}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        shape: () => <Shape />,
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Look at the ports"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="a2a-parts" />
              <Fact id="a2a-reject" />
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
