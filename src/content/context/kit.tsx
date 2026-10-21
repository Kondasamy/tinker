// Pieces the context chapters share: the stage (the window desk, or the same call as one stacked bar) and its caption.
// Customers' words and recorded answers reach here, so every string is React text; the desk escapes its pills (esc)
// before they become SVG, and the bar is drawn as React SVG, so it has no markup to escape.
import { useRef, useState, type KeyboardEvent } from 'react';
import { num } from '../../lib/format';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import { WINDOW_BOARD, windowLabel, windowReadouts, windowScene, windowState, type WindowOpts } from '../../components/scenes/windowScene';
import { KIND_NAME, KIND_PAL, barLabel, segName, windowBar } from '../../components/scenes/windowBar';
import { DEFAULTS, REPLY_ROOM, run, type Run, type Setup } from '../../lib/context/loop';
import { RECORDING } from '../../lib/context/turns';
import { caseOf, type PartKind } from '../../lib/context/window';
import { fact } from '../../lib/context/facts';
import { useNarrow } from '../tool-calling/kit';
import './context.css';

/** The props a chapter turns on: everything in WindowOpts but the run, the call and the drawing's own settings. */
export type WindowProps = Pick<WindowOpts, 'shelf' | 'cabinet' | 'tray'>;
export type View = 'scene' | 'bar';

const H = 132, BAR = { y: 44, h: 40 };
/** The Window tab: the call's window as one stacked bar. Each segment is a list item; one is in the tab order at a
 * time and the arrow keys (Home, End) move between them; the line under the bar reads out the one in focus. */
export function WindowBar({ run, upTo, budget = DEFAULTS.budget, phone = false }: { run: Run; upTo?: number; budget?: number; phone?: boolean }) {
  const st = windowState({ run, upTo, budget }), b = windowBar(st.window, { budget, hit: st.meter?.hit, phone });
  const [cur, setCur] = useState(0), [said, setSaid] = useState<number | null>(null), list = useRef<SVGSVGElement>(null);
  const n = b.segs.length, at = Math.min(cur, Math.max(0, n - 1));
  const go = (i: number) => { setCur(i); setSaid(i); list.current?.querySelector<SVGGElement>(`[data-seg="${i}"]`)?.focus(); };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined || !n) return;
    e.preventDefault();
    go(Math.max(0, Math.min(n - 1, to)));
  };
  const fs = b.fs, mid = BAR.y + BAR.h / 2;
  return (
    <figure className="cx-bar">
      <svg viewBox={`0 0 ${b.w} ${H}`} role="list" aria-label={barLabel(b)} ref={list} onKeyDown={key}>
        {b.cached > 0 && (
          <g className="cx-cache" aria-hidden="true">
            <path d={`M${b.pad} ${BAR.y - 6}V${BAR.y - 12}H${b.cacheEnd}V${BAR.y - 6}`} fill="none" stroke={INK} strokeWidth={1.6} />
            <text x={b.pad + 4} y={BAR.y - 17} fontSize={fs}>CACHED {num(b.cached)}</text>
          </g>
        )}
        {b.segs.map(s => (
          <g key={s.i} role="listitem" tabIndex={s.i === at ? 0 : -1} aria-label={segName(s, n)} data-seg={s.i} data-kind={s.kind}
            data-cached={s.cached ? 1 : 0} data-over={s.over ? 1 : 0} onFocus={() => { setCur(s.i); setSaid(s.i); }} onClick={() => go(s.i)}>
            <rect x={s.x} y={BAR.y} width={s.w} height={BAR.h} fill={KIND_PAL[s.kind].l} stroke={INK} strokeWidth={1}
              strokeDasharray={s.cleared ? '3 2' : undefined} />
            {s.cached && <rect x={s.x} y={BAR.y + BAR.h - 5} width={s.w} height={5} fill="var(--acc, #f4b829)" stroke="none" aria-hidden="true" />}
            {s.word && <text x={s.x + s.w / 2} y={mid + fs * .36} fontSize={fs} textAnchor="middle" aria-hidden="true">{s.word}</text>}
          </g>
        ))}
        {n > 0 && <rect className="cx-room" x={b.room.x} y={BAR.y} width={b.room.w} height={BAR.h} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" aria-hidden="true" />}
        {b.line > b.pad && b.line < b.w - b.pad + 1 && (
          <g className="cx-line" aria-hidden="true">
            {b.over && <rect x={b.line} y={BAR.y - 4} width={Math.max(0, b.room.x + b.room.w - b.line)} height={BAR.h + 8} fill="var(--bad, #b5361f)" opacity={.18} />}
            <path d={`M${b.line} ${BAR.y - 8}V${BAR.y + BAR.h + 8}`} stroke={b.over ? 'var(--bad, #b5361f)' : INK} strokeWidth={2.4} />
            <text x={Math.min(b.line, b.w - b.pad)} y={BAR.y + BAR.h + 8 + fs * 1.4} fontSize={fs} textAnchor="end">BUDGET {num(b.budget)}</text>
          </g>
        )}
        <text x={b.pad} y={BAR.y + BAR.h + 8 + fs * 1.4} fontSize={fs} aria-hidden="true">{n ? `${num(b.total)} + ${num(b.room.to - b.room.from)} REPLY` : 'EMPTY'}</text>
      </svg>
      <p className="cx-readout" aria-live="polite">
        {n ? (said === null ? 'Tab to the bar, then use the arrow keys to read each part.' : segName(b.segs[at], n)) : 'Nothing in the window yet.'}
      </p>
      <ul className="cx-key" aria-label="Kinds of part">
        {[...new Set(b.segs.map(s => s.kind))].map((k: PartKind) => <li key={k}><i style={{ background: KIND_PAL[k].l }} />{KIND_NAME[k]}</li>)}
      </ul>
    </figure>
  );
}

