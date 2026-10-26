// Pieces the queues chapters share: the stage (the ticket rail, or the jobs table, one at a time) with its Play, Pause
// and Step controls and the crash bar (KTD15: a button per worker over the rail, only busy workers can be picked, the
// arrow keys move between them, Enter knocks one over at the current minute), cited facts and the simulator note.
// Every string is React text here; the rail escapes its pills (esc), and the jobs table is a table.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { TICKS, WORKER_NAMES, clock, type Run, type WorkerView } from '../../lib/queues/sim';
import { fact } from '../../lib/queues/facts';
import { RAIL_BOARD, railLabel, railReadouts, railScene, type RailOpts } from '../../components/scenes/railScene';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './queues.css';

// ---- the Jobs tab ----

type JobState = 'waiting' | 'running' | 'retry' | 'done' | 'dead' | 'hidden';
const STATE_NAME: Record<JobState, string> = {
  waiting: 'On the rail',
  running: 'Being packed',
  retry: 'Waiting to retry',
  done: 'Done',
  dead: 'Dead-lettered',
  hidden: 'Hidden by a lease',
};
/** Every order that has arrived by minute t: where its job is, its tries and parcels so far. */
export function jobsAt(r: Run, t: number) {
  const k = r.ticks[Math.max(0, Math.min(t, r.ticks.length - 1))];
  const running = new Map(k.workers.filter(w => w.state === 'busy').map(w => [w.job!, w.tries!]));
  return r.jobs
    .filter(j => j.job.t <= k.t)
    .map(j => {
      const id = j.job.id,
        w = k.waiting.find(x => x.id === id);
      const state: JobState =
        j.doneAt !== undefined && j.doneAt <= k.t
          ? 'done'
          : k.dead.includes(id)
            ? 'dead'
            : running.has(id)
              ? 'running'
              : w
                ? 'waiting'
                : k.delayed.includes(id)
                  ? 'retry'
                  : 'hidden';
      return { id, who: j.job.who, item: j.job.item, state, tries: running.get(id) ?? (w?.tries || null) };
    });
}

