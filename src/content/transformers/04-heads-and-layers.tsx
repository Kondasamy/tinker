// Chapter 4: heads and layers. The reader visits every head, predicts where one head looks from the end of a word,
// and finds it looks back to where the word began: the word-start head U8 measured (HEAD, data/transformers/
// prompts.json). They check it on other prompts with its live score, then see the residual stream: every layer adds to
// one running vector per token. Every weight and score is computed live from Larkspur mini.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { decode, encode } from '../../lib/lm/bpe';
import type { Model } from '../../lib/lm/model';
import { HEAD, PROMPTS, trace, wordStart } from '../../lib/transformers/trace';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { pieceLabel } from '../../components/scenes/attentionMap';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { Fact, TransformersStage, Waiting, useModel, whenLoaded, type View } from './kit';

const MODULE = 'transformers', ID = '04-heads-and-layers';
const LM = META.model;
/** The prompts the chapter offers (the long one is too wide a grid for a phone). A test holds the head on each. */
export const OFFERED = PROMPTS.filter(p => p.id !== 'long');
/** A prompt's text; an id no longer offered (a run saved before the list changed) falls back to the first. */
export const textOf = (id: string) => (OFFERED.find(p => p.id === id) ?? OFFERED[0]).text;
/** Every head, as [layer, head]. */
const HEADS = Array.from({ length: LM.n_layer * LM.n_head }, (_, i) => [Math.floor(i / LM.n_head), i % LM.n_head] as const);
const headId = (l: number, h: number) => `${l}-${h}`;
const headName = (l: number, h: number) => `Layer ${l + 1}, head ${h + 1}`;
const NAMED = headName(HEAD.layer, HEAD.head);
const TRY = 3;

/** The prediction: “named” in the success prompt, read as three tokens; the query is its last. */
export const PREDICT_PROMPT = OFFERED.find(p => p.id === 'success')!;
const IDS = encode(PREDICT_PROMPT.text), PIECES = IDS.map(id => decode([id]));
export const QUERY = PIECES.findIndex((p, i) => p === 'ed' && PIECES[i - 1] === 'am');
/** The keys the options name: where the word began, the token just before, the first token, itself. */
export const KEYS = [QUERY - 2, QUERY - 1, 0, QUERY];
/** Which option's key the named head weighs most, read off the trace. */
export function outcomeOf(m: Model): number {
  const row = trace(m, PREDICT_PROMPT.text).attention[HEAD.layer][HEAD.head][QUERY];
  const w = KEYS.map(k => row[k]);
  return w.indexOf(Math.max(...w));
}
/** The named head's word-start score on a prompt, against spreading evenly. */
export function scoreOf(m: Model, text: string) {
  const t = trace(m, text);
  return wordStart(t.tokens.map(x => x.id), t.attention[HEAD.layer][HEAD.head]);
}

const q = (i: number) => `“${pieceLabel(PIECES[i]).trim()}”`;
const P1 = {
  question: `${NAMED} is lit. The model reads “named” as three tokens: ${q(QUERY - 2)}, ${q(QUERY - 1)}, ${q(QUERY)}. Where does ${q(QUERY)} put most of its weight in this head?`,
  options: [
    `On ${q(QUERY - 2)}, where the word began`,
    `On ${q(QUERY - 1)}, the token just before it`,
    `On ${q(0)}, the first token of the prompt`,
    `On itself`,
  ],
};

const QUIZ = {
  question: 'A teammate wants Larkspur mini to notice whether an order number has come up earlier in a prompt. They say: “Nobody built a head for that, so it can’t.” What do you tell them?',
  options: [
    'Right: every head’s job is set by hand before training',
    'Not quite: no head’s job is set by hand. Training shapes each head to look for whatever helps predict the next token; whether one learned this, you check by looking at its weights',
    'Not quite: every head looks for everything, so one of them already does it',
    'Right: a head only ever looks at the token just before it',
  ],
  correct: 1,
  explanation: 'Heads aren’t assigned jobs. Each learns its own pattern from the training text, because that pattern helped predict the next token.',
  why: [
    'Nobody told the word-start head what to do. It found the start of the word because that helped Larkspur mini predict the next token.',
    'Right. Training shaped one head to find where the word began; another may learn something else, or nothing anyone can name. You find out by reading its weights, as you just did.',
    'Each head has one pattern of its own. You saw them differ on the same prompt: that is why a model has many.',
    `${NAMED} skipped the token just before and looked back to where the word began. Heads learn different patterns.`,
  ],
};

interface S { layer: number; head: number; heads: string[]; prompt: string; seen: string[]; p1: number | null; revealed: boolean; view: View; quiz: number | null }

