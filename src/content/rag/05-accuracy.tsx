// Chapter 5 step script: making RAG accurate. Opens on a stale hotel limit, adds the Evaluator so retrieval
// quality (recall@k) and answer quality (verdict) show separately, then one puzzle per lever (R15, R18).
// Every puzzle state below was found by sweeping the real index: its one lever flips the recorded verdict
// (tests/unit/accuracy.test.ts pins each flip).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { UNSURE } from '../../lib/recall';
import { puzzle } from '../../components/quiz/Puzzle';
import { Knob } from '../../components/canvas/Knobs';
import {
  DEFAULT_KNOBS,
  initialCanvas,
  unlockedThrough,
  type CanvasQuestion,
  type KnobName,
  type Knobs,
} from '../../components/canvas/state';
import type { BlockType } from '../../lib/iso/blocks';
import { RagStage, useQuestionRuns, type RagState } from '../../components/panels/rag';
import QualityMeters from '../../components/panels/QualityMeters';
import { nextOf } from '../../lib/chapters';
import ch4 from '../../../data/questions/ch4.json';
import ch5 from '../../../data/questions/ch5.json';

const ID = '05-accuracy';
const QS = [...ch5, ...ch4] as CanvasQuestion[];
const Q = (id: string) => QS.find(q => q.id === id)!;
/** The questions this chapter uses, in order of appearance. */
export const USED = [
  'stale-hotel-limit',
  'vague-outage',
  'dock-door-red-light',
  'card-data-retention',
  'standard-refund-window',
] as const;
type QId = (typeof USED)[number];
const USED_QS = USED.map(Q);
interface S extends RagState {
  q: QId;
  prediction: number | null;
  asked: boolean;
  acks: number;
  quiz: number | null;
}

/** Each puzzle's broken setting: every knob pinned, so the one lever on screen is the only thing that differs. */
const base = (k: Partial<Knobs>): Knobs => ({ ...DEFAULT_KNOBS, ...k });
export const PRESETS = {
  open: { q: 'stale-hotel-limit', knobs: base({}) },
  filter: { q: 'stale-hotel-limit', knobs: base({ topK: 5 }) },
  rewrite: { q: 'vague-outage', knobs: base({ size: 16 }) },
  topK: { q: 'dock-door-red-light', knobs: base({ size: 24, overlap: 10, topK: 1 }) },
  needle: { q: 'dock-door-red-light', knobs: base({ size: 24, overlap: 10, topK: 10 }) },
  distractor: { q: 'card-data-retention', knobs: base({ strategy: 'sentence', topK: 5 }) },
  overlap: { q: 'standard-refund-window', knobs: base({ size: 24, topK: 3 }) },
  strategy: { q: 'stale-hotel-limit', knobs: base({ topK: 1, filter: 'current' }) },
} satisfies Record<string, { q: QId; knobs: Knobs }>;
/** The winning move for each puzzle (what "Show me" applies). */
export const FIXES: Record<Exclude<keyof typeof PRESETS, 'open'>, Partial<Knobs>> = {
  filter: { filter: 'current' },
  rewrite: { rewrite: 0 },
  topK: { topK: 5 },
  needle: { order: 'edges' },
  distractor: { hybrid: 0.3 },
  overlap: { overlap: 25 },
  strategy: { strategy: 'sentence' },
};

const enter =
  (p: keyof typeof PRESETS) =>
  (s: S): S => ({ ...s, q: PRESETS[p].q, canvas: { ...s.canvas, knobs: PRESETS[p].knobs }, verdict: null });
const fix =
  (p: keyof typeof FIXES) =>
  (s: S): S => ({ ...s, canvas: { ...s.canvas, knobs: { ...s.canvas.knobs, ...FIXES[p] } }, verdict: null });
