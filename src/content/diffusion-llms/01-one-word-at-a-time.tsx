// Chapter 1: one word at a time. Larkspur mini (live, left to right, greedy) continues a handbook phrase, a token a
// pass, on the typewriter beside the type frame. The reader predicts the passes, then watches it type: 16 tokens, 16
// passes. The baseline every later chapter is measured against.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { L, text } from '../../lib/diffusion-llms/decode';
import { FRAME_PARTS } from '../../components/scenes/typeFrameScene';
import { Outcome } from '../tool-calling/kit';
import { Fact, FrameStage, Waiting, given, passWords, phrase, useTypewriter } from './kit';

const MODULE = 'diffusion-llms',
  ID = '01-one-word-at-a-time';
export const PARTS = FRAME_PARTS;
/** The safety-handbook phrase Larkspur mini continues. */
export const SEED = 9;
const P = phrase(SEED);

interface S {
  p1: number | null;
  typing: boolean;
  typed: boolean;
  quiz: number | null;
}

const P1 = {
  question: `Larkspur mini must write ${L} tokens. How many passes does it take?`,
  options: [`${L}: one pass per token`, '1: it writes the whole reply at once', 'Fewer: it writes a word a pass'],
};

export const QUIZ = {
  question: 'A left-to-right model runs 50 passes a second. About how long does a 200-token reply take?',
  options: [
    'About 4 seconds: one token a pass',
    'About 1 second: it writes whole words',
    'Under a second: it plans the reply in one pass',
  ],
  correct: 0,
  explanation: 'One token a pass: 200 tokens is 200 passes, and 200 passes at 50 a second is 4 seconds.',
  why: [
    'Right: each token needs its own pass, so the reply’s length sets the wait.',
    'Words are often several tokens, so writing by token is slower than by word, not faster.',
    'A left-to-right model can’t write a token before the ones to its left exist.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Larkspur mini, the typewriter, continues a phrase from the safety handbook. Each pass is one run of the model.',
    act: 'Predict first.',
    say: { block: 'typewriter', text: 'Larkspur mini' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'type',
    focus: 'type',
    visibleControls: ['type'],
    narration: 'Each pass reads the phrase and everything typed so far, then adds one token on the right.',
    act: 'Type the reply.',
    say: { block: 'typewriter', text: 'One a pass' },
    predicate: s => s.typed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['reveal', 'quiz'],
    narration: `${L} tokens took ${L} passes. A left-to-right model’s speed is how many passes it runs each second: one token each.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many tokens does one pass add?',
  },
];

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const t = useTypewriter(state.typing ? SEED : null, () => {
    if (!state.typed) sync({ ...state, typed: true });
  });
  const n = t.ids ? t.typed : state.typing ? 0 : undefined;
  return (
    <FrameStage
      say={say}
      shown={{
        wait:
          state.typing && !t.ids && t.status !== 'ready' ? (
            <Waiting w="base" failed={t.status === 'error'} retry={t.retry} />
          ) : undefined,
        given: P.ids.length,
        slots: [],
        typed: n,
        typeOf: L,
        caption:
          n === undefined
            ? `The phrase: “${given(SEED)}”`
            : `Larkspur mini, ${passWords(n)}: “${given(SEED)}${text(t.ids?.slice(0, n) ?? [])}”`,
      }}
    />
  );
}

export default function OneWordAtATime() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, typing: false, typed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        type: ({ state, sync }) => (
          <button
            type="button"
            className="big"
            disabled={state.typing}
            onClick={() => sync({ ...state, typing: true })}
          >
            {state.typing ? 'Typing…' : `Type ${L} tokens`}
          </button>
        ),
        reveal: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={0} />
            <p className="note">
              Larkspur mini is the tiny model from <a href="/transformers/">Transformers</a>. Every left-to-right model
              writes this way, however large.
            </p>
            <Fact id="mercury-2" />
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
