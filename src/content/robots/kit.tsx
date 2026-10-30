// Pieces the robots chapters share: the stage (the parts bay, or the Camera tab: the grid the camera gives and the
// action log, read off the same run), drive the claw (KTD8: arrow buttons, arrow keys while the control group has
// focus, Grip or Drop; Hand over, disabled with its reason until one demo is finished, replays the policy on a fresh
// bin and stops at the step cap with a stuck or off-grid read-out and Try again, demos kept; Take the wheel records
// corrections), one polite read-out per action and outcome, never per frame, and cited facts. With reduced motion a
// replay shows its last frame at once. Every string is React text here; the drawing escapes its pills (esc).
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import type { ModelState } from '../../lib/iso/figures';
import { CLAW_BOARD, clawLabel, clawScene, type ClawOpts } from '../../components/scenes/clawScene';
import {
  type Action,
  BINS,
  type End,
  H,
  isCrate,
  type Layout,
  MOVES,
  type Move,
  type Obs,
  observe,
  play,
  type Run,
  startOf,
  type State,
  step,
  TRAIN,
  W,
} from '../../lib/robots/world';
import { type Pair, pairsOf, replay } from '../../lib/robots/policy';
import { endText } from '../../lib/robots/story';
import { fact } from '../../lib/robots/facts';
import { useNarrow } from '../tool-calling/kit';
import { useReduced } from '../releases/kit';
import './robots.css';

export { useReduced };

// ---- the camera in words ----

const DIR_WORDS: Record<Move, string> = { up: 'up', down: 'down', left: 'left', right: 'right' };
/** What the camera gives, as one line. */
export function obsText(o: Obs) {
  const what = o.holding ? 'Tray' : 'Part';
  const where =
    !o.seen && !o.holding
      ? 'Part not seen'
      : !o.dx && !o.dy
        ? `${what} under the claw`
        : `${what} ${[o.dx ? (o.dx > 0 ? 'right' : 'left') : '', o.dy ? (o.dy > 0 ? 'down' : 'up') : ''].filter(Boolean).join(' and ')}`;
  const blocked = MOVES.filter((_, i) => o.blocked[i]).map(m => DIR_WORDS[m]);
  return `${where}; blocked: ${blocked.length ? blocked.join(', ') : 'none'}.`;
}
/** The machine's screen for an outcome. */
export const screenOf = (end?: End | null): ModelState | undefined =>
  end === 'done' ? 'ok' : end === 'stuck' ? 'warn' : end === 'off-grid' ? 'bad' : undefined;
/** The claw's pill for an outcome. */
export const pillOf = (end?: End | null) =>
  end === 'done' ? 'DONE' : end === 'stuck' ? 'STUCK' : end === 'off-grid' ? 'OFF GRID' : undefined;

// ---- the Camera tab ----

