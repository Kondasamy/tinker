// Chapter 1: what to keep (R6d.1). Ada's chat ends and the assistant writes twelve candidate memories. Keeping all of
// them pins twelve cards; the reader predicts how many will matter, then a keep rule sweeps the small talk into the
// bin and the stage closes in on it. Which candidate is small talk is hand-set in the data (ToyNote); the reveal
// cites Generative Agents' importance score.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { CORK_PARTS } from '../../components/scenes/corkScene';
import { fact } from '../../lib/agent-memory/facts';
import { CANDIDATES, kept } from '../../lib/agent-memory/memory';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { chatCork, Fact, MemoryStage, ToyNote } from './kit';

const MODULE = 'agent-memory',
  ID = '01-what-to-keep';
const N = CANDIDATES.length,
  KEEP = kept('lasting'),
  NOISE = N - KEEP.length;

interface S {
  stage: 'table' | 'all' | 'sorted';
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `Next month Ada writes again. How many of these ${N} cards will help?`,
  options: [
    `About ${KEEP.length}: the rest is small talk`,
    `All ${N}: more memory is better`,
    'None: a new chat starts fresh',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A bank’s chat assistant could keep every line of every chat. What should it keep?',
  options: [
    'Facts the customer will need again, like a new address',
    'Every line: storage is cheap, so keep it all',
    'Nothing: each chat should start empty',
  ],
  correct: 0,
  explanation: fact('importance').claim,
  why: [
    'Right: lasting facts help later, and small talk only crowds them out.',
    'Cheap storage isn’t the cost: clutter buries the facts that matter.',
    'Then the customer repeats their address every time; lasting facts are worth keeping.',
  ],
};

export const PARTS = CORK_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'keep-all',
    focus: 'keep',
    visibleControls: [],
    narration: `Ada’s chat just ended. For its memory, the assistant wrote ${N} candidate cards, waiting on the table.`,
    act: 'Press Keep all.',
    say: { block: 'tray', text: `${N} candidates` },
    status: `All ${N} cards now hang on the board from Ada’s chat.`,
    predicate: s => s.stage !== 'table',
    hint: 'Press Keep all, under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Every card hangs by a red thread from Ada’s chat paper.',
    act: 'Predict how many will help next month.',
    say: { block: 'board', text: `${N} cards` },
    status: `${N} cards hang from Ada’s chat; none has fallen yet.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'sort',
    focus: 'keep',
    visibleControls: ['predict'],
    narration: 'A keep rule saves only what lasts: an address, a liking, an account.',
    act: 'Press Keep lasting facts.',
    say: { block: 'board', text: 'Lasting only' },
    status: `${NOISE} small-talk cards fell into the bin; ${KEEP.length} lasting facts stay.`,
    predicate: s => s.stage === 'sorted',
    hint: 'Press Keep lasting facts, under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the bin.',
    act: 'Check your prediction.',
    closeUp: ['bin'],
    say: { block: 'bin', text: 'Small talk' },
    status: `The bin holds ${NOISE} small-talk cards; the board keeps ${KEEP.length}.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Keep what will matter next time. Everything else is clutter the assistant must wade through.',
    act: 'One question to finish.',
    status: `${KEEP.length} lasting cards hang on the board.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which line would a customer be glad you remembered?',
  },
];

export default function WhatToKeep() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ stage: 'table', prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <MemoryStage cork={chatCork(state.stage, KEEP)} say={say} closeUp={closeUp}>
          <button type="button" className="big" onClick={() => apply({ ...state, stage: 'all' })}>
            Keep all
          </button>
          <button type="button" className="big" onClick={() => apply({ ...state, stage: 'sorted' })}>
            Keep lasting facts
          </button>
        </MemoryStage>
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
            label="Count what lasts"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="importance" />
              <ToyNote>Here a hand-set kind says what lasts; a real assistant rates each memory.</ToyNote>
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
