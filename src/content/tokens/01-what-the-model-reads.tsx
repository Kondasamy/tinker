// Chapter 1: what the model reads. The reader predicts how many tokens a fixed Larkspur sentence makes, feeds it to the
// tokenizer and sees the count beside their pick, then types their own text with the count live. Counts are the site
// tokenizer's, computed in the browser (R6); the bigger tokenizer's count is a recorded one (KTD4).
import { useId } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { countText } from '../../lib/tokens/counts';
import { SENTENCES, TOKENIZERS, encodingOf } from '../../lib/tokens/encodings';
import { TOKEN_PARTS, tokensWord } from '../../components/scenes/tokenScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, ToyNote, TokensStage } from './kit';

const MODULE = 'tokens',
  ID = '01-what-the-model-reads';
const SAMPLE = SENTENCES.find(s => s.id === 'order-en')!;
const C = countText(SAMPLE.text);
const BIG = TOKENIZERS[TOKENIZERS.length - 1],
  BIG_N = encodingOf(SAMPLE.id, BIG.id).ids.length;
export const PARTS = TOKEN_PARTS;
const MAX = 400; // shortcut: typed text is capped so the tile row stays readable; raise it if readers ask for longer

interface S {
  p1: number | null;
  fed: boolean;
  text: string;
  mine: string | null;
  quiz: number | null;
}

const P1 = {
  question: `How many tokens will the tokenizer cut “${SAMPLE.text}” into? It has ${C.words} words.`,
  options: [
    `Fewer than ${C.words}: one token can hold several words`,
    `Exactly ${C.words}: one token per word`,
    `More than ${C.words}: some words are cut into pieces`,
  ],
};
const OUT1 = C.tokens < C.words ? 0 : C.tokens === C.words ? 1 : 2;

export const QUIZ = {
  question:
    'A Larkspur teammate wants to know how much of the model’s reading limit a customer email will use. They plan to count its words. What do you tell them?',
  options: [
    'Words are fine: the model reads one word at a time',
    'The model reads tokens, and a word can be one token or several. Count with the tokenizer',
    'Count the letters instead: the model reads one letter at a time',
    'Count the sentences: the model reads a sentence as one unit',
  ],
  correct: 1,
  explanation:
    'The model never sees words or letters, only the token ids the tokenizer makes. The only true count is the tokenizer’s.',
  why: [
    `The sample had ${C.words} words but ${tokensWord(C.tokens)}: words and tokens line up only by luck.`,
    'Right: a common word is often one token, but a rare word, number or name takes several, so only the tokenizer’s count is true.',
    `The sentence had ${C.chars} characters but only ${tokensWord(C.tokens)}, since most tokens hold several letters.`,
    'A tokenizer never keeps a whole sentence as one token; it cuts every sentence into many.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'A tokenizer cuts text into tokens, each one a number, before the model sees anything.',
    act: 'Predict the count first.',
    say: { block: 'press', text: 'Waiting for text' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'feed',
    focus: 'feed',
    visibleControls: ['p1', 'feed'],
    narration: 'Your pick is locked.',
    act: 'Feed the sentence in and watch the press.',
    predicate: s => s.fed,
    hint: 'Press the button under your prediction.',
  },
  {
    id: 'ids',
    focus: 'type',
    visibleControls: ['out1', 'type'],
    narration: `${C.words} words, ${tokensWord(C.tokens)}: some whole, some cut. The model gets only ids, rows in the vocabulary.`,
    act: 'Type your own text and count it.',
    say: { block: 'belt', text: 'One id per tile' },
    predicate: s => s.mine !== null,
    hint: 'Change the text in the box, then press “Count my text”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['mine', 'quiz'],
    narration:
      'Long words, names and numbers cut into more pieces; short common words stay whole. Every provider’s tokenizer counts differently.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the model receive: words, letters, or something else?',
  },
];

const ratio = (t: number, w: number) => (w ? (t / w).toFixed(1) : '0');
function Mine({ text }: { text: string }) {
  const c = countText(text);
  return (
    <p className="tc-status" role="status" data-mine>
      Your text: {tokensWord(c.tokens)} for {c.words} word{c.words === 1 ? '' : 's'} and {c.chars} characters,{' '}
      {ratio(c.tokens, c.words)} tokens per word.
    </p>
  );
}

function TypeBox({ s, sync, apply }: { s: S; sync: (s: S) => void; apply: (s: S) => void }) {
  const id = useId();
  const changed = s.text.trim() !== '' && s.text !== SAMPLE.text;
  return (
    <div className="tk-type">
      <label htmlFor={id} className="lbl">
        Your text
      </label>
      <textarea id={id} rows={3} maxLength={MAX} value={s.text} onChange={e => sync({ ...s, text: e.target.value })} />
      <button type="button" className="big" onClick={() => apply({ ...s, mine: changed ? s.text : null })}>
        Count my text
      </button>
      {s.mine !== null && <Mine text={s.mine} />}
    </div>
  );
}

export default function WhatTheModelReads() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, fed: false, text: SAMPLE.text, mine: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <TokensStage
          say={say}
          text={state.fed ? state.text : ''}
          caption={state.fed ? 'Counted by this site’s tokenizer, live.' : 'Nothing fed in yet.'}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        feed: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, fed: true })}>
            Feed the sentence to the tokenizer
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUT1} />
            <p className="tc-fact">
              {BIG.name}, a much bigger tokenizer, cut it into {tokensWord(BIG_N)} (recorded ahead of time): a bigger
              vocabulary keeps more words whole.
            </p>
          </>
        ),
        type: ({ state, sync, apply }) => <TypeBox s={state} sync={sync} apply={apply} />,
        mine: ({ state }) =>
          state.mine === null ? null : (
            <>
              <Mine text={state.mine} />
              <Fact id="openai-rule" />
              <ToyNote />
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
