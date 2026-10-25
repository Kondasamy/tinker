// Chapter 4: column order matters. A (customer, date) index serves "customer N's orders this month" in a few pages;
// the reader predicts "all orders this month" with the same index, asks, and the planner scans: date is its second
// column.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { choose, query } from '../../lib/databases/planner';
import { TABLE_PAGES, fmt } from '../../lib/databases/table';
import { ARCHIVE_PARTS, archiveAt, levelsOf } from '../../components/scenes/archiveScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DbStage, Fact, SimNote, Sql, type View } from './kit';
import { MINE, MONTHS, REGULAR, SQL } from './requests';

const MODULE = 'databases',
  ID = '04-column-order';
export const PARTS = ARCHIVE_PARTS;
const SET = ['customer_date'] as const;
export const MINE_RUN = query(MINE, SET);
export const MONTH_RUN = query(MONTHS, SET);
const ASKS = { mine: `Customer ${REGULAR}’s orders this month`, month: 'All orders this month' } as const;
type Ask = keyof typeof ASKS;

export const P1 = {
  question: 'Now ask for everyone’s orders this month, with the same index. What will the database do?',
  options: [
    'Use the index: the date is in it',
    'Scan the whole table: the dates are scattered under every customer',
    'Refuse the request',
  ],
};
export const outcomeOf = () => (choose(MONTHS, SET).how === 'scan' ? 1 : 0);

export const QUIZ = {
  question: 'A school indexes its pupils on (class, surname). Which request can that index serve?',
  options: ['All pupils in class 4B', 'Every pupil named Patel, in any class', 'Pupils whose surname ends in “son”'],
  correct: 0,
  explanation: 'A two-column index is sorted by its first column; the second is sorted only within each first value.',
  why: [
    'Right: class is the leading column, so all of 4B sits together in the index.',
    'Patels are spread under every class, so the index would have to read every class to find them.',
    'Surnames are sorted from their first letter, so their endings are scattered through every class.',
  ],
};

interface S {
  ask: Ask | null;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'mine',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: 'A composite index sorts by customer, then by date within each customer, like surname then first name.',
    act: `Ask for customer ${REGULAR}’s orders this month.`,
    say: { block: 'index', text: 'Customer first' },
    predicate: s => s.ask === 'mine',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `That read ${MINE_RUN.pages} pages for ${MINE_RUN.rows.length} orders.`,
    act: 'Predict all orders this month.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'month',
    focus: 'ask',
    visibleControls: ['p1', 'ask'],
    narration: 'Your pick is locked.',
    act: 'Ask for all orders this month.',
    predicate: s => s.ask === 'month' && s.p1 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration:
      'An index serves requests on its leading column, the one it is sorted by first. Date alone comes second.',
    act: 'One question to finish.',
    say: { block: 'cabinet', text: 'Every drawer' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which column are the index’s entries sorted by first?',
  },
];

export default function ColumnOrder() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ask: null, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const idle = { read: [], pages: 0, rows: 0 },
          tree = { name: 'customer, then date', levels: levelsOf('customer_date', MINE).map(l => ({ ...l, at: -1 })) };
        const scene =
          state.ask === 'mine'
            ? archiveAt(MINE_RUN, MINE)
            : state.ask === 'month'
              ? { ...archiveAt(MONTH_RUN, MONTHS), index: tree }
              : { ...idle, index: tree };
        return (
          <DbStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene,
              tree: state.ask === 'mine' ? { how: 'customer_date', query: MINE, exec: MINE_RUN } : undefined,
              caption:
                state.ask === 'mine'
                  ? `${ASKS.mine}: through the index, ${MINE_RUN.pages} pages.`
                  : state.ask === 'month'
                    ? `${ASKS.month}: the index can’t help, so a full scan of ${TABLE_PAGES} pages finds ${fmt(MONTH_RUN.rows.length)}.`
                    : 'An index on customer, then date.',
            }}
          />
        );
      }}
      controls={{
        ask: ({ state, apply }) => (
          <>
            <div className="db-row-btns" role="group" aria-label="Ask the orders table">
              {(Object.keys(ASKS) as Ask[]).map(a => (
                <button
                  key={a}
                  type="button"
                  className="chip"
                  aria-pressed={state.ask === a}
                  onClick={() => apply({ ...state, ask: a })}
                >
                  {ASKS[a]}
                </button>
              ))}
            </div>
            <Sql code={`${SQL.index.customer_date}\n\n${SQL.mine}\n\n${SQL.month}`} />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="leading-column" />
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
