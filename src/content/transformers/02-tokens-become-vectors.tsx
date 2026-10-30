// Chapter 2: tokens become vectors. A token id picks a row of Larkspur mini's embedding table; a position picks a row
// of its position table; the model starts from their sum. The reader looks up one token, predicts whether its two
// copies in a prompt start as the same numbers, and sees both sums. Every number is read off the loaded weights.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { encode } from '../../lib/lm/bpe';
import type { Model } from '../../lib/lm/model';
import { PROMPTS } from '../../lib/transformers/trace';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { pieceLabel } from '../../components/scenes/attentionMap';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { ENGINE_PARTS } from '../../components/scenes/engineScene';
import { Fact, ToyNote, TransformersStage, Waiting, useModel, whenLoaded } from './kit';

const MODULE = 'transformers',
  ID = '02-tokens-become-vectors';
export const PROMPT = PROMPTS.find(p => p.id === 'long')!;
export const PIECE = ' business';
const IDS = encode(PROMPT.text),
  PIECE_ID = encode(PIECE)[0];
/** Where the piece sits in the prompt: two places (a test holds that). */
export const COPIES = IDS.flatMap((id, t) => (id === PIECE_ID ? [t] : []));
const LM = META.model;
export const PARTS = ENGINE_PARTS;
const W = `“${PIECE.trim()}”`;

const row = (m: Model, name: string, r: number) =>
  Array.from(m.tensors[name].subarray(r * LM.d_model, (r + 1) * LM.d_model));
/** The three rows the model adds up for the token at position t: its embedding, its position's row, and the sum. */
export function inputOf(m: Model, t: number) {
  const token = row(m, 'wte.weight', IDS[t]),
    position = row(m, 'wpe.weight', t);
  return { token, position, sum: token.map((v, i) => v + position[i]) };
}
/** 0 if the two copies start as the same numbers, 1 if they don't: read off the weights. */
export const outcomeOf = (m: Model) => {
  const [a, b] = COPIES.map(t => inputOf(m, t).sum);
  return a.every((v, i) => v === b[i]) ? 0 : 1;
};

const peak = (v: number[]) => Math.max(...v.map(Math.abs)) || 1;
/** A vector as a strip of cells, one per number: warm for positive, cool for negative, paler nearer zero. Strips that
 * are compared share one `max`, so a small row looks small. */
function Vec({ v, label, max = peak(v) }: { v: number[]; label: string; max?: number }) {
  return (
    <figure className="tf-vecfig">
      <div
        className="tf-vec"
        style={{ gridTemplateColumns: `repeat(${v.length}, 1fr)` }}
        role="img"
        aria-label={`${label}: ${v.length} numbers, starting ${v
          .slice(0, 4)
          .map(x => x.toFixed(2))
          .join(', ')}`}
      >
        {v.map((x, i) => (
          <span
            key={i}
            style={{
              background: `color-mix(in srgb, var(${x >= 0 ? '--tomato-m' : '--cobalt-m'}) ${Math.round((100 * Math.abs(x)) / max)}%, var(--card))`,
            }}
          />
        ))}
      </div>
      <figcaption>
        {label}{' '}
        <span className="tf-nums">
          {v
            .slice(0, 3)
            .map(x => x.toFixed(2))
            .join(', ')}
          , …
        </span>
      </figcaption>
    </figure>
  );
}

interface S {
  looked: boolean;
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

const P1 = {
  question: `${W} is in this prompt twice: token ${COPIES[0] + 1} and token ${COPIES[1] + 1}. When the model starts reading, are the two copies the same ${LM.d_model} numbers?`,
  options: [
    `The same: the same token always looks up the same row`,
    `Different: the model adds a row for where each copy sits`,
    `Different: each copy is first changed by the words around it`,
  ],
};

export const QUIZ = {
  question:
    'Two prompts: “refund the order, not the shipping” and “refund the shipping, not the order”. Same tokens, different order. Suppose the model had no position rows. What would the vectors it starts from say about which word came first?',
  options: [
    'Nothing: “order” starts as the same vector in both prompts, wherever it sits',
    'Which came first: each token’s row already holds its place',
    'Which came first: each vector is shaped by its neighbours before the model starts',
  ],
  correct: 0,
  explanation:
    'A token’s row in the embedding table is the same wherever it sits. Only the position row, added to it, puts the place into the numbers the model starts from.',
  why: [
    'Right: the table has one row per token, not per place, so only the added position row tells two places apart.',
    `You saw ${W} look up one row for both copies, so the difference came only from the position rows.`,
    'Nothing mixes tokens before the model starts; they read each other only later, in attention (chapter 3).',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'look',
    focus: 'look',
    visibleControls: ['look', 'size'],
    narration: `Larkspur mini swaps each id for a vector of ${LM.d_model} numbers: a row of its table, the token’s embedding.`,
    act: 'Look one up.',
    say: { block: 'query', text: 'This token' },
    predicate: whenLoaded(s => s.looked),
    hint: 'Press the button. If the model is still loading, wait for the picture to settle.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['row', 'p1'],
    narration: `That strip is ${W}’s embedding: warm cells above zero, cool below. ${W} sits in this prompt twice.`,
    act: 'Predict first.',
    say: { block: 'query', text: 'First copy' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: 'Show what each copy starts from.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'sums', 'quiz'],
    narration:
      'Same token row, plus a different position row: the position embedding. Without it, a prompt would be a bag of tokens.',
    act: 'One question to finish.',
    say: { block: 'query', text: 'Second copy' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a token’s row in the embedding table say where the token sits?',
  },
];

export default function TokensBecomeVectors() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ looked: false, p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <TransformersStage
          say={say}
          prompt={PROMPT.text}
          query={COPIES[state.revealed ? 1 : 0]}
          caption={`${W} is token ${COPIES[0] + 1} and token ${COPIES[1] + 1}. Numbers from Larkspur mini’s own weights.`}
        />
      )}
      controls={{
        look: ({ state, apply }) => (
          <>
            <button type="button" className="big" disabled={!model} onClick={() => apply({ ...state, looked: true })}>
              Look up {W}
            </button>
            {!model && <Waiting />}
          </>
        ),
        size: () => (
          <>
            <Fact id="llama3-shape" />
            <ToyNote />
          </>
        ),
        row: () => (model ? <Vec v={inputOf(model, COPIES[0]).token} label={`${W}’s embedding`} /> : <Waiting />),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true })}>
            Show both copies
          </button>
        ),
        out1: ({ state }) =>
          model ? <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(model)} /> : <Waiting />,
        sums: () =>
          model ? (
            <div className="tf-copies">
              {COPIES.map(t => {
                const v = inputOf(model, t),
                  max = Math.max(peak(v.token), peak(v.position), peak(v.sum));
                return (
                  <div key={t}>
                    <p className="lbl">{`${pieceLabel(PIECE)} as token ${t + 1}`}</p>
                    <Vec v={v.token} max={max} label="Its token row" />
                    <Vec v={v.position} max={max} label={`+ position ${t + 1}’s row`} />
                    <Vec v={v.sum} max={max} label="= what the model starts from" />
                  </div>
                );
              })}
            </div>
          ) : (
            <Waiting />
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
            <Fact id="rope" />
            <p className="note">
              Larkspur mini learns one row per position. Llama 3 uses rotations instead, so the toy stops matching here.
            </p>
          </>
        ),
      }}
    />
  );
}
