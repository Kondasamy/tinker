// Chapter 2: how the vocabulary is learned. A Larkspur paragraph starts as single bytes; the site tokenizer's merges are
// replayed on it one at a time (src/lib/tokens/merges.ts, over the shared BPE's mergeTrace). The reader predicts which
// pair merges first; the answer, and every count in the copy, is read off the trace.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { VOCAB_SIZE } from '../../lib/lm/bpe';
import { BYTE_TOKENS } from '../../lib/lm/bpe-train.ts';
import { FIRST, PARAGRAPH, TRACE, commonestAt, encodingOfIds, idsAt, pairLabel, shownPiece } from '../../lib/tokens/merges';
import { fact } from '../../lib/tokens/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, TokensStage } from './kit';

const MODULE = 'tokens', ID = '02-how-the-vocabulary-is-learned';
const STEPS_N = TRACE.steps.length, BYTES = idsAt(0).length, END = idsAt(STEPS_N).length;
const times = (n: number) => (n === 1 ? 'once' : `${n} times`);
const FIRST_PAIR = FIRST.options[FIRST.correct];
/** The merges to show: a run saved before the merges were retrained can hold more than the trace has. */
export const mergesShown = (k: number) => Math.min(k, STEPS_N);

interface S { started: boolean; p1: number | null; k: number; quiz: number | null }

const P1 = {
  question: 'Which pair of tokens in this paragraph merges first?',
  options: FIRST.options.map(o => `${pairLabel(o.pair)}, found ${times(o.count)} here`),
};

const QUIZ = {
  question: 'Larkspur launches a new scanner called the “Quillon”. Its tokenizer was trained last year and has never seen the word. What happens when a customer types “Quillon”?',
  options: [
    'The tokenizer fails: the word is not in its vocabulary',
    'The word is cut into pieces the tokenizer knows, down to single bytes if it must, so it takes more tokens than a common word',
    'The tokenizer adds “Quillon” to its vocabulary the first time it sees it',
    'It becomes one token, because every word gets a token of its own',
  ],
  correct: 1,
  explanation: 'A byte-level tokenizer can read any text: whatever no merge covers stays as smaller pieces, down to single bytes. A new word just costs more tokens.',
  why: [
    `Every byte is already a token, so nothing is ever unknown. ${fact('byte-level-bpe').claim}`,
    'Right. The merges it learned still apply wherever they fit, and the rest stays as smaller pieces or bytes. Rare words cost more tokens.',
    'The vocabulary is fixed when training ends. The tokenizer replays its merges; it never learns new ones while you use it.',
    `A vocabulary has a fixed size, here ${VOCAB_SIZE} tokens. Most words are not one token; a new name certainly isn’t.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'bytes', focus: 'start', visibleControls: ['start'],
    narration: `Here is the first paragraph of Larkspur’s company overview: “${PARAGRAPH}” A byte-level tokenizer starts from single bytes: its first ${BYTE_TOKENS} tokens are one per byte, so it can read any text in any language. Cut the paragraph into bytes.`,
    predicate: s => s.started,
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: `${BYTES} bytes, ${BYTES} tokens. Training read all of Larkspur’s documents, found the pair of tokens that sat side by side most often, glued it into one new token and wrote that down as a merge. Then it did it again, until it had ${VOCAB_SIZE - BYTE_TOKENS} merges. To cut new text, the tokenizer replays those merges in the order they were learned. Before you press anything:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'merge', focus: 'merge', visibleControls: ['p1', 'merge'],
    narration: 'Locked in. Run the first merge.',
    predicate: s => s.k >= 1,
    hint: 'Press “Next merge”.',
  },
  {
    id: 'replay', focus: 'merge', visibleControls: ['out1', 'merge'],
    narration: `The first merge was ${pairLabel(FIRST_PAIR.pair)}, found only ${times(FIRST_PAIR.count)} here, while ${pairLabel(FIRST.commonest.pair)} is found ${times(FIRST.commonest.count)}${commonestAt ? ` and merged at step ${commonestAt}` : ''}. The order comes from all of Larkspur’s documents, not from this paragraph. Keep merging one at a time, or run every merge to the end. The Tokens tab shows the pieces.`,
    predicate: s => s.k === STEPS_N,
    hint: 'Press “Run every merge” to finish the replay.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['merge', 'quiz'],
    narration: `${STEPS_N} merges fired on this paragraph, and its ${BYTES} bytes became ${END} tokens. Common words are now single tokens; rarer words stayed in pieces. This tokenizer is tiny, made for this site; real ones learn many more merges the same way. ${fact('gpt2-vocab').claim} One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can a byte-level tokenizer ever meet text it cannot cut?',
  },
];

function Merge({ s, apply }: { s: S; apply: (s: S) => void }) {
  const k = mergesShown(s.k), step = k ? TRACE.steps[k - 1] : null, done = s.k === STEPS_N;
  return (
    <>
      <div role="group" aria-label="Replay the merges" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="big" disabled={done} onClick={() => apply({ ...s, k: k + 1 })}>Next merge</button>
        {k > 0 && <button type="button" className="chip" disabled={done} onClick={() => apply({ ...s, k: STEPS_N })}>Run every merge</button>}
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
      stage={({ state }) => state.started
        ? <TokensStage text={PARAGRAPH} enc={encodingOfIds(idsAt(mergesShown(state.k)))} caption={`After ${mergesShown(state.k)} of ${STEPS_N} merges, with this site’s tokenizer.`} />
        : <TokensStage text="" caption="The paragraph is not cut yet." />}
      controls={{
        start: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, started: true })}>Cut it into bytes</button>,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={FIRST.correct} />,
        merge: ({ state, apply }) => <Merge s={state} apply={apply} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="bpe-origin" />
            <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
          </>
        ),
      }}
    />
  );
}
