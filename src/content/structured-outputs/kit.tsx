// Pieces the structured outputs chapters share: Larkspur mini (Transformers' store, so one model per page), a run
// decoded live under a schema, the stage (the stencil press, or the mask over the whole vocabulary) and its caption.
// Token text is React text here; the drawings escape theirs (esc) before they become SVG.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { VOCAB_SIZE, decode as text } from '../../lib/lm/bpe';
import type { Model } from '../../lib/lm/model';
import { decode, type Decoded } from '../../lib/structured-outputs/decode';
import { compile, type Grammar, type ObjectSchema } from '../../lib/structured-outputs/grammar';
import { play, run as pinned } from '../../lib/structured-outputs/prompts';
import { fact } from '../../lib/structured-outputs/facts';
import { STENCIL_BOARD, pieceWord, stencilLabel, stencilScene, type StencilOpts } from '../../components/scenes/stencilScene';
import { gridLabel, maskGrid } from '../../components/scenes/maskGrid';
import { Flat, MODEL, useModel, type ModelStore } from '../transformers/kit';
import { useNarrow } from '../tool-calling/kit';
import './structured.css';

export { MODEL, Waiting, modelNow, modelStore, useModel, whenLoaded } from '../transformers/kit';

/** A pinned run (data/structured-outputs/prompts.json) decoded live once the model has loaded. */
export function usePinned(id: string, store: ModelStore = MODEL) {
  const { model } = useModel(store);
  return useMemo(() => (model ? play(model, pinned(id)) : null), [model, id]);
}

/** Any prompt and schema decoded live (null schema: no mask). */
export function decodeWith(model: Model, prompt: string, schema: ObjectSchema | null, seed?: number): { grammar: Grammar | null; decoded: Decoded } {
  const grammar = schema && compile(schema);
  return { grammar, decoded: decode(model, prompt, grammar, seed === undefined ? {} : { seed }) };
}

/** A piece as the story column prints it: quoted, a leading space as ␣. */
export const piece = (s: string) => `“${pieceWord(s)}”`;
const pct = (p: number) => (p >= .995 ? '>99%' : p > 0 && p < .005 ? '<1%' : `${Math.round(p * 100)}%`);
export { pct };

/** The stencil press's options at `at` tokens written: the step about to be taken, or the finished answer. */
export function stencilAt(prompt: string, d: Decoded | null, at: number, masked: boolean, scale = 1): StencilOpts {
  if (!d) return { prompt, written: [], allowed: masked ? VOCAB_SIZE : null, scale };
  const n = Math.min(at, d.ids.length), st = d.steps[n];
  const done = n >= d.ids.length;
  const blocked = st && masked && !st.allowed.includes(st.free.id) ? st.free.text : null;
  return { prompt, written: d.ids.slice(0, n).map(id => text([id])), allowed: masked ? (st ? st.allowed.length : 0) : null, hideCount: done, blocked, done, scale };
}

/** The Mask tab: the vocabulary grid at one step, then the likeliest allowed tokens as a list the arrow keys move
 * through, with a read-out line under it. */
export function MaskView({ d, at }: { d: Decoded; at: number }) {
  const phone = useNarrow(), st = d.steps[Math.min(at, d.steps.length - 1)];
  const [cur, setCur] = useState(0), items = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => setCur(0), [at]);
  if (!st) return <p className="so-readout">Nothing to decode.</p>;
  const top = st.top, n = top.length, i = Math.min(cur, n - 1);
  const go = (j: number) => { const k = Math.max(0, Math.min(n - 1, j)); setCur(k); items.current[k]?.focus(); };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
    if (to !== undefined) { e.preventDefault(); go(to); }
  };
  const blocked = !st.allowed.includes(st.free.id);
  const name = (k: number) => `${piece(top[k].text)}: ${pct(top[k].p)}${top[k].id === st.pick.id ? ', written' : ''}`;
  return (
    <div className="so-mask">
      <Flat fig={maskGrid({ vocab: VOCAB_SIZE, allowed: st.allowed, pick: st.pick.id, free: st.free.id, phone })} role="img" label={gridLabel(VOCAB_SIZE, st.allowed.length)} />
      <p className="so-count" data-testid="mask-count">{`${st.allowed.length} of ${VOCAB_SIZE} tokens allowed at step ${Math.min(at, d.steps.length - 1) + 1}`}
        {blocked && <> · the model wanted {piece(st.free.text)} ({pct(st.free.p)}): blocked</>}</p>
      <ol className="so-top" aria-label="The likeliest allowed tokens, after the mask" onKeyDown={key}>
        {top.map((c, k) => (
          <li key={c.id} ref={el => { items.current[k] = el; }} tabIndex={k === i ? 0 : -1} aria-label={name(k)}
            aria-current={k === i ? 'true' : undefined} data-pick={c.id === st.pick.id || undefined} onFocus={() => setCur(k)}>
            <span className="so-piece" aria-hidden="true">{pieceWord(c.text)}</span>
            <span className="so-bar" aria-hidden="true" style={{ width: `${Math.max(2, c.p * 100)}%` }} />
            <span className="so-p" aria-hidden="true">{pct(c.p)}</span>
          </li>
        ))}
      </ol>
      <p className="so-readout" aria-live="polite">{name(i)}</p>
    </div>
  );
}

