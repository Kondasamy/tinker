// Chapter 4: smaller numbers. Larkspur mini's weights are rounded to int8 and int4 in the browser (per-row absmax,
// dequantized, the forward pass unchanged); memory is counted from its shapes and held-out loss is computed live, a
// document at a time so the page keeps responding. The stage shows what the saving buys on the open model's server:
// the same 40 GB with smaller weights leaves more room for the KV cache.
import { useEffect, useMemo } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { encode } from '../../lib/lm/bpe';
import type { Model } from '../../lib/lm/model';
import { BITS, memory, quantize, top5Changes, type Bits } from '../../lib/inference/quantize';
import { OPEN, kvBytes } from '../../lib/inference/server';
import { OPEN_MODEL, fact } from '../../lib/inference/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { num } from '../../lib/format';
import P from '../../../data/inference/prompts.json' with { type: 'json' };
import { SERVE_PARTS } from '../../components/scenes/serveScene';
import { Fact, InferenceStage, ModelGate, modelNow, scoreNow, useHeldout } from './kit';

const MODULE = 'inference',
  ID = '04-smaller-numbers';
const PROMPTS = P.prompts.map(p => encode(p.text));
/** the open model on the cited 40 GB card: weights at `bits`, the rest left for the KV cache */
export const GPU_GB = Number(fact('a100-split').value);
export const weightsGB = (bits: Bits) => (OPEN_MODEL.params * bits) / 8 / 1e9;
export const roomGB = (bits: Bits) => GPU_GB - weightsGB(bits);
/** full-length requests the room holds */
export const fitsAt = (bits: Bits) => Math.floor((roomGB(bits) * 1e9) / kvBytes(OPEN, OPEN_MODEL.ctx));
/** the parts the serving floor can call out */
export const PARTS = SERVE_PARTS;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export const P1 = {
  question:
    'At 8 bits the weights take about half the memory. On held-out text Larkspur never trained on, its loss at 8 bits:',
  options: [
    'Rises a lot, more than 10%: half the bits, half the knowledge',
    'Barely moves, within 1%',
    'Falls: rounding cleans up noise',
  ],
};
/** which option the live scores match (undefined until both are computed) */
export function outcomeOf(): number | undefined {
  const a = scoreNow(16),
    b = scoreNow(8);
  if (!a || !b) return undefined;
  const r = b.loss / a.loss - 1;
  return r > 0.1 ? 0 : r < -0.01 ? 2 : r <= 0.01 ? 1 : 0;
}

export const QUIZ = {
  question:
    'A team wants to run its assistant on a smaller, cheaper card by storing the weights in 4 bits. What should it do before switching?',
  options: [
    'Nothing: 4 bits is a quarter of the memory, so it is four times better',
    'Run its own evals on the 4-bit model: the saving is certain, the cost in quality has to be measured on its own tasks',
    'Retrain the model from scratch in 4 bits',
    'Switch only the KV cache to 4 bits; the weights can’t be rounded',
  ],
  correct: 1,
  explanation:
    'Memory saved is arithmetic; what the rounding costs depends on the model and the task, so measure it, as you did on held-out text and the top 5.',
  why: [
    'The memory falls to a quarter, but the rounding is coarser: Larkspur mini’s loss rose and its top 5 changed at 4 bits.',
    'Right: the saving is known from the shapes, but the cost shows only when you measure (the Evals module).',
    'Quantization rounds trained weights after training; no retraining is needed, though methods like GPTQ and AWQ round more carefully.',
    'Weights round well, as you just saw; caches can be quantized too, but that is a separate choice.',
  ],
};

