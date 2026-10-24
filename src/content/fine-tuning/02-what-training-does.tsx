// Chapter 2: what training does, on Larkspur mini for real. The reader picks a question the style set never held and
// asks the base model (live, greedy, in the browser), predicts what the fine-tuned copy will write, swaps in its weights
// and reads the reply beside the old one, then opens the recorded loss curve of the run that made it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { fullCount, replyOf, signsOff, SIGNOFF, STYLE_PROMPTS } from '../../lib/fine-tuning/engine';
import { loss } from '../../components/scenes/lossChart';
import { TRAIN_PARTS } from '../../components/scenes/trainScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { FineTuneStage, FINETUNE_SERIES, META, ModelGate, Reply, modelNow, type View } from './kit';

const MODULE = 'fine-tuning',
  ID = '02-what-training-does';
const RUN = META.finetune!,
  TRAINING = RUN.training as { styleExamples: number; steps: number; seed: number };
const CURVE = RUN.lossCurve,
  PARAMS = fullCount(META).toLocaleString('en-US');
/** what the reader sees of a prompt: the question, without the Q:/A: frame Larkspur mini was trained on */
export const asked = (p: string) => p.replace(/^Q: /, '').replace(/ A:$/, '');
/** the picked prompt; a saved index past the list (a run saved before the list shrank) falls back to the first */
export const promptAt = (i: number) => STYLE_PROMPTS[i] ?? STYLE_PROMPTS[0];

interface S {
  prompt: number;
  asked: boolean;
  p1: number | null;
  swapped: boolean;
  curve: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `Now swap in the fine-tuned weights and ask the same question. It was not one of the ${TRAINING.styleExamples} training examples. What will it write?`,
  options: [
    'The same reply as before: the question didn’t change, so the answer won’t',
    `A reply that ends “${SIGNOFF}”`,
    'One of the training replies, word for word',
    'Nothing useful: it only answers the questions it trained on',
  ],
};

export const QUIZ = {
  question:
    'A team fine-tunes its assistant on 500 replies that all open with “Hi there!”. Afterwards it opens a reply to a brand-new question with “Hi there!”, with no instruction in the prompt. What changed?',
  options: [
    'The weights: training adjusted them until opening that way became the likely start',
    'The prompt: fine-tuning adds the instruction to every question behind the scenes',
    'The documents: the assistant looks up the 500 replies and copies their opening',
    'Nothing lasting: it will forget the habit when the conversation ends',
  ],
  correct: 0,
  explanation:
    'Fine-tuning changes the weights, so the new habit comes with the model to every question, even ones it never saw.',
  why: [
    'Right: training nudged the numbers inside the model until “Hi there!” became its likeliest opening, with nothing extra sent.',
    'Fine-tuning sends nothing extra: Larkspur mini signed off on the same bare question, with only its weights swapped.',
    'A fine-tuned model looks nothing up: the replies were used once, in training, and are not read again.',
    'The change lives in the weights, which stay as trained across every conversation until someone trains them again.',
  ],
};

/** the bench's parts a callout can point at (the Results tab, the loss chart, takes none) */
export const PARTS = TRAIN_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: `Larkspur mini has ${PARAMS} weights, not billions: the base model, before any fine-tuning.`,
    act: 'Pick a question and ask it.',
    say: { block: 'model', text: 'As first trained' },
    predicate: s => s.asked && !!modelNow('base'),
    hint: 'Press “Ask the base model”.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['before', 'p1'],
    narration: `No sign-off. The team trained a copy on ${TRAINING.styleExamples} past replies, each a training example ending “${SIGNOFF}”.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'swap',
    focus: 'swap',
    visibleControls: ['before', 'p1', 'swap'],
    narration: 'The question stays exactly as it was; only the numbers inside the model change.',
    act: 'Swap in the fine-tuned weights.',
    say: { block: 'model', text: 'Only this moves' },
    predicate: s => s.swapped && !!modelNow('finetuned'),
  },
  {
    id: 'curve',
    focus: 'curve',
    visibleControls: ['after', 'curve'],
    narration: `Same question, new reply: the model changed. Training ran ${TRAINING.steps} training steps, each nudging the weights to lower the loss.`,
    act: 'Show the training run.',
    say: { block: 'model', text: 'New weights' },
    predicate: s => s.curve,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['curve', 'quiz'],
    narration: `The recorded run: training loss fell from ${loss(CURVE[0].train)} to ${loss(CURVE.at(-1)!.train)}. The second line, unseen text, returns in chapter 5.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Was anything added to the question when the fine-tuned copy signed off?',
  },
];

export default function WhatTrainingDoes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ prompt: 0, asked: false, p1: null, swapped: false, curve: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const w = state.swapped ? 'finetuned' : 'base';
        return (
          <FineTuneStage
            weights={w}
            view={state.view}
            onView={view => sync({ ...state, view })}
            say={say}
            show={m => ({
              scene: { lit: state.swapped ? 'weights' : null, weights: w },
              results: state.curve ? { series: FINETUNE_SERIES } : undefined,
              caption: !state.asked
                ? 'Larkspur mini, as first trained: a teaching model, its numbers not any provider’s.'
                : `${state.swapped ? 'The fine-tuned copy' : 'The base model'}: “${replyOf(m!, promptAt(state.prompt))}”`,
            })}
          />
        );
      }}
      controls={{
        ask: ({ state, sync }) => (
          <ModelGate weights="base">
            {() => (
              <>
                <div role="group" aria-label="Pick a question" className="ft-row">
                  {STYLE_PROMPTS.map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      className="chip"
                      aria-pressed={state.prompt === i}
                      onClick={() => sync({ ...state, prompt: i, asked: false })}
                    >
                      {asked(p)}
                    </button>
                  ))}
                </div>
                <p>
                  <button type="button" className="big" onClick={() => sync({ ...state, asked: true })}>
                    Ask the base model
                  </button>
                </p>
              </>
            )}
          </ModelGate>
        ),
        before: ({ state }) => (
          <ModelGate weights="base">
            {m => <Reply who="Base model" prompt={promptAt(state.prompt)} text={replyOf(m, promptAt(state.prompt))} />}
          </ModelGate>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        swap: ({ state, sync }) => (
          <ModelGate weights="finetuned">
            {() => (
              <button type="button" className="big" onClick={() => sync({ ...state, swapped: true })}>
                Swap in the fine-tuned weights
              </button>
            )}
          </ModelGate>
        ),
        after: ({ state }) => {
          const p = promptAt(state.prompt);
          return (
            <ModelGate weights="base">
              {base => (
                <ModelGate weights="finetuned">
                  {ft => (
                    <>
                      <Outcome {...P1} prediction={state.p1} outcome={signsOff(replyOf(ft, p)) ? 1 : 0} />
                      <Reply who="Base model" prompt={p} text={replyOf(base, p)} />
                      <Reply who="Fine-tuned" prompt={p} text={replyOf(ft, p)} />
                    </>
                  )}
                </ModelGate>
              )}
            </ModelGate>
          );
        },
        curve: ({ state, sync }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.curve}
            onClick={() => sync({ ...state, curve: true, view: 'results' })}
          >
            Show the training run
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
