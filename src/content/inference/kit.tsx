// Pieces the inference chapters share: Larkspur mini and its student (each loaded once per page, with a gate that holds
// the stage's frame while loading), the held-out pass per precision (computed in chunks so the page never freezes), and
// the stage: the serving floor, or the server timeline. Every string is React text here; the floor escapes its pills
// (esc), and the timeline is drawn as React SVG, so it has no markup to escape.
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import { fetchLoader, type Loader } from '../../lib/rag/load';
import { modelLoader, type Weights } from '../../lib/lm/load';
import type { Model } from '../../lib/lm/model';
import { heldoutAsync, quantize, type Bits } from '../../lib/inference/quantize';
import type { Result } from '../../lib/inference/server';
import { fact } from '../../lib/inference/facts';
import { SERVE_BOARD, serveLabel, serveReadouts, serveScene, type ServeOpts } from '../../components/scenes/serveScene';
import { PHASE_PAL, laneName, serverTimeline, timelineLabel } from '../../components/scenes/serverTimeline';
import { useNarrow } from '../tool-calling/kit';
import HELDOUT from '../../../data/fine-tuning/heldout.json' with { type: 'json' };
import './inference.css';
import Cite from '../../components/story/Cite';

// ---- the models: one loader per set of weights, shared by the stage and every control ----

type W = Extract<Weights, 'base' | 'student'>;
let files: Loader = fetchLoader('/data/lm/');
let loaders: Partial<Record<W, ReturnType<typeof modelLoader>>> = {};
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const loaderOf = (w: W) => (loaders[w] ??= modelLoader(files, w));
/** Where the weights come from (tests and the dev page pass a disk or failing loader); drops every loaded model. */
export function setModelFiles(l: Loader) {
  files = l;
  loaders = {};
  emit();
}
/** The loaded model, or undefined: step predicates read this, so no step advances before the weights are in. */
export const modelNow = (w: W): Model | undefined => loaderOf(w).get();
/** Start (or, after a failure, retry) loading; every subscriber re-renders when it settles. */
export function loadModel(w: W) {
  const p = loaderOf(w).load();
  emit();
  return p.then(
    m => {
      emit();
      return m;
    },
    e => {
      emit();
      throw e;
    },
  );
}
/** The models a component needs: all loaded, any failed (Retry reloads the failed ones), or still loading. */
export function useModels(ws: W[]) {
  const snap = () => ws.map(w => loaderOf(w).status()).join();
  const status = useSyncExternalStore(
    f => {
      subs.add(f);
      return () => subs.delete(f);
    },
    snap,
    snap,
  ).split(',');
  const key = ws.join();
  useEffect(() => {
    for (const w of key ? (key.split(',') as W[]) : [])
      if (loaderOf(w).status() === 'idle') loadModel(w).catch(() => {});
  }, [key]);
  const ready = ws.every(w => loaderOf(w).status() === 'ready');
  return {
    ready,
    failed: status.includes('error'),
    models: (ready ? Object.fromEntries(ws.map(w => [w, loaderOf(w).get()!])) : {}) as Partial<Record<W, Model>>,
    retry: () => {
      for (const w of ws) if (loaderOf(w).status() === 'error') loadModel(w).catch(() => {});
    },
  };
}

/** What stands in the frame until the weights are in: a "Loading Larkspur mini" pill, or an error card with Retry. */
export function Waiting({ failed, retry }: { failed: boolean; retry: () => void }) {
  return (
    <div className="in-wait" role="status" data-state={failed ? 'failed' : 'loading'}>
      {failed ? (
        <div className="in-error">
          <p>Couldn’t load Larkspur mini.</p>
          <button type="button" className="chip" onClick={retry}>
            Retry
          </button>
        </div>
      ) : (
        <span className="in-pill">Loading Larkspur mini</span>
      )}
    </div>
  );
}