const FILL = { height: '100%' };   // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the window desk (default) or the same call as a stacked bar, one at a time. `upTo` is the number
 * of calls shown (a refused window counts as the call after the last one); the last one is the current call. The tab is
 * the reader's view, kept out of saved progress unless the chapter passes `view` and `onView` to keep it in its step state. */
export function ContextStage({ run, upTo, budget = DEFAULTS.budget, props = {}, view: kept, onView }:
  { run: Run; upTo?: number; budget?: number; props?: WindowProps; view?: View; onView?: (v: View) => void }) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own, setView = onView ?? setOwn;
  const narrow = useNarrow(), opts: WindowOpts = { ...props, run, upTo, budget, scale: narrow ? 1.8 : 1 };
  const st = windowState(opts), c = st.meter ? caseOf(st.meter.case) : undefined;
  return (
    <div className="tc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>Picture</button>
        <button type="button" className="chip" aria-pressed={view === 'bar'} onClick={() => setView('bar')}>Window ({num(st.tokens)})</button>
      </div>
      <div className="tc-frame">
        {view === 'scene'
          ? <IsoStage className="office" board={WINDOW_BOARD} style={FILL} scene={windowScene(opts)} label={windowLabel(opts)} />
          : <WindowBar run={run} upTo={upTo} budget={budget} phone={narrow} />}
      </div>
      <p className="tc-caption">
        <span className="lbl">{st.window ? `Call ${st.call} of ${st.calls}${c ? ` · ${c.customer}` : ''}` : 'Nothing sent yet.'}</span>
        {st.refused && <span className="stamp wrong">REFUSED</span>}
        {c && <span>{c.question}</span>}
        {st.meter && <span className="txt">{st.meter.turn.text}</span>}
        {st.refused && <span>The host refused this window: it is over the budget, so no model call was made.</span>}
        <span className="lbl">{windowReadouts(opts).join(' · ')}</span>
      </p>
    </div>
  );
}

/** A sourced claim about real practice (R5), with its source and the date it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <a className="source" href={f.source} target="_blank" rel="noreferrer">Source: {new URL(f.source).hostname}</a> (checked {f.accessed})
    </p>
  );
}

const runs = new Map<string, Run>();
/** A host run over the merged recording, computed once per setup (the tokenizer is the slow part). */
export function runOf(setup: Partial<Setup>): Run {
  const k = JSON.stringify(setup);
  if (!runs.has(k)) runs.set(k, run(RECORDING, setup));
  return runs.get(k)!;
}

/** The parts of one call's window with their live token counts, the reply's room and the budget. */
export function PartsTable({ run: r, upTo, caption }: { run: Run; upTo?: number; caption: string }) {
  const st = windowState({ run: r, upTo });
  if (!st.window) return null;
  return (
    <table className="tc-ledger cx-parts">
      <caption>{caption}</caption>
      <thead><tr><th scope="col">Part</th><th scope="col">Tokens</th></tr></thead>
      <tbody>
        {st.window.parts.map((p, i) => <tr key={i}><th scope="row">{p.label}</th><td>{num(p.tokens)}</td></tr>)}
        <tr><th scope="row">Room kept for the reply</th><td>{num(REPLY_ROOM)}</td></tr>
      </tbody>
      <tfoot><tr><th scope="row">Total, of a budget of {num(DEFAULTS.budget)}</th><td>{num(st.tokens + REPLY_ROOM)}</td></tr></tfoot>
    </table>
  );
}
