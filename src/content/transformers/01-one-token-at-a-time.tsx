// Chapter 1: one token at a time. Larkspur mini reads a Larkspur sentence; the reader predicts the next token before
// the bar is shown, then adds the likeliest token and runs again, three times, to watch a reply grow one token at a
// time. The prediction's answer is read off the live trace (answerOf), never typed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { encode } from '../../lib/lm/bpe';
import { forward, softmax, type Model } from '../../lib/lm/model';
import { PROMPTS, trace } from '../../lib/transformers/trace';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { pieceLabel } from '../../components/scenes/attentionMap';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { Fact, TransformersStage, Waiting, useModel, whenLoaded, type View } from './kit';

const MODULE = 'transformers', ID = '01-one-token-at-a-time';
export const PROMPT = PROMPTS.find(p => p.id === 'reply')!;
/** The prediction's options: single tokens of Larkspur mini's vocabulary (a test holds that). */
export const PIECES = [' days', ' hours', ' business', ' the'];
/** How many tokens the reader adds, one run each. */
export const ADD = 3;
const LM = META.model;
const word = (p: string) => `“${p.trim()}”`;

/** The option the model rates likeliest after the prompt, read off its probabilities. */
export function answerOf(model: Model): number {
  const probs = softmax(forward(model, encode(PROMPT.text)).logits.at(-1)!);
  const p = PIECES.map(x => probs[encode(x)[0]]);
  return p.indexOf(Math.max(...p));
}

/** The prompt with the n likeliest tokens added, one run each. */
export function grown(model: Model, n: number): { text: string; added: string[] } {
  let text = PROMPT.text;
  const added: string[] = [];
  for (let i = 0; i < n; i++) { const t = trace(model, text).top.at(-1)![0].text; added.push(t); text += t; }
  return { text, added };
}

interface S { ran: boolean; p1: number | null; revealed: boolean; added: number; view: View; quiz: number | null }

const P1 = {
  question: `Larkspur mini has read “${PROMPT.text}”. Which of these will it rate likeliest to come next?`,
  options: PIECES.map(word),
};

const QUIZ = {
  question: `A colleague watches Larkspur mini finish “${PROMPT.text}” and says: “So it planned the rest of the sentence, then typed it out.” What do you tell them?`,
  options: [
    'Right: the model picks the whole reply first, then shows it token by token',
    'Not quite: each run gives probabilities for the next token only. One is added, and the model runs again on the longer text',
    'Not quite: the model looks the phrase up in Larkspur’s documents and copies it',
    'Right: tokens that always go together come out of one run',
  ],
  correct: 1,
  explanation: 'Each run of the model scores every token in its vocabulary for the next position only. A longer reply is that run repeated, one token added each time.',
  why: [
    'You watched each token come from its own run: the bar was recomputed after every token you added. Nothing beyond the next token exists until it is picked.',
    'Right. One run, one next token. The reply grows because the chosen token is added to the text and the model runs again.',
    'Larkspur mini keeps no copy of the documents, only numbers learned from them. It often says what the documents say because it learned their patterns, which is also why it can be wrong.',
    'Each token had its own run and its own bar. Tokens that often go together score high one after the other; they are still picked one at a time.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'run', focus: 'run', visibleControls: ['run'],
    narration: `Meet Larkspur mini. It is a model: about ${Math.round(LM.params / 1000)} thousand numbers, learned from Larkspur’s own documents and nothing else. The models behind real assistants are far bigger, but they do the same job, and this one is small enough to run in your browser. Every number in this module comes from it, live. Give it the start of a sentence from Larkspur’s support guide.`,
    predicate: whenLoaded(s => s.ran),
    hint: 'Press the button. If the model is still loading, wait for the picture to settle.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: `The prompt’s tokens stand in a row in the picture. The model’s one job is next-token prediction: from the tokens so far, give every token in its vocabulary (all ${LM.vocab} it knows) a probability of coming next. Before you see them:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal', focus: 'reveal', visibleControls: ['p1', 'reveal'],
    narration: 'Locked in. The probabilities show as a bar under the attention grid; you’ll meet the grid in chapter 3.',
    predicate: s => s.revealed,
  },
  {
    id: 'grow', focus: 'grow', visibleControls: ['out1', 'grow'],
    narration: `It only scored the next token. To write more, add the likeliest one to the text and run the model again on the longer text. Do it ${ADD} times, and watch the bar change after each.`,
    predicate: s => s.added >= ADD,
    hint: `Press “Add the likeliest token” ${ADD} times.`,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['grown', 'quiz'],
    narration: 'That is how every reply you have read from a model was written: one token, then the model runs again. Larkspur mini only knows what Larkspur’s documents taught it, so outside them it guesses badly; the bigger models do the same job with far more text behind them. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many tokens did each run of the model give you?',
  },
];

export default function OneTokenAtATime() {
  const { model } = useModel();
  const text = (s: S) => (model ? grown(model, s.added).text : PROMPT.text);
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ ran: false, p1: null, revealed: false, added: 0, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => (
        <TransformersStage prompt={state.ran ? text(state) : ''} view={state.view} onView={v => sync({ ...state, view: v })}
          caption={state.revealed ? 'The bar: the likeliest next tokens after the last one, from Larkspur mini.' : 'Larkspur mini: a tiny model, trained only on Larkspur’s documents.'} />
      )}
      controls={{
        run: ({ state, apply }) => (
          <>
            <button type="button" className="big" disabled={!model} onClick={() => apply({ ...state, ran: true })}>Read “{PROMPT.text}”</button>
            {!model && <Waiting />}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true, view: 'attn' })}>Show the probabilities</button>,
        out1: ({ state }) => model ? <Outcome {...P1} prediction={state.p1} outcome={answerOf(model)} /> : <Waiting />,
        grow: ({ state, apply }) => {
          if (!model) return <Waiting />;
          const next = trace(model, text(state)).top.at(-1)![0];
          return (
            <>
              <button type="button" className="big" disabled={state.added >= ADD} onClick={() => apply({ ...state, added: state.added + 1, view: 'attn' })}>
                Add the likeliest token ({pieceLabel(next.text)}) and run again
              </button>
              <p className="tc-status" role="status">{`Added ${state.added} of ${ADD}. The text now reads: “${text(state)}”`}</p>
            </>
          );
        },
        grown: ({ state }) => model ? <p className="tc-status">{`Larkspur mini wrote, one run per token: ${grown(model, state.added).added.map(t => `“${pieceLabel(t)}”`).join(', ')}.`}</p> : <Waiting />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
            <Fact id="transformer-paper" />
          </>
        ),
      }}
    />
  );
}
