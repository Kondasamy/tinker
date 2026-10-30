// Pieces the video-models chapters share: Larkspur's toy world models (fetched once per page, a status line while they
// load, Retry after a failure), the stage (the warehouse dream, or the Frames tab: the real and dreamed frames as flat
// grids, side by side or stacked on phones, with a per-cell confidence shade), the drive pad (KTD13: arrow keys while it
// has focus, four buttons, Re-sync, one polite read-out), a step range, cited facts and the toy note. Every string is
// React text here; the drawing escapes its pills (esc).
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { ListRange } from '../../components/story/ListRange';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import { boardOf, dreamLabel, dreamScene, shownOf, type Show } from '../../components/scenes/dreamFloorScene';
import { type Net, type NetMeta, parseNet } from '../../lib/video-models/net';
import type { ModelId } from '../../lib/video-models/rollout';
import { type Drive, driven, type Driven, MAX_MOVES, move, readout, resync } from '../../lib/video-models/drive';
import { type Action, CRATE, parseFrame, ROBOT, rollout, SHELF, SIZE } from '../../lib/video-models/world';
import { fact } from '../../lib/video-models/facts';
import metaJson from '../../../public/data/video-models/meta.json';
import pinned from '../../../data/video-models/pinned.json' with { type: 'json' };
import { useNarrow } from '../tool-calling/kit';
import './video-models.css';

export const META = metaJson as unknown as { models: Record<ModelId, NetMeta> };
/** The pinned route every chapter but the drive and the workbench plays: its real frames, and k2's open-loop dream. */
export const PIN = pinned;
export const ROUTE = rollout(PIN.seed, PIN.steps);
export const DREAMED = PIN.dream.map(parseFrame);

// ---- the models: fetched once per page ----

type Status = 'loading' | 'ready' | 'error';
let loaded: Record<ModelId, Net> | null = null,
  pending: Promise<Record<ModelId, Net>> | null = null;
