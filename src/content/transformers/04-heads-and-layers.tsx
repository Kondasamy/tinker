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
import { ENGINE_PARTS } from '../../components/scenes/engineScene';
import { Fact, ToyNote, TransformersStage, Waiting, useModel, whenLoaded, type View } from './kit';

const MODULE = 'transformers',
  ID = '04-heads-and-layers';
const LM = META.model;
export const PARTS = ENGINE_PARTS;
/** The prompts the chapter offers (the long one is too wide a grid for a phone). A test holds the head on each. */
export const OFFERED = PROMPTS.filter(p => p.id !== 'long');
/** A prompt's text; an id no longer offered (a run saved before the list changed) falls back to the first. */
export const textOf = (id: string) => (OFFERED.find(p => p.id === id) ?? OFFERED[0]).text;
/** Every head, as [layer, head]. */
const HEADS = Array.from(
  { length: LM.n_layer * LM.n_head },
  (_, i) => [Math.floor(i / LM.n_head), i % LM.n_head] as const,
);
const headId = (l: number, h: number) => `${l}-${h}`;
const headName = (l: number, h: number) => `Layer ${l + 1}, head ${h + 1}`;
const NAMED = headName(HEAD.layer, HEAD.head);
const TRY = 3;

/** The prediction: “named” in the success prompt, read as three tokens; the query is its last. */
export const PREDICT_PROMPT = OFFERED.find(p => p.id === 'success')!;
const IDS = encode(PREDICT_PROMPT.text),
  PIECES = IDS.map(id => decode([id]));
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
  return wordStart(
    t.tokens.map(x => x.id),
    t.attention[HEAD.layer][HEAD.head],
  );
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

export const QUIZ = {
  question:
    'A teammate wants Larkspur mini to notice whether an order number has come up earlier in a prompt. They say: “Nobody built a head for that, so it can’t.” What do you tell them?',
  options: [
    'Right: every head’s job is set by hand before training',
    'Not quite: no head’s job is set by hand. Training shapes each head to look for whatever helps predict the next token; whether one learned this, you check by looking at its weights',
    'Not quite: every head looks for everything, so one of them already does it',
    'Right: a head only ever looks at the token just before it',
  ],
  correct: 1,
  explanation:
    'Heads aren’t assigned jobs. Each learns its own pattern from the training text, because that pattern helped predict the next token.',
  why: [
    'Nobody told the word-start head what to do; it found the start of the word because that helped predict the next token.',
    'Right: training shapes each head, and you find out what one learned by reading its weights, as you just did.',
    'Each head has one pattern of its own, and you saw them differ on the same prompt.',
    `${NAMED} skipped the token just before and looked back to where the word began.`,
  ],
};

