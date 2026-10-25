// Pieces the Diffusion LMs chapters share: the two models (Larkspur's toy masked model and Larkspur mini, each loaded
// once per page, with a waiting card and Retry), fills run a pass per animation frame and played back a pass at a time
// (with reduced motion only each fill's end shows), the stage (the type frame, or the Strip tab: the reply after every
// pass, its cells read by arrow keys), the controls over the finite lists, and a cited fact. Every string is React text
// here; the drawings escape theirs (esc, flatPill), and the strip's art goes in as an image (a data URL).
import { ListRange } from '../../components/story/ListRange';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import { modelLoader, type Weights } from '../../lib/lm/load';
import type { Loader } from '../../lib/rag/load';
import type { Model } from '../../lib/lm/model';
import {
  KS,
  L,
  MASK,
  filled,
  passOnce,
  pct,
  show,
  startFill,
  text,
  typewriter,
  type Fill,
  type K,
  type Rule,
} from '../../lib/diffusion-llms/decode';
import { PHRASES, phrase } from '../../lib/diffusion-llms/workbench';
import { fact } from '../../lib/diffusion-llms/facts';
import {
  FRAME_BOARD,
  frameLabel,
  typeFrameScene,
  type FrameOpts,
  type FrameSlot,
} from '../../components/scenes/typeFrameScene';
import { cellsOf, fillStrip } from '../../components/scenes/fillStrip';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './diffusion-llms.css';

export { PHRASES, phrase };
/** A phrase's given text, as the reader sees it. */
export const given = (seed: number) => text(phrase(seed).ids);
export const tokens = (n: number) => `${n} token${n === 1 ? '' : 's'}`;
export const passWords = (n: number) => `${n} pass${n === 1 ? '' : 'es'}`;

// ---- the models: one loader per set of weights, shared by the stage and every control ----

type Kind = Extract<Weights, 'mlm' | 'base'>;
let files: ((w: Kind) => Loader) | undefined;
let loaders: Partial<Record<Kind, ReturnType<typeof modelLoader>>> = {};
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const loaderOf = (w: Kind) => (loaders[w] ??= modelLoader(files?.(w), w));
/** Where the weights come from (tests and the dev page pass a disk or failing loader); drops every loaded model. */
export function setModelFiles(l: (w: Kind) => Loader) {
  files = l;
  loaders = {};
  emit();
}
/** The loaded model, or undefined. */
export const modelNow = (w: Kind): Model | undefined => loaderOf(w).get();
function loadModel(w: Kind) {
  const p = loaderOf(w).load();
  emit();
  p.then(emit, emit);
  return p;
}
/** A model for a component: its status, the model once ready, and `retry` after a failure. */
export function useModel(w: Kind) {
  const snap = () => loaderOf(w).status();
  const status = useSyncExternalStore(
    f => {
      subs.add(f);
      return () => subs.delete(f);
    },
    snap,
    snap,
  );
  useEffect(() => {
    if (loaderOf(w).status() === 'idle') loadModel(w).catch(() => {});
  }, [w]);
  return {
    status,
    model: status === 'ready' ? loaderOf(w).get() : undefined,
    retry: () => loadModel(w).catch(() => {}),
  };
}
const NAMES: Record<Kind, string> = { mlm: 'the toy masked model', base: 'Larkspur mini' };
/** What stands in the frame until the weights are in: a loading pill, or an error card with Retry. */
export function Waiting({ w, failed, retry }: { w: Kind; failed: boolean; retry: () => void }) {
  return (
    <div className="dl-wait" role="status" data-state={failed ? 'failed' : 'loading'}>
      {failed ? (
        <div className="dl-error">
          <p>Couldn’t load {NAMES[w]}.</p>
          <button type="button" className="chip" onClick={retry}>
            Retry
          </button>
        </div>
      ) : (
        <span className="dl-pill">Loading {NAMES[w]}</span>
      )}
    </div>
  );
}

// ---- fills, a pass per frame ----

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** One pass on screen this long, so the stamping shows. */
export const PASS_MS = 260;
export interface FillJob {
  seed: number;
  k: number;
  rule: Rule;
  length?: number;
}
const fills = new Map<string, Fill>();
const keyOf = (j: FillJob) => `${j.seed}:${j.k}:${j.rule}:${j.length ?? L}`;
/** A finished fill run on this page, if any (step predicates and readouts read it). */
/**
 * Run a fill on the toy masked model: one pass per animation frame (a pass is a few milliseconds), shown a pass every
 * PASS_MS so the reader sees the order the frame fills in. With reduced motion only the end shows. A fill already run
 * on this page comes back at once. `onDone` fires once the last pass is on screen.
 */
