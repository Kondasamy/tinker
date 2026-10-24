// Chapter 3: batching. Monday's trace runs on the simulated server with static batching, then continuous; the reader
// predicts what letting requests join at every pass does to the last finish, and the answer is read off the two runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { DEFAULT, MEMORY, OPEN, REQUESTS, serve, type Mode } from '../../lib/inference/server';
import { SERVE_PARTS, floorAt } from '../../components/scenes/serveScene';
import { ms } from '../../components/scenes/serverTimeline';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CostModelNote, Fact, InferenceStage, type View } from './kit';

const MODULE = 'inference',
  ID = '03-batching';
export const CAP = DEFAULT.cap,
  ROOM = MEMORY.at(-1)!;
export const RUNS: Record<Mode, ReturnType<typeof serve>> = {
  static: serve(OPEN, { mode: 'static', cap: CAP, kvRoomGB: ROOM }),
  continuous: serve(OPEN, { mode: 'continuous', cap: CAP, kvRoomGB: ROOM }),
};
/** the parts the serving floor can call out */
export const PARTS = SERVE_PARTS;
const tput = (m: Mode) => `${Math.round(RUNS[m].throughput)} tokens/s`;

export const P1 = {
  question:
    'Continuous batching lets a waiting request join the batch after any pass, instead of waiting for the whole batch to end. What happens to when the last of Monday’s replies finishes?',
  options: [
    'About the same: the server does the same work either way',
    'Much sooner: no seat sits empty while requests wait',
    'Later: switching requests in and out costs time',
  ],
};
export function outcomeOf(): number {
  const r = RUNS.continuous.makespan / RUNS.static.makespan;
  return r < 0.85 ? 1 : r <= 1.05 ? 0 : 2;
}

export const QUIZ = {
  question:
    'A bakery’s order bot uses static batching. Most replies are one line; a few are long recipes. What do customers with one-line replies notice most?',
  options: [
    'Nothing: their replies are short, so they are done quickly',
    'They wait in the queue while a batch finishes someone else’s long recipe, even though seats sit idle',
    'Their replies come out garbled, mixed with the recipes',
    'They pay more, because they share a batch',
  ],
  correct: 1,
  explanation:
    'In static batching a batch holds its seats until its longest reply ends, so short requests behind it wait. Continuous batching fills a seat the pass after it frees.',
  why: [
    'Their own reply is short, but they can’t start until the batch ahead of them ends, and it ends with the longest recipe.',
    'Right: the batch ends with its longest reply, and the queue waits for it while finished seats sit idle.',
    'Each request in a batch keeps its own tokens and cache: batching shares the passes, not the text.',
    'Batching is the server’s choice, invisible in the price per token; it changes waits, not what a reply costs a customer.',
  ],
};

interface S {
  mode: Mode;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'static',
    focus: 'tab',
    visibleControls: ['tab', 'compare'],
    narration: `Monday’s rush: ${REQUESTS.length} requests, up to ${CAP} at a time. Static batching runs each batch until its last reply ends.`,
    act: 'Open the Timeline tab.',
    say: { block: 'queue', text: 'Waits for batch' },
    predicate: s => s.view === 'timeline',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['compare', 'p1'],
    narration:
      'Each lane is a request: dashed while waiting, mustard while read, mint while written. Long dashes wait on a batch.',
    act: 'Predict the last finish.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'mode',
    visibleControls: ['p1', 'mode'],
    narration: 'Your pick is locked.',
    act: 'Switch to continuous batching.',
    predicate: s => s.mode === 'continuous',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'compare', 'quiz'],
    narration: 'A freed seat now fills on the next pass, so waits shrink and throughput rises from the same passes.',
    act: 'One question to finish.',
    say: { block: 'server', text: 'Seats refilled' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'When does a static batch let the next request in?',
  },
];

function Compare({ mode }: { mode: Mode }) {
  const row = (m: Mode) => (
    <tr key={m} data-mode={m} data-on={m === mode || undefined}>
      <th scope="row">{m === 'static' ? 'Static' : 'Continuous'}</th>
      <td>{ms(RUNS[m].makespan)}</td>
      <td>{ms(RUNS[m].worstTtft)}</td>
      <td>{tput(m)}</td>
    </tr>
  );
  return (
    <table className="tc-ledger">
      <caption>{`Monday’s rush, batch cap ${CAP}, simulated`}</caption>
      <thead>
        <tr>
          <th scope="col">Batching</th>
          <th scope="col">Last reply done</th>
          <th scope="col">Longest wait for a first token</th>
          <th scope="col">Throughput</th>
        </tr>
      </thead>
      <tbody>
        {row('static')}
        {mode === 'continuous' && row('continuous')}
      </tbody>
    </table>
  );
}

export default function Batching() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ mode: 'static', view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <InferenceStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={() => ({
            scene: floorAt(RUNS[state.mode]),
            result: RUNS[state.mode],
            caption: `${state.mode === 'static' ? 'Static' : 'Continuous'} batching, the busiest pass of Monday’s rush. The last reply is done at ${ms(RUNS[state.mode].makespan)}.`,
          })}
        />
      )}
      controls={{
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'timeline' })}>
            Open the Timeline tab
          </button>
        ),
        compare: ({ state }) => (
          <>
            <Compare mode={state.mode} />
            <CostModelNote />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        mode: ({ state, apply }) => (
          <div className="in-row" role="group" aria-label="Batching">
            {(['static', 'continuous'] as const).map(m => (
              <button
                key={m}
                type="button"
                className="chip"
                aria-pressed={state.mode === m}
                onClick={() => apply({ ...state, mode: m, view: 'timeline' })}
              >
                {m === 'static' ? 'Static batching' : 'Continuous batching'}
              </button>
            ))}
          </div>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="batching-amortizes" />
            <Fact id="orca" />
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
