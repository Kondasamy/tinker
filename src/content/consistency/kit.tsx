// Pieces the consistency chapters share: the stage (the three warehouses, or the replica timeline, one at a time), the
// clock that moves through Larkspur's morning, the R and W sliders and the conflict-rule switch, the receipts a minute
// printed, cited facts and the simulator note. Every string is React text here; the warehouses escape their pills
// (esc), and the timeline is drawn as React SVG, so it has no markup to escape.
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import {
  N,
  PRODUCT_NAME,
  QUORUMS,
  REP_NAME,
  RULES,
  RULE_NAME,
  TICKS,
  clock,
  type Rule,
  type Run,
  type Setting,
} from '../../lib/consistency/sim';
import { fact } from '../../lib/consistency/facts';
import { STOCK_BOARD, stockLabel, stockReadouts, stockScene, type StockOpts } from '../../components/scenes/stockScene';
import {
  MARK_PAL,
  replicaTimeline,
  tickName,
  timelineLabel,
  type MarkKind,
} from '../../components/scenes/replicaTimeline';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './consistency.css';

// ---- the Timeline tab ----

/** One mark in a cell, centred at (cx, cy), r its half size. */
function Mark({ kind, cx, cy, r }: { kind: MarkKind; cx: number; cy: number; r: number }) {
  const s = { stroke: INK, strokeWidth: 0.7 };
  if (kind === 'read' || kind === 'stale') return <circle cx={cx} cy={cy} r={r} fill={MARK_PAL[kind]} {...s} />;
  if (kind === 'refused')
    return (
      <path
        d={`M${cx - r} ${cy - r}L${cx + r} ${cy + r}M${cx + r} ${cy - r}L${cx - r} ${cy + r}`}
        stroke={MARK_PAL.refused}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    );
  return (
    <g>
      <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={MARK_PAL[kind]} {...s} />
      {/* a conflict: the sale the final count lost (U28 stamps it) */}
      {kind === 'lost' && (
        <path d={`M${cx} ${cy - r - 3}l3 3l-3 3l-3-3z`} fill={INK} transform={`translate(0 ${-1})`} />
      )}
    </g>
  );
}

/** The morning as columns, one per minute: one in the tab order at a time; the arrow keys (Home, End) move between
 * them, and the line under the drawing reads out the one in focus. `at` marks the minute the picture shows. */
export function TimelineView({ result, at }: { result: Run; at?: number }) {
  const phone = useNarrow(),
    t = replicaTimeline(result, { phone }),
    n = t.columns.length;
  const [cur, setCur] = useState(at ?? 0),
    [said, setSaid] = useState<number | null>(null),
    list = useRef<SVGSVGElement>(null);
  const i = Math.min(cur, n - 1);
  const go = (to: number) => {
    setCur(to);
    setSaid(to);
    list.current?.querySelector<SVGGElement>(`[data-tick="${to}"]`)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(Math.max(0, Math.min(n - 1, to)));
  };
  const fs = t.fs,
    r = Math.min(t.row, t.columns[0]?.w ?? 10) * 0.3;
  return (
    <figure className="cs-timeline">
      <svg viewBox={`0 0 ${t.w} ${t.h}`} role="list" aria-label={timelineLabel(result)} ref={list} onKeyDown={key}>
        {t.lanes.map(l => (
          <g key={l.rep} aria-hidden="true">
            <text x={t.x0 - 4} y={l.y + t.row / 2 + fs * 0.36} fontSize={fs} textAnchor="end">
              {l.name}
            </text>
            <path d={`M${t.x0} ${l.y + t.row / 2}H${t.w - 4}`} stroke={INK} strokeWidth={0.5} strokeDasharray="2 2" />
          </g>
        ))}
        {t.ticks.map(k => (
          <text key={k.label} x={k.x} y={t.axisY + fs} fontSize={fs} textAnchor="start" aria-hidden="true">
            {k.label}
          </text>
        ))}
        {t.columns.map(c => (
          <g
            key={c.t}
            role="listitem"
            tabIndex={c.t === i ? 0 : -1}
            aria-label={tickName(result, c.t)}
            data-tick={c.t}
            className="cs-col"
            onFocus={() => {
              setCur(c.t);
              setSaid(c.t);
            }}
            onClick={() => go(c.t)}
          >
            <rect
              x={c.x}
              y={0}
              width={c.w}
              height={t.bottom + 2}
              fill={c.t === i || c.t === at ? 'var(--acc, #f4b829)' : 'transparent'}
              opacity={c.t === i ? 0.3 : 0.15}
              aria-hidden="true"
            />
            {c.cells.map(cell => (
              <g key={cell.rep} aria-hidden="true">
                {cell.cut && <rect x={c.x} y={cell.y} width={c.w} height={t.row} fill={MARK_PAL.cut} opacity={0.55} />}
                {cell.arrived && (
                  <path
                    d={`M${c.x + c.w / 2} ${cell.y + 1}V${cell.y + t.row - 1}`}
                    stroke={MARK_PAL.arrive}
                    strokeWidth={2}
                  />
                )}
                {cell.marks.slice(0, 2).map((m, j, all) => (
                  <Mark
                    key={`${m}${j}`}
                    kind={m}
                    cx={c.x + c.w / 2}
                    cy={cell.y + t.row / 2 + (all.length > 1 ? (j ? r * 1.2 : -r * 1.2) : 0)}
                    r={all.length > 1 ? r * 0.8 : r}
                  />
                ))}
              </g>
            ))}
          </g>
        ))}
        <path d={`M${t.x0} ${t.bottom}H${t.w - 4}`} stroke={INK} strokeWidth={0.8} aria-hidden="true" />
      </svg>
      <p className="cs-readout" aria-live="polite">
        {said === null ? 'Tab to the timeline, then use the arrow keys to read each minute.' : tickName(result, i)}
      </p>
      <ul className="cs-key" aria-label="What the timeline shows">
        <li>
          <i style={{ background: MARK_PAL.sold }} />
          sale
        </li>
        <li>
          <i style={{ background: MARK_PAL.lost }} />
          sale the count lost
        </li>
        <li>
          <i className="x" />
          refused
        </li>
        <li>
          <i className="o" style={{ background: MARK_PAL.stale }} />
          old count read
        </li>
        <li>
          <i className="bar" />
          copy arrived
        </li>
        <li>
          <i style={{ background: MARK_PAL.cut, border: 'none' }} />
          line down
        </li>
      </ul>
    </figure>
  );
}

