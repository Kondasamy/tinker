// Pieces the Small models chapters share. The models come through Fine-tuning's loaders (one per set of weights, shared
// by the page), so the teacher and the student load once and a step can wait on them. The stage is the apprentice's
// bench, or the Chart tab: the student's loss curve (chapter 2) or the quality and cost frontier. Every string is React
// text here; the drawings escape theirs (esc), and the charts' art goes in as an image (a data URL), so no markup is
// injected.
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import type { Model } from '../../lib/lm/model';
import { ROUTER_BOARD, routerLabel, routerScene, type RouterOpts } from '../../components/scenes/routerScene';
import { frontierChart, frontierLabel, pointWords } from '../../components/scenes/frontierChart';
import type { Series } from '../../components/scenes/lossChart';
import type { Point, Tier } from '../../lib/small-models/router';
import { answer, passes } from '../../lib/small-models/router';
import { fact } from '../../lib/small-models/facts';
import { layoutOf, paramCount } from '../../lib/small-models/compare';
import { num } from '../../lib/format';
import { useNarrow } from '../tool-calling/kit';
import { LossChart, META, ModelGate, loadModel, modelNow, useModel } from '../fine-tuning/kit';
import './small-models.css';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';

export { META, loadModel, modelNow };
/** The student's recorded distillation run (meta.json `student`): training and held-out loss per step. */
export const STUDENT_SERIES: Series[] = [
  { id: 'train', label: 'Training', points: META.student!.lossCurve.map(p => ({ step: p.step, loss: p.train })) },
  { id: 'heldout', label: 'Held-out', points: META.student!.lossCurve.map(p => ({ step: p.step, loss: p.heldout })) },
];

/** Both models, once loaded: what a step's predicate reads, so no step advances before the weights are in. */
export const bothNow = (): { teacher: Model; student: Model } | undefined => {
  const teacher = modelNow('base'),
    student = modelNow('student');
  return teacher && student ? { teacher, student } : undefined;
};
/** Start loading both (a chapter calls this on load, so it plays on offline). */
export const loadBoth = () => Promise.all([loadModel('base'), loadModel('student')]);

/** A story-column control that needs both models: the loading card (or Retry) until they are in. */
export const BothGate = ({ children }: { children: (m: { teacher: Model; student: Model }) => ReactNode }) => (
  <ModelGate weights="base">
    {teacher => <ModelGate weights="student">{student => <>{children({ teacher, student })}</>}</ModelGate>}
  </ModelGate>
);

/** The frontier: the drawing as an image, a focusable marker per point over it (arrow keys, Home, End) and a read-out
 * line under it. `at` picks the point that starts selected. */
export function FrontierChart({ points, at: start }: { points: Point[]; at?: string }) {
  const phone = useNarrow(),
    id = 'fr' + useId().replace(/[^\w-]/g, '');
  const c = frontierChart({ points, phone });
  const first = Math.max(
    0,
    c.points.findIndex(p => p.id === start),
  );
  const [cur, setCur] = useState(first);
  const at = Math.min(cur, c.points.length - 1),
    m = c.points[at];
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.w} ${c.h}"><defs>${filterFor(1, 'hand')}</defs><g filter="url(#hand)">${c.svg}</g></svg>`;
  const go = (i: number) => {
    const n = Math.max(0, Math.min(c.points.length - 1, i));
    setCur(n);
    (document.getElementById(`${id}-${n}`) as SVGElement | null)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = {
      ArrowRight: at + 1,
      ArrowUp: at + 1,
      ArrowLeft: at - 1,
      ArrowDown: at - 1,
      Home: 0,
      End: c.points.length - 1,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      go(to);
    }
  };
  return (
    <figure className="ft-chart sm-frontier">
      <svg viewBox={`0 0 ${c.w} ${c.h}`} role="group" aria-label={frontierLabel(points)} onKeyDown={key}>
        <image href={`data:image/svg+xml,${encodeURIComponent(doc)}`} width={c.w} height={c.h} aria-hidden="true" />
        {c.points.map((p, i) => (
          <g
            key={p.id}
            id={`${id}-${i}`}
            className="ft-mark"
            role="button"
            tabIndex={i === at ? 0 : -1}
            aria-pressed={i === at}
            aria-label={pointWords(p)}
            onClick={() => go(i)}
            onFocus={() => setCur(i)}
            data-point={p.id}
          >
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
            {i === at && <circle cx={p.x} cy={p.y} r={8} className="ft-ring" />}
          </g>
        ))}
      </svg>
      <p className="ft-readout" aria-live="polite">
        {m ? pointWords(m) : 'No points yet.'}
      </p>
      <ul className="ft-key">
        <li>
          <span className="ft-swatch" aria-hidden="true" />
          router, one point per threshold
        </li>
        <li>
          <span className="sm-square" aria-hidden="true" />
          all large
        </li>
      </ul>
    </figure>
  );
}

// ---- the stage ----

