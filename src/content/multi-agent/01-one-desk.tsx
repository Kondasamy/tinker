// Chapter 1: one agent, one desk (R6c.1). The lead reads all 30 catalogues alone; its desk (its context window) holds
// 24, so six fall to the floor unread and the report has gaps. The reader predicts the last six's fate, runs the job
// (a tap on the board, or Run), and the stage closes in on the spill. Room and tokens are hand-set (ToyNote); the reveal
// cites Anthropic on its lead's context window being cut off.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SWITCH_PARTS } from '../../components/scenes/switchboardScene';
import { CATALOGUES, jobOf, ROOM } from '../../lib/multi-agent/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RunStage, runOf, ToyNote, type Run } from './kit';

const MODULE = 'multi-agent',
  ID = '01-one-desk';
const JOB = jobOf('report'),
  N = CATALOGUES.length,
  LEFT = N - ROOM;

interface S extends Run {
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `The desk holds ${ROOM} catalogues. What happens to the last ${LEFT}?`,
  options: [
    'They are never read, so the report has gaps',
    `The lead reads faster, and all ${N} fit`,
    'The lead hands them to a helper by itself',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A support agent must read 500 old tickets for a summary, more than it can hold at once. What happens?',
  options: [
    'It summarises only what fit, and the rest is missing',
    'It reads them all, just more slowly',
    'It asks for more room, and gets it',
  ],
  correct: 0,
  explanation: 'One agent has one context window: whatever doesn’t fit is never read.',
  why: [
    'Right: past its context window the agent can’t hold more, so the rest never makes it in.',
    'Reading slowly doesn’t make room; the limit is how much it holds, not how fast it reads.',
    'The window is fixed for the model; nothing grants more room mid-job.',
  ],
};

export const PARTS = SWITCH_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `The lead will read all ${N} catalogues alone. Its desk is its context window: it holds ${ROOM}.`,
    act: `Predict: what happens to the last ${LEFT}?`,
    say: { block: 'desk', text: `Room for ${ROOM}` },
    status: `${N} catalogues wait on the cart beside the lead’s empty desk.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['predict'],
    narration: 'Pick locked. Now let the lead work.',
    act: 'Tap the switchboard, or press Run.',
    say: { block: 'board', text: 'Tap to run' },
    status: `The lead read ${ROOM} catalogues; ${LEFT} fell off its full desk unread.`,
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `${LEFT} catalogues fell to the floor unread, so ${LEFT} suppliers are missing from Ines’s report.`,
    act: 'Check your prediction.',
    closeUp: ['desk', 'report'],
    status: `${LEFT} unread catalogues lie on the floor by the lead’s desk.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'One agent has one context window: past its room, the work is left undone.',
    act: 'One question to finish.',
    status: `The report on Ines’s tray is missing ${LEFT} suppliers.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can an agent hold more than its window?',
  },
];

export default function OneDesk() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...runOf(), prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, closeUp, focus }) => (
        <RunStage
          s={state}
          apply={apply}
          sync={sync}
          job={JOB}
          canRun={focus !== 'predict'}
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
            label="See the floor"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="truncated" />
              <ToyNote>Here the desk holds {ROOM} catalogues.</ToyNote>
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
