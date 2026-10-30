// Chapter 6: a chip fails. A month of Fernhill's training plays against a fixed-random failure stream at Llama 3's published
// rate (failures.ts, simulated); the reader predicts the best checkpoint interval, then tries saving often, rarely and
// at the searched best (pinned): saving often spends the time writing, saving rarely loses it to failures.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RING_PARTS } from '../../components/scenes/ringScene';
import {
  bestInterval,
  failuresOf,
  mtbfOf,
  RESTART,
  runWith,
  SAVE,
  youngOf,
} from '../../lib/parallel-training/failures';
import { CHIPS } from '../../lib/parallel-training/workbench';
import { SEED } from '../../lib/parallel-training/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, Maths, Radios, RingStage, SimNote, sceneOf } from './kit';

const MODULE = 'parallel-training',
  ID = '06-checkpoints';
export const PARTS = RING_PARTS;
const MONTH = 30 * 24 * 60;
export const MTBF = mtbfOf(CHIPS);
/** the searched best, on a 10-minute grid */
export const BEST = bestInterval(MTBF, 10);
export const INTERVALS = [30, BEST, 480];
const FAILS = failuresOf(SEED, CHIPS, 2 * MONTH);
export const RUNS = Object.fromEntries(INTERVALS.map(i => [i, runWith(FAILS, MONTH, i)]));
const [OFTEN, , RARELY] = INTERVALS;
const n = (x: number) => Math.round(x).toLocaleString('en-US');
const hours = (min: number) => `${n(min / 60)} hours`;
const days = (min: number) => `${Math.round((min / 60 / 24) * 10) / 10} days`;
const every = (i: number) => `every ${i} minutes`;
/** the worker the first failure fells, among the eight drawn */
const DOWN = FAILS[0].chip % 8;

export interface S {
  p1: number | null;
  interval: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `Writing a checkpoint takes ${SAVE} minutes. Over a month of training, which interval finishes soonest?`,
  options: INTERVALS.map(i => `Every ${i} minutes`),
};
export const OUTCOME = INTERVALS.reduce((b, i, j) => (RUNS[i].wall < RUNS[INTERVALS[b]].wall ? j : b), 0);

export const QUIZ = {
  question: 'A team runs the same job on twice as many chips. Should it save checkpoints more or less often?',
  options: [
    'More often: failures come twice as often',
    'Less often: twice the chips finish sooner',
    'The same: a save takes as long as before',
  ],
  correct: 0,
  explanation: 'Every chip can fail, so more chips mean failures sooner; a shorter interval loses less to each.',
  why: [
    'Right: the time between failures halves, so the best interval shrinks too.',
    'Finishing sooner does not stop chips failing; with more of them, failures come sooner.',
    'The save cost is the same, but lost work per failure grows against a shorter time between failures.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${n(CHIPS)} chips fail about once every ${n(MTBF / 60)} hours, at Llama 3’s rate. A failure loses the work since the last checkpoint.`,
    act: 'Predict first.',
    say: { block: 'worker', text: 'Failed' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'often',
    focus: 'interval',
    visibleControls: ['interval'],
    narration: 'Your pick is locked. The month runs against simulated failures, the same ones on every visit.',
    act: `Pick ${every(OFTEN)}.`,
    say: { block: 'rack', text: 'Saved here' },
    predicate: s => s.interval === OFTEN,
  },
  {
    id: 'rarely',
    focus: 'interval',
    visibleControls: ['interval'],
    narration: `${n(RUNS[OFTEN].saves)} saves cost ${hours(RUNS[OFTEN].saves * SAVE)} of writing. Saving rarely trades that for more lost work.`,
    act: `Pick ${every(RARELY)}.`,
    predicate: s => s.interval === RARELY,
  },
  {
    id: 'best',
    focus: 'interval',
    visibleControls: ['interval'],
    narration: `${RUNS[RARELY].hits} failures threw away ${hours(RUNS[RARELY].lost)}. The best interval sits between the two.`,
    act: `Pick ${every(BEST)}.`,
    predicate: s => s.interval === BEST,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'interval', 'sum', 'quiz'],
    narration: `${days(RUNS[BEST].wall)} for a month of work, the soonest of the three: saving and losing balance.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the time between failures grow or shrink with more chips?',
  },
];

function Run({ interval }: { interval: number }) {
  const r = RUNS[interval];
  const rows: [string, string][] = [
    ['Checkpoints written', n(r.saves)],
    ['Failures that hit the run', n(r.hits)],
    ['Work redone, plus restarts', hours(r.lost)],
    ['Wall clock for a month of work', days(r.wall)],
  ];
  return (
    <table className="tc-ledger">
      <caption>{`Saving ${every(interval)}, simulated`}</caption>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td className={k.startsWith('Wall') ? (interval === BEST ? 'ok' : 'bad') : undefined}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Checkpoints() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, interval: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <RingStage
          say={say}
          scene={{
            ...sceneOf({ mode: 'ring', n: 8, k: 0, m: 4 }),
            down: DOWN,
            rack: state.interval ? `Saves ${every(state.interval)}` : 'No saves yet',
          }}
          caption={
            state.interval
              ? `Saving ${every(state.interval)}: ${days(RUNS[state.interval].wall)} for a month of work, simulated.`
              : `Chip ${DOWN + 1} has failed. The run restarts from its last checkpoint.`
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        interval: ({ state, apply, sync, focused }) => (
          <>
            <Radios
              legend="Save"
              options={INTERVALS}
              value={state.interval}
              words={every}
              onChange={interval => (focused ? apply : sync)({ ...state, interval })}
            />
            {state.interval && <Run interval={state.interval} />}
            <SimNote />
          </>
        ),
        sum: () => (
          <>
            <Fact id="llama3-interruptions" />
            <Maths>
              <p>
                {`Waste per minute = δ/τ + (τ/2 + R)/M, for a save of δ = ${SAVE} minutes, restart R = ${RESTART}, mean time between failures M = ${n(MTBF)} minutes. Young’s √(2δM) gives ${n(youngOf(MTBF))}; the search on a 10-minute grid gives ${BEST}.`}
              </p>
            </Maths>
            <Fact id="young" />
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
