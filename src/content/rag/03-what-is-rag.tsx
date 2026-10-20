// Chapter 3 step script: retrieve, augment, generate. Starts with a bare model that makes up an answer,
// then adds Docs, then the Retriever, until the answer is grounded and cites the policy.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { initialCanvas, type CanvasQuestion } from '../../components/canvas/state';
import type { BlockType } from '../../lib/iso/blocks';
import { RagStage, ragPanels, useRagRun, type RagState } from '../../components/panels/rag';
import { nextOf } from '../../lib/chapters';
import ch3 from '../../../data/questions/ch3.json';

const ID = '03-what-is-rag';
const QUESTION = ch3[0] as CanvasQuestion;
interface S extends RagState { asked: boolean; seen: boolean; quiz: number | null }

const QUIZ = {
  question: 'What does the retriever give the model?',
  options: [
    'A bigger, smarter model',
    'The few passages that match the question, so it answers from your documents',
    'A copy of every company document in the prompt',
  ],
  correct: 1,
  explanation: 'Retrieve the matching passages, Augment the prompt with them, Generate the answer. The model stays the same; what it reads changes.',
};

const has = (s: S, t: BlockType) => s.canvas.unlocked.includes(t);
export const STEPS: Step<S>[] = [
  {
    id: 'ask', focus: 'ask', visibleControls: ['ask'],
    narration: 'Meet the company assistant. Right now it is just a language model: no documents, nothing wired in. A support lead asks it about refunds.',
    predicate: s => s.asked,
  },
  {
    id: 'docs', focus: 'add', visibleControls: ['add'], opensDrawer: 'answer',
    narration: 'Made up. It sounds sure, but it has never read your refund policy, so it invented one. Give it the company documents.',
    predicate: s => has(s, 'docs'),
  },
  {
    id: 'retriever', focus: 'add', visibleControls: ['add'],
    narration: 'Still made up. The documents are there, but nothing carries the right ones to the model, and all of them will not fit (chapter 2). Add a Retriever: it finds the few passages that match the question.',
    predicate: s => has(s, 'retriever') && s.verdict === 'correct',
    hint: 'Press “Add the Retriever”. The wire from Docs to the model lights up once it is in place.',
  },
  {
    id: 'grounded', focus: 'see', visibleControls: ['see'], opensDrawer: 'answer',
    narration: 'Correct, and it cites the policy it used. That is RAG: Retrieve the matching passages, Augment the prompt with them, Generate the answer. What did the retriever hand over?',
    predicate: s => s.seen,
  },
  {
    id: 'math', focus: 'retriever', visibleControls: [], opensDrawer: 'evidence',
    narration: 'These passages reached the model, each with a similarity score to the question. Tick “Show the math” to see how the top score is computed.',
    predicate: s => s.math,
    hint: 'The “Show the math” box sits above the list of chunks. If the panel is closed, press Evidence under the canvas.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'],
    narration: 'The retriever compares the meaning of your question with every passage and keeps the closest. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct,
    hint: 'What changed between the made-up answer and the right one? Not the model.',
  },
];

const NEXT_BLOCK: [BlockType, string][] = [['docs', 'Add the Docs'], ['retriever', 'Add the Retriever'], ['llm', '']];

export default function WhatIsRag() {
  const run = useRagRun(QUESTION);
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{ canvas: initialCanvas(['llm']), verdict: null, math: false, probed: false, asked: false, seen: false, quiz: null }}
      next={nextOf(ID)}
      stage={p => <RagStage {...p} run={run} />}
      controls={{
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>Ask: “{QUESTION.query}”</button>
        ),
        add: ({ state, apply }) => {
          // both added while the index is still loading: the step advances once the answer arrives
          const found = NEXT_BLOCK.find(([b]) => !has(state, b));
          if (!found) return null;
          const [t, label] = found;
          const canvas = { ...state.canvas, unlocked: [...state.canvas.unlocked, t] };
          return label && <button type="button" className="big" onClick={() => apply({ ...state, canvas, verdict: run.verdictOf(canvas) })}>{label}</button>;
        },
        see: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, seen: true })}>See what the retriever found</button>,
        quiz: ({ state, apply }) => <Quiz {...QUIZ} value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} />,
      }}
      inspectPanel="answer"
      panels={ragPanels<S>(run)}
    />
  );
}
