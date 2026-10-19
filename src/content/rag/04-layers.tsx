// Chapter 4 step script: the layers between Docs and the model. Opens on the negation split (AE1): 16-word
// chunks, no overlap, only the best match sent, so the model reads "...does NOT" without what follows.
// Unlocks Chunker, Embedder + Index and the Context assembler one at a time; the puzzle fixes the cut with overlap.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { puzzle } from '../../components/quiz/Puzzle';
import { Knob } from '../../components/canvas/Knobs';
import { initialCanvas, unlockedThrough, type CanvasQuestion, type Knobs } from '../../components/canvas/state';
import type { BlockType } from '../../lib/iso/blocks';
import { RagStage, ragPanels, useRagRun, type RagState } from '../../components/panels/rag';
import { nextOf } from '../../lib/chapters';
import ch3 from '../../../data/questions/ch3.json';

const ID = '04-layers';
const QUESTION = ch3[0] as CanvasQuestion;   // the enterprise refund question, now through every layer
interface S extends RagState { asked: boolean; quiz: number | null }

// The split shows only when one chunk is sent: at top-k 2+ both halves arrive and are read together.
const BROKEN: Partial<Knobs> = { strategy: 'fixed', size: 16, overlap: 0, topK: 1 };
const isBroken = (k: Knobs) => Object.entries(BROKEN).every(([n, v]) => k[n as keyof Knobs] === v);

const QUIZ = {
  question: 'The right sentence was in the documents, yet the answer was wrong. Why?',
  options: [
    'The model was too small to understand refunds',
    'The chunker cut the sentence right after “NOT”, so the piece the model got had lost its meaning',
    'The refund policy was out of date',
  ],
  correct: 1,
  explanation: 'The model only sees the chunks it is handed. Overlap, or cutting on sentence boundaries, keeps a rule and its exception together.',
};

const has = (s: S, t: BlockType) => s.canvas.unlocked.includes(t);
export const STEPS: Step<S>[] = [
  {
    id: 'ask', focus: 'ask', visibleControls: ['ask'],
    narration: 'To save cost, your team cut documents into small 16-word pieces and now sends the model only the single best match. A sales lead asks the refund question again.',
    predicate: s => s.asked,
  },
  {
    id: 'chunker', focus: 'add', visibleControls: ['add'], opensDrawer: 'answer',
    narration: 'Wrong, and sure of itself. The policy excludes enterprise contracts. To see why, open up the pipeline. First layer: the Chunker, which cuts every document into pieces before anything is searched.',
    predicate: s => has(s, 'chunker'),
  },
  {
    id: 'embedder', focus: 'add', visibleControls: ['add'], opensDrawer: 'chunks',
    narration: 'There it is: a cut right after “does NOT” (the red mark). The rule and its exception landed in different pieces. How was the piece picked? Add the Embedder and the Index.',
    predicate: s => has(s, 'embedder') && has(s, 'index'),
  },
  {
    id: 'map', focus: 'index', visibleControls: [], opensDrawer: 'map',
    narration: 'The Embedder turns each piece into 384 numbers that capture its meaning; the Index stores them. The map flattens those numbers to 2D. Point at a dot, or Tab to one, to compare its true similarity with how close it looks.',
    predicate: s => s.probed,
    hint: 'The blue and yellow dots are the closest matches. Hover one, or press Tab until one is selected.',
  },
  {
    id: 'assembler', focus: 'add', visibleControls: ['add'],
    narration: 'Closeness on the map is only a picture: the retriever ranks by the true score. Last layer: the Context assembler, which packs the retrieved pieces into the prompt.',
    predicate: s => has(s, 'assembler'),
  },
  puzzle<S>({
    id: 'fix', focus: 'chunker', visibleControls: ['overlap'], opensDrawer: 'evidence',
    narration: 'Puzzle: only one piece reaches the model, and it ends on “does NOT”. Fix the Chunker so the sentence survives the cut. Overlap repeats the end of each piece at the start of the next.',
    broken: s => (isBroken(s.canvas.knobs) ? s : { ...s, canvas: { ...s.canvas, knobs: { ...s.canvas.knobs, ...BROKEN } }, verdict: null }),
    verdict: s => s.verdict === 'correct',
    solution: s => ({ ...s, canvas: { ...s.canvas, knobs: { ...s.canvas.knobs, overlap: 25 } }, verdict: null }),
    hint: 'Slide Overlap to 25%.',
  }),
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'], opensDrawer: 'answer',
    narration: 'Correct, with a citation. With overlap the whole sentence sits in one piece, so the model reads the exception. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct,
    hint: 'Look at the red mark in the Chunks panel from earlier.',
  },
];

const NEXT_LAYER: [BlockType[], string][] = [[['chunker'], 'Add the Chunker'], [['embedder', 'index'], 'Add the Embedder and Index'], [['assembler'], 'Add the Context assembler']];

export default function Layers() {
  const run = useRagRun(QUESTION);
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{ canvas: initialCanvas(unlockedThrough('03-what-is-rag'), BROKEN), verdict: null, math: false, probed: false, asked: false, quiz: null }}
      next={nextOf(ID)}
      stage={p => <RagStage {...p} run={run} />}
      controls={{
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>Ask: “{QUESTION.query}”</button>
        ),
        add: ({ state, apply }) => {
          const layer = NEXT_LAYER.find(([ts]) => !ts.every(t => has(state, t)));
          if (!layer) return null;
          const canvas = { ...state.canvas, unlocked: [...state.canvas.unlocked, ...layer[0]] };
          return <button type="button" className="big" onClick={() => apply({ ...state, canvas, verdict: run.verdictOf(canvas) })}>{layer[1]}</button>;
        },
        overlap: ({ state, apply }) => (
          <Knob name="overlap" state={state.canvas} question={QUESTION}
            onChange={canvas => apply({ ...state, canvas, verdict: run.verdictOf(canvas) })} />
        ),
        quiz: ({ state, apply }) => <Quiz {...QUIZ} value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} />,
      }}
      inspectPanel="answer"
      panels={ragPanels<S>(run)}
    />
  );
}
