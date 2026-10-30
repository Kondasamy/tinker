// Chapter 6: joining tables. Today's orders, each with its customer: a nested loop that scans the customers table once
// per order, then (after the reader predicts) one that walks the customers index instead.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { customerIndex, join } from '../../lib/databases/planner';
import { CUSTOMER_PAGES, fmt, pageOf } from '../../lib/databases/table';
import { ARCHIVE_PARTS, IDLE, archiveAt } from '../../components/scenes/archiveScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DbStage, Fact, SimNote, Sql, type View } from './kit';
import { SQL, TODAYS } from './requests';

const MODULE = 'databases',
  ID = '06-joining-tables';
export const PARTS = ARCHIVE_PARTS;
const SET = ['date'] as const;
export const SLOW = join(TODAYS, SET, false);
export const FAST = join(TODAYS, SET, true);
/** page reads per order through the customers index: its height, then the customer's page */
export const PER_ROW = customerIndex().height() + 1;

export const P1 = {
  question: 'Add an index on customer number to the customers table. What happens to the reads?',
  options: [
    `Fewer: each order walks a small tree instead of all ${CUSTOMER_PAGES} pages`,
    'The same: the join still visits every order',
    'More: two tables now means two indexes to read',
  ],
};
export const outcomeOf = () => (FAST.innerPages < SLOW.innerPages ? 0 : 1);

export const QUIZ = {
  question:
    'A billing run joins 5,000 invoices to a products table by product id, and products has no index. What helps most?',
  options: [
    'An index on the products table’s id, the column the join looks up',
    'An index on the invoice date',
    'More invoices per run, so the join runs less often',
  ],
  correct: 0,
  explanation:
    'In a nested loop the lookup into the second table runs once per row of the first, so that lookup is the one to index.',
  why: [
    'Right: each of the 5,000 invoices looks up its product, and an index turns each scan into a short walk.',
    'The date picks which invoices run, but each one still scans the whole products table for its product.',
    'Batching changes nothing per invoice: each still scans the products table to find its match.',
  ],
};

interface S {
  ran: boolean;
  idx: boolean;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'join',
    focus: 'run',
    visibleControls: ['run'],
    narration:
      'A join pairs rows from two tables. In a nested loop, for each of today’s orders the database finds its customer.',
    act: 'Run the join.',
    say: { block: 'customers', text: 'Read per order' },
    predicate: s => s.ran,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `With no index, each of ${SLOW.outerRows} orders scanned all ${CUSTOMER_PAGES} customer pages: ${fmt(SLOW.innerPages)} reads.`,
    act: 'Predict with an index.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'index',
    focus: 'idx',
    visibleControls: ['p1', 'idx'],
    narration: 'Your pick is locked.',
    act: 'Add the customers index.',
    predicate: s => s.idx && s.p1 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `Each order now costs ${PER_ROW} page reads, not ${CUSTOMER_PAGES}: ${fmt(FAST.innerPages)} in all, against ${fmt(SLOW.innerPages)}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which lookup runs once for every order?',
  },
];

export default function JoiningTables() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, idx: false, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const j = state.idx ? FAST : SLOW;
        return (
          <DbStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: state.ran
                ? archiveAt(j.outer, TODAYS, {
                    customers: {
                      pages: j.innerPages,
                      lit: state.idx ? new Set(j.outer.rows.map(r => pageOf(r.customer - 1))).size : CUSTOMER_PAGES,
                    },
                  })
                : IDLE,
              tree: state.ran ? { how: 'date', query: TODAYS, exec: j.outer } : undefined,
              caption: state.ran
                ? `Today’s ${j.outerRows} orders with their customers: ${fmt(j.innerPages)} customer page reads${state.idx ? ', through its index' : ', scanning each time'}.`
                : 'Orders and customers live in two tables.',
            }}
          />
        );
      }}
      controls={{
        run: ({ state, apply }) => (
          <>
            <button type="button" className="chip" onClick={() => apply({ ...state, ran: true })}>
              Run the join
            </button>
            <Sql code={SQL.join} />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        idx: ({ state, apply }) => (
          <>
            <button
              type="button"
              className="chip"
              aria-pressed={state.idx}
              onClick={() => apply({ ...state, ran: true, idx: !state.idx })}
            >
              Index on customer number
            </button>
            <Sql code="CREATE INDEX ON customers (id);" />
          </>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="nested-loop" />
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
