// Pieces the A/B testing chapters share: the stage (the shop floor, or the result chart, one at a time), the day slider,
// the tally of repeated runs, cited facts, the maths fold-away and the simulator note. Every string is React text here;
// the floor escapes its pills (esc), and the chart is drawn as React SVG, so it has no markup to escape.
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import type { Metric, Run } from '../../lib/ab-testing/sim';
import { fact } from '../../lib/ab-testing/facts';
import { SPLIT_BOARD, splitLabel, splitReadouts, splitScene, type SplitOpts } from '../../components/scenes/splitScene';
import { CHART_PAL, chartLabel, dayName, resultChart } from '../../components/scenes/resultChart';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './ab-testing.css';

// ---- the Result tab ----

export interface ChartOf {
  run: Run;
  arm?: number;
  metric?: Metric;
  /** B's name in the read-out */
  name?: string;
  /** the day index a daily peek stopped on */
  peek?: number | null;
}

/** The days as columns: one in the tab order at a time; the arrow keys (Home, End) move between them, and the line under
 * the drawing reads out the one in focus. `at` marks the day the picture shows. */
export function ResultView({ chart, at }: { chart: ChartOf; at?: number }) {
  const phone = useNarrow(),
    o = { arm: chart.arm, metric: chart.metric, peek: chart.peek, phone },
    c = resultChart(chart.run, o),
    n = c.columns.length;
  const [cur, setCur] = useState(at ?? n - 1),
    [said, setSaid] = useState<number | null>(null),
    list = useRef<SVGSVGElement>(null);
  const i = Math.min(cur, n - 1);
  const go = (to: number) => {
    setCur(to);
    setSaid(to);
    list.current?.querySelector<SVGGElement>(`[data-day="${to}"]`)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(Math.max(0, Math.min(n - 1, to)));
  };
  const fs = c.fs,
    words = { arm: chart.arm, metric: chart.metric, name: chart.name };
  return (
    <figure className="ab-chart">
      <svg
        viewBox={`0 0 ${c.w} ${c.h}`}
        role="list"
        aria-label={chartLabel(chart.run, { ...o, name: chart.name })}
        ref={list}
        onKeyDown={key}
      >
        {c.ticks.map(t => (
          <g key={t.label} aria-hidden="true">
            <text x={c.x0 - 6} y={t.y + fs * 0.36} fontSize={fs} textAnchor="end">
              {t.label}
            </text>
            <path d={`M${c.x0} ${t.y}H${c.w - 4}`} stroke={INK} strokeWidth={0.3} opacity={0.4} />
          </g>
        ))}
        <text x={c.x0 - 6} y={c.top - 8} fontSize={fs} textAnchor="end" aria-hidden="true">
          pts
        </text>
        <polygon
          points={c.band}
          fill={CHART_PAL.band}
          opacity={0.45}
          stroke={INK}
          strokeWidth={0.5}
          aria-hidden="true"
        />
        <path d={`M${c.x0} ${c.zeroY}H${c.w - 4}`} stroke={INK} strokeWidth={1.1} aria-hidden="true" />
        <path
          d={`M${c.end} ${c.top}V${c.bottom}`}
          stroke={INK}
          strokeWidth={1}
          strokeDasharray="4 3"
          aria-hidden="true"
        />
        <text x={c.end - 3} y={c.top + fs} fontSize={fs} textAnchor="end" aria-hidden="true">
          planned end
        </text>
        {c.peek !== null && (
          <g aria-hidden="true" className="ab-peek">
            <path d={`M${c.peek} ${c.top}V${c.bottom}`} stroke={INK} strokeWidth={1.6} />
            <text x={c.peek + 3} y={c.bottom - 4} fontSize={fs} textAnchor="start">
              peek stopped
            </text>
          </g>
        )}
        <polyline
          points={c.columns.map(col => `${col.cx},${col.y}`).join(' ')}
          fill="none"
          stroke={INK}
          strokeWidth={1.2}
          aria-hidden="true"
        />
        {c.days.map(d => (
          <text key={d.label} x={d.x} y={c.bottom + fs + 6} fontSize={fs} textAnchor="middle" aria-hidden="true">
            {d.label}
          </text>
        ))}
        {c.columns.map(col => (
          <g
            key={col.t}
            role="listitem"
            tabIndex={col.t === i ? 0 : -1}
            aria-label={dayName(chart.run, col.t, words)}
            data-day={col.t}
            data-significant={col.significant ? 1 : 0}
            className="ab-col"
            onFocus={() => {
              setCur(col.t);
              setSaid(col.t);
            }}
            onClick={() => go(col.t)}
          >
            <rect
              x={col.x}
              y={c.top}
              width={col.w}
              height={c.bottom - c.top}
              fill="var(--acc, #f4b829)"
              opacity={col.t === i ? 0.3 : col.t === at ? 0.15 : 0}
              aria-hidden="true"
            />
            <circle
              cx={col.cx}
              cy={col.y}
              r={Math.min(4, col.w / 3)}
              fill={col.significant ? (col.up ? CHART_PAL.win : CHART_PAL.lose) : '#fffaf0'}
              stroke={INK}
              strokeWidth={col.significant ? 1.4 : 0.9}
              aria-hidden="true"
            />
          </g>
        ))}
      </svg>
      <p className="ab-readout" aria-live="polite">
        {said === null ? 'Tab to the chart, then use the arrow keys to read each day.' : dayName(chart.run, i, words)}
      </p>
      <ul className="ab-key" aria-label="What the chart shows">
        <li>
          <i style={{ background: CHART_PAL.band }} />
          interval
        </li>
        <li>
          <i className="dot" style={{ background: CHART_PAL.win }} />
          significant
        </li>
        <li>
          <i className="end" />
          planned end
        </li>
      </ul>
    </figure>
  );
}

