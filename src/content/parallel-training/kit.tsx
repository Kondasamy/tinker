// Pieces the parallel-training chapters share: the stage (the round table, or the Timeline tab: a lane per worker of
// compute, waiting and bubble, one at a time), pass the buckets (KTD10: Step, Play that turns into Pause and never starts
// by itself, hidden under reduced motion; a Workers radio group; a Micro-batches range in pipeline mode; one polite
// read-out per action and milestone, never per tick), cited facts and the simulation note. Every string is React text
// here; the drawing escapes its pills (esc).
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import { ListRange } from '../../components/story/ListRange';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import {
  RING_BOARD,
  ringLabel,
  ringScene,
  ringTimeline,
  timelineLabel,
  type RingOpts,
  type TimelineOpts,
} from '../../components/scenes/ringScene';
import { fillsAfter, ringAllReduce, type Ring } from '../../lib/parallel-training/ring';
import { bubbleOf, gpipe, idleAt, type Schedule } from '../../lib/parallel-training/pipeline';
import { GRADIENTS } from '../../lib/parallel-training/story';
import { fact } from '../../lib/parallel-training/facts';
import { useNarrow } from '../tool-calling/kit';
import './parallel-training.css';

// ---- the run: the ring over the stand-in gradients, or the pipeline's schedule ----

export const WORKERS = [2, 4, 8] as const;
export type Workers = (typeof WORKERS)[number];
export const MICROS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export interface PassState {
  mode: 'ring' | 'pipeline';
  n: Workers;
  /** ring: hops done (0..2(n−1)); pipeline: the slot shown (0..slots−1) */
  k: number;
  /** micro-batches (pipeline mode) */
  m: number;
}
export const START: PassState = { mode: 'ring', n: 4, k: 0, m: 4 };

/** n workers' stand-in gradients: the four hand-set vectors (story.json) taken in turn, each repeated to at least n
 * numbers so every bucket holds one. */
export function gradientsFor(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => {
    const g = GRADIENTS[i % GRADIENTS.length];
    return Array.from({ length: Math.max(g.length, n) }, (_, j) => g[j % g.length]);
  });
}
const rings = new Map<number, Ring>(),
  schedules = new Map<string, Schedule>();
export const ringFor = (n: number) => {
  let r = rings.get(n);
  if (!r) rings.set(n, (r = ringAllReduce(gradientsFor(n))));
  return r;
};
export const scheduleFor = (p: number, m: number) => {
  const key = `${p}x${m}`;
  let s = schedules.get(key);
  if (!s) schedules.set(key, (s = gpipe(p, m)));
  return s;
};
/** The last k: the ring's last hop, or the schedule's last slot. */
export const lastOf = (s: PassState) => (s.mode === 'ring' ? 2 * (s.n - 1) : scheduleFor(s.n, s.m).slots - 1);

/** The picture's options for a state. */
export function sceneOf(s: PassState): RingOpts {
  if (s.mode === 'pipeline') {
    const sch = scheduleFor(s.n, s.m);
    return { mode: 'pipeline', n: s.n, slots: sch.grid.map(row => row[s.k] ?? null) };
  }
  const r = ringFor(s.n);
  return { mode: 'ring', n: s.n, fills: fillsAfter(r, s.k), sends: s.k ? r.hops[s.k - 1].sends : [] };
}
/** The Timeline tab's options for a state. */
export const timelineOf = (s: PassState): TimelineOpts =>
  s.mode === 'pipeline'
    ? { mode: 'pipeline', grid: scheduleFor(s.n, s.m).grid, k: s.k }
    : { mode: 'ring', n: s.n, k: s.k };

const num = (x: number) => String(Math.round(x * 1000) / 1000);
const list = (xs: number[]) =>
  xs.length === 1 ? `${xs[0]}` : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/** The read-out's milestone at k, if any: the reduce and the all-reduce done; forwards done, the step done. */
