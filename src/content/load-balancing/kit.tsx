// Pieces the load-balancing chapters share (KTD15): the stage (the switchyard, or the latency board, one at a time) that
// plays a run as requests land, Replay, the percentiles as text, and the controls beside it: the rule, each server's
// state, the health-check miss count, the sticky switch and the hedge wait. With reduced motion a run shows its end at
// once. Every string is React text here; the yard escapes its pills (esc), and the board is drawn as React SVG.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import {
  HEDGES,
  MISSES,
  SERVERS,
  STATES,
  STATE_NAME,
  type Result,
  type ServerState,
} from '../../lib/load-balancing/sim';
import { RULES, RULE_NAME, type Rule } from '../../lib/load-balancing/rules';
import { fact } from '../../lib/load-balancing/facts';
import {
  YARD_BOARD,
  yardAt,
  yardLabel,
  yardReadouts,
  yardScene,
  type YardOpts,
} from '../../components/scenes/yardScene';
import { BAR_PAL, boardLabel, latencyBoard, percentilesText } from '../../components/scenes/latencyBoard';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import Select from '../../components/story/Select';
import type { Say } from '../../components/story/steps';
import './load-balancing.css';

/** how long a run takes to play, whatever its length in simulated time */
export const PLAY_MS = 2400;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The run's clock: its end at first (a saved run shows as finished), then from 0 to the end over PLAY_MS each time
 * `play` changes or Replay is pressed; at once with reduced motion. */
