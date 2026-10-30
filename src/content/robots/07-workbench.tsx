// Chapter 7: the workbench (KTD9). The reader picks how many of Mira's demos, how many correction rounds (DAgger with
// the careful driver as expert, over the training bins) and what practice in the simulator; the policy is scored on
// the 20 held-out bins under the real bay's simulated slips and light. Most bins cleared wins, then the fewest labels.
// The puzzle accepts every setup in WINNERS (pinned, recomputed in a test); the score reads the pinned results; the
// picture replays the first real bin.
import { useMemo, useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Say, Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CLAW_PARTS } from '../../components/scenes/clawScene';
import { replay } from '../../lib/robots/policy';
import { PERSON } from '../../lib/robots/story';
import { BINS, REAL } from '../../lib/robots/world';
import {
  DEMOS,
  policyOf,
  PRACTICES,
  type PracticeKind,
  RESULTS,
  ROUNDS,
  resultOf,
  type Setup,
  START,
  WINNERS,
  wins,
} from '../../lib/robots/workbench';
import { Radios, ReplayStage, SimNote, type View } from './kit';

const MODULE = 'robots',
  ID = '07-workbench';
export const PARTS = CLAW_PARTS;
const N = REAL.length;
const WIN = resultOf(WINNERS[0]);
const WORDS: Record<PracticeKind, string> = {
  none: 'None',
  plain: 'Plain',
  light: 'Light varied',
  slip: 'Slips varied',
  both: 'Both varied',
};
/** the cheapest setup that clears as many without practice: what free practice saves */
const NO_PRACTICE_BEST = Math.max(...RESULTS.filter(r => r.practice === 'none').map(r => r.solved));

export const QUIZ = {
  question: `The bench clears ${WIN.solved} of ${N} simulated bins. What comes before the arm goes into every bay?`,
  options: [
    'Test on real bins in each bay, and keep correcting where it fails',
    `Nothing: ${WIN.solved} of ${N} proves it`,
    'Add demos until it clears all of them',
  ],
  correct: 0,
  explanation: 'A simulated score is a start: real bays differ, so test there and keep labelling where it slips.',
  why: [
    'Right: real bays bring what the simulator missed, and corrections fix what testing finds.',
    `${N} simulated bins can’t show every real bay, light or slip.`,
    'Past a few demos the bench barely moved; frames where it fails help more.',
  ],
};

interface S extends Setup {
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `Workbench: demos, correction rounds and practice, scored on ${N} simulated real bins. Labels count ${PERSON}’s time.`,
    act: 'Clear the most bins with the fewest labels.',
    say: { block: 'machine', text: 'The policy' },
    predicate: s => wins(s),
    hint: 'Practice is free: vary both. Then cut demos and corrections until the bins cleared start to drop.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${WIN.solved} of ${N} with ${WIN.labels} labels. Without practice the best is ${NO_PRACTICE_BEST}: no demo covers dim light.`,
    act: 'One question to finish.',
    say: { block: 'tray', text: 'Cleared' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: `Is a simulated score of ${N} bins the real bay?`,
  },
];

function Score({ s }: { s: Setup }) {
  const r = resultOf(s),
    best = wins(s),
    top = r.solved === WIN.solved;
  return (
    <div data-best={best ? '1' : '0'} data-top={top ? '1' : '0'}>
      <p className="rb-headline">
        <strong>{`${r.solved} of ${N}`}</strong>
        {` bins, ${r.labels} labels, median ${r.median} steps `}
        <span className={`stamp ${best ? 'correct' : top ? 'neutral' : 'wrong'}`}>
          {best ? 'READY' : top ? 'COSTS MORE' : 'MISSES BINS'}
        </span>
      </p>
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  return (
    <div className="tc-bench">
      <Radios legend={`${PERSON}’s demos`} options={DEMOS} value={s.demos} onChange={demos => set({ ...s, demos })} />
      <Radios legend="Correction rounds" options={ROUNDS} value={s.rounds} onChange={rounds => set({ ...s, rounds })} />
      <Radios
        legend="Practice"
        options={PRACTICES}
        value={s.practice}
        words={p => WORDS[p]}
        onChange={practice => set({ ...s, practice })}
      />
      <SimNote />
    </div>
  );
}

/** The first real bin, replayed under the bench's setup when the reader presses Run. */
function Stage({ s, say, setView }: { s: S; say?: Say; setView: (v: View) => void }) {
  const [go, setGo] = useState(0);
  const { demos, rounds, practice } = s;
  const p = useMemo(() => policyOf({ demos, rounds, practice }), [demos, rounds, practice]);
  const run = useMemo(() => replay(p.pairs, REAL[0], { slip: BINS.real.slip, seed: 0, detector: p.detector }), [p]);
  return (
    <ReplayStage
      layout={REAL[0]}
      states={run.states}
      actions={run.actions}
      end={run.end}
      go={go}
      detector={p.detector}
      say={say}
      view={s.view}
      onView={setView}
      caption={`Real bin 1 of ${N}, simulated: light ${REAL[0].light.toFixed(2)}, slips on.`}
    >
      <div className="rb-run">
        <button type="button" className="chip" onClick={() => setGo(g => g + 1)}>
          Run bin 1
        </button>
      </div>
    </ReplayStage>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage s={state} say={say} setView={view => sync({ ...state, view })} />}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the setup is an attempt only while it is the puzzle
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
