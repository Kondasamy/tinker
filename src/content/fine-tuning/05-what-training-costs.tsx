// Chapter 5: what training costs you. Forgetting, measured live: the page fetches all three of Larkspur mini's weight
// sets on load, and each score is the held-out loss computed in the browser over five documents no run trained on.
// The reader scores the base, predicts which fine-tune forgets most, scores both, and reads the rise against the base
// beside the recorded held-out curves. The general finding is cited (Biderman 2024, Kirkpatrick 2017), not claimed.
import { useEffect } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { HELDOUT, heldoutScore } from '../../lib/fine-tuning/engine';
import { loss, type Series } from '../../components/scenes/lossChart';
import type { Weights } from '../../lib/lm/load';
import { TRAIN_PARTS, type TuneWeights } from '../../components/scenes/trainScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, FineTuneStage, META, ModelGate, ToyNote, loadModel, modelNow, type View } from './kit';

const MODULE = 'fine-tuning',
  ID = '05-what-training-costs';
const ALL: TuneWeights[] = ['base', 'finetuned', 'lora'];
const NAME: Record<TuneWeights, string> = {
  base: 'Base model',
  finetuned: 'Full fine-tune',
  lora: 'Base + adapter (LoRA)',
};
const EXAMPLES = (META.finetune!.training as { styleExamples: number }).styleExamples;
const DOCS = HELDOUT.docs.length,
  TOKENS = HELDOUT.ids.reduce((n, d) => n + d.length, 0);
/** the held-out line of each recorded run: how the score moved while it trained */
export const HELDOUT_SERIES: Series[] = [
  {
    id: 'full',
    label: 'Full, held-out',
    points: META.finetune!.lossCurve.map(p => ({ step: p.step, loss: p.heldout })),
  },
  { id: 'lora', label: 'LoRA, held-out', points: META.lora!.lossCurve.map(p => ({ step: p.step, loss: p.heldout })) },
];

/** a set of weights' held-out loss, once its file is in */
const lossOf = (w: Weights) => {
  const m = modelNow(w);
  return m ? heldoutScore(m).loss : undefined;
};
const signed = (x: number) => `${x >= 0 ? '+' : '−'}${loss(Math.abs(x))}`;

interface S {
  base: boolean;
  p1: number | null;
  scored: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `Both fine-tunes trained on the same ${EXAMPLES} replies and never saw these documents. Score them on the same held-out text. Which one’s held-out loss rises more over the base model?`,
  options: [
    'The full fine-tune: it changed every weight',
    'The adapter: its few weights had to change more',
    'Neither: neither one gets worse; the style set never touched these documents',
  ],
};
/** read off the three live losses: which fine-tune's held-out loss rose most over the base, if any rose */
export function forgetOutcome(base: number, full: number, lora: number) {
  if (full <= base && lora <= base) return 2;
  return full - base >= lora - base ? 0 : 1;
}

export const QUIZ = {
  question:
    'A team fully fine-tunes its assistant on 2,000 legal replies. The replies sound right, but it now answers general product questions worse than before. What is the cheapest next thing to try?',
  options: [
    'Train longer on the legal replies, so the model settles',
    'Train a small adapter instead and compare both on held-out general questions before choosing',
    'Nothing can help: every fine-tune forgets this much',
    'Add “don’t forget the products” to the prompt',
  ],
  correct: 1,
  explanation:
    'An adapter changes fewer weights, so it usually learns less and forgets less; measuring both on held-out questions shows the trade.',
  why: [
    'More training on the narrow set usually pulls the weights further from what they knew, so the held-out loss keeps rising.',
    'Right: score both on held-out questions, as this chapter did, since an adapter often keeps more of the base model’s skills.',
    'Forgetting varies with how much training changes: a small adapter, fewer steps or mixing general examples back in all forget less.',
    'An instruction can’t restore weights that training moved, and the model doesn’t know what it lost.',
  ],
};

