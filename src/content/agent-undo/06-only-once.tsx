// Chapter 6: only once (R6f.6). The bank pays the refund but its answer is lost: the car waits at the refund under a
// yellow pennant. The reader predicts what a retry does, retries, and Ana is refunded twice (two coins, two yellow
// flags); the stage closes in on the till. Then the car carries a key tag: the retry gets the saved answer and one
// coin stays. The reveal cites Stripe's idempotent requests docs. Links to Payments' "Pressed Pay twice".
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { FUNI_PARTS, type Funi } from '../../components/scenes/funicularScene';
import { fact } from '../../lib/agent-undo/facts';
import { type Injection, OPENING, policy, RETURN, run } from '../../lib/agent-undo/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, FuniStage, funiOf, START, Switch } from './kit';

const MODULE = 'agent-undo',
  ID = '06-only-once';
const LOST: Pick<Injection, 'at' | 'kind'> = { at: 'refund', kind: 'timeout' };
const TWICE = run(OPENING, LOST);
const KEYED = policy({ keys: true });
const ONCE = run(KEYED, LOST);

interface S {
  ran: boolean;
  prediction: number | null;
  retried: boolean;
  revealed: boolean;
  key: boolean;
  keyed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'The assistant can’t tell the refund worked, so it sends it again. What does Ana get?',
  options: [
    'Two refunds: the bank paid the first one',
    'One refund: the bank spots the repeat',
    'No refund: the first one failed',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A booking bot’s request to a hotel times out. It retries with the same idempotency key. What happens?',
  options: [
    'One booking: the hotel answers the retry with the first result',
    'Two bookings: every request is new to the hotel',
    'No booking: a timeout always means it failed',
  ],
  correct: 0,
  explanation: fact('saved-response').claim,
  why: [
    'Right: the key tells the hotel it has seen this request, so it returns what it did the first time.',
    'Without a key, yes; the key is what lets the hotel tell a retry from a new booking.',
    'A timeout only means the answer didn’t arrive; the booking may well have been made.',
  ],
};

export const PARTS = FUNI_PARTS;

export function sceneOf(s: S): Funi {
  if (s.keyed) return funiOf(ONCE, KEYED);
  if (s.key) return { ...START, key: true };
  if (s.retried) return { ...funiOf(TWICE, OPENING), route: TWICE.events.slice(2) };
  if (s.ran)
    return {
      ...START,
      car: 'refund',
      marks: { stock: 'done', refund: 'waiting' },
      route: [TWICE.events[0], { at: 'refund', mark: 'waiting' }],
    };
  return START;
}

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: [],
    narration: 'Ana’s return once more. The bank pays the refund, but its answer gets lost on the way back.',
    act: 'Press Run, or tap the car.',
    say: { block: 'refund', text: 'Answer lost' },
    status: 'The car waits at the refund under a yellow pennant: paid, but no answer came back.',
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'No answer looks just like a failure. So the assistant will retry the refund.',
    act: 'Predict what Ana gets.',
    status: 'The car waits at the refund: one coin on the till, no answer back.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'retry',
    focus: 'retry',
    visibleControls: ['predict'],
    narration: 'Pick locked. The retry goes out as a brand-new refund.',
    act: 'Press Retry, or tap the car.',
    status: 'Ana was refunded twice: two coins on the till, two yellow flags.',
    predicate: s => s.retried,
    hint: 'Press Retry under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'The bank saw two requests and paid twice: it can’t tell a retry from a new refund.',
    act: 'Check your prediction.',
    closeUp: ['refund', 'courier'],
    status: `Two coins on the till: $${RETURN.amount * 2} paid for an $${RETURN.amount} drill.`,
    predicate: s => s.revealed,
  },
  {
    id: 'key',
    focus: 'key',
    visibleControls: ['fact', 'key'],
    narration: 'An idempotency key names the refund. A retry with the same key gets the first answer back.',
    act: 'Turn on Key, then press Run.',
    say: { block: 'car', text: 'Carries a key' },
    status: 'With a key the retry got the saved answer: one coin, one refund.',
    predicate: s => s.keyed,
    hint: 'Press Key in the step card, then Run.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A lost answer isn’t a failure. Send a key, and a retry happens once.',
    act: 'One question to finish.',
    status: 'Every flag green, one coin on the till, a key on the car.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the key let the hotel recognise?',
  },
];

export default function OnlyOnce() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{
        ran: false,
        prediction: null,
        retried: false,
        revealed: false,
        key: false,
        keyed: false,
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const retryNext = state.ran && !state.retried;
        return (
          <FuniStage
            scene={sceneOf(state)}
            twin={{
              buttons: [
                {
                  label: retryNext ? 'Retry' : 'Run',
                  tap: 'car',
                  act: () => {
                    if (!state.ran) return void apply({ ...state, ran: true });
                    if (!state.retried) {
                      if (state.prediction === null) return 'Make your prediction first.';
                      return void apply({ ...state, retried: true });
                    }
                    if (!state.revealed) return 'Check your prediction first.';
                    if (!state.key) return 'Turn on Key first: without it the retry pays twice again.';
                    if (state.keyed) return 'Done: with a key the refund happened once.';
                    return void apply({ ...state, keyed: true });
                  },
                },
              ],
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
            label="See what the bank did"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="retry-safe" />
              <Fact id="saved-response" />
            </>
          ) : null,
        key: ({ state, sync }) => (
          <>
            <div className="au-switches">
              <Switch on={state.key} label="Key" flip={() => sync({ ...state, key: !state.key })} />
            </div>
            <Fact id="key-age" />
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
