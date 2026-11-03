// Chapter 2: where it came from (R6d.2). By day 10 the board holds cards from five sources, each card tied by red thread
// to its paper. Tracing a paper lights its threads and cards; the reader predicts which cards a broken order system
// could have spoiled, traces it, and the stage closes in on its threads. The reveal cites OWASP's source attribution.
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
  ID = '02-where-it-came-from';
const DAY = 10;
const RUN = remember(GOOD, { upTo: DAY });
const from = (src: string) => RUN.board.filter(b => hangsFrom(cardOf(b.id), src)).map(b => b.id);
const ADA = from('chat-ada'),
  ORDERS = from('orders');

interface S {
  traced: string[];
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'The order system sent wrong data all week. Which cards should you check?',
  options: [
    'The cards hanging from the order system’s paper',
    'Every address card on the board',
    'Every card: any of them could be wrong',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A travel assistant remembers that a customer is vegetarian. What should that memory carry?',
  options: [
    'Where it came from: which chat or system said so',
    'Nothing else: the fact speaks for itself',
    'Only the date it was saved',
  ],
  correct: 0,
  explanation: fact('source-attribution').claim,
  why: [
    'Right: with its source, you can check it, and remove it if that source turns out wrong.',
    'A bare fact can’t be checked or traced when something goes wrong.',
    'A date says when, not who said it, so a bad source stays hidden.',
  ],
};

export const PARTS = CORK_PARTS;
const last = (s: S) => s.traced.at(-1);

export const STEPS: Step<S>[] = [
  {
    id: 'trace',
    focus: 'trace',
    visibleControls: [],
    narration: 'Each card hangs by a red thread from its source: the paper it was learnt from.',
    act: 'Tap Ada’s chats, or pick them and press Trace.',
    say: { block: 'board', text: 'Thread to source' },
    status: `Ada’s chats are lit, with the ${ADA.length} cards that hang from them.`,
    predicate: s => s.traced.includes('chat-ada'),
    hint: 'Pick Ada’s chats under the picture, then press Trace.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `Day ${DAY + 2}: the order system sent out wrong data all week.`,
    act: 'Predict which cards to check.',
    status: `Ada’s ${ADA.length} cards are still lit.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'trace-orders',
    focus: 'trace',
    visibleControls: ['predict'],
    narration: 'Follow the order system’s threads to the cards it taught.',
    act: 'Trace the order system.',
    say: { block: 'board', text: 'Follow threads' },
    status: `The order system is lit, with its ${ORDERS.length} address cards.`,
    predicate: s => last(s) === 'orders',
    hint: 'Pick Order system under the picture, then press Trace.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the order system’s threads.',
    act: 'Check your prediction.',
    closeUp: ['source', 'card'],
    say: { block: 'card', text: 'Check these' },
    status: `Only ${ORDERS.length} cards hang from the order system; the rest are safe.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A thread to its source lets you check a memory, and find every card a bad source taught.',
    act: 'One question to finish.',
    status: 'The order system’s threads stay lit.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What would you need to undo it later?',
  },
];

export default function WhereItCameFrom() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ traced: [], prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const src = last(state);
        return (
          <MemoryStage
            cork={corkOf(RUN, { upTo: DAY, lit: src ? [src, ...from(src)] : [] })}
            trace={id => {
              apply({ ...state, traced: [...state.traced, id] });
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
            label="Follow the threads"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <p>
                {ORDERS.map(id => cardOf(id).text).join(' ')} Both came from the {sourceOf('orders').name.toLowerCase()}
                .
              </p>
              <Fact id="source-attribution" />
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
