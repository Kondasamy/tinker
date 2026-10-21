// Chapter 6: why long prompts cost more. The reader grows a prompt token by token, up to Larkspur mini's window, and
// watches the attention grid fill while the pairs and the KV cache are counted live (costs.ts). They predict what
// doubling the prompt does to the pairs; the answer is read off costs(), never typed. Claims about real models come
// from facts.json.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { decode, encode } from '../../lib/lm/bpe';
import { PROMPTS } from '../../lib/transformers/trace';
import { costs } from '../../lib/transformers/costs';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { pieceLabel } from '../../components/scenes/attentionMap';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { CTX, Fact, TransformersStage, Waiting, useModel, whenLoaded, type View } from './kit';

const MODULE = 'transformers', ID = '06-why-long-prompts-cost-more';
const LM = META.model;
/** The text the reader grows: the long support passage, then another prompt, cut to the window (a test holds it fills it). */
export const IDS = encode(`${PROMPTS.find(p => p.id === 'long')!.text} ${PROMPTS.find(p => p.id === 'reply')!.text}`).slice(0, CTX);
export const textAt = (n: number) => decode(IDS.slice(0, n));
/** The prediction: the prompt doubles from SHORT to 2 × SHORT tokens. */
export const SHORT = 8;
const LONG = 2 * SHORT;
/** Every head of every layer scores its own pairs. */
const HEADS = LM.n_layer * LM.n_head;
const fmt = (x: number) => x.toLocaleString('en-US');

/** Which option the pairs' growth from SHORT to 2 × SHORT tokens matches: 0 double, 1 about four times, 2 the same. */
export function outcomeOf(): number {
  const r = costs(LM, LONG).pairs / costs(LM, SHORT).pairs;
  return r > 3 ? 1 : r > 1.5 ? 0 : 2;
}

/** The live counts for a prompt of n tokens, as the chapter states them. */
export function countsOf(n: number) {
  const c = costs(LM, n), prev = costs(LM, n - 1);
  return { ...c, all: c.pairs * HEADS, newPairs: c.pairs - prev.pairs, newKv: c.kv - prev.kv };
}

interface S { n: number; p1: number | null; revealed: boolean; view: View; quiz: number | null }

const P1 = {
  question: `The prompt doubles, from ${SHORT} tokens to ${LONG}. What happens to the attention pairs each head scores?`,
  options: [
    'They double, like the prompt',
    'They grow about four times: each new token also scores every token before it',
    'They stay the same: each token is still one token',
  ],
};

const QUIZ = {
  question: 'Larkspur wants its assistant to read a customer’s whole order history, ten times longer than today’s prompts, on every question. Roughly how does the attention work per head change?',
  options: [
    'About ten times: the work grows with the prompt',
    'About a hundred times: every token scores every token before it, so the pairs grow with the square of the length',
    'No change: the KV cache stores the history, so it costs nothing to read',
    'It halves: longer prompts give the model more to go on, so it works less',
  ],
  correct: 1,
  explanation: 'Pairs grow with the square of the length: ten times the tokens is about a hundred times the pairs. The KV cache saves recomputing keys and values, not the scoring.',
  why: [
    'That is how the KV cache grows, one entry per token. The pairs grew about four times when you doubled the prompt.',
    'Right. Each token scores every token before it, so ten times the tokens is about a hundred times the pairs.',
    'The cache keeps each token’s keys and values so they aren’t recomputed, but every new token still scores every cached key. And the cache itself grows with the prompt.',
    'The model’s work doesn’t depend on how helpful the text is. Every token is scored against every token before it, whatever it says.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'grow', focus: 'grow', visibleControls: ['grow'],
    narration: `In attention, every token scores itself and every token before it. One such score is an attention pair. Open the Attention tab and grow a prompt token by token, to ${SHORT} tokens: each new row of the grid is the new token’s pairs.`,
    predicate: whenLoaded(s => s.n >= SHORT),
    hint: `Press “Add a token” until the prompt has ${SHORT} tokens.`,
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: 'Each row is one longer than the row before. Before you grow the prompt further:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal', focus: 'reveal', visibleControls: ['p1', 'reveal'],
    narration: 'Locked in. Grow it and count.',
    predicate: s => s.revealed,
  },
  {
    id: 'cache', focus: 'grow', visibleControls: ['out1', 'grow'],
    narration: `Twice the tokens, about four times the pairs: they grow with the square of the length. Now the saving. A token’s keys and values (what attention reads from it) never change once it is read, so the model keeps them in a KV cache, and each new token computes only its own. The cache grows by the same amount for every token; the pairs grow by more each time. Grow the prompt to the edge of the window, ${CTX} tokens.`,
    predicate: s => s.n >= CTX,
    hint: `Keep adding tokens until the prompt has ${CTX}.`,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['window', 'quiz'],
    narration: `That is Larkspur mini’s whole window: it was trained on ${CTX} tokens at a time, so it never learned positions beyond. Real models have far larger windows, and they pay the same square. These counts are for Larkspur mini’s shape (${LM.n_layer} layers, ${LM.n_head} heads); a provider’s bill counts tokens, but this is why long prompts are slow and costly to serve. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happened to the pairs when you doubled the prompt?',
  },
];

export default function WhyLongPromptsCostMore() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ n: 1, p1: null, revealed: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => (
        <TransformersStage prompt={textAt(state.n)} view={state.view} onView={v => sync({ ...state, view: v })}
          caption="Each row of the grid: one token’s attention pairs. Computed live from Larkspur mini." />
      )}
      controls={{
        grow: ({ state, sync }) => {
          if (!model) return <Waiting />;
          const c = countsOf(state.n), full = state.n >= CTX;
          return (
            <>
              <button type="button" className="big" disabled={full} onClick={() => sync({ ...state, n: state.n + 1, view: 'attn' })}>
                {full ? 'The window is full' : `Add a token (${pieceLabel(decode([IDS[state.n]]))})`}
              </button>
              <table className="tf-costs">
                <caption>{`Counted live for a prompt of ${state.n} of ${CTX} tokens`}</caption>
                <tbody>
                  <tr><th scope="row">Attention pairs, per head</th><td>{fmt(c.pairs)}</td><td>{`+${fmt(c.newPairs)} for the last token`}</td></tr>
                  <tr><th scope="row">{`Pairs, all ${HEADS} heads`}</th><td>{fmt(c.all)}</td><td /></tr>
                  <tr><th scope="row">KV cache, numbers kept</th><td>{fmt(c.kv)}</td><td>{`+${fmt(c.newKv)} for the last token`}</td></tr>
                </tbody>
              </table>
              <p className="tc-status" role="status">{`${state.n} tokens: “${textAt(state.n)}”`}</p>
            </>
          );
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true, n: Math.max(state.n, LONG), view: 'attn' })}>Grow it to {LONG} tokens</button>,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        window: () => (
          <>
            <Fact id="attention-budget" />
            <details className="tc-def">
              <summary>The maths (optional)</summary>
              <p>{`A prompt of n tokens has n × (n + 1) ÷ 2 attention pairs per head: the first token scores 1, the second 2, and so on up to n. That is about n² ÷ 2, so the pairs grow with n².`}</p>
              <Fact id="n-squared" />
            </details>
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
