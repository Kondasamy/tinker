// Pieces the evals chapters share: the suite (the RAG index opened and every version run over the 12 questions, once
// per page), and the stage (the test bench, or the Results grid). Every string is React text here; the drawings escape
// theirs (esc) before they become SVG.
import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import { openIndex, fetchLoader, type Loader } from '../../lib/rag/load';
import { QUESTIONS, VERSIONS, VERSION_IDS, fileOf, runSuite, type Row, type VersionId } from '../../lib/evals/suite';
import { isCorrect } from '../../lib/evals/graders';
import { EVAL_BOARD, evalLabel, evalScene, type EvalOpts } from '../../components/scenes/evalScene';
import { evalGrid, flips, gridLabel, type GridCol } from '../../components/scenes/evalGrid';
import { useNarrow } from '../tool-calling/kit';
import './evals.css';

export type Suite = Record<VersionId, Row[]>;

/** Open the index, load every version's config, and run each version over the suite. Rejects if any file fails. */
export async function loadSuite(loader: Loader = fetchLoader()): Promise<Suite> {
  const index = await openIndex(loader);
  for (const v of VERSION_IDS) { const f = fileOf(v); if (f) await index.load(f); }
  return Object.fromEntries(VERSION_IDS.map(v => [v, runSuite(index, v)])) as Suite;
}

// one suite per page, shared by the stage and every control; a failure clears it so Retry starts over
type State = { suite: Suite | null; failed: boolean };
let state: State = { suite: null, failed: false }, pending: Promise<void> | null = null;
const subs = new Set<() => void>();
const set = (s: State) => { state = s; subs.forEach(f => f()); };
function start() {
  pending ??= loadSuite().then(suite => set({ suite, failed: false }), () => { pending = null; set({ suite: null, failed: true }); });
}
/** The loaded suite, or null: step predicates read this, so no step advances before the rows exist. */
export const suiteNow = () => state.suite;
const retry = () => { set({ suite: null, failed: false }); start(); };
/** The suite for a component: null while preparing; `failed` offers `retry`. */
export function useSuite() {
  const st = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
  useEffect(start, []);
  return { ...st, retry };
}

/** Pass/fail per question for a version's rows (the recorded answer's verdict). */
export const resultsOf = (rows: Row[]) => rows.map(r => isCorrect(r.verdict));
/** A grid column per version, from the suite. */
export const colsOf = (suite: Suite, vs: VersionId[]): GridCol[] => vs.map(v => ({ id: v, label: VERSIONS[v].label, results: resultsOf(suite[v]) }));
/** The questions' words, in suite order. */
export const QUESTION_TEXT = QUESTIONS.map(q => q.query);

/** What a chapter puts on the stage for the loaded suite: the bench's settings, the grid's columns, and the caption. */
export interface Shown { scene: Omit<EvalOpts, 'scale'>; cols: GridCol[]; caption: string; stamp?: Stamp }
export type View = 'scene' | 'grid';

/** The Results tab's grid: a wide and a phone drawing (CSS picks one), each cell named. The figure is a group so screen
 * readers reach the cells. Phones get the questions as a list under it. */
export function Grid({ cols, questions = QUESTION_TEXT }: { cols: GridCol[]; questions?: string[] }) {
  const prefix = 'grid' + useId().replace(/[^\w-]/g, '') + '-', label = gridLabel(cols);
  const svg = (phone: boolean) => {
    const g = evalGrid({ questions, cols, phone }), id = prefix + (phone ? 'p' : 'w');
    return (
      <svg className={phone ? 'ev-grid-phone' : 'ev-grid-wide'} viewBox={`0 0 ${g.w} ${g.h}`} role="group" aria-label={label}>
        <defs dangerouslySetInnerHTML={{ __html: filterFor(1, id) }} />
        {/* evalGrid escapes every question and label (esc) before it reaches this string */}
        <g filter={`url(#${id})`} dangerouslySetInnerHTML={{ __html: g.svg }} />
      </svg>
    );
  };
  return (
    <figure className="ev-grid">
      {svg(false)}{svg(true)}
      <ol className="ev-key">{questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
    </figure>
  );
}

/** "Preparing…" or a failed load with Retry, in the stage's frame until the suite is ready. */
export function SuiteGate({ children }: { children: (suite: Suite) => ReactNode }) {
  const { suite, failed, retry: again } = useSuite();
  if (suite) return <>{children(suite)}</>;
  return (
    <div className="ev-wait" role="status" data-state={failed ? 'failed' : 'preparing'}>
      {failed
        ? <><p>Couldn’t load the test suite.</p><button type="button" className="chip" onClick={again}>Retry</button></>
        : <p>Preparing the test suite…</p>}
    </div>
  );
}

const FILL = { height: '100%' };   // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the test bench (default) or the Results grid, one at a time. `show` turns the loaded suite into
 * what the current step puts on the stage. The tab is the reader's view, kept out of saved progress unless the chapter
 * passes `view` and `onView` to keep it in its step state. */
export function EvalStage({ show, view: kept, onView }: { show: (suite: Suite) => Shown; view?: View; onView?: (v: View) => void }) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own, setView = onView ?? setOwn;
  const scale = useNarrow() ? 2.2 : 1.3;
  return (
    <div className="tc-stage ev-stage">
      <SuiteGate>{suite => {
        const s = show(suite), o: EvalOpts = { ...s.scene, scale };
        const flipped = new Set(flips(s.cols).flatMap(c => c.flatMap((x, q) => (x ? [q] : []))));
        return (
          <>
            <div className="tc-tabs" role="group" aria-label="Show in the picture">
              <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>Picture</button>
              <button type="button" className="chip" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Results ({s.cols.length})</button>
            </div>
            <div className="tc-frame">
              {view === 'scene'
                ? <IsoStage className="bench" board={EVAL_BOARD} style={FILL} scene={evalScene(o)} label={evalLabel(o)} />
                : <Grid cols={s.cols} />}
            </div>
            <p className="tc-caption">
              {s.stamp && <span className={`stamp ${STAMP_CLASS[s.stamp]}`}>{s.stamp}</span>}
              <span className="txt">{s.caption}</span>
              {view === 'grid' && flipped.size > 0 && (
                <span className="lbl">Flipped: {[...flipped].sort((a, b) => a - b).map(q => `Q${q + 1}`).join(', ')}</span>
              )}
            </p>
          </>
        );
      }}</SuiteGate>
    </div>
  );
}