export function milestone(s: PassState): string | null {
  if (s.mode === 'ring') {
    const r = ringFor(s.n),
      last = 2 * (s.n - 1);
    if (s.k === s.n - 1) return `Reduce done: each worker holds one full bucket, the sum of its chunk from all ${s.n}.`;
    if (s.k === last)
      return `All-reduce done: every worker has every full bucket, the mean ${[...r.result[0].slice(0, 4)].map(num).join(', ')}. Each sent ${r.sent[0]} bytes.`;
    return null;
  }
  const sch = scheduleFor(s.n, s.m);
  if (s.k === s.m + s.n - 2) return `Forwards done: the last stage starts back down.`;
  if (s.k === sch.slots - 1)
    return `Step done: each stage idled ${2 * (s.n - 1)} of ${sch.slots} slots, a bubble of ${Math.round(bubbleOf(sch) * 100)}%.`;
  return null;
}
/** What a Step to k says: the hop or the slot, then any milestone. */
export function stepNote(s: PassState): string {
  const done = milestone(s);
  if (s.mode === 'ring') {
    const phase = s.k <= s.n - 1 ? 'passed one bucket on and added it in' : 'passed a full bucket on';
    const hop = `Hop ${s.k} of ${2 * (s.n - 1)}: each worker ${phase}.`;
    return done ? `${hop} ${done}` : hop;
  }
  const sch = scheduleFor(s.n, s.m),
    idle = idleAt(sch, s.k).map(i => i + 1);
  const slot = `Slot ${s.k + 1} of ${sch.slots}: ${idle.length ? `stage${idle.length > 1 ? 's' : ''} ${list(idle)} idle` : 'every stage working'}.`;
  return done ? `${slot} ${done}` : slot;
}
/** What a fresh start says: who is at the table, or the pipeline and its bubble to come. */
export function startNote(s: PassState): string {
  if (s.mode === 'ring') return `${s.n} workers, each bucket holding its own share.`;
  const sch = scheduleFor(s.n, s.m);
  return `${s.n} stages, ${s.m} micro-batch${s.m > 1 ? 'es' : ''}: ${sch.slots} slots, ${Math.round(bubbleOf(sch) * 100)}% of them idle.`;
}

// ---- the stage ----

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

/** The Timeline tab: flat lanes, wide or phone by width (CSS), the ink filter as FlatStage draws it. */
function Timeline({ o }: { o: TimelineOpts }) {
  const wide = useMemo(() => ringTimeline(o), [o]),
    phone = useMemo(() => ringTimeline(o, { phone: true }), [o]),
    label = timelineLabel(o);
  const svg = (t: { svg: string; w: number; h: number }, cls: string, id: string) => (
    <svg className={cls} viewBox={`0 0 ${t.w} ${t.h}`} role="img" aria-label={label}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the ink filter, built from numbers */}
      <defs dangerouslySetInnerHTML={{ __html: filterFor(1, id) }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup the scene built, every string escaped (esc) */}
      <g filter={`url(#${id})`} dangerouslySetInnerHTML={{ __html: t.svg }} />
    </svg>
  );
  return (
    <figure className="pt-timeline">
      {svg(wide, 'pt-wide', 'pt-tl-hand')}
      {svg(phone, 'pt-phone', 'pt-tl-phand')}
    </figure>
  );
}

export type View = 'scene' | 'timeline';
const FILL = { height: '100%' };
/** The chapters' stage: the round table (or line) by default, or the Timeline tab. `scene` overrides the picture's
 * options (memory mode, a failed worker, pills); `timeline` is what the tab shows (none: no tab). `children` go under
 * the frame (the controls). */