/** the bench's parts a callout can point at */
export const PARTS = TRAIN_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'base',
    focus: 'base',
    visibleControls: ['heldout', 'base'],
    narration: `Held-out text: ${DOCS} documents no run trained on. Its score is the average loss: lower is better.`,
    act: 'Score the base model.',
    say: { block: 'model', text: 'Scores held-out' },
    predicate: s => s.base && lossOf('base') !== undefined,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['baseScore', 'p1'],
    narration:
      'That is the base model’s score, computed in your browser. The full fine-tune changed every weight; the adapter, a small share.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'score',
    focus: 'score',
    visibleControls: ['p1', 'score'],
    narration: 'Same text, same scoring, for both fine-tunes.',
    act: 'Score both fine-tunes.',
    say: { block: 'model', text: 'Both fine-tunes' },
    predicate: s => s.scored && lossOf('finetuned') !== undefined && lossOf('lora') !== undefined,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['scores', 'facts', 'quiz'],
    narration: `Both fine-tunes predict Larkspur’s documents worse, the adapter least: training on ${EXAMPLES} replies pulled the weights away. That is forgetting.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which choice measures the trade before committing to it?',
  },
];

/** the three live scores, with each fine-tune's rise over the base */
function Scores() {
  return (
    <ModelGate weights="base">
      {() => (
        <ModelGate weights="finetuned">
          {() => (
            <ModelGate weights="lora">
              {() => {
                const b = lossOf('base')!;
                return (
                  <table className="tc-ledger" style={{ marginTop: 10 }} data-scores>
                    <caption>Held-out loss, computed in your browser</caption>
                    <thead>
                      <tr>
                        <th scope="col">Weights</th>
                        <th scope="col">Held-out loss</th>
                        <th scope="col">Against the base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALL.map(w => {
                        const l = lossOf(w)!;
                        return (
                          <tr key={w} data-weights={w}>
                            <th scope="row">{NAME[w]}</th>
                            <td>{loss(l)}</td>
                            <td>{w === 'base' ? '—' : signed(l - b)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              }}
            </ModelGate>
          )}
        </ModelGate>
      )}
    </ModelGate>
  );
}

export default function WhatTrainingCosts() {
  // fetch all three weight sets on load, so the chapter plays on with the network gone
  useEffect(() => {
    for (const w of ALL) loadModel(w).catch(() => {});
  }, []);
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ base: false, p1: null, scored: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const w: Weights = state.scored ? 'finetuned' : 'base',
          b = lossOf('base'),
          f = lossOf('finetuned'),
          l = lossOf('lora');
        return (
          <FineTuneStage
            weights={w}
            view={state.view}
            onView={view => sync({ ...state, view })}
            say={say}
            show={() => ({
              scene: { lit: state.scored ? 'weights' : null, weights: w },
              results: state.scored ? { series: HELDOUT_SERIES } : undefined,
              caption:
                state.scored && b !== undefined && f !== undefined && l !== undefined
                  ? `Held-out loss: base ${loss(b)}, full fine-tune ${loss(f)} (${signed(f - b)}), adapter ${loss(l)} (${signed(l - b)}). Larkspur mini’s numbers, not a provider’s.`
                  : state.base && b !== undefined
                    ? `The base model scores ${loss(b)} on the held-out text.`
                    : 'Larkspur mini on the bench, with the held-out documents beside it.',
            })}
          />
        );
      }}
      controls={{
        heldout: () => (
          <div className="tc-def">
            <p className="lbl">Held-out documents ({TOKENS} pieces in all, the score averages over each)</p>
            <p>{HELDOUT.docs.join(', ')}</p>
          </div>
        ),
        base: ({ state, sync }) => (
          <ModelGate weights="base">
            {() => (
              <button type="button" className="big" onClick={() => sync({ ...state, base: true })}>
                Score the base model
              </button>
            )}
          </ModelGate>
        ),
        baseScore: () => (
          <ModelGate weights="base">
            {m => (
              <p className="tc-status" role="status">
                Base model: held-out loss <strong>{loss(heldoutScore(m).loss)}</strong>.
              </p>
            )}
          </ModelGate>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        score: ({ state, sync }) => (
          <ModelGate weights="finetuned">
            {() => (
              <ModelGate weights="lora">
                {() => (
                  <button
                    type="button"
                    className="big"
                    onClick={() => sync({ ...state, scored: true, view: 'results' })}
                  >
                    Score both fine-tunes
                  </button>
                )}
              </ModelGate>
            )}
          </ModelGate>
        ),
        scores: ({ state }) => {
          const b = lossOf('base'),
            f = lossOf('finetuned'),
            l = lossOf('lora');
          return (
            <>
              {b !== undefined && f !== undefined && l !== undefined && (
                <Outcome {...P1} prediction={state.p1} outcome={forgetOutcome(b, f, l)} />
              )}
              <Scores />
            </>
          );
        },
        facts: () => (
          <>
            <Fact id="lora-learns-less" />
            <Fact id="catastrophic-forgetting" />
            <ToyNote />
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
