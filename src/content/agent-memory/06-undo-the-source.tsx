// Chapter 6: undo the source (R6d.6). Day 26: the deals page's rule, and the card the rule taught, still hang on the
// board. The reader predicts what pulling the page's thread drops, pulls it (drag the paper into the bin, or Undo
// source), and the stage closes in on the bin; then Dan's chats, planted through an ordinary chat, go the same way.
// Pulling a trusted source is refused. The reveal cites OWASP's rollback advice.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { CORK_PARTS } from '../../components/scenes/corkScene';
import { fact } from '../../lib/agent-memory/facts';
import { GOOD, cardOf, hangsFrom, remember, sourceOf } from '../../lib/agent-memory/memory';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { corkOf, Fact, MemoryStage, ToyNote } from './kit';

const MODULE = 'agent-memory',
  ID = '06-undo-the-source';
const DAY = 26,
  PAGE = 'web-deals',
  DAN = 'chat-dan';
const BEFORE = remember(GOOD, { upTo: DAY });
const from = (src: string) => BEFORE.board.filter(b => hangsFrom(cardOf(b.id), src)).map(b => b.id);
const PAGE_CARDS = from(PAGE),
  DAN_CARDS = from(DAN);

interface S {
  pulled: string[];
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Pull the deals page’s thread. What falls?',
  options: [
    'The page, its rule, and the card the rule taught',
    'Only the page: the cards were saved on their own',
    'Every card added since the page was read',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A shop finds that one supplier’s price feed was faked for a week. Its assistant remembered prices from it. What should go?',
  options: [
    'Every memory that came from that feed, and anything learnt from those',
    'Every memory from that week, from any source',
    'Only the prices someone has already complained about',
  ],
  correct: 0,
  explanation: fact('rollback').claim,
  why: [
    'Right: with sources kept, you remove exactly what the bad feed taught, and nothing good.',
    'That throws away good memories from trusted sources along with the bad.',
    'The rest of the fake prices would keep steering answers until someone noticed.',
  ],
};

export const PARTS = CORK_PARTS;
const has = (s: S, id: string) => s.pulled.includes(id);

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Day 26. The deals page taught a rule, and the rule taught a card about Ben.',
    act: 'Predict what pulling the page’s thread drops.',
    say: { block: 'source', text: 'Planted' },
    status: `${PAGE_CARDS.length} cards hang from the deals page, one through the other.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'pull',
    focus: 'pull',
    visibleControls: ['predict'],
    narration: 'Undo by source pulls one paper, and every card hanging from it comes down.',
    act: 'Drag the web page into the bin, or press Undo source.',
    say: { block: 'source', text: 'Pull this' },
    status: `The page and its ${PAGE_CARDS.length} cards fell; nothing else moved.`,
    predicate: s => has(s, PAGE),
    hint: 'Pick the deals page under the picture, then press Undo source.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the bin.',
    act: 'Check your prediction.',
    closeUp: ['bin'],
    status: `The bin holds the deals page and its ${PAGE_CARDS.length} cards.`,
    predicate: s => s.revealed,
  },
  {
    id: 'pull-dan',
    focus: 'pull',
    visibleControls: ['fact'],
    narration: 'Dan’s chats planted a delivery note too, through an ordinary chat.',
    act: 'Undo Dan’s chats.',
    say: { block: 'source', text: 'Planted too' },
    status: `Dan’s chats and the ${DAN_CARDS.length} cards from them fell into the bin.`,
    predicate: s => has(s, DAN),
    hint: 'Pick Dan’s chats under the picture, then press Undo source.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Every memory names its source, so when a source goes bad you can undo everything it taught.',
    act: 'One question to finish.',
    status: 'Only cards from trusted sources and real customers hang on the board.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the thread let you find?',
  },
];

export default function UndoTheSource() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ pulled: [], prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        // Dan's chats light only once the page's reveal is done, so the close-up stays on the bin
        const next = !state.pulled.includes(PAGE) ? PAGE : state.revealed && !state.pulled.includes(DAN) ? DAN : null;
        return (
          <MemoryStage
            cork={corkOf(remember(GOOD, { upTo: DAY, undone: state.pulled }), {
              upTo: DAY,
              lit: next ? [next] : [],
            })}
            pull={id => {
              if (state.prediction === null) return 'Make your prediction first.';
              if (id !== PAGE && id !== DAN)
                return `${sourceOf(id).name} is a source you trust; its cards are right. Pull a planted one.`;
              if (id === DAN && !state.pulled.includes(PAGE)) return 'Pull the deals page first.';
              if (!state.pulled.includes(id)) apply({ ...state, pulled: [...state.pulled, id] });
              return undefined;
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
            label="Count what fell"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="rollback" />
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
