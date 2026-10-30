// Pieces the releases chapters share: the stage (the signal box, or the Errors chart, one at a time) with the rollout
// dial (KTD13: a native range for the share on the new track while the run plays, Pause, and the lever, each recorded
// at the current minute), the clock (Play, Pause and Step; with reduced motion, Next event and Step), one polite
// read-out that speaks on actions and milestones only, cited facts and the simulator note. Every string is React text
// here; the signal box escapes its pills (esc), and the chart is React SVG.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import {
  PER_MINUTE,
  TICKS,
  clock,
  milestoneAt,
  nextEventAfter,
  pct,
  plural,
  tickOf,
  type Milestone,
  type Run,
} from '../../lib/releases/sim';
import type { Pipeline } from '../../lib/releases/pipeline';
import { fact } from '../../lib/releases/facts';
import {
  SIGNAL_BOARD,
  signalAt,
  signalLabel,
  signalReadouts,
  signalScene,
  type SignalOpts,
} from '../../components/scenes/signalScene';
import { CHART_PAL, chartLabel, rolloutChart } from '../../components/scenes/rolloutChart';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './releases.css';

/** The shares the dial stops at. */
export const SHARES = [0, 0.01, 0.05, 0.1, 0.25, 0.5, 1];

// ---- the read-out ----

const said = (r: Run, m: Milestone) => {
  const at = clock(m.t),
    counts =
      m.canary && m.rest ? `canary ${m.canary[0]} of ${m.canary[1]} failed, the rest ${m.rest[0]} of ${m.rest[1]}` : '';
  switch (m.kind) {
    case 'stage':
      return `${at}: ${pct(m.share!)} of checkouts on the new version.`;
    case 'dial':
      return `${at}: dial set to ${pct(m.share!)}.`;
    case 'pass':
      return `${at}: check passed, ${counts}.`;
    case 'alarm':
      return `${at}: alarm, ${counts}.`;
    case 'back':
      return `${at}: ${r.policy.flag ? 'switching the flag off' : 'rolling back'}.`;
    case 'refused':
      return `${at}: the lever is refused. The old version can’t read the moved data.`;
    case 'safe':
      return `${at}: the new track is empty. ${plural(tickOf(r, m.t).hurtSoFar, 'customer')} hurt.`;
    case 'full':
      return `${at}: everyone is on the new version.`;
  }
};
/** What the read-out says at minute t: every milestone of the latest minute that had one. */
export function readoutOf(r: Run, t: number): string {
  const last = milestoneAt(r, t);
  if (!last) return 'Nothing new is out yet.';
  return r.milestones
    .filter(m => m.t === last.t)
    .map(m => said(r, m))
    .join(' ');
}

// ---- the Errors tab ----

/** Failed checkouts by minute, the share on the new track under them. */
export function ErrorsView({ result, t }: { result: Run; t: number }) {
  const c = rolloutChart(result, t, useNarrow());
  const line = c.bars
    .filter(b => b.oldRate !== null)
    .map((b, i) => `${i ? 'L' : 'M'}${(b.x + b.w / 2).toFixed(1)} ${c.Y(b.oldRate!).toFixed(1)}`)
    .join('');
  return (
    <figure className="rl-chart">
      <svg viewBox={`0 0 ${c.w} ${c.h}`} role="img" aria-label={chartLabel(result, t)}>
        {c.yTicks.map(k => (
          <g key={k.label}>
            <path d={`M${c.x0} ${k.y}H${c.x1}`} stroke={INK} strokeWidth={0.4} strokeDasharray="2 3" />
            <text x={c.x0 - 4} y={k.y + c.fs * 0.35} fontSize={c.fs} textAnchor="end">
              {k.label}
            </text>
          </g>
        ))}
        <text x={c.x0 - 4} y={(c.bandTop + c.bandBottom) / 2} fontSize={c.fs} textAnchor="end">
          New
        </text>
        <path d={`M${c.x0} ${c.bandBottom}H${c.x1}`} stroke={INK} strokeWidth={0.8} />
        {c.bars.map(b => (
          <rect
            key={b.t}
            x={b.x + 0.5}
            y={c.shareY(b.share)}
            width={Math.max(0, b.w - 1)}
            height={c.bandBottom - c.shareY(b.share)}
            fill={CHART_PAL.share}
            stroke={INK}
            strokeWidth={b.share ? 0.5 : 0}
          />
        ))}
        {c.marks.map(m => (
          <path
            key={`${m.kind}${m.t}`}
            d={`M${m.x} ${c.rateTop}V${c.bandBottom}`}
            stroke={m.kind === 'back' ? CHART_PAL.back : CHART_PAL.safe}
            strokeWidth={2}
            data-mark={m.kind}
          />
        ))}
        <path d={line} fill="none" stroke={CHART_PAL.old} strokeWidth={2} />
        {c.bars.map(b =>
          b.newRate === null ? null : (
            <circle
              key={b.t}
              cx={b.x + b.w / 2}
              cy={c.Y(b.newRate)}
              r={Math.min(4, b.w / 2)}
              fill={CHART_PAL.new}
              stroke={INK}
              strokeWidth={0.6}
            />
          ),
        )}
        {c.xTicks.map(k => (
          <text key={k.label} x={k.x} y={c.h - 4} fontSize={c.fs}>
            {k.label}
          </text>
        ))}
      </svg>
      <figcaption className="rl-key">
        <span className="new">New track failed</span> <span className="old">Old track failed</span>{' '}
        <span className="share">Share on new</span>
      </figcaption>
    </figure>
  );
}

