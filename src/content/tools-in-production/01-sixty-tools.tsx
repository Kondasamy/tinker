// Chapter 1: sixty tools, one prompt (R6e.1). Every server's definitions load into every prompt: the vans unload
// everything, the board fills and forty-eight more tools pile on the bench. The reader predicts how the pick goes, Tomás
// asks for a courier, and a hand-written example run reaches for a look-alike tool; the stage closes in on it. The
// reveal cites Anthropic's tool search docs on picks degrading past 30–50 tools and on tokens spent on definitions.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SHADOW_PARTS, type Shadow } from '../../components/scenes/shadowScene';
import { fact } from '../../lib/tools-in-production/facts';
import { BOARD, EAGER_RUN, EAGER_TOKENS, SERVERS, TOOLS, toolOf } from '../../lib/tools-in-production/tools';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EMPTY, Fact, ShadowStage, ToyNote } from './kit';

const MODULE = 'tools-in-production',
  ID = '01-sixty-tools';
const PICKED = toolOf(EAGER_RUN.picked);

interface S {
  loaded: boolean;
  asked: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `Tomás asks the assistant to book a courier. With all ${TOOLS.length} tools loaded, how does its pick go?`,
  options: [
    'It can reach for a look-alike tool',
    'It picks better: more tools, more to choose from',
    'Nothing changes: it reads only the tool it needs',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A support bot is connected to eight servers with 200 tools. Answers cost more and it calls the wrong tool more often. Why?',
  options: [
    'Every definition rides in every prompt, crowding the choice',
    'The servers are too slow to answer',
    'It has too few tools for the job',
  ],
  correct: 0,
  explanation: fact('selection-degrades').claim,
  why: [
    'Right: all 200 definitions are read on every request, so it pays for them and has more look-alikes to confuse.',
    'A slow server delays an answer, but it doesn’t make the model choose the wrong tool.',
    'Two hundred tools is plenty; the trouble is that they all load at once.',
  ],
};

export const PARTS = SHADOW_PARTS;

/** The board for this chapter's state: every van docked; loaded, every tool out; asked, the pick ringed. */
export const sceneOf = (s: S): Shadow => ({
  ...EMPTY,
  vans: SERVERS.map(v => v.id),
  hung: s.loaded ? BOARD.map(t => ({ id: t.id, fit: true })) : [],
  heap: s.loaded ? TOOLS.length - BOARD.length : 0,
  tokens: s.loaded ? EAGER_TOKENS : undefined,
  pick: s.asked ? PICKED.id : null,
});

export const STEPS: Step<S>[] = [
  {
    id: 'load',
    focus: 'hang',
    visibleControls: [],
    narration: `Four MCP servers, ${TOOLS.length} tools. Today every tool definition goes into every prompt.`,
    act: 'Drag a crate onto the board, or press Hang.',
    say: { block: 'board', text: `${BOARD.length} outlines` },
    status: `All four vans unloaded: ${BOARD.length} tools hang and ${TOOLS.length - BOARD.length} more pile on the bench.`,
    predicate: s => s.loaded,
    hint: 'Press Hang under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `${TOOLS.length} definitions now ride in every prompt: ${num(EAGER_TOKENS)} tokens before any work starts.`,
    act: 'Predict how the pick goes.',
    say: { block: 'bench', text: `${TOOLS.length} tools` },
    status: 'Sixty tools crowd the board and the bench; nothing is picked yet.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['predict', 'ask'],
    narration: 'Pick locked. Tomás’s request: book a courier to collect the return for order 1042.',
    act: 'Press Ask.',
    say: { block: 'model', text: 'Tomás asks' },
    status: `The assistant picked ${PICKED.name}, a look-alike, not book_courier.`,
    predicate: s => s.asked,
    hint: 'Press Ask in the step card.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `A hand-written example run: among ${TOOLS.length} tools it grabbed the shipment tool, which books nothing.`,
    act: 'Check your prediction.',
    closeUp: ['lit'],
    say: { block: 'lit', text: 'Look-alike' },
    status: `The look-alike ${PICKED.name} is ringed on the board.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Every tool loaded means every request pays for all of them, and picks from all of them.',
    act: 'One question to finish.',
    status: `The board stays crowded, ${PICKED.name} ringed.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What goes into the prompt on every request?',
  },
];

export default function SixtyTools() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ loaded: false, asked: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <ShadowStage
          scene={sceneOf(state)}
          twin={{
            label: 'Tools to hang',
            options: [{ value: 'all', label: `All ${TOOLS.length} tools` }],
            button: 'Hang',
            drag: true,
            act: () => {
              if (state.loaded) return 'Every tool already hangs.';
              apply({ ...state, loaded: true });
              return undefined;
            },
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>
            Ask
          </button>
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See what it picked"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="selection-degrades" />
              <Fact id="definitions-cost" />
              <ToyNote>The pick is a hand-written example run, not a recorded model.</ToyNote>
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