async function fetchNet(id: ModelId) {
  const r = await fetch(`/data/video-models/${id}.bin`);
  if (!r.ok) throw new Error(`${id}.bin: HTTP ${r.status}`);
  return parseNet(META.models[id], await r.arrayBuffer());
}
function loadNets() {
  if (loaded) return Promise.resolve(loaded);
  pending ??= Promise.all([fetchNet('k1'), fetchNet('k2')])
    .then(([k1, k2]) => (loaded = { k1, k2 }))
    .catch(e => {
      pending = null;
      throw e;
    });
  return pending;
}
/** Tests only: drop the fetched models, so the next use fetches again. */
export function forgetNets() {
  loaded = null;
  pending = null;
}
/** Both world models, once fetched; a retry after a failed load. */
export function useNets() {
  const [nets, setNets] = useState(loaded);
  const [status, setStatus] = useState<Status>(loaded ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadNets().then(
      n => {
        if (!live) return;
        setNets(n);
        setStatus('ready');
      },
      () => live && setStatus('error'),
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  const retry = () => {
    setStatus('loading');
    setAttempt(a => a + 1);
  };
  return { nets, status, retry };
}
/** While the weights load, a status line; after a failure, the line and Retry. */
export function ModelStatus({ status, retry }: { status: Status; retry: () => void }) {
  if (status === 'ready') return null;
  const failed = status === 'error';
  return (
    <p className="vm-status" role="status" data-state={failed ? 'failed' : 'loading'}>
      {failed ? 'Couldn’t load Larkspur’s toy world model.' : 'Loading Larkspur’s toy world model…'}
      {failed && (
        <button type="button" className="chip" onClick={retry}>
          Retry
        </button>
      )}
    </p>
  );
}

// ---- the Frames tab ----

const KIND_CLASS: Record<number, string> = { [SHELF]: 'shelf', [ROBOT]: 'robot', [CRATE]: 'crate' };
/** One frame as a flat grid: a rect per non-floor cell, wrong cells ringed, the single robot drawn on its own so it can
 * slide (CSS; none with reduced motion), and optionally each cell shaded by the model's confidence. */
function Grid({ f, vs, conf, title }: { f: Uint8Array; vs?: Uint8Array; conf?: Float64Array | null; title: string }) {
  const cells: ReactNode[] = [];
  const robots = [...f].flatMap((k, c) => (k === ROBOT ? [c] : []));
  for (let c = 0; c < f.length; c++) {
    const x = c % SIZE,
      y = Math.floor(c / SIZE);
    if (f[c] !== 0 && !(f[c] === ROBOT && robots.length === 1))
      cells.push(<rect key={`k${c}`} className={`vm-cell ${KIND_CLASS[f[c]]}`} x={x} y={y} width={1} height={1} />);
    if (conf && conf[c] < 0.9)
      cells.push(
        <rect key={`q${c}`} className="vm-unsure" x={x} y={y} width={1} height={1} opacity={(1 - conf[c]) * 0.9} />,
      );
    if (vs && vs[c] !== f[c])
      cells.push(<rect key={`w${c}`} className="vm-wrong" x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} />);
  }
  const r = robots.length === 1 ? robots[0] : -1;
  return (
    <figure className="vm-grid">
      <figcaption>{title}</figcaption>
      <svg viewBox={`-0.2 -0.2 ${SIZE + 0.4} ${SIZE + 0.4}`} role="img" aria-label={title} data-frame={f.join('')}>
        <rect className="vm-floor" x={0} y={0} width={SIZE} height={SIZE} />
        <rect className="vm-belt" x={0} y={8} width={SIZE} height={1} />
        <path
          className="vm-lines"
          d={Array.from({ length: SIZE + 1 }, (_, i) => `M${i} 0V${SIZE}M0 ${i}H${SIZE}`).join('')}
        />
        {r >= 0 && (
          <rect
            className="vm-cell robot vm-slide"
            width={1}
            height={1}
            style={{ transform: `translate(${r % SIZE}px, ${Math.floor(r / SIZE)}px)` }}
          />
        )}
        {cells}
      </svg>
    </figure>
  );
}
/** The Frames tab: the real frame and the dream as grids, and a shade by confidence when the dream was guessed. */
function Frames({ real, dream, conf }: { real: Uint8Array; dream?: Uint8Array | null; conf?: Float64Array | null }) {
  const [shade, setShade] = useState(false);
  const unsure = conf ? [...conf].filter(p => p < 0.9).length : 0;
  return (
    <div className="vm-frames">
      <div className="vm-pair">
        <Grid f={real} title="Real" />
        {dream && <Grid f={dream} vs={real} conf={shade ? conf : null} title="Dream" />}
      </div>
      {conf && dream && (
        <label className="vm-shade">
          <input type="checkbox" checked={shade} onChange={e => setShade(e.currentTarget.checked)} />
          {`Shade cells it was unsure of (${unsure} under 90%)`}
        </label>
      )}
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'frames';
const FILL = { height: '100%' };
/** The chapters' stage: the warehouse dream (default) or the Frames tab, one at a time; on phones, one floor at a time
 * too, by a Real / Dream switch. `children` go under the frame (the drive pad). */
export function DreamStage({
  real,
  dream,
  step,
  synced,
  conf,
  caption,
  say,
  view: kept,
  onView,
  children,
}: {
  real: Uint8Array;
  dream?: Uint8Array | null;
  step?: number;
  synced?: boolean;
  /** the dream's per-cell confidence, when it was guessed */
  conf?: Float64Array | null;
  caption: ReactNode;
  say?: Say;
  view?: View;
  onView?: (v: View) => void;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const [side, setSide] = useState<Show>('dream');
  const narrow = useNarrow();
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const o = { real, dream, step, synced, say, scale: narrow ? 2 : 1.2, show: narrow ? side : ('both' as Show) };
  return (
    <div className="tc-stage vm-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'frames'} onClick={() => setView('frames')}>
          Frames
        </button>
        {narrow && dream && view === 'scene' && (
          <span className="vm-side" role="group" aria-label="Floor">
            {(['real', 'dream'] as const).map(s => (
              <button key={s} type="button" className="chip" aria-pressed={side === s} onClick={() => setSide(s)}>
                {s === 'real' ? 'Real' : 'Dream'}
              </button>
            ))}
          </span>
        )}
      </div>
      <div className="tc-frame">
        {view === 'frames' ? (
          <Frames real={real} dream={dream} conf={conf} />
        ) : (
          <IsoStage
            className="dream-floor"
            board={boardOf(o)}
            style={FILL}
            scene={dreamScene(o)}
            label={dreamLabel(o)}
            data-show={shownOf(o)}
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

// ---- the drive pad ----

const KEYS: Record<string, Action> = { ArrowUp: 1, ArrowDown: 2, ArrowLeft: 3, ArrowRight: 4 };
const PAD: [Action, string, string][] = [
  [1, 'Up', '↑'],
  [3, 'Left', '←'],
  [2, 'Down', '↓'],
  [4, 'Right', '→'],
];
/** The drive: the pad has focus for the arrow keys (Tab moves on as usual), four buttons for touch and pointer, and
 * Re-sync. The one read-out says what each action did and any milestone; it never speaks per frame of motion. */
export function DrivePad({
  net,
  seed,
  drive,
  before,
  onDrive,
}: {
  net: Net;
  seed: number;
  drive: Drive;
  /** the drive as it stands, already run by the parent */
  before: Driven;
  onDrive: (d: Drive, now: Driven) => void;
}) {
  const [said, setSaid] = useState('');
  const hint = `vmh${useId().replace(/[^\w-]/g, '')}`;
  const full = drive.moves.length >= MAX_MOVES;
  const act = (a: Action | 'sync') => {
    const next = a === 'sync' ? resync(drive) : move(drive, a);
    if (next === drive) return;
    const after = driven(net, seed, next);
    setSaid(readout(before, after, a));
    onDrive(next, after);
  };
  const key = (e: KeyboardEvent) => {
    const a = KEYS[e.key];
    if (a === undefined || e.target !== e.currentTarget) return;
    e.preventDefault();
    act(a);
  };
  return (
    <div className="vm-drive">
      <div
        className="vm-pad"
        tabIndex={0}
        role="group"
        aria-label="Drive the robot"
        aria-describedby={hint}
        onKeyDown={key}
      >
        {PAD.map(([a, name, arrow]) => (
          <button
            key={a}
            type="button"
            className={`chip vm-${name.toLowerCase()}`}
            aria-label={name}
            disabled={full}
            onClick={() => act(a)}
          >
            {arrow}
          </button>
        ))}
      </div>
      <button type="button" className="chip vm-sync" onClick={() => act('sync')} disabled={drive.moves.length === 0}>
        Re-sync
      </button>
      <p id={hint} className="vm-hint">
        Arrow keys drive while the pad has focus.
      </p>
      <p className="vm-said" role="status" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

// ---- controls ----

/** A native range over frame steps first..last, its step named beside it. */
export const StepRange = ({
  value,
  last,
  first = 0,
  onChange,
  label = 'Step',
}: {
  value: number;
  last: number;
  first?: number;
  onChange: (n: number) => void;
  label?: string;
}) => (
  <ListRange
    className="vm-range"
    label={label}
    list={Array.from({ length: last - first + 1 }, (_, i) => first + i)}
    value={value}
    words={n => `${label.toLowerCase()} ${n} of ${last}`}
    onChange={onChange}
  />
);

/** A cited fact from data/video-models/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the toy's frames or numbers show (R6). */
export const ToyNote = () => (
  <p className="note vm-note">
    Larkspur’s toy world model: two small neural networks trained once, ahead of time, on a simulated warehouse, cut
    short on purpose so drift shows, and run live in your browser. Its numbers show how it works, not any large video
    model’s.
  </p>
);

export const n = (x: number) => x.toLocaleString('en-US');
export const pct = (x: number) => `${Math.round(x * 100)}%`;
