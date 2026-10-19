// Chapter 7 step script: the sandbox (R28) and the final "pick the right type" challenge (R18).
// The guided track opens with every block from chapters 3–6 wired; one step opens it into the workbench with the
// same blocks and wires, then free play over every question in the module, then the challenge closes the module.
// Guidance stays light: one prompt card with two optional "try this" ideas, not a step list.
import StepRunner, { type Panel } from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import { BlockSettings } from '../../components/canvas/Canvas';
import { initialCanvas, openBench, unlockedThrough, type CanvasQuestion, type CanvasState, type Outcome } from '../../components/canvas/state';
import { RagStage, ragPanels, useRagRun, type RagState } from '../../components/panels/rag';
import ResultStrip, { type ResultRow } from '../../components/panels/ResultStrip';
import TypeChallenge, { START, complete, type Challenge } from '../../components/quiz/TypeChallenge';
import { CARDS, TYPES } from './types-data';
import ch3 from '../../../data/questions/ch3.json';
import ch4 from '../../../data/questions/ch4.json';
import ch5 from '../../../data/questions/ch5.json';
import ch6 from '../../../data/questions/ch6.json';

const ID = '07-sandbox';
const QS = [...ch3, ...ch4, ...ch5, ...ch6] as CanvasQuestion[];
const Q = (id: string) => QS.find(q => q.id === id)!;
/** The question the sandbox opens on: every block is wired, so the graph is live, and two hops answer it. */
const FIRST = 'kestrel-purchase-approver';

export interface S extends RagState { q: string; rows: ResultRow[]; acks: number; ch: Challenge }

/** The RAG type a pipeline ran as, in the order the engine picks when several are live: graph > agent > self-check. */
export const kindOf = (o: Outcome) => (o.graph ? 'graph' : o.analysis.agent ? 'agentic' : o.calls ? 'selfcheck' : 'naive');

export const STEPS: Step<S>[] = [
  {
    id: 'open', visibleControls: [], opensDrawer: 'answer',
    narration: 'Everything you built is here: every block from chapters 3 to 6, on the track and wired. The graph walks two hops to answer the hardest question in the module, who approves purchases for the Kestrel K2 team. Now open the track into a workbench, with the button under the canvas.',
    predicate: s => s.canvas.mode === 'bench',
    solution: s => ({ ...s, canvas: openBench(s.canvas) }),
  },
  {
    id: 'play', focus: 'run', visibleControls: ['question', 'run', 'block', 'tips', 'ready'],
    narration: 'Same blocks, same wires, same answer, and now they are yours. Drag a block to move it, drag from its yellow knob to wire it, click a wire to cut it, click a block to tune it. Ask any question from the module and run it: each run lands in the strip under the canvas.',
    predicate: s => s.acks >= 1,
  },
  {
    id: 'challenge', focus: 'challenge', visibleControls: ['challenge'], opensDrawer: null,
    narration: 'Last stop. Five teams at Larkspur each describe a problem. Pick the RAG type that fits each one best.',
    predicate: s => complete(s.ch),
  },
];

const short = (q: string) => CARDS.find(c => c.q === q)?.short ?? Q(q).query;
const label = (r: ResultRow) => ({ question: short(r.q), type: TYPES.find(t => t.id === r.type)!.label });

export default function Sandbox() {
  // one run per question, in a fixed order (hook rules hold: QS never changes)
  const runs = Object.fromEntries(QS.map(q => [q.id, useRagRun(q)])) as Record<string, ReturnType<typeof useRagRun>>;
  const byQ = Object.fromEntries(QS.map(q => [q.id, ragPanels<S>(runs[q.id])])) as Record<string, Record<string, Panel<S>>>;
  const panels: Record<string, Panel<S>> = Object.fromEntries(Object.entries(byQ[FIRST]).map(([k, p]) => [k, { title: p.title, render: (s: S, apply: (n: S) => void) => byQ[s.q][k].render(s, apply) }]));
  panels.compare = { title: 'Every run, side by side', render: s => s.rows.length ? <ResultStrip rows={s.rows} label={label} /> : <p className="note">Run a question to start the comparison.</p> };
  const withCanvas = (s: S, canvas: CanvasState, q = s.q): S => ({ ...s, q, canvas, verdict: runs[q].verdictOf(canvas) });
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{ q: FIRST, rows: [], canvas: initialCanvas(unlockedThrough('06-types'), { hops: 2 }), verdict: null, math: false, probed: false, acks: 0, ch: START }}
      stage={p => <div className="stage-col">
        <RagStage {...p} run={runs[p.state.q]} extraTabs={[['compare', 'Compare']]} canvas={{ allowBench: true }} />
        <ResultStrip rows={p.state.rows} label={label} latest={3} onAll={() => p.inspect('compare')} />
      </div>}
      controls={{
        question: ({ state, apply }) => (
          <div className="knob">
            <label htmlFor="sandbox-q">Question</label>
            <select id="sandbox-q" value={state.q} onChange={e => apply(withCanvas(state, state.canvas, e.target.value))}>
              {QS.map(q => <option key={q.id} value={q.id}>{q.query}</option>)}
            </select>
          </div>
        ),
        run: ({ state, apply }) => {
          const o = runs[state.q].outcomeOf(state.canvas);
          const kind = o?.answer ? kindOf(o) : null;
          const add = () => {
            if (!o?.answer || !kind) return;
            const r: ResultRow = { q: state.q, type: kind, verdict: o.answer.verdict, calls: o.calls?.length ?? (o.record ? 1 : 0), chunks: o.record?.context.length ?? 0 };
            apply({ ...state, verdict: r.verdict, rows: [...state.rows.filter(x => x.q !== r.q || x.type !== r.type), r] });
          };
          return <button type="button" className="big" disabled={!kind} onClick={add}>{kind ? `Run as ${TYPES.find(t => t.id === kind)!.label}` : 'Preparing…'}</button>;
        },
        // block settings live in the card, so the canvas keeps the full stage (R27)
        block: ({ state, apply }) => (
          <section className="block-settings" aria-label="Block settings">
            <BlockSettings state={state.canvas} onChange={canvas => apply(withCanvas(state, canvas))} question={Q(state.q)} />
          </section>
        ),
        tips: () => (
          <div className="tips">
            <p className="lbl">Try this</p>
            <ul>
              <li>Ask whether enterprise customers can get a refund. The question names nothing the graph knows, so the model makes something up. Cut the Index → Graph wire and run it again.</li>
              <li>Ask for the hotel limit. Every type gets it wrong until you click the Retriever and filter to current documents only.</li>
            </ul>
          </div>
        ),
        ready: ({ state, apply }) => <button type="button" className="chip" onClick={() => apply({ ...state, acks: state.acks + 1 })}>Take the final challenge →</button>,
        challenge: ({ state, apply }) => <TypeChallenge value={state.ch} onChange={ch => apply({ ...state, ch })} />,
      }}
      inspectPanel="answer"
      panels={panels}
    />
  );
}
