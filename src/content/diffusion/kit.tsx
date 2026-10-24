// Pieces the diffusion chapters share: the stage (the darkroom, or the Strip tab: the sample at each chosen step, or
// several samples side by side), the ranges over the finite lists, the learned denoiser's loader and a sampler that
// spreads its work over animation frames, and a cited fact. Every string is React text here; the drawings escape theirs
// (esc, flatPill), and the strip's art goes in as an image (a data URL), so no markup is injected.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import { DARK_BOARD, darkroomLabel, darkroomScene, type DarkroomOpts } from '../../components/scenes/darkroomScene';
import { denoiseStrip, frameSteps, type StripFrame } from '../../components/scenes/denoiseStrip';
import { LABELS, nearest, type Label } from '../../lib/diffusion/drawings';
import { GUIDANCE, type Guidance } from '../../lib/diffusion/ideal';
import { NOISE, STEPS, type Steps } from '../../lib/diffusion/schedule';
import {
  distanceToOutline,
  nextStep,
  ON,
  parsePoints,
  roughness,
  pointsOf,
  startPoints,
  stepPointRange,
  type PointsMeta,
  type PointsModel,
} from '../../lib/diffusion/points';
import { fact } from '../../lib/diffusion/facts';
import metaJson from '../../../public/data/diffusion/meta.json';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './diffusion.css';

export const META = metaJson as unknown as PointsMeta;
export const NAME: Record<Label, string> = { hinge: 'hinge', drill: 'drill', bracket: 'bracket' };
export const two = (n: number) => n.toFixed(2);
/** On the outline: within the spike's pinned distance (diffusion-spike.test.ts). */
export const NEAR = 0.05;

/** A picture in words: the part it is nearest and how rough it is (0 a clean copy of a training drawing). */
export function printWords(px: ArrayLike<number>) {
  const n = nearest(px);
  return `nearest ${n.drawing.label} (${n.drawing.id}), roughness ${two(n.rms)}`;
}
/** A picture's short pill: the part it is nearest once clean, NOISE while it is not. */
export const printName = (px: ArrayLike<number>) => {
  const n = nearest(px);
  return n.rms < 0.3 ? n.drawing.label.toUpperCase() : 'NOISE';
};

/** A sample's frames for the strip: the pictures at the strip's steps, each in words. */
export const pictureFrames = (t: Float64Array[]): StripFrame[] =>
  frameSteps(t.length - 1).map(i => ({
    print: { kind: 'pixels', px: t[i], name: '' },
    pill: i === 0 ? 'NOISE' : `STEP ${i}`,
    words: i === 0 ? `Pure noise: ${printWords(t[i])}` : `Step ${i} of ${t.length - 1}: ${printWords(t[i])}`,
  }));
/** Dots in words: how many sit on the outline, and (given training points) how many on a training point. */
export function dotWords(pts: [number, number][], train?: [number, number][]) {
  const on = pts.filter(([x, y]) => distanceToOutline(META.outline, x, y) < NEAR).length;
  const copies = train ? pts.filter(p => onTrain(p, train)).length : 0;
  return `${on} of ${pts.length} dots on the outline${train ? `, ${copies} on a training point` : ''}, roughness ${two(roughness(META.outline, pts))}`;
}
/** Within a dot's width of a training point. */
export const onTrain = ([x, y]: [number, number], train: [number, number][]) =>
  train.some(([a, b]) => Math.hypot(x - a, y - b) < ON);
/** A dot run's frames for the strip, from its snapshots. */
export const dotFrames = (
  snaps: Map<number, [number, number][]>,
  steps: number,
  train?: [number, number][],
): StripFrame[] =>
  frameSteps(steps)
    .filter(i => snaps.has(i))
    .map(i => ({
      print: { kind: 'points', pts: snaps.get(i)!, train, name: '' },
      pill: i === 0 ? 'NOISE' : `STEP ${i}`,
      words: `${i === 0 ? 'Pure noise' : `Step ${i} of ${steps}`}: ${dotWords(snaps.get(i)!, train)}`,
    }));

// ---- motion ----

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Frame-by-frame playback of `count` precomputed frames once `play` is set: returns the frame to show. With reduced
 * motion, or once played, the last frame shows at once. */