const correct = (s: S) => s.verdict === 'correct';
const has = (s: S, t: BlockType) => s.canvas.unlocked.includes(t);
// what the add, more and next buttons do; the verdict follows from the stage (KTD8)
const add =
  (t: BlockType) =>
  (s: S): S => ({ ...s, canvas: { ...s.canvas, unlocked: [...s.canvas.unlocked, t] } });
const ack = (s: S): S => ({ ...s, acks: s.acks + 1 });

export const QUIZ = {
  question: 'Recall is 100% but the answer is still wrong. Where do you look?',
  options: [
    'Retrieval: fetch more chunks until the answer flips',
    'What reached the model: a stale, cut, buried or look-alike passage is misleading it',
    'Nowhere: a 100% recall means the answer is right',
  ],
  correct: 1,
  explanation:
    'Recall only says the right sentence arrived. The verdict depends on what else arrived with it, and where. Read the evidence before turning another knob.',
  why: [
    'Retrieval already did its job: fetching more only buries the right sentence deeper in the middle.',
    'Right: recall says the right sentence arrived, and the verdict depends on what arrived with it, and where.',
    'Recall measures retrieval, not the answer: the stale hotel policy got 100% recall and a wrong answer.',
  ],
};

// Predict, then reveal (R9): the meters move only when top-k does, so they show the current setting until the pick.
const PREDICT = {
  question: `You retrieve ${PRESETS.filter.knobs.topK} chunks instead of ${PRESETS.open.knobs.topK}. Which meter moves?`,
  options: [
    'Both: the right policy arrives and the answer is fixed',
    'Only recall: the right policy arrives, but the answer stays wrong',
    'Neither: more chunks only add noise',
  ],
};
const OUTCOME = 1;

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['ask'],
    narration:
      'Your pipeline from the last chapter is live. A consultant booking a trip asks the assistant about the hotel limit.',
    predicate: s => s.asked,
    demo: s => ({ ...s, asked: true }),
  },
  {
    id: 'evaluator',
    focus: 'add',
    visibleControls: ['add'],
    opensDrawer: 'answer',
    narration:
      'Wrong: $150 is from the retired 2018 travel policy. Before fixing anything, measure. The Evaluator judges the answer beside a retrieval meter.',
    act: 'Add the Evaluator.',
    say: { block: 'llm', text: 'Quotes a retired policy' },
    predicate: s => has(s, 'grader'),
    demo: add('grader'),
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    opensDrawer: 'evidence',
    narration:
      'Two meters. Recall@k: did the right sentence reach the model? Answer: was the reply right? Recall is 0%.',
    act: 'Predict what fetching more will do.',
    say: { block: 'grader', text: 'Answer and recall' },
    predicate: s => s.prediction !== null,
  },
  {
    id: 'more',
    focus: 'retriever',
    visibleControls: ['predict', 'more'],
    narration: 'Your pick is locked.',
    act: 'Fetch more chunks and watch both meters.',
    predicate: s => s.canvas.knobs.topK === 5,
    demo: s => ({ ...s, canvas: { ...s.canvas, knobs: { ...s.canvas.knobs, topK: 5 } } }),
  },
  puzzle<S>({
    id: 'filter',
    focus: 'retriever',
    visibleControls: ['reveal', 'filter'],
    opensDrawer: 'evidence',
    narration: 'Recall hit 100%, yet the answer is still wrong: the retired 2018 policy came along.',
    act: 'Puzzle: keep outdated documents out with a metadata filter.',
    say: { block: 'retriever', text: 'Lets 2018 through' },
    broken: enter('filter'),
    verdict: correct,
    solution: fix('filter'),
    hint: 'Set the filter to current documents only (2025 and later).',
  }),
  {
    id: 'add-rewrite',
    focus: 'add',
    visibleControls: ['add'],
    opensDrawer: 'answer',
    narration: 'Correct, citing the 2025 policy. Filters act before ranking, so stale text never competes.',
    act: 'Next lever works on the question itself: add Query rewrite.',
    predicate: s => has(s, 'rewrite'),
    demo: add('rewrite'),
  },
  puzzle<S>({
    id: 'rewrite',
    focus: 'rewrite',
    visibleControls: ['rewrite'],
    opensDrawer: 'answer',
    narration:
      'Puzzle: a warehouse lead types “it’s broken again, who do I even call?”. Nothing in the documents reads like that.',
    act: 'Send a clearer question.',
    say: { block: 'rewrite', text: 'Rewrite it' },
    broken: enter('rewrite'),
    verdict: correct,
    solution: fix('rewrite'),
    hint: 'Pick the rewritten query that names the Portal outage.',
  }),
  {
    id: 'after-rewrite',
    focus: 'next',
    visibleControls: ['next'],
    narration:
      'Correct. The rewrite names a Portal outage outside business hours, so the Duty Desk rule ranks in: recall went 0% to 100%.',
    predicate: s => s.acks >= 1,
    demo: ack,
  },
  puzzle<S>({
    id: 'topk',
    focus: 'retriever',
    visibleControls: ['topK'],
    opensDrawer: 'answer',
    narration:
      'Puzzle: top-k is how many chunks the retriever hands over. At 1, the dock-door safety rule never arrives.',
    act: 'Find a value that works.',
    broken: enter('topK'),
    verdict: correct,
    solution: fix('topK'),
    hint: 'Try 5 or 6. From 7 up, the rule is there (recall 100%) but sinks into the middle.',
  }),
  {
    id: 'add-reranker',
    focus: 'add',
    visibleControls: ['add'],
    narration:
      'Past 6, recall stays 100% but the answer turns NOT FOUND. The model loses facts in the middle of long context.',
    act: 'Add the Reranker.',
    predicate: s => has(s, 'reranker'),
    demo: add('reranker'),
  },
  puzzle<S>({
    id: 'needle',
    focus: 'assembler',
    visibleControls: ['order', 'rerank'],
    opensDrawer: 'evidence',
    narration: 'Puzzle: a teammate set top-k to 10 “to be safe”, burying the rule mid-context.',
    act: 'Put the best chunks at both ends, or rerank them.',
    say: { block: 'assembler', text: 'Rule buried mid-context' },
    broken: enter('needle'),
    verdict: correct,
    solution: fix('needle'),
    hint: 'Context order: Best at both ends. Or tick Rerank.',
  }),
  {
    id: 'after-needle',
    focus: 'next',
    visibleControls: ['next'],
    narration: 'Correct, and recall never moved: the rule was retrieved all along, only its position changed.',
    act: 'Open Evidence and Show the math for the scores.',
    predicate: s => s.acks >= 2,
    demo: ack,
  },
  puzzle<S>({
    id: 'distractor',
    focus: 'retriever',
    visibleControls: ['hybrid'],
    opensDrawer: 'evidence',
    narration: 'Puzzle: asked how long card data is kept, the assistant quotes a look-alike note about demo data.',
    act: 'Mix in keyword matching: hybrid search.',
    say: { block: 'retriever', text: 'Picks a look-alike' },
    broken: enter('distractor'),
    verdict: correct,
    solution: fix('distractor'),
    hint: 'Raise Keyword weight to 20% or more.',
  }),
  {
    id: 'after-distractor',
    focus: 'next',
    visibleControls: ['next'],
    narration: 'Correct. Keyword matching rewards the real policy’s exact terms, so it outranks the look-alike.',
    act: 'Open Evidence and Show the math to see the blend.',
    predicate: s => s.acks >= 3,
    demo: ack,
  },
  puzzle<S>({
    id: 'overlap',
    focus: 'chunker',
    visibleControls: ['overlap'],
    opensDrawer: 'chunks',
    narration: 'Puzzle: the refund-window sentence is sliced in two, so the model finds no clear answer.',
    act: 'Let neighbouring chunks share some words.',
    broken: enter('overlap'),
    verdict: correct,
    solution: fix('overlap'),
    hint: 'Any overlap above 0% keeps this sentence whole.',
  }),
  {
    id: 'after-overlap',
    focus: 'next',
    visibleControls: ['next'],
    narration:
      'Correct. Overlap repeats each chunk’s end at the start of the next, so a sentence near a cut survives whole.',
    predicate: s => s.acks >= 4,
    demo: ack,
  },
  puzzle<S>({
    id: 'strategy',
    focus: 'chunker',
    visibleControls: ['strategy'],
    opensDrawer: 'chunks',
    narration:
      'Puzzle, the last one: only one chunk is sent, and the fixed-size chunker cuts the lodging rule mid-sentence.',
    act: 'Overlap won’t rescue it: swap it.',
    say: { block: 'chunker', text: 'Cuts mid-sentence' },
    broken: enter('strategy'),
    verdict: correct,
    solution: fix('strategy'),
    hint: 'Choose Sentence: it never cuts inside a sentence.',
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    opensDrawer: 'answer',
    narration: 'Correct. Seven levers, and the two meters told you which side to fix.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Think of the stale policy: recall was 100% and the answer still wrong.',
  },
];

