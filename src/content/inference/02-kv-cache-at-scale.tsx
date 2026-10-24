// Chapter 2: the KV cache at scale. One step recaps Transformers chapter 6 (Larkspur mini's cache, from costs.ts) and
// links it; then the same count on the open model's published shape, multiplied over a server's requests. Every number
// is computed from the shapes; the room comes from the cited A100 split.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { costs } from '../../lib/transformers/costs';
import { OPEN, MEMORY, kvBytes } from '../../lib/inference/server';
import { OPEN_MODEL } from '../../lib/inference/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { num } from '../../lib/format';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { SERVE_PARTS } from '../../components/scenes/serveScene';
import { Fact, InferenceStage } from './kit';

const MODULE = 'inference',
  ID = '02-kv-cache-at-scale';
const LM = META.model,
  B = 2;
/** Larkspur mini's whole window, and the open model's longest request */
export const MINI_BYTES = costs(LM, LM.ctx).kv * B;
export const PER_TOKEN = kvBytes(OPEN, 1),
  PER_REQUEST = kvBytes(OPEN, OPEN_MODEL.ctx);
/** the KV room the server keeps (GB), and how many full-length requests it holds */
export const ROOM = MEMORY.at(-1)!;
export const FITS = Math.floor((ROOM * 1e9) / PER_REQUEST);
/** the requests-in-flight slider */
export const COUNTS = [1, 2, 4, 8, 12, 16];
/** the parts the serving floor can call out */
export const PARTS = SERVE_PARTS;
const gb = (b: number) => `${(b / 1e9).toFixed(1)} GB`,
  kb = (b: number) => `${num(Math.round(b / 1024))} KB`;

export const P1 = {
  question: `Each ${num(OPEN_MODEL.ctx)}-token request holds ${gb(PER_REQUEST)} of cache. The server keeps ${ROOM} GB for the KV cache. How many such requests fit at once?`,
  options: ['Hundreds: the cache is small next to the model', `About ${FITS}`, 'About 50'],
};
export const outcomeOf = () => (FITS < 20 && FITS > 4 ? 1 : FITS >= 100 ? 0 : 2);

export const QUIZ = {
  question:
    'Larkspur doubles the context its assistant may read, from 2,000 tokens to 4,000. On the same server, what happens to the number of long conversations it can hold at once?',
  options: [
    'About halves: each conversation’s cache doubles, and the room stays the same',
    'No change: the cache is part of the model, which hasn’t changed',
    'It doubles: longer context means the model works faster per token',
    'It drops to a quarter, as attention’s pairs grow with the square of the length',
  ],
  correct: 0,
  explanation:
    'The cache grows with the tokens: twice the tokens, twice the cache per conversation, so about half as many fit in the same room.',
  why: [
    'Right: the cache keeps a key and a value per token per layer, so it grows in step with the length.',
    'The cache isn’t the weights: every conversation holds its own, sized by its own tokens.',
    'Longer context makes each conversation bigger, not faster.',
    'The square is the attention work from Transformers chapter 6, while the cache grows in step with the length.',
  ],
};