/** A story-column control that needs models: the waiting card until they are in, then the control. */
export function ModelGate({
  weights,
  children,
}: {
  weights: W[];
  children: (m: Partial<Record<W, Model>>) => ReactNode;
}) {
  const { ready, failed, models, retry } = useModels(weights);
  return ready ? <>{children(models)}</> : <Waiting failed={failed} retry={retry} />;
}

// ---- held-out scores per precision: computed once each, a document at a time, so the page keeps responding ----

export interface Score {
  loss: number;
  top1: number;
  top5: number;
  tokens: number;
}
const scores = new Map<Bits, Score>(),
  running = new Map<Bits, Promise<Score>>();
/** The held-out scores of Larkspur mini at `bits`, or undefined while they are computed (`computing`). */
export function useHeldout(base: Model | undefined, bits: Bits) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!base || scores.has(bits)) return;
    let live = true;
    const p =
      running.get(bits) ??
      heldoutAsync(quantize(base, bits), HELDOUT.ids).then(s => {
        scores.set(bits, s);
        running.delete(bits);
        return s;
      });
    running.set(bits, p);
    p.then(() => {
      if (live) tick(n => n + 1);
    });
    return () => {
      live = false;
    };
  }, [base, bits]);
  return { score: scores.get(bits), computing: !!base && !scores.has(bits) };
}
/** Scores already computed (a step predicate reads these). */
export const scoreNow = (bits: Bits) => scores.get(bits);

// ---- the Timeline tab ----

/** The server run as lanes, one per request: each lane a list item, one in the tab order at a time; the arrow keys
 * (Home, End) move between them, and the line under the drawing reads out the one in focus. */