export function RingStage({
  scene,
  timeline,
  caption,
  say,
  view: kept,
  onView,
  children,
}: {
  scene: RingOpts;
  timeline?: TimelineOpts;
  caption: ReactNode;
  say?: Say;
  view?: View;
  onView?: (v: View) => void;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const narrow = useNarrow();
  const view = timeline ? (kept ?? own) : 'scene',
    setView = onView ?? setOwn;
  const o = { ...scene, say, scale: narrow ? 2 : 1.2 };
  return (
    <div className="tc-stage pt-stage">
      {timeline && (
        <div className="tc-tabs" role="group" aria-label="Show in the picture">
          <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
            Picture
          </button>
          <button type="button" className="chip" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>
            Timeline
          </button>
        </div>
      )}
      <div className="tc-frame">
        {view === 'timeline' && timeline ? (
          <Timeline o={timeline} />
        ) : (
          <IsoStage
            className="ring-table"
            board={RING_BOARD}
            style={FILL}
            scene={ringScene(o)}
            label={ringLabel(o)}
            data-mode={o.mode ?? 'ring'}
          />
        )}
      </div>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
    </div>
  );
}

// ---- pass the buckets ----

/** Step, Play / Pause, Workers and (pipeline mode) Micro-batches, over a state the chapter keeps. One read-out says
 * each action's result and the milestones; while playing it speaks only at milestones. */
export function PassControls({
  state,
  onChange,
  workers = true,
}: {
  state: PassState;
  onChange: (s: PassState) => void;
  /** offer the Workers radio group */
  workers?: boolean;
}) {
  const reduced = useReduced();
  const [playing, setPlaying] = useState(false);
  const [said, setSaid] = useState('');
  const last = lastOf(state),
    end = state.k >= last;
  const live = useRef({ state, onChange });
  live.current = { state, onChange };
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const { state: s, onChange: go } = live.current;
      if (s.k >= lastOf(s)) return setPlaying(false);
      const next = { ...s, k: s.k + 1 },
        done = milestone(next);
      if (done) setSaid(done);
      if (next.k >= lastOf(next)) setPlaying(false);
      go(next);
    }, 800);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);
  const step = () => {
    setPlaying(false);
    const next = { ...state, k: Math.min(last, state.k + 1) };
    setSaid(stepNote(next));
    onChange(next);
  };
  const restart = (s: PassState) => {
    setPlaying(false);
    const next = { ...s, k: 0 };
    setSaid(startNote(next));
    onChange(next);
  };
  const toggle = () => {
    setSaid(
      playing
        ? `Paused at ${state.mode === 'ring' ? `hop ${state.k}` : `slot ${state.k + 1}`}.`
        : `Playing from ${state.mode === 'ring' ? `hop ${state.k}` : `slot ${state.k + 1}`}.`,
    );
    setPlaying(p => !p);
  };
  const name = `ptn${useId().replace(/[^\w-]/g, '')}`;
  return (
    <div className="pt-pass">
      <div className="pt-buttons">
        <button type="button" className="chip" onClick={step} disabled={end}>
          Step
        </button>
        {!reduced && (
          <button type="button" className="chip" aria-pressed={playing} onClick={toggle} disabled={end && !playing}>
            {playing ? 'Pause' : 'Play'}
          </button>
        )}
        {end && (
          <button type="button" className="chip" onClick={() => restart(state)}>
            Start over
          </button>
        )}
      </div>
      {workers && (
        <fieldset className="pt-field">
          <legend>Workers</legend>
          {WORKERS.map(w => (
            <label key={w}>
              <input type="radio" name={name} checked={state.n === w} onChange={() => restart({ ...state, n: w })} />
              {w}
            </label>
          ))}
        </fieldset>
      )}
      {state.mode === 'pipeline' && (
        <ListRange
          className="pt-range"
          label="Micro-batches"
          list={MICROS}
          value={state.m as (typeof MICROS)[number]}
          words={m => `${m}`}
          onChange={m => restart({ ...state, m })}
        />
      )}
      <p className="pt-said" role="status" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

/** The stage and pass the buckets wired to a state of their own (the dev page; a chapter that gates nothing on it). */
export function PassTable({ start = START, caption }: { start?: PassState; caption: ReactNode }) {
  const [s, setS] = useState(start);
  return (
    <RingStage scene={sceneOf(s)} timeline={timelineOf(s)} caption={caption}>
      <PassControls state={s} onChange={setS} />
    </RingStage>
  );
}

// ---- facts ----

/** A cited fact from data/parallel-training/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the simulated cluster's numbers or the stand-in gradients show (R6, KTD13). */
export const SimNote = () => (
  <p className="note pt-note">
    A simulated cluster: hand-set stand-in gradients and planning numbers from published chip figures, not a measurement
    of any real run.
  </p>
);

/** The optional maths, folded away: no formula ever sits in the narration. */
export const Maths = ({ children }: { children: ReactNode }) => (
  <details className="pt-maths">
    <summary>The maths</summary>
    {children}
  </details>
);

/** A chapter's own pick: one radio group over a short list, worded by `words`. */
export function Radios<T extends string | number>({
  legend,
  options,
  value,
  words = String,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  value: T | null;
  words?: (o: T) => string;
  onChange: (o: T) => void;
}) {
  const name = `ptr${useId().replace(/[^\w-]/g, '')}`;
  return (
    <fieldset className="pt-field">
      <legend>{legend}</legend>
      {options.map(o => (
        <label key={String(o)}>
          <input type="radio" name={name} checked={value === o} onChange={() => onChange(o)} />
          {words(o)}
        </label>
      ))}
    </fieldset>
  );
}
