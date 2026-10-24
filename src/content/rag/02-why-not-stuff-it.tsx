// Chapter 2 step script: why not put everything in the prompt? Size first, then the non-size reasons.
import type { ReactNode } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { UNSURE } from '../../lib/recall';
import ContextOverflow from '../../components/scenes/ContextOverflow';
import { Source, Answer } from '../../components/scenes/Source';
import { nextOf } from '../../lib/chapters';
import {
  BYTES_PER_TOKEN,
  STOPS,
  STOP_5TB,
  WINDOW,
  LARGEST,
  PRICE,
  TIMELINE,
  TOKENS_SOURCE,
  UNSTRUCTURED_SOURCE,
  tokensFor,
  overflows,
  formatBytes,
  formatTokens,
} from '../../lib/scale';

const ID = '02-why-not-stuff-it';
type Reason = 'middle' | 'fresh' | 'access';
interface S {
  prediction: number | null;
  asked: boolean;
  stop: number;
  seen: Reason[];
  quiz: number | null;
}

const FIRST_OVER = STOPS.findIndex(overflows);
const MIDDLE = TIMELINE.find(e => e.sourceUrl.includes('2307.03172'))!;

const QUIZ = {
  question: 'Your company holds 5 TB of documents. Why does an assistant still need retrieval?',
  options: [
    'Models cannot read PDF files',
    'It is trillions of tokens: no context window holds it, and even long prompts hide facts, go stale and ignore who may see what',
    'Context windows are free, just slow',
  ],
  correct: 1,
  explanation: 'Retrieval sends only the few passages that matter, fresh, and only those this user may read.',
  why: [
    'File format is not the problem: PDFs are turned into text before a model reads them. The drive is simply far too big, and size is only one of four problems.',
    'Right. Size alone rules it out, and even a prompt that fits hides facts in the middle, freezes old versions and shows everyone everything.',
    'Windows are not free: you pay for every token sent, every time. And a cheap window still cannot hold trillions of tokens.',
  ],
};

// Predict, then reveal (R9): the slider shows the outcome, so the stage stays at one document until the pick.
const PREDICT = {
  question: `The largest context window holds ${formatTokens(WINDOW)} tokens. Will the whole company drive fit?`,
  options: [
    'Yes: that window is huge',
    'No: a real drive overflows it many times over',
    'Only just: it fills the window to the brim',
  ],
};
const OUTCOME = 1;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'The obvious fix: paste the whole company drive into the prompt. Predict first.',
    label: 'Predicted whether the drive fits',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['predict', 'ask'],
    narration: 'Your pick is locked. Ask about enterprise refunds.',
    label: 'Asked about enterprise refunds',
    predicate: s => s.asked,
  },
  {
    id: 'overflow',
    focus: 'corpus',
    visibleControls: ['corpus'],
    opensDrawer: 'answer',
    narration: 'Wrong again: the policy was cut off. Drag the corpus slider until it overflows the window.',
    label: 'Overflowed the window',
    more: 'The policy is on the drive, but the paste was cut off before it. Cutting text that does not fit is truncation: the model never sees what was cut.',
    predicate: s => overflows(STOPS[s.stop]),
    hint: `The window holds ${formatTokens(WINDOW)} tokens, about ${formatBytes(WINDOW * BYTES_PER_TOKEN)} of text. Go past that.`,
  },
  {
    id: 'scale',
    focus: 'corpus',
    visibleControls: ['reveal', 'corpus'],
    opensDrawer: 'numbers',
    narration: `Overflows at ${formatBytes(STOPS[FIRST_OVER])}. Real drives are far bigger: drag to 5 TB.`,
    label: 'Dragged the drive to 5 TB',
    predicate: s => s.stop >= STOP_5TB,
    hint: 'Each notch is 10 times bigger. 5 TB is the ninth notch.',
  },
  {
    id: 'reasons',
    focus: 'reason',
    visibleControls: ['reason'],
    opensDrawer: 'reason',
    narration: `5 TB is ${formatTokens(tokensFor(STOPS[STOP_5TB]))} tokens. Size is one problem; three more remain even when it fits. Open each.`,
    label: 'Opened the three other problems',
    predicate: s => s.seen.length === REASONS.length,
    hint: 'Press each of the three problems below the slider.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    opensDrawer: 'reason',
    narration: 'Four problems: size, the middle, freshness, permissions. One question to finish.',
    label: 'Answered the quiz',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Think of all four problems: size, the middle, freshness, permissions.',
  },
];

// the three problems that remain even when the text fits: a name and the one line a reader must keep
const REASONS: [Reason, string, string][] = [
  ['middle', 'Lost in the middle', 'Facts deep in a long prompt get missed.'],
  ['fresh', 'Freshness', 'A pasted prompt is a snapshot; documents change daily.'],
  ['access', 'Who may see what', 'One prompt for everyone ignores permissions; retrieval can filter per user.'],
];

