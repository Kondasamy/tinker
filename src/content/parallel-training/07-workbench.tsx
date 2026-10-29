// Chapter 7: the workbench (KTD9). The reader lays out Fernhill's run on the rented chips: the split inside layers, the
// pipeline stages, the ZeRO stage and the checkpoint interval; the copies take the rest. The simulated cluster scores
// memory, step time and lost work (workbench.ts). The picture is the table's bins for a layout without stages, the line
// (pass the buckets, as exploration) with them. The puzzle accepts every layout in WINNERS (pinned, recomputed in a test).
import { useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Say, Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RING_PARTS } from '../../components/scenes/ringScene';
import { CHIP } from '../../lib/parallel-training/facts';
import {
  BEST,
  type Bench,
  CHIPS,
  effectiveOf,
  fits,
  INTERVALS,
  layoutOf,
  memoryOfBench,
  PPS,
  RULE,
  START,
  stepOfBench,
  TPS,
  wasteOfBench,
  WINNERS,
  wins,
  ZEROS,
} from '../../lib/parallel-training/workbench';
import type { Zero } from '../../lib/parallel-training/memory';
import { bytesText, pct, secondsText } from '../../lib/parallel-training/story';
import { PassControls, type PassState, Radios, RingStage, SimNote, sceneOf, timelineOf, type Workers } from './kit';

const MODULE = 'parallel-training',
  ID = '07-workbench';
// the line's parts are a superset of these but for `table`; callouts here name only `worker` and `rack`
export const PARTS = RING_PARTS;
const zeroWords = (z: Zero) => (z ? `Stage ${z}` : 'None');

export const QUIZ = {
  question: `Splitting each layer ${TPS[TPS.length - 1]} ways fits easily. Why does it never win here?`,
  options: [
    'Its layer all-reduces cross the slow link between boxes',
    'Each chip is left too little maths to do',
    'It needs more checkpoints than the others',
  ],
  correct: 0,
  explanation: 'A split layer talks every layer, and past one box that talk runs on the slow link.',
  why: [
    'Right: its chips no longer fit in one box, so every layer waits on the slow link.',
    'The maths is shared over the same chips whatever the split; the waiting is what grows.',
    'Checkpoints depend on the chips and the interval, not on how each layer is split.',
  ],
};

interface S extends Bench {
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `${RULE} Simulated workbench.`,
    act: 'Find the fastest layout that fits.',
    say: { block: 'rack', text: 'Per chip' },
    predicate: s => wins(s),
    hint: 'Keep each layer’s split inside one box, then add stages until the chips fit; save every few hours.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${secondsText(BEST)} a step, lost work counted. ${WINNERS.length} layouts tie: their ZeRO stages change memory, not time.`,
    act: 'One question to finish.',
    say: { block: 'worker', text: 'Fits' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where do the chips that share a layer sit, once there are more than fit in a box?',
  },
];

function Score({ s }: { s: S }) {
  const ok = fits(s),
    best = wins(s);
  return (
    <div role="status" data-best={best ? '1' : '0'} data-fits={ok ? '1' : '0'}>
      <p className="pt-headline">
        <strong>{secondsText(effectiveOf(s))}</strong>
        {` a step, ${bytesText(memoryOfBench(s).total)} a chip `}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'FASTEST' : ok ? 'FITS, SLOWER' : 'DOESN’T FIT'}
        </span>
      </p>
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const m = memoryOfBench(s),
    t = stepOfBench(s),
    l = layoutOf(s);
  const rows: [string, string, boolean | null][] = [
    [`Memory a chip (of ${bytesText(CHIP.memory)})`, bytesText(m.total), m.total <= CHIP.memory],
    ['Maths', secondsText(t.compute), null],
    ['Waiting inside layers', secondsText(t.tensor), null],
    ['Pipeline bubble', secondsText(t.bubble), null],
    ['Averaging gradients', secondsText(t.data), null],
    ['Lost to saves and failures', pct(wasteOfBench(s)), null],
    ['A step, lost work counted', secondsText(effectiveOf(s)), null],
  ];
  return (
    <div className="tc-bench">
      <Radios legend="Split each layer" options={TPS} value={s.tp} onChange={tp => set({ ...s, tp })} />
      <Radios legend="Pipeline stages" options={PPS} value={s.pp} onChange={pp => set({ ...s, pp })} />
      <Radios legend="ZeRO" options={ZEROS} value={s.zero} words={zeroWords} onChange={zero => set({ ...s, zero })} />
      <Radios
        legend="Save every"
        options={INTERVALS}
        value={s.interval}
        words={i => `${i} min`}
        onChange={interval => set({ ...s, interval })}
      />
      <table className="tc-ledger">
        <caption>{`${l.tp} × ${l.pp} × ${l.dp} copies = ${CHIPS.toLocaleString('en-US')} chips`}</caption>
        <tbody>
          {rows.map(([name, v, ok]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td className={ok === null ? undefined : ok ? 'ok' : 'bad'}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SimNote />
    </div>
  );
}

/** The table's bins without stages; the line, with pass the buckets to explore, with them. */
function Stage({ s, say }: { s: S; say?: Say }) {
  const m = memoryOfBench(s).total,
    rack = `${bytesText(m)} a chip`;
  if (s.pp === 1)
    return (
      <RingStage
        say={say}
        scene={{ n: 8, load: Array(8).fill(m / CHIP.memory), rack }}
        caption={`No stages: ${layoutOf(s).dp} copies, each layer split ${s.tp} ways. Eight chips drawn.`}
      />
    );
  return <Line key={s.pp} s={s} say={say} rack={rack} />;
}
function Line({ s, say, rack }: { s: S; say?: Say; rack: string }) {
  const [pass, setPass] = useState<PassState>({ mode: 'pipeline', n: s.pp as Workers, k: 0, m: 4 });
  return (
    <RingStage
      say={say}
      scene={{ ...sceneOf(pass), rack }}
      timeline={timelineOf(pass)}
      caption={`${s.pp} stages, ${layoutOf(s).dp} copies, each layer split ${s.tp} ways: ${rack}.`}
    >
      <PassControls state={pass} workers={false} onChange={setPass} />
    </RingStage>
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
        // changing the layout is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <BenchControls s={state} set={focused ? apply : sync} />,
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
