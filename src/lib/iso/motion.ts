// Living scenes (KTD2, KTD6): a scene is a pure function scene(prev, state, t, view) → { still, moving }, and
// useSceneMotion supplies prev and t. `still` goes in IsoStage's filtered layer (memoise it on the target state, so the
// hand-drawn filter rasterises once per state); `moving` holds only the pieces in flight, unfiltered, and is empty at
// t = 1, when every piece has joined the still. Self-contained on purpose: live kits keep their own tween/useReduced.
import { useEffect, useMemo, useRef, useState } from 'react';
import { P, ease, withFrame } from './core.js';
import { frameFor, stageFrame, type Board, type SceneCtx, type Zoom } from './IsoStage';
import type { Drag } from './hits';

type Pt = number[];
/** What IsoStage draws: SVG markup, or a function of the board context built inside the stage's frame. */
export type Art = string | ((ctx: SceneCtx) => string);
/** What a scene knows about the stage besides the run: the step's close-up parts and how far in it is zoomed. */
export interface SceneView {
  closeUp?: string[];
  /** 0 = unzoomed; above 0, every pill but the close-up parts' hides (R11) */
  zoomT: number;
  phone?: boolean;
}
export type Scene<S> = (prev: S, state: S, t: number, view: SceneView) => { still: Art; moving: Art };

const REDUCE = '(prefers-reduced-motion: reduce)';
/** Reduced motion or a hidden tab, read now (false on the server). */
const instant = () =>
  (typeof matchMedia === 'function' && matchMedia(REDUCE).matches) ||
  (typeof document !== 'undefined' && document.visibilityState === 'hidden');

