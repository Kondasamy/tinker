// Chapter 5 step script: making RAG accurate. Opens on a stale hotel limit, adds the Evaluator so retrieval
// quality (recall@k) and answer quality (verdict) show separately, then one puzzle per lever (R15, R18).
// Every puzzle state below was found by sweeping the real index: its one lever flips the recorded verdict
// (tests/unit/accuracy.test.ts pins each flip).
import StepRunner, { type Panel } from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { puzzle } from '../../components/quiz/Puzzle';
import { Knob } from '../../components/canvas/Knobs';
import { DEFAULT_KNOBS, initialCanvas, unlockedThrough, type CanvasQuestion, type KnobName, type Knobs } from '../../components/canvas/state';
import type { BlockType } from '../../lib/iso/blocks';
import { RagStage, ragPanels, useRagRun, type RagState } from '../../components/panels/rag';
import QualityMeters from '../../components/panels/QualityMeters';
import { CHAPTERS, chapterHref } from '../../lib/chapters';
import ch4 from '../../../data/questions/ch4.json';
import ch5 from '../../../data/questions/ch5.json';

const ID = '05-accuracy';
const QS = [...ch5, ...ch4] as CanvasQuestion[];
const Q = (id: string) => QS.find(q => q.id === id)!;
/** The questions this chapter uses, in order of appearance. */
export const USED = ['stale-hotel-limit', 'vague-outage', 'dock-door-red-light', 'card-data-retention', 'standard-refund-window'] as const;
type QId = typeof USED[number];
interface S extends RagState { q: QId; asked: boolean; acks: number; quiz: number | null }

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
  filter: { filter: 'current' }, rewrite: { rewrite: 0 }, topK: { topK: 5 }, needle: { order: 'edges' },
  distractor: { hybrid: 0.3 }, overlap: { overlap: 25 }, strategy: { strategy: 'sentence' },
};

const enter = (p: keyof typeof PRESETS) => (s: S): S => ({ ...s, q: PRESETS[p].q, canvas: { ...s.canvas, knobs: PRESETS[p].knobs }, verdict: null });
const fix = (p: keyof typeof FIXES) => (s: S): S => ({ ...s, canvas: { ...s.canvas, knobs: { ...s.canvas.knobs, ...FIXES[p] } }, verdict: null });
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
  explanation: 'Recall only says the right sentence arrived. The verdict depends on what else arrived with it, and where. Read the evidence before turning another knob.',
};

