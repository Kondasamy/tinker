// Pieces the Opening a web page chapters share: the stage (the post town, or the waterfall, one at a time), the
// customer picker, cited facts and the planning-numbers note. Every string is React text here; the town escapes its
// pills (esc), and the waterfall is React SVG, so it has no markup to escape.
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import { CUSTOMERS, type CustomerId, type Run } from '../../lib/web-requests/sim';
import { fact } from '../../lib/web-requests/facts';
import { num } from '../../lib/format';
import { TOWN_BOARD, townLabel, townReadouts, townScene, type TownOpts } from '../../components/scenes/townScene';
import { KIND_FILL, requestWaterfall, rowName, waterfallLabel } from '../../components/scenes/requestWaterfall';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './web-requests.css';

export const msOf = (x: number) => `${num(Math.round(x))} ms`;

// ---- the Waterfall tab ----

/** One page load, a row per step. One row is in the tab order at a time; the arrow keys (Home, End) move between rows
 * and the line under it reads out the row in focus. */
export function WaterfallView({ run, phone = false }: { run: Run; phone?: boolean }) {
  const w = requestWaterfall(run, phone),
    n = w.rows.length;
  const [cur, setCur] = useState(0),
    [said, setSaid] = useState<number | null>(null),
    list = useRef<SVGSVGElement>(null);
  const at = Math.min(cur, Math.max(0, n - 1));
  const go = (i: number) => {
    setCur(i);
    setSaid(i);
    list.current?.querySelector<SVGGElement>(`[data-row="${i}"]`)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: n - 1 }[
      e.key
    ];
    if (to === undefined || !n) return;
    e.preventDefault();
    go(Math.max(0, Math.min(n - 1, to)));
  };
  const fs = w.fs;
  return (
    <figure className="wr-fall">
      <svg viewBox={`0 0 ${w.w} ${w.h}`} role="list" aria-label={waterfallLabel(run)} ref={list} onKeyDown={key}>
        <text x={w.x0} y={14} fontSize={fs} aria-hidden="true">
          0 ms
        </text>
        <text x={w.w - w.pad} y={14} fontSize={fs} textAnchor="end" aria-hidden="true">
          {msOf(w.total)}
        </text>
        {w.rows.map(r => (
          <g
            key={r.phase.id}
            role="listitem"
            tabIndex={r.i === at ? 0 : -1}
            data-row={r.i}
            data-phase={r.phase.id}
            data-lost={r.phase.lost ? 1 : 0}
            data-stalled={r.phase.stalled > 0 ? 1 : 0}
            aria-label={rowName(r, n)}
            className="wr-lane"
            onFocus={() => {
              setCur(r.i);
              setSaid(r.i);
            }}
            onClick={() => go(r.i)}
          >
            {r.i === at && said !== null && (
              <rect x={0} y={r.y - 2} width={w.w} height={w.row - 2} fill="var(--acc, #f4b829)" opacity={0.25} />
            )}
            <text x={w.pad} y={r.y + w.row / 2 + 1} fontSize={fs} aria-hidden="true">
              {phone && r.name.length > 15 ? `${r.name.slice(0, 14)}…` : r.name}
            </text>
            <rect
              x={r.x}
              y={r.y + 3}
              width={r.w}
              height={w.row - 10}
              rx={3}
              fill={KIND_FILL[r.phase.kind]}
              stroke={INK}
              strokeWidth={1}
            />
            {r.lostW > 0 && (
              <rect
                className="wr-lost"
                x={r.x}
                y={r.y + 3}
                width={r.lostW}
                height={w.row - 10}
                rx={3}
                fill="#ef6a4c"
                stroke={INK}
                strokeWidth={1}
              />
            )}
            {r.stallW > 0 && (
              <rect
                className="wr-stall"
                x={r.x + r.w - r.stallW}
                y={r.y + 3}
                width={r.stallW}
                height={w.row - 10}
                rx={3}
                fill="url(#wr-hatch)"
                stroke={INK}
                strokeWidth={1}
              />
            )}
          </g>
        ))}
        <defs>
          <pattern id="wr-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#f6c2b4" />
            <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="1.4" />
          </pattern>
        </defs>
      </svg>
      <p className="wr-readout" aria-live="polite">
        {said === null ? 'Tab to the waterfall, then use the arrow keys to read each step.' : rowName(w.rows[at], n)}
      </p>
      <ul className="wr-key" aria-label="What the waterfall shows">
        <li>
          <i style={{ background: KIND_FILL.dns }} />
          directory
        </li>
        <li>
          <i style={{ background: KIND_FILL.tcp }} />
          TCP
        </li>
        <li>
          <i style={{ background: KIND_FILL.tls }} />
          TLS / QUIC
        </li>
        <li>
          <i style={{ background: KIND_FILL.req }} />
          file
        </li>
        <li>
          <i style={{ background: '#ef6a4c' }} />
          lost, waiting to resend
        </li>
        <li>
          <i className="h" />
          held back
        </li>
      </ul>
    </figure>
  );
}

// ---- the stage ----

export type View = 'scene' | 'fall';
/** What a chapter puts on the stage: the town's state, the run for the Waterfall tab, and the caption. */
export interface Shown {
  town: Omit<TownOpts, 'scale' | 'say'>;
  run?: Run;
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the post town (default) or the waterfall, one at a time. The tab is the reader's view, kept
 * out of saved progress unless the chapter passes `view` and `onView`. */
export function WebStage({
  show,
  view: kept,
  onView,
  say,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the town (TOWN_PARTS) */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const narrow = useNarrow(),
    o: TownOpts = { ...show.town, say, scale: narrow ? 2 : 1.2 };
  return (
    <div className="tc-stage wr-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'fall'}
          disabled={!show.run}
          onClick={() => setView('fall')}
        >
          Waterfall
        </button>
      </div>
      <div className="tc-frame">
        {view === 'fall' && show.run ? (
          <WaterfallView run={show.run} phone={narrow} />
        ) : (
          <IsoStage className="town" board={TOWN_BOARD} style={FILL} scene={townScene(o)} label={townLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{townReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** Picks one of Larkspur's customers, by name and town. */
export function CustomerPicker({
  value,
  onPick,
  only,
  label = 'Pick a customer',
}: {
  value: CustomerId | null;
  onPick: (id: CustomerId) => void;
  only?: CustomerId[];
  label?: string;
}) {
  return (
    <div className="wr-row" role="group" aria-label={label}>
      {CUSTOMERS.filter(c => !only || only.includes(c.id)).map(c => (
        <button key={c.id} type="button" className="chip" aria-pressed={value === c.id} onClick={() => onPick(c.id)}>
          {`${c.name}, ${c.town}`}
        </button>
      ))}
    </div>
  );
}

/** A cited fact from data/web-requests/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the simulator's waits appear (R6). */
export const SimNote = () => (
  <p className="note wr-note">
    Simulated: Larkspur’s own customers and planning numbers, not a measurement of any real network or browser.
  </p>
);