interface S {
  bits: Bits;
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'eight',
    focus: 'bits',
    visibleControls: ['bits'],
    narration: 'Quantization rounds each weight to one of a few levels, scaled per row to its largest weight.',
    act: 'Store them as int8: 8 bits.',
    predicate: s => !!modelNow('base') && s.bits === 8,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['bits', 'p1'],
    narration: 'About half the memory, counted from the shapes.',
    act: 'Predict the held-out loss.',
    say: { block: 'kv', text: 'More KV room' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'score',
    visibleControls: ['p1', 'score'],
    narration: 'Your pick is locked.',
    act: 'Score both on held-out text, in your browser.',
    predicate: s => s.revealed && !!scoreNow(8) && !!scoreNow(16),
  },
  {
    id: 'four',
    focus: 'bits',
    visibleControls: ['out1', 'bits'],
    narration: 'int8 keeps 255 levels per row, plenty for these weights. int4 keeps only 15.',
    act: 'Store them in 4 bits.',
    predicate: s => s.bits === 4,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bits', 'more', 'quiz'],
    narration:
      'A quarter of the memory, but the loss rises and top-5 picks change. A tiny model’s numbers: measure your own.',
    act: 'One question to finish.',
    say: { block: 'kv', text: 'Freed for cache' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which part of the trade is arithmetic, and which has to be measured?',
  },
];

/** Precision buttons and the live table: memory, held-out loss (computed in chunks) and the top 5 against 16 bits. */
function Bench({
  model,
  s,
  set,
  scoring,
  fixed = false,
  onScored,
}: {
  model: Model;
  s: S;
  set: (s: S) => void;
  scoring: boolean;
  fixed?: boolean;
  onScored?: () => void;
}) {
  const h = useHeldout(scoring ? model : undefined, s.bits),
    base = useHeldout(scoring ? model : undefined, 16);
  const m = memory(model, s.bits),
    m16 = memory(model, 16),
    busy = h.computing || base.computing,
    scored = scoring && !!h.score && !!base.score;
  // the scores arrive after the press: once both are in, the step is checked again
  useEffect(() => {
    if (scored) onScored?.();
  }, [scored]);
  const t5 = useMemo(() => top5Changes(model, quantize(model, s.bits), PROMPTS), [model, s.bits]);
  return (
    <>
      {!fixed && (
        <div className="in-row" role="group" aria-label="Weights stored in">
          {BITS.map(b => (
            <button
              key={b}
              type="button"
              className="chip"
              aria-pressed={s.bits === b}
              disabled={busy}
              onClick={() => set({ ...s, bits: b })}
            >
              {b} bits
            </button>
          ))}
        </div>
      )}
      <table className="tc-ledger" aria-busy={busy}>
        <caption>Larkspur mini, computed live in your browser</caption>
        <tbody>
          <tr>
            <th scope="row">Weight memory</th>
            <td>{`${num(m.bytes)} bytes (${Math.round((m.bytes / m16.bytes) * 100)}% of 16-bit)`}</td>
          </tr>
          <tr>
            <th scope="row">Top 5 next tokens kept, over {PROMPTS.length} prompts</th>
            <td>{`${t5.same} of ${t5.total}`}</td>
          </tr>
          {scoring && (
            <tr>
              <th scope="row">Held-out loss</th>
              <td>
                {h.score
                  ? `${h.score.loss.toFixed(3)}${s.bits !== 16 && base.score ? ` (${h.score.loss >= base.score.loss ? '+' : '−'}${pct(Math.abs(h.score.loss / base.score.loss - 1))} vs 16 bits)` : ''}`
                  : 'Scoring held-out text…'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {busy && (
        <p className="tc-status" role="status">
          Scoring held-out text, a document at a time…
        </p>
      )}
    </>
  );
}

export default function SmallerNumbers() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!modelNow('base')}
      initial={{ bits: 16, p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const fits = fitsAt(state.bits),
          drawn = Math.min(16, fits);
        return (
          <InferenceStage
            say={say}
            weights={['base']}
            show={() => ({
              scene: { seats: Array.from({ length: drawn }, () => 'decode' as const), queued: 0, kv: 1 },
              caption: `OPT-13B at ${state.bits} bits on a ${GPU_GB} GB card: weights ${weightsGB(state.bits).toFixed(1)} GB, leaving ${roomGB(state.bits).toFixed(1)} GB of KV room, ${fits} full-length requests at once${fits > drawn ? ` (${drawn} seats drawn)` : ''}.`,
            })}
          />
        );
      }}
      controls={{
        bits: ({ state, apply, sync, focused }) => (
          <ModelGate weights={['base']}>
            {m => <Bench model={m.base!} s={state} set={focused ? apply : sync} scoring={state.revealed} />}
          </ModelGate>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        score: ({ state, apply, sync }) => (
          <ModelGate weights={['base']}>
            {m => (
              <>
                {/* always 8 against 16, whatever precision the reader picked during the prediction: the step waits on both */}
                {state.revealed && (
                  <Bench
                    model={m.base!}
                    s={{ ...state, bits: 8 }}
                    set={() => {}}
                    scoring
                    fixed
                    onScored={() => sync({ ...state })}
                  />
                )}
                {!state.revealed && (
                  <button type="button" className="big" onClick={() => apply({ ...state, revealed: true })}>
                    Score both on held-out text
                  </button>
                )}
              </>
            )}
          </ModelGate>
        ),
        out1: ({ state }) => {
          const o = outcomeOf();
          return o === undefined ? null : <Outcome {...P1} prediction={state.p1} outcome={o} />;
        },
        more: () => (
          <>
            <Fact id="gptq" />
            <Fact id="awq" />
            <p className="note in-note">
              A model whose experts all sit in memory while only a few run:{' '}
              <a href="/mixture-of-experts/06-total-versus-active/">Mixture of experts</a>.
            </p>
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
