// Chapter 3: split the copies' memory. Eight copies each hold the whole training state in their bins (memory mode); the
// reader predicts what sharding the optimiser state saves, then walks the ZeRO stages (memoryOf, pinned): stage 3 is
// eight times smaller in state, still over a chip with the activations, and sends 1.5× the bytes.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RING_PARTS } from '../../components/scenes/ringScene';
import { BYTES, CHIP, ZERO3_TRAFFIC } from '../../lib/parallel-training/facts';
import { memoryOf, type Zero } from '../../lib/parallel-training/memory';
import { bytesText, pct } from '../../lib/parallel-training/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, Maths, Radios, RingStage } from './kit';

const MODULE = 'parallel-training',
  ID = '03-sharding';
export const PARTS = RING_PARTS;
/** the copies at the table: the most the picture draws */
export const DP = 8;
const ZEROS: Zero[] = [0, 1, 2, 3];
export const memOf = (zero: Zero) => memoryOf({ tp: 1, pp: 1, dp: DP, zero });
const [M0, M1, , M3] = ZEROS.map(memOf);
export const SAVED = 1 - M1.total / M0.total;
const stageWords = (z: Zero) => (z ? `Stage ${z}` : 'None');

export interface S {
  p1: number | null;
  zero: Zero;
  quiz: number | null;
}

export const P1 = {
  question: `Stage 1 shards only the optimiser state over the ${DP} copies. How much does each chip save?`,
  options: ['About a tenth', 'Over half', 'Nearly all of it'],
};
export const OUTCOME = SAVED < 0.2 ? 0 : SAVED < 0.9 ? 1 : 2;

export const QUIZ = {
  question: 'A team turns on ZeRO stage 3 and its model’s state fits at last. What did it pay for the room?',
  options: [
    'More sending: each chip fetches the weights it no longer keeps',
    'A less accurate model',
    'Nothing: sharding is free',
  ],
  correct: 0,
  explanation: 'Each chip keeps only its shard, so it must fetch the rest from the other copies when it needs them.',
  why: [
    `Right: stage 3 sends ${ZERO3_TRAFFIC}× the bytes of plain data parallel, by the ZeRO paper’s count.`,
    'The maths is the same; only where each number is kept changes.',
    'Memory saved is paid for in sending: what a chip no longer keeps, it has to fetch.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${DP} copies each keep everything: ${bytesText(M0.total)} a chip. ZeRO stops the repeats by sharding them across the copies.`,
    act: 'Predict first.',
    say: { block: 'bucket', text: `${Math.round(M0.total / CHIP.memory)}× over` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'stage1',
    focus: 'zero',
    visibleControls: ['zero'],
    narration: `Your pick is locked. Each copy will keep only 1/${DP} of the optimiser state.`,
    act: 'Pick stage 1.',
    say: { block: 'worker', text: 'One copy' },
    predicate: s => s.zero === 1,
  },
  {
    id: 'stage3',
    focus: 'zero',
    visibleControls: ['out1', 'zero'],
    narration: `${bytesText(M1.total)} a chip, down from ${bytesText(M0.total)}. Stage 2 shards the gradients too; stage 3 the weights.`,
    act: 'Pick stage 3.',
    predicate: s => s.zero === 3,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'zero', 'sum', 'quiz'],
    narration: `${bytesText(M3.total)}: still over, as activations never shard. Stage 3 also sends ${ZERO3_TRAFFIC}× the bytes.`,
    act: 'One question to finish.',
    say: { block: 'bucket', text: 'Still over' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'If a chip no longer keeps the weights, where does it get them for its next pass?',
  },
];

function Parts({ zero }: { zero: Zero }) {
  const m = memOf(zero);
  const rows: [string, number][] = [
    ['Weights', m.weights],
    ['Gradients', m.grads],
    ['Optimiser state', m.optimiser],
    ['Activations', m.activations],
  ];
  return (
    <table className="tc-ledger">
      <caption>{`Each chip, ${stageWords(zero).toLowerCase()}`}</caption>
      <tbody>
        {rows.map(([name, b]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>{bytesText(b)}</td>
          </tr>
        ))}
        <tr>
          <th scope="row">{`Total, against ${bytesText(CHIP.memory)}`}</th>
          <td className={m.total <= CHIP.memory ? 'ok' : 'bad'}>{bytesText(m.total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function Sharding() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, zero: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const m = memOf(state.zero);
        return (
          <RingStage
            say={say}
            scene={{ n: DP, load: Array(DP).fill(m.total / CHIP.memory), table: `ZeRO: ${stageWords(state.zero)}` }}
            caption={`ZeRO ${stageWords(state.zero).toLowerCase()}: ${bytesText(m.total)} on each ${bytesText(CHIP.memory)} chip.`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        zero: ({ state, apply, sync, focused }) => (
          <>
            <Radios
              legend="ZeRO stage"
              options={ZEROS}
              value={state.zero}
              words={stageWords}
              onChange={zero => (focused ? apply : sync)({ ...state, zero })}
            />
            <Parts zero={state.zero} />
          </>
        ),
        sum: () => (
          <>
            <Fact id="zero-stages" />
            <Maths>
              <p>
                {`Per chip: weights ${BYTES.weights}, gradients ${BYTES.grads} and optimiser state ${BYTES.optimiser} bytes a parameter; each sharded stage divides its part by the ${DP} copies. Stage 1 saves ${pct(SAVED)}.`}
              </p>
            </Maths>
            <Fact id="activations" />
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
