// Chapter 4: forgetting on purpose (R6d.4). Jumping to day 30 drops Cara's hold note, past its kind's expiry. Then Cara
// asks to be forgotten: the reader predicts what must go, and Forget drops every card about her, her address from the
// order system too, with her chats' paper. Pulling only her chats' thread is refused: it would leave that address.
// The reveal cites OWASP's retention limit and Anthropic's memory controls.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { CORK_PARTS } from '../../components/scenes/corkScene';
import { fact } from '../../lib/agent-memory/facts';
import { GOOD, END, expiryOf, remember } from '../../lib/agent-memory/memory';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { corkOf, Fact, MemoryStage, ToyNote } from './kit';

const MODULE = 'agent-memory',
  ID = '04-forgetting';
const DAY = 17,
  HOLD = expiryOf('hold')!;
const cara = (when: { jumped: boolean; forgot: boolean }) =>
  remember(GOOD, { upTo: DAY, today: when.jumped ? END : DAY, forgot: when.forgot ? ['cara'] : [] });
const GONE = remember(GOOD, { upTo: DAY, today: END }).board.filter(
  b => !remember(GOOD, { upTo: DAY, today: END, forgot: ['cara'] }).board.some(x => x.id === b.id),
).length;

interface S {
  jumped: boolean;
  prediction: number | null;
  forgot: boolean;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Cara writes: “Please forget me.” What must go?',
  options: [
    'Every card about Cara, whatever its source',
    'Only the cards from Cara’s own chats',
    'Nothing: memories can’t be taken back',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A gym’s assistant keeps a member’s injury note. The member leaves and asks to be forgotten. What goes?',
  options: [
    'Everything about them, from the chats and from the sign-up system',
    'Only what they typed into the chat',
    'Nothing yet: wait for the notes to expire',
  ],
  correct: 0,
  explanation: fact('delete-controls').claim,
  why: [
    'Right: forgetting a person means every memory about them, whatever its source.',
    'The sign-up system’s cards are about them too, so they would stay behind.',
    'Expiry is for notes that stop mattering; a request to forget is acted on now.',
  ],
};

export const PARTS = CORK_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'jump',
    focus: 'jump',
    visibleControls: [],
    narration: `Some memories matter only for a while. A hold note has an expiry: ${HOLD} days.`,
    act: 'Press Jump to day 30.',
    say: { block: 'board', text: 'Hold note' },
    status: `Cara’s hold note passed its ${HOLD} days and fell into the bin.`,
    predicate: s => s.jumped,
    hint: 'Press Jump to day 30, under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Cara’s cards came from her chats and from the order system.',
    act: 'Predict what “forget me” must remove.',
    status: 'Cara’s ladder and address cards still hang on the board.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'forget',
    focus: 'forget',
    visibleControls: ['predict'],
    narration: 'Pulling her chats’ thread alone would leave her address from the order system.',
    act: 'Press Forget Cara.',
    say: { block: 'source', text: 'Not enough' },
    status: 'Every card about Cara fell, her address from the order system too.',
    predicate: s => s.forgot,
    hint: 'Press Forget Cara, under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the bin.',
    act: 'Check your prediction.',
    closeUp: ['bin'],
    say: { block: 'bin', text: 'All of Cara' },
    status: `The bin holds Cara’s ${GONE} cards and her chats’ paper.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Expiry drops notes that stop mattering. Forgetting a person drops every card about them, at once.',
    act: 'One question to finish.',
    status: 'No card about Cara is left on the board.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which cards are about the person, whatever their source?',
  },
];

export default function Forgetting() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ jumped: false, prediction: null, forgot: false, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <MemoryStage
          cork={corkOf(cara(state), { upTo: DAY })}
          pull={id =>
            id === 'chat-cara'
              ? 'That pulls only her chats; her address from the order system would stay. Press Forget Cara.'
              : 'Forgetting is about a person, not one source: press Forget Cara.'
          }
          say={say}
          closeUp={closeUp}
        >
          <button type="button" className="big" onClick={() => apply({ ...state, jumped: true })}>
            Jump to day 30
          </button>
          <button
            type="button"
            className="big"
            onClick={() => apply({ ...state, jumped: true, forgot: true })}
            disabled={state.prediction === null}
          >
            Forget Cara
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
            label="See what went"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="retention" />
              <Fact id="delete-controls" />
              <ToyNote>Here only hold notes expire, after a hand-set {HOLD} days.</ToyNote>
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
