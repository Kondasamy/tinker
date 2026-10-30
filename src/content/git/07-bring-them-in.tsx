// Chapter 7: bring three branches in, the workbench. For each branch the reader picks merge or rebase, and the order
// they come in; each plan runs for real on the repo. The owner's rule: never rewrite a branch others have. The puzzle
// accepts every plan tied for fewest conflicts, then the shortest history (WINNERS, pinned and recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { BRANCHES, NAME, type BranchId } from '../../lib/git/graph';
import {
  BENCH,
  BEST,
  ORDERS,
  SHARED,
  START,
  WAYS,
  WINNERS,
  benchPlan,
  runPlan,
  wins,
  type Plan,
  type Row,
  type Way,
} from '../../lib/git/workbench';
import { YARD_PARTS, yardOf } from '../../components/scenes/crateScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Commands, Fact, GitStage, RepoNote, type View } from './kit';
import Select from '../../components/story/Select';

const MODULE = 'git',
  ID = '07-bring-them-in';
export const PARTS = YARD_PARTS;
const OWNER = NAME[BRANCHES[SHARED[0]].by];
const WAY_NAME: Record<Way, string> = { merge: 'Merge', rebase: 'Rebase' };
const KIND: Record<Row['kind'], string> = { ff: 'label moved up', merge: 'merge commit', replayed: 'replayed' };
const orderName = (o: BranchId[]) => o.join(', then ');

export const QUIZ = {
  question: 'Another team has one branch everyone already has and two private ones. Which plan fits what you found?',
  options: [
    'Merge the shared one; rebase the private ones onto main',
    'Rebase all three into one straight line',
    'Merge all three, each with its own merge commit',
    'Rebase only the shared one',
  ],
  correct: 0,
  explanation: 'Leave what others have untouched, and straighten only your own work.',
  why: [
    'Right: shared commits keep their names, and private ones skip a merge commit each.',
    'Rebasing the shared branch replaces commits others built on.',
    'Safe, but every merge commit lengthens the history for nothing.',
    'That is backwards: the shared branch is the one to leave alone.',
  ],
};

interface S extends Plan {
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `${OWNER}’s sale is a shared branch: never rewrite it. Aim for no conflicts, then the shortest history.`,
    act: 'Bring all three branches in.',
    say: { block: 'tip', text: 'Main' },
    predicate: s => wins(benchPlan(s)),
    hint: 'Merge the shared sale. Which private branch saves a merge commit when rebased, and which meets the sale’s line?',
    solution: s => ({ ...s, ...benchPlan(WINNERS[0]) }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `Yours is one of ${WINNERS.length} plans that work: different orders can reach the same history.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which branch do other people already have?',
  },
];

function Score({ s }: { s: S }) {
  const r = runPlan(benchPlan(s)),
    best = wins(benchPlan(s));
  return (
    <div role="status" data-conflicts={r.conflicts} data-length={r.length} data-best={best ? '1' : '0'}>
      <p className="gt-headline">
        <strong>{r.conflicts}</strong>
        {` conflict${r.conflicts === 1 ? '' : 's'} · `}
        <strong>{r.length}</strong>
        {' commits on main '}
        <span className={`stamp ${best ? 'correct' : r.keepsRule ? 'neutral' : 'wrong'}`}>
          {best
            ? 'BEST'
            : r.keepsRule
              ? `BEST IS ${BEST.conflicts} · ${BEST.length}`
              : `REWROTE ${SHARED.join(', ').toUpperCase()}`}
        </span>
      </p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} plans that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const p = benchPlan(s),
    r = runPlan(p);
  return (
    <div className="tc-bench">
      <div className="gt-order">
        <label htmlFor="gt-order">Order</label>
        <Select
          id="gt-order"
          value={p.order.join()}
          onChange={e => set({ ...s, order: e.target.value.split(',') as BranchId[] })}
        >
          {ORDERS.map(o => (
            <option key={o.join()} value={o.join()}>
              {orderName(o)}
            </option>
          ))}
        </Select>
      </div>
      {BENCH.map(b => (
        <section key={b} className="gt-branch" aria-label={b}>
          <h3>{`${b}, by ${NAME[BRANCHES[b].by]}${SHARED.includes(b) ? ' (shared)' : ''}`}</h3>
          <div className="gt-row" role="group" aria-label={`${b}: merge or rebase`}>
            {WAYS.map(w => (
              <button
                key={w}
                type="button"
                className="chip"
                aria-pressed={p.ways[b] === w}
                onClick={() => set({ ...s, ways: { ...p.ways, [b]: w } })}
              >
                {WAY_NAME[w]}
              </button>
            ))}
          </div>
        </section>
      ))}
      <table className="tc-ledger">
        <caption>Each branch, in the order it came in</caption>
        <thead>
          <tr>
            <th scope="col">Branch</th>
            <th scope="col">What happened</th>
            <th scope="col">Conflicts</th>
            <th scope="col">Commits added</th>
          </tr>
        </thead>
        <tbody>
          {r.rows.map(row => (
            <tr key={row.branch} data-branch={row.branch} data-ok={row.rewroteShared ? 0 : 1}>
              <th scope="row">{row.branch}</th>
              <td className={row.rewroteShared ? 'bad' : ''}>
                {row.rewroteShared ? 'rewrote shared commits' : KIND[row.kind]}
              </td>
              <td className={row.conflicts ? 'bad' : 'ok'}>{row.conflicts}</td>
              <td>{row.added}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note gt-note">
        A conflict on the bench is resolved to the incoming side, a stand-in for a person choosing.
      </p>
      <RepoNote />
    </div>
  );
}

export default function BringThemIn() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...benchPlan(START), view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runPlan(benchPlan(state)),
          o = { ghosts: false as const };
        return (
          <GitStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              yard: yardOf(r.repo, o),
              repo: r.repo,
              graph: o,
              caption: `Main after ${orderName(benchPlan(state).order)}: ${r.conflicts} conflicts, ${r.length} commits.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <BenchControls s={state} set={focused ? apply : sync} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="rebase-rule" />
            <Fact id="replay-vs-merge" />
            <Commands
              lines={['git merge sale', 'git switch hinge && git rebase main', 'git switch main && git merge hinge']}
            />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
