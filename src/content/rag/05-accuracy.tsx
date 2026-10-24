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

const QUIZ = {
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
    'Retrieval already did its job: the right sentence arrived. Fetching more only buries it deeper in the middle.',
    'Right. Recall says the right sentence arrived; the verdict depends on what arrived with it, and where.',
    'Recall measures retrieval, not the answer. The stale hotel policy got 100% recall and a wrong answer.',
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
    narration: 'A consultant asks about the hotel limit. Ask the question.',
    label: 'Asked about the hotel limit',
    predicate: s => s.asked,
  },
  {
    id: 'evaluator',
    focus: 'add',
    visibleControls: ['add'],
    opensDrawer: 'answer',
    narration: 'Wrong: $150 is the retired 2018 limit. Add the Evaluator: one meter judges retrieval, one the answer.',
    label: 'Added the Evaluator',
    more: 'The $150 comes from the retired 2018 travel policy. Two meters tell a retrieval problem from an answer problem before you turn any knob.',
    predicate: s => has(s, 'grader'),
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    opensDrawer: 'evidence',
    narration:
      'Recall@k: did the right sentence arrive? It’s 0%: the current policy never did. Predict what more chunks move.',
    label: 'Predicted which meter moves',
    more: 'k is how many chunks the retriever hands over. At 0% recall no prompt can save the answer: the passage is not there.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'more',
    focus: 'retriever',
    visibleControls: ['predict', 'more'],
    narration: 'Pick locked. Fetch more chunks and watch both meters.',
    label: 'Fetched more chunks',
    predicate: s => s.canvas.knobs.topK === 5,
  },
  puzzle<S>({
    id: 'filter',
    focus: 'retriever',
    visibleControls: ['reveal', 'filter'],
    opensDrawer: 'evidence',
    narration:
      'Recall hit 100%, answer still wrong: the retired policy came too. Puzzle: filter out outdated documents.',
    label: 'Filtered out outdated documents',
    more: 'More chunks brought the current policy in, but the stale one still competes, and the model believed it.',
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
    narration: 'Correct. Filters act before ranking, so stale text never competes. Next, add Query rewrite.',
    label: 'Added Query rewrite',
    more: 'The answer now cites the 2025 policy. Next you fix the question itself.',
    predicate: s => has(s, 'rewrite'),
  },
  puzzle<S>({
    id: 'rewrite',
    focus: 'rewrite',
    visibleControls: ['rewrite'],
    opensDrawer: 'answer',
    narration: 'Puzzle: someone types “it’s broken again, who do I even call?”. Send the retriever a clearer question.',
    label: 'Rewrote the vague question',
    more: 'A warehouse lead typed it, and nothing in the documents looks like that.',
    broken: enter('rewrite'),
    verdict: correct,
    solution: fix('rewrite'),
    hint: 'Pick the rewritten query that names the Portal outage.',
  }),
  {
    id: 'after-rewrite',
    focus: 'next',
    visibleControls: ['next'],
    narration: 'Correct. Naming the Portal outage pulled the Duty Desk rule in: recall rose from 0% to 100%.',
    label: 'The rewrite brought the Duty Desk rule in',
    more: 'The rewrite names a Portal outage outside business hours, so the rule ranks in and the answer follows.',
    predicate: s => s.acks >= 1,
  },
  puzzle<S>({
    id: 'topk',
    focus: 'retriever',
    visibleControls: ['topK'],
    opensDrawer: 'answer',
    narration: `Puzzle: at top-k ${PRESETS.topK.knobs.topK} the dock-door rule never arrives. Too few misses it; too many buries it.`,
    label: 'Set top-k so the rule arrives',
    more: 'Top-k is how many chunks the retriever hands over. The missing rule is the dock-door safety rule.',
    broken: enter('topK'),
    verdict: correct,
    solution: fix('topK'),
    hint: 'Try 5 or 6. From 7 up, the rule is there (recall 100%) but sinks into the middle.',
  }),
  {
    id: 'add-reranker',
    focus: 'add',
    visibleControls: ['add'],
    narration: 'Past 6, recall stays 100% but the answer is NOT FOUND: facts get lost mid-context. Add the Reranker.',
    label: 'Added the Reranker',
    more: 'Retrieval is fine; the model loses facts in the middle of a long context.',
    predicate: s => has(s, 'reranker'),
  },
  puzzle<S>({
    id: 'needle',
    focus: 'assembler',
    visibleControls: ['order', 'rerank'],
    opensDrawer: 'evidence',
    narration: `Puzzle: top-k ${PRESETS.needle.knobs.topK} “to be safe” buried the rule mid-context. Put the best chunks at both ends, or rerank.`,
    label: 'Moved the buried rule where the model looks',
    more: 'A teammate set it. Either lever works: reranking lifts the rule to the top.',
    broken: enter('needle'),
    verdict: correct,
    solution: fix('needle'),
    hint: 'Context order: Best at both ends. Or tick Rerank.',
  }),
  {
    id: 'after-needle',
    focus: 'next',
    visibleControls: ['next'],
    narration: 'Correct, and recall never moved: only the rule’s position changed.',
    label: 'Fixed the answer without moving recall',
    more: 'If you used the reranker, open Evidence and Show the math to see its score.',
    predicate: s => s.acks >= 2,
  },
  puzzle<S>({
    id: 'distractor',
    focus: 'retriever',
    visibleControls: ['hybrid'],
    opensDrawer: 'evidence',
    narration:
      'Puzzle: asked about card data retention, it quotes a look-alike demo-data note. Mix in keyword matching.',
    label: 'Mixed in keyword matching',
    more: 'The note is a meeting note about demo data that sounds the same. Meaning-search loves look-alikes.',
    broken: enter('distractor'),
    verdict: correct,
    solution: fix('distractor'),
    hint: 'Raise Keyword weight to 20% or more.',
  }),
  {
    id: 'after-distractor',
    focus: 'next',
    visibleControls: ['next'],
    narration: 'Correct. Keyword matching rewards the policy’s exact terms, so it outranks the look-alike.',
    label: 'Keywords outranked the look-alike',
    more: 'Open Evidence and Show the math to see the blend.',
    predicate: s => s.acks >= 3,
  },
  puzzle<S>({
    id: 'overlap',
    focus: 'chunker',
    visibleControls: ['overlap'],
    opensDrawer: 'chunks',
    narration: 'Puzzle: a cut splits the refund-window sentence in two. Let neighbouring chunks share some words.',
    label: 'Let neighbouring chunks overlap',
    more: 'With the sentence sliced in two, the model finds no clear answer.',
    broken: enter('overlap'),
    verdict: correct,
    solution: fix('overlap'),
    hint: 'Any overlap above 0% keeps this sentence whole.',
  }),
  {
    id: 'after-overlap',
    focus: 'next',
    visibleControls: ['next'],
    narration: 'Correct. Overlap repeats each chunk’s end at the next one’s start, so the sentence survives whole.',
    label: 'Overlap kept the sentence whole',
    predicate: s => s.acks >= 4,
  },
  puzzle<S>({
    id: 'strategy',
    focus: 'chunker',
    visibleControls: ['strategy'],
    opensDrawer: 'chunks',
    narration: 'Last puzzle: one chunk is sent, cut mid-sentence. Overlap won’t help here. Swap the chunker.',
    label: 'Swapped to the sentence chunker',
    more: 'The fixed-size chunker cuts the lodging rule mid-sentence.',
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
    narration: 'Correct. Seven levers; the meters showed which side to fix. One last question.',
    label: 'Answered the closing question',
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

export default function Accuracy() {
  // one run per question, in a fixed order (hook rules hold: USED never changes)
  const { runs, panels } = useQuestionRuns<S>(USED_QS);
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{
        q: PRESETS.open.q,
        canvas: initialCanvas(unlockedThrough('04-layers'), PRESETS.open.knobs),
        verdict: null,
        math: false,
        probed: false,
        prediction: null,
        asked: false,
        acks: 0,
        quiz: null,
      }}
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