export const STEPS: Step<S>[] = [
  {
    id: 'ask', focus: 'ask', visibleControls: ['ask'],
    narration: 'Your pipeline from the last chapter is live. A consultant booking a trip asks the assistant about the hotel limit.',
    predicate: s => s.asked,
  },
  {
    id: 'evaluator', focus: 'add', visibleControls: ['add'], opensDrawer: 'answer',
    narration: 'Wrong: $150 is the limit from the retired 2018 travel policy. Before fixing anything, measure. Add the Evaluator: it judges the answer, and sits beside a second meter for retrieval.',
    predicate: s => has(s, 'grader'),
  },
  {
    id: 'more', focus: 'retriever', visibleControls: ['more'], opensDrawer: 'evidence',
    narration: 'Two meters. Retrieval recall@k: did the right sentence reach the model? Answer: was the reply right? Recall is 0%, so the current policy never arrived. Fetch more chunks.',
    predicate: s => s.canvas.knobs.topK === 5,
  },
  puzzle<S>({
    id: 'filter', focus: 'retriever', visibleControls: ['filter'], opensDrawer: 'evidence',
    narration: 'Recall jumped to 100%, yet the answer is still wrong: the retired 2018 policy came along and the model believed it. Puzzle: keep outdated documents out with a metadata filter.',
    broken: enter('filter'), verdict: correct, solution: fix('filter'),
    hint: 'Set the filter to current documents only (2025 and later).',
  }),
  {
    id: 'add-rewrite', focus: 'add', visibleControls: ['add'], opensDrawer: 'answer',
    narration: 'Correct, citing the 2025 policy. Filters act before ranking, so stale text never competes. Next lever works on the question itself: add Query rewrite.',
    predicate: s => has(s, 'rewrite'),
  },
  puzzle<S>({
    id: 'rewrite', focus: 'rewrite', visibleControls: ['rewrite'], opensDrawer: 'answer',
    narration: 'Puzzle: a warehouse lead types “it’s broken again, who do I even call?”. Nothing in the documents looks like that. Send the retriever a clearer version of the question.',
    broken: enter('rewrite'), verdict: correct, solution: fix('rewrite'),
    hint: 'Pick the rewritten query that names the Portal outage.',
  }),
  {
    id: 'after-rewrite', focus: 'next', visibleControls: ['next'],
    narration: 'Correct. The rewrite names a Portal outage outside business hours, so the Duty Desk rule ranks in: recall went from 0% to 100% and the answer followed.',
    predicate: s => s.acks >= 1,
  },
  puzzle<S>({
    id: 'topk', focus: 'retriever', visibleControls: ['topK'], opensDrawer: 'answer',
    narration: 'Puzzle: top-k is how many chunks the retriever hands over. At 1, the dock-door safety rule never arrives. Too few misses it; too many buries it. Find a value that works.',
    broken: enter('topK'), verdict: correct, solution: fix('topK'),
    hint: 'Try 5 or 6. From 7 up, the rule is there (recall 100%) but sinks into the middle.',
  }),
  {
    id: 'add-reranker', focus: 'add', visibleControls: ['add'],
    narration: 'Notice the meters: past 6, recall stays 100% while the answer turns to NOT FOUND. Retrieval is fine; the model loses facts in the middle of long context. Add the Reranker.',
    predicate: s => has(s, 'reranker'),
  },
  puzzle<S>({
    id: 'needle', focus: 'assembler', visibleControls: ['order', 'rerank'], opensDrawer: 'evidence',
    narration: 'Puzzle: a teammate set top-k to 10 “to be safe”. The rule is buried mid-context. Either lever works: put the best chunks at both ends, or rerank so the rule rises to the top.',
    broken: enter('needle'), verdict: correct, solution: fix('needle'),
    hint: 'Context order: Best at both ends. Or tick Rerank.',
  }),
  {
    id: 'after-needle', focus: 'next', visibleControls: ['next'],
    narration: 'Correct, and recall never moved: the rule was retrieved all along. Only its position changed. If you used the reranker, open Evidence and Show the math to see its score.',
    predicate: s => s.acks >= 2,
  },
  puzzle<S>({
    id: 'distractor', focus: 'retriever', visibleControls: ['hybrid'], opensDrawer: 'evidence',
    narration: 'Puzzle: asked how long card data is kept, the assistant quotes a meeting note about demo data that sounds the same. Meaning-search loves look-alikes. Mix in exact keyword matching.',
    broken: enter('distractor'), verdict: correct, solution: fix('distractor'),
    hint: 'Raise Keyword weight to 20% or more.',
  }),
  {
    id: 'after-distractor', focus: 'next', visibleControls: ['next'],
    narration: 'Correct. Keyword matching rewards the exact terms in the real policy, so it outranks the look-alike note. Open Evidence and Show the math to see the blend.',
    predicate: s => s.acks >= 3,
  },
  puzzle<S>({
    id: 'overlap', focus: 'chunker', visibleControls: ['overlap'], opensDrawer: 'chunks',
    narration: 'Puzzle: the refund-window sentence is sliced in two, so the model finds no clear answer. Let neighbouring chunks share some words.',
    broken: enter('overlap'), verdict: correct, solution: fix('overlap'),
    hint: 'Any overlap above 0% keeps this sentence whole.',
  }),
  {
    id: 'after-overlap', focus: 'next', visibleControls: ['next'],
    narration: 'Correct. Overlap repeats the end of each chunk at the start of the next, so a sentence near a cut survives whole in one of them.',
    predicate: s => s.acks >= 4,
  },
  puzzle<S>({
    id: 'strategy', focus: 'chunker', visibleControls: ['strategy'], opensDrawer: 'chunks',
    narration: 'Puzzle, the last one: only one chunk is sent, and the fixed-size chunker cuts the lodging rule mid-sentence. Overlap does not rescue this one. Swap the chunker in this slot.',
    broken: enter('strategy'), verdict: correct, solution: fix('strategy'),
    hint: 'Choose Sentence: it never cuts inside a sentence.',
  }),
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'], opensDrawer: 'answer',
    narration: 'Correct. Seven levers, and the two meters told you which side to fix. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct,
    hint: 'Think of the stale policy: recall was 100% and the answer still wrong.',
  },
];