interface S {
  recap: boolean;
  scaled: boolean;
  p1: number | null;
  n: number;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'recap',
    focus: 'recap',
    visibleControls: ['recap'],
    narration: 'Every layer keeps a key and a value for every token read: the KV cache.',
    act: 'Count Larkspur mini’s cache.',
    say: { block: 'kv', text: 'Keys and values' },
    predicate: s => s.recap,
  },
  {
    id: 'scale',
    focus: 'recap',
    visibleControls: ['recap'],
    narration: `${kb(MINI_BYTES)}: nothing. The team’s server runs OPT-13B, an open model with a published shape.`,
    act: 'Run the same count on it.',
    predicate: s => s.scaled,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['recap', 'p1'],
    narration: 'Each request in flight holds its own cache in the KV room.',
    act: 'Predict how many fit.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'fill',
    visibleControls: ['p1', 'fill'],
    narration: 'Your pick is locked.',
    act: 'Fill the server until the KV shelf is full, then go one past.',
    say: { block: 'kv', text: 'One cache each' },
    predicate: s => s.n > FITS,
    hint: `Move the slider past ${FITS} requests.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'waste', 'quiz'],
    narration: `${FITS} full-length requests fill the room: memory, not compute, caps how many the server holds. The rest wait in the queue.`,
    act: 'One question to finish.',
    say: { block: 'queue', text: 'Waiting for room' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How does the cache grow with the number of tokens?',
  },
];

export default function KvCacheAtScale() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ recap: false, scaled: false, p1: null, n: 1, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const n = state.p1 === null ? 1 : state.n,
          used = n * PER_REQUEST,
          fit = Math.min(n, FITS);
        return (
          <InferenceStage
            say={say}
            show={() => ({
              scene: {
                seats: Array.from({ length: Math.max(FITS, n) }, (_, i) => (i < fit ? 'decode' : 'empty')),
                queued: Math.max(0, n - FITS),
                kv: Math.min(1, used / (ROOM * 1e9)),
              },
              caption: `${n} request${n === 1 ? '' : 's'} of ${num(OPEN_MODEL.ctx)} tokens: ${gb(Math.min(used, FITS * PER_REQUEST))} of cache in a ${ROOM} GB room${n > FITS ? `; ${n - FITS} wait for room` : ''}.`,
            })}
          />
        );
      }}
      controls={{
        recap: ({ state, apply }) => (
          <>
            <table className="tc-ledger">
              <caption>
                KV cache, counted from each model’s shape: layers × 2 (key and value) × d_model × tokens × 2 bytes
              </caption>
              <tbody>
                {state.recap && (
                  <tr>
                    <th scope="row">{`Larkspur mini (${LM.n_layer} layers, d_model ${LM.d_model}), ${LM.ctx} tokens`}</th>
                    <td>{kb(MINI_BYTES)}</td>
                  </tr>
                )}
                {state.scaled && (
                  <tr>
                    <th scope="row">{`OPT-13B (${OPEN_MODEL.n_layer} layers, d_model ${num(OPEN_MODEL.d_model)}), 1 token`}</th>
                    <td>{kb(PER_TOKEN)}</td>
                  </tr>
                )}
                {state.scaled && (
                  <tr>
                    <th scope="row">{`OPT-13B, ${num(OPEN_MODEL.ctx)} tokens`}</th>
                    <td>{gb(PER_REQUEST)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {!state.recap && (
              <button type="button" className="big" onClick={() => apply({ ...state, recap: true })}>
                Count Larkspur mini’s cache
              </button>
            )}
            {state.recap && !state.scaled && (
              <button type="button" className="big" onClick={() => apply({ ...state, scaled: true })}>
                Count it for OPT-13B
              </button>
            )}
            {!state.scaled && (
              <p className="tc-status">
                Recap:{' '}
                <a href="/transformers/06-why-long-prompts-cost-more/">
                  Transformers chapter 6, why long prompts cost more
                </a>
                .
              </p>
            )}
            {state.scaled && <Fact id="opt-13b" />}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        fill: ({ state, apply }) => {
          const i = Math.max(0, COUNTS.indexOf(state.n));
          return (
            <div className="in-range">
              <label htmlFor="in-n">{`Requests in flight: ${state.n}`}</label>
              <input
                id="in-n"
                type="range"
                min={0}
                max={COUNTS.length - 1}
                step={1}
                value={i}
                aria-valuetext={`${state.n} requests`}
                onChange={e => apply({ ...state, n: COUNTS[Number(e.target.value)] })}
              />
              <p
                className="tc-status"
                role="status"
              >{`${gb(state.n * PER_REQUEST)} of cache wanted; the room is ${ROOM} GB.${state.n > FITS ? ` ${state.n - FITS} don’t fit and wait.` : ''}`}</p>
            </div>
          );
        },
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="kv-800kb" />
            <Fact id="a100-split" />
          </>
        ),
        waste: () => (
          <>
            <Fact id="kv-waste" />
            <Fact id="paged-attention" />
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