export function useFill(job: FillJob | null, onDone?: (f: Fill) => void) {
  const { model, status, retry } = useModel('mlm');
  const key = job ? keyOf(job) : '';
  const [fill, setFill] = useState<Fill | null>(() => (job ? (fills.get(key) ?? null) : null));
  const [shown, setShown] = useState(() => (job && fills.has(key) ? fills.get(key)!.passes.length : 0));
  const finish = useRef(onDone);
  finish.current = onDone;
  useEffect(() => {
    if (!job || !model) {
      setFill(job ? (fills.get(key) ?? null) : null);
      setShown(job && fills.has(key) ? fills.get(key)!.passes.length : 0);
      return;
    }
    const hit = fills.get(key);
    if (hit) {
      setFill(hit);
      setShown(hit.passes.length);
      finish.current?.(hit);
      return;
    }
    const f = startFill(phrase(job.seed).ids, job.k, job.rule, job.seed, job.length ?? L),
      calm = reduced();
    let raf = 0,
      last = 0,
      on = 0;
    setFill(f);
    setShown(0);
    const tick = (now: number) => {
      if (!filled(f)) passOnce(model, f);
      if (!calm && f.passes.length > on && now - last >= PASS_MS) {
        on++;
        last = now;
        setShown(on);
      }
      if (filled(f) && (calm || on === f.passes.length)) {
        fills.set(key, f);
        setShown(f.passes.length);
        finish.current?.(f);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, model]);
  const done = !!fill && filled(fill) && shown === fill.passes.length;
  return { fill, shown, done, status, retry };
}

/** The frame's reply slots after `n` passes of a fill (n = 0: all blank). */
export function slotsAt(f: Fill | null, n: number, length = L): FrameSlot[] {
  if (!f || n === 0)
    return Array.from({ length: f?.reply.length ?? length }, () => ({ state: 'mask', tok: MASK, p: 0 }));
  return cellsOf(f.passes.slice(0, n), f.reply.length)[n - 1];
}
/** A reply as it stands after `n` passes: stamped tokens, ▢ for the blanks. */
export const replyAt = (f: Fill, n: number) => text(f.reply.map((t, i) => (f.at[i] < n ? t : MASK)));

/** Larkspur mini typing a phrase's reply, a token every PASS_MS (all at once with reduced motion). */
export function useTypewriter(seed: number | null, onDone?: (ids: number[]) => void) {
  const { model, status, retry } = useModel('base');
  const [ids, setIds] = useState<number[] | null>(null);
  const [typed, setTyped] = useState(0);
  const finish = useRef(onDone);
  finish.current = onDone;
  useEffect(() => {
    if (seed === null || !model) return;
    const out = typewriter(model, phrase(seed).ids),
      calm = reduced();
    setIds(out);
    if (calm) {
      setTyped(out.length);
      finish.current?.(out);
      return;
    }
    let n = 0;
    setTyped(0);
    const t = setInterval(() => {
      n++;
      setTyped(n);
      if (n >= out.length) {
        clearInterval(t);
        finish.current?.(out);
      }
    }, PASS_MS);
    return () => clearInterval(t);
  }, [seed, model]);
  return { ids, typed, status, retry, done: !!ids && typed >= ids.length };
}

// ---- the stage ----

/** The strip: the drawing as an image, a focusable marker per cell over it (arrows across slots and down passes, Home,
 * End), and a read-out line naming the cell. */
export function Strip({ fill, label }: { fill: Fill; label: string }) {
  const phone = useNarrow(),
    id = 'fs' + useId().replace(/[^\w-]/g, '');
  const n = fill.reply.length,
    c = fillStrip(fill.passes, n, phone),
    [cur, setCur] = useState(c.cells.length - n);
  const at = Math.max(0, Math.min(cur, c.cells.length - 1)),
    m = c.cells[at];
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.w} ${c.h}"><defs>${filterFor(1, 'hand')}</defs><g filter="url(#hand)">${c.svg}</g></svg>`;
  const go = (i: number) => {
    const to = Math.max(0, Math.min(c.cells.length - 1, i));
    setCur(to);
    (document.getElementById(`${id}-${to}`) as SVGElement | null)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = {
      ArrowRight: at + 1,
      ArrowLeft: at - 1,
      ArrowDown: at + n,
      ArrowUp: at - n,
      Home: at - (at % n),
      End: at - (at % n) + n - 1,
    }[e.key];
    if (to !== undefined && to >= 0 && to < c.cells.length) {
      e.preventDefault();
      go(to);
    }
  };
  const words = (x: (typeof c.cells)[number]) =>
    `Pass ${x.pass + 1}, slot ${x.slot + 1}: ${
      x.state === 'mask'
        ? x.p > 0
          ? `blank, best guess “${show(x.tok)}” at ${pct(x.p)}`
          : 'blank'
        : `“${show(x.tok)}” at ${pct(x.p)}, ${x.state === 'new' ? 'stamped this pass' : 'stamped before'}`
    }`;
  return (
    <figure className="dl-strip">
      <svg viewBox={`0 0 ${c.w} ${c.h}`} role="group" aria-label={label} onKeyDown={key}>
        <image href={`data:image/svg+xml,${encodeURIComponent(doc)}`} width={c.w} height={c.h} aria-hidden="true" />
        {c.cells.map((x, i) => (
          <rect
            key={i}
            id={`${id}-${i}`}
            className="dl-mark"
            role="button"
            tabIndex={i === at ? 0 : -1}
            aria-pressed={i === at}
            aria-label={words(x)}
            onClick={() => go(i)}
            onFocus={() => setCur(i)}
            data-cell={`${x.pass}:${x.slot}`}
            x={x.x - 1.5}
            y={x.y - 1.5}
            width={x.size + 3}
            height={x.size + 3}
            rx={4}
          />
        ))}
      </svg>
      <p className="dl-readout" aria-live="polite">
        {m && words(m)}
      </p>
      <p className="dl-reply">
        After pass {(m?.pass ?? 0) + 1}: “{m ? replyAt(fill, m.pass + 1) : ''}”
      </p>
    </figure>
  );
}

/** What a chapter puts on the stage: the frame's settings, the fill for the strip, the caption. */
export interface Shown extends Omit<FrameOpts, 'scale' | 'say'> {
  caption: string;
  fill?: Fill | null;
  stripLabel?: string;
  stamp?: Stamp;
  /** stands in the frame instead of the picture (the loading card) */
  wait?: ReactNode;
}
export type View = 'scene' | 'strip';

const FILL = { height: '100%' };
/** The chapters' stage: the type frame (default) or the Strip tab, one at a time. The tab is the reader's view, kept
 * out of saved progress unless the chapter passes `view` and `onView`. */
export function FrameStage({
  shown: s,
  view: keep,
  onView,
  say,
}: {
  shown: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn over a part of the picture (FRAME_PARTS); the strip ignores it */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = keep ?? own,
    setView = onView ?? setOwn;
  const o: FrameOpts = { ...s, scale: useNarrow() ? 2 : 1.2, say };
  const strip = !!s.fill && filled(s.fill);
  return (
    <div className="tc-stage dl-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'strip'}
          disabled={!strip}
          onClick={() => setView('strip')}
        >
          Strip
        </button>
      </div>
      <div className="tc-frame">
        {s.wait ??
          (view === 'strip' && strip ? (
            <div className="dl-scroll">
              <Strip fill={s.fill!} label={s.stripLabel ?? 'The reply, pass by pass'} />
            </div>
          ) : (
            <IsoStage
              className="type-frame"
              board={FRAME_BOARD}
              style={FILL}
              scene={typeFrameScene(o)}
              label={frameLabel(o)}
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

/** The stage's frame for a fill on show: slots after `shown` passes, the press's count and the dial. */
export const frameOf = (f: Fill | null, shown: number, k?: number, length = L) => ({
  slots: slotsAt(f, shown, length),
  pass: f ? shown : undefined,
  passes: f ? Math.ceil(f.reply.length / f.k) : undefined,
  k: f?.k ?? k,
});

// ---- controls ----

/** A native range over a finite list, its value named beside it. */
export const kWords = (k: number) => `${tokens(k)} a pass (${passWords(Math.ceil(L / k))})`;
export const KRange = ({ value, onChange }: { value: K; onChange: (k: K) => void }) => (
  <ListRange className="dl-range" label="Tokens a pass" list={KS} value={value} words={kWords} onChange={onChange} />
);
export const RULE_NAME: Record<Rule, string> = { confidence: 'Surest first', random: 'Random' };
/** A cited fact from data/diffusion-llms/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the toy's replies or numbers show (R6, the plan's scope boundary). */
export const ToyNote = () => (
  <p className="dl-note">
    Larkspur’s toy masked model: Larkspur mini’s size, trained once on Larkspur’s documents and run live in your
    browser. It shows the mechanism; its replies are not what a production model writes.
  </p>
);

/** A reply in a box, as text (never markup). */
export const Reply = ({ who, ids, lit }: { who: string; ids: number[]; lit?: boolean }) => (
  <p className={`dl-line${lit ? ' lit' : ''}`}>
    <span className="who">{who}</span> <span className="ids">“{text(ids)}”</span>
  </p>
);
