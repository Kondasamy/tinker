// Chapter 2 step script: why not put everything in the prompt? Size first, then the non-size reasons.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { UNSURE } from '../../lib/recall';
import ContextOverflow from '../../components/scenes/ContextOverflow';
import { Source, Answer } from '../../components/scenes/Source';
import Cite from '../../components/story/Cite';
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

export const QUIZ = {
  question: 'Your company holds 5 TB of documents. Why does an assistant still need retrieval?',
  options: [
    'Models cannot read PDF files',
    'It is trillions of tokens: no context window holds it, and even long prompts hide facts, go stale and ignore who may see what',
    'Context windows are free, just slow',
  ],
  correct: 1,
  explanation: 'Retrieval sends only the few passages that matter, fresh, and only those this user may read.',
  why: [
    'File format is not the problem: PDFs become text first, and the drive is simply far too big.',
    'Right: size alone rules it out, and even a prompt that fits hides facts, freezes old versions and shows everyone everything.',
    'Windows are not free: you pay for every token sent, and even a cheap window cannot hold trillions of tokens.',
  ],
};

// Predict, then reveal (R9): the slider shows the outcome, so the stage stays at one document until the pick.
const PREDICT = {
  question: `The largest context window, ${LARGEST.model}’s, holds ${formatTokens(WINDOW)} tokens. Will the whole company drive fit?`,
  options: [
    'Yes: that window is huge',
    'No: a real drive overflows it many times over',
    'Only just: it fills the window to the brim',
  ],
};
const OUTCOME = 1;

// Each reason step: one button reveals the next reason; the drawer shows the one just revealed.
const reasonStep = (id: Reason, opens: string, narration: string, act: string): Step<S> => ({
  id: `reason-${id}`,
  focus: 'reason',
  visibleControls: ['reason'],
  opensDrawer: opens,
  narration,
  act,
  predicate: s => s.seen.includes(id),
  demo: s => ({ ...s, seen: [...s.seen, id] }),
});

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Your team’s obvious fix: paste the whole company drive into the assistant’s prompt.',
    act: 'Before you try it, make a prediction.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['predict', 'ask'],
    narration: 'Your pick is locked. The drive is pasted in.',
    act: 'Ask the assistant about enterprise refunds.',
    predicate: s => s.asked,
    demo: s => ({ ...s, asked: true }),
  },
  {
    id: 'overflow',
    focus: 'corpus',
    visibleControls: ['corpus'],
    opensDrawer: 'answer',
    narration: 'Wrong again. The policy is on the drive, but truncation cut the paste before it.',
    act: 'Drag the corpus slider past the context window.',
    say: { block: 'window', text: 'The paste stops here' },
    predicate: s => overflows(STOPS[s.stop]),
    demo: s => ({ ...s, stop: FIRST_OVER }),
    hint: `The window holds ${formatTokens(WINDOW)} tokens, about ${formatBytes(WINDOW * BYTES_PER_TOKEN)} of text. Go past that.`,
  },
  {
    id: 'scale',
    focus: 'corpus',
    visibleControls: ['reveal', 'corpus'],
    opensDrawer: 'numbers',
    narration: `It already overflows at ${formatBytes(STOPS[FIRST_OVER])}. Real company drives are much bigger.`,
    act: 'Keep dragging, to 5 TB.',
    say: { block: 'corpus', text: 'Already too big' },
    predicate: s => s.stop >= STOP_5TB,
    demo: s => ({ ...s, stop: STOP_5TB }),
    hint: 'Each notch is 10 times bigger. 5 TB is the ninth notch.',
  },
  reasonStep(
    'middle',
    'numbers',
    `5 TB is about ${formatTokens(tokensFor(STOPS[STOP_5TB]))} tokens. No model reads that in one go, and size is only one problem.`,
    'Open the next reason.',
  ),
  reasonStep(
    'fresh',
    'middle',
    'Even text that fits gets used badly: facts lost in the middle of a long prompt are often missed.',
    'Next reason.',
  ),
  reasonStep('access', 'fresh', 'A prompt is a snapshot. Documents change every day.', 'Last reason.'),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    opensDrawer: 'access',
    narration: 'And one prompt for everyone ignores permissions. Retrieval can filter per user.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Think of all four problems: size, the middle, freshness, permissions.',
  },
];

const REASON_LABEL: Record<Reason, string> = {
  middle: 'Lost in the middle',
  fresh: 'Freshness',
  access: 'Who may see what',
};
const nextReason = (s: S) => (['middle', 'fresh', 'access'] as Reason[]).find(r => !s.seen.includes(r));

export const INITIAL: S = { prediction: null, asked: false, stop: 0, seen: [], quiz: null };

export default function WhyNotStuffIt() {
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={INITIAL}
      next={nextOf(ID)}
      stage={({ state, say }) => <ContextOverflow stop={state.stop} say={say} />}
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
        reason: ({ state, apply }) => {
          const r = nextReason(state);
          return (
            r && (
              <button type="button" className="big" onClick={() => apply({ ...state, seen: [...state.seen, r] })}>
                Next reason: {REASON_LABEL[r]} →
              </button>
            )
          );
        },
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
        numbers: {
          title: 'The numbers',
          render: s => {
            const bytes = STOPS[s.stop],
              tokens = tokensFor(bytes);
            return (
              <dl className="facts">
                <dt>Corpus</dt>
                <dd>{formatBytes(bytes)} of plain text</dd>
                <dt>Tokens</dt>
                <dd>
                  ≈ {tokens.toLocaleString('en')}: bytes ÷ {BYTES_PER_TOKEN}. A token is a chunk of text, about ¾ of an
                  English word. <Source e={TOKENS_SOURCE} />
                </dd>
                <dt>Largest window</dt>
                <dd>
                  {WINDOW.toLocaleString('en')} tokens, {LARGEST.model}. <Source e={LARGEST} />
                </dd>
                <dt>Fits?</dt>
                <dd>
                  {overflows(bytes)
                    ? `No: it needs ${Math.ceil(tokens / WINDOW).toLocaleString('en')} full windows.`
                    : 'Yes.'}
                </dd>
                {PRICE ? (
                  <>
                    <dt>Cost to send once</dt>
                    <dd>
                      ≈ ${((tokens / 1e6) * PRICE.perMillion).toLocaleString('en', { maximumFractionDigits: 2 })} at $
                      {PRICE.perMillion} per million input tokens ({PRICE.model}, price as of {PRICE.asOf}), if it could
                      fit at all. <Cite title={PRICE.sourceTitle} href={PRICE.sourceUrl} />
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
                <dd>
                  Not shown: we found no official reading-speed figure to cite. Longer prompts take longer to read.
                </dd>
              </dl>
            );
          },
        },
        middle: {
          title: 'Reason 1: lost in the middle',
          render: () => (
            <p>
              {MIDDLE.claim} <Source e={MIDDLE} />
            </p>
          ),
        },
        fresh: {
          title: 'Reason 2: freshness',
          render: () => (
            <p>
              Prices, policies and tickets change every day. A pasted prompt is frozen at the moment you made it.
              Retrieval reads the current version each time someone asks.
            </p>
          ),
        },
        access: {
          title: 'Reason 3: who may see what',
          render: () => (
            <p>
              Not everyone may read every document: HR files, deal terms, legal holds. One giant prompt shows the model
              everything, for everyone. Retrieval can fetch only what the person asking is allowed to see.
            </p>
          ),
        },
      }}
    />
  );
}
