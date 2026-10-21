// Pieces the observability chapters share: the stage (the control room, or one trace's waterfall), a trace's card, and a
// cited fact. Customers' words, recorded replies and the reader's own notes reach here, so every string is React text;
// the room escapes its pills (esc) before they become SVG, and the waterfall is drawn as React SVG with no markup.
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import { num } from '../../lib/format';
import { loadChapter } from '../../lib/progress';
import { TRACE_BOARD, traceLabel, traceScene, type Bin, type TraceOpts, type WallCard } from '../../components/scenes/traceScene';
import { KIND_NAME, rowName, traceWaterfall, waterfallLabel } from '../../components/scenes/traceWaterfall';
import { MODE_IDS, modeOf, replyOf, spanOf, type ModeId, type Trace } from '../../lib/observability/traces';
import { fact } from '../../lib/observability/facts';
import { useNarrow } from '../tool-calling/kit';
import './observability.css';

export const MODULE = 'observability';
/** a mode's word on its bin's pill */
export const MODE_SHORT: Record<ModeId, string> = { 'missed-doc': 'MISSED', 'stale-doc': 'STALE', 'wrong-order': 'ORDER#', 'ignored-result': 'IGNORED', 'promised-refund': 'REFUND' };

/** The wall's cards for a list of traces, the one being read lit. */
export const wallOf = (traces: Trace[], lit?: string | null): WallCard[] => traces.map(t => ({ failed: !t.ok, lit: t.id === lit }));
/** One bin per mode, with its count; `lit` marks the chosen one. */
export const binsOf = (c: Record<ModeId, number>, lit?: ModeId | '' | null): Bin[] => MODE_IDS.map(m => ({ label: MODE_SHORT[m], count: c[m], lit: m === lit }));

const KIND_FILL: Record<string, string> = { agent: '#e3e0d2', retrieval: '#76a0e2', chat: '#f4b829', tool: '#93d3b0', reply: '#f3a6bb' };

/** The Waterfall tab: one trace, a row per span. One row is in the tab order at a time; the arrow keys (Home, End) move
 * between rows and the line under it reads out the row in focus with what the span did. With `onPick`, Enter or a click
 * picks the row (chapter 2's puzzle). `stamp` marks a span as the first failure. */
export function Waterfall({ trace, stamp, picked, onPick, onRead, phone = false }:
  { trace: Trace; stamp?: string | null; picked?: string | null; onPick?: (id: string) => void; onRead?: (id: string) => void; phone?: boolean }) {
  const w = traceWaterfall(trace, phone), n = w.rows.length;
  const [cur, setCur] = useState(0), [said, setSaid] = useState<number | null>(null), list = useRef<SVGSVGElement>(null);
  const at = Math.min(cur, Math.max(0, n - 1));
  const read = (i: number) => { setCur(i); setSaid(i); onRead?.(w.rows[i].id); };
  const go = (i: number) => { read(i); list.current?.querySelector<SVGGElement>(`[data-span="${w.rows[i].id}"]`)?.focus(); };
  const key = (e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onPick && n) { e.preventDefault(); onPick(w.rows[at].id); return; }
    const to = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined || !n) return;
    e.preventDefault();
    go(Math.max(0, Math.min(n - 1, to)));
  };
  const span = said === null ? null : spanOf(trace, w.rows[at].id);
  const fs = w.fs;
  return (
    <figure className="ob-fall">
      <svg viewBox={`0 0 ${w.w} ${w.h}`} role="list" aria-label={waterfallLabel(trace, w)} ref={list} onKeyDown={key}>
        <text x={w.x0} y={14} fontSize={fs} aria-hidden="true">0 ms</text>
        <text x={w.w - w.pad} y={14} fontSize={fs} textAnchor="end" aria-hidden="true">{num(w.total)} ms</text>
        {w.rows.map(r => {
          const first = r.id === stamp, mine = r.id === picked;
          return (
            <g key={r.id} role="listitem" tabIndex={r.i === at ? 0 : -1} data-span={r.id} data-kind={r.kind}
              data-first={first ? 1 : undefined} data-picked={mine ? 1 : undefined}
              aria-label={`${rowName(r, n)}${first ? '. First failure' : ''}${mine ? '. Your pick' : ''}`}
              onFocus={() => read(r.i)} onClick={() => { go(r.i); onPick?.(r.id); }}>
              <rect className="ob-hit" x={0} y={r.y - 4} width={w.w} height={w.row - 4} fill="transparent" />
              <text x={w.pad + r.depth * (phone ? 6 : 12)} y={r.y + w.row / 2 - 2} fontSize={fs} aria-hidden="true">
                {phone ? KIND_NAME[r.kind] : r.name.length > 26 ? `${r.name.slice(0, 25)}…` : r.name}
              </text>
              <rect x={r.x} y={r.y + 4} width={r.w} height={w.row - 16} rx={3} fill={KIND_FILL[r.kind]} stroke={INK} strokeWidth={mine ? 3 : 1.2} />
              {/* the stamp goes on whichever side of the bar has more room */}
              {first && (() => {
                const tw = 13 * fs * .62 + 8, y = r.y + w.row / 2 - 2;
                if (w.w - w.pad - r.x - r.w >= tw) return <text className="ob-stamp" x={r.x + r.w + 6} y={y} fontSize={fs} aria-hidden="true">FIRST FAILURE</text>;
                if (r.x - w.x0 >= tw) return <text className="ob-stamp" x={r.x - 6} y={y} fontSize={fs} textAnchor="end" aria-hidden="true">FIRST FAILURE</text>;
                // no room either side: on the bar, over a paper patch so it stays readable
                const x = Math.min(r.x + 4, w.w - w.pad - tw);
                return <g aria-hidden="true"><rect x={x - 2} y={y - fs} width={tw} height={fs * 1.35} rx={3} fill="var(--paper, #fbf7ee)" stroke={INK} strokeWidth={1} /><text className="ob-stamp" x={x + 2} y={y} fontSize={fs}>FIRST FAILURE</text></g>;
              })()}
            </g>
          );
        })}
      </svg>
      <p className="ob-readout" aria-live="polite">
        {span ? <><b>{span.name}</b> · {KIND_NAME[span.kind]} · {num(span.end - span.start)} ms. {span.detail}</> : 'Tab to the trace, then use the arrow keys to read each span.'}
      </p>
    </figure>
  );
}

