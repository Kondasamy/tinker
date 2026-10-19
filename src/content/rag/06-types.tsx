// Chapter 6 step script: types of RAG (R16, R17). Recaps naive vs advanced, then attaches the agent side bay.
// The learner picks a question card, runs it under the current type, and the result strip keeps one row per
// question and type, so the types sit side by side on the same corpus and the same knobs.
// Later type units extend this chapter: push to TYPES (a type = the blocks it adds), CARDS and STEPS.
// GraphRAG (U12) adds the graph side bay, a hops knob and the multi-hop Kestrel card; its walk is drawn under the canvas.
import StepRunner, { type Panel } from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { Knob } from '../../components/canvas/Knobs';
import { DEFAULT_KNOBS, initialCanvas, unlockedThrough, type CanvasQuestion, type CanvasState, type Knobs } from '../../components/canvas/state';
import type { BlockType } from '../../lib/iso/blocks';
import { RagStage, ragPanels, useRagRun, type RagState } from '../../components/panels/rag';
import ResultStrip, { type ResultRow } from '../../components/panels/ResultStrip';
import IsoStage from '../../lib/iso/IsoStage';
import { graphLayout, graphScene, graphSummary, HOP_COLOURS } from '../../components/canvas/graphView';
import type { Traversal } from '../../lib/rag/graph';
import { CHAPTERS, chapterHref } from '../../lib/chapters';
import ch3 from '../../../data/questions/ch3.json';
import ch4 from '../../../data/questions/ch4.json';
import ch5 from '../../../data/questions/ch5.json';
import ch6 from '../../../data/questions/ch6.json';

const ID = '06-types';
const QS = [...ch3, ...ch4, ...ch5, ...ch6] as CanvasQuestion[];
const Q = (id: string) => QS.find(q => q.id === id)!;

/** RAG types the learner can run; each is the blocks it attaches to the chapter-5 track. */
export const TYPES: { id: string; label: string; blocks: BlockType[] }[] = [
  { id: 'naive', label: 'Naive / advanced', blocks: [] },
  { id: 'agentic', label: 'Agentic', blocks: ['agent'] },
  { id: 'graph', label: 'GraphRAG', blocks: ['graph'] },
];
/** Question cards for the comparison. */
export const CARDS: { q: string; label: string; short: string }[] = [
  { q: 'refund-enterprise', label: 'Can enterprise customers get a refund?', short: 'Enterprise refund' },
  { q: 'stale-hotel-limit', label: 'What is the hotel limit per night?', short: 'Hotel limit' },
  { q: 'standard-refund-window', label: 'How long do standard customers have to ask for a refund?', short: 'Refund window' },
  { q: 'kestrel-purchase-approver', label: 'Who approves purchases for the team that owns the Kestrel K2 scanner integration?', short: 'Kestrel approver' },
];
/** One setting for every run, so a difference in the strip comes from the type alone: a single 16-word chunk. */
export const KNOBS: Knobs = { ...DEFAULT_KNOBS, strategy: 'fixed', size: 16, overlap: 0, topK: 1 };

const BASE = unlockedThrough('05-accuracy');
const typeOf = (id: string) => TYPES.find(t => t.id === id)!;
const unlockedFor = (type: string) => [...BASE, ...typeOf(type).blocks];

export interface S extends RagState { q: string; type: string; rows: ResultRow[]; acks: number; quiz: number | null; gquiz: number | null }

const row = (s: S, q: string, type: string) => s.rows.find(r => r.q === q && r.type === type);

const QUIZ = {
  question: 'When is an agent worth its extra retrieval calls?',
  options: [
    'Always: more searches always mean a better answer',
    'When the first search finds part of the answer and a follow-up can fetch the rest',
    'When the documents themselves are out of date',
  ],
  correct: 1,
  explanation: 'Each call costs time and money. A follow-up pays off when there is something left to fetch: the rest of a cut sentence, or the next hop of a question. It cannot fix stale documents.',
};

const MULTI = 'kestrel-purchase-approver';
const GRAPH_QUIZ = {
  question: 'Which question is GraphRAG built for?',
  options: [
    'One whose answer sits in a single sentence that matches the question’s words',
    'One that chains facts across documents through the people, teams and products it names',
    'One whose answer sentence was cut in two by the chunker',
  ],
  correct: 1,
  explanation: 'The graph links named things across documents, so it can follow scanner → team → approver. A single-sentence lookup is cheaper with plain retrieval, and a cut sentence is fixed by better chunking or an agent fetching neighbours.',
};

