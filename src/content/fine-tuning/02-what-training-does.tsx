// Chapter 2: what training does, on Larkspur mini for real. The reader picks a question the style set never held and
// asks the base model (live, greedy, in the browser), predicts what the fine-tuned copy will write, swaps in its weights
// and reads the reply beside the old one, then opens the recorded loss curve of the run that made it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { fullCount, replyOf, signsOff, SIGNOFF, STYLE_PROMPTS } from '../../lib/fine-tuning/engine';
import { loss } from '../../components/scenes/lossChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { FineTuneStage, FINETUNE_SERIES, META, ModelGate, Reply, modelNow, type View } from './kit';

const MODULE = 'fine-tuning', ID = '02-what-training-does';
const RUN = META.finetune!, TRAINING = RUN.training as { styleExamples: number; steps: number; seed: number };
const CURVE = RUN.lossCurve, PARAMS = fullCount(META).toLocaleString('en-US');
/** what the reader sees of a prompt: the question, without the Q:/A: frame Larkspur mini was trained on */
export const asked = (p: string) => p.replace(/^Q: /, '').replace(/ A:$/, '');

interface S { prompt: number; asked: boolean; p1: number | null; swapped: boolean; curve: boolean; view: View; quiz: number | null }

const P1 = {
  question: `Now swap in the fine-tuned weights and ask the same question. It was not one of the ${TRAINING.styleExamples} training examples. What will it write?`,
  options: [
    'The same reply as before: the question didn’t change, so the answer won’t',
    `A reply that ends “${SIGNOFF}”`,
    'One of the training replies, word for word',
    'Nothing useful: it only answers the questions it trained on',
  ],
};

const QUIZ = {
  question: 'A team fine-tunes its assistant on 500 replies that all open with “Hi there!”. Afterwards it opens a reply to a brand-new question with “Hi there!”, with no instruction in the prompt. What changed?',
  options: [
    'The weights: training adjusted them until opening that way became the likely start',
    'The prompt: fine-tuning adds the instruction to every question behind the scenes',
    'The documents: the assistant looks up the 500 replies and copies their opening',
    'Nothing lasting: it will forget the habit when the conversation ends',
  ],
  correct: 0,
  explanation: 'Fine-tuning changes the weights, so the new habit comes with the model to every question, even ones it never saw.',
  why: [
    'Right. Training nudged the numbers inside the model until “Hi there!” became its most likely opening. Nothing extra is sent with the question.',
    'Fine-tuning sends nothing extra. Larkspur mini signed off with the same bare question as before; only its weights were swapped.',
    'A fine-tuned model doesn’t look anything up. The replies were used once, in training, and are not read again when it answers.',
    'The change is in the weights, which stay as trained until someone trains them again. It lasts across every conversation.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'ask', focus: 'ask', visibleControls: ['ask'],
    narration: `Meet Larkspur mini: a tiny language model that runs in your browser. It has ${PARAMS} weights, where the assistants people use have billions, and it was trained on Larkspur’s documents. Its numbers teach how training works; they are not any provider’s. It picks its most likely next piece each time, so the same weights always write the same reply. Pick a question and ask it.`,
    predicate: s => s.asked && !!modelNow('base'),
    hint: 'Press “Ask the base model”.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['before', 'p1'],
    narration: `That is the base model: no sign-off. The team then trained a copy on ${TRAINING.styleExamples} past support replies, each ending “${SIGNOFF}”. That is fine-tuning: training a model that already exists a little further, on your own examples. Before you try the copy:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'swap', focus: 'swap', visibleControls: ['before', 'p1', 'swap'],
    narration: 'Swap the weights. The question stays exactly as it was; only the numbers inside the model change.',
    predicate: s => s.swapped && !!modelNow('finetuned'),
  },
  {
    id: 'curve', focus: 'curve', visibleControls: ['after', 'curve'],
    narration: `The words in the question didn’t change; the model did. How did training get there? It ran ${TRAINING.steps} training steps. At each one the model read a batch of examples, measured its loss (how surprised it was by each next piece), and nudged its weights to be less surprised. The run was recorded when it was made, with a fixed seed.`,
    predicate: s => s.curve,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['curve', 'quiz'],
    narration: `Training loss fell from ${loss(CURVE[0].train)} to ${loss(CURVE.at(-1)!.train)}: the model became less surprised by Larkspur’s replies, sign-off included. The second line is text the model never trained on; chapter 5 comes back to it. One question to finish.`,
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
      stage={({ state, sync }) => {
        const w = state.swapped ? 'finetuned' : 'base';
        return (
          <FineTuneStage weights={w} view={state.view} onView={view => sync({ ...state, view })} show={m => ({
            scene: { lit: state.swapped ? 'weights' : null, weights: w },
            results: state.curve ? { series: FINETUNE_SERIES } : undefined,
            caption: !state.asked ? 'Larkspur mini on the bench, as first trained.'
              : `${state.swapped ? 'The fine-tuned copy' : 'The base model'}: “${replyOf(m!, STYLE_PROMPTS[state.prompt])}”`,
          })} />
        );
      }}
      controls={{
        ask: ({ state, sync }) => (
          <ModelGate weights="base">{() => (
            <>
              <div role="group" aria-label="Pick a question" className="ft-row">
                {STYLE_PROMPTS.map((p, i) => (
                  <button key={p} type="button" className="chip" aria-pressed={state.prompt === i} onClick={() => sync({ ...state, prompt: i, asked: false })}>{asked(p)}</button>
                ))}
              </div>
              <p><button type="button" className="big" onClick={() => sync({ ...state, asked: true })}>Ask the base model</button></p>
            </>
          )}</ModelGate>
        ),
        before: ({ state }) => <ModelGate weights="base">{m => <Reply who="Base model" prompt={STYLE_PROMPTS[state.prompt]} text={replyOf(m, STYLE_PROMPTS[state.prompt])} />}</ModelGate>,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        swap: ({ state, sync }) => (
          <ModelGate weights="finetuned">{() => (
            <button type="button" className="big" onClick={() => sync({ ...state, swapped: true })}>Swap in the fine-tuned weights</button>
          )}</ModelGate>
        ),
        after: ({ state }) => {
          const p = STYLE_PROMPTS[state.prompt];
          return (
            <ModelGate weights="base">{base => (
              <ModelGate weights="finetuned">{ft => (
                <>
                  <Outcome {...P1} prediction={state.p1} outcome={signsOff(replyOf(ft, p)) ? 1 : 0} />
                  <Reply who="Base model" prompt={p} text={replyOf(base, p)} />
                  <Reply who="Fine-tuned" prompt={p} text={replyOf(ft, p)} />
                </>
              )}</ModelGate>
            )}</ModelGate>
          );
        },
        curve: ({ state, sync }) => (
          <button type="button" className="chip" aria-pressed={state.curve} onClick={() => sync({ ...state, curve: true, view: 'results' })}>Show the training run</button>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
