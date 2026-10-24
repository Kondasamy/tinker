// Pieces the reasoning chapters share: the stage (the scratchpad desk, or the Accuracy tab: accuracy against effort),
// the thinking panel under it, a recorded answer with its live counts, and a cited fact. Every string is React text
// here; the drawings escape theirs (esc), and the chart's art goes in as an image (a data URL), so no markup is injected.
import { useId, useState, type KeyboardEvent } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import {
  ASSUMPTIONS,
  EFFORTS,
  KINDS,
  kindOf,
  ofKind,
  question,
  run,
  sweep,
  type Effort,
  type KindId,
  type Run,
} from '../../lib/reasoning/engine';
import { fact } from '../../lib/reasoning/facts';
import { THINK_BOARD, seconds, thinkLabel, thinkScene, type ThinkOpts } from '../../components/scenes/thinkScene';
import { effortChart, effortLabel, levelWords, type Series } from '../../components/scenes/effortChart';
import { useNarrow } from '../tool-calling/kit';
import './reasoning.css';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';

export { seconds };
/** The desk's settings for one run. */
export const deskOf = (r: Run, graded = true): Omit<ThinkOpts, 'scale'> => ({
  effort: r.effort,
  thinking: r.thinkingTokens,
  wait: r.wait,
  right: graded ? r.right : undefined,
});

/** The chart's series: accuracy per effort over each kind's questions. */
export const kindSeries = (kinds: KindId[] = KINDS.map(k => k.id)): Series[] =>
  kinds.map(k => ({ id: k, label: kindOf(k).short, points: sweep(ofKind(k).map(q => q.id)) }));

/** The chart: the drawing as an image, with a focusable marker per effort level over it (arrow keys, Home, End) and a
 * read-out line under it naming accuracy and cost. */
