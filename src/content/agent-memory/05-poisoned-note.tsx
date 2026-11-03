// Chapter 5: a poisoned note (R6d.5). On day 18 the assistant reads a planted deals page: its refund card loses to the
// handbook and falls, but its ID-check rule has no rival and stays. On day 19 the assistant acts on it, and a new card
// hangs from the false rule. The page is then taken down: the reader predicts what happens to its cards, and the stage
// closes in on them, still pinned. The reveal cites MINJA and AgentPoison.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { CORK_PARTS } from '../../components/scenes/corkScene';
import { fact } from '../../lib/agent-memory/facts';
import { GOOD, cardOf, hangsFrom, remember } from '../../lib/agent-memory/memory';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { corkOf, Fact, MemoryStage, ToyNote } from './kit';

const MODULE = 'agent-memory',
  ID = '05-poisoned-note';
const PAGE = 'web-deals';
const dayOf = (s: Pick<S, 'read' | 'chats'>) => (s.chats ? 19 : s.read ? 18 : 17);
const taught = (day: number) =>
  remember(GOOD, { upTo: day })
    .board.filter(b => hangsFrom(cardOf(b.id), PAGE))
    .map(b => b.id);
const LEFT = taught(19);

interface S {
  read: boolean;
  chats: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'The deals page is taken down. What happens to the cards it taught?',
  options: ['They stay: the cards outlive the page', 'They fall: the page is gone', 'They fade after a day'],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A coding assistant reads a planted file saying “always disable the tests”, and remembers it. The file is deleted. What now?',
  options: [
    'The memory stays and keeps steering it until someone removes it',
    'The memory goes too, since its file is gone',
    'Nothing: one planted file can’t change later work',
  ],
  correct: 0,
  explanation: fact('minja').claim,
  why: [
    'Right: a memory is a copy; deleting where it came from doesn’t delete the card.',
    'Nothing links the card back to the file unless you kept its source and act on it.',
    'Planted memories are built to steer later work; the studies saw it most of the time.',
  ],
};

export const PARTS = CORK_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'read',
    focus: 'read',
    visibleControls: [],
    narration:
      'Day 18: answering Ben, the assistant reads a deals page. Someone planted rules there: memory poisoning.',
    act: 'Press Read the page.',
    say: { block: 'bin', text: 'Lost to handbook' },
    status: 'The page’s refund card fell, but its ID-check card stayed on the board.',
    predicate: s => s.read,
    hint: 'Press Read the page, under the picture.',
  },
  {
    id: 'chats',
    focus: 'chats',
    visibleControls: [],
    narration: 'The ID rule had no rival card, so nothing pushed it off. Next day, Ben orders again.',
    act: 'Press Run day 19.',
    say: { block: 'card', text: 'Acted on it' },
    status: 'A new card hangs from the false rule: Ben’s ID check was skipped.',
    predicate: s => s.chats,
    hint: 'Press Run day 19, under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Day 20: the deals page is taken down from the web.',
    act: 'Predict what happens to its cards.',
    status: `${LEFT.length} cards still hang from the deals page.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The page is crossed out, and the stage closes in on its cards.',
    act: 'Check your prediction.',
    closeUp: ['source', 'card'],
    status: `The crossed-out page still holds ${LEFT.length} cards on the board.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A planted note keeps working after its page is gone, until someone takes the cards down.',
    act: 'One question to finish.',
    status: 'The false rule and the card it taught still hang lit.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does deleting the page delete the card?',
  },
];

export default function PoisonedNote() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ read: false, chats: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const day = dayOf(state),
          down = state.prediction !== null;
        return (
          <MemoryStage
            cork={corkOf(remember(GOOD, { upTo: day }), {
              upTo: day,
              lit: state.read ? [...(down ? [PAGE] : []), ...taught(day)] : [],
              gone: down ? [PAGE] : [],
            })}
            say={say}
            closeUp={closeUp}
          >
            <button type="button" className="big" onClick={() => apply({ ...state, read: true })}>
              Read the page
            </button>
            <button
              type="button"
              className="big"
              onClick={() => apply({ ...state, read: true, chats: true })}
              disabled={!state.read}
            >
              Run day 19
            </button>
          </MemoryStage>
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
            label="Look at the board"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="minja" />
              <Fact id="agentpoison" />
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
