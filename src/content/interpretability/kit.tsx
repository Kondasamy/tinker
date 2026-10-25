// Pieces the Interpretability chapters share. Larkspur mini comes through Fine-tuning's loaders (one per page), so a
// step can wait on it. The stage is the fuse box, or the Lens tab: the logit lens at one position. Every string is
// React text here; the drawings escape theirs (esc) before they become SVG.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import type { Model } from '../../lib/lm/model';
import { decode, encode } from '../../lib/lm/bpe';
import { forward } from '../../lib/lm/model';
import { lens, STAGES, type Fuse } from '../../lib/interpretability/probe';
import { fact } from '../../lib/interpretability/facts';
import { FUSE_BOARD, fuseLabel, fuseScene, type FuseOpts } from '../../components/scenes/fuseScene';
import { lensGrid, lensLabel } from '../../components/scenes/lensGrid';
import { pieceLabel } from '../../components/scenes/attentionMap';
import { useNarrow } from '../tool-calling/kit';
import { ModelGate, loadModel, modelNow, useModel } from '../fine-tuning/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './interpretability.css';

export { ModelGate, loadModel };
/** Larkspur mini, once loaded: what a step's predicate reads, so no step advances before the weights are in. */
export const baseNow = (): Model | undefined => modelNow('base');
/** A step predicate that holds only once the model has loaded. */
export const whenLoaded =
  <S,>(pred: (s: S) => boolean) =>
  (s: S) =>
    !!baseNow() && pred(s);
/** The model for a component: undefined while loading. */
export const useBase = () => useModel('base');

/** A piece as the narration prints it: quoted, its leading space dropped (tables show pieces with ␣). */
export const said = (s: string) => `“${s.trim()}”`;
const pct = (p: number) => `${Math.round(p * 100)}%`;

/** A flat figure in the hand-drawn wobble. Its contents were escaped by the figure (esc). */
function Flat({
  fig,
  role,
  label,
  onKeyDown,
  svgRef,
}: {
  fig: { svg: string; w: number; h: number };
  role: string;
  label: string;
  onKeyDown?: (e: KeyboardEvent) => void;
  svgRef?: Ref<SVGSVGElement>;
}) {
  const id = 'ip' + useId().replace(/[^\w-]/g, '');
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${fig.w} ${fig.h}`}
      width={fig.w}
      role={role}
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the ink filter, built from numbers */}
      <defs dangerouslySetInnerHTML={{ __html: filterFor(1, id) }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup the figure built, every string escaped (esc) */}
      <g filter={`url(#${id})`} dangerouslySetInnerHTML={{ __html: fig.svg }} />
    </svg>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The Lens tab: a native range picks the position probed; the grid's cells are focusable (arrow keys move between
 * them) with a read-out line under it. */
export function LensView({
  model,
  prompt,
  pulled = [],
  watch,
}: {
  model: Model;
  prompt: string;
  pulled?: readonly Fuse[];
  watch?: string;
}) {
  const phone = useNarrow(),
    id = useId();
  const l = useMemo(() => lens(model, prompt, pulled), [model, prompt, pulled]);
  const n = l.tokens.length;
  const [pos, setPos] = useState(n - 1),
    [cell, setCell] = useState<[number, number]>([STAGES.length - 1, 0]);
  useEffect(() => setPos(n - 1), [n]);
  const p = clamp(pos, 0, Math.max(0, n - 1)),
    guesses = l.stages.map(st => st[p] ?? []);
  const svg = useRef<SVGSVGElement>(null),
    moved = useRef(false);
  useEffect(() => {
    if (moved.current) (svg.current?.querySelector('[tabindex="0"]') as SVGElement | null)?.focus();
    moved.current = false;
  });
  const onKey = (e: KeyboardEvent) => {
    const d: [number, number] | undefined = (
      { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] } as Record<
        string,
        [number, number]
      >
    )[e.key];
    if (!d) return;
    e.preventDefault();
    moved.current = true;
    setCell([clamp(cell[0] + d[0], 0, STAGES.length - 1), clamp(cell[1] + d[1], 0, 4)]);
  };
  const g = guesses[cell[0]]?.[cell[1]];
  return (
    <div className="ip-lens">
      <div className="ip-range">
        <label htmlFor={id}>
          <strong>{`Token ${p + 1} of ${n}: ${pieceLabel(l.tokens[p] ?? '')}`}</strong>
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={Math.max(0, n - 1)}
          step={1}
          value={p}
          aria-valuetext={`token ${p + 1}, ${pieceLabel(l.tokens[p] ?? '')}`}
          onChange={e => setPos(Number(e.target.value))}
        />
      </div>
      <Flat
        svgRef={svg}
        fig={lensGrid({ stages: STAGES, guesses, watch, phone, active: cell })}
        role="grid"
        label={lensLabel(p, l.tokens[p] ?? '')}
        onKeyDown={onKey}
      />
      <p className="ip-readout" aria-live="polite">
        {g ? `${STAGES[cell[0]]}, guess ${cell[1] + 1}: ${pieceLabel(g.text)} at ${pct(g.p)}` : 'Nothing to read yet.'}
      </p>
    </div>
  );
}