/** What a chapter puts on the stage: the bench's settings, the Chart tab (a loss curve or the frontier), the caption. */
export interface Shown {
  scene: Omit<RouterOpts, 'scale'>;
  chart?: { series: Series[] } | { frontier: Point[]; at?: string };
  caption: string;
  stamp?: Stamp;
}
export type View = 'scene' | 'chart';

const FILL = { height: '100%' };
/** The chapters' stage: the bench (default) or the Chart tab, one at a time. With `models` it needs the teacher and the
 * student: the frame holds a loading pill (or an error card with Retry) until both are in. The tab is the reader's view,
 * kept out of saved progress unless the chapter passes `view` and `onView`. */
export function SmallStage({
  show,
  models,
  view: kept,
  onView,
  say,
}: {
  show: () => Shown;
  models?: boolean;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn over a part of the picture (ROUTER_PARTS); the Chart tab ignores it */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2.2 : 1.3;
  // subscribe to both loads, so the stage re-renders when they settle
  const a = useModel(models ? 'base' : undefined),
    b = useModel(models ? 'student' : undefined);
  const ready = !models || (a.model && b.model);
  const s = ready ? show() : null,
    r = s?.chart,
    o: RouterOpts = { ...s?.scene, scale, say };
  return (
    <div className="tc-stage sm-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'scene'}
          disabled={!s}
          onClick={() => setView('scene')}
        >
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'chart'}
          disabled={!r}
          onClick={() => setView('chart')}
        >
          Chart
        </button>
      </div>
      <div className="tc-frame">
        {!s ? (
          <BothGate>{() => null}</BothGate>
        ) : view === 'chart' && r ? (
          <div className="ft-scroll">
            {'series' in r ? (
              <LossChart series={r.series} />
            ) : (
              <FrontierChart key={r.at} points={r.frontier} at={r.at} />
            )}
          </div>
        ) : (
          <IsoStage className="bench" board={ROUTER_BOARD} style={FILL} scene={routerScene(o)} label={routerLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        {s?.stamp && <span className={`stamp ${STAMP_CLASS[s.stamp]}`}>{s.stamp}</span>}
        {s && <span className="txt">{s.caption}</span>}
      </p>
    </div>
  );
}

/** A cited fact from data/small-models/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside a real figure wherever the teacher's and student's numbers show (R6, KTD5): both are toys, trained
 * ahead of time. */
export const ToyNote = () => (
  <p className="note">
    {`Larkspur mini and its student are toys: ${num(paramCount(layoutOf(META, 'teacher')))} and ${num(paramCount(layoutOf(META, 'student')))} weights, trained ahead of time on Larkspur’s documents. Their numbers are their own, not a real model’s.`}
  </p>
);
/** Said beside a real figure wherever the two tiers' results show (R6): written for this site, not measured. */
export const TierNote = () => (
  <p className="note">
    The two tiers, their answers and their confidence scores were written for this site to illustrate what the cascade
    and router papers report, not measured. Only the price ratio is real.
  </p>
);

// ---- the story column ----

const pct = (p: number) => `${Math.round(p * 100)}%`;
/** The teacher's and the student's top 5 after one prompt, side by side, with the shared top pick marked. */
export function TopFive({
  teacher,
  student,
}: {
  teacher: { text: string; p: number }[];
  student: { text: string; p: number }[];
}) {
  const same = teacher[0]?.text === student[0]?.text;
  return (
    <table className="tc-ledger sm-top" data-same={same ? '1' : '0'}>
      <caption>Top 5 next pieces, computed in your browser</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Larkspur mini</th>
          <th scope="col">Student</th>
        </tr>
      </thead>
      <tbody>
        {teacher.map((t, i) => (
          <tr key={i}>
            <th scope="row">{i + 1}</th>
            <td>
              <code>{JSON.stringify(t.text)}</code> {pct(t.p)}
            </td>
            <td>
              <code>{JSON.stringify(student[i].text)}</code> {pct(student[i].p)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Mark = ({ ok }: { ok: boolean }) => (
  <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'PASS' : 'FAIL'}</span>
);
/** One tier's recorded answer to one question, labelled as recorded (the grading under it runs live). */
export function TierAnswer({ tier, question }: { tier: Tier; question: string }) {
  const a = answer(tier, question),
    ok = passes(tier, question);
  return (
    <div className="tc-def ft-answer" data-tier={tier}>
      <p className="lbl">
        {tier === 'small' ? 'Small tier' : 'Large tier'} <span className="ft-tag">recorded answer</span>
      </p>
      <p>“{a.text}”</p>
      <p className="ft-marks">
        <Mark ok={ok} /> key fact
        {a.confidence !== undefined && (
          <>
            {' '}
            · confidence <strong>{a.confidence.toFixed(2)}</strong> <span className="note">(a stand-in score)</span>
          </>
        )}
      </p>
      <p className="note">{a.note}</p>
    </div>
  );
}
