// Chapter 4: quorums. N = 3 copies; the reader predicts whether R = W = 2 can miss the latest sale, sets R + W > N and
// watches the stale reads go to zero, then cuts the line and counts what a quorum refuses on the cut-off side.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { N, PARTITIONS, clock, policyOf, runOf } from '../../lib/consistency/sim';
import { STOCK_PARTS, stockAt } from '../../components/scenes/stockScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ConsistencyStage, Fact, Quorum, SimNote } from './kit';

const MODULE = 'consistency',
  ID = '04-quorums';
export const PARTS = STOCK_PARTS;
export const runWith = (r: number, w: number, cut: boolean) =>
  runOf(policyOf({ r, w, rule: 'lww' }, { partition: cut }));
export const LOOSE = runWith(1, 1, false);
export const QUORUM = runWith(2, 2, false);
export const QUORUM_CUT = runWith(2, 2, true);
const OUT = PARTITIONS[0];
const refusedOf = (r: ReturnType<typeof runOf>) => r.refused.hinge + r.refused.drill;

export const P1 = {
  question: `With R = 2 and W = 2 out of N = ${N}, can a read miss the latest sale?`,
  options: [
    'No: any two readers and any two writers share a warehouse',
    'Yes: R and W only make reads slower',
    'Only at West, the farthest warehouse',
  ],
};
export const outcomeOf = () => (QUORUM.stale === 0 ? 0 : 1);

export const QUIZ = {
  question:
    'A team keeps each user profile on 5 servers (N = 5), and every read asks 2 of them. How many must each write reach so a read never misses it?',
  options: ['4: R + W must be more than N', '3: a majority is always enough', '5: every write must reach all'],
  correct: 0,
  explanation: 'A read of 2 and a write of 4 out of 5 always share a server, so the read sees the write.',
  why: [
    'Right: 2 + 4 is more than 5, so every read set overlaps every write set.',
    '2 + 3 is only 5, so a read of 2 can land on the 2 servers the write skipped.',
    'Writing to all 5 works, but 4 already overlaps every read of 2, and refuses less when a server is down.',
  ],
};

interface S {
  r: number;
  w: number;
  cut: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'nrw',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Each count has N = ${N} replicas. A read asks R of them; a write reaches W before its receipt.`,
    act: 'Predict.',
    say: { block: 'north', text: 'One of N' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'set',
    focus: 'rw',
    visibleControls: ['p1', 'rw', 'tally'],
    narration: 'Your pick is locked. Watch the stale reads in the table.',
    act: 'Set R and W to 2 each.',
    predicate: s => s.p1 !== null && s.r === 2 && s.w === 2,
    hint: 'Move both sliders to 2.',
    solution: s => ({ ...s, r: 2, w: 2 }),
  },
  {
    id: 'cut',
    focus: 'cut',
    visibleControls: ['out1', 'tally', 'cut'],
    narration:
      'No stale reads: R + W > N, so every read shares a warehouse with every write. That overlap is a quorum.',
    act: 'Cut the line.',
    predicate: s => s.cut,
  },
  {
    id: 'cost',
    focus: 'quiz',
    visibleControls: ['tally', 'quiz'],
    narration: `With the line down, West reaches only itself, short of a quorum: ${refusedOf(QUORUM_CUT)} orders refused.`,
    act: 'One question to finish.',
    say: { block: 'west', text: 'Refuses' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Add R and W, and compare with N.',
  },
];

function Tally({ s }: { s: S }) {
  const r = runWith(s.r, s.w, s.cut);
  return (
    <table className="tc-ledger" data-stale={r.stale}>
      <caption>{`R ${s.r}, W ${s.w}${s.cut ? ', line down' : ''}: Larkspur’s morning, simulated`}</caption>
      <thead>
        <tr>
          <th scope="col">Stale reads</th>
          <th scope="col">Oversold</th>
          <th scope="col">Refused</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={r.stale ? 'bad' : 'ok'}>{r.stale}</td>
          <td>{r.oversold.hinge + r.oversold.drill}</td>
          <td>{refusedOf(r)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function Quorums() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ r: 1, w: 1, cut: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = runWith(state.r, state.w, state.cut),
          // the moment that shows the setting best: the stale look, or the first order West takes in the outage
          t = state.cut ? OUT.from + 2 : 2;
        return (
          <ConsistencyStage
            say={say}
            show={{
              scene: stockAt(r, t),
              result: r,
              tick: t,
              caption: `${clock(t)}. R ${state.r}, W ${state.w}: today ${r.stale} stale reads, ${refusedOf(r)} refused.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        rw: ({ state, apply, sync, focused }) => {
          // a slider move is an attempt only while it is the step's task
          const set = focused ? apply : sync;
          return (
            <>
              <Quorum id="cs-r4" name="R, replicas a read asks" value={state.r} onChange={r => set({ ...state, r })} />
              <Quorum
                id="cs-w4"
                name="W, replicas a write reaches"
                value={state.w}
                onChange={w => set({ ...state, w })}
              />
            </>
          );
        },
        tally: ({ state }) => <Tally s={state} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="dynamo-quorum" />
          </>
        ),
        cut: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, cut: true })}>
            Cut the line
          </button>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="dynamo-322" />
            <Fact id="dynamo-w" />
            <SimNote />
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