function usePlayback(run: Result | undefined, play: number) {
  const end = run?.end ?? 0,
    [t, setT] = useState(end),
    [replays, setReplays] = useState(0),
    first = useRef(true);
  useEffect(() => {
    if (first.current || !run || reduced()) {
      first.current = false;
      setT(end);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / PLAY_MS);
      setT(k * end);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setT(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, play, replays]);
  return { t: Math.min(t, end), done: !run || t >= end, replay: () => setReplays(r => r + 1) };
}

// ---- the Board tab ----

/** The latency board at time t of a run: bars per wait band, the p99 marker, and the percentiles as text. */
export function BoardView({ run, t }: { run: Result; t: number }) {
  const phone = useNarrow(),
    b = latencyBoard(run, t, { phone });
  return (
    <figure className="lb-board">
      <svg viewBox={`0 0 ${b.w} ${b.h}`} role="img" aria-label={boardLabel(b)}>
        {b.bars.map(x => (
          <g key={x.i} data-band={x.i} data-count={x.count}>
            {x.h > 0 && (
              <rect
                x={x.x}
                y={b.base - x.h}
                width={x.w}
                height={x.h}
                fill={BAR_PAL[x.tone as keyof typeof BAR_PAL]}
                stroke={INK}
                strokeWidth={0.8}
              />
            )}
            <text x={x.x + x.w / 2} y={b.base + b.fs + 4} fontSize={b.fs} textAnchor="middle" aria-hidden="true">
              {x.label}
            </text>
          </g>
        ))}
        <path d={`M${b.x0} ${b.base}H${b.w - 6}`} stroke={INK} strokeWidth={1} aria-hidden="true" />
        <text x={6} y={b.base + b.fs + 4} fontSize={b.fs} textAnchor="start" aria-hidden="true">
          ms
        </text>
        {b.marker && (
          <g className="lb-marker" data-p99={Math.round(b.marker.ms)} aria-hidden="true">
            <path d={`M${b.marker.x} ${b.base}V14`} stroke={BAR_PAL.p99} strokeWidth={2} strokeDasharray="4 3" />
            <text
              x={b.marker.x}
              y={11}
              fontSize={b.fs}
              fontWeight={800}
              textAnchor={b.marker.x > b.w * 0.7 ? 'end' : 'start'}
            >
              {`p99 ${msOf(b.marker.ms)}`}
            </text>
          </g>
        )}
      </svg>
    </figure>
  );
}

// ---- the stage ----

export type View = 'scene' | 'board';
const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape

/** The chapters' stage: the switchyard (default) or the latency board, one at a time, both read off the same moment of
 * the run. `idle` is the yard drawn before any run. The tab is the reader's view unless the chapter passes `view`. */
export function LbStage({
  run,
  play,
  idle,
  rule,
  caption,
  view: kept,
  onView,
  say,
}: {
  run?: Result;
  /** bump to play the run from the start */
  play: number;
  idle: Omit<YardOpts, 'say' | 'scale'>;
  rule: Rule;
  caption: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const narrow = useNarrow(),
    { t, done, replay } = usePlayback(run, play);
  const o: YardOpts = { ...(run ? yardAt(run, t, RULE_NAME[rule]) : idle), say, scale: narrow ? 2 : 1.2 };
  return (
    <div className="tc-stage lb-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'board'}
          disabled={!run}
          onClick={() => setView('board')}
        >
          Board
        </button>
        <button type="button" className="chip lb-replay" disabled={!run || !done} onClick={replay}>
          Replay
        </button>
      </div>
      <div className="tc-frame">
        {view === 'board' && run ? (
          <BoardView run={run} t={t} />
        ) : (
          <IsoStage className="yard" board={YARD_BOARD} style={FILL} scene={yardScene(o)} label={yardLabel(o)} />
        )}
      </div>
      <p className="lb-readout" aria-live="polite" data-done={done ? 1 : 0}>
        {run ? (done ? percentilesText(latencyBoard(run, run.end)) : 'Requests landing…') : 'No run yet.'}
      </p>
      <p className="tc-caption">
        <span className="txt">{caption}</span>
        <span className="lbl">{yardReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

// ---- the controls beside the stage ----

/** The rule, as one radio group. */
export function RulePick({
  value,
  onPick,
  rules = RULES,
}: {
  value: Rule;
  onPick: (r: Rule) => void;
  rules?: readonly Rule[];
}) {
  return (
    <fieldset className="lb-field">
      <legend>Rule</legend>
      {rules.map(r => (
        <label key={r}>
          <input type="radio" name="lb-rule" checked={value === r} onChange={() => onPick(r)} />
          {RULE_NAME[r]}
        </label>
      ))}
    </fieldset>
  );
}

/** Each server's state from the trouble time: a select per server. */
export function ServerStates({
  states,
  onChange,
  only,
}: {
  states: Partial<Record<string, ServerState>>;
  onChange: (s: Partial<Record<string, ServerState>>) => void;
  /** the servers the reader may change; others are listed fixed */
  only?: string[];
}) {
  return (
    <fieldset className="lb-field lb-states">
      <legend>Servers from the sale</legend>
      {SERVERS.filter(s => !only || only.includes(s.id)).map(s => (
        <label key={s.id}>
          <span>{s.name}</span>
          <Select
            value={states[s.id] ?? 'fine'}
            onChange={e => onChange({ ...states, [s.id]: e.target.value as ServerState })}
          >
            {STATES.map(st => (
              <option key={st} value={st}>
                {STATE_NAME[st]}
              </option>
            ))}
          </Select>
        </label>
      ))}
    </fieldset>
  );
}

const missText = (n: number) => (n ? `pull after ${n} miss${n === 1 ? '' : 'es'}` : 'off');
/** The health-check miss count, a range over MISSES (0 is off). */
export function MissCount({ value, onChange, id }: { value: number; onChange: (n: number) => void; id: string }) {
  return (
    <div className="lb-range">
      <label htmlFor={id}>{`Health checks: ${missText(value)}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={MISSES.length - 1}
        step={1}
        value={Math.max(0, MISSES.indexOf(value))}
        aria-valuetext={missText(value)}
        onChange={e => onChange(MISSES[Number(e.target.value)])}
      />
    </div>
  );
}

const hedgeText = (ms: number) => (ms ? `after ${ms} ms` : 'off');
/** The hedge wait, a range over HEDGES (0 is off). */
export function HedgeWait({ value, onChange, id }: { value: number; onChange: (n: number) => void; id: string }) {
  return (
    <div className="lb-range">
      <label htmlFor={id}>{`Hedge: ${hedgeText(value)}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={HEDGES.length - 1}
        step={1}
        value={Math.max(0, HEDGES.indexOf(value))}
        aria-valuetext={hedgeText(value)}
        onChange={e => onChange(HEDGES[Number(e.target.value)])}
      />
    </div>
  );
}

/** The sticky-sessions switch. */
export const StickySwitch = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button type="button" className="chip" aria-pressed={on} onClick={onToggle}>
    Sticky sessions
  </button>
);

/** A cited fact from data/load-balancing/facts.json, with its source and the day it was checked (R5). */
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
  <p className="note lb-note">
    A simulated sale: Larkspur’s own traffic and planning numbers, not a measurement of any real server or balancer.
  </p>
);

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const msOf = (x: number) => `${Math.round(x).toLocaleString('en-US')} ms`;
