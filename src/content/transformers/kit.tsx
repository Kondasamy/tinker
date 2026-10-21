// Pieces the transformers chapters share: Larkspur mini, loaded once per page; the stage (the engine room, or the
// attention heatmap with the next-token bar) and its caption; and the prompt box with its token count. Every string
// from a prompt is React text here; the drawings escape theirs (esc) before they become SVG.
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import type { Loader } from '../../lib/rag/load';
import { modelLoader } from '../../lib/lm/load';
import type { Model } from '../../lib/lm/model';
import { decode, encode } from '../../lib/lm/bpe';
import { trace } from '../../lib/transformers/trace';
import { ENGINE_BOARD, engineLabel, engineScene, type EngineOpts } from '../../components/scenes/engineScene';
import { attentionMap, mapLabel, pieceLabel, probBar } from '../../components/scenes/attentionMap';
import { useNarrow } from '../tool-calling/kit';
import './transformers.css';

/** Larkspur mini's context: the most tokens it reads (public/data/lm/meta.json model.ctx; a test holds them equal). */
export const CTX = 32;

/** One model per page, shared by every stage and control. A failed load stays failed until Retry. */
export function modelStore(loader?: Loader) {
  const lm = modelLoader(loader), subs = new Set<() => void>();
  let snap: { model?: Model; failed: boolean } = { failed: false };
  const emit = () => { snap = { model: lm.get(), failed: lm.status() === 'error' }; subs.forEach(f => f()); };
  const load = () => { lm.load().then(emit, emit); emit(); };
  return {
    /** The loaded model, or undefined: step predicates read this, so no step advances before it has loaded. */
    now: () => lm.get(),
    snapshot: () => snap,
    subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
    /** first use loads; a failed or loaded model is left as it is */
    start: () => { if (lm.status() === 'idle') load(); },
    retry: () => { if (lm.status() === 'error') load(); },
  };
}
export type ModelStore = ReturnType<typeof modelStore>;
export const MODEL = modelStore();
/** The loaded model, or undefined. */
export const modelNow = () => MODEL.now();
/** A step predicate that holds only once the model has loaded. */
export const whenLoaded = <S,>(pred: (s: S) => boolean, store: ModelStore = MODEL) => (s: S) => !!store.now() && pred(s);

/** The model for a component: undefined while loading; `failed` offers `retry`. */
export function useModel(store: ModelStore = MODEL) {
  const st = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  useEffect(store.start, [store]);
  return { ...st, retry: store.retry };
}

/** The pieces a prompt becomes, and which of them the model reads (the last CTX). No model needed. */
export function piecesOf(text: string) {
  const ids = encode(text), cut = Math.max(0, ids.length - CTX);
  return { pieces: ids.map(id => decode([id])), cut, read: ids.slice(cut).map(id => decode([id])) };
}

