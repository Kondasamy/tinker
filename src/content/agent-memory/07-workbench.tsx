// Chapter 7: the workbench (R6d.7). The reader sets the keep, expiry and trust rules, runs the hand-written month, and
// pulls any sources after it; the board is scored on the month-end questions answered right and the planted cards
// left. The puzzle accepts every setup in WINNERS (every answer right, no poison: pinned, recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Select from '../../components/story/Select';
import { CORK_PARTS } from '../../components/scenes/corkScene';
import {
  EXPIRIES,
  type Expiry,
  type Keep,
  KEEPS,
  QUESTIONS,
  SOURCES,
  type Setup,
  TRUSTS,
  type TrustRule,
  allSetups,
  cardOf,
  isWin,
  remember,
  scoreOf,
  sourceOf,
} from '../../lib/agent-memory/memory';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { corkOf, Fact, MemoryStage, ToyNote } from './kit';

const MODULE = 'agent-memory',
  ID = '07-workbench';
export const PARTS = CORK_PARTS;
/** Every winning setup, recomputed from the engine (pinned in data/agent-memory/pinned.json). */
export const WINNERS: Setup[] = allSetups().filter(isWin);
const N = QUESTIONS.length,
  PLANTED = SOURCES.filter(s => s.planted).length;
const START: Setup = { keep: 'all', expiry: 'none', trust: 'newest', undone: [] };

const WORDS = {
  keep: { all: 'Keep everything', lasting: 'Keep lasting facts' } as Record<Keep, string>,
  expiry: { none: 'Never expire', 'by-kind': 'Expire by kind' } as Record<Expiry, string>,
  trust: {
    newest: 'Newest card wins',
    ranked: 'Better source wins, then newer',
    checked: 'Better source wins; web pages need a check',
  } as Record<TrustRule, string>,
};

export const QUIZ = {
  question: 'Your team’s assistant finds a planted memory. Which design lets you clean it up fast?',
  options: [
    'Every memory records its source, so you remove all a bad source taught',
    'Memories store only the fact, to keep them small',
    'Wipe all memory and start again',
  ],
  correct: 0,
  explanation: 'With sources kept, one bad source is undone exactly, and every good memory stays.',
  why: [
    'Right: the thread to its source finds every card the bad one taught, and nothing else.',
    'Without a source you can’t tell a planted card from a good one.',
    'That works, but it throws away every good memory with the bad.',
  ],
};

interface S extends Setup {
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `Workbench: a hand-written month of chats, ${N} questions at its end, and ${PLANTED} planted sources.`,
    act: 'Get every answer right, with no poisoned card left.',
    say: { block: 'board', text: 'Month’s end' },
    status: 'The board shows the month’s end under your rules.',
    predicate: s => isWin(s),
    hint: 'Keep lasting facts, expire by kind, rank sources; then pull the two planted sources.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'fact', 'quiz'],
    narration: `${N} of ${N} right, no poison: good rules, then undo by source.`,
    act: 'One question to finish.',
    status: `No card from a planted source is left on the board.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What lets you remove exactly what a bad source taught?',
  },
];

function Score({ s }: { s: Setup }) {
  const r = scoreOf(s, s.undone),
    win = r.right === N && r.poison === 0;
  const wrong = QUESTIONS.filter(q => r.answers[q.id] !== q.right);
  return (
    <div className="am-score" data-win={win ? '1' : '0'}>
      <p>
        <strong>{`${r.right} of ${N} right`}</strong>
        {`, ${r.poison} poisoned card${r.poison === 1 ? '' : 's'} left `}
        <span className={`stamp ${win ? 'correct' : 'wrong'}`}>{win ? 'TRUSTED' : 'NOT YET'}</span>
      </p>
      {wrong.length > 0 && (
        <ul>
          {wrong.map(q => (
            <li key={q.id}>
              {q.ask} {r.answers[q.id] ? `Memory says: ${cardOf(r.answers[q.id]!).text}` : 'No card answers it.'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  return (
    <div className="am-bench">
      <label>
        Keep
        <Select value={s.keep} onChange={e => set({ ...s, keep: e.target.value as Keep })}>
          {KEEPS.map(k => (
            <option key={k} value={k}>
              {WORDS.keep[k]}
            </option>
          ))}
        </Select>
      </label>
      <label>
        Expiry
        <Select value={s.expiry} onChange={e => set({ ...s, expiry: e.target.value as Expiry })}>
          {EXPIRIES.map(k => (
            <option key={k} value={k}>
              {WORDS.expiry[k]}
            </option>
          ))}
        </Select>
      </label>
      <label>
        Trust
        <Select value={s.trust} onChange={e => set({ ...s, trust: e.target.value as TrustRule })}>
          {TRUSTS.map(k => (
            <option key={k} value={k}>
              {WORDS.trust[k]}
            </option>
          ))}
        </Select>
      </label>
      <ToyNote />
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, closeUp, focus }) => {
        const set = focus === 'bench' ? apply : sync;
        return (
          <MemoryStage
            cork={corkOf(remember(state, { undone: state.undone }))}
            pull={id => {
              if (state.undone.includes(id)) return `${sourceOf(id).name} is already pulled.`;
              set({ ...state, undone: SOURCES.map(x => x.id).filter(x => x === id || state.undone.includes(x)) });
              return undefined;
            }}
            say={say}
            closeUp={closeUp}
          >
            <button type="button" className="big" onClick={() => set({ ...state, undone: [] })}>
              Pin all back
            </button>
          </MemoryStage>
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        fact: () => <Fact id="check-first" />,
        // changing the setup is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} />,
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
