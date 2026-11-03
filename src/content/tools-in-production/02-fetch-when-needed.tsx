// Chapter 2: fetch when needed (R6e.2). Every tool waits in its van; the assistant gets one tool search and loads only
// the three tools it finds, so only the vans with a match back up to the dock. The reader predicts the tokens loaded,
// asks a second request for another server, and the stage closes in on the bench's token count. The search is a
// word-matching stand-in (ToyNote); the reveal cites Anthropic's vendor-reported tool search savings.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SHADOW_PARTS, type Shadow } from '../../components/scenes/shadowScene';
import { fact } from '../../lib/tools-in-production/facts';
import {
  BOARD,
  EAGER_TOKENS,
  lazyTokens,
  REQUESTS,
  requestOf,
  search,
  TOOLS,
  toolOf,
} from '../../lib/tools-in-production/tools';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EMPTY, Fact, ShadowStage, ToyNote } from './kit';

const MODULE = 'tools-in-production',
  ID = '02-fetch-when-needed';
const FIRST = 'courier',
  SECOND = 'stock';

interface S {
  asked: string[];
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `How do this request’s tokens compare with loading all ${TOOLS.length} tools?`,
  options: [
    'A small slice: the search tool plus the three found',
    'The same: every definition is still sent',
    'More: the search adds its own cost on top',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A travel bot can reach 300 tools but loads them only when a search finds them. A traveller asks to change a seat. What reaches the model?',
  options: [
    'The search tool, then the few seat tools it found',
    'All 300 definitions, in case one is needed',
    'No tools at all: the model changes the seat itself',
  ],
  correct: 0,
  explanation: fact('search-saving').claim,
  why: [
    'Right: the definitions wait outside the prompt until a search finds the ones this request needs.',
    'Sending all 300 is the crowded prompt that searching replaces.',
    'The model can’t change anything itself; it still needs the seat tool, found and loaded.',
  ],
};

export const PARTS = SHADOW_PARTS;
const found = (id: string) => search(requestOf(id).text);

/** The board after a request: only the found tools' vans at the dock, the found tools out, the bench's tokens. */
export const sceneOf = (s: S): Shadow => {
  const last = s.asked.at(-1);
  if (!last) return EMPTY;
  const f = found(last);
  return {
    ...EMPTY,
    vans: [...new Set(f.map(id => toolOf(id).server))],
    hung: f.filter(id => BOARD.some(t => t.id === id)).map(id => ({ id, fit: true })),
    heap: f.filter(id => !BOARD.some(t => t.id === id)).length,
    tokens: lazyTokens(f),
  };
};

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: [],
    narration:
      'Lazy loading: every tool waits in its van, and the assistant gets one tool search to find what it needs.',
    act: 'Ask to book a courier.',
    say: { block: 'board', text: 'Empty board' },
    status: `QuickPost and Order desk docked; the three found tools hang, ${num(lazyTokens(found(FIRST)))} tokens loaded.`,
    predicate: s => s.asked.includes(FIRST),
    hint: 'Pick the courier request under the picture, then press Ask.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Only the vans with a match came to the dock.',
    act: 'Predict the tokens this request loaded.',
    say: { block: 'bench', text: 'Tokens?' },
    status: 'Two vans at the dock, three tools on the board, the others still packed.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'again',
    focus: 'ask',
    visibleControls: ['predict'],
    narration: 'Pick locked. A request for a different server brings a different van.',
    act: 'Ask whether the drill is in stock.',
    say: { block: 'stockroom', text: 'Next request' },
    status: `Stockroom docked alone; its three found tools hang, ${num(lazyTokens(found(SECOND)))} tokens loaded.`,
    predicate: s => s.asked.at(-1) === SECOND,
    hint: 'Pick the stock request under the picture, then press Ask.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `Each request loads its own few tools: ${num(lazyTokens(found(SECOND)))} tokens against ${num(EAGER_TOKENS)}.`,
    act: 'Check your prediction.',
    closeUp: ['bench'],
    say: { block: 'bench', text: 'Tokens loaded' },
    status: `The bench reads ${num(lazyTokens(found(SECOND)))} tokens for the stock request.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'The search costs one small tool in every prompt; each request then pays only for what it found.',
    act: 'One question to finish.',
    status: 'Stockroom’s three tools hang; every other van waits in the yard.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What waits outside the prompt until a search finds it?',
  },
];

export default function FetchWhenNeeded() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: [], prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <ShadowStage
          scene={sceneOf(state)}
          twin={{
            label: 'Request',
            options: REQUESTS.filter(r => r.id === FIRST || r.id === SECOND).map(r => ({ value: r.id, label: r.text })),
            button: 'Ask',
            act: id => {
              apply({ ...state, asked: [...state.asked, id] });
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
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Count the tokens"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="search-saving" />
              <Fact id="search-accuracy" />
              <ToyNote>
                The toy saves more than Anthropic’s {fact('search-saving').value}% because its tools are hand-sized.
              </ToyNote>
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