export type View = 'scene' | 'mask';
const FILL = { height: '100%' };
/** The chapters' stage: the stencil press (default) or the mask, one at a time, for one decoded run at `at` tokens
 * written. While the model loads the frame keeps its size with a loading pill; a failed load shows Retry. The Mask tab
 * is off with no schema (there is no mask), before the model loads, and while a prediction is open (`locked`). */
export function StructuredStage({ prompt, d, at, masked = true, caption, view: kept, onView, locked = false, store = MODEL }:
  { prompt: string; d: Decoded | null; at: number; masked?: boolean; caption?: ReactNode; view?: View; onView?: (v: View) => void; locked?: boolean; store?: ModelStore }) {
  const [own, setOwn] = useState<View>('scene');
  const canMask = !!d && masked && !locked;
  const view = canMask ? kept ?? own : 'scene', setView = onView ?? setOwn;
  const scale = useNarrow() ? 1.8 : 1;
  const { model, failed, retry } = useModel(store);
  const live = stencilAt(prompt, model ? d : null, at, masked, scale);
  // while a prediction is open the picture keeps the answer back: no count on the plate, no blocked tile
  const o = locked ? { ...live, hideCount: true, blocked: null } : live;
  const n = d ? Math.min(at, d.ids.length) : 0;
  return (
    <div className="tc-stage so-stage" data-model={model ? 'ready' : failed ? 'failed' : 'loading'}>
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>Picture</button>
        <button type="button" className="chip" aria-pressed={view === 'mask'} disabled={!canMask || !model} onClick={() => setView('mask')}>Mask</button>
      </div>
      <div className="tc-frame tf-frame">
        {view === 'scene' || !d || !model
          ? <IsoStage board={STENCIL_BOARD} style={FILL} scene={stencilScene(o)} label={stencilLabel(o)} />
          : <MaskView d={d} at={n} />}
        {!model && (
          failed
            ? <div className="tf-wait" role="alert"><p>Couldn’t load Larkspur mini.</p><button type="button" className="chip" onClick={retry}>Retry</button></div>
            : <p className="tf-wait tf-pill" role="status">Loading Larkspur mini</p>
        )}
      </div>
      <p className="tc-caption">
        <span className="lbl" data-testid="so-written">
          {d && model ? `${n} of ${d.ids.length} tokens written${n >= d.ids.length ? ` · ${d.status === 'done' ? 'finished' : 'cut off'}` : ''}` : 'Larkspur mini'}
          {masked ? '' : ' · no schema'}
        </span>
        {caption && <span className="txt">{caption}</span>}
      </p>
    </div>
  );
}

/** The stage for a pinned run, decoded in the browser once the model has loaded. */
export function PinnedStage({ id, store = MODEL, ...rest }: { id: string; at: number; masked?: boolean; caption?: ReactNode; view?: View; onView?: (v: View) => void; locked?: boolean; store?: ModelStore }) {
  const p = usePinned(id, store);
  return <StructuredStage prompt={pinned(id).prompt} d={p?.decoded ?? null} store={store} {...rest} />;
}

/** An answer as the model wrote it, in a code block. */
export const Answer = ({ text: t, label }: { text: string; label?: string }) => (
  <figure className="so-answer">
    {label && <figcaption>{label}</figcaption>}
    <pre><code>{t}</code></pre>
  </figure>
);

/** A cited fact from data/structured-outputs/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <a className="source" href={f.source} target="_blank" rel="noreferrer">Source: {new URL(f.source).hostname}</a> (checked {f.accessed})
    </p>
  );
}