// ---- the stage ----

export type View = 'scene' | 'timeline';
/** What a chapter puts on the stage: the warehouses' state, the run for the Timeline tab (and the minute shown), and
 * the caption. */
export interface Shown {
  scene: Omit<StockOpts, 'scale' | 'say'>;
  result?: Run;
  tick?: number;
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the warehouses (default) or the timeline, one at a time. The tab is the reader's view, kept
 * out of saved progress unless the chapter passes `view` and `onView`. */
export function ConsistencyStage({
  show,
  view: kept,
  onView,
  say,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the warehouses (STOCK_PARTS) */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: StockOpts = { ...show.scene, say, scale };
  return (
    <div className="tc-stage cs-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'timeline'}
          disabled={!show.result}
          onClick={() => setView('timeline')}
        >
          Timeline
        </button>
      </div>
      <div className="tc-frame">
        {view === 'timeline' && show.result ? (
          <TimelineView result={show.result} at={show.tick} />
        ) : (
          <IsoStage className="stock" board={STOCK_BOARD} style={FILL} scene={stockScene(o)} label={stockLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{stockReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** The clock: a range over the morning's minutes. */
export function Clock({ t, onTick, id }: { t: number; onTick: (t: number) => void; id: string }) {
  return (
    <div className="cs-range">
      <label htmlFor={id}>{`Time: ${clock(t)}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={TICKS - 1}
        step={1}
        value={t}
        aria-valuetext={clock(t)}
        onChange={e => onTick(Number(e.target.value))}
      />
    </div>
  );
}

/** R or W: a range over 1..N. */
export function Quorum({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="cs-range">
      <label htmlFor={id}>{`${name}: ${value} of ${N}`}</label>
      <input
        id={id}
        type="range"
        min={QUORUMS[0]}
        max={QUORUMS.at(-1)}
        step={1}
        value={value}
        aria-valuetext={`${value} of ${N}`}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** The conflict rule: two chips, one pressed. */
export function RuleSwitch({ value, onChange, label }: { value: Rule; onChange: (r: Rule) => void; label: string }) {
  return (
    <div className="cs-row" role="group" aria-label={label}>
      {RULES.map(r => (
        <button key={r} type="button" className="chip" aria-pressed={value === r} onClick={() => onChange(r)}>
          {RULE_NAME[r]}
        </button>
      ))}
    </div>
  );
}

/** "R 2 · W 2 · last writer wins" */
export const settingName = (s: Setting) => `R ${s.r} · W ${s.w} · ${RULE_NAME[s.rule].toLowerCase()}`;

/** The receipts minute t printed: one line per sale. */
export function Receipts({ run, t }: { run: Run; t: number }) {
  const sales = run.ticks[t].outcomes.filter(o => o.kind === 'order');
  return (
    <ul className="cs-receipts" aria-label={`Orders at ${clock(t)}`}>
      {sales.map(o => (
        <li key={`${o.who}${o.at}`} data-result={o.result}>
          <strong>{o.result === 'sold' ? 'Receipt' : o.result === 'refused' ? 'Refused' : 'Sold out'}</strong>
          {` ${o.who}, one ${PRODUCT_NAME[o.product]}, at ${REP_NAME[o.at]}`}
        </li>
      ))}
    </ul>
  );
}

/** A cited fact from data/consistency/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the simulator's counts appear (R6). */
export const SimNote = () => (
  <p className="note cs-note">
    A simulated morning: Larkspur’s own orders and planning numbers, not a measurement of any real database.
  </p>
);
