// Chapter 7, the workbench: trace any prompt the reader types through Larkspur mini, stage by stage: its tokens, their
// vectors, every head's attention and the next token. They predict what a prompt longer than the window loses, and
// see the oldest tokens struck through. The stage's tab is kept in the step state (view, onView). Every number is
// computed live; the typed text only ever renders as React text.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import type { Model } from '../../lib/lm/model';
import { PROMPTS, trace } from '../../lib/transformers/trace';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { pieceLabel } from '../../components/scenes/attentionMap';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { ENGINE_PARTS } from '../../components/scenes/engineScene';
import { CTX, Fact, PromptInput, TransformersStage, Waiting, piecesOf, useModel, whenLoaded, type View } from './kit';

const MODULE = 'transformers',
  ID = '07-trace-a-prompt';
const LM = META.model;
export const PARTS = ENGINE_PARTS;
const HEADS = Array.from(
  { length: LM.n_layer * LM.n_head },
  (_, i) => [Math.floor(i / LM.n_head), i % LM.n_head] as const,
);
const headName = (l: number, h: number) => `Layer ${l + 1}, head ${h + 1}`;
/** The text the box starts with. */
export const START = PROMPTS.find(p => p.id === 'billing')!.text;
/** A prompt longer than the window, from the chapter prompts (a test holds that it is). */
export const LONG = PROMPTS.filter(p => p.id === 'long' || p.id === 'success')
  .map(p => p.text)
  .join(' ');

/** What a prompt loses: 0 the model reads all of it, 1 the oldest tokens are dropped, 2 the newest are. Read off the
 * tokens the trace says the model read, never typed. */
export function outcomeOf(m: Model, text: string): number {
  const read = trace(m, text)
      .tokens.map(t => t.text)
      .join(''),
    { pieces } = piecesOf(text);
  return read === pieces.join('') ? 0 : read === pieces.slice(-CTX).join('') ? 1 : 2;
}

interface S {
  text: string;
  traced: string;
  layer: number;
  head: number;
  layers: number[];
  view: View;
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

const P1 = {
  question: `You trace a prompt of more than ${CTX} tokens. What does Larkspur mini do with it?`,
  options: [
    'It reads all of it: the window only limits the reply',
    `It drops the oldest tokens and reads the last ${CTX}`,
    `It reads the first ${CTX} and drops the rest`,
    'It refuses the prompt',
  ],
};

export const QUIZ = {
  question:
    'A customer pastes a long complaint into Larkspur’s chat. The order number is in the first line; the question “where is it?” is in the last. The whole message is longer than the window, and the oldest tokens are dropped. What can the model use?',
  options: [
    'Everything: it read the whole message once, when it arrived',
    'The question, but not the order number: the first line was dropped before the model ran',
    'The order number, but not the question: the model reads from the start until the window is full',
    'Nothing: an over-long message is rejected',
  ],
  correct: 1,
  explanation:
    'The model only ever reads what is in its window. When the oldest tokens are dropped to make room, whatever they said is gone for this run.',
  why: [
    'There is no reading outside the window: each run reads only the tokens in it.',
    'Right: with the oldest tokens dropped, the first line is never read, so put what matters near the end.',
    'This setup drops from the start, as Larkspur mini does: you watched its first tokens get struck through.',
    'Larkspur mini doesn’t refuse but runs on the last tokens; other systems may reject or trim.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'type',
    focus: 'prompt',
    visibleControls: ['prompt'],
    narration: `The box counts tokens live; the model reads at most ${CTX}.`,
    act: 'Type a prompt, or keep this one, and trace it.',
    say: { block: 'layer-1', text: 'Waiting for text' },
    predicate: whenLoaded(s => s.traced !== ''),
    hint: 'Type something in the box, then press “Trace it”.',
  },
  {
    id: 'follow',
    focus: 'follow',
    visibleControls: ['prompt', 'follow'],
    narration: 'Follow it through: tokens, vectors, attention in every head, then the next token.',
    act: 'Light a head in each layer, then open the Attention tab.',
    say: { block: 'head', text: 'Lit head' },
    predicate: s =>
      s.view === 'attn' && Array.from({ length: LM.n_layer }, (_, l) => l).every(l => s.layers.includes(l)),
    hint: 'Press a layer 1 head and a layer 2 head, and open the Attention tab above the picture.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Now a prompt longer than ${CTX} tokens.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: 'Trace a long one.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'prompt', 'follow', 'quiz'],
    narration:
      'That is truncation: the struck-through tokens never reach the model; the picture holds only the last ones.',
    act: 'One question to finish the module.',
    say: { block: 'layer-1', text: `Reads last ${CTX}` },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which tokens were struck through in the box?',
  },
];

export default function TraceAPrompt() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{
        text: START,
        traced: '',
        layer: 0,
        head: 0,
        layers: [],
        view: 'scene',
        p1: null,
        revealed: false,
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <TransformersStage
          say={say}
          prompt={state.traced}
          layer={state.layer}
          head={state.head}
          view={state.view}
          onView={v => sync({ ...state, view: v })}
          caption={state.traced ? 'Your prompt, traced live through Larkspur mini.' : 'Type a prompt and trace it.'}
        />
      )}
      controls={{
        prompt: ({ state, sync }) => (
          <>
            <PromptInput value={state.text} onChange={text => sync({ ...state, text })} />
            <button
              type="button"
              className="big"
              disabled={!model || !state.text.trim()}
              onClick={() => sync({ ...state, traced: state.text })}
            >
              Trace it
            </button>
            {!model && <Waiting />}
          </>
        ),
        follow: ({ state, sync }) => {
          if (!model || !state.traced) return model ? null : <Waiting />;
          const t = trace(model, state.traced),
            top = t.top.at(-1)?.[0];
          return (
            <>
              <ol className="tf-trace" aria-label="The trace, stage by stage">
                <li>{`Tokens: the model reads ${t.tokens.length} of ${CTX}${t.truncated ? `; ${piecesOf(state.traced).cut} older ones were dropped` : ''}.`}</li>
                <li>{`Vectors: each token becomes ${LM.d_model} numbers, its embedding plus its position’s row.`}</li>
                <li>{`Attention: ${LM.n_layer} layers of ${LM.n_head} heads, each adding what it found to the residual stream. Lit: ${headName(state.layer, state.head)}.`}</li>
                <li>
                  {top
                    ? `Next token: ${pieceLabel(top.text)}, at ${top.p.toFixed(2)}.`
                    : 'Next token: nothing to predict.'}
                </li>
              </ol>
              <div role="group" aria-label="Light a head" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {HEADS.map(([l, h]) => (
                  <button
                    key={`${l}-${h}`}
                    type="button"
                    className="chip"
                    aria-pressed={state.layer === l && state.head === h}
                    onClick={() => sync({ ...state, layer: l, head: h, layers: [...new Set([...state.layers, l])] })}
                  >
                    {headName(l, h)}
                  </button>
                ))}
              </div>
            </>
          );
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            onClick={() => apply({ ...state, revealed: true, text: LONG, traced: LONG, view: 'scene' })}
          >
            Trace a prompt longer than the window
          </button>
        ),
        out1: ({ state }) =>
          model ? <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(model, LONG)} /> : <Waiting />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
            <Fact id="transformer-explainer" />
          </>
        ),
      }}
    />
  );
}