function CameraView({
  layout,
  state,
  log,
  detector,
}: {
  layout: Layout;
  state: State;
  log: Action[];
  detector?: readonly number[];
}) {
  const o = observe(layout, state, detector);
  const cell = (x: number, y: number) => {
    const c = state.claw[0] === x && state.claw[1] === y,
      p = (o.seen || state.holding) && state.part[0] === x && state.part[1] === y && !(state.end === 'done');
    if (x === W) return y === layout.tray ? ['tray', c ? 'Claw over the tray' : 'Tray'] : ['off', ''];
    if (isCrate(layout, [x, y])) return ['crate', 'Crate'];
    if (c && p) return ['claw part', state.holding ? 'Claw holding the part' : 'Claw over the part'];
    if (c) return ['claw', 'Claw'];
    if (p) return ['part', 'Part'];
    return ['', 'Empty'];
  };
  return (
    // it scrolls in the frame, so it takes focus for keyboard scrolling (axe: scrollable-region-focusable)
    <div className="rb-camera" role="group" aria-label="What the camera gives" tabIndex={0}>
      <table className="rb-grid">
        <caption>{`The camera grid: ${W} by ${H} cells and the tray. ${obsText(o)}`}</caption>
        <tbody>
          {Array.from({ length: H }, (_, y) => (
            <tr key={y}>
              {Array.from({ length: W + 1 }, (_, x) => {
                const [k, name] = cell(x, y);
                return <td key={x} className={k} aria-label={name || undefined} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <section aria-label="Action log">
        <p className="rb-by">{log.length ? `${log.length} actions, latest last:` : 'No actions yet.'}</p>
        <ol className="rb-log" start={Math.max(1, log.length - 11)}>
          {log.slice(-12).map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'camera';
const FILL = { height: '100%' };

/** The chapters' stage: the parts bay (default) or the Camera tab, one at a time, read off the same state. */
export function BayStage({
  opts,
  log = [],
  detector,
  caption,
  say,
  view: kept,
  onView,
  children,
}: {
  opts: ClawOpts;
  log?: Action[];
  detector?: readonly number[];
  caption: ReactNode;
  say?: Say;
  view?: View;
  onView?: (v: View) => void;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const narrow = useNarrow();
  const o = { ...opts, say, scale: narrow ? 2 : 1.2 };
  return (
    <div className="tc-stage rb-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'camera'} onClick={() => setView('camera')}>
          Camera
        </button>
      </div>
      <div className="tc-frame">
        {view === 'camera' ? (
          <CameraView layout={opts.layout} state={opts.state} log={log} detector={detector} />
        ) : (
          <IsoStage className="rb-bay" board={CLAW_BOARD} style={FILL} scene={clawScene(o)} label={clawLabel(o)} />
        )}
      </div>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
    </div>
  );
}

// ---- playback ----

/** Plays frames 0..n−1 of a run once `key` changes, a frame every 180 ms; with reduced motion, the last frame at once.
 * Calls onEnd when the last frame shows. */
export function usePlayback(n: number, key: unknown, onEnd: () => void) {
  const reduced = useReduced();
  const [k, setK] = useState(n - 1);
  const end = useRef(onEnd);
  end.current = onEnd;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced || n <= 1) {
      setK(n - 1);
      end.current();
      return;
    }
    setK(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setK(i);
      if (i >= n - 1) {
        clearInterval(id);
        end.current();
      }
    }, 180);
    return () => clearInterval(id);
  }, [key]);
  return Math.min(k, n - 1);
}

// ---- drive the claw ----

/** What a drive chapter keeps: the run being driven, the finished demos, the corrections, and the last hand-over. */
export interface Bay {
  /** actions of the demo being driven, on driveBin(bay) */
  drive: Action[];
  /** finished demos, the n-th driven on demoBin(n) */
  demos: Action[][];
  /** corrections taken at the wheel */
  fixes: Pair[];
  /** hand-overs finished */
  runs: number;
  last: { end: End; steps: number } | null;
}
export const BAY: Bay = { drive: [], demos: [], fixes: [], runs: 0, last: null };
/** The bin the n-th demo is driven on: the training bins in turn. */
export const demoBin = (n: number) => TRAIN[n % TRAIN.length];
/** The bin the drive is on: the next demo's, or the last demo's while a finished demo stays on show (chapters 1–2). */
export const driveBin = (b: Bay) => {
  const last = b.demos.at(-1);
  return demoBin(last && b.drive.join() === last.join() ? b.demos.length - 1 : b.demos.length);
};
/** The reader's demos as the policy's pairs. */
export const readerPairs = (b: Bay): Pair[] => b.demos.flatMap((d, i) => pairsOf(demoBin(i), d));
const KEYS: Record<string, Move> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const ARROW: Record<Move, string> = { up: '↑', down: '↓', left: '←', right: '→' };

/** The arrow buttons and Grip or Drop, in one group: arrow keys move while focus is inside it (and only then is page
 * scroll prevented), G grips or drops. */
function Pad({ holding, onAct, disabled }: { holding: boolean; onAct: (a: Action) => void; disabled?: boolean }) {
  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    const m = KEYS[e.key];
    if (m) {
      e.preventDefault();
      onAct(m);
    } else if (e.key === 'g' || e.key === 'G') onAct(holding ? 'drop' : 'grip');
  };
  return (
    <div className="rb-pad" role="group" aria-label="Drive the claw" onKeyDown={onKey}>
      {MOVES.map(m => (
        <button
          key={m}
          type="button"
          className={`chip rb-${m}`}
          aria-label={`Move ${m}`}
          disabled={disabled}
          onClick={() => onAct(m)}
        >
          {ARROW[m]}
        </button>
      ))}
      <button
        type="button"
        className="chip rb-grip"
        disabled={disabled}
        onClick={() => onAct(holding ? 'drop' : 'grip')}
      >
        {holding ? 'Drop' : 'Grip'}
      </button>
    </div>
  );
}

type Mode = 'drive' | 'replay' | 'wheel';
/** Drive the claw over a bay the chapter keeps. Without `fresh` it only drives (chapters 1–2). With `fresh`, Hand over
 * replays the policy (`base` pairs, the reader's demos and corrections) on that bin; `forced` slips its moves at those
 * steps; `wheel` offers Take the wheel after a replay that failed. `onBay` gets each change and a kind, so the chapter
 * can tell an attempt from a sync. */
export function DriveBench({
  bay,
  onBay,
  fresh,
  base = [],
  forced,
  wheel = false,
  say,
  view,
  onView,
  caption,
}: {
  bay: Bay;
  onBay: (b: Bay) => void;
  fresh?: Layout;
  base?: Pair[];
  forced?: number[];
  wheel?: boolean;
  say?: Say;
  view?: View;
  onView?: (v: View) => void;
  caption: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>('drive');
  const [said, setSaid] = useState('');
  const [taken, setTaken] = useState<Action[]>([]);
  const [go, setGo] = useState(0);
  const pairs = useMemo(() => [...base, ...readerPairs(bay), ...bay.fixes], [base, bay]);
  const run: Run | null = useMemo(() => (fresh && go ? replay(pairs, fresh, { forced }) : null), [go]);
  const frame = usePlayback(run?.states.length ?? 1, go, () => {
    if (!run) return;
    setSaid(endText(run.end, run.steps));
    onBay({ ...bay, runs: bay.runs + 1, last: { end: run.end, steps: run.steps } });
  });
  const bin = driveBin(bay);
  const driven = useMemo(() => play(bin, bay.drive), [bin, bay.drive]);
  const cur = driven.at(-1)!;
  // the wheel starts where the replay stopped (before it left the grid)
  const stall = run ? (run.states.at(-1)!.end === 'off-grid' ? run.states.at(-2)! : run.states.at(-1)!) : null;
  const atWheel = useMemo(() => {
    if (!fresh || !stall) return null;
    let s: State = { ...stall, end: undefined };
    for (const a of taken) s = step(fresh, s, a);
    return s;
  }, [fresh, stall, taken]);

  const act = (a: Action) => {
    if (mode === 'wheel' && fresh && atWheel) {
      if (atWheel.end) return;
      const next = step(fresh, atWheel, a);
      setTaken([...taken, a]);
      onBay({ ...bay, fixes: [...bay.fixes, { o: observe(fresh, atWheel), a }] });
      setSaid(
        next.end === 'done'
          ? 'Part in the tray. Every move you made is a correction. Hand over again.'
          : next.end === 'off-grid'
            ? 'Off the grid. Hand over to try again.'
            : `Correction: ${a}.`,
      );
      return;
    }
    if (cur.end) return;
    const next = step(bin, cur, a);
    if (next.end === 'done') {
      setSaid(
        `Demo ${bay.demos.length + 1} done: part in the tray in ${next.steps} steps.${fresh ? ' A new bin is ready.' : ''}`,
      );
      onBay({ ...bay, drive: fresh ? [] : [...bay.drive, a], demos: [...bay.demos, [...bay.drive, a]] });
      return;
    }
    if (next.end === 'off-grid') {
      setSaid('Off the grid: this demo starts again.');
      onBay({ ...bay, drive: [] });
      return;
    }
    const bump = next.claw[0] === cur.claw[0] && next.claw[1] === cur.claw[1] && MOVES.includes(a as Move);
    setSaid(
      a === 'grip'
        ? next.holding
          ? 'Gripped the part.'
          : 'Gripped nothing: the part isn’t under the claw.'
        : a === 'drop'
          ? 'Dropped the part outside the tray.'
          : bump
            ? `Bumped: ${a} is blocked.`
            : `Moved ${a}.`,
    );
    onBay({ ...bay, drive: [...bay.drive, a] });
  };
  const handOver = () => {
    setMode('replay');
    setTaken([]);
    setSaid('Hand over: the policy drives a fresh bin.');
    setGo(g => g + 1);
  };
  const tryAgain = () => {
    setMode('drive');
    setSaid(`Back to driving. Your ${bay.demos.length} demo${bay.demos.length === 1 ? ' is' : 's are'} kept.`);
  };
  const takeWheel = () => {
    setMode('wheel');
    setTaken([]);
    setSaid('Your wheel: drive from where it stopped.');
  };
  const playing = mode === 'replay' && run !== null && frame < run.states.length - 1;
  const shown: { layout: Layout; state: State; trail: State[] } =
    mode === 'drive' || !fresh || !run
      ? { layout: bin, state: cur, trail: driven }
      : mode === 'wheel' && atWheel
        ? { layout: fresh, state: atWheel, trail: [...run.states.slice(0, -1), atWheel] }
        : { layout: fresh, state: run.states[frame], trail: run.states.slice(0, frame + 1) };
  const end = mode === 'replay' && !playing && run ? run.end : null;
  const noDemo = !base.length && !bay.demos.length;
  const log = mode === 'drive' || !run ? bay.drive : mode === 'wheel' ? taken : run.actions.slice(0, frame);
  return (
    <BayStage
      opts={{
        layout: shown.layout,
        state: shown.state,
        trail: shown.trail.map(s => s.claw),
        machine: mode === 'drive' ? undefined : screenOf(end),
        pill: mode === 'replay' ? (pillOf(end) ?? 'POLICY') : mode === 'wheel' ? 'YOU' : undefined,
      }}
      log={log}
      say={say}
      view={view}
      onView={onView}
      caption={caption}
    >
      <div className="rb-controls">
        <Pad holding={shown.state.holding} onAct={act} disabled={mode === 'replay'} />
        {fresh && (
          <div className="rb-run">
            {mode !== 'replay' && (
              <button
                type="button"
                className="chip"
                aria-disabled={noDemo ? true : undefined}
                aria-describedby={noDemo ? 'rb-why' : undefined}
                onClick={() => !noDemo && handOver()}
              >
                Hand over
              </button>
            )}
            {noDemo && mode !== 'replay' && (
              <span className="rb-why" id="rb-why">
                Finish one demo first: drive the part into the tray.
              </span>
            )}
            {end && (
              <button type="button" className="chip" onClick={tryAgain}>
                Try again
              </button>
            )}
            {wheel && end && end !== 'done' && (
              <button type="button" className="chip" onClick={takeWheel}>
                Take the wheel
              </button>
            )}
          </div>
        )}
      </div>
      <p className="rb-said" role="status" aria-live="polite">
        {said}
      </p>
    </BayStage>
  );
}

/** A replay of fixed states with Run (chapters 3, 6 and 7): the picture follows playback, the read-out says the end. */
export function ReplayStage({
  layout,
  states,
  actions,
  end,
  go,
  onEnd,
  detector,
  say,
  caption,
  view,
  onView,
  children,
}: {
  layout: Layout;
  states: State[];
  actions: Action[];
  end: End;
  /** changes to play again; 0 shows the start */
  go: number;
  onEnd?: () => void;
  detector?: readonly number[];
  say?: Say;
  caption: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  children?: ReactNode;
}) {
  const shown = go ? states : [startOf(layout)];
  const [said, setSaid] = useState('');
  const frame = usePlayback(shown.length, `${go}:${states.length}`, () => {
    setSaid(endText(end, states.at(-1)!.steps));
    onEnd?.();
  });
  const playing = !!go && frame < shown.length - 1;
  const done = !!go && !playing;
  return (
    <BayStage
      opts={{
        layout,
        state: shown[frame],
        trail: shown.slice(0, frame + 1).map(s => s.claw),
        machine: done ? screenOf(end) : undefined,
        pill: go ? (done ? pillOf(end) : 'POLICY') : undefined,
      }}
      log={go ? actions.slice(0, frame) : []}
      detector={detector}
      say={say}
      view={view}
      onView={onView}
      caption={caption}
    >
      {children}
      <p className="rb-said" role="status" aria-live="polite">
        {said}
      </p>
    </BayStage>
  );
}

/** The stage and drive the claw on a bay of its own (the dev page). */
export function DevDrive() {
  const [b, setB] = useState(BAY);
  return <DriveBench bay={b} onBay={setB} fresh={TRAIN[7]} wheel caption="Drive, then hand over." />;
}

// ---- facts and notes ----

/** A cited fact from data/robots/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the bay shows (R6, KTD9). */
export const SimNote = () => (
  <p className="note rb-note">
    {`A simulated bay: a seeded grid world with hand-set crates, slips and light (${Math.round(BINS.real.slip * 100)}% of moves slip in the real bay), not a real robot.`}
  </p>
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
  const name = `rbr${useId().replace(/[^\w-]/g, '')}`;
  return (
    <fieldset className="rb-field">
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