/** Whether the reader asked for less motion, read on first render (no flash of motion) and kept live. */
export function useReduced() {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia(REDUCE).matches);
  useEffect(() => {
    const m = matchMedia(REDUCE),
      f = () => setReduced(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return reduced;
}

/** Animate a number from `from` to `to` in ms with the engine's ease; reduced motion jumps. Returns a cancel. */
export function tween(from: number, to: number, ms: number, set: (v: number) => void) {
  if (instant()) {
    set(to);
    return () => {};
  }
  let raf = 0;
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / ms);
    set(from + (to - from) * ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/**
 * The motion from the last state to `state` (compared by identity): `t` runs 0 → 1, eased, over `ms`, then holds at 1.
 * A change mid-motion makes the state being moved to `prev` and restarts t at 0. Reduced motion, a hidden tab or a
 * change `moves` says moves nothing: t is 1 on the very render the state changes (prev = state), so no start frame shows.
 */
export function useSceneMotion<S>(state: S, ms: number, moves?: (prev: S, next: S) => boolean): { prev: S; t: number } {
  const [m, setM] = useState({ prev: state, to: state, t: 1 });
  let cur = m;
  if (state !== m.to) {
    const jump = instant() || (moves ? !moves(m.to, state) : false);
    cur = { prev: jump ? state : m.to, to: state, t: jump ? 1 : 0 };
    setM(cur); // derived during render: React re-renders before committing, so the old t never paints
  }
  const to = cur.to,
    moving = cur.t < 1;
  useEffect(() => {
    if (!moving) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      setM(x => (x.to === to ? { ...x, t: ease(t) } : x));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return { prev: cur.prev, t: cur.t };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpPt = (a: Pt, b: Pt, t: number) => a.map((v, i) => lerp(v, b[i], t));
/** How open a part is, 0 (shut) to 1 (open), on its way from `was` to `is`. */
export const openness = (was: boolean, is: boolean, t: number) => lerp(+was, +is, t);

/** A pill's scale in this view: 0 hides it. At rest every pill shows (2 on phones); zoomed, only the close-up
 * parts' pills, at the phone scale (R11). */
export const pillScale = (part: string, v: SceneView) => {
  const rest = v.phone ? 2 : 1;
  // the close-up's pill grows with the zoom rather than jumping to the phone scale while the stage is still wide
  return v.zoomT > 0 ? (v.closeUp?.includes(part) ? rest + (2 - rest) * v.zoomT : 0) : rest;
};

/** A step's callout as the scene should draw it: none while zoomed (the close-up's pills say it). */
export const calloutOf = <T>(say: T | undefined, v: SceneView) => (v.zoomT > 0 ? undefined : say);

const K_MAX = 2.2,
  FILL = 0.7;
/** The zoom that frames these 3-D points (a part's footprint, or two parts'): at most 2.2×, the box filling at
 * most 70% of the frame, centred where the stage allows. For the front view (close-ups are picture-tab only). */
export function closeUpZoom(board: Board, pts: Pt[]): Zoom {
  const fr = frameFor(board),
    q = withFrame(stageFrame(board), () => pts.map(p => P(p[0], p[1], p[2] ?? 0)));
  const xs = q.map(p => p[0]),
    ys = q.map(p => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.max(1, Math.min(K_MAX, (FILL * fr.w) / (x1 - x0 || 1), (FILL * fr.h) / (y1 - y0 || 1)));
  // IsoStage puts the viewBox at u·(w − w/k): solve for the box centre in the middle, clamped to the frame
  const at = (c: number, size: number) =>
    k === 1 ? 0.5 : Math.max(0, Math.min(1, (c - size / (2 * k)) / (size - size / k)));
  return { k, u: at((x0 + x1) / 2, fr.w), v: at((y0 + y1) / 2, fr.h) };
}

/** Between two zooms (none = the whole board, pulled back about the other's point). */
export function lerpZoom(a: Zoom | undefined, b: Zoom | undefined, t: number): Zoom {
  const A = a ?? { k: 1, u: b?.u ?? 0.5, v: b?.v ?? 0.5 },
    B = b ?? { k: 1, u: A.u, v: A.v };
  return { k: lerp(A.k, B.k, t), u: lerp(A.u, B.u, t), v: lerp(A.v, B.v, t) };
}

const keyOf = (z?: Zoom) => (z ? `${z.k} ${z.u} ${z.v}` : '');
const zoomOf = (k: string): Zoom | undefined => {
  if (!k) return undefined;
  const [a, b, c] = k.split(' ').map(Number);
  return { k: a, u: b, v: c };
};

/**
 * The stage's eased close-up: eases to `target` (from closeUpZoom) and back to none. The close-up belongs to the
 * state it arrived with: once `state` changes (any reader action) it pulls back in that same render, so hit targets
 * and the scene never act on a zoomed stage. Pass `zoom` to IsoStage and `zoomT` to the scene's view.
 */
export function useCloseUp(target: Zoom | undefined, state: unknown, ms = 500) {
  const entry = useRef<{ key: string; state: unknown }>({ key: '', state });
  let key = keyOf(target);
  if (key !== entry.current.key) entry.current = { key, state };
  else if (entry.current.state !== state) key = '';
  const { prev, t } = useSceneMotion(key, ms);
  const zoom = lerpZoom(zoomOf(prev), zoomOf(key), t);
  const zoomT = key ? (prev ? 1 : t) : prev ? 1 - t : 0;
  return { zoom: zoom.k > 1 ? zoom : undefined, zoomT };
}

export interface LivingOpts<S> {
  scene: Scene<S>;
  /** the picture's state: only what changes what it draws */
  state: S;
  /** states with the same key are the same state: no motion, no pull-back (default JSON.stringify(state)) */
  key?: string;
  /** whether prev → next moves anything; false lands at once (default: every change moves) */
  moves?: (prev: S, next: S) => boolean;
  ms: number;
  board: Board;
  /** the close-up parts (the step's; none off the picture tab), zoomed once the motion has landed */
  closeUp?: string[];
  /** a part's 3-D footprint in state s, framed by the close-up */
  partBox?: (part: string, s: S) => number[][];
  phone?: boolean;
  /** while a piece is dragged: the still without it, and the piece as drawn at rest (the hook moves it) */
  /** the dragged piece; pass a function so it is drawn inside the stage's frame (projected points need its offset) */
  lift?: (s: S, view: SceneView) => { still: Art; piece: string | (() => string) };
}

/**
 * A living stage in one call: the motion between states, the close-up (after the motion lands; any change of state
 * pulls back) and the drag's lifted piece. Pass `still`, `moving` and `zoom` to IsoStage, `busy` and `onDrag` to
 * HitLayer; `state` is the held state (same object for the same key).
 */
export function useLivingStage<S>(o: LivingOpts<S>) {
  const key = o.key ?? JSON.stringify(o.state);
  const held = useRef({ key, state: o.state });
  if (held.current.key !== key) held.current = { key, state: o.state };
  const s = held.current.state;
  const { prev, t } = useSceneMotion(s, o.ms, o.moves);
  const parts = t >= 1 && o.partBox ? o.closeUp?.join() : '';
  const target = useMemo(
    () =>
      parts
        ? closeUpZoom(
            o.board,
            parts.split(',').flatMap(p => o.partBox!(p, s)),
          )
        : undefined,
    [parts, s],
  );
  const { zoom, zoomT } = useCloseUp(target, s);
  const [drag, setDrag] = useState<Drag | null>(null);
  const view: SceneView = { closeUp: o.closeUp, zoomT, phone: o.phone };
  const sc = o.scene(prev, s, t, view);
  const lifted = drag && o.lift ? o.lift(s, view) : null;
  // the filtered still changes only with the state, the end of the motion, zoom in or out, and a lift
  const still = useMemo(() => lifted?.still ?? sc.still, [s, t >= 1, zoomT > 0, !!lifted, o.phone, o.closeUp?.join()]);
  const moving: Art =
    drag && lifted
      ? () => {
          const piece = typeof lifted.piece === 'function' ? lifted.piece() : lifted.piece;
          return `<g transform="translate(${drag.dx.toFixed(1)} ${drag.dy.toFixed(1)})">${piece}</g>`;
        }
      : sc.moving;
  return { state: s, prev, t, still, moving, zoom, zoomT, view, busy: t < 1 || !!zoom, onDrag: setDrag };
}