export function TimelineView({ result, ttftTarget }: { result: Result; ttftTarget?: number }) {
  const phone = useNarrow(),
    t = serverTimeline(result, { phone }),
    n = t.lanes.length;
  const [cur, setCur] = useState(0),
    [said, setSaid] = useState<number | null>(null),
    list = useRef<SVGSVGElement>(null);
  const at = Math.min(cur, Math.max(0, n - 1));
  const go = (i: number) => {
    setCur(i);
    setSaid(i);
    list.current?.querySelector<SVGGElement>(`[data-lane="${i}"]`)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: n - 1 }[
      e.key
    ];
    if (to === undefined || !n) return;
    e.preventDefault();
    go(Math.max(0, Math.min(n - 1, to)));
  };
  const fs = t.fs;
  return (
    <figure className="in-timeline">
      <div className="in-scroll">
        <svg viewBox={`0 0 ${t.w} ${t.h}`} role="list" aria-label={timelineLabel(result)} ref={list} onKeyDown={key}>
          {t.ticks.map(k => (
            <g key={k.label} aria-hidden="true">
              <path
                d={`M${k.x} ${t.lanes[0]?.y ?? 0}V${t.axisY - 6}`}
                stroke="var(--rule, #d8cfbd)"
                strokeWidth={0.8}
              />
              <text x={k.x} y={t.axisY + fs} fontSize={fs} textAnchor="middle">
                {k.label}
              </text>
            </g>
          ))}
          <text x={t.w - 4} y={t.axisY + fs} fontSize={fs} textAnchor="end" aria-hidden="true">
            s
          </text>
          {t.lanes.map(l => (
            <g
              key={l.id}
              role="listitem"
              tabIndex={l.i === at ? 0 : -1}
              aria-label={laneName(l, n)}
              data-lane={l.i}
              data-ok={ttftTarget === undefined ? undefined : l.served.ttft <= ttftTarget ? 1 : 0}
              onFocus={() => {
                setCur(l.i);
                setSaid(l.i);
              }}
              onClick={() => go(l.i)}
              className="in-lane"
            >
              {l.i === at && (
                <rect
                  x={2}
                  y={l.y - 1.5}
                  width={t.w - 4}
                  height={l.h + 3}
                  rx={3}
                  fill="var(--acc, #f4b829)"
                  opacity={0.22}
                />
              )}
              <text x={t.x0 - 4} y={l.y + l.h / 2 + fs * 0.36} fontSize={fs} textAnchor="end" aria-hidden="true">
                {l.i + 1}
              </text>
              {l.queue.w > 0.5 && (
                <path
                  d={`M${l.queue.x} ${l.y + l.h / 2}h${l.queue.w}`}
                  stroke={INK}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  aria-hidden="true"
                />
              )}
              <rect
                x={l.prefill.x}
                y={l.y}
                width={Math.max(1, l.prefill.w)}
                height={l.h}
                fill={PHASE_PAL.prefill.l}
                stroke={INK}
                strokeWidth={0.8}
                aria-hidden="true"
              />
              <rect
                x={l.decode.x}
                y={l.y + 2}
                width={Math.max(1, l.decode.w)}
                height={l.h - 4}
                fill={PHASE_PAL.decode.l}
                stroke={INK}
                strokeWidth={0.8}
                aria-hidden="true"
              />
              {ttftTarget !== undefined && l.served.ttft > ttftTarget && (
                <text
                  x={l.decode.x + Math.max(1, l.decode.w) + 3}
                  y={l.y + l.h / 2 + fs * 0.36}
                  fontSize={fs}
                  fontWeight={800}
                  fill="var(--bad, #b5361f)"
                  aria-hidden="true"
                >
                  late
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <p className="in-readout" aria-live="polite">
        {n
          ? said === null
            ? 'Tab to the timeline, then use the arrow keys to read each request.'
            : laneName(t.lanes[at], n)
          : 'No requests.'}
      </p>
      <ul className="in-key" aria-label="What the lanes show">
        <li>
          <i className="q" />
          waiting in the queue
        </li>
        <li>
          <i style={{ background: PHASE_PAL.prefill.l }} />
          prefill: reading the prompt
        </li>
        <li>
          <i style={{ background: PHASE_PAL.decode.l }} />
          decode: writing the reply
        </li>
      </ul>
    </figure>
  );
}

// ---- the stage ----

export type View = 'scene' | 'timeline';
/** What a chapter puts on the stage: the floor's settings, the run for the Timeline tab, and the caption. */
export interface Shown {
  scene: Omit<ServeOpts, 'scale'>;
  result?: Result;
  ttftTarget?: number;
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the serving floor (default) or the timeline, one at a time. With `weights` the stage needs those
 * models: it holds its frame with a loading pill (or an error card with Retry) until they are in, then `show` gets
 * them. The tab is the reader's view, kept out of saved progress unless the chapter passes `view` and `onView`. */
export function InferenceStage({
  show,
  weights,
  view: kept,
  onView,
}: {
  show: (m: Partial<Record<W, Model>>) => Shown;
  weights?: W[];
  view?: View;
  onView?: (v: View) => void;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const { ready, failed, models, retry } = useModels(weights ?? []);
  const s = ready ? show(models) : null,
    o: ServeOpts | null = s ? { ...s.scene, scale } : null;
  return (
    <div className="tc-stage in-stage" data-model={ready ? 'ready' : failed ? 'failed' : 'loading'}>
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'scene'}
          disabled={!s}
          onClick={() => setView('scene')}
        >
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'timeline'}
          disabled={!s?.result}
          onClick={() => setView('timeline')}
        >
          Timeline
        </button>
      </div>
      <div className="tc-frame">
        {!s || !o ? (
          <Waiting failed={failed} retry={retry} />
        ) : view === 'timeline' && s.result ? (
          <TimelineView result={s.result} ttftTarget={s.ttftTarget} />
        ) : (
          <IsoStage className="floor" board={SERVE_BOARD} style={FILL} scene={serveScene(o)} label={serveLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        {s && <span className="txt">{s.caption}</span>}
        {o && <span className="lbl">{serveReadouts(o).join(' · ')}</span>}
      </p>
    </div>
  );
}

/** A cited fact from data/inference/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** The cost model's note, shown wherever the server's times appear (R6). */
export const CostModelNote = () => (
  <p className="note in-note">
    Times come from a simulated server: counted work at assumed unit costs, not a measurement of any real server or
    provider.
  </p>
);