export const STEPS: Step<S>[] = [
  {
    id: 'heads', focus: 'heads', visibleControls: ['heads'],
    narration: `One attention pattern can only look for one kind of thing. So each layer runs several side by side, called heads, each with its own weights. Larkspur mini has ${LM.n_layer} layers with ${LM.n_head} heads each: the desks in the engine room. Light every head on the same prompt and watch the threads change.`,
    predicate: whenLoaded(s => HEADS.every(([l, h]) => s.heads.includes(headId(l, h)))),
    hint: 'Press each head’s button once.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: 'Each head looked somewhere else. Now one head, one token, on a new prompt. Before you look:',
    setup: s => ({ ...s, prompt: PREDICT_PROMPT.id, layer: HEAD.layer, head: HEAD.head }),
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal', focus: 'reveal', visibleControls: ['p1', 'reveal'],
    narration: 'Locked in. See where its weight goes.',
    predicate: s => s.revealed,
  },
  {
    id: 'prompts', focus: 'prompts', visibleControls: ['out1', 'prompts'],
    narration: `Each head learns to look for something different; this one finds the start of the word. Nobody told it to: training shaped it, because knowing the whole word helps predict what comes next. Over every passage of Larkspur’s documents, a token in the middle of a word gives its word’s first token ${HEAD.score.toFixed(2)} of its weight in this head, where spreading evenly would give ${HEAD.uniform.toFixed(2)}. Check it on other prompts.`,
    predicate: s => s.seen.length >= TRY,
    hint: `Try ${TRY - 1} more prompts.`,
  },
  {
    id: 'stream', focus: 'stream', visibleControls: ['stream'],
    narration: `So many heads look for many things. How do their findings come together? Each token carries one running vector through the model, called the residual stream. It starts as the token’s embedding plus its position. Each layer’s heads read the stream, and what they find is added to it, not swapped in. Each layer reads what the ones below it added. At the end, the last token’s vector becomes the next-token scores. Light a desk on the top floor.`,
    predicate: s => s.layer === LM.n_layer - 1,
    hint: `Press a layer ${LM.n_layer} head.`,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'],
    narration: 'Larkspur mini is tiny: few heads, and a pattern you can name is rare. Bigger models stack many more layers and heads, built the same way. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who decided what the word-start head looks for?',
  },
];

function HeadButtons({ s, set }: { s: S; set: (l: number, h: number) => void }) {
  return (
    <div role="group" aria-label="Light a head" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {HEADS.map(([l, h]) => (
        <button key={headId(l, h)} type="button" className="chip" aria-pressed={s.layer === l && s.head === h} onClick={() => set(l, h)}>{headName(l, h)}</button>
      ))}
    </div>
  );
}

export default function HeadsAndLayers() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ layer: 0, head: 0, heads: [headId(0, 0)], prompt: OFFERED[0].id, seen: [], p1: null, revealed: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => (
        // on the prediction's prompt the picked token is the end of “named”; elsewhere the last token
        <TransformersStage prompt={textOf(state.prompt)} query={state.prompt === PREDICT_PROMPT.id ? QUERY : undefined}
          layer={state.layer} head={state.head} view={state.view} onView={v => sync({ ...state, view: v })}
          locked={state.prompt === PREDICT_PROMPT.id && state.p1 === null}
          caption="Each desk is one head. Weights computed live from Larkspur mini." />
      )}
      controls={{
        heads: ({ state, apply }) => model
          ? <HeadButtons s={state} set={(l, h) => apply({ ...state, layer: l, head: h, heads: [...new Set([...state.heads, headId(l, h)])] })} />
          : <Waiting />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true, layer: HEAD.layer, head: HEAD.head, prompt: PREDICT_PROMPT.id, seen: [PREDICT_PROMPT.id], view: 'attn' })}>Show {NAMED}’s weights</button>,
        out1: ({ state }) => model ? <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(model)} /> : <Waiting />,
        prompts: ({ state, apply }) => {
          if (!model) return <Waiting />;
          const w = scoreOf(model, textOf(state.prompt));
          return (
            <>
              <div role="group" aria-label="Pick a prompt" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {OFFERED.map(p => (
                  <button key={p.id} type="button" className="chip" aria-pressed={state.prompt === p.id}
                    onClick={() => apply({ ...state, prompt: p.id, layer: HEAD.layer, head: HEAD.head, seen: [...new Set([...state.seen, p.id])] })}>{p.text}</button>
                ))}
              </div>
              <p className="tc-status" role="status">{`On this prompt, ${NAMED} gives a word’s first token ${w.score.toFixed(2)} of a later token’s weight (spreading evenly: ${w.uniform.toFixed(2)}). Tried ${state.seen.length} of ${TRY}.`}</p>
            </>
          );
        },
        stream: ({ state, apply }) => (
          <>
            <ol className="tf-stream" aria-label="The residual stream of one token, bottom to top">
              <li>The token’s embedding + its position’s row</li>
              {Array.from({ length: LM.n_layer }, (_, l) => <li key={l} data-add>{`Layer ${l + 1}: what its ${LM.n_head} heads found, added`}</li>)}
              <li>The last token’s vector → a score for every token in the vocabulary</li>
            </ol>
            {model ? <HeadButtons s={state} set={(l, h) => apply({ ...state, layer: l, head: h, view: 'scene' })} /> : <Waiting />}
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
            <Fact id="base-size" />
          </>
        ),
      }}
    />
  );
}
