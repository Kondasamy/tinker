// Chapter 6 step script: types of RAG (R16, R17). Recaps naive vs advanced, then attaches the agent side bay.
// The learner picks a question card, runs it under the current type, and the result strip keeps one row per
// question and type, so the types sit side by side on the same corpus and the same knobs.
// Later type units extend this chapter: push to TYPES (a type = the blocks it adds), CARDS and STEPS.
// GraphRAG (U12) adds the graph side bay, a hops knob and the multi-hop Kestrel card; its walk is drawn under the canvas.
// Self-correcting (U13) is a setting on the Evaluator (grade, retry with a rewrite, or say "I don't know");
// Multimodal (U13) is the Docs block's parsers for tables, PDFs and images, with its own three cards.
// The canvas stays the hero: the stage shows only the latest runs, the full comparison lives in the Compare tab.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { UNSURE } from '../../lib/recall';
import KnobList, { Knob } from '../../components/canvas/Knobs';
import { initialCanvas, unlockedThrough, type CanvasQuestion, type CanvasState } from '../../components/canvas/state';
import { RagStage, useQuestionRuns, type RagState } from '../../components/panels/rag';
import ResultStrip, { comparePanel, rowOf, withRow, type ResultRow } from '../../components/panels/ResultStrip';
import IsoStage from '../../lib/iso/IsoStage';
import { graphLayout, graphScene, graphSummary, pathOf, HOP_COLOURS } from '../../components/canvas/graphView';
import type { Traversal } from '../../lib/rag/graph';
import { nextOf } from '../../lib/chapters';
import orgChart from '../../../data/corpus/assets/org-chart-2025.svg?url';
import { GRADE_BAR } from '../../lib/rag/selfcheck';
import { TYPES, CARDS, KNOBS, rowLabel } from './types-data';
import { questionById as Q } from './questions';

const ID = '06-types';
/** One run per card, in a fixed order (hook rules hold: CARDS is extended at module load, never during render). */
const CARD_QS = CARDS.map(c => Q(c.q));

const BASE = unlockedThrough('05-accuracy');
const typeOf = (id: string) => TYPES.find(t => t.id === id)!;
const unlockedFor = (type: string) => [...BASE, ...typeOf(type).blocks];
const TYPE_KNOBS = ['strategy', 'size', 'overlap', 'topK', 'grade', 'tables', 'pdfs', 'images'] as const;
const cardsFor = (type: string) => CARDS.filter(c => !!c.mm === (type === 'multimodal'));

export interface S extends RagState {
  q: string;
  type: string;
  rows: ResultRow[];
  acks: number;
  quiz: number | null;
  gquiz: number | null;
}

const row = (s: S, q: string, type: string) => s.rows.find(r => r.q === q && r.type === type);

/** Switch type: attach its blocks, reset the per-type knobs to the chapter setting plus its own, keep the card if it shows there. */
function switchType(s: S, type: string): S {
  const knobs = { ...s.canvas.knobs, ...Object.fromEntries(TYPE_KNOBS.map(k => [k, KNOBS[k]])), ...typeOf(type).knobs };
  const cards = cardsFor(type);
  return {
    ...s,
    type,
    q: cards.some(c => c.q === s.q) ? s.q : cards[0].q,
    canvas: { ...s.canvas, unlocked: unlockedFor(type), knobs },
    verdict: null,
  };
}

export const QUIZ = {
  question: 'When is an agent worth its extra retrieval calls?',
  options: [
    'Always: more searches always mean a better answer',
    'When the first search finds part of the answer and a follow-up can fetch the rest',
    'When the documents themselves are out of date',
  ],
  correct: 1,
  explanation:
    'Each call costs time and money. A follow-up pays off when there is something left to fetch: the rest of a cut sentence, or the next hop of a question. It cannot fix stale documents.',
  why: [
    'More searches are not free: on the hotel question the agent paid for a second search and was still wrong.',
    'Right: a follow-up pays off when there is something left to fetch, like the rest of a cut sentence or the next hop.',
    'Searching again finds the same stale documents: a metadata filter keeps them out, an agent cannot.',
  ],
};

const MULTI = 'kestrel-purchase-approver';
const SC = 'card-data-retention',
  PRICE = 'k2-volume-price',
  PDF = 'dock-sensor-warranty',
  IMG = 'customer-success-lead';