export type View = 'scene' | 'fall';
const FILL = { height: '100%' };   // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the control room (default) or one trace's waterfall, one at a time. Without a trace the
 * Waterfall tab is off. The tab is the reader's view, kept out of saved progress unless the chapter passes `view` and
 * `onView` to keep it in its step state. */
export function ObsStage({ room, trace, stamp, picked, onPick, onRead, caption, view: kept, onView }: {
  room: Omit<TraceOpts, 'scale'>; trace?: Trace | null; stamp?: string | null; picked?: string | null;
  onPick?: (id: string) => void; onRead?: (id: string) => void; caption: ReactNode; view?: View; onView?: (v: View) => void;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = trace ? kept ?? own : 'scene', setView = onView ?? setOwn;
  const narrow = useNarrow(), o: TraceOpts = { ...room, scale: narrow ? 2 : 1 };
  return (
    <div className="tc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>Picture</button>
        <button type="button" className="chip" aria-pressed={view === 'fall'} disabled={!trace} onClick={() => setView('fall')}>Waterfall</button>
      </div>
      <div className="tc-frame">
        {view === 'scene' || !trace
          ? <IsoStage className="room" board={TRACE_BOARD} style={FILL} scene={traceScene(o)} label={traceLabel(o)} />
          : <Waterfall trace={trace} stamp={stamp} picked={picked} onPick={onPick} onRead={onRead} phone={narrow} />}
      </div>
      <p className="tc-caption">{caption}</p>
    </div>
  );
}

/** A trace as the story column shows it: who asked what, and the reply they got. A note, if given, shows as text. */
export function TraceCard({ trace, note, children }: { trace: Trace; note?: string; children?: ReactNode }) {
  return (
    <article className="ob-trace" data-trace={trace.id} data-ok={trace.ok ? 1 : 0}>
      <p className="ob-q"><b>{trace.customer}:</b> “{trace.question}”</p>
      <p className="ob-a">Reply: “{replyOf(trace)}”</p>
      {note !== undefined && <p className="ob-note"><span className="lbl">Note</span> {note || '—'}</p>}
      {children}
    </article>
  );
}

/** A mode's name and the team's harm rating. */
export const modeName = (m: ModeId) => modeOf(m).name;

/** Chapter 3's saved notes, read by later chapters: the reader's own words, or nothing. Never leaves the browser. */
export function savedNotes(): Record<string, string> {
  const run = loadChapter<{ state?: { notes?: unknown } }>(MODULE, '03-open-coding');
  const notes = run?.state?.notes;
  if (!notes || typeof notes !== 'object') return {};
  return Object.fromEntries(Object.entries(notes as Record<string, unknown>).filter(([, v]) => typeof v === 'string' && v.trim()) as [string, string][]);
}

/** A cited fact from data/observability/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <a className="source" href={f.source} target="_blank" rel="noreferrer">Source: {new URL(f.source).hostname}</a> (checked {f.accessed})
    </p>
  );
}

/** PASS or FAIL as a stamp, in the story column or a table. */
export const Mark = ({ ok }: { ok: boolean }) => <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'PASS' : 'FAIL'}</span>;

/** A row of chips over a finite list; the pressed one is the value. */
export function Chips<T extends string | number>({ label, items, name, value, pick }: { label: string; items: readonly T[]; name: (x: T) => string; value?: T | null; pick: (x: T) => void }) {
  return (
    <div className="ob-chips" role="group" aria-label={label}>
      {items.map(x => <button key={String(x)} type="button" className="chip" aria-pressed={value === x} onClick={() => pick(x)}>{name(x)}</button>)}
    </div>
  );
}