export default function WhyNotStuffIt() {
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{ prediction: null, asked: false, stop: 0, seen: [], quiz: null }}
      next={nextOf(ID)}
      stage={({ state }) => <ContextOverflow stop={state.stop} />}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed
            onReveal={() => {}}
          />
        ),
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>
            Ask: “Do enterprise contracts get refunds after 30 days?”
          </button>
        ),
        corpus: ({ state, apply }) => (
          <label className="slider">
            <span>
              Corpus size: <strong>{formatBytes(STOPS[state.stop])}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={STOPS.length - 1}
              step={1}
              value={state.stop}
              aria-valuetext={`${formatBytes(STOPS[state.stop])}, about ${formatTokens(tokensFor(STOPS[state.stop]))} tokens`}
              onChange={e => apply({ ...state, stop: Number(e.target.value) })}
            />
            <span className="ends">
              <span>1 document</span>
              <span>5 PB</span>
            </span>
          </label>
        ),
        reason: ({ state, apply }) => (
          <div className="opts reasons" role="group" aria-label="Problems with pasting everything">
            {REASONS.map(([r, name, line]) => (
              <button
                key={r}
                type="button"
                className="chip"
                aria-pressed={state.seen.includes(r)}
                onClick={() => apply({ ...state, seen: [...state.seen.filter(x => x !== r), r] })}
              >
                <strong>{name}</strong> {line}
              </button>
            ))}
          </div>
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
      inspectPanel="numbers"
      panels={{
        answer: {
          title: 'The assistant’s answer',
          render: () => (
            <Answer
              verdict="Wrong"
              answer="I don’t see an enterprise refund policy in what I was given, so the standard 30-day refund applies."
              why="The enterprise policy exists. It was cut off: the whole drive could not fit in the prompt."
            />
          ),
        },
        numbers: { title: 'The numbers', render: numbersPanel },
        reason: {
          title: 'Why pasting fails, even when it fits',
          render: s => {
            const r = s.seen.at(-1);
            return r ? REASON_PANEL[r]() : numbersPanel(s);
          },
        },
      }}
    />
  );
}

// the corpus against the window, with its sources: what the reader just dragged to
function numbersPanel(s: S) {
  const bytes = STOPS[s.stop],
    tokens = tokensFor(bytes);
  return (
    <dl className="facts">
      <dt>Corpus</dt>
      <dd>{formatBytes(bytes)} of plain text</dd>
      <dt>Tokens</dt>
      <dd>
        ≈ {tokens.toLocaleString('en')}: bytes ÷ {BYTES_PER_TOKEN}. A token is a chunk of text, about ¾ of an English
        word. <Source e={TOKENS_SOURCE} />
      </dd>
      <dt>Largest window</dt>
      <dd>
        {WINDOW.toLocaleString('en')} tokens, {LARGEST.model}. <Source e={LARGEST} />
      </dd>
      <dt>Fits?</dt>
      <dd>
        {overflows(bytes) ? `No: it needs ${Math.ceil(tokens / WINDOW).toLocaleString('en')} full windows.` : 'Yes.'}
      </dd>
      {PRICE ? (
        <>
          <dt>Cost to send once</dt>
          <dd>
            ≈ ${((tokens / 1e6) * PRICE.perMillion).toLocaleString('en', { maximumFractionDigits: 2 })} at $
            {PRICE.perMillion} per million input tokens ({PRICE.model}, price as of {PRICE.asOf}), if it could fit at
            all.{' '}
            <a href={PRICE.sourceUrl} target="_blank" rel="noreferrer">
              {PRICE.sourceTitle}
            </a>
          </dd>
        </>
      ) : (
        <>
          <dt>Cost</dt>
          <dd>Not shown: we found no price we could cite.</dd>
        </>
      )}
      <dt>What it is</dt>
      <dd>
        {UNSTRUCTURED_SOURCE.claim} <Source e={UNSTRUCTURED_SOURCE} />
      </dd>
      <dt>Latency</dt>
      <dd>Not shown: we found no official reading-speed figure to cite. Longer prompts take longer to read.</dd>
    </dl>
  );
}

// what the drawer shows for each problem, with its title and source
const REASON_PANEL: Record<Reason, () => ReactNode> = {
  middle: () => (
    <>
      <h3>Lost in the middle</h3>
      <p>
        {MIDDLE.claim} <Source e={MIDDLE} />
      </p>
    </>
  ),
  fresh: () => (
    <>
      <h3>Freshness</h3>
      <p>
        Prices, policies and tickets change every day. A pasted prompt is frozen at the moment you made it. Retrieval
        reads the current version each time someone asks.
      </p>
    </>
  ),
  access: () => (
    <>
      <h3>Who may see what</h3>
      <p>
        Not everyone may read every document: HR files, deal terms, legal holds. One giant prompt shows the model
        everything, for everyone. Retrieval can fetch only what the person asking is allowed to see.
      </p>
    </>
  ),
};
