// Pieces the caching chapters share: the stage (the depot map, or the cache timeline, one at a time), the clock that
// moves through Larkspur's day, cited facts and the assumptions note. Every string is React text here; the map escapes
// its pills (esc), and the timeline is drawn as React SVG, so it has no markup to escape.
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import { TICKS, clock, type Result } from '../../lib/caching/sim';
import { fact } from '../../lib/caching/facts';
import { DEPOT_BOARD, depotLabel, depotReadouts, depotScene, type DepotOpts } from '../../components/scenes/depotScene';
import { CELL_PAL, cacheTimeline, tickName, timelineLabel } from '../../components/scenes/cacheTimeline';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './caching.css';

// ---- the Timeline tab ----

/** The day as columns, one per quarter hour: one in the tab order at a time; the arrow keys (Home, End) move between
 * them, and the line under the drawing reads out the one in focus. `at` marks the quarter hour the picture shows. */
export function TimelineView({ result, at }: { result: Result; at?: number }) {
  const phone = useNarrow(),
    t = cacheTimeline(result, { phone }),
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
  const fs = t.fs;
  return (
    <figure className="ca-timeline">
      <svg viewBox={`0 0 ${t.w} ${t.h}`} role="list" aria-label={timelineLabel(result)} ref={list} onKeyDown={key}>
        {t.lanes.map(l => (
          <text
            key={l.edge}
            x={t.x0 - 4}
            y={l.y + t.row / 2 + fs * 0.36}
            fontSize={fs}
            textAnchor="end"
            aria-hidden="true"
          >
            {l.name}
          </text>
        ))}
        <text x={t.x0 - 4} y={t.bars.bottom - 4} fontSize={fs} textAnchor="end" aria-hidden="true">
          Depot
        </text>
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
            data-over={c.bar.over ? 1 : 0}
            className="ca-col"
            onFocus={() => {
              setCur(c.t);
              setSaid(c.t);
            }}
            onClick={() => go(c.t)}
          >
            {(c.t === i || c.t === at) && (
              <rect
                x={c.x}
                y={0}
                width={c.w}
                height={t.bars.bottom + 2}
                fill="var(--acc, #f4b829)"
                opacity={c.t === i ? 0.3 : 0.15}
                aria-hidden="true"
              />
            )}
            {c.cells.map(cell =>
              cell.kind === 'none' ? null : (
                <g key={cell.edge} aria-hidden="true">
                  <rect
                    x={c.x + 0.6}
                    y={cell.y}
                    width={c.w - 1.2}
                    height={t.row}
                    fill={cell.kind === 'hit' ? CELL_PAL.hit : CELL_PAL.miss}
                    stroke={INK}
                    strokeWidth={0.5}
                  />
                  {cell.stale && (
                    <rect
                      x={c.x + c.w * 0.25}
                      y={cell.y + t.row * 0.3}
                      width={c.w * 0.5}
                      height={t.row * 0.4}
                      fill={CELL_PAL.stale}
                      stroke={INK}
                      strokeWidth={0.5}
                    />
                  )}
                </g>
              ),
            )}
            {c.bar.h > 0 && (
              <rect
                x={c.x + 0.8}
                y={c.bar.y}
                width={c.w - 1.6}
                height={c.bar.h}
                fill={c.bar.over ? CELL_PAL.over : CELL_PAL.trips}
                stroke={INK}
                strokeWidth={0.5}
                aria-hidden="true"
              />
            )}
          </g>
        ))}
        <path
          d={`M${t.x0} ${t.bars.capY}H${t.w - 4}`}
          stroke={INK}
          strokeWidth={0.9}
          strokeDasharray="3 2"
          aria-hidden="true"
        />
        <path d={`M${t.x0} ${t.bars.bottom}H${t.w - 4}`} stroke={INK} strokeWidth={0.8} aria-hidden="true" />
      </svg>
      <p className="ca-readout" aria-live="polite">
        {said === null
          ? 'Tab to the timeline, then use the arrow keys to read each quarter hour.'
          : tickName(result, i)}
      </p>
      <ul className="ca-key" aria-label="What the timeline shows">
        <li>
          <i style={{ background: CELL_PAL.hit }} />
          all from the shelf
        </li>
        <li>
          <i style={{ background: CELL_PAL.miss }} />
          some went to the depot
        </li>
        <li>
          <i className="s" style={{ background: CELL_PAL.stale }} />
          stale copy served
        </li>
        <li>
          <i className="cap" />
          depot capacity
        </li>
      </ul>
    </figure>
  );
}

// ---- the stage ----

export type View = 'scene' | 'timeline';
/** What a chapter puts on the stage: the map's state, the run for the Timeline tab (and the quarter hour shown), and
 * the caption. */
export interface Shown {
  scene: Omit<DepotOpts, 'scale' | 'say'>;
  result?: Result;
  tick?: number;
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the depot map (default) or the timeline, one at a time. The tab is the reader's view, kept out
 * of saved progress unless the chapter passes `view` and `onView`. */
export function CachingStage({
  show,
  view: kept,
  onView,
  say,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the map (DEPOT_PARTS) */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: DepotOpts = { ...show.scene, say, scale };
  return (
    <div className="tc-stage ca-stage">
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
          <IsoStage className="depot" board={DEPOT_BOARD} style={FILL} scene={depotScene(o)} label={depotLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{depotReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** The clock: a range over the day's quarter hours. */
export function Clock({ t, onTick, id }: { t: number; onTick: (t: number) => void; id: string }) {
  return (
    <div className="ca-range">
      <label htmlFor={id}>{`Time of day: ${clock(t)}`}</label>
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

/** A cited fact from data/caching/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the simulator's waits or counts appear (R6). */
export const SimNote = () => (
  <p className="note ca-note">
    A simulated day: Larkspur’s own traffic and planning numbers, not a measurement of any real network or CDN (a
    network of caches run for many sites).
  </p>
);

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const msOf = (x: number) => `${Math.round(x)} ms`;
