// Chapter 1: reading every page. No index: the reader searches "forklift" and the clerk reads every page (a scan),
// predicts a second search, and sees it read every page again: a scan's cost is the whole collection, every time.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import pinned from '../../../data/search/pinned.json' with { type: 'json' };
import { DOCS, N, PAGE_WORDS, fmt, scan } from '../../lib/search/engine';
import { CABINET_PARTS, IDLE } from '../../components/scenes/cabinetScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { SearchStage, SimNote } from './kit';

const MODULE = 'search',
  ID = '01-reading-every-page';
export const PARTS = CABINET_PARTS;
export const FIRST = pinned.scan.query;
export const SECOND = 'refund';
const found = (q: string) => scan(q).found.length;

export const P1 = {
  question: `Next, someone searches “${SECOND}”. How many pages will the scan read?`,
  options: [
    `Only the pages that say “${SECOND}”`,
    `All ${N}: a scan reads every page, every search`,
    `Fewer: it remembers what it read for “${FIRST}”`,
  ],
};
export const OUTCOME = 1;

export const QUIZ = {
  question:
    'A shop keeps its order emails in one long folder with no search index. Finding every email about hinges means what?',
  options: [
    'Opening every email, and twice the emails means twice the work',
    'Opening only the emails about hinges',
    'Opening the newest emails, then stopping',
  ],
  correct: 0,
  explanation: 'With nothing filed by word, the only way to find a word is to read everything.',
  why: [
    'Right: nothing says which emails mention hinges, so each one must be read, and the work grows with the folder.',
    'Knowing which emails are about hinges is the very thing a scan has to find out by reading them.',
    'Stopping early would miss older emails about hinges, since nothing says where they are.',
  ],
};

interface S {
  first: boolean;
  p1: number | null;
  second: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'search',
    focus: 'first',
    visibleControls: ['first'],
    narration: `Larkspur’s ${DOCS} documents are cut into ${N} pages of ${PAGE_WORDS} words. With no index, a scan reads them one by one.`,
    act: `Search for “${FIRST}”.`,
    say: { block: 'pages', text: 'Every page' },
    predicate: s => s.first,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The scan read all ${N} pages and found “${FIRST}” on ${found(FIRST)}.`,
    act: 'Predict the next search.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'again',
    focus: 'second',
    visibleControls: ['p1', 'second'],
    narration: 'Your pick is locked.',
    act: `Search for “${SECOND}”.`,
    predicate: s => s.second && s.p1 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `Each search read all ${N} pages, whatever it found. Twice the pages means twice the reading.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Without anything filed by word, where could “hinges” be?',
  },
];

export default function ReadingEveryPage() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ first: false, p1: null, second: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const q = state.second ? SECOND : state.first ? FIRST : undefined;
        return (
          <SearchStage
            say={say}
            show={{
              scene: q ? { ...IDLE, query: q, read: N, found: found(q) } : { ...IDLE, words: 0 },
              caption: q
                ? `The clerk read all ${N} pages: “${q}” is on ${found(q)}.`
                : 'No index yet: a clerk and a stack of pages.',
            }}
          />
        );
      }}
      controls={{
        first: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, first: true })}>
            {`Search for “${FIRST}”`}
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        second: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, second: true })}>
            {`Search for “${SECOND}”`}
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <p className="tc-status">{`“${FIRST}”: ${fmt(N)} pages read. “${SECOND}”: ${fmt(N)} pages read.`}</p>
            <SimNote />
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