const NEXT_BLOCK: [BlockType, string][] = [['grader', 'Add the Evaluator'], ['rewrite', 'Add Query rewrite'], ['reranker', 'Add the Reranker']];
const KNOB_CONTROLS: KnobName[] = ['filter', 'rewrite', 'topK', 'order', 'rerank', 'hybrid', 'overlap', 'strategy'];

export default function Accuracy() {
  // one run per question, in a fixed order (hook rules hold: USED never changes)
  const runs = Object.fromEntries(USED.map(id => [id, useRagRun(Q(id))])) as Record<QId, ReturnType<typeof useRagRun>>;
  const byQ = Object.fromEntries(USED.map(id => [id, ragPanels<S>(runs[id])])) as Record<QId, Record<string, Panel<S>>>;
  const panels = Object.fromEntries(Object.entries(byQ[USED[0]]).map(([k, p]) => [k, { title: p.title, render: (s: S, apply: (n: S) => void) => byQ[s.q][k].render(s, apply) }]));
  const i = CHAPTERS.findIndex(c => c.id === ID);
  const next = CHAPTERS[i + 1];
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{ q: PRESETS.open.q, canvas: initialCanvas(unlockedThrough('04-layers'), PRESETS.open.knobs), verdict: null, math: false, probed: false, asked: false, acks: 0, quiz: null }}
      next={next && { href: chapterHref(next.id), title: next.short }}
      stage={p => <div className="stage-col">
        <RagStage {...p} run={runs[p.state.q]} />
        {p.state.canvas.unlocked.includes('grader') && <QualityMeters out={runs[p.state.q].out} />}
      </div>}
      controls={{
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>Ask: “{Q(state.q).query}”</button>
        ),
        add: ({ state, apply }) => {
          const b = NEXT_BLOCK.find(([t]) => !has(state, t));
          if (!b) return null;
          const canvas = { ...state.canvas, unlocked: [...state.canvas.unlocked, b[0]] };
          return <button type="button" className="big" onClick={() => apply({ ...state, canvas, verdict: runs[state.q].verdictOf(canvas) })}>{b[1]}</button>;
        },
        more: ({ state, apply }) => {
          const canvas = { ...state.canvas, knobs: { ...state.canvas.knobs, topK: 5 } };
          return <button type="button" className="big" onClick={() => apply({ ...state, canvas, verdict: runs[state.q].verdictOf(canvas) })}>Retrieve 5 chunks instead of 3</button>;
        },
        next: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, acks: state.acks + 1 })}>Next puzzle →</button>,
        ...Object.fromEntries(KNOB_CONTROLS.map(name => [name, ({ state, apply }: { state: S; apply: (n: S) => void }) => (
          <Knob name={name} state={state.canvas} question={Q(state.q)}
            onChange={canvas => apply({ ...state, canvas, verdict: runs[state.q].verdictOf(canvas) })} />
        )])),
        quiz: ({ state, apply }) => <Quiz {...QUIZ} value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} />,
      }}
      inspectPanel="answer"
      panels={panels}
    />
  );
}
