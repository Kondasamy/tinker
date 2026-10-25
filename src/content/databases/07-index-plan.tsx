// Chapter 7: the index plan, the workbench. The reader picks indexes for Larkspur's day of requests; every request runs
// through the planner and counts its pages, and the day's new orders count what each index adds to a write. The puzzle
// accepts every set within the write budget that reads the fewest pages (WINNERS, computed over all 32 sets).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { INDEXES, INDEX_NAME, choose, query, type IndexName } from '../../lib/databases/planner';
import { fmt } from '../../lib/databases/table';
import {
  BEST,
  BUDGET,
  BUDGET_WHY,
  INSERTS,
  READS,
  WINNERS,
  benchSet,
  readPages,
  wins,
  within,
  writePages,
} from '../../lib/databases/workbench';
import { ARCHIVE_PARTS, archiveAt } from '../../components/scenes/archiveScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DbStage, SimNote, Sql, type View } from './kit';
import { SQL } from './requests';

const MODULE = 'databases',
  ID = '07-index-plan';
export const PARTS = ARCHIVE_PARTS;
const ways = (n: number) => (n === 1 ? 'the one set that works' : `one of ${n} sets that work`);

export const QUIZ = {
  question:
    'A blog’s posts table gets ten new posts a day and a million reads by each post’s address. What does its workload say?',
  options: [
    'Index the address: the reads dwarf the writes',
    'No index: every index slows the writes',
    'Index every column, to be safe',
  ],
  correct: 0,
  explanation: 'An index earns its write cost when the reads it serves outweigh it.',
  why: [
    'Right: a million lookups a day save far more than ten slightly slower inserts cost.',
    'Ten inserts a day barely notice an index, while a million scans would read the whole table each time.',
    'Every index is filed on every write, and indexes no request uses are cost with no saving.',
  ],
};

interface S {
  set: IndexName[];
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `The workload is the day’s requests and ${fmt(INSERTS)} new orders. The write budget: ${fmt(BUDGET)} pages a day for writes.`,
    act: 'Pick the best indexes.',
    say: { block: 'index', text: 'Your indexes' },
    predicate: s => wins(benchSet(s.set)),
    hint: 'Start with the busiest request. Then look for one index that serves two requests.',
    solution: s => ({ ...s, set: [...WINNERS[0]] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${fmt(BEST)} pages a day is the fewest within budget; yours is ${ways(WINNERS.length)}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Do a million reads or ten writes cost more?',
  },
];

function Score({ s }: { s: S }) {
  const set = benchSet(s.set),
    best = wins(set),
    ok = within(set),
    reads = readPages(set);
  return (
    <div role="status" data-reads={reads} data-best={best ? '1' : '0'}>
      <p className="db-headline">
        <strong>{fmt(reads)}</strong>
        {' pages read a day '}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? `BEST IS ${fmt(BEST)}` : 'OVER BUDGET'}
        </span>
      </p>
      {best && <p className="tc-status">{`This is ${ways(WINNERS.length)}.`}</p>}
    </div>
  );
}

function Bench({ s, set: put }: { s: S; set: (s: S) => void }) {
  const set = benchSet(s.set),
    w = writePages(set);
  return (
    <div className="tc-bench">
      <div className="db-row-btns" role="group" aria-label="Indexes on the orders table">
        {INDEXES.map(i => {
          const on = set.includes(i);
          return (
            <button
              key={i}
              type="button"
              className="chip"
              aria-pressed={on}
              onClick={() => put({ ...s, set: on ? set.filter(x => x !== i) : [...set, i] })}
            >
              {`Index on ${INDEX_NAME[i]}`}
            </button>
          );
        })}
      </div>
      <table className="tc-ledger">
        <caption>The day’s requests</caption>
        <thead>
          <tr>
            <th scope="col">Request</th>
            <th scope="col">A day</th>
            <th scope="col">Way</th>
            <th scope="col">Pages a day</th>
          </tr>
        </thead>
        <tbody>
          {READS.map(r => {
            const how = choose(r.query, set).how;
            return (
              <tr key={r.id} data-read={r.id}>
                <th scope="row">{r.name}</th>
                <td>{fmt(r.perDay)}</td>
                <td>{how === 'scan' ? 'Full scan' : INDEX_NAME[how]}</td>
                <td>{fmt(r.perDay * query(r.query, set).pages)}</td>
              </tr>
            );
          })}
          <tr data-read="writes">
            <th scope="row">New orders</th>
            <td>{fmt(INSERTS)}</td>
            <td>Writes</td>
            <td className={w <= BUDGET ? 'ok' : 'bad'}>{`${fmt(w)} of ${fmt(BUDGET)}`}</td>
          </tr>
        </tbody>
      </table>
      <p className="note db-note">{BUDGET_WHY}</p>
      <Sql code={set.length ? set.map(i => SQL.index[i]).join('\n') : '-- no indexes'} />
      <SimNote />
    </div>
  );
}

export default function IndexPlan() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ set: [], view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const set = benchSet(state.set);
        // the picture shows the request that costs the day the most under this set
        const top = READS.reduce((a, r) =>
            r.perDay * query(r.query, set).pages > a.perDay * query(a.query, set).pages ? r : a,
          ),
          run = query(top.query, set);
        return (
          <DbStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: archiveAt(run, top.query, { others: Math.max(0, set.length - (run.how === 'scan' ? 0 : 1)) }),
              tree: run.how === 'scan' ? undefined : { how: run.how, query: top.query, exec: run },
              caption: `Costliest request: ${top.name.toLowerCase()}, ${fmt(run.pages)} pages each, ${fmt(top.perDay)} a day.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the set is an attempt only while it is the puzzle
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
