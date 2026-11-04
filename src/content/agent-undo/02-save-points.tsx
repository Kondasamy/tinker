// Chapter 2: save points (R6f.2). The assistant crashes right after the email; with no record of what it did, the
// restart runs the car back to the valley and redoes stock, refund and email (two coins, two letters, double flags).
// The stage closes in on the refund and the post box. Then the reader turns save points on: a peg goes in at each
// finished station, and the restart resumes at the courier. The reveal cites Garcia-Molina and Salem on save points.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { FUNI_PARTS, type Funi } from '../../components/scenes/funicularScene';
import { fact } from '../../lib/agent-undo/facts';
import { type Injection, OPENING, policy, run } from '../../lib/agent-undo/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, FuniStage, funiOf, START, Switch } from './kit';

const MODULE = 'agent-undo',
  ID = '02-save-points';
const CRASH: Pick<Injection, 'at' | 'kind'> = { at: 'email', kind: 'crash' };
const REDO = run(OPENING, CRASH);
const SAVED = policy({ saves: true });
const RESUME = run(SAVED, CRASH);
/** the run up to the crash: the car stops at the post box */
const UNTIL = REDO.events.findIndex(e => e.stopped) + 1;

interface S {
  ran: boolean;
  prediction: number | null;
  restarted: boolean;
  revealed: boolean;
  saves: boolean;
  /** the run with save points on */
  saved: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'The assistant restarts with no record of what it did. What happens?',
  options: [
    'It redoes all three: two refunds, two emails',
    'It carries on from the courier',
    'It undoes the three, then starts over',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A payroll bot crashes after paying 40 of 90 staff. With save points, what does the restart do?',
  options: ['Read the log and pay the other 50', 'Pay all 90 again from the top', 'Take back the 40 payments first'],
  correct: 0,
  explanation: fact('save-points').claim,
  why: [
    'Right: the log says who was paid, so the restart carries on from there.',
    'That is a restart with no record: 40 people would be paid twice.',
    'Nothing went wrong with those 40; a save point lets you keep them and go on.',
  ],
};

export const PARTS = FUNI_PARTS;

export function sceneOf(s: S): Funi {
  if (s.saved) return funiOf(RESUME, SAVED);
  // save points on: a fresh return waits in the valley
  if (s.saves) return START;
  if (s.restarted) return { ...funiOf(REDO, OPENING), route: REDO.events.slice(UNTIL) };
  if (s.ran) {
    const upTo = REDO.events.slice(0, UNTIL);
    return {
      ...START,
      car: 'email',
      stopped: true,
      marks: { stock: 'done', refund: 'done', email: 'done' },
      letters: 1,
      route: upTo,
    };
  }
  return START;
}

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: [],
    narration: 'Ana’s return again, every step in order. This time the assistant crashes right after the email.',
    act: 'Press Run, or tap the car.',
    say: { block: 'car', text: 'Will crash' },
    status: 'The car stopped at the post box, lamp red: stock, refund and email done.',
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'The assistant restarts. It kept no record of the steps it finished.',
    act: 'Predict what the restart does.',
    say: { block: 'email', text: 'Crashed here' },
    status: 'The car waits at the post box with its red lamp on.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'restart',
    focus: 'restart',
    visibleControls: ['predict'],
    narration: 'Pick locked. Without a record, the assistant starts the return from the bottom.',
    act: 'Press Restart, or tap the car.',
    status: 'Stock, refund and email each happened twice, then the courier was booked.',
    predicate: s => s.restarted,
    hint: 'Press Restart under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Two refunds and two emails to Ana: double yellow flags. Nothing told the restart what was done.',
    act: 'Check your prediction.',
    closeUp: ['refund', 'email'],
    status: 'Two coins on the till, two letters by the post box.',
    predicate: s => s.revealed,
  },
  {
    id: 'saves',
    focus: 'saves',
    visibleControls: ['fact', 'saves'],
    narration: 'A save point records each finished step in a log, so a restart reads it and carries on.',
    act: 'Turn on Save points, then press Run.',
    say: { block: 'courier', text: 'Resumes here' },
    status: 'Pegs at every station: the restart resumed at the courier, every step done once.',
    predicate: s => s.saved,
    hint: 'Press Save points in the step card, then Run.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Write down each step as it finishes, and a crash costs you a restart, not a repeat.',
    act: 'One question to finish.',
    status: 'Every flag green, a peg at each station.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the log tell the restart?',
  },
];

export default function SavePoints() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{
        ran: false,
        prediction: null,
        restarted: false,
        revealed: false,
        saves: false,
        saved: false,
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const restartNext = state.ran && !state.restarted;
        return (
          <FuniStage
            scene={sceneOf(state)}
            twin={{
              buttons: [
                {
                  label: restartNext ? 'Restart' : 'Run',
                  tap: 'car',
                  act: () => {
                    if (!state.ran) return void apply({ ...state, ran: true });
                    if (!state.restarted) {
                      if (state.prediction === null) return 'Make your prediction first.';
                      return void apply({ ...state, restarted: true });
                    }
                    if (!state.revealed) return 'Check your prediction first.';
                    if (!state.saves) return 'Turn on Save points first: without them it would redo the same steps.';
                    if (state.saved) return 'Done: with save points every step ran once.';
                    return void apply({ ...state, saved: true });
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
            label="See what the restart did"
          />
        ),
        fact: ({ state }) => (state.revealed ? <Fact id="save-points" /> : null),
        saves: ({ state, sync }) => (
          <div className="au-switches">
            <Switch on={state.saves} label="Save points" flip={() => sync({ ...state, saves: !state.saves })} />
          </div>
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
