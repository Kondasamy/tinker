// Chapter 2: smaller numbers. The bits radio repacks the 1B (params × bits ÷ 8); Ask runs Larkspur mini live in the
// browser, rounded by Inference's quantiser to the same bits, and shows its greedy reply. The pinned replies
// (pinned.json, re-derived by the engine test) say 8 bits keeps the words, 4 changes the answer, 2 repeats one word.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CRATE_PARTS } from '../../components/scenes/phoneCrateScene';
import { sizeOf, sizeText, weightBytes } from '../../lib/on-device/memory';
import { PROMPT, replyAt } from '../../lib/on-device/replies';
import { Outcome } from '../tool-calling/kit';
import { AskLive, BitsRadios, CrateStage, Fact, modelNow, PLANNING } from './kit';

const MODULE = 'on-device',
  ID = '02-smaller-numbers';
export const PARTS = CRATE_PARTS;
const B1 = sizeOf('1b');

export interface S {
  bits: number;
  asked: number[];
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Larkspur mini at 8 bits instead of 16. Its reply:',
  options: ['The same words', 'The same answer, a word or two different', 'Garbled'],
};
/** 8 bits keeps the pinned reply word for word (asserted in the chapters test) */
export const OUTCOME = replyAt(8).text === replyAt(16).text ? 0 : 1;

export const QUIZ = {
  question: 'A team plainly rounds its 3B model to 2 bits to save memory. What should it check before shipping?',
  options: [
    'Its own questions at 2 bits: the saving is certain, the damage isn’t',
    'Nothing: big companies ship 2-bit models, so 2 bits is safe',
    'Only the memory: rounding can’t change an answer',
  ],
  correct: 0,
  explanation:
    'Memory saved is arithmetic; what rounding costs shows only when you ask the rounded model your questions.',
  why: [
    'Right: bytes saved are counted from the shape, but the cost to answers has to be measured.',
    'Models built to run at 2 bits are trained for it; plain rounding after training is what broke Larkspur mini.',
    'Larkspur mini’s answer changed at 4 bits and fell apart at 2, so rounding clearly can change answers.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'eight',
    focus: 'bits',
    visibleControls: ['bits'],
    narration: 'Quantization rounds each weight to a few levels. Fewer bits per weight, fewer bricks.',
    act: 'Set 8 bits.',
    say: { block: 'bricks', text: 'Weight bricks' },
    predicate: s => s.bits === 8,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The ${B1.name} halves to ${sizeText(weightBytes(B1, 8))} and fits. Larkspur mini will answer live, rounded the same way.`,
    act: 'Predict its reply at 8 bits.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['bits', 'ask'],
    narration: 'Your pick is locked.',
    act: 'Ask at 16 bits, then at 8.',
    predicate: s => !!modelNow() && s.asked.includes(16) && s.asked.includes(8),
  },
  {
    id: 'lower',
    focus: 'ask',
    visibleControls: ['out1', 'bits', 'ask'],
    narration: 'Same words at half the bytes. At 2 bits, plain rounding leaves each row three levels.',
    act: 'Ask at 4 bits, then at 2.',
    predicate: s => s.asked.includes(4) && s.asked.includes(2),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bits', 'ask', 'more', 'quiz'],
    narration: 'At 4 bits the answer changed; at 2 one word repeats. Models trained for low bits hold up far better.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which part is arithmetic, and which has to be measured?',
  },
];

export default function SmallerNumbers() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bits: 16, asked: [], p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <CrateStage
          say={say}
          pack={{ size: '1b', bits: state.bits }}
          caption={`The ${B1.name} at ${state.bits} bits; Larkspur mini answers at the same bits, live in your browser. ${PLANNING}`}
        />
      )}
      controls={{
        bits: ({ state, apply, sync, focused }) => (
          <BitsRadios value={state.bits} onChange={bits => (focused ? apply : sync)({ ...state, bits })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        // asking at another width is exploring, not a miss
        ask: ({ state, sync }) => (
          <AskLive
            bits={state.bits}
            prompt={PROMPT}
            onAsked={b => sync({ ...state, asked: state.asked.includes(b) ? state.asked : [...state.asked, b] })}
          />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        more: () => (
          <>
            <Fact id="apple-3b" />
            <Fact id="apple-2bit" />
            <Fact id="llama-quantized" />
            <p className="note in-note">
              How the rounding works, and how to measure what it costs:{' '}
              <a href="/inference/04-smaller-numbers/">Inference, Smaller numbers</a>.
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