export function usePlayback(count: number, play: boolean, ms = 60) {
  const [at, setAt] = useState(play ? count - 1 : 0);
  const played = useRef(false);
  useEffect(() => {
    if (!play) {
      played.current = false;
      setAt(0);
      return;
    }
    if (played.current || reduced()) {
      setAt(count - 1);
      return;
    }
    played.current = true;
    let i = 0,
      last = 0,
      raf = 0;
    const tick = (now: number) => {
      if (now - last >= ms) {
        last = now;
        setAt(i);
        i++;
      }
      if (i < count) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, play, ms]);
  return Math.min(at, count - 1);
}

/** Work spread over animation frames: `jobs` are run one per frame, so no frame does more than one. Results are kept by
 * key across remounts. Returns the results so far (undefined where not yet done). */
const kept = new Map<string, unknown>();
export function useJobs<T>(jobs: { key: string; run: () => T }[]): (T | undefined)[] {
  const sig = jobs.map(j => j.key).join('|');
  const [, bump] = useState(0);
  const list = useRef(jobs);
  list.current = jobs;
  useEffect(() => {
    let raf = 0;
    const next = () => {
      const j = list.current.find(x => !kept.has(x.key));
      if (!j) return;
      kept.set(j.key, j.run());
      bump(n => n + 1);
      raf = requestAnimationFrame(next);
    };
    raf = requestAnimationFrame(next);
    return () => cancelAnimationFrame(raf);
  }, [sig]);
  return jobs.map(j => kept.get(j.key) as T | undefined);
}

// ---- the learned 2-D denoiser ----

type Status = 'loading' | 'ready' | 'error';
let loaded: PointsModel | null = null,
  pending: Promise<PointsModel> | null = null;
function loadPoints(): Promise<PointsModel> {
  if (loaded) return Promise.resolve(loaded);
  pending ??= fetch('/data/diffusion/points.bin')
    .then(r => {
      if (!r.ok) throw new Error(`points.bin: HTTP ${r.status}`);
      return r.arrayBuffer();
    })
    .then(buf => (loaded = parsePoints(META, buf)))
    .catch(e => {
      pending = null;
      throw e;
    });
  return pending;
}
/** The learned denoiser's weights: fetched once per page, with a retry after a failed load. */
export function usePointsModel() {
  const [model, setModel] = useState<PointsModel | null>(loaded);
  const [status, setStatus] = useState<Status>(loaded ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setStatus(loaded ? 'ready' : 'loading');
    loadPoints().then(
      m => {
        if (!live) return;
        setModel(m);
        setStatus('ready');
      },
      () => live && setStatus('error'),
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  return { model, status, retry: () => setAttempt(a => a + 1) };
}

export interface PointsJob {
  n: number;
  steps: number;
  seed: number;
}
const BUDGET_MS = 8; // per frame, so the page keeps answering while the dots develop
type Dots = [number, number][];
/** finished jobs: the dots at each strip step (frameSteps), the last being the result */
const runs = new Map<string, Map<number, Dots>>();
const jobKey = (j: PointsJob) => `${j.n}:${j.steps}:${j.seed}`;
/**
 * Sample the learned denoiser's dots a slice at a time: each animation frame moves as many dots one step as fit in
 * BUDGET_MS, so a phone never stalls. Shows each finished step as it lands (with reduced motion, only the end). A job
 * already sampled on this page comes back at once. `onDone` fires when the last step lands.
 */
export function useLearnedPoints(job: PointsJob | null, onDone?: (pts: [number, number][]) => void) {
  const { model, status, retry } = usePointsModel();
  const key = job ? jobKey(job) : '';
  const last = (m?: Map<number, Dots>) => (m && job ? (m.get(job.steps) ?? null) : null);
  const [pts, setPts] = useState<Dots | null>(() => last(runs.get(key)));
  const [snaps, setSnaps] = useState<Map<number, Dots> | null>(() => runs.get(key) ?? null);
  const [done, setDone] = useState(() => (runs.has(key) ? (job?.steps ?? 0) : 0));
  const finish = useRef(onDone);
  finish.current = onDone;
  useEffect(() => {
    if (!job || !model) {
      setPts(last(runs.get(key)));
      setSnaps(runs.get(key) ?? null);
      return;
    }
    const hit = runs.get(key);
    if (hit) {
      setPts(last(hit));
      setSnaps(hit);
      setDone(job.steps);
      finish.current?.(hit.get(job.steps)!);
      return;
    }
    const run = startPoints(job.n, job.steps, job.seed),
      calm = reduced(),
      keep = new Set(frameSteps(job.steps)),
      shots = new Map<number, Dots>([[0, pointsOf(run)]]);
    let at = 0,
      raf = 0;
    setDone(0);
    setPts(calm ? null : pointsOf(run));
    const tick = () => {
      const end = performance.now() + BUDGET_MS;
      while (performance.now() < end && run.done < run.steps) {
        const to = Math.min(job.n, at + 10);
        stepPointRange(model, run, at, to);
        at = to;
        if (at === job.n) {
          nextStep(run);
          at = 0;
          if (keep.has(run.done)) shots.set(run.done, pointsOf(run));
          if (!calm) {
            setPts(pointsOf(run));
            setDone(run.done);
            break; // one finished step per frame, so the motion shows
          }
        }
      }
      if (run.done < run.steps) raf = requestAnimationFrame(tick);
      else {
        runs.set(key, shots);
        setPts(shots.get(run.steps)!);
        setSnaps(shots);
        setDone(run.steps);
        finish.current?.(shots.get(run.steps)!);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, model]);
  return { pts, snaps, done, status, retry };
}

/** What stands in the frame until the learned denoiser's weights are in. */
export function Waiting({ failed, retry }: { failed: boolean; retry: () => void }) {
  return (
    <div className="df-wait" role="status" data-state={failed ? 'failed' : 'loading'}>
      {failed ? (
        <div className="df-error">
          <p>Couldn’t load the toy denoiser.</p>
          <button type="button" className="chip" onClick={retry}>
            Retry
          </button>
        </div>
      ) : (
        <span className="df-pill">Loading the toy denoiser</span>
      )}
    </div>
  );
}

// ---- the stage ----

/** The strip: the drawing as an image, with a focusable marker per frame over it (arrow keys, Home, End) and a read-out
 * line naming the frame under it. */
export function Strip({ frames, label }: { frames: StripFrame[]; label: string }) {
  const phone = useNarrow(),
    id = 'strip' + useId().replace(/[^\w-]/g, '');
  const c = denoiseStrip(frames, phone),
    [cur, setCur] = useState(frames.length - 1);
  const at = Math.max(0, Math.min(cur, c.frames.length - 1)),
    m = c.frames[at];
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.w} ${c.h}"><defs>${filterFor(1, 'hand')}</defs><g filter="url(#hand)">${c.svg}</g></svg>`;
  const go = (i: number) => {
    const n = Math.max(0, Math.min(c.frames.length - 1, i));
    setCur(n);
    (document.getElementById(`${id}-${n}`) as SVGElement | null)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = {
      ArrowRight: at + 1,
      ArrowDown: at + 1,
      ArrowLeft: at - 1,
      ArrowUp: at - 1,
      Home: 0,
      End: c.frames.length - 1,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      go(to);
    }
  };
  return (
    <figure className="df-strip">
      <svg viewBox={`0 0 ${c.w} ${c.h}`} role="group" aria-label={label} onKeyDown={key}>
        <image href={`data:image/svg+xml,${encodeURIComponent(doc)}`} width={c.w} height={c.h} aria-hidden="true" />
        {c.frames.map((f, i) => (
          <g
            key={`${i}-${f.words}`}
            id={`${id}-${i}`}
            className="df-mark"
            role="button"
            tabIndex={i === at ? 0 : -1}
            aria-pressed={i === at}
            aria-label={f.words}
            onClick={() => go(i)}
            onFocus={() => setCur(i)}
            data-frame={i}
          >
            <rect x={f.x - 4} y={f.y - 4} width={f.size + 8} height={f.size + 30} rx={6} className="df-ring" />
          </g>
        ))}
      </svg>
      <p className="df-readout" aria-live="polite">
        {m?.words}
      </p>
    </figure>
  );
}

/** What a chapter puts on the stage: the darkroom's settings, the strip's frames, the caption. */
export interface Shown extends Omit<DarkroomOpts, 'scale' | 'say'> {
  caption: string;
  frames?: StripFrame[];
  /** the strip's label */
  stripLabel?: string;
  stamp?: Stamp;
  /** stands in the frame instead of the picture (the loading pill) */
  wait?: ReactNode;
}
export type View = 'scene' | 'strip';

const FILL = { height: '100%' };
/** The chapters' stage: the darkroom (default) or the Strip tab, one at a time. The tab is the reader's view, kept out
 * of saved progress unless the chapter passes `view` and `onView`. */
export function DiffusionStage({
  shown: s,
  view: keep,
  onView,
  say,
}: {
  shown: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn over a part of the picture (DARKROOM_PARTS); the strip ignores it */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = keep ?? own,
    setView = onView ?? setOwn;
  const o: DarkroomOpts = { ...s, scale: useNarrow() ? 2 : 1.2, say };
  return (
    <div className="tc-stage df-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'strip'}
          disabled={!s.frames?.length}
          onClick={() => setView('strip')}
        >
          Strip
        </button>
      </div>
      <div className="tc-frame">
        {s.wait ??
          (view === 'strip' && s.frames?.length ? (
            <div className="df-scroll">
              <Strip frames={s.frames} label={s.stripLabel ?? 'The sample, step by step'} />
            </div>
          ) : (
            <IsoStage
              className="darkroom"
              board={DARK_BOARD}
              style={FILL}
              scene={darkroomScene(o)}
              label={darkroomLabel(o)}
            />
          ))}
      </div>
      <p className="tc-caption">
        {s.stamp && <span className={`stamp ${STAMP_CLASS[s.stamp]}`}>{s.stamp}</span>}
        <span className="txt">{s.caption}</span>
      </p>
    </div>
  );
}

// ---- controls ----

/** A native range over a finite list, its value named beside it. */
function ListRange<T>({
  label,
  list,
  value,
  words,
  onChange,
}: {
  label: string;
  list: readonly T[];
  value: T;
  words: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const id = 'rng' + useId().replace(/[^\w-]/g, ''),
    i = Math.max(0, list.indexOf(value));
  return (
    <div className="df-range">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={list.length - 1}
        step={1}
        value={i}
        aria-valuetext={words(value)}
        onChange={e => onChange(list[Number(e.currentTarget.value)])}
      />
      <output htmlFor={id} aria-live="polite">
        {words(value)}
      </output>
    </div>
  );
}
export const stepWords = (n: number) => `${n} step${n === 1 ? '' : 's'}`;
export const StepsRange = ({
  value,
  onChange,
  steps = STEPS,
}: {
  value: Steps;
  onChange: (s: Steps) => void;
  steps?: readonly Steps[];
}) => <ListRange label="Steps" list={steps} value={value} words={stepWords} onChange={onChange} />;
export const GuidanceRange = ({ value, onChange }: { value: Guidance; onChange: (g: Guidance) => void }) => (
  <ListRange label="Guidance" list={GUIDANCE} value={value} words={g => `scale ${g}`} onChange={onChange} />
);
export const noiseWords = (t: number) =>
  t === 0 ? 'none: the drawing' : t === 1 ? 'all the way: pure noise' : `${Math.round(t * 100)}% of the way`;
export const NoiseRange = ({ value, onChange }: { value: number; onChange: (t: number) => void }) => (
  <ListRange
    label="Noise"
    list={NOISE}
    value={value as (typeof NOISE)[number]}
    words={noiseWords}
    onChange={onChange}
  />
);
/** The label card: one button per part (pressed when chosen). */
export function LabelPick({ value, onChange }: { value: Label; onChange: (l: Label) => void }) {
  return (
    <div className="df-labels" role="group" aria-label="Label">
      {LABELS.map(l => (
        <button key={l} type="button" className="chip" aria-pressed={value === l} onClick={() => onChange(l)}>
          {NAME[l]}
        </button>
      ))}
    </div>
  );
}

/** A cited fact from data/diffusion/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the toy denoisers' numbers show (R6). */
export const ToyNote = () => (
  <p className="df-note">
    These are toy denoisers on 32 × 32 drawings and 2-D dots, run live in your browser: they show the mechanism, not any
    real model’s numbers.
  </p>
);