const ORG = 'org-chart-2025';
export const GRAPH_QUIZ = {
  question: 'Which question is GraphRAG built for?',
  options: [
    'One whose answer sits in a single sentence that matches the question’s words',
    'One that chains facts across documents through the people, teams and products it names',
    'One whose answer sentence was cut in two by the chunker',
  ],
  correct: 1,
  explanation:
    'The graph links named things across documents, so it can follow scanner → team → approver. A single-sentence lookup is cheaper with plain retrieval, and a cut sentence is fixed by better chunking or an agent fetching neighbours.',
  why: [
    'A one-sentence lookup needs no graph: plain retrieval finds it, faster and cheaper.',
    'Right: the graph links the people, teams and products documents name, so it can follow scanner → team → approver.',
    'A cut sentence is a chunking problem: better chunking, or an agent fetching neighbours, fixes it.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'recap',
    focus: 'next',
    visibleControls: ['next'],
    narration:
      'Every pipeline so far searched once: naive RAG, then advanced. Here the retriever sends one 16-word chunk, so each type’s strengths show.',
    say: { block: 'retriever', text: 'One chunk only' },
    predicate: s => s.acks >= 1,
  },
  {
    id: 'naive-run',
    focus: 'run',
    visibleControls: ['cards', 'run'],
    narration:
      'Pick the enterprise refund question and run it as naive RAG. Each run adds a row to the results strip under the canvas.',
    predicate: s => !!row(s, 'refund-enterprise', 'naive'),
  },
  {
    id: 'attach',
    focus: 'types',
    visibleControls: ['types'],
    opensDrawer: 'answer',
    narration:
      'Wrong: one chunk stopped after “does NOT”. Agentic RAG puts an agent between retriever and model to decide whether to search again. Switch to Agentic.',
    say: { block: 'llm', text: 'Read half a rule' },
    predicate: s => s.type === 'agentic',
    solution: s => switchType(s, 'agentic'),
  },
  {
    id: 'agent-run',
    focus: 'run',
    visibleControls: ['maxCalls', 'run'],
    opensDrawer: 'answer',
    narration:
      'The agent sits in the side bay, wired to the retriever both ways. Max calls caps its retrievals. Keep it at 2 and run.',
    say: { block: 'agent', text: 'Can search again' },
    predicate: s => row(s, 'refund-enterprise', 'agentic')?.verdict === 'correct',
    hint: 'The agent needs at least 2 calls to search again.',
  },
  {
    id: 'cost',
    focus: 'cards',
    visibleControls: ['cards', 'types', 'run'],
    opensDrawer: 'answer',
    narration:
      'Correct in 2 calls: the first chunk was cut mid-sentence, so the agent fetched its neighbours. Now run the hotel limit question under both types.',
    predicate: s => !!row(s, 'stale-hotel-limit', 'naive') && !!row(s, 'stale-hotel-limit', 'agentic'),
    hint: 'Pick the hotel card and run it, switch the type, then run it again.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration:
      'Both wrong, and the agent paid for a second search. Searching more never removes the retired 2018 policy: a metadata filter does. One question.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Compare the refund rows with the hotel rows in the strip.',
  },
  {
    id: 'multi-hop',
    focus: 'cards',
    visibleControls: ['cards', 'types', 'run'],
    narration:
      'Harder: who approves purchases for the team owning the Kestrel K2 scanner integration? It spans two documents. Pick its card; run naive and agentic.',
    predicate: s => !!row(s, MULTI, 'naive') && !!row(s, MULTI, 'agentic'),
    hint: 'Pick the Kestrel card, run it, switch the type, then run it again.',
  },
  {
    id: 'attach-graph',
    focus: 'types',
    visibleControls: ['types'],
    opensDrawer: 'answer',
    narration:
      'Not found either way: no single sentence links the scanner to the approver. GraphRAG walks a knowledge graph drawn from the documents. Switch to GraphRAG.',
    predicate: s => s.type === 'graph',
    solution: s => switchType(s, 'graph'),
  },
  {
    id: 'graph-one',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'answer',
    narration:
      'The graph starts from what your question names, the Kestrel K2, and follows relations outward to the sentences behind them. Run it with 1 hop.',
    say: { block: 'graph', text: 'Walks relations' },
    predicate: s => !!row(s, MULTI, 'graph'),
  },
  {
    id: 'graph-two',
    focus: 'hops',
    visibleControls: ['hops', 'run'],
    opensDrawer: 'answer',
    narration:
      'Still not found. One hop reached Fulfillment Systems, the team that owns the integration, and stopped short of its approver. Set hops to 2.',
    say: { block: 'graph', text: 'One step short' },
    predicate: s => row(s, MULTI, 'graph')?.verdict === 'correct',
    hint: 'Drag the hops slider to 2, then run.',
  },
  {
    id: 'graph-quiz',
    focus: 'quiz',
    visibleControls: ['gquiz'],
    narration:
      'Correct: the second hop reached Tomasz Rehnquist in another document. The price: the walk sent about two dozen chunks instead of one. One question.',
    predicate: s => s.gquiz === GRAPH_QUIZ.correct || s.gquiz === UNSURE,
    hint: 'Compare the Kestrel rows in the strip.',
  },
  {
    id: 'sc-run',
    focus: 'run',
    visibleControls: ['run'],
    setup: s => ({ ...switchType(s, 'naive'), q: SC }),
    narration:
      'Next, a trap: how long does Larkspur keep customer payment card data? A meeting note about fake demo cards uses near-identical words. Run naive.',
    predicate: s => !!row(s, SC, 'naive'),
  },
  {
    id: 'sc-attach',
    focus: 'types',
    visibleControls: ['types'],
    opensDrawer: 'answer',
    narration:
      'Wrong: it read the demo note. Self-correcting RAG grades retrieval before answering, retries, and says “I don’t know” if nothing passes. Switch to Self-correcting.',
    say: { block: 'llm', text: 'Read the demo note' },
    predicate: s => s.type === 'selfcheck',
    solution: s => switchType(s, 'selfcheck'),
  },
  {
    id: 'sc-grade',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'answer',
    narration: `The Evaluator scores each search with a cross-encoder, which reads question and chunk together. A best chunk of ${GRADE_BAR} or more passes. Run again.`,
    predicate: s => {
      const r = row(s, SC, 'selfcheck');
      return !!r && r.verdict !== 'wrong';
    },
  },
  {
    id: 'mm-attach',
    focus: 'types',
    visibleControls: ['types'],
    opensDrawer: 'answer',
    narration:
      'The look-alike and a rewrite both failed the bar, so it said “I don’t know”. No grade reads tables, PDFs or images. Switch to Multimodal.',
    say: { block: 'grader', text: 'Says “I don’t know”' },
    predicate: s => s.type === 'multimodal',
    solution: s => switchType(s, 'multimodal'),
  },
  {
    id: 'mm-run',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'answer',
    narration:
      'A plain-text reader skips tables and images, so the Docs block’s three parsers start off. Run the price question: a Kestrel K2 at 50+ units?',
    say: { block: 'docs', text: 'Parsers off' },
    predicate: s => !!row(s, PRICE, 'multimodal'),
  },
  {
    id: 'mm-tables',
    focus: 'parse',
    visibleControls: ['parse', 'run'],
    opensDrawer: 'answer',
    narration:
      'Not found: the price list is a table, and with table parsing off retrieval never sees it. Turn on “Parse tables to text” and rerun.',
    predicate: s => row(s, PRICE, 'multimodal')?.verdict === 'correct',
    hint: 'Tick “Parse tables to text”, then run.',
  },
  {
    id: 'mm-more',
    focus: 'cards',
    visibleControls: ['cards', 'parse', 'run'],
    opensDrawer: 'answer',
    narration:
      'Correct: $410, from the table’s K2 row. The sensor warranty sits in a vendor PDF, the lead in an org chart image. Turn on both.',
    predicate: s =>
      row(s, PDF, 'multimodal')?.verdict === 'correct' && row(s, IMG, 'multimodal')?.verdict === 'correct',
    hint: 'PDF parsing for the warranty card, image captions for the Customer Success card.',
  },
];

