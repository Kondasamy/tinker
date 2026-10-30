// Chapter 2: finding the file. Without a search tool the agent opens files one by one, and every byte it reads goes into
// its context; the reader predicts the cost with search, gives it the tool and runs the same ticket. The search runs
// live over the repo, and every read is costed at BYTES_PER_TOKEN.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DESK_PARTS } from '../../components/scenes/deskScene';
import { beatsOf, CaStage, Fact, nthBeat, play, RecordedNote, RunAll, StepThrough, type CaView } from './kit';

const MODULE = 'coding-agents',
  ID = '02-finding-the-file';
export const PARTS = DESK_PARTS;
export const runOf = (search: boolean) => play({ case: 'bulk', search });
const SLOW = runOf(false),
  FAST = runOf(true);
/** the beat the slow run first edits on, and what it read before it */
export const EDIT = nthBeat(SLOW, 'edit');
export const READ_BEFORE = beatsOf(SLOW)
  .slice(0, EDIT)
  .filter(b => b.kind === 'read');
export const SLOW_TOKENS = SLOW.tokens,
  FAST_TOKENS = FAST.tokens;

export const P1 = {
  question: 'Given a search tool, how much will the agent read for the same fix?',
  options: ['About half as much', 'About the same: it still needs the file', 'More: the search results are extra text'],
};
export const outcomeOf = () => {
  const r = FAST_TOKENS / SLOW_TOKENS;
  return r < 0.7 ? 0 : r < 1.1 ? 1 : 2;
};

export interface S {
  search: boolean;
  at: number;
  p1: number | null;
  tab: CaView;
  quiz: number | null;
}

export const QUIZ = {
  question: 'An agent must fix a misspelled word somewhere in 400 help pages. What saves it the most reading?',
  options: [
    'A search for the misspelled word',
    'A bigger context, so it can read every page',
    'Reading the pages in alphabetical order',
  ],
  correct: 0,
  explanation: 'Search returns only the matching lines, so the agent reads the few that matter.',
  why: [
    'Right: the search finds the pages holding the word, and the agent reads only those lines.',
    'A bigger context lets it read more, and it pays for every token it reads.',
    'Any order still reads every page until it finds the word.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'one-by-one',
    focus: 'step',
    visibleControls: ['step'],
    narration: 'This time the agent has no search tool. It opens files one by one, and each one enters its context.',
    act: 'Step until it edits.',
    say: { block: 'cabinet', text: 'One by one' },
    predicate: s => s.at >= EDIT,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${READ_BEFORE.length} files read: ${SLOW_TOKENS} tokens before its first edit, at about four bytes a token.`,
    act: 'Predict the cost with search.',
    say: { block: 'cabinet', text: `${SLOW_TOKENS} tokens` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'search',
    focus: 'search',
    visibleControls: ['search'],
    narration: 'Your pick is locked. A search returns only the lines that match, and which files hold them.',
    act: 'Give the agent search, then run it.',
    say: { block: 'cabinet', text: 'Lit drawers' },
    predicate: s => s.search && s.at >= beatsOf(FAST).length,
    hint: 'Tick the box, then run the ticket to the end.',
    solution: s => ({ ...s, search: true, at: beatsOf(FAST).length }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'facts', 'quiz'],
    narration: `Search cut the reading from ${SLOW_TOKENS} to ${FAST_TOKENS} tokens, for the same fix.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which tool returns only what matches?',
  },
];

export default function FindingTheFile() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ search: false, at: 0, p1: null, tab: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <CaStage
          run={runOf(state.search)}
          at={state.at}
          say={say}
          view={state.tab}
          onView={tab => sync({ ...state, tab })}
        />
      )}
      controls={{
        step: ({ state, sync }) => <StepThrough r={SLOW} at={state.at} onStep={at => sync({ ...state, at })} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        search: ({ state, sync, apply }) => (
          <>
            <label className="tc-check">
              <input
                type="checkbox"
                checked={state.search}
                onChange={e => sync({ ...state, search: e.currentTarget.checked, at: 0 })}
              />{' '}
              Give the agent a search tool
            </label>
            {state.search && (
              <RunAll r={FAST} at={state.at} onStep={at => apply({ ...state, at })} label="Run the ticket" />
            )}
          </>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        facts: () => (
          <>
            <Fact id="search-tool" />
            <RecordedNote />
          </>
        ),
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