// ---- the clock ----

/** Whether the reader asked for less motion, kept live. */
export function useReduced() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)'),
      f = () => setReduced(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return reduced;
}

/** Play advances a minute every beat until `until`; Pause stops; Step moves one minute. With reduced motion, Next
 * event jumps to the run's next milestone instead of playing, and Step stays as the single-minute step. */
export function Transport({
  t,
  next,
  onTick,
  onNote,
  until = TICKS - 1,
}: {
  t: number;
  /** the next minute with a milestone */
  next: number;
  onTick: (t: number) => void;
  onNote: (note: string) => void;
  until?: number;
}) {
  const reduced = useReduced();
  const [playing, setPlaying] = useState(false);
  const live = useRef({ t, onTick, until });
  live.current = { t, onTick, until };
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const c = live.current;
      if (c.t >= c.until) return setPlaying(false);
      c.onTick(c.t + 1);
    }, 700);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);
  const end = t >= until;
  return (
    <div className="rl-transport">
      {reduced ? (
        <button type="button" className="chip" disabled={end} onClick={() => onTick(Math.min(until, next))}>
          Next event
        </button>
      ) : (
        <button
          type="button"
          className="chip"
          aria-pressed={playing}
          disabled={end && !playing}
          onClick={() => {
            onNote(playing ? `Paused at ${clock(t)}.` : `Playing from ${clock(t)}.`);
            setPlaying(p => !p);
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      )}
      <button
        type="button"
        className="chip"
        disabled={end}
        onClick={() => {
          setPlaying(false);
          onTick(t + 1);
        }}
      >
        Step
      </button>
      <span className="rl-clock" aria-live="off">
        {clock(t)}
      </span>
    </div>
  );
}

// ---- the dial and the lever ----

/** The rollout dial: a native range over SHARES, and the lever beside it. */
export function Dial({
  run,
  t,
  onDial,
  onBack,
}: {
  run: Run;
  t: number;
  onDial?: (share: number) => void;
  onBack?: () => void;
}) {
  const k = tickOf(run, t),
    i = Math.max(
      0,
      SHARES.findIndex(s => s >= k.share),
    ),
    text = pct(SHARES[i]);
  return (
    <div className="rl-dial">
      {onDial && (
        <div className="rl-range">
          <label htmlFor="rl-dial">{`Share on the new version: ${text}`}</label>
          <input
            id="rl-dial"
            type="range"
            min={0}
            max={SHARES.length - 1}
            step={1}
            value={i}
            aria-valuetext={text}
            disabled={k.backing}
            onChange={e => onDial(SHARES[Number(e.target.value)])}
          />
        </div>
      )}
      {onBack && (
        <button type="button" className="chip rl-lever" disabled={k.backing || k.share === 0} onClick={onBack}>
          {run.policy.flag ? 'Switch the flag off' : 'Pull the rollback lever'}
        </button>
      )}
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'errors';
const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape

/** The chapters' stage: the signal box (default) or the Errors chart, one at a time; the clock under it when the
 * chapter passes `onTick`; the dial and lever when it passes `onDial` or `onBack`; and the read-out. */
export function ReleasesStage({
  run,
  t,
  caption,
  view: kept,
  onView,
  say,
  onTick,
  until,
  onDial,
  onBack,
  pipeline,
}: {
  run: Run;
  t: number;
  caption: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  say?: Say;
  onTick?: (t: number) => void;
  until?: number;
  onDial?: (share: number) => void;
  onBack?: () => void;
  pipeline?: Pipeline;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: SignalOpts = { ...signalAt(run, t), ...(pipeline ? { pipeline } : {}), say, scale };
  // the read-out: the run's milestones, or the reader's last Play or Pause until the next milestone
  const out = readoutOf(run, t),
    [note, setNote] = useState<string | null>(null);
  useEffect(() => setNote(null), [out]);
  return (
    <div className="tc-stage rl-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'errors'} onClick={() => setView('errors')}>
          Errors
        </button>
      </div>
      <div className="tc-frame">
        {view === 'errors' ? (
          <ErrorsView result={run} t={t} />
        ) : (
          <IsoStage
            className="signal"
            board={SIGNAL_BOARD}
            style={FILL}
            scene={signalScene(o)}
            label={signalLabel(o)}
          />
        )}
      </div>
      {(onDial || onBack) && <Dial run={run} t={t} onDial={onDial} onBack={onBack} />}
      {onTick && <Transport t={t} next={nextEventAfter(run, t)} onTick={onTick} onNote={setNote} until={until} />}
      <p className="rl-readout" role="status" aria-live="polite">
        {note ?? out}
      </p>
      <p className="tc-caption">
        <span className="txt">{caption}</span>
        <span className="lbl">{signalReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** A labelled range over a few values. */
export function Pick<T extends number>({
  id,
  name,
  value,
  values,
  text,
  onChange,
}: {
  id: string;
  name: string;
  value: T;
  values: T[];
  text: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const i = Math.max(0, values.indexOf(value));
  return (
    <div className="rl-range">
      <label htmlFor={id}>{`${name}: ${text(value)}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={i}
        aria-valuetext={text(value)}
        onChange={e => onChange(values[Number(e.target.value)])}
      />
    </div>
  );
}

/** A cited fact from data/releases/facts.json, with its source and the day it was checked (R5). */
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
  <p className="note rl-note">
    {`A simulated morning: made-up changes, ${PER_MINUTE} checkouts a minute, and planning numbers for failure rates and how long each way back takes, not measurements.`}
  </p>
);
