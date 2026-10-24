// Chapter 1: find one order. No index: the reader asks for order 1042 and every drawer opens (a full scan), predicts a
// million rows, then grows the table by formula: the scan grows with the table.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { execute } from '../../lib/databases/planner';
import { ASSUMPTIONS, ORDERS, TABLE_PAGES, fmt, scaleTo } from '../../lib/databases/table';
import { ARCHIVE_PARTS, IDLE, archiveAt } from '../../components/scenes/archiveScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DbStage, SimNote, Sql } from './kit';
import { ONE, SQL } from './requests';

const MODULE = 'databases',
  ID = '01-find-one-order';
export const PARTS = ARCHIVE_PARTS;
export const SCAN = execute(ONE, 'scan');
export const MILLION = scaleTo(ASSUMPTIONS.scaleRows);
const K = ASSUMPTIONS.scaleRows / ORDERS.length;

export const P1 = {
  question: `Finding order 1042 read ${TABLE_PAGES} pages. With ${fmt(ASSUMPTIONS.scaleRows)} orders, how many?`,
  options: [
    'About the same: it is still one order',
    `About ${fmt(MILLION.scan)}: a scan reads every page`,
    'Fewer: the database stops once it finds the order',
  ],
};
export const outcomeOf = () => (MILLION.scan > TABLE_PAGES * 10 ? 1 : 0);

export const QUIZ = {
  question:
    'A library has no catalogue. A visitor wants the one book numbered 52,817. What must the librarian do, and why?',
  options: [
    'Check every shelf: nothing says where the book is, or that there is only one',
    'Walk straight to the right shelf: the numbers are on the spines',
    'Check the first shelf: books are kept in the order they arrived',
  ],
  correct: 0,
  explanation: 'With nothing sorted to search, finding one item means looking at all of them.',
  why: [
    'Right: without a catalogue the only safe way is to look at every book, and the work grows with the library.',
    'Numbers on spines help only once you know which shelf to walk to, and that is what a catalogue tells you.',
    'Arrival order says nothing about where book 52,817 sits, so the first shelf is a guess.',
  ],
};

interface S {
  asked: boolean;
  p1: number | null;
  scaled: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: 'A customer asks about order 1042. With no index, the database checks every row: a full scan.',
    act: 'Find order 1042.',
    say: { block: 'cabinet', text: 'Every drawer' },
    predicate: s => s.asked,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The table keeps its ${fmt(ORDERS.length)} orders on ${TABLE_PAGES} pages, ${ASSUMPTIONS.rowsPerPage} to a page.`,
    act: 'Predict a million orders.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'grow',
    focus: 'grow',
    visibleControls: ['p1', 'grow'],
    narration: 'Your pick is locked.',
    act: 'Grow the table to a million.',
    predicate: s => s.scaled && s.p1 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: 'A full scan costs as much as the table is big, however few rows you want.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Without anything sorted, where could the book be?',
  },
];

export default function FindOneOrder() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: false, p1: null, scaled: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <DbStage
          say={say}
          show={{
            scene: state.asked ? archiveAt(SCAN, ONE) : IDLE,
            caption: !state.asked
              ? 'Nothing asked yet.'
              : state.scaled
                ? `At ${fmt(ASSUMPTIONS.scaleRows)} orders the same scan would read ${fmt(MILLION.scan)} pages (computed, not stored).`
                : `Order 1042 found by opening all ${TABLE_PAGES} drawers.`,
          }}
        />
      )}
      controls={{
        ask: ({ state, apply }) => (
          <>
            <button type="button" className="chip" onClick={() => apply({ ...state, asked: true })}>
              Find order 1042
            </button>
            <Sql code={SQL.one} />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        grow: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, scaled: true })}>
            Grow to a million orders
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="tc-status">{`${fmt(MILLION.scan)} pages for one order: ${K} times the rows, ${K} times the reads.`}</p>
            <p className="note db-note">The million is computed by formula from the table’s page size, not stored.</p>
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