/** The orders so far as a table, in a focusable region so the keyboard can scroll it. */
export function JobsView({ result, t }: { result: Run; t: number }) {
  const rows = jobsAt(result, t);
  return (
    <div className="qu-jobs" tabIndex={0} role="region" aria-label={`Jobs, ${clock(t)}`}>
      <table className="tc-ledger">
        <caption>{`Every order by ${clock(t)}`}</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Job</th>
            <th scope="col">Try</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map(r => (
              <tr key={r.id} data-job={r.id} data-state={r.state}>
                <th scope="row">{`${r.who}, ${r.item}`}</th>
                <td>{STATE_NAME[r.state]}</td>
                <td>{r.tries ?? '·'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>No orders yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- the crash bar ----

/** A button per worker over the rail: only busy workers can be knocked over; the arrow keys move between them. With
 * none busy, every button is disabled and a line says why. */
export function CrashBar({ workers, onCrash }: { workers: WorkerView[]; onCrash: (worker: number) => void }) {
  const busy = workers.map(w => w.state === 'busy'),
    first = busy.indexOf(true);
  const [cur, setCur] = useState(first),
    at = busy[cur] ? cur : first;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const key = (e: KeyboardEvent) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d || at < 0) return;
    e.preventDefault();
    for (let i = 1; i <= workers.length; i++) {
      const j = (at + d * i + workers.length * 2) % workers.length;
      if (busy[j]) {
        setCur(j);
        refs.current[j]?.focus();
        return;
      }
    }
  };
  return (
    <div className="qu-crash">
      <div role="toolbar" aria-label="Knock a worker over" onKeyDown={key}>
        {workers.map((_, i) => (
          <button
            key={i}
            ref={b => {
              refs.current[i] = b;
            }}
            type="button"
            className="chip"
            data-worker={i}
            disabled={!busy[i]}
            tabIndex={i === at ? 0 : -1}
            onClick={() => onCrash(i)}
          >
            {`Knock over ${WORKER_NAMES[i]}`}
          </button>
        ))}
      </div>
      {first < 0 && (
        <p className="qu-reason" role="status">
          {workers.some(w => w.state === 'down')
            ? 'No one else is mid-job. Step on to watch the lease.'
            : 'No worker is mid-job: press Step or Play.'}
        </p>
      )}
    </div>
  );
}

// ---- the clock: Play, Pause and Step ----

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Play advances a minute every beat until the end of the morning (or `until`); Pause stops; Step moves one minute. */
export function Transport({
  t,
  onTick,
  until = TICKS - 1,
}: {
  t: number;
  onTick: (t: number) => void;
  until?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const live = useRef({ t, onTick, until });
  live.current = { t, onTick, until };
  useEffect(() => {
    if (!playing) return;
    // with reduced motion the minutes still advance, a little slower, and nothing slides
    const id = setInterval(
      () => {
        const c = live.current;
        if (c.t >= c.until) return setPlaying(false);
        c.onTick(c.t + 1);
      },
      reduced() ? 900 : 650,
    );
    return () => clearInterval(id);
  }, [playing]);
  const end = t >= until;
  return (
    <div className="qu-transport">
      <button
        type="button"
        className="chip"
        aria-pressed={playing}
        disabled={end && !playing}
        onClick={() => setPlaying(p => !p)}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
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
      <span className="qu-clock" aria-live="off">
        {clock(t)}
      </span>
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'jobs';
/** What a chapter puts on the stage: the rail's state, the run for the Jobs tab, and the caption. */
export interface Shown {
  scene: Omit<RailOpts, 'scale' | 'say'>;
  result?: Run;
  tick?: number;
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the rail (default) or the jobs table, one at a time, with the clock under it when the chapter
 * passes `onTick`, and the crash bar over the rail when it passes `onCrash`. */
export function QueuesStage({
  show,
  view: kept,
  onView,
  say,
  onTick,
  until,
  onCrash,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the rail (RAIL_PARTS) */
  say?: Say;
  onTick?: (t: number) => void;
  until?: number;
  onCrash?: (worker: number) => void;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: RailOpts = { ...show.scene, say, scale };
  const t = show.tick ?? 0;
  return (
    <div className="tc-stage qu-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'jobs'}
          disabled={!show.result}
          onClick={() => setView('jobs')}
        >
          Jobs
        </button>
      </div>
      <div className="tc-frame">
        {view === 'jobs' && show.result ? (
          <JobsView result={show.result} t={t} />
        ) : (
          <div className="qu-pic">
            <IsoStage className="rail" board={RAIL_BOARD} style={FILL} scene={railScene(o)} label={railLabel(o)} />
            {onCrash && !o.inline && <CrashBar workers={o.workers} onCrash={onCrash} />}
          </div>
        )}
      </div>
      {onTick && <Transport t={t} onTick={onTick} until={until} />}
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{railReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** A labelled range over a few values (workers, tries, lease). */
export function Pick({
  id,
  name,
  value,
  values,
  unit,
  units = `${unit}s`,
  onChange,
}: {
  id: string;
  name: string;
  value: number;
  values: number[];
  unit: string;
  units?: string;
  onChange: (v: number) => void;
}) {
  const i = Math.max(0, values.indexOf(value)),
    text = value === 0 ? 'no limit' : `${value} ${value === 1 ? unit : units}`;
  return (
    <div className="qu-range">
      <label htmlFor={id}>{`${name}: ${text}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={i}
        aria-valuetext={text}
        onChange={e => onChange(values[Number(e.target.value)])}
      />
    </div>
  );
}

/** A cited fact from data/queues/facts.json, with its source and the day it was checked (R5). */
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
  <p className="note qu-note">
    A simulated sale: Larkspur’s own orders and planning-number job times, slowed so you can watch.
  </p>
);
