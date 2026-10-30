// Chapter 2: how the vocabulary is learned. A Larkspur paragraph starts as single bytes; the site tokenizer's merges are
// replayed on it one at a time (src/lib/tokens/merges.ts, over the shared BPE's mergeTrace). The reader predicts which
// pair merges first; the answer, and every count in the copy, is read off the trace.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { VOCAB_SIZE } from '../../lib/lm/bpe';
import { BYTE_TOKENS } from '../../lib/lm/bpe-train.ts';
import { FIRST, PARAGRAPH, TRACE, encodingOfIds, idsAt, pairLabel, shownPiece } from '../../lib/tokens/merges';
import { fact } from '../../lib/tokens/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, ToyNote, TokensStage } from './kit';
import { TOKEN_PARTS } from '../../components/scenes/tokenScene';

const MODULE = 'tokens',
  ID = '02-how-the-vocabulary-is-learned';
const STEPS_N = TRACE.steps.length,
  BYTES = idsAt(0).length,
  END = idsAt(STEPS_N).length;
export const PARTS = TOKEN_PARTS;
const times = (n: number) => (n === 1 ? 'once' : `${n} times`);
const FIRST_PAIR = FIRST.options[FIRST.correct];
/** The merges to show: a run saved before the merges were retrained can hold more than the trace has. */
export const mergesShown = (k: number) => Math.min(k, STEPS_N);

interface S {
  started: boolean;
  p1: number | null;
  k: number;
  quiz: number | null;
}

const P1 = {
  question: 'Which pair of tokens in this paragraph merges first?',
  options: FIRST.options.map(o => `${pairLabel(o.pair)}, found ${times(o.count)} here`),
};

export const QUIZ = {
  question:
    'Larkspur launches a new scanner called the “Quillon”. Its tokenizer was trained last year and has never seen the word. What happens when a customer types “Quillon”?',
  options: [
    'The tokenizer fails: the word is not in its vocabulary',
    'The word is cut into pieces the tokenizer knows, down to single bytes if it must, so it takes more tokens than a common word',
    'The tokenizer adds “Quillon” to its vocabulary the first time it sees it',
    'It becomes one token, because every word gets a token of its own',
  ],
  correct: 1,
  explanation:
    'A byte-level tokenizer can read any text: whatever no merge covers stays as smaller pieces, down to single bytes. A new word just costs more tokens.',
  why: [
    `Every byte is already a token, so nothing is unknown: ${fact('byte-level-bpe').claim}`,
    'Right: learned merges apply where they fit and the rest stays as smaller pieces or bytes, so rare words cost more tokens.',
    'The vocabulary is fixed when training ends: the tokenizer replays its merges and never learns new ones while you use it.',
    `A vocabulary has a fixed size, here ${VOCAB_SIZE} tokens, and a new name is almost never one of them.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'bytes',
    focus: 'start',
    visibleControls: ['start'],
    narration: `A byte-level tokenizer starts from ${BYTE_TOKENS} tokens, one per byte, so it reads anything.`,
    act: 'Cut it into bytes.',
    say: { block: 'press', text: 'Bytes first' },
    predicate: s => s.started,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${BYTES} bytes, ${BYTES} tokens. Byte pair encoding (BPE) learned ${VOCAB_SIZE - BYTE_TOKENS} merges, each gluing the pair seen most often in Larkspur’s documents.`,
    act: 'Predict the first merge.',
    say: { block: 'belt', text: 'A tile per byte' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'merge',
    focus: 'merge',
    visibleControls: ['p1', 'merge'],
    narration: 'Your pick is locked.',
    act: 'Run the first merge.',
    predicate: s => s.k >= 1,
    hint: 'Press “Next merge”.',
  },
  {
    id: 'replay',
    focus: 'merge',
    visibleControls: ['out1', 'merge'],
    narration: `First came ${pairLabel(FIRST_PAIR.pair)}, not this paragraph’s commonest pair, ${pairLabel(FIRST.commonest.pair)}: the order comes from all of Larkspur’s documents.`,
    act: 'Run every merge.',
    say: { block: 'press', text: 'Replays merges' },
    predicate: s => s.k === STEPS_N,
    hint: 'Press “Run every merge” to finish the replay.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['merge', 'quiz'],
    narration: `${STEPS_N} merges turned ${BYTES} bytes into ${END} tokens: common words whole, rarer ones in pieces. Real tokenizers learn far more merges.`,
    act: 'One question to finish.',
    say: { block: 'belt', text: `${END} tokens` },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can a byte-level tokenizer ever meet text it cannot cut?',
  },
];

function Merge({ s, apply }: { s: S; apply: (s: S) => void }) {
  const k = mergesShown(s.k),
    step = k ? TRACE.steps[k - 1] : null,
    done = s.k === STEPS_N;
  return (
    <>
      <div role="group" aria-label="Replay the merges" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="big" disabled={done} onClick={() => apply({ ...s, k: k + 1 })}>
          Next merge
        </button>
        {k > 0 && (
          <button type="button" className="chip" disabled={done} onClick={() => apply({ ...s, k: STEPS_N })}>
            Run every merge
          </button>
        )}
      </div>
      <p className="tc-status" role="status" data-merge={k}>
        {step
          ? `Merge ${k} of ${STEPS_N}: ${pairLabel(step.pair)} → “${shownPiece(step.id)}”, ${times(step.count)} here. ${idsAt(k).length} tokens now.`
          : `No merges yet: ${BYTES} tokens, one per byte.`}
      </p>
    </>
  );
}

export default function HowTheVocabularyIsLearned() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ started: false, p1: null, k: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) =>
        state.started ? (
          <TokensStage
            say={say}
            text={PARAGRAPH}
            enc={encodingOfIds(idsAt(mergesShown(state.k)))}
            caption={`After ${mergesShown(state.k)} of ${STEPS_N} merges, with this site’s tokenizer.`}
          />
        ) : (
          <TokensStage say={say} text="" caption="The paragraph is not cut yet." />
        )
      }
      controls={{
        start: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, started: true })}>
            Cut it into bytes
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={FIRST.correct} />,
        merge: ({ state, apply }) => <Merge s={state} apply={apply} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="bpe-origin" />
            <Fact id="gpt2-vocab" />
            <ToyNote />
            <p className="note">
              Short codes for common bytes, to shrink a file instead: <a href="/compression/">Compression</a>.
            </p>
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
