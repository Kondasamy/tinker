// Chapter 1: will it fit? Each model at 16 bits packs the crate with params × 2 bytes, a brick per sixteenth of the
// handheld's free memory (a planning number); the 1B already spills, and the reader predicts the 3B. Sizes and shapes
// are Llama 3.2's (cited); every number comes from memory.ts.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CRATE_PARTS } from '../../components/scenes/phoneCrateScene';
import { FREE, sizeOf, sizeText, weightBytes, type SizeId } from '../../lib/on-device/memory';
import { fact } from '../../lib/on-device/facts';
import { Outcome } from '../tool-calling/kit';
import { CrateStage, Fact, PLANNING, SizeRadios } from './kit';

const MODULE = 'on-device',
  ID = '01-will-it-fit';
export const PARTS = CRATE_PARTS;
const B1 = sizeOf('1b'),
  B3 = sizeOf('3b');
const at16 = (s: typeof B1) => sizeText(weightBytes(s, 16));

export interface S {
  size: SizeId;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `The ${B3.name} at 16 bits, against ${sizeText(FREE)} free: how many crates would it fill?`,
  options: ['Just over one', 'About three', 'Under one: memory isn’t the limit'],
};
/** crates the 3B fills at 16 bits, rounded: the option that names it */
export const CRATES = Math.round(weightBytes(B3, 16) / FREE);
export const OUTCOME = CRATES === 3 ? 1 : CRATES <= 1 ? 0 : -1;

export const QUIZ = {
  question: `A vendor offers a 7-billion-parameter model at 16 bits for the handhelds, with ${sizeText(FREE)} free. What do you ask first?`,
  options: [
    'How many bytes per weight it can ship at: 7 billion at 2 bytes is far too big',
    'Whether the handheld’s storage card is large enough',
    'Nothing: phones move what doesn’t fit out to storage',
  ],
  correct: 0,
  explanation:
    'Weights must sit in working memory; at 2 bytes each, 7 billion parameters need about seven times the room.',
  why: [
    'Right: memory needed is parameters times bytes per parameter, so the bytes per weight decide whether it can fit.',
    'Storage holds the file, but the model runs from working memory, which is the 2 GB that matters.',
    'Phones close apps rather than swap a running model out, and a model read from storage every token would crawl.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'one-b',
    focus: 'size',
    visibleControls: ['size'],
    narration: `Larkspur mini’s ${sizeOf('mini').params.toLocaleString('en')} parameters, 2 bytes each at 16 bits, take one brick of the free memory.`,
    act: `Pack the ${B1.name}.`,
    say: { block: 'crate', text: 'The handheld' },
    predicate: s => s.size === '1b',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${(B1.params / 1e9).toFixed(2)} billion parameters at 2 bytes: ${at16(B1)}. It spills.`,
    act: `Predict the ${B3.name}.`,
    say: { block: 'spill', text: 'Spilled' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'three-b',
    focus: 'size',
    visibleControls: ['size'],
    narration: 'Your pick is locked.',
    act: `Pack the ${B3.name}.`,
    predicate: s => s.size === '3b',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'more', 'quiz'],
    narration: `${at16(B3)}: neither fits at 16 bits. Phone models store far fewer bytes per weight; Gemma 3n runs in ${fact('gemma-3n').value} GB.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does a model run from: storage, or working memory?',
  },
];

export default function WillItFit() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ size: 'mini', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <CrateStage
          say={say}
          pack={{ size: state.size, bits: 16 }}
          caption={`${sizeOf(state.size).name} at 16 bits. Each brick is a sixteenth of ${sizeText(FREE)}. ${PLANNING}`}
        />
      )}
      controls={{
        size: ({ state, apply, sync, focused }) => (
          <SizeRadios value={state.size} onChange={size => (focused ? apply : sync)({ ...state, size })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        more: () => (
          <>
            <Fact id="llama-sizes" />
            <Fact id="gemma-3n" />
            <p className="note in-note">
              When a small model is enough, and how one is made: <a href="/small-models/">Small models</a>.
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
