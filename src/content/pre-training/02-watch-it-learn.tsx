// Chapter 2: watch it learn. The reader predicts how the last checkpoint will finish the prompt, scrubs the shelf of
// checkpoints (each fetched on demand and run live), and opens the training loss the run recorded at each one.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { LAST, PROMPTS, STEPS as SHELF, checkpoint, says } from '../../lib/pre-training/engine';
import { FORGE_PARTS } from '../../components/scenes/forgeScene';
import { loss } from '../../components/scenes/lossChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { CKPT_SERIES, CkptGate, Fact, PreTrainingStage, Says, StepRange, ToyNote, type View } from './kit';
import { PROMPT } from './01-before-training';

const MODULE = 'pre-training',
  ID = '02-watch-it-learn';
const N = LAST.toLocaleString('en-US');
/** the step a saved run shows; one no longer on the shelf falls back to step 0 */
export const stepOf = (s: { step: number }) => (SHELF.includes(s.step) ? s.step : 0);

interface S {
  p1: number | null;
  step: number;
  curve: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `At step ${N}, how will it finish “${PROMPTS[PROMPT].text}”?`,
  options: [
    'Still with noise, like step 0: a tiny model can’t learn much',
    'With words that read like Larkspur’s documents',
    'With a sentence copied word for word from one document',
  ],
};

export const QUIZ = {
  question:
    'A team watches its model’s training loss drop steadily over a week-long run. What does the falling loss tell them?',
  options: [
    'The model is getting less surprised by each next piece of its training text',
    'The model now answers every question correctly',
    'The model is adding more weights as it trains',
    'The model has stored a copy of every document it read',
  ],
  correct: 0,
  explanation: 'Loss measures surprise at the real next piece; each training step nudges the weights to lower it.',
  why: [
    'Right: loss is the average surprise at the next piece, and training pushes it down step by step.',
    'Lower surprise on average is not the same as right answers, and the loss here is on training text only.',
    'The number of weights is fixed when the model is built; training changes their values, never their count.',
    'Weights are far too few to hold a copy of everything, so the model learns patterns rather than the files.',
  ],
};

/** the foundry's parts a callout can point at (the Loss tab takes none) */
export const PARTS = FORGE_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The run made ${N} training steps. Each one nudged the weights so the next guess came out a little better.`,
    act: 'Predict first.',
    say: { block: 'furnace', text: 'Training steps' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'scrub',
    focus: 'scrub',
    visibleControls: ['scrub', 'said'],
    narration: 'Every checkpoint on the shelf runs live. Watch the same prompt change as the weights do.',
    act: 'Drag to the last checkpoint.',
    say: { block: 'shelf', text: 'Saved copies' },
    predicate: s => stepOf(s) === LAST,
    hint: 'Drag the slider all the way right, or press End.',
  },
  {
    id: 'curve',
    focus: 'curve',
    visibleControls: ['said', 'outcome', 'curve'],
    narration: 'From noise to Larkspur’s kind of sentence. The run tracked how far each guess was off.',
    act: 'Show the loss.',
    say: { block: 'model', text: 'Trained' },
    predicate: s => s.curve,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['curve', 'quiz'],
    narration: `Training loss fell from ${loss(checkpoint(0).train.loss)} at step 0 to ${loss(checkpoint(LAST).train.loss)}: less surprise at each next piece.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What is loss a measure of, and on which text?',
  },
];

export default function WatchItLearn() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, step: 0, curve: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const step = stepOf(state);
        return (
          <PreTrainingStage
            step={step}
            view={state.view}
            onView={view => sync({ ...state, view })}
            say={say}
            show={m => ({
              scene: { step },
              chart: state.curve ? { series: CKPT_SERIES.slice(0, 1) } : undefined,
              caption: `Step ${step}: “${PROMPTS[PROMPT].text}${says(m!, PROMPT)}”`,
            })}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        scrub: ({ state, sync }) => (
          <StepRange
            id="pt-scrub"
            steps={SHELF}
            value={stepOf(state)}
            label="Checkpoint"
            valueText={s => `step ${s}`}
            onChange={step => sync({ ...state, step })}
          />
        ),
        said: ({ state }) => (
          <CkptGate step={stepOf(state)}>
            {m => <Says who={`Step ${stepOf(state)}`} prompt={PROMPT} text={says(m, PROMPT)} live />}
          </CkptGate>
        ),
        outcome: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={1} />
            <Fact id="pythia-checkpoints" />
            <ToyNote />
          </>
        ),
        curve: ({ state, sync }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.curve}
            onClick={() => sync({ ...state, curve: true, view: 'chart' })}
          >
            Show the loss
          </button>
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
