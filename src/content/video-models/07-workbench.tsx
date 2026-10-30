// Chapter 7: the workbench (KTD11). The reader picks context frames (1 or 2) and a re-sync interval for Larkspur's test
// routes; each plan's pinned result (frames right, real frames, model passes and compute) shows beside the first
// route's dream, run live. The puzzle accepts every plan in WINNERS (pinned, recomputed in a test).
import { useMemo, useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DREAM_PARTS } from '../../components/scenes/dreamFloorScene';
import { dream, type ModelId } from '../../lib/video-models/rollout';
import { rollout } from '../../lib/video-models/world';
import {
  BENCH,
  EVERY,
  MODELS,
  START,
  WINNERS,
  passes,
  resultOf,
  share,
  wins,
  type Plan,
} from '../../lib/video-models/workbench';
import { multiplies, units } from '../../lib/video-models/compute';
import { DreamStage, Fact, META, ModelStatus, StepRange, ToyNote, n, pct, useNets } from './kit';

const MODULE = 'video-models',
  ID = '07-workbench';
export const PARTS = DREAM_PARTS;
const ROUTE1 = rollout(BENCH.firstSeed, BENCH.steps);
const BEST = resultOf(WINNERS[0]);
const frames = (m: ModelId) => `${m === 'k1' ? 1 : 2} frame${m === 'k1' ? '' : 's'}`;
const everyWords = (e: number) => (e ? `every ${e} steps` : 'never');
const compute = (p: Plan) => units(resultOf(p).passes * multiplies(META.models[p.model]));
/** The plan the quiz holds up: the most real frames that still clears the bar. */
export const OFTEN = { model: 'k2', every: Math.min(...EVERY.filter(e => e > 0)) } as Plan;
const TIMES = resultOf(OFTEN).real / BEST.real;
const timesWords = TIMES === 2 ? 'twice' : `${TIMES} times`;

export const QUIZ = {
  question: `Re-syncing every ${OFTEN.every} steps clears the bar too. Why is it not the best plan here?`,
  options: [
    `It needs ${timesWords} the real frames`,
    'It runs the model more times',
    'It drifts more between re-syncs',
  ],
  correct: 0,
  explanation: 'Real frames are the cost Larkspur set out to save; more runs of the model are cheap beside them.',
  why: [
    `Right: it takes ${resultOf(OFTEN).real} real frames to the best plan’s ${BEST.real}.`,
    'It runs the model fewer times, since real frames replace guesses; the cost that grows is real frames.',
    'Shorter gaps leave less room for drift, not more.',
  ],
};

interface S extends Plan {
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `Workbench bar: ${pct(BENCH.bar)} of frames right. Each real frame means running the real floor.`,
    act: 'Clear the bar with the fewest real frames.',
    say: { block: 'dream', text: 'Stay right' },
    predicate: s => wins(s),
    hint: 'One frame never learns the crate’s way. With two, try re-syncing less often until it fails.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'fact', 'quiz'],
    narration: `${pct(share(BEST))} of frames right with ${BEST.real} real frames: no plan here clears the bar with fewer.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which costs Larkspur more: one run of the model or a frame from the real floor?',
  },
];

function Score({ s }: { s: S }) {
  const r = resultOf(s),
    best = wins(s),
    ok = passes(r);
  return (
    <div role="status" data-best={best ? '1' : '0'} data-ok={ok ? '1' : '0'}>
      <p className="vm-headline">
        <strong>{pct(share(r))}</strong>
        {` of frames right, ${r.real} real frames `}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? 'TOO MANY REAL FRAMES' : 'UNDER THE BAR'}
        </span>
      </p>
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const r = resultOf(s);
  const rows: [string, string, boolean | null][] = [
    [`Frames right (bar ${pct(BENCH.bar)})`, `${r.right} of ${r.frames} (${pct(share(r))})`, passes(r)],
    ['Real frames used', n(r.real), null],
    ['Model guesses', n(r.passes), null],
    ['Compute (million multiplications)', n(compute(s)), null],
  ];
  return (
    <div className="tc-bench">
      <section className="vm-bench" aria-label="Simulator plan">
        <fieldset>
          <legend>Context</legend>
          {MODELS.map(m => (
            <label key={m}>
              <input type="radio" name="vm-model" checked={s.model === m} onChange={() => set({ ...s, model: m })} />
              {frames(m)}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Re-sync</legend>
          {EVERY.map(e => (
            <label key={e}>
              <input type="radio" name="vm-every" checked={s.every === e} onChange={() => set({ ...s, every: e })} />
              {everyWords(e)}
            </label>
          ))}
        </fieldset>
      </section>
      <table className="tc-ledger vm-table">
        <caption>{`${frames(s.model)} of context, re-sync ${everyWords(s.every)}, over ${BENCH.routes} routes`}</caption>
        <tbody>
          {rows.map(([name, v, ok]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td className={ok === null ? undefined : ok ? 'ok' : 'bad'}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note vm-note">{`The bar is Larkspur’s planning number: ${BENCH.barWords}.`}</p>
      <ToyNote />
    </div>
  );
}

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  const { nets, status, retry } = useNets();
  const [at, setAt] = useState(BENCH.steps - 1);
  const d = useMemo(
    () => (nets ? dream(nets[s.model], ROUTE1, { every: s.every, key: 'bench' }) : null),
    [nets, s.model, s.every],
  );
  return (
    <DreamStage
      say={say}
      real={ROUTE1.frames[at]}
      dream={d?.frames[at] ?? null}
      step={at}
      synced={!!d?.synced[at] && at > 1}
      caption={`Route 1 of ${BENCH.routes}, step ${at}: ${frames(s.model)} of context, re-sync ${everyWords(s.every)}.`}
    >
      <ModelStatus status={status} retry={retry} />
      <StepRange first={2} last={BENCH.steps} value={at} onChange={setAt} />
    </DreamStage>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} />,
        fact: () => (
          <>
            <p className="note">{`A re-sync every ${BEST.every} steps makes each dream a short run started from a real frame.`}</p>
            <Fact id="short-rollouts" />
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