interface S {
  layer: number;
  head: number;
  heads: string[];
  prompt: string;
  seen: string[];
  p1: number | null;
  revealed: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'heads',
    focus: 'heads',
    visibleControls: ['heads'],
    narration: `Each layer runs heads side by side, each with its own weights: ${LM.n_layer} layers of ${LM.n_head} heads, one per desk.`,
    act: 'Light every head.',
    say: { block: 'head', text: 'One head' },
    predicate: whenLoaded(s => HEADS.every(([l, h]) => s.heads.includes(headId(l, h)))),
    hint: 'Press each head’s button once.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Each head looked somewhere else. Now one head, one token, a new prompt.',
    act: 'Predict first.',
    say: { block: 'query', text: 'Word’s end' },
    setup: s => ({ ...s, prompt: PREDICT_PROMPT.id, layer: HEAD.layer, head: HEAD.head }),
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: 'See where its weight goes.',
    predicate: s => s.revealed,
  },
  {
    id: 'prompts',
    focus: 'prompts',
    visibleControls: ['out1', 'roles', 'prompts'],
    narration: `This head finds where the word began; training shaped it. Over Larkspur’s documents: ${HEAD.score.toFixed(2)} of the weight, versus ${HEAD.uniform.toFixed(2)} spread evenly.`,
    act: 'Check other prompts.',
    predicate: s => s.seen.length >= TRY,
    hint: `Try ${TRY - 1} more prompts.`,
  },
  {
    id: 'stream',
    focus: 'stream',
    visibleControls: ['stream'],
    narration:
      'Each token carries one running vector, the residual stream. Every layer adds what it found instead of replacing it.',
    act: 'Light a top-floor desk.',
    say: { block: 'layer-2', text: 'Adds on top' },
    predicate: s => s.layer === LM.n_layer - 1,
    hint: `Press a layer ${LM.n_layer} head.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration:
      'Larkspur mini is tiny, so a nameable pattern is rare. Bigger models stack more layers and heads, built the same way.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who decided what the word-start head looks for?',
  },
];

function HeadButtons({ s, set }: { s: S; set: (l: number, h: number) => void }) {
  return (
    <div role="group" aria-label="Light a head" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {HEADS.map(([l, h]) => (
        <button
          key={headId(l, h)}
          type="button"
          className="chip"
          aria-pressed={s.layer === l && s.head === h}
          onClick={() => set(l, h)}
        >
          {headName(l, h)}
        </button>
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
      initial={{
        layer: 0,
        head: 0,
        heads: [headId(0, 0)],
        prompt: OFFERED[0].id,
        seen: [],
        p1: null,
        revealed: false,
        view: 'scene',
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        // on the prediction's prompt the picked token is the end of “named”; elsewhere the last token
        <TransformersStage
          say={say}
          prompt={textOf(state.prompt)}
          query={state.prompt === PREDICT_PROMPT.id ? QUERY : undefined}
          layer={state.layer}
          head={state.head}
          view={state.view}
          onView={v => sync({ ...state, view: v })}
          locked={state.prompt === PREDICT_PROMPT.id && state.p1 === null}
          caption="Each desk is one head. Weights computed live from Larkspur mini."
        />
      )}
      controls={{
        heads: ({ state, apply }) =>
          model ? (
            <HeadButtons
              s={state}
              set={(l, h) =>
                apply({ ...state, layer: l, head: h, heads: [...new Set([...state.heads, headId(l, h)])] })
              }
            />
          ) : (
            <Waiting />
          ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            onClick={() =>
              apply({
                ...state,
                revealed: true,
                layer: HEAD.layer,
                head: HEAD.head,
                prompt: PREDICT_PROMPT.id,
                seen: [PREDICT_PROMPT.id],
                view: 'attn',
              })
            }
          >
            Show {NAMED}’s weights
          </button>
        ),
        out1: ({ state }) =>
          model ? <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(model)} /> : <Waiting />,
        roles: () => <Fact id="voita-heads" />,
        prompts: ({ state, apply }) => {
          if (!model) return <Waiting />;
          const w = scoreOf(model, textOf(state.prompt));
          return (
            <>
              <div role="group" aria-label="Pick a prompt" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {OFFERED.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="chip"
                    aria-pressed={state.prompt === p.id}
                    onClick={() =>
                      apply({
                        ...state,
                        prompt: p.id,
                        layer: HEAD.layer,
                        head: HEAD.head,
                        seen: [...new Set([...state.seen, p.id])],
                      })
                    }
                  >
                    {p.text}
                  </button>
                ))}
              </div>
              <p
                className="tc-status"
                role="status"
              >{`On this prompt, ${NAMED} gives a word’s first token ${w.score.toFixed(2)} of a later token’s weight (spreading evenly: ${w.uniform.toFixed(2)}). Tried ${state.seen.length} of ${TRY}.`}</p>
            </>
          );
        },
        stream: ({ state, apply }) => (
          <>
            <ol className="tf-stream" aria-label="The residual stream of one token, bottom to top">
              <li>The token’s embedding + its position’s row</li>
              {Array.from({ length: LM.n_layer }, (_, l) => (
                <li key={l} data-add>{`Layer ${l + 1}: what its ${LM.n_head} heads found, added`}</li>
              ))}
              <li>The last token’s vector → a score for every token in the vocabulary</li>
            </ol>
            <p className="note in-note">
              Each layer’s small calculation, split among many experts:{' '}
              <a href="/mixture-of-experts/01-one-big-kitchen/">Mixture of experts</a>.
            </p>
            {model ? (
              <HeadButtons s={state} set={(l, h) => apply({ ...state, layer: l, head: h, view: 'scene' })} />
            ) : (
              <Waiting />
            )}
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
            <Fact id="base-size" />
            <Fact id="llama3-shape" />
            <ToyNote />
          </>
        ),
      }}
    />
  );
}