export const STEPS: Step<S>[] = [
  {
    id: 'recap', focus: 'next', visibleControls: ['next'],
    narration: 'Every pipeline so far searched once. Naive RAG is the chapter 3 version: one search, paste the top chunks, answer. Advanced RAG keeps that single pass and tunes it with the chapter 5 levers. To make each type’s strengths easy to see, the retriever here hands over one 16-word chunk.',
    predicate: s => s.acks >= 1,
  },
  {
    id: 'naive-run', focus: 'run', visibleControls: ['cards', 'run'],
    narration: 'Pick the enterprise refund question and run it as naive RAG. Each run adds a row to the results strip under the canvas.',
    predicate: s => !!row(s, 'refund-enterprise', 'naive'),
  },
  {
    id: 'attach', focus: 'types', visibleControls: ['types'], opensDrawer: 'answer',
    narration: 'Wrong: the one chunk stopped right after “does NOT”, so the model never read the exception. A single search cannot notice that. Agentic RAG puts an agent between the retriever and the model. It reads what came back and decides whether, and how, to search again. Switch the type to Agentic.',
    predicate: s => s.type === 'agentic',
    solution: s => { const canvas = { ...s.canvas, unlocked: unlockedFor('agentic') }; return { ...s, type: 'agentic', canvas, verdict: null }; },
  },
  {
    id: 'agent-run', focus: 'run', visibleControls: ['maxCalls', 'run'], opensDrawer: 'answer',
    narration: 'The agent sits in the side bay, wired to the retriever both ways. Max calls caps how many retrievals it may make. Keep it at 2 and run the same question.',
    predicate: s => row(s, 'refund-enterprise', 'agentic')?.verdict === 'correct',
    hint: 'The agent needs at least 2 calls to search again.',
  },
  {
    id: 'cost', focus: 'cards', visibleControls: ['cards', 'types', 'run'], opensDrawer: 'answer',
    narration: 'Correct in 2 calls: the first search found a chunk cut mid-sentence, so the agent fetched its neighbours and read the sentence whole. The answer panel shows its call log. Now run the hotel limit question under both types.',
    predicate: s => !!row(s, 'stale-hotel-limit', 'naive') && !!row(s, 'stale-hotel-limit', 'agentic'),
    hint: 'Pick the hotel card and run it, switch the type, then run it again.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'],
    narration: 'Both wrong, and the agent paid for a second search. The retired 2018 policy is the problem, and searching more never removes it: a metadata filter does. One question before the next type.',
    predicate: s => s.quiz === QUIZ.correct,
    hint: 'Compare the refund rows with the hotel rows in the strip.',
  },
  {
    id: 'multi-hop', focus: 'cards', visibleControls: ['cards', 'types', 'run'],
    narration: 'A harder question: who approves purchases for the team that owns the Kestrel K2 scanner integration? One document says which team owns the integration. Another says who approves that team’s purchases, and never mentions the scanner. Pick the Kestrel card and run it as naive and as agentic.',
    predicate: s => !!row(s, MULTI, 'naive') && !!row(s, MULTI, 'agentic'),
    hint: 'Pick the Kestrel card, run it, switch the type, then run it again.',
  },
  {
    id: 'attach-graph', focus: 'types', visibleControls: ['types'], opensDrawer: 'answer',
    narration: 'Not found either way. A search matches the words of one question, and no single sentence links the scanner to the approver. The agent’s extra searches reached the approver sentence, but never the one naming the team that owns the scanner. GraphRAG works from a map of things and how they relate, drawn from the documents ahead of time. Switch the type to GraphRAG.',
    predicate: s => s.type === 'graph',
    solution: s => { const canvas = { ...s.canvas, unlocked: unlockedFor('graph') }; return { ...s, type: 'graph', canvas, verdict: null }; },
  },
  {
    id: 'graph-one', focus: 'run', visibleControls: ['run'], opensDrawer: 'answer',
    narration: 'The graph sits in the side bay beside the index. It starts from the things your question names, here the Kestrel K2, and follows relations outward. Every relation points back to the sentence it came from, and the chunks holding those sentences go to the model. The walk is drawn under the canvas. Run it with 1 hop.',
    predicate: s => !!row(s, MULTI, 'graph'),
  },
  {
    id: 'graph-two', focus: 'hops', visibleControls: ['hops', 'run'], opensDrawer: 'answer',
    narration: 'Still not found. One hop reached Fulfillment Systems through the sentence that says it owns the integration, then stopped one step short of anyone who approves its purchases. Set hops to 2 and run again.',
    predicate: s => row(s, MULTI, 'graph')?.verdict === 'correct',
    hint: 'Drag the hops slider to 2, then run.',
  },
  {
    id: 'graph-quiz', focus: 'quiz', visibleControls: ['gquiz'],
    narration: 'Correct. The second hop crossed from Fulfillment Systems to Tomasz Rehnquist, whose sentence sits in a different document. The price shows in the strip: a walk takes every relation it passes, so the model read about two dozen chunks instead of one. One question before the next type.',
    predicate: s => s.gquiz === GRAPH_QUIZ.correct,
    hint: 'Compare the Kestrel rows in the strip.',
  },
];