const NEXT_BLOCK: [BlockType, string][] = [
  ['grader', 'Add the Evaluator'],
  ['rewrite', 'Add Query rewrite'],
  ['reranker', 'Add the Reranker'],
];
const KNOB_CONTROLS: KnobName[] = ['filter', 'rewrite', 'topK', 'order', 'rerank', 'hybrid', 'overlap', 'strategy'];

export const INITIAL: S = {
  q: PRESETS.open.q,
  canvas: initialCanvas(unlockedThrough('04-layers'), PRESETS.open.knobs),
  verdict: null,
  math: false,
  probed: false,
  prediction: null,
  asked: false,
  acks: 0,
  quiz: null,
};

export default function Accuracy() {
  // one run per question, in a fixed order (hook rules hold: USED never changes)
  const { runs, panels } = useQuestionRuns<S>(USED_QS);
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={INITIAL}
      next={nextOf(ID)}
      stage={p => (
        <div className="stage-col">
          <RagStage {...p} run={runs[p.state.q]} />
          {p.state.canvas.unlocked.includes('grader') && <QualityMeters out={runs[p.state.q].out} />}
        </div>
      )}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed
            onReveal={() => {}}
          />
        ),
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>
            Ask: “{Q(state.q).query}”
          </button>
        ),
        add: ({ state, apply }) => {
          const b = NEXT_BLOCK.find(([t]) => !has(state, t));
          if (!b) return null;
          const canvas = { ...state.canvas, unlocked: [...state.canvas.unlocked, b[0]] };
          return (
            <button
              type="button"
              className="big"
              onClick={() => apply({ ...state, canvas, verdict: runs[state.q].verdictOf(canvas) })}
            >
              {b[1]}
            </button>
          );
        },
        more: ({ state, apply }) => {
          const canvas = { ...state.canvas, knobs: { ...state.canvas.knobs, topK: 5 } };
          return (
            <button
              type="button"
              className="big"
              onClick={() => apply({ ...state, canvas, verdict: runs[state.q].verdictOf(canvas) })}
            >
              Retrieve 5 chunks instead of 3
            </button>
          );
        },
        next: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, acks: state.acks + 1 })}>
            Next puzzle →
          </button>
        ),
        ...Object.fromEntries(
          KNOB_CONTROLS.map(name => [
            name,
            ({ state, apply }: { state: S; apply: (n: S) => void }) => (
              <Knob
                name={name}
                state={state.canvas}
                question={Q(state.q)}
                onChange={canvas => apply({ ...state, canvas, verdict: runs[state.q].verdictOf(canvas) })}
              />
            ),
          ]),
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
      inspectPanel="answer"
      panels={panels}
    />
  );
}
