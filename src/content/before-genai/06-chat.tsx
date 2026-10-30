// Chapter 6: taught to follow instructions, at what-changed altitude (R15). One customer request, two replies: a base
// model's continuation and an instruction-tuned assistant's answer, both written for this site and labelled so (R13, as
// Post-training chapter 1 does). The reader predicts which reply the base model wrote; the reveal cites InstructGPT and
// ChatGPT. Post-training chapter 1 and Prompts chapter 1 go deeper.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { KIOSK_PARTS } from '../../components/scenes/kioskScene';
import { messageOf, run } from '../../lib/before-genai/bots';
import { fact } from '../../lib/before-genai/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { BeforeGenaiStage, type Deeper, Fact, GoDeeper } from './kit';

const MODULE = 'before-genai',
  ID = '06-chat';
export const PARTS = KIOSK_PARTS;
const REQUEST = messageOf('where-order'),
  IDLE = run(REQUEST);
export const DEEPER: readonly Deeper[] = [
  ['post-training', 0],
  ['prompts', 0],
];
/** The two replies, written for this site (not produced by a model); `base` marks the base model's continuation. */
export const REPLIES = [
  {
    name: 'Reply A',
    text: 'Sorry it hasn’t arrived yet. Your confirmation email has a tracking link, or send me your order number and I’ll tell you what to check next.',
    base: false,
  },
  {
    name: 'Reply B',
    text: 'Where is my refund? How do I change my address? Can I cancel an order? Our help centre answers the questions customers ask most.',
    base: true,
  },
];
export const WRITTEN =
  'Both replies were written for this site to show the difference, not produced by a model. The Post-training module runs a real one.';

export interface S {
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}
export const INITIAL: S = { p1: null, revealed: false, quiz: null };

export const P1 = {
  question: `A customer asks “${REQUEST.text}” Which reply did the base model write?`,
  options: REPLIES.map(r => r.name),
};
export const OUTCOME = REPLIES.findIndex(r => r.base);

export const QUIZ = {
  question: 'What turned a text continuer into an assistant like ChatGPT?',
  options: [
    'More training on requests paired with good answers',
    'A bigger model trained on more web text alone',
    'A list of fixed replies added on top',
  ],
  correct: 0,
  explanation: 'Instruction tuning trains the model on requests and good answers, so it answers instead of continuing.',
  why: [
    'Right: instruction tuning teaches it to answer, and people’s rankings refine those answers.',
    `Size alone still continues text; InstructGPT’s small tuned model beat GPT-3, about ${fact('instructgpt-small').value} times bigger.`,
    'That was the script; an assistant still writes each reply word by word.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['replies', 'p1'],
    narration:
      'A base model only continues text. Instruction tuning trains it further, on requests paired with good answers.',
    act: 'Predict which reply the base model wrote.',
    say: { block: 'model', text: 'Base or tuned?' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['replies', 'p1', 'reveal'],
    narration: 'Your pick is locked.',
    act: 'Show who wrote which.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'facts', 'deeper', 'quiz'],
    narration:
      'The base model carried on a help page. Instruction tuning taught answering, and ChatGPT put it in front of everyone.',
    act: 'One question to finish.',
    say: { block: 'model', text: 'Taught to answer' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What extra training did the assistant get?',
  },
];

export default function Chat() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={INITIAL}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <BeforeGenaiStage
          run={IDLE}
          say={say}
          caption={
            state.revealed
              ? `${REPLIES[OUTCOME].name} is the base model’s continuation; the other is the assistant’s answer.`
              : 'One request, two models: a base model and an instruction-tuned assistant.'
          }
        />
      )}
      controls={{
        replies: () => (
          <>
            <dl className="bg-transcript">
              <div className="bg-line customer">
                <dt>Customer</dt>
                <dd>
                  <q>{REQUEST.text}</q>
                </dd>
              </div>
              {REPLIES.map(r => (
                <div key={r.name} className="bg-line">
                  <dt>{r.name}</dt>
                  <dd>
                    <q>{r.text}</q>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="note">{WRITTEN}</p>
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.p1 === null ? null : P1.options[state.p1]}
            outcome={P1.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Show who wrote which"
          />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        facts: () => (
          <>
            <Fact id="instructgpt-small" />
            <Fact id="chatgpt" />
          </>
        ),
        deeper: () => <GoDeeper to={DEEPER} />,
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
