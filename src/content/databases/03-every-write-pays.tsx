// Chapter 3: every write pays. The reader writes a new order with no index (one page), predicts what three indexes add,
// adds them, and sees each new order walk every tree and write its leaf, with page splits, measured over a day's inserts.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import {
  DAY_INSERTS,
  INDEX_NAME,
  indexWrites,
  writeCost,
  writeDay,
  type IndexName,
  type Query,
} from '../../lib/databases/planner';
import { TABLE_PAGES, fmt } from '../../lib/databases/table';
import { ARCHIVE_PARTS, IDLE, levelsOf } from '../../components/scenes/archiveScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DbStage, Fact, SimNote, Sql } from './kit';
import { NEW, SQL } from './requests';

const MODULE = 'databases',
  ID = '03-every-write-pays';
export const PARTS = ARCHIVE_PARTS;
export const CHOICES: IndexName[] = ['id', 'customer', 'date'];
/** the new order's key in every index */
const AT: Query = { where: { id: NEW.id, customer: NEW.customer, day: NEW.day } };
const per = (set: readonly IndexName[]) => writeCost(set).toFixed(1).replace(/\.0$/, '');

export const P1 = {
  question: 'Add indexes on order number, customer and date. What happens to each new order’s cost?',
  options: [
    'Nothing: indexes only matter when reading',
    'It grows: every index must file the new order too',
    'It drops: the indexes find free space faster',
  ],
};
export const outcomeOf = () => (writeCost(CHOICES) > writeCost([]) ? 1 : 0);

export const QUIZ = {
  question:
    'A shop’s products table has eight indexes, and adding products has become slow. Searches use only two of them. What helps most?',
  options: [
    'Drop the indexes no search uses',
    'Add a ninth index on the product name',
    'Nothing: indexes only cost something when reading',
  ],
  correct: 0,
  explanation: 'Every index is updated on every insert, so an index no read uses is pure cost.',
  why: [
    'Right: each unused index still has to file every new product, so dropping it makes every insert cheaper.',
    'A ninth index is one more tree every insert must update, so adding products gets slower still.',
    'Every insert updates every index on the table, so indexes cost on writes even if no one reads them.',
  ],
};

interface S {
  wrote: boolean;
  idx: IndexName[];
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'insert',
    focus: 'write',
    visibleControls: ['write'],
    narration: 'A new order is an insert: one row written to the table’s last page. With no index, that is all.',
    act: 'Write a new order.',
    say: { block: 'cabinet', text: 'Last drawer' },
    predicate: s => s.wrote,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Writing one order cost ${per([])} page.`,
    act: 'Predict what three indexes add.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'add',
    focus: 'idx',
    visibleControls: ['p1', 'idx'],
    narration: 'Your pick is locked.',
    act: 'Add all three indexes.',
    say: { block: 'index', text: 'Filed 3 times' },
    predicate: s => CHOICES.every(c => s.idx.includes(c)) && s.p1 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: 'Each index files every new order, walking its tree to write a leaf. A full leaf splits: a page split.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does every insert have to do for each index on the table?',
  },
];

function Table() {
  return (
    <table className="tc-ledger">
      <caption>{`Pages a day for ${fmt(DAY_INSERTS)} new orders, measured`}</caption>
      <thead>
        <tr>
          <th scope="col">Written to</th>
          <th scope="col">Pages a day</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">The table</th>
          <td>{fmt(DAY_INSERTS)}</td>
        </tr>
        {CHOICES.map(c => (
          <tr key={c} data-index={c}>
            <th scope="row">{`Index on ${INDEX_NAME[c]}`}</th>
            <td className="bad">{`+${fmt(indexWrites(c))}`}</td>
          </tr>
        ))}
        <tr>
          <th scope="row">In all</th>
          <td>{fmt(writeDay(CHOICES))}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function EveryWritePays() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ wrote: false, idx: [], p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const first = state.idx[0];
        return (
          <DbStage
            say={say}
            show={{
              scene: state.wrote
                ? {
                    read: [],
                    written: [TABLE_PAGES - 1],
                    pages: 0,
                    rows: 0,
                    index: first ? { name: INDEX_NAME[first], levels: levelsOf(first, AT), write: true } : undefined,
                    others: Math.max(0, state.idx.length - 1),
                  }
                : IDLE,
              caption: state.wrote
                ? `Each new order: ${per(state.idx)} page${per(state.idx) === '1' ? '' : 's'} on average with ${state.idx.length} index${state.idx.length === 1 ? '' : 'es'}.`
                : 'No order written yet.',
            }}
          />
        );
      }}
      controls={{
        write: ({ state, apply }) => (
          <>
            <button type="button" className="chip" onClick={() => apply({ ...state, wrote: true })}>
              Write a new order
            </button>
            <Sql code={SQL.insert} />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        idx: ({ state, apply }) => (
          <div className="db-row-btns" role="group" aria-label="Indexes on the orders table">
            {CHOICES.map(c => {
              const on = state.idx.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() =>
                    apply({ ...state, wrote: true, idx: on ? state.idx.filter(x => x !== c) : [...state.idx, c] })
                  }
                >
                  {`Index on ${INDEX_NAME[c]}`}
                </button>
              );
            })}
          </div>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Table />
            <Fact id="insert" />
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
