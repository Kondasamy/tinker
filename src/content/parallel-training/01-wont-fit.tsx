// Chapter 1: it doesn't fit. One chip worker holds Fernhill's weights in its bin (already over), the reader predicts how
// many chips the whole training state needs, then weighs it: 16 bytes a parameter (the ZeRO paper), 14 chips' worth.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RING_PARTS } from '../../components/scenes/ringScene';
import { BYTES, CHIP, MODEL } from '../../lib/parallel-training/facts';
import { BYTES_PER_PARAM, stateOf } from '../../lib/parallel-training/memory';
import { bytesText, MODEL_NAME, pct } from '../../lib/parallel-training/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, Maths, RingStage } from './kit';

const MODULE = 'parallel-training',
  ID = '01-wont-fit';
export const PARTS = RING_PARTS;
export const WEIGHTS = MODEL.params * BYTES.weights;
export const STATE = stateOf();
const chips = (b: number) => Math.ceil(b / CHIP.memory);
const BILLION = `${MODEL.params / 1e9} billion`;
const OPT = pct(BYTES.optimiser / BYTES_PER_PARAM);
/** the quiz's smaller model, in billions */
const SMALL = 7;

export interface S {
  p1: number | null;
  weighed: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `How many ${bytesText(CHIP.memory)} chips does it take just to hold the whole training state?`,
  options: [
    `${chips(WEIGHTS)} chips`,
    `${chips((BYTES.weights + BYTES.grads + BYTES.weights) * MODEL.params)} chips`,
    `${chips(STATE)} chips`,
  ],
};
export const OUTCOME = 2;

export const QUIZ = {
  question: `A team fine-tunes a ${SMALL}-billion-parameter model on one ${bytesText(CHIP.memory)} chip. Its weights take ${SMALL * BYTES.weights} GB. Why won’t it fit?`,
  options: [
    `Training keeps gradients and optimiser state too: about ${SMALL * BYTES_PER_PARAM} GB`,
    'The chip keeps a spare copy of the weights',
    'Weights grow while the model trains',
  ],
  correct: 0,
  explanation: 'Training keeps far more than the weights: each parameter carries a gradient and optimiser state.',
  why: [
    `Right: ${BYTES_PER_PARAM} bytes a parameter, not ${BYTES.weights}, before any activations.`,
    'No spare copy is kept; the extra is the gradients and the optimiser’s own numbers.',
    'The weights stay the same size; their values change, not their count.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${MODEL_NAME} has ${BILLION} parameters. At ${BYTES.weights} bytes each, its weights alone are ${bytesText(WEIGHTS)}: over one chip.`,
    act: 'Predict first.',
    say: { block: 'bucket', text: 'The weights' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'weigh',
    focus: 'weigh',
    visibleControls: ['weigh'],
    narration: 'Your pick is locked. Training also keeps a gradient and optimiser state for every parameter.',
    act: 'Weigh the whole training state.',
    predicate: s => s.weighed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'sum', 'quiz'],
    narration: `${BYTES_PER_PARAM} bytes a parameter: ${bytesText(STATE)}, ${chips(STATE)} chips’ worth. The optimiser keeps ${OPT} of it.`,
    act: 'One question to finish.',
    say: { block: 'bucket', text: 'The whole state' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does training keep for each parameter besides the weight?',
  },
];

export default function WontFit() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, weighed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const held = state.weighed ? STATE : WEIGHTS;
        return (
          <RingStage
            say={say}
            scene={{ n: 1, load: [held / CHIP.memory] }}
            caption={`${state.weighed ? 'The training state' : 'The weights'}: ${bytesText(held)} on one ${bytesText(CHIP.memory)} chip.`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        weigh: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, weighed: true })}>
            Weigh the training state
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        sum: () => (
          <>
            <Fact id="zero-16-bytes" />
            <Maths>
              <p>
                {`${BILLION} parameters × (${BYTES.weights} + ${BYTES.grads} + ${BYTES.optimiser}) bytes = ${bytesText(STATE)}. `}
                {`${bytesText(STATE)} ÷ ${bytesText(CHIP.memory)} = ${STATE / CHIP.memory} chips, before activations.`}
              </p>
            </Maths>
            <Fact id="h100-memory" />
            <p className="note">
              <a href="/pre-training/">What a training run learns is Pre-training’s story.</a>
            </p>
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