export function EffortChart({ series }: { series: Series[] }) {
  const phone = useNarrow(),
    id = 'eff' + useId().replace(/[^\w-]/g, '');
  const c = effortChart(series, phone),
    [cur, setCur] = useState(Math.max(0, c.levels.length - 1));
  const at = Math.min(cur, c.levels.length - 1),
    m = c.levels[at];
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.w} ${c.h}"><defs>${filterFor(1, 'hand')}</defs><g filter="url(#hand)">${c.svg}</g></svg>`;
  const go = (i: number) => {
    const n = Math.max(0, Math.min(c.levels.length - 1, i));
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
      End: c.levels.length - 1,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      go(to);
    }
  };
  return (
    <figure className="rs-chart">
      <svg viewBox={`0 0 ${c.w} ${c.h}`} role="group" aria-label={effortLabel(series)} onKeyDown={key}>
        <image href={`data:image/svg+xml,${encodeURIComponent(doc)}`} width={c.w} height={c.h} aria-hidden="true" />
        {c.levels.map((l, i) => (
          <g
            key={l.effort}
            id={`${id}-${i}`}
            className="rs-mark"
            role="button"
            tabIndex={i === at ? 0 : -1}
            aria-pressed={i === at}
            aria-label={levelWords(l)}
            onClick={() => go(i)}
            onFocus={() => setCur(i)}
            data-effort={l.effort}
          >
            <rect x={l.x - 18} y={0} width={36} height={c.h} fill="transparent" />
            {i === at && <line x1={l.x} x2={l.x} y1={18} y2={c.h - 44} className="rs-rule" />}
            {i === at && l.values.map(v => <circle key={v.id} cx={l.x} cy={v.y} r={7} className="rs-ring" />)}
          </g>
        ))}
      </svg>
      <p className="rs-readout" aria-live="polite">
        {m ? levelWords(m) : 'Nothing run yet.'}
      </p>
      {series.length > 1 && (
        <ul className="rs-key">
          {series.map((s, i) => (
            <li key={s.id}>
              <span className="rs-swatch" data-style={i % 3} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/** What a chapter puts on the stage: the desk's settings, the Accuracy tab's series, the caption, and the thinking shown
 * in the panel under the frame. */
export interface Shown {
  desk: Omit<ThinkOpts, 'scale'>;
  series?: Series[];
  caption: string;
  stamp?: Stamp;
  thinking?: string;
}
export type View = 'scene' | 'chart';

const FILL = { height: '100%' };
/** The chapters' stage: the scratchpad desk (default) or the Accuracy tab, one at a time, and the thinking panel under it.
 * The tab is the reader's view, kept out of saved progress unless the chapter passes `view` and `onView`. */
export function ReasoningStage({
  shown: s,
  view: kept,
  onView,
  say,
}: {
  shown: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn over a part of the picture (THINK_PARTS); the Accuracy tab ignores it */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const o: ThinkOpts = { ...s.desk, scale: useNarrow() ? 2.2 : 1.3, say };
  return (
    <div className="tc-stage rs-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'chart'}
          disabled={!s.series}
          onClick={() => setView('chart')}
        >
          Accuracy
        </button>
      </div>
      <div className="tc-frame">
        {view === 'chart' && s.series ? (
          <div className="rs-scroll">
            <EffortChart series={s.series} />
          </div>
        ) : (
          <IsoStage className="desk" board={THINK_BOARD} style={FILL} scene={thinkScene(o)} label={thinkLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        {s.stamp && <span className={`stamp ${STAMP_CLASS[s.stamp]}`}>{s.stamp}</span>}
        <span className="txt">{s.caption}</span>
      </p>
      <section className="rs-thinking" aria-label="The model’s thinking" tabIndex={0}>
        <p className="lbl">
          Thinking <span className="rs-tag">recorded</span>
        </p>
        <p>
          {s.thinking === undefined
            ? 'Run a question to see what the model wrote before it answered.'
            : s.thinking || 'None: it answered at once.'}
        </p>
      </section>
    </div>
  );
}

/** The effort dial as a story-column control: a native range over the four levels, the level named beside it. */
export function EffortRange({
  label = 'Effort',
  value,
  onChange,
}: {
  label?: string;
  value: Effort;
  onChange: (e: Effort) => void;
}) {
  const id = 'rng' + useId().replace(/[^\w-]/g, ''),
    i = EFFORTS.indexOf(value);
  return (
    <div className="rs-range">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={EFFORTS.length - 1}
        step={1}
        value={i}
        aria-valuetext={value}
        onChange={e => onChange(EFFORTS[Number(e.currentTarget.value)])}
      />
      <output htmlFor={id} aria-live="polite">
        {value}
      </output>
    </div>
  );
}

/** A cited fact from data/reasoning/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Larkspur's assumed speed, said whenever a wait is shown (R6). */
export const RateNote = () => (
  <p className="rs-note">
    Token counts are this site’s tokenizer’s; the wait assumes {ASSUMPTIONS.tokensPerSecond} tokens a second after{' '}
    {ASSUMPTIONS.firstTokenSeconds} s, {ASSUMPTIONS.label.toLowerCase()}.
  </p>
);

const Mark = ({ ok }: { ok: boolean }) => (
  <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'RIGHT' : 'WRONG'}</span>
);

/** One recorded answer at one effort, labelled as recorded; the grade, counts, cost and wait under it run live. */
export function Answer({ q, effort, note = true }: { q: string; effort: Effort; note?: boolean }) {
  const r = run(q, effort);
  return (
    <div className="tc-def rs-answer" data-question={q} data-effort={effort}>
      <p className="lbl">
        Effort {effort} <span className="rs-tag">recorded answer</span>
      </p>
      <p>“{r.answer}”</p>
      <p className="rs-marks">
        <Mark ok={r.right} /> {r.thinkingTokens} thinking + {r.answerTokens} answer tokens · wait {seconds(r.wait)}
      </p>
      {note && <p className="note">{r.note}</p>}
    </div>
  );
}

/** The question and the passage the assistant was handed. */
export const Asked = ({ q }: { q: string }) => {
  const x = question(q);
  return (
    <div className="tc-def rs-asked">
      <p className="lbl">The question</p>
      <p>“{x.query}”</p>
      <p className="note">What the assistant reads: {x.given}</p>
    </div>
  );
};
