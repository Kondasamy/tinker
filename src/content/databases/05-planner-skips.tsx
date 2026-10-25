// Chapter 5: when the planner skips your index. With an index on date, today's orders go through it; this month's
// estimated rows pass the break-even share, so the planner scans. The reader predicts, asks, then forces the index and
// sees it read more than the scan.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { choose, execute, type Query } from '../../lib/databases/planner';
import { ROWS_PER_PAGE, TABLE_PAGES, fmt } from '../../lib/databases/table';
import { ARCHIVE_PARTS, archiveAt, levelsOf } from '../../components/scenes/archiveScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DbStage, Fact, SimNote, Sql, type View } from './kit';
import { MONTHS, SQL, TODAYS } from './requests';

const MODULE = 'databases',
  ID = '05-planner-skips';
export const PARTS = ARCHIVE_PARTS;
const SET = ['date'] as const;
export const TODAY_PLAN = choose(TODAYS, SET);
export const MONTH_PLAN = choose(MONTHS, SET);
export const TODAY_RUN = execute(TODAYS, TODAY_PLAN.how);
export const MONTH_RUN = execute(MONTHS, MONTH_PLAN.how);
export const FORCED = execute(MONTHS, 'date');
/** the share of the table past which a page per fetched row costs more than reading every page */
export const BREAK_EVEN = 1 / ROWS_PER_PAGE;
const est = (p: { estRows: number }) => fmt(Math.round(p.estRows));
const ASKS = { today: 'Today’s orders', month: 'This month’s orders' } as const;
type Ask = keyof typeof ASKS;

export const P1 = {
  question: `This month has about ${est(MONTH_PLAN)} estimated rows. Which way will the planner pick?`,
  options: [
    'The date index: an index is always faster',
    'A full scan: fetching that many rows one by one costs more',
    'Both, then it keeps whichever finished first',
  ],
};
export const outcomeOf = () => (MONTH_PLAN.how === 'scan' ? 1 : 0);

export const QUIZ = {
  question:
    'A report asks for every order not cancelled: 97% of the table. There is an index on status. What will a good planner do?',
  options: [
    'Scan the table: nearly every row is wanted anyway',
    'Use the index: that is what it was built for',
    'Use the index, then sort the rows by page',
  ],
  correct: 0,
  explanation: 'When most rows match, fetching them one by one through an index costs more than reading every page.',
  why: [
    'Right: the scan reads each page once, while the index would fetch almost every row separately.',
    'An index pays off only when it narrows the rows down, and 97% is hardly narrowing at all.',
    'Sorting still fetches nearly every row through the index first, which costs more than one pass over the pages.',
  ],
};

interface S {
  ask: Ask | null;
  forced: boolean;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'today',
    focus: 'ask',
    visibleControls: ['ask'],
    narration:
      'Before each request the planner guesses every way’s page reads from its estimated rows, then picks the cheapest.',
    act: 'Ask for today’s orders.',
    say: { block: 'index', text: 'Index chosen' },
    predicate: s => s.ask === 'today',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Today: about ${est(TODAY_PLAN)} estimated rows, ${TODAY_RUN.pages} pages through the index.`,
    act: 'Predict this month’s plan.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'month',
    focus: 'ask',
    visibleControls: ['p1', 'ask'],
    narration: 'Your pick is locked.',
    act: 'Ask for this month’s orders.',
    predicate: s => s.ask === 'month' && s.p1 !== null,
  },
  {
    id: 'force',
    focus: 'force',
    visibleControls: ['out1', 'force'],
    narration: `Every row the index finds costs its own page fetch. Past about ${Math.round(BREAK_EVEN * 100)}% of the table, the scan costs less.`,
    act: 'Force the index anyway.',
    say: { block: 'cabinet', text: 'Read in order' },
    predicate: s => s.forced,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'quiz'],
    narration: `Forced, the index read ${fmt(FORCED.pages)} pages against the scan’s ${TABLE_PAGES}. The planner was right to skip it.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many rows would the index have to fetch one by one?',
  },
];

function Plans({ q }: { q: Query }) {
  const c = choose(q, SET);
  return (
    <table className="tc-ledger">
      <caption>The planner’s guesses</caption>
      <thead>
        <tr>
          <th scope="col">Way</th>
          <th scope="col">Estimated rows</th>
          <th scope="col">Estimated pages</th>
        </tr>
      </thead>
      <tbody>
        {c.plans.map(p => (
          <tr key={p.how} data-how={p.how}>
            <th scope="row">{p.how === 'scan' ? 'Full scan' : 'Date index'}</th>
            <td>{est(p)}</td>
            <td className={p.how === c.how ? 'ok' : 'bad'}>{fmt(Math.round(p.estPages))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PlannerSkips() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ask: null, forced: false, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const idx = { name: 'date', levels: levelsOf('date', TODAYS).map(l => ({ ...l, at: -1 })) };
        const run = state.forced
            ? FORCED
            : state.ask === 'today'
              ? TODAY_RUN
              : state.ask === 'month'
                ? MONTH_RUN
                : null,
          q = state.ask === 'today' ? TODAYS : MONTHS;
        return (
          <DbStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: run
                ? { ...archiveAt(run, q), ...(run.how === 'scan' ? { index: idx } : {}) }
                : { read: [], pages: 0, rows: 0, index: idx },
              tree: run && run.how !== 'scan' ? { how: 'date', query: q, exec: run } : undefined,
              caption: !run
                ? 'An index on date.'
                : state.forced
                  ? `This month, forced through the index: ${fmt(FORCED.pages)} pages, ${fmt(FORCED.rowsRead)} fetched one by one.`
                  : `${ASKS[state.ask!]}: the planner chose ${run.how === 'scan' ? 'a full scan' : 'the date index'}, ${fmt(run.pages)} pages.`,
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
            {state.ask && <Plans q={state.ask === 'today' ? TODAYS : MONTHS} />}
            <Sql code={`${SQL.index.date}\n\n${SQL.today}\n\n${SQL.month}`} />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Plans q={MONTHS} />
            <Fact id="planner-cost" />
          </>
        ),
        force: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.forced}
            onClick={() => apply({ ...state, ask: 'month', forced: true })}
          >
            Force the date index
          </button>
        ),
        out2: () => (
          <>
            <Fact id="fetch-cost" />
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