// ---- the stage ----

export type View = 'scene' | 'chart';
/** What a chapter puts on the stage: the floor's state, the run for the Result tab (and the day shown), and the
 * caption. */
export interface Shown {
  scene: Omit<SplitOpts, 'scale' | 'say'>;
  chart?: ChartOf;
  at?: number;
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the shop floor (default) or the result chart, one at a time. The tab is the reader's view, kept
 * out of saved progress unless the chapter passes `view` and `onView`. */
export function AbStage({
  show,
  view: kept,
  onView,
  say,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the floor (SPLIT_PARTS) */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: SplitOpts = { ...show.scene, say, scale };
  return (
    <div className="tc-stage ab-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'chart'}
          disabled={!show.chart}
          onClick={() => setView('chart')}
        >
          Result
        </button>
      </div>
      <div className="tc-frame">
        {view === 'chart' && show.chart ? (
          <ResultView chart={show.chart} at={show.at} />
        ) : (
          <IsoStage className="split" board={SPLIT_BOARD} style={FILL} scene={splitScene(o)} label={splitLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{splitReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** The day slider: a range over the test's days. */
export function DayRange({ t, days, onDay, id }: { t: number; days: number; onDay: (t: number) => void; id: string }) {
  return (
    <div className="ab-range">
      <label htmlFor={id}>{`Day: ${t + 1} of ${days}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={days - 1}
        step={1}
        value={t}
        aria-valuetext={`Day ${t + 1}`}
        onChange={e => onDay(Number(e.target.value))}
      />
    </div>
  );
}

/** Repeated runs as a grid, a square per run, filled where the run declared a winner. */
export function Tally({ verdicts, label }: { verdicts: boolean[]; label: string }) {
  const n = verdicts.filter(Boolean).length;
  return (
    <figure className="ab-tally">
      <div className="grid" role="img" aria-label={`${label}: ${n} of ${verdicts.length} runs declared a winner.`}>
        {verdicts.map((v, i) => (
          <i key={i} className={v ? 'won' : ''} />
        ))}
      </div>
      <figcaption>
        <strong>{`${n} of ${verdicts.length}`}</strong>
        {` ${label}`}
      </figcaption>
    </figure>
  );
}

/** A cited fact from data/ab-testing/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** The optional maths, folded away: no formula ever sits in the narration. */
export const Maths = ({ children }: { children: ReactNode }) => (
  <details className="ab-maths">
    <summary>The maths</summary>
    {children}
  </details>
);

/** Shown wherever the simulator's rates appear (R6). */
export const SimNote = () => (
  <p className="note ab-note">
    Simulated shoppers: Larkspur’s own traffic and rates, drawn from fixed seeds, not data from any real shop.
  </p>
);

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;
/** A difference in points, signed: "+1.2 points". */
export const pts = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)} points`;
export const count = (n: number) => n.toLocaleString('en-US');
const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}`;
/** A comparison's interval in points: "−0.3 to +2.7". */
export const span = (c: { lo: number; hi: number }) => `${signed(c.lo)} to ${signed(c.hi)}`;
