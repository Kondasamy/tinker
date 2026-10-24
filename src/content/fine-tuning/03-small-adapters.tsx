// Chapter 3: small adapters. Every count on screen is computed from Larkspur mini's real shapes (meta.json): what a full
// fine-tune trains, and what LoRA trains beside each attention matrix (rank × (in + out)). The reader predicts the share,
// clips the adapter on, and asks the adapted model a question live: it signs off too.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { adaptedMatrices, fullCount, loraCount, replyOf, signsOff, STYLE_PROMPTS } from '../../lib/fine-tuning/engine';
import { TRAIN_PARTS } from '../../components/scenes/trainScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, FineTuneStage, META, ModelGate, Reply, modelNow, type View } from './kit';

const MODULE = 'fine-tuning',
  ID = '03-small-adapters';
const n = (x: number) => x.toLocaleString('en-US');
export const FULL = fullCount(META),
  LORA = loraCount(META),
  RANK = META.lora!.rank,
  MATRICES = adaptedMatrices(META);
export const SHARE = LORA / FULL;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const PROMPT = STYLE_PROMPTS[0];

interface S {
  counted: boolean;
  p1: number | null;
  clipped: boolean;
  tried: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `LoRA leaves those ${n(FULL)} weights as they are. Beside each of the ${MATRICES.length} attention matrices it adds two thin matrices, rank ${RANK}, and trains only those. What share of the model’s size will it train?`,
  options: ['More than a quarter', 'Between 10% and 25%', 'Between 1% and 10%', 'Under 1%'],
};
/** the option the computed share falls in */
export const shareOption = (x: number) => (x > 0.25 ? 0 : x >= 0.1 ? 1 : x >= 0.01 ? 2 : 3);

export const QUIZ = {
  question:
    'Larkspur wants three styles: one for customers, one for suppliers, one for staff. Why might the team train three LoRA adapters rather than three full fine-tunes?',
  options: [
    'Adapters are always more accurate than a full fine-tune',
    'Each adapter is a small file beside one shared base model, so the three cost a fraction of three whole copies',
    'An adapter needs no training examples',
    'A full fine-tune can only learn one style in its life',
  ],
  correct: 1,
  explanation:
    'An adapter trains a small share of the weights and leaves the base as it was, so one base model can wear many adapters.',
  why: [
    'Not always: an adapter trains far fewer weights and can learn less, so its win is size, not accuracy.',
    'Right: the base stays shared and unchanged, and each style is only its adapter, small to store and quick to swap.',
    'An adapter is trained like any fine-tune, on examples of the replies you want, just with fewer weights.',
    'A full fine-tune can be retrained on another style, but each one is a whole copy of the model.',
  ],
};

/** the bench's parts a callout can point at */
export const PARTS = TRAIN_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'count',
    focus: 'count',
    visibleControls: ['count'],
    narration: 'Chapter 2 changed every weight: a full fine-tune, whose result is a whole new copy of the model.',
    act: 'Count what it trained.',
    say: { block: 'model', text: 'Every weight' },
    predicate: s => s.counted,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['total', 'p1'],
    narration: 'LoRA freezes the model and trains a small adapter beside it.',
    act: 'Predict the share first.',
    say: { block: 'model', text: 'Stays frozen' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'clip',
    focus: 'clip',
    visibleControls: ['p1', 'clip'],
    narration: 'The counts come from the model’s real shapes, worked out in your browser.',
    act: 'Clip the adapter onto the model.',
    predicate: s => s.clipped && !!modelNow('lora'),
  },
  {
    id: 'try',
    focus: 'try',
    visibleControls: ['counts', 'try'],
    narration: `Each matrix gets two thin ones, rank ${RANK}, so LoRA trains ${RANK} × (in + out) weights per matrix.`,
    act: 'Ask with the adapter on.',
    say: { block: 'adapter', text: `Rank ${RANK}` },
    predicate: s => s.tried && !!modelNow('lora'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['reply', 'scale', 'quiz'],
    narration:
      'The adapter learnt the sign-off; unclip it and the untouched base is back. On real models the gap is far bigger:',
    act: 'One question to finish.',
    say: { block: 'adapter', text: 'Signs off' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What stays the same when you swap one adapter for another?',
  },
];

export default function SmallAdapters() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ counted: false, p1: null, clipped: false, tried: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <FineTuneStage
          say={say}
          weights={state.clipped ? 'lora' : undefined}
          show={m => ({
            scene: { lit: state.counted ? 'weights' : null, weights: state.clipped ? 'lora' : 'base' },
            caption:
              state.tried && m
                ? `Base + adapter: “${replyOf(m, PROMPT)}”`
                : state.clipped
                  ? `The adapter is clipped on: ${n(LORA)} trained weights beside ${n(FULL)} frozen ones.`
                  : state.counted
                    ? `A full fine-tune trains all ${n(FULL)} weights.`
                    : 'Larkspur mini on the bench.',
          })}
        />
      )}
      controls={{
        count: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, counted: true })}>
            Count the weights a full fine-tune trains
          </button>
        ),
        total: () => (
          <p className="tc-status" role="status">
            A full fine-tune trains all <strong>{n(FULL)}</strong> weights, and saves a new {n(META.bytes)}-byte copy of
            the model.
          </p>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        clip: ({ state, sync }) => (
          <ModelGate weights="lora">
            {() => (
              <button type="button" className="big" onClick={() => sync({ ...state, clipped: true })}>
                Clip on the adapter
              </button>
            )}
          </ModelGate>
        ),
        counts: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={shareOption(SHARE)} />
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>Trained weights per attention matrix (rank {RANK})</caption>
              <thead>
                <tr>
                  <th scope="col">Matrix</th>
                  <th scope="col">Shape</th>
                  <th scope="col">Full</th>
                  <th scope="col">LoRA</th>
                </tr>
              </thead>
              <tbody>
                {MATRICES.map(m => (
                  <tr key={m.name}>
                    <th scope="row">{m.name}</th>
                    <td>
                      {m.out} × {m.in}
                    </td>
                    <td>{n(m.out * m.in)}</td>
                    <td>{n(RANK * (m.in + m.out))}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Whole model</th>
                  <td />
                  <td>{n(FULL)}</td>
                  <td>
                    {n(LORA)} ({pct(SHARE)})
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="tc-status">
              The adapter file is {n(META.lora!.bytes)} bytes; the fully fine-tuned copy is {n(META.bytes)}.
            </p>
          </>
        ),
        try: ({ state, sync }) => (
          <ModelGate weights="lora">
            {() => (
              <button type="button" className="big" onClick={() => sync({ ...state, tried: true })}>
                Ask with the adapter: “{PROMPT.replace(/^Q: /, '').replace(/ A:$/, '')}”
              </button>
            )}
          </ModelGate>
        ),
        reply: () => (
          <ModelGate weights="lora">
            {m => (
              <>
                <Reply who="Base + adapter" prompt={PROMPT} text={replyOf(m, PROMPT)} />
                <p className="tc-status">
                  {signsOff(replyOf(m, PROMPT)) ? 'It signs off,' : 'It does not sign off,'} with {pct(SHARE)} of the
                  model’s size trained.
                </p>
              </>
            )}
          </ModelGate>
        ),
        scale: () => <Fact id="lora-savings" />,
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