/** The graph walk under the canvas: entities in columns by hop, walked relations lit per hop. */
function GraphWalk({ trace, question }: { trace: Traversal | null; question: CanvasQuestion }) {
  if (!trace) return null;
  const summary = graphSummary(trace);
  if (!trace.seeds.length) return <p className="graph-walk note">{summary}</p>;
  const layout = graphLayout(trace);
  return (
    <figure className="graph-walk">
      {/* focusable so keyboard users can reveal every peg's name (CSS shows all labels on focus) */}
      <IsoStage
        board={layout.board}
        scene={() => graphScene(trace, layout, pathOf(trace, question.goldSentences))}
        label={summary}
        tabIndex={0}
      />
      <figcaption className="legend">
        {trace.hops.map((h, i) => (
          <span key={h.hop}>
            <i style={{ background: HOP_COLOURS[i] }} /> hop {h.hop}
          </span>
        ))}
        {layout.ghost.size > 0 && (
          <span>
            <i className="ghost" /> one more hop
          </span>
        )}
      </figcaption>
    </figure>
  );
}

export default function Types() {
  const { runs, panels } = useQuestionRuns<S>(CARD_QS);
  const answer = panels.answer.render;
  // the image behind a retrieved caption sits with the answer it fed
  panels.answer = {
    ...panels.answer,
    render: (s, apply) => (
      <>
        {answer(s, apply)}
        {runs[s.q].out?.record?.context.some(c => c.doc === ORG) && (
          <figure className="mm-asset">
            <img
              src={orgChart}
              width={760}
              height={340}
              alt="Larkspur Supply Co. organization chart, January 2025: the CEO, four leaders under her, and the teams under each leader."
            />
            <figcaption>The org chart image. Its caption is the text that was retrieved.</figcaption>
          </figure>
        )}
      </>
    ),
  };
  panels.compare = comparePanel<S>(rowLabel);
  const withCanvas = (s: S, canvas: CanvasState, more: Partial<S> = {}): S => ({
    ...s,
    ...more,
    canvas,
    verdict: runs[more.q ?? s.q].verdictOf(canvas),
  });
  const withType = (s: S, type: string) => {
    const n = switchType(s, type);
    return { ...n, verdict: runs[n.q].verdictOf(n.canvas) };
  };
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{
        q: CARDS[0].q,
        type: 'naive',
        rows: [],
        canvas: initialCanvas(unlockedFor('naive'), KNOBS),
        verdict: null,
        math: false,
        probed: false,
        acks: 0,
        quiz: null,
        gquiz: null,
      }}
      next={nextOf(ID)}
      stage={p => (
        <div className="stage-col">
          <RagStage {...p} run={runs[p.state.q]} extraTabs={[['compare', 'Compare']]} />
          {p.state.type === 'graph' && <GraphWalk trace={runs[p.state.q].out?.graph ?? null} question={Q(p.state.q)} />}
          <ResultStrip rows={p.state.rows} label={rowLabel} latest={3} onAll={() => p.inspect('compare')} />
        </div>
      )}
      controls={{
        next: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, acks: state.acks + 1 })}>
            Compare types →
          </button>
        ),
        cards: ({ state, apply }) => (
          <fieldset className="pick">
            <legend>Question</legend>
            {cardsFor(state.type).map(c => (
              <label key={c.q}>
                <input
                  type="radio"
                  name="card"
                  value={c.q}
                  checked={state.q === c.q}
                  onChange={() => apply(withCanvas(state, state.canvas, { q: c.q }))}
                />{' '}
                {c.label}
              </label>
            ))}
          </fieldset>
        ),
        types: ({ state, apply }) => (
          <fieldset className="pick">
            <legend>RAG type</legend>
            {TYPES.map(t => (
              <label key={t.id}>
                <input
                  type="radio"
                  name="type"
                  value={t.id}
                  checked={state.type === t.id}
                  onChange={() => apply(withType(state, t.id))}
                />{' '}
                {t.label}
              </label>
            ))}
          </fieldset>
        ),
        run: ({ state, apply }) => {
          const o = runs[state.q].outcomeOf(state.canvas);
          const add = () => {
            if (!o?.answer) return;
            const r = rowOf(state.q, state.type, o);
            apply({ ...state, verdict: r.verdict, rows: withRow(state.rows, r) });
          };
          return (
            <button type="button" className="big" disabled={!o?.answer} onClick={add}>
              {o?.answer ? `Run as ${typeOf(state.type).label}` : 'Preparing…'}
            </button>
          );
        },
        maxCalls: ({ state, apply }) => (
          <Knob
            name="maxCalls"
            state={state.canvas}
            question={Q(state.q)}
            onChange={canvas => apply(withCanvas(state, canvas))}
          />
        ),
        hops: ({ state, apply }) => (
          <Knob
            name="hops"
            state={state.canvas}
            question={Q(state.q)}
            onChange={canvas => apply(withCanvas(state, canvas))}
          />
        ),
        parse: ({ state, apply }) => (
          <KnobList
            names={['tables', 'pdfs', 'images']}
            state={state.canvas}
            question={Q(state.q)}
            onChange={canvas => apply(withCanvas(state, canvas))}
          />
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
        gquiz: ({ state, apply, sync }) => (
          <Quiz
            {...GRAPH_QUIZ}
            unsure
            value={state.gquiz}
            onAnswer={(_, q) => apply({ ...state, gquiz: q })}
            onUnsure={() => sync({ ...state, gquiz: UNSURE })}
          />
        ),
      }}
      inspectPanel="answer"
      panels={panels}
    />
  );
}
