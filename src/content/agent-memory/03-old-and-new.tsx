// Chapter 3: old and new disagree (R6d.3). Ada moves: the order system's new address card is pinned beside the old one
// from her chat, both lit. The reader predicts which stays; the conflict rule (the better source wins, then the newer)
// drops the old card into the bin and the stage closes in. Then a newer card from a web page loses to the handbook:
// newer alone doesn't win. The reveal cites Mem0's update step.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { CORK_PARTS, type Cork } from '../../components/scenes/corkScene';
import { fact } from '../../lib/agent-memory/facts';
import { CAPACITY, GOOD, cardOf, remember, sourceOf, wins } from '../../lib/agent-memory/memory';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { corkOf, fall, Fact, MemoryStage, ToyNote } from './kit';

const MODULE = 'agent-memory',
  ID = '03-old-and-new';
const DAY = 17,
  OLD = 'ada-elm',
  NEW = 'ada-mill',
  RULE = 'rule-refund',
  WEB = 'web-refund';
const RUN = remember(GOOD, { upTo: DAY });
const FREE = [...Array(CAPACITY).keys()].filter(i => !RUN.board.some(b => b.slot === i));
const LOSER = wins(cardOf(OLD), cardOf(NEW), 'ranked').id === NEW ? OLD : NEW;
const WEB_LOSES = wins(cardOf(RULE), cardOf(WEB), 'ranked').id === RULE;

interface S {
  added: boolean;
  prediction: number | null;
  revealed: boolean;
  web: boolean;
  quiz: number | null;
}
/** settled: the conflict rule has dropped the loser */
type Pic = Pick<S, 'added' | 'web'> & { settled: boolean };

function picture({ added, web, settled }: Pic): Cork {
  if (!added) return corkOf(RUN, { upTo: DAY });
  let c = corkOf(RUN, {
    upTo: DAY,
    lit: settled ? [NEW] : [OLD, NEW, cardOf(OLD).from, cardOf(NEW).from],
    extra: [{ id: NEW, slot: FREE[0] }],
  });
  if (settled) c = fall(c, [LOSER]);
  if (web) {
    const page = sourceOf('web-deals');
    c = {
      ...c,
      sources: [...c.sources, { id: page.id, short: page.short, paper: page.trust, at: 'board' }],
      cards: [
        ...c.cards.map(x => ({ ...x, lit: x.id === RULE })),
        { id: WEB, label: cardOf(WEB).label, tone: 'store', from: page.id, at: 'board', slot: FREE[1] },
      ],
    };
    if (WEB_LOSES) c = fall(c, [WEB]);
  }
  return c;
}

export const PREDICT = {
  question: 'Two address cards for Ada can’t both be true. Which should stay?',
  options: [
    '14 Mill Lane: newer, and from the order system',
    '12 Elm Row: it was there first',
    'Both: let the assistant pick each time',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A customer’s chat says their phone number changed. The billing system, a week older, has the old one. Which wins?',
  options: [
    'It depends: weigh how far you trust each source, then which is newer',
    'The chat, always: the newest memory wins',
    'Billing, always: the oldest memory was checked first',
  ],
  correct: 0,
  explanation: fact('update-ops').claim,
  why: [
    'Right: a trusted, newer source should win; a newer but weaker one shouldn’t on its own.',
    'Newest alone lets any recent chat or page overwrite a trusted record.',
    'Age isn’t trust: an old record can simply be out of date.',
  ],
};

export const PARTS = CORK_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'new',
    focus: 'add',
    visibleControls: [],
    narration: 'Day 20: Ada moved. Her old address card and the new one are a conflict: both can’t be true.',
    act: 'Press Add the new order.',
    say: { block: 'card', text: 'Two addresses' },
    status: 'Two address cards for Ada hang side by side, both lit.',
    predicate: s => s.added,
    hint: 'Press Add the new order, under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'The old card came from Ada’s chat; the new one from the order system.',
    act: 'Predict which card stays.',
    status: 'Both of Ada’s address cards still hang lit.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The rule: the better source wins, then the newer card.',
    act: 'Check your prediction.',
    closeUp: ['card'],
    say: { block: 'card', text: 'Kept' },
    status: 'The old address fell into the bin; 14 Mill Lane stays lit.',
    predicate: s => s.revealed,
  },
  {
    id: 'web',
    focus: 'web',
    visibleControls: ['fact'],
    narration: 'A web page, newer still, says refunds can go to any account. The handbook says otherwise.',
    act: 'Press Read the web page.',
    status: 'The web page’s refund card fell straight into the bin: the handbook outranks it.',
    predicate: s => s.web,
    hint: 'Press Read the web page, under the picture.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'One card per fact. When two disagree, trust the better source first, and newer second.',
    act: 'One question to finish.',
    status: 'The handbook’s refund rule and Ada’s new address hang lit.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is the newest card always the truest?',
  },
];

export default function OldAndNew() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ added: false, prediction: null, revealed: false, web: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <MemoryStage
          cork={picture({ added: state.added, web: state.web, settled: state.prediction !== null && state.added })}
          say={say}
          closeUp={closeUp}
        >
          <button type="button" className="big" onClick={() => apply({ ...state, added: true })}>
            Add the new order
          </button>
          <button
            type="button"
            className="big"
            onClick={() => apply({ ...state, added: true, web: true })}
            disabled={state.prediction === null}
          >
            Read the web page
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
            label="See which stays"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="update-ops" />
              <ToyNote>Here a fixed ranking stands in: staff systems, then customers, then web pages.</ToyNote>
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
