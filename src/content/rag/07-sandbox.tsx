// Chapter 7 step script: the sandbox (R28) and the final "pick the right type" challenge (R18).
// The guided track opens with every block from chapters 3–6 wired; one step opens it into the workbench with the
// same blocks and wires, then free play over every question in the module, then the challenge closes the module.
// Guidance stays light: one prompt card with two optional "try this" ideas, not a step list.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import { BlockSettings } from '../../components/canvas/Canvas';
import {
  initialCanvas,
  openBench,
  unlockedThrough,
  type CanvasState,
  type Outcome,
} from '../../components/canvas/state';
import { RagStage, useQuestionRuns, type RagState } from '../../components/panels/rag';
import ResultStrip, { comparePanel, rowOf, withRow, type ResultRow } from '../../components/panels/ResultStrip';
import TypeChallenge, { START, complete, type Challenge } from '../../components/quiz/TypeChallenge';
import { TYPES, rowLabel } from './types-data';
import { QS_ALL, questionById } from './questions';
import Select from '../../components/story/Select';
import { Fact } from './kit';

const ID = '07-sandbox';
/** The question the sandbox opens on: every block is wired, so the graph is live, and two hops answer it. */
const FIRST = 'kestrel-purchase-approver';

export interface S extends RagState {
  q: string;
  rows: ResultRow[];
  acks: number;
  ch: Challenge;
}

/** The RAG type a pipeline ran as, in the order the engine picks when several are live: graph > agent > self-check. */
export const kindOf = (o: Outcome) =>
  o.graph ? 'graph' : o.analysis.agent ? 'agentic' : o.calls ? 'selfcheck' : 'naive';

export const STEPS: Step<S>[] = [
  {
    id: 'open',
    visibleControls: [],
    opensDrawer: 'answer',
    narration: 'Every block from chapters 3 to 6 is here, wired; the graph answers the module’s hardest question.',
    act: 'Open the workbench below.',
    predicate: s => s.canvas.mode === 'bench',
    solution: s => ({ ...s, canvas: openBench(s.canvas) }),
  },
  {
    id: 'play',
    focus: 'run',
    visibleControls: ['question', 'run', 'block', 'tips', 'ready'],
    narration: 'Now it is yours: drag blocks, wire them from their yellow knobs, click a wire to cut it.',
    act: 'Ask any question and run it.',
    predicate: s => s.acks >= 1,
  },
  {
    id: 'challenge',
    focus: 'challenge',
    visibleControls: ['fact', 'challenge'],
    opensDrawer: null,
    narration: 'Last stop. Five teams at Larkspur each describe a problem.',
    act: 'Pick the RAG type that fits each one best.',
    predicate: s => complete(s.ch),
  },
];

export default function Sandbox() {
  const { runs, panels } = useQuestionRuns<S>(QS_ALL);
  panels.compare = comparePanel<S>(rowLabel);
  const withCanvas = (s: S, canvas: CanvasState, q = s.q): S => ({
    ...s,
    q,
    canvas,
    verdict: runs[q].verdictOf(canvas),
  });
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{
        q: FIRST,
        rows: [],
        canvas: initialCanvas(unlockedThrough('06-types'), { hops: 2 }),
        verdict: null,
        math: false,
        probed: false,
        acks: 0,
        ch: START,
      }}
      stage={p => (
        <div className="stage-col">
          <RagStage {...p} run={runs[p.state.q]} extraTabs={[['compare', 'Compare']]} canvas={{ allowBench: true }} />
          <ResultStrip rows={p.state.rows} label={rowLabel} latest={3} onAll={() => p.inspect('compare')} />
        </div>
      )}
      controls={{
        fact: () => <Fact id="adaptive-rag" />,
        question: ({ state, apply }) => (
          <div className="knob">
            <label htmlFor="sandbox-q">Question</label>
            <Select
              id="sandbox-q"
              value={state.q}
              onChange={e => apply(withCanvas(state, state.canvas, e.target.value))}
            >
              {QS_ALL.map(q => (
                <option key={q.id} value={q.id}>
                  {q.query}
                </option>
              ))}
            </Select>
          </div>
        ),
        run: ({ state, apply }) => {
          const o = runs[state.q].outcomeOf(state.canvas);
          const kind = o?.answer ? kindOf(o) : null;
          const add = () => {
            if (!o?.answer || !kind) return;
            const r = rowOf(state.q, kind, o);
            apply({ ...state, verdict: r.verdict, rows: withRow(state.rows, r) });
          };
          return (
            <button type="button" className="big" disabled={!kind} onClick={add}>
              {kind ? `Run as ${TYPES.find(t => t.id === kind)!.label}` : 'Preparing…'}
            </button>
          );
        },
        // block settings live in the card, so the canvas keeps the full stage (R27)
        block: ({ state, apply }) => (
          <section className="block-settings" aria-label="Block settings">
            <BlockSettings
              state={state.canvas}
              onChange={canvas => apply(withCanvas(state, canvas))}
              question={questionById(state.q)}
            />
          </section>
        ),
        tips: () => (
          <div className="tips">
            <p className="lbl">Try this</p>
            <ul>
              <li>
                Ask whether enterprise customers can get a refund. The question names nothing the graph knows, so the
                model makes something up. Cut the Index → Graph wire and run it again.
              </li>
              <li>
                Ask for the hotel limit. The graph knows no hotels, so cut the Index → Graph wire first: the agent then
                quotes an outdated limit. Click the Retriever, filter to current documents only, and run it again.
              </li>
            </ul>
          </div>
        ),
        ready: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, acks: state.acks + 1 })}>
            Take the final challenge →
          </button>
        ),
        challenge: ({ state, apply }) => <TypeChallenge value={state.ch} onChange={ch => apply({ ...state, ch })} />,
      }}
      inspectPanel="answer"
      panels={panels}
    />
  );
}
