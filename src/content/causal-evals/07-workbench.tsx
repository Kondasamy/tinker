// Chapter 7: workbench (R6g.7). Four hand-written failed runs share a budget of 12 replays (spend(), enforced). The
// reader picks a run, reads its steps, swaps the piece they suspect and replays (tap it, or the twin); a cause may be
// named only once its swap has flipped that run to the right tray. Scored on causes found and replays used. The
// winning answer is each run's cause, worked out by replaying every swap 20 times (WINNERS = causeOf per run,
// recomputed in tests/unit/causal-evals.test.ts); Show me names them.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Predict, { Reveal } from '../../components/quiz/Predict';
import Select from '../../components/story/Select';
import { MARBLE_PARTS } from '../../components/scenes/marbleScene';
import { BUDGET, causeOf, replay, RUNS, spend, type Change } from '../../lib/causal-evals/runs';
import { nextOf } from '../../lib/modules';
import { Fact, logOf, MarbleStage, marbleOf, StepsList, ToyNote } from './kit';

const MODULE = 'causal-evals',
  ID = '07-workbench';
/** each run's cause, by index: the only winning answer (recomputed in the unit test) */
export const WINNERS = RUNS.map(causeOf);
const KETTLE = RUNS.findIndex(r => r.id === 'refund');
const swap = (i: number | null | undefined): Change => (i == null ? null : { kind: 'swap', step: i });

interface S {
  /** the run on the bench */
  run: number;
  /** per run, every piece swapped and replayed, in order */
  tried: number[][];
  /** per run, the piece named as its cause */
  named: (number | null)[];
  used: number;
  prediction: number | null;
  revealed: boolean;
}
const EMPTY: S = {
  run: 0,
  tried: RUNS.map(() => []),
  named: RUNS.map(() => null),
  used: 0,
  prediction: null,
  revealed: false,
};

export const PREDICT = {
  question: `In “${RUNS[KETTLE].name}”, which step caused the wrong refund?`,
  options: [WINNERS[KETTLE], 6, 7].map(i => `Step ${i + 1}, ${RUNS[KETTLE].steps[i].name}`),
};
const OUTCOME = 0;

export const PARTS = MARBLE_PARTS;

const done = (s: S) => s.named.every(n => n !== null);
/** The bench: the run being worked on with its last swap; once every cause is named, the kettle run, fixed. */
export function sceneOf(s: S) {
  const r = done(s) ? KETTLE : s.run,
    t = done(s) ? [WINNERS[KETTLE]] : s.tried[r];
  return marbleOf(RUNS[r], swap(t.at(-1)), t.length ? r * 100 + t.length : 0, { lit: s.named[r] });
}
const scoreLine = (s: S) =>
  `Found ${s.named.filter(n => n !== null).length} of ${RUNS.length} causes · ${s.used} of ${BUDGET} replays used.`;

export const STEPS: Step<S>[] = [
  {
    id: 'replay',
    focus: 'swap',
    visibleControls: ['run', 'steps'],
    narration: `${RUNS.length} hand-written failed runs share ${BUDGET} replays. Read a run’s steps, then swap the piece you suspect.`,
    act: 'Swap a piece and replay.',
    say: { block: 'frame', text: `${BUDGET} replays` },
    status: 'One replay spent: the marble shows where that swapped run landed.',
    predicate: s => s.used > 0,
    hint: 'Choose a piece under the picture, then press Swap and replay.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['run', 'steps', 'score', 'predict'],
    narration: `“${RUNS[KETTLE].name}” refunded someone else’s order.`,
    act: 'Predict that run’s cause.',
    status: 'Your replays so far wait in the Replays tab.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'solve',
    focus: 'swap',
    visibleControls: ['predict', 'run', 'steps', 'score'],
    narration: 'Pick locked. Name a cause once its swap has flipped the run into the right tray.',
    act: `Find and name all ${RUNS.length} causes.`,
    status: `All ${RUNS.length} causes named: ${RUNS.map((r, i) => r.steps[WINNERS[i]].name).join(', ')}.`,
    predicate: done,
    hint: 'Read each run’s steps for the first one that got something wrong, then swap that piece.',
    solution: s => ({
      ...s,
      tried: RUNS.map((_, i) => [...s.tried[i], WINNERS[i]]),
      named: [...WINNERS],
      used: Math.min(BUDGET, s.used + RUNS.length),
    }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact', 'score'],
    narration: 'None of the four causes was the last step. Each failure showed at the end and began earlier.',
    act: 'Check your prediction.',
    closeUp: [`p${WINNERS[KETTLE] + 1}`, 'right'],
    say: { block: `p${WINNERS[KETTLE] + 1}`, text: 'The cause' },
    status: `The kettle run, fixed: piece ${WINNERS[KETTLE] + 1} blush, the marble in the right tray.`,
    predicate: s => s.revealed,
  },
];

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={EMPTY}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const r = done(state) ? KETTLE : state.run,
          run = RUNS[r];
        return (
          <MarbleStage
            key={r}
            run={run}
            scene={sceneOf(state)}
            log={state.tried[r].map(i => logOf(run, swap(i)))}
            twin={
              done(state)
                ? undefined
                : {
                    taps: 'chosen',
                    buttons: [
                      {
                        label: 'Swap and replay',
                        act: i => {
                          const sp = spend(state.used);
                          if (!sp.ok) return sp.why;
                          const tried = state.tried.map((t, k) => (k === r ? [...t, i] : t));
                          apply({ ...state, tried, used: sp.used });
                          return undefined;
                        },
                      },
                      {
                        label: 'Name as the cause',
                        act: i => {
                          if (!state.tried[r].includes(i))
                            return `Swap and replay piece ${i + 1} first: a cause needs a flip to show for it.`;
                          if (replay(run, swap(i)).outcome !== 'right')
                            return `Piece ${i + 1}’s swap didn’t flip this run, so it isn’t the cause.`;
                          apply({ ...state, named: state.named.map((n, k) => (k === r ? i : n)) });
                          return undefined;
                        },
                      },
                    ],
                  }
            }
            say={say}
            closeUp={closeUp}
          />
        );
      }}
      controls={{
        run: ({ state, sync }) => (
          <Select
            value={String(state.run)}
            onChange={e => sync({ ...state, run: Number(e.target.value) })}
            aria-label="Run on the bench"
          >
            {RUNS.map((r, i) => (
              <option key={r.id} value={String(i)}>
                {`${r.name}${state.named[i] !== null ? ' (cause named)' : ''}`}
              </option>
            ))}
          </Select>
        ),
        steps: ({ state }) => (
          <StepsList run={RUNS[state.run]} change={swap(state.tried[state.run].at(-1))} lit={state.named[state.run]} />
        ),
        score: ({ state }) => <p className="ce-score">{scoreLine(state)}</p>,
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See the four causes"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="decisive-error" />
              <Fact id="step-accuracy" />
              <ToyNote>The four runs are hand-written.</ToyNote>
            </>
          ) : null,
      }}
    />
  );
}
