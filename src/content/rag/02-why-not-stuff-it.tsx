// Chapter 2 step script: why not put everything in the prompt? Size first, then the non-size reasons.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import ContextOverflow from '../../components/scenes/ContextOverflow';
import { Source, Answer } from '../../components/scenes/Source';
import { CHAPTERS, chapterHref } from '../../lib/chapters';
import { STOPS, STOP_5TB, WINDOW, LARGEST, PRICE, TIMELINE, TOKENS_SOURCE, UNSTRUCTURED_SOURCE, tokensFor, overflows, formatBytes, formatTokens } from '../../lib/scale';

const ID = '02-why-not-stuff-it';
type Reason = 'middle' | 'fresh' | 'access';
interface S { asked: boolean; stop: number; seen: Reason[]; quiz: number | null }

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
};

// Each reason step: one button reveals the next reason; the drawer shows the one just revealed.
const reasonStep = (id: Reason, opens: string, narration: string): Step<S> => ({
  id: `reason-${id}`, focus: 'reason', visibleControls: ['reason'], opensDrawer: opens, narration,
  predicate: s => s.seen.includes(id),
});

export const STEPS: Step<S>[] = [
  {
    id: 'ask', focus: 'ask', visibleControls: ['ask'],
    narration: 'Your team tried the obvious fix: paste the company drive into the assistant’s prompt. Ask it about enterprise refunds.',
    predicate: s => s.asked,
  },
  {
    id: 'overflow', focus: 'corpus', visibleControls: ['corpus'], opensDrawer: 'answer',
    narration: 'Wrong again. The enterprise policy is on the drive, but the drive did not fit, so the paste was cut off before it. Drag the corpus slider until it overflows the context window.',
    predicate: s => overflows(STOPS[s.stop]),
    hint: `The window holds ${formatTokens(WINDOW)} tokens, about ${formatBytes(WINDOW * 4)} of text. Go past that.`,
  },
  {
    id: 'scale', focus: 'corpus', visibleControls: ['corpus'], opensDrawer: 'numbers',
    narration: `It already overflows at ${formatBytes(STOPS[FIRST_OVER])}. Real company drives are much bigger. Keep dragging, to 5 TB.`,
    predicate: s => s.stop >= STOP_5TB,
    hint: 'Each notch is 10 times bigger. 5 TB is the ninth notch.',
  },
  reasonStep('middle', 'numbers',
    `5 TB is about ${formatTokens(tokensFor(5e12))} tokens. No model can read that in one go. And size is not the only problem. Open the first of three more reasons.`),
  reasonStep('fresh', 'middle',
    'Even text that fits gets used badly: facts in the middle of a long prompt are often missed. Next reason.'),
  reasonStep('access', 'fresh',
    'A prompt is a snapshot. Documents change every day. Last reason.'),
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'], opensDrawer: 'access',
    narration: 'And one prompt for everyone ignores permissions. Retrieval can filter per user. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct,
    hint: 'Think of all four problems: size, the middle, freshness, permissions.',
  },
];

const REASON_LABEL: Record<Reason, string> = { middle: 'Lost in the middle', fresh: 'Freshness', access: 'Who may see what' };
const nextReason = (s: S) => (['middle', 'fresh', 'access'] as Reason[]).find(r => !s.seen.includes(r));

export default function WhyNotStuffIt() {
  const i = CHAPTERS.findIndex(c => c.id === ID);
  const next = CHAPTERS[i + 1];
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{ asked: false, stop: 0, seen: [], quiz: null }}
      next={next && { href: chapterHref(next.id), title: next.short }}
      stage={({ state }) => <ContextOverflow stop={state.stop} />}
      controls={{
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>
            Ask: “Do enterprise contracts get refunds after 30 days?”
          </button>
        ),
        corpus: ({ state, apply }) => (
          <label className="slider">
            <span>Corpus size: <strong>{formatBytes(STOPS[state.stop])}</strong></span>
            <input type="range" min={0} max={STOPS.length - 1} step={1} value={state.stop}
              aria-valuetext={`${formatBytes(STOPS[state.stop])}, about ${formatTokens(tokensFor(STOPS[state.stop]))} tokens`}
              onChange={e => apply({ ...state, stop: Number(e.target.value) })} />
            <span className="ends"><span>1 document</span><span>5 PB</span></span>
          </label>
        ),
        reason: ({ state, apply }) => {
          const r = nextReason(state);
          return r && <button type="button" className="big" onClick={() => apply({ ...state, seen: [...state.seen, r] })}>Next reason: {REASON_LABEL[r]} →</button>;
        },
        quiz: ({ state, apply }) => <Quiz {...QUIZ} value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} />,
      }}
      inspectPanel="numbers"
      panels={{
        answer: {
          title: 'The assistant’s answer',
          render: () => (
            <Answer verdict="Wrong"
              answer="I don’t see an enterprise refund policy in what I was given, so the standard 30-day refund applies."
              why="The enterprise policy exists. It was cut off: the whole drive could not fit in the prompt." />
          ),
        },
        numbers: {
          title: 'The numbers',
          render: s => {
            const bytes = STOPS[s.stop], tokens = tokensFor(bytes);
            return (
              <dl className="facts">
                <dt>Corpus</dt><dd>{formatBytes(bytes)} of plain text</dd>
                <dt>Tokens</dt><dd>≈ {tokens.toLocaleString('en')}: bytes ÷ 4. A token is a chunk of text, about ¾ of an English word. <Source e={TOKENS_SOURCE} /></dd>
                <dt>Largest window</dt><dd>{WINDOW.toLocaleString('en')} tokens, {LARGEST.model}. <Source e={LARGEST} /></dd>
                <dt>Fits?</dt><dd>{overflows(bytes) ? `No: it needs ${Math.ceil(tokens / WINDOW).toLocaleString('en')} full windows.` : 'Yes.'}</dd>
                {PRICE ? <>
                  <dt>Cost to send once</dt>
                  <dd>≈ ${(tokens / 1e6 * PRICE.perMillion).toLocaleString('en', { maximumFractionDigits: 2 })} at ${PRICE.perMillion} per million input tokens ({PRICE.model}, price as of {PRICE.asOf}), if it could fit at all. <a href={PRICE.sourceUrl} target="_blank" rel="noreferrer">{PRICE.sourceTitle}</a></dd>
                </> : <><dt>Cost</dt><dd>Not shown: we found no price we could cite.</dd></>}
                <dt>What it is</dt><dd>{UNSTRUCTURED_SOURCE.claim} <Source e={UNSTRUCTURED_SOURCE} /></dd>
                <dt>Latency</dt><dd>Not shown: we found no official reading-speed figure to cite. Longer prompts take longer to read.</dd>
              </dl>
            );
          },
        },
        middle: {
          title: 'Reason 1: lost in the middle',
          render: () => <p>{MIDDLE.claim} <Source e={MIDDLE} /></p>,
        },
        fresh: {
          title: 'Reason 2: freshness',
          render: () => <p>Prices, policies and tickets change every day. A pasted prompt is frozen at the moment you made it. Retrieval reads the current version each time someone asks.</p>,
        },
        access: {
          title: 'Reason 3: who may see what',
          render: () => <p>Not everyone may read every document: HR files, deal terms, legal holds. One giant prompt shows the model everything, for everyone. Retrieval can fetch only what the person asking is allowed to see.</p>,
        },
      }}
    />
  );
}