export type View = 'scene' | 'lens';
const FILL = { height: '100%' };
/** The chapters' stage: the fuse box (default) or the Lens tab, for one prompt run through Larkspur mini. The frame
 * holds a loading pill (or an error card with Retry) until the model is in, and the Lens tab stays off until then.
 * `pulled` fuses are drawn out and dark, and the lens reads the run with them pulled. The tab is the reader's view,
 * kept out of saved progress unless the chapter passes `view` and `onView`. */
export function InterpStage({
  prompt,
  pulled = [],
  layer = 0,
  head = 0,
  threads = false,
  watch,
  caption,
  view: kept,
  onView,
  locked = false,
  say,
}: {
  prompt: string;
  pulled?: readonly Fuse[];
  layer?: number;
  head?: number;
  threads?: boolean;
  /** a token the Lens tab marks wherever it appears */
  watch?: string;
  caption?: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  /** hold the picture and turn the Lens tab off while a prediction is open */
  locked?: boolean;
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = locked ? 'scene' : (kept ?? own),
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 1.8 : 1;
  const { model } = useBase();
  const run = useMemo(() => (model ? forward(model, encode(prompt)) : null), [model, prompt]);
  const tokens = run
    ? run.ids.map(i => decode([i]))
    : encode(prompt)
        .slice(-32)
        .map(i => decode([i]));
  const o: FuseOpts = { tokens, attention: run?.attention, layer, head, pulled, threads, scale, say };
  return (
    <div className="tc-stage ip-stage" data-model={model ? 'ready' : 'loading'}>
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'lens'}
          disabled={!model || locked}
          onClick={() => setView('lens')}
        >
          Lens
        </button>
      </div>
      <div className="tc-frame">
        {!model ? (
          <ModelGate weights="base">{() => null}</ModelGate>
        ) : view === 'lens' ? (
          <LensView model={model} prompt={prompt} pulled={pulled} watch={watch} />
        ) : (
          <IsoStage className="fuse" board={FUSE_BOARD} style={FILL} scene={fuseScene(o)} label={fuseLabel(o)} />
        )}
      </div>
      {caption && (
        <p className="tc-caption">
          <span className="txt">{caption}</span>
        </p>
      )}
    </div>
  );
}

/** The top 5 next pieces, likeliest first, as a list; `mark` is ringed wherever it appears. With `before`, each row
 * also shows the plain run's guess at that rank, so a change reads row by row. */
export function TopFive({
  top,
  before,
  mark,
  caption = 'Top 5 next pieces, computed in your browser',
}: {
  top: { text: string; p: number }[];
  before?: { text: string; p: number }[];
  mark?: string;
  caption?: string;
}) {
  const cell = (c: { text: string; p: number }) => (
    <td data-mark={c.text === mark ? '1' : undefined}>
      <code>{pieceLabel(c.text)}</code> {pct(c.p)}
    </td>
  );
  return (
    <table className="tc-ledger ip-top" data-in={mark !== undefined && top.some(c => c.text === mark) ? '1' : '0'}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          {before && <th scope="col">All fuses in</th>}
          <th scope="col">{before ? 'Now' : 'Next piece'}</th>
        </tr>
      </thead>
      <tbody>
        {top.map((c, i) => (
          <tr key={i}>
            <th scope="row">{i + 1}</th>
            {before?.[i] && cell(before[i])}
            {cell(c)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A cited fact from data/interpretability/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** The line every chapter keeps under its numbers (R6). */
export const OURS = 'Larkspur mini’s numbers, computed live in your browser: a tiny model, not any provider’s.';