/** The graph walk under the canvas: entities in columns by hop, walked relations lit per hop. */
function GraphWalk({ trace }: { trace: Traversal | null }) {
  if (!trace) return null;
  const summary = graphSummary(trace);
  if (!trace.seeds.length) return <p className="graph-walk note">{summary}</p>;
  const layout = graphLayout(trace);
  return (
    <figure className="graph-walk">
      <IsoStage board={layout.board} scene={() => graphScene(trace, layout)} label={summary} />
      <figcaption className="legend">
        {trace.hops.map((h, i) => <span key={h.hop}><i style={{ background: HOP_COLOURS[i] }} /> hop {h.hop}</span>)}
        {layout.ghost.size > 0 && <span><i className="ghost" /> one more hop</span>}
      </figcaption>
    </figure>
  );
}

const label = (r: ResultRow) => ({ question: CARDS.find(c => c.q === r.q)?.short ?? Q(r.q).query, type: typeOf(r.type).label });

export default function Types() {
  // one run per card, in a fixed order (hook rules hold: CARDS is extended at module load, never during render)
  const runs = Object.fromEntries(CARDS.map(c => [c.q, useRagRun(Q(c.q))])) as Record<string, ReturnType<typeof useRagRun>>;
  const byQ = Object.fromEntries(CARDS.map(c => [c.q, ragPanels<S>(runs[c.q])])) as Record<string, Record<string, Panel<S>>>;
  const panels = Object.fromEntries(Object.entries(byQ[CARDS[0].q]).map(([k, p]) => [k, { title: p.title, render: (s: S, apply: (n: S) => void) => byQ[s.q][k].render(s, apply) }]));
  const i = CHAPTERS.findIndex(c => c.id === ID);
  const next = CHAPTERS[i + 1];
  const withCanvas = (s: S, canvas: CanvasState, more: Partial<S> = {}): S => ({ ...s, ...more, canvas, verdict: runs[more.q ?? s.q].verdictOf(canvas) });
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{ q: CARDS[0].q, type: 'naive', rows: [], canvas: initialCanvas(unlockedFor('naive'), KNOBS), verdict: null, math: false, probed: false, acks: 0, quiz: null, gquiz: null }}
      next={next && { href: chapterHref(next.id), title: next.short }}
      stage={p => <div className="stage-col">
        <RagStage {...p} run={runs[p.state.q]} />
        {p.state.type === 'graph' && <GraphWalk trace={runs[p.state.q].out?.graph ?? null} />}
        <ResultStrip rows={p.state.rows} label={label} />
      </div>}
      controls={{
        next: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, acks: state.acks + 1 })}>Compare types →</button>,
        cards: ({ state, apply }) => (
          <fieldset className="pick">
            <legend>Question</legend>
            {CARDS.map(c => (
              <label key={c.q}>
                <input type="radio" name="card" value={c.q} checked={state.q === c.q} onChange={() => apply(withCanvas(state, state.canvas, { q: c.q }))} /> {c.label}
              </label>
            ))}
          </fieldset>
        ),
        types: ({ state, apply }) => (
          <fieldset className="pick">
            <legend>RAG type</legend>
            {TYPES.map(t => (
              <label key={t.id}>
                <input type="radio" name="type" value={t.id} checked={state.type === t.id}
                  onChange={() => apply(withCanvas(state, { ...state.canvas, unlocked: unlockedFor(t.id) }, { type: t.id }))} /> {t.label}
              </label>
            ))}
          </fieldset>
        ),
        run: ({ state, apply }) => {
          const o = runs[state.q].outcomeOf(state.canvas);
          const add = () => {
            if (!o?.answer) return;
            const r: ResultRow = { q: state.q, type: state.type, verdict: o.answer.verdict, calls: o.calls?.length ?? (o.record ? 1 : 0), chunks: o.record?.context.length ?? 0 };
            apply({ ...state, verdict: r.verdict, rows: [...state.rows.filter(x => x.q !== r.q || x.type !== r.type), r] });
          };
          return <button type="button" className="big" disabled={!o?.answer} onClick={add}>{o?.answer ? `Run as ${typeOf(state.type).label}` : 'Preparing…'}</button>;
        },
        maxCalls: ({ state, apply }) => <Knob name="maxCalls" state={state.canvas} question={Q(state.q)} onChange={canvas => apply(withCanvas(state, canvas))} />,
        hops: ({ state, apply }) => <Knob name="hops" state={state.canvas} question={Q(state.q)} onChange={canvas => apply(withCanvas(state, canvas))} />,
        quiz: ({ state, apply }) => <Quiz {...QUIZ} value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} />,
        gquiz: ({ state, apply }) => <Quiz {...GRAPH_QUIZ} value={state.gquiz} onAnswer={(_, q) => apply({ ...state, gquiz: q })} />,
      }}
      inspectPanel="answer"
      panels={panels}
    />
  );
}
