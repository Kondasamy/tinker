// Chapter 1: base or assistant. The refund question, answered by a base model's continuation and by an assistant's
// answer (both written for this site), then Fine-tuning's real style fine-tune recapped in one step: Larkspur mini and its
// fine-tuned copy write live replies in the browser. The prediction is read off the live reply.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { REFUND, bestOf, question, refOf } from '../../lib/post-training/graders';
import { STYLE_PROMPTS, replyOf, signsOff } from '../../lib/fine-tuning/engine';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ModelGate, Reply, modelNow } from '../fine-tuning/kit';
import { EXAM_PARTS } from '../../components/scenes/examScene';
import { AnswerCard, Asked, Fact, PostStage, TOY, cardsOf } from './kit';

const MODULE = 'post-training',
  ID = '01-base-or-assistant';
export const PARTS = EXAM_PARTS;
const BASE = question(REFUND).candidates.findIndex(c => c.base),
  BEST = bestOf(REFUND),
  REF = refOf(REFUND);
/** the prompt both Larkspur minis answer: one the style set never saw */
export const PROMPT = STYLE_PROMPTS[0];

interface S {
  asked: boolean;
  p1: number | null;
  sft: boolean;
  quiz: number | null;
}

export const P1 = {
  question:
    'Fine-tuning showed Larkspur mini a few hundred replies people wrote, each ending with a sign-off. Ask it a new question. What changes?',
  options: [
    'It replies in the examples’ style, sign-off and all',
    'Nothing: only more web text changes a model',
    'It now knows every fact in those replies perfectly',
  ],
};
/** read off the live reply: the fine-tuned copy signs off and the base doesn't */
export const outcome = (base: string, tuned: string) => (signsOff(tuned) && !signsOff(base) ? 0 : 1);

export const QUIZ = {
  question:
    'A base model is given “What is the capital of France?” and writes “What is the capital of Spain? What is the capital of Italy?”. Why?',
  options: [
    'It continues the text like a quiz page: nothing has taught it to answer',
    'It doesn’t know the answer',
    'It is broken and must be trained again from scratch',
  ],
  correct: 0,
  explanation: 'A base model continues documents; answering is a habit post-training adds.',
  why: [
    'Right: lists of questions are common on the web, so continuing the list is the likeliest next text.',
    'It has very likely read the answer many times; knowing a fact and answering with it are different habits.',
    'Nothing is broken: this is exactly what next-word training produces, and post-training builds on it.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['asked', 'ask'],
    narration: 'A customer asks about refunds. A base model continues text: it learnt only to guess the next words.',
    act: 'Press Ask the base model.',
    say: { block: 'model', text: 'A base model' },
    predicate: s => s.asked,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['answers', 'p1'],
    narration: 'It carried on the FAQ page. Post-training is what turns a base model into an assistant.',
    act: 'Predict first.',
    say: { block: 'cards', text: 'More questions' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sft',
    focus: 'sft',
    visibleControls: ['p1', 'sft'],
    narration: 'Its first step is supervised fine-tuning, which the Fine-tuning module ran for real on Larkspur mini.',
    act: 'Press Ask both Larkspur minis.',
    predicate: s => s.sft && !!modelNow('base') && !!modelNow('finetuned'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['replies', 'quiz'],
    narration:
      'Examples teach a style. Next, the model learns from verdicts on its drafts: people’s picks, then graders.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What kind of text does a base model learn from?',
  },
];

export default function BaseOrAssistant() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: false, p1: null, sft: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <PostStage
          say={say}
          shown={{
            hall: { cards: cardsOf(REFUND, REF), lit: state.asked ? BASE : undefined },
            caption: state.asked
              ? `Answer ${question(REFUND).candidates[BASE].id} is the base model’s continuation; ${question(REFUND).candidates[BEST].id} is the answer an assistant should give.`
              : 'The exam hall: the model, a stack of cards per written answer as tall as its odds, and a grader’s desk.',
          }}
        />
      )}
      controls={{
        asked: () => (
          <>
            <Asked q={REFUND} />
            <p className="note">{TOY}</p>
          </>
        ),
        ask: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, asked: true })}>
            Ask the base model
          </button>
        ),
        answers: () => (
          <>
            <AnswerCard q={REFUND} i={BASE} />
            <AnswerCard q={REFUND} i={BEST} />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        sft: ({ state, sync }) => (
          <ModelGate weights="base">
            {() => (
              <ModelGate weights="finetuned">
                {() => (
                  <button type="button" className="big" onClick={() => sync({ ...state, sft: true })}>
                    Ask both Larkspur minis
                  </button>
                )}
              </ModelGate>
            )}
          </ModelGate>
        ),
        replies: ({ state }) => (
          <ModelGate weights="base">
            {base => (
              <ModelGate weights="finetuned">
                {tuned => {
                  const a = replyOf(base, PROMPT),
                    b = replyOf(tuned, PROMPT);
                  return (
                    <>
                      <Outcome {...P1} prediction={state.p1} outcome={outcome(a, b)} />
                      <Reply who="Larkspur mini" prompt={PROMPT} text={a} />
                      <Reply who="Fine-tuned on the style set" prompt={PROMPT} text={b} />
                      <p className="tc-status">
                        These two run live. See the whole run in <a href="/fine-tuning/">Fine-tuning</a>.
                      </p>
                      <Fact id="instructgpt" />
                    </>
                  );
                }}
              </ModelGate>
            )}
          </ModelGate>
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