/** A prompt box with its live "N of 32 tokens" and the pieces as tiles; pieces past the context are struck through. */
export function PromptInput({ value, onChange, label = 'Your prompt' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const id = useId(), { pieces, cut } = useMemo(() => piecesOf(value), [value]);
  return (
    <div className="tf-prompt">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={2} value={value} onChange={e => onChange(e.target.value)} spellCheck={false} />
      <p className="tf-count" aria-live="polite" data-over={cut > 0 || undefined}>
        {`${pieces.length} of ${CTX} tokens${cut > 0 ? `: the first ${cut} don’t fit, so the model never reads them` : ''}`}
      </p>
      {pieces.length > 0 && (
        <ol className="tf-tiles" aria-label="The pieces, in order">
          {pieces.map((p, i) => i < cut
            ? <li key={i} className="past"><s>{pieceLabel(p)}</s><span className="sr"> (past the context, not read)</span></li>
            : <li key={i}>{pieceLabel(p)}</li>)}
        </ol>
      )}
    </div>
  );
}

/** A flat figure in the hand-drawn wobble. Its contents were escaped by the figure (esc). */
function Flat({ fig, role, label, onKeyDown, svgRef, className }: { fig: { svg: string; w: number; h: number }; role: string; label: string; onKeyDown?: (e: KeyboardEvent) => void; svgRef?: Ref<SVGSVGElement>; className?: string }) {
  const id = 'tf' + useId().replace(/[^\w-]/g, '');
  return (
    <svg ref={svgRef} className={className} viewBox={`0 0 ${fig.w} ${fig.h}`} width={fig.w} role={role} aria-label={label} onKeyDown={onKeyDown}>
      <defs dangerouslySetInnerHTML={{ __html: filterFor(1, id) }} />
      <g filter={`url(#${id})`} dangerouslySetInnerHTML={{ __html: fig.svg }} />
    </svg>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const MOVE: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

/** The Attention tab: one head's heatmap and the next-token bar for the picked row, each item focusable, arrow keys
 * between them, and a read-out line under each. Phones number the tokens and list the pieces under the map. */
function AttentionView({ tokens, weights, top, layer, head, query }: { tokens: string[]; weights: number[][]; top: { text: string; p: number }[][]; layer: number; head: number; query: number }) {
  const phone = useNarrow(), n = tokens.length;
  const [cell, setCell] = useState<[number, number]>([query, 0]), [bar, setBar] = useState(0);
  useEffect(() => { setCell([query, 0]); setBar(0); }, [query, n]);
  const [q, k] = [clamp(cell[0], 0, n - 1), clamp(cell[1], 0, n - 1)], bars = top[q] ?? [];
  const map = useRef<SVGSVGElement>(null), list = useRef<SVGSVGElement>(null), moved = useRef<'map' | 'bar' | null>(null);
  // after an arrow key the drawing is redrawn; put focus back on the item that now takes Tab
  useEffect(() => {
    const el = moved.current === 'map' ? map.current : moved.current === 'bar' ? list.current : null;
    (el?.querySelector('[tabindex="0"]') as SVGElement | null)?.focus();
    moved.current = null;
  });
  const onMap = (e: KeyboardEvent) => {
    const d = MOVE[e.key] ?? (e.key === 'Home' ? [0, -n] : e.key === 'End' ? [0, n] : null);
    if (!d || !n) return;
    e.preventDefault(); moved.current = 'map';
    setCell([clamp(q + d[0], 0, n - 1), clamp(k + d[1], 0, n - 1)]); setBar(0);
  };
  const onBar = (e: KeyboardEvent) => {
    const d = MOVE[e.key]; if (!d || !bars.length) return;
    e.preventDefault(); moved.current = 'bar';
    setBar(clamp(bar + d[0] + d[1], 0, bars.length - 1));
  };
  const w = k > q ? 0 : weights[q]?.[k] ?? 0, name = (i: number) => `token ${i + 1} (${pieceLabel(tokens[i])})`;
  return (
    <div className="tf-attn">
      <div className="tf-scroll" tabIndex={0} role="region" aria-label="Attention heatmap, scrolls">
        <Flat svgRef={map} fig={attentionMap({ tokens, weights, phone, active: [q, k] })} role="grid" label={mapLabel(n, layer, head)} onKeyDown={onMap} />
      </div>
      <p className="tf-readout" aria-live="polite">
        {!n ? 'No tokens yet.' : k > q ? `${name(q)} can’t look at ${name(k)}: it comes later, so the weight is 0.`
          : `${name(q)} looks at ${name(k)}: ${w.toFixed(2)}`}
      </p>
      {phone && n > 0 && <ol className="tf-key" aria-label="The tokens by number">{tokens.map((t, i) => <li key={i}>{pieceLabel(t)}</li>)}</ol>}
      <p className="tf-sub">{n ? `After ${name(q)}, the model’s likeliest next pieces` : 'Next pieces'}</p>
      <Flat svgRef={list} className="tf-bar" fig={probBar(bars, { phone, active: bar })} role="list" label="Next-piece probabilities, most likely first. Use the arrow keys to move between them." onKeyDown={onBar} />
      <p className="tf-readout" aria-live="polite">{bars[bar] ? `${pieceLabel(bars[bar].text)}: ${bars[bar].p.toFixed(2)}` : 'Nothing to predict yet.'}</p>
    </div>
  );
}

export type View = 'scene' | 'attn';
const FILL = { height: '100%' };   // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the engine room (default) or the attention heatmap, one at a time, for one prompt run through
 * Larkspur mini. `layer` and `head` pick the lit desk and the heatmap; `query` the token whose threads are drawn
 * (default the last). While the model loads the frame keeps its size, with the prompt's tiles and a loading pill; a
 * failed load shows Retry. The tab is the reader's view, kept out of saved progress unless the chapter passes `view`
 * and `onView`. */
export function TransformersStage({ prompt, layer = 0, head = 0, query, caption, view: kept, onView, store = MODEL }:
  { prompt: string; layer?: number; head?: number; query?: number; caption?: ReactNode; view?: View; onView?: (v: View) => void; store?: ModelStore }) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own, setView = onView ?? setOwn;
  const scale = useNarrow() ? 1.8 : 1;
  const { model, failed, retry } = useModel(store);
  const tr = useMemo(() => (model ? trace(model, prompt) : null), [model, prompt]);
  const tokens = useMemo(() => tr?.tokens.map(t => t.text) ?? piecesOf(prompt).read, [tr, prompt]);
  const n = tokens.length, q = n ? clamp(query ?? n - 1, 0, n - 1) : -1;
  const o: EngineOpts = { tokens, attention: tr?.attention, layer, head, query: q, scale };
  return (
    <div className="tc-stage tf-stage" data-model={model ? 'ready' : failed ? 'failed' : 'loading'}>
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>Picture</button>
        <button type="button" className="chip" aria-pressed={view === 'attn'} onClick={() => setView('attn')}>Attention</button>
      </div>
      <div className="tc-frame tf-frame">
        {view === 'scene' || !tr
          ? <IsoStage className="engine" board={ENGINE_BOARD} style={FILL} scene={engineScene(o)} label={engineLabel(o)} />
          : <AttentionView tokens={tokens} weights={tr.attention[layer]?.[head] ?? []} top={tr.top} layer={layer} head={head} query={q} />}
        {!model && (
          failed
            ? <div className="tf-wait" role="alert"><p>Couldn’t load Larkspur mini.</p><button type="button" className="chip" onClick={retry}>Retry</button></div>
            : <p className="tf-wait tf-pill" role="status">Loading Larkspur mini</p>
        )}
      </div>
      <p className="tc-caption">
        <span className="lbl">
          {`Layer ${layer + 1} · head ${head + 1}${q >= 0 ? ` · token ${q + 1} of ${n} (${pieceLabel(tokens[q])})` : ' · no tokens yet'}`}
          {tr?.truncated && ` · reads the last ${CTX} tokens`}
        </span>
        {caption && <span className="txt">{caption}</span>}
      </p>
    </div>
  );
}
