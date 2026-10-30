// Chapter 3: the working memory. The 3B at 4 bits fits; the context range adds its KV cache (keys and values for every
// token, 16 bits, from the model's published shape) as mint bricks, until the crate spills. Every number from memory.ts.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CRATE_PARTS } from '../../components/scenes/phoneCrateScene';
import { cacheBytes, CONTEXTS, fits, kvPerToken, sizeOf, sizeText } from '../../lib/on-device/memory';
import { Outcome } from '../tool-calling/kit';
import { ContextRange, CrateStage, Fact, PLANNING } from './kit';
import { num } from '../../lib/format';

const MODULE = 'on-device',
  ID = '03-working-memory';
export const PARTS = CRATE_PARTS;
const B3 = sizeOf('3b'),
  BITS = 4;
/** the first context the 3B at 4 bits doesn't fit with */
export const FIRST_SPILL = CONTEXTS.find(t => !fits(B3, BITS, t))!;

export interface S {
  tokens: number;
  p1: number | null;
  quiz: number | null;
}

const NEVER = 'Never: the cache is tiny next to the weights';
export const P1 = {
  question: `Raise the context. Where does the ${B3.name} at ${BITS} bits first spill?`,
  options: [...CONTEXTS.slice(3).map(t => `At ${num(t)} tokens`), NEVER],
};
export const OUTCOME = FIRST_SPILL ? P1.options.indexOf(`At ${num(FIRST_SPILL)} tokens`) : P1.options.indexOf(NEVER);

export const QUIZ = {
  question: 'A picker’s chat has run all morning, and now the handheld app runs out of memory. Why?',
  options: [
    'The chat’s tokens filled the KV cache, which grows with every token kept',
    'The weights grew as the model learned from the chat',
    'The battery ran low, and a low battery shrinks memory',
  ],
  correct: 0,
  explanation: 'Every token kept in context holds its keys and values in memory, so a long chat grows the cache.',
  why: [
    'Right: the cache adds the same bytes for every token read, so a long chat keeps growing it.',
    'A model’s weights never change while it answers; only training changes them.',
    'Battery and memory are separate; a low battery slows nothing in memory.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'thousand',
    focus: 'tokens',
    visibleControls: ['tokens'],
    narration: `The KV cache keeps keys and values for every context token: ${sizeText(kvPerToken(B3))} each for the ${B3.name}.`,
    act: `Set the context to ${num(CONTEXTS[2])} tokens.`,
    predicate: s => s.tokens === CONTEXTS[2],
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${num(CONTEXTS[2])} tokens: ${sizeText(cacheBytes(B3, CONTEXTS[2]))}, one mint brick.`,
    act: 'Predict where it spills.',
    say: { block: 'cache', text: 'Cache bricks' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'raise',
    focus: 'tokens',
    visibleControls: ['tokens'],
    narration: 'Your pick is locked.',
    act: 'Raise the context until the crate spills.',
    predicate: s => !fits(B3, BITS, s.tokens),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'tokens', 'more', 'quiz'],
    narration: `At ${num(FIRST_SPILL)} tokens the cache needs ${sizeText(cacheBytes(B3, FIRST_SPILL))}. Keep context short, or share the cache between layers.`,
    act: 'One question to finish.',
    say: { block: 'spill', text: 'Cache spilled' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What grows with every token the model keeps reading?',
  },
];

export default function WorkingMemory() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ tokens: 0, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <CrateStage
          say={say}
          pack={{ size: '3b', bits: BITS, tokens: state.tokens }}
          caption={`The ${B3.name} at ${BITS} bits with ${num(state.tokens)} tokens of context: cobalt bricks are weights, mint are cache. ${PLANNING}`}
        />
      )}
      controls={{
        tokens: ({ state, apply, sync, focused }) => (
          <ContextRange value={state.tokens} onChange={tokens => (focused ? apply : sync)({ ...state, tokens })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        more: () => (
          <>
            <Fact id="llama-shape" />
            <Fact id="apple-2bit" />
            <p className="note in-note">
              What to keep in the context, and what to leave out: <a href="/context/">Context</a>. The cache on a
              server: <a href="/inference/02-kv-cache-at-scale/">Inference engineering, The KV cache at scale</a>.
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
