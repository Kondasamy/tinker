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
import Predict, { Reveal } from '../../components/quiz/Predict';
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
  prediction: number | null;
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

// Predict, then reveal (R9): before the naive run, what one search makes of the refund question's cut chunk.
// The outcome is the recorded verdict, read off the reader's own run.
const PREDICT = {
  question: 'Naive RAG makes one search and gets one small chunk. What will it answer?',
  options: [
    'Correct: the chunk holds the whole refund rule',
    'Wrong: the chunk stops before the exception',
    'Not found: no chunk matches the question',
  ],
};
const OUTCOME: Partial<Record<string, number>> = { correct: 0, wrong: 1, notfound: 2 };

const QUIZ = {
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
    'More searches are not free, and they do not always help: on the hotel question the agent paid for a second search and was still wrong.',
    'Right. A follow-up pays off when there is something left to fetch: the rest of a cut sentence, or the next hop of a question.',
    'Searching again finds the same stale documents. A metadata filter keeps them out; an agent cannot.',
  ],
};

const MULTI = 'kestrel-purchase-approver';
const SC = 'card-data-retention',
  PRICE = 'k2-volume-price',
  PDF = 'dock-sensor-warranty',
  IMG = 'customer-success-lead';
const ORG = 'org-chart-2025';
const GRAPH_QUIZ = {
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
    'Right. The graph links the people, teams and products documents name, so it can follow scanner → team → approver.',
    'A cut sentence is a chunking problem. Better chunking, or an agent fetching neighbours, fixes it; a graph does not.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'recap',
    focus: 'predict',
    visibleControls: ['predict'],
    narration:
      'Naive RAG searches once; advanced RAG tunes that search. Here each search returns one small chunk. Predict.',
    label: 'Predicted the naive answer',
    more: 'Naive RAG is the chapter 3 version; advanced RAG keeps its single pass and tunes it with the chapter 5 levers. Every pipeline so far searched once. Here the retriever hands over one 16-word chunk, which makes each type’s strengths easy to see.',
    predicate: s => s.prediction != null, // a run saved before this step was a prediction has none
  },
  {
    id: 'naive-run',
    focus: 'run',
    visibleControls: ['predict', 'cards', 'run'],
    narration: 'Run the enterprise refund question as naive RAG. Each run adds a row below.',
    label: 'Ran the refund question as naive RAG',
    predicate: s => !!row(s, 'refund-enterprise', 'naive'),
  },
  {
    id: 'attach',
    focus: 'types',
    visibleControls: ['reveal', 'types'],
    opensDrawer: 'answer',
    narration: 'Cut at “does NOT”. An agent reads results and can search again. Switch to Agentic.',
    label: 'Switched to agentic RAG',
    more: 'The chunk stopped after “does NOT”, so the model never read the exception, and one search cannot notice. Agentic RAG puts an agent between the retriever and the model; it decides how to search again as well as whether.',
    predicate: s => s.type === 'agentic',
    solution: s => switchType(s, 'agentic'),
  },
  {
    id: 'agent-run',
    focus: 'run',
    visibleControls: ['maxCalls', 'run'],
    opensDrawer: 'answer',
    narration: 'Max calls caps the agent’s searches. Keep 2 and run the question again.',
    label: 'Ran the refund question with the agent',
    more: 'The agent sits in the side bay, wired to the retriever.',
    predicate: s => row(s, 'refund-enterprise', 'agentic')?.verdict === 'correct',
    hint: 'The agent needs at least 2 calls to search again.',
  },
  {
    id: 'cost',
    focus: 'cards',
    visibleControls: ['cards', 'types', 'run'],
    opensDrawer: 'answer',
    narration: 'The agent fetched the cut chunk’s neighbours. Run the hotel question both ways.',
    label: 'Ran the hotel question both ways',
    more: 'It answered in 2 calls: the first chunk was cut mid-sentence, so the agent fetched its neighbours to read the sentence whole. The answer panel shows the agent’s call log.',
    predicate: s => !!row(s, 'stale-hotel-limit', 'naive') && !!row(s, 'stale-hotel-limit', 'agentic'),
    hint: 'Pick the hotel card and run it, switch the type, then run it again.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Both wrong. A retired 2018 policy misleads them; a metadata filter fixes that, not more searches.',
    label: 'Answered when an agent pays off',
    more: 'The agent paid for a second search and was still wrong: searching more never removes the retired policy.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Compare the refund rows with the hotel rows in the strip.',
  },
  {
    id: 'multi-hop',
    focus: 'cards',
    visibleControls: ['cards', 'types', 'run'],
    narration: 'One document names the Kestrel team, another its approver. Run the Kestrel card both ways.',
    label: 'Ran the Kestrel question both ways',
    more: 'The approver’s document never mentions the scanner.',
    predicate: s => !!row(s, MULTI, 'naive') && !!row(s, MULTI, 'agentic'),
    hint: 'Pick the Kestrel card, run it, switch the type, then run it again.',
  },
  {
    id: 'attach-graph',
    focus: 'types',
    visibleControls: ['types'],
    opensDrawer: 'answer',
    narration: 'Neither found it. GraphRAG walks a map of relations built from the documents. Switch to GraphRAG.',
    label: 'Switched to GraphRAG',
    more: 'No single sentence links the scanner to the approver. A search matches the words of one question. The agent’s extra searches reached the approver sentence, but never the one naming the team that owns the scanner. The graph’s map is drawn from the documents ahead of time.',
    predicate: s => s.type === 'graph',
    solution: s => switchType(s, 'graph'),
  },
  {
    id: 'graph-one',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'answer',
    narration: 'The walk starts at Kestrel K2, named in your question. Run it with 1 hop.',
    label: 'Walked the graph one hop',
    more: 'From the things your question names, the walk follows relations outward; it is drawn under the canvas. The graph sits in the side bay beside the index. Every relation points back to the sentence it came from, and the chunks holding those sentences go to the model.',
    predicate: s => !!row(s, MULTI, 'graph'),
  },
  {
    id: 'graph-two',
    focus: 'hops',
    visibleControls: ['hops', 'run'],
    opensDrawer: 'answer',
    narration: 'One hop reached the owning team, Fulfillment Systems. Set hops to 2 and run again.',
    label: 'Walked two hops to the approver',
    more: 'One hop stopped short of the team’s approver.',
    predicate: s => row(s, MULTI, 'graph')?.verdict === 'correct',
    hint: 'Drag the hops slider to 2, then run.',
  },
  {
    id: 'graph-quiz',
    focus: 'quiz',
    visibleControls: ['gquiz'],
    narration: 'Hop two reached Tomasz Rehnquist in another document. Cost: about two dozen chunks, not one.',
    label: 'Answered what GraphRAG is for',
    more: 'The second hop went from Fulfillment Systems to Tomasz Rehnquist. A walk takes every relation it passes. The strip shows how many chunks each run read.',
    predicate: s => s.gquiz === GRAPH_QUIZ.correct || s.gquiz === UNSURE,
    hint: 'Compare the Kestrel rows in the strip.',
  },
  {
    id: 'sc-run',
    focus: 'run',
    visibleControls: ['run'],
    setup: s => ({ ...switchType(s, 'naive'), q: SC }),
    narration: 'Trap: how long is payment card data kept? A demo-card note shares its words. Run as naive.',
    label: 'Ran the card data question as naive',
    more: 'The look-alike is a meeting note about fake demo cards.',
    predicate: s => !!row(s, SC, 'naive'),
  },
  {
    id: 'sc-attach',
    focus: 'types',
    visibleControls: ['types'],
    opensDrawer: 'answer',
    narration:
      'Confidently wrong. Self-correcting RAG grades retrieval, retries, or says “I don’t know”. Switch to it.',
    label: 'Switched to self-correcting RAG',
    more: 'It read the note about demo card samples, not the security policy. The Evaluator at the end of the track grades retrieval before the model answers: weak results mean a rewritten search, then “I don’t know” instead of a guess.',
    predicate: s => s.type === 'selfcheck',
    solution: s => switchType(s, 'selfcheck'),
  },
  {
    id: 'sc-grade',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'answer',
    narration: `The Evaluator’s cross-encoder reads question and chunk together. The best chunk must reach ${GRADE_BAR}. Run again.`,
    label: 'Graded the card data search',
    more: 'A cross-encoder is a model that reads the question and the chunk together and scores how well they match.',
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
    narration: 'Honest “I don’t know”. No grade can read a table, PDF or image. Switch to Multimodal.',
    label: 'Switched to multimodal RAG',
    more: 'The look-alike note and a rewrite both scored below the bar. An honest gap beats a confident wrong answer, and the call log shows both tries. Price tables, scanned PDFs and images are files a plain-text pipeline cannot read.',
    predicate: s => s.type === 'multimodal',
    solution: s => switchType(s, 'multimodal'),
  },
  {
    id: 'mm-run',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'answer',
    narration:
      'A plain-text reader skips tables; parsers start off. Sentence cuts keep rows whole. Run the K2 price question.',
    label: 'Ran the price question as multimodal',
    more: 'The Docs block has three parsers: tables, PDFs and images. Each turns its kind of file into text the retriever can search. Cutting by sentence keeps a table row whole.',
    predicate: s => !!row(s, PRICE, 'multimodal'),
  },
  {
    id: 'mm-tables',
    focus: 'parse',
    visibleControls: ['parse', 'run'],
    opensDrawer: 'answer',
    narration: 'Not found: table parsing is off. Turn on “Parse tables to text” and run again.',
    label: 'Parsed the table and found the price',
    more: 'The price list is a table; with table parsing off, retrieval never sees it.',
    predicate: s => row(s, PRICE, 'multimodal')?.verdict === 'correct',
    hint: 'Tick “Parse tables to text”, then run.',
  },
  {
    id: 'mm-more',
    focus: 'cards',
    visibleControls: ['cards', 'parse', 'run'],
    opensDrawer: 'answer',
    narration: 'The other two cards need the PDF and image parsers. Turn them on and run both.',
    label: 'Read a PDF and an image',
    more: 'The price came from the K2 row. The dock sensor warranty lives in a vendor PDF and needs PDF parsing; the Customer Success lead is only in the org chart image and needs image captions.',
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
        prediction: null,
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
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction ?? null} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state }) => {
          const out = OUTCOME[row(state, 'refund-enterprise', 'naive')?.verdict ?? ''];
          return (
            out !== undefined && (
              <Reveal
                prediction={state.prediction == null ? null : PREDICT.options[state.prediction]}
                outcome={PREDICT.options[out]}
                revealed
                onReveal={() => {}}
              />
            )
          );
        },
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
