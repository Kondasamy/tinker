// Chapter 5: more text, bigger models, at what-changed altitude (R15). The reader predicts how much bigger GPT-3 is
// than Larkspur mini (labelled a toy, its count read off meta.json beside GPT-3's from the facts), then how long it was
// from the transformer to GPT-3 (both years from the facts). The last reveal: at scale, guessing became writing that can
// do tasks it was never trained for. Pre-training's "Bigger or longer" goes deeper.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { KIOSK_PARTS } from '../../components/scenes/kioskScene';
import { messageOf, run } from '../../lib/before-genai/bots';
import { fact } from '../../lib/before-genai/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { BeforeGenaiStage, type Deeper, Fact, GoDeeper, MiniNote } from './kit';

const MODULE = 'before-genai',
  ID = '05-scale';
export const PARTS = KIOSK_PARTS;
const IDLE = run(messageOf('where-order'));
export const DEEPER: readonly Deeper[] = [['pre-training', 5]];
/** Larkspur mini's learned numbers (a toy) and GPT-3's (fact `few-shot`, in billions) */
export const MINI = META.model.params,
  GPT3 = Number(fact('few-shot').value) * 1e9;
/** how many times bigger GPT-3 is */
export const RATIO = GPT3 / MINI;
/** the transformer's year and GPT-3's, from the facts */
export const YEARS = [Number(fact('transformer-paper').value), Number(fact('gpt3-date').value)] as const;
export const GAP = YEARS[1] - YEARS[0];

export interface S {
  p1: number | null;
  sized: boolean;
  p2: number | null;
  dated: boolean;
  quiz: number | null;
}
export const INITIAL: S = { p1: null, sized: false, p2: null, dated: false, quiz: null };

export const P1 = {
  question: `Larkspur mini has ${MINI.toLocaleString('en-US')} learned numbers. How many times more does GPT-3 have?`,
  options: ['About 100 times', 'About 10,000 times', 'Over a million times'],
};
/** the option the real ratio falls in (a test holds it) */
export const OUTCOME1 = RATIO >= 1e6 ? 2 : RATIO >= 1e3 ? 1 : 0;

export const P2 = {
  question: 'How long was it from the transformer design to GPT-3?',
  options: ['A few years', 'About ten years', 'About thirty years'],
};
export const OUTCOME2 = GAP <= 5 ? 0 : GAP <= 20 ? 1 : 2;

export const QUIZ = {
  question: 'What did scale change for language models?',
  options: [
    'They could do tasks nobody trained them for, from a few examples',
    'They stopped guessing the next word',
    'They began picking replies from a fixed list',
  ],
  correct: 0,
  explanation:
    'A bigger model, trained on far more text, still guesses the next word, but its guesses can do new tasks.',
  why: [
    'Right: GPT-3 did new tasks from a few examples in the prompt, with no more training.',
    'It still guesses the next word; it just guesses far better.',
    'Picking from a list was the old bots; a language model writes.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'size',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Scale: how big a model is, and how much text it learns from. Larkspur mini is tiny.',
    act: 'Predict how much bigger GPT-3 is.',
    say: { block: 'model', text: 'A toy model' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'size-reveal',
    focus: 'reveal1',
    visibleControls: ['p1', 'reveal1'],
    narration: 'Your pick is locked.',
    act: 'Show both sizes.',
    predicate: s => s.sized,
  },
  {
    id: 'date',
    focus: 'p2',
    visibleControls: ['out1', 'size', 'p2'],
    narration:
      'Size took a design that learns well from huge amounts of text: the transformer, which most language models now use.',
    act: 'Predict when GPT-3 followed.',
    say: { block: 'model', text: `${fact('few-shot').value} billion` },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'date-reveal',
    focus: 'reveal2',
    visibleControls: ['p2', 'reveal2'],
    narration: 'Your pick is locked.',
    act: 'Show the dates.',
    predicate: s => s.dated,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'dates', 'deeper', 'quiz'],
    narration:
      'At that scale, a model could do tasks nobody trained it for, from a few examples. Guessing became writing.',
    act: 'One question to finish.',
    say: { block: 'model', text: 'New tasks' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did GPT-3 still guess the next word?',
  },
];

export default function Scale() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={INITIAL}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <BeforeGenaiStage
          run={IDLE}
          say={say}
          caption={
            state.dated
              ? `The transformer in ${YEARS[0]}, GPT-3 in ${YEARS[1]}.`
              : state.sized
                ? `GPT-3: ${fact('few-shot').value} billion learned numbers. Larkspur mini, a toy: ${MINI.toLocaleString('en-US')}.`
                : 'The model machine holds Larkspur mini, a toy language model.'
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal1: ({ state, apply }) => (
          <Reveal
            prediction={state.p1 === null ? null : P1.options[state.p1]}
            outcome={P1.options[OUTCOME1]}
            revealed={state.sized}
            onReveal={() => apply({ ...state, sized: true })}
            label="Show both sizes"
          />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME1} />,
        size: () => (
          <>
            <MiniNote />
            <Fact id="few-shot" />
          </>
        ),
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        reveal2: ({ state, apply }) => (
          <Reveal
            prediction={state.p2 === null ? null : P2.options[state.p2]}
            outcome={P2.options[OUTCOME2]}
            revealed={state.dated}
            onReveal={() => apply({ ...state, dated: true })}
            label="Show the dates"
          />
        ),
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUTCOME2} />,
        dates: () => (
          <>
            <Fact id="transformer-paper" />
            <Fact id="gpt3-date" />
          </>
        ),
        deeper: () => <GoDeeper to={DEEPER} />,
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
