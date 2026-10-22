// Every chunk on a 2D map (PCA of its 384 numbers, precomputed per config, KTD11). Hover, focus or tap a dot:
// its TRUE cosine to the question sits next to its on-screen distance, because flattening bends distances (R14).
import { useRef, useState } from 'react';
import type { Outcome } from '../canvas/state';
import type { RagIndex } from '../../lib/rag/load';
import { fit, projectQuery, screenDistance } from './logic';
import './panels.css';

const SIZE = 300,
  PAD = 14,
  FOCUSABLE = 10;

export default function ProjectionMap({
  out,
  index,
  onProbe,
}: {
  out: Outcome | null;
  index: RagIndex | null;
  onProbe?: () => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [probe, setProbe] = useState<{ id: number; px: number } | null>(null);
  const r = out?.record,
    cfg = r && index?.get(r.file);
  if (!r || !cfg || !index) return <p className="note">The map appears once a question reaches the index.</p>;

  const cos = new Map(r.stages.vector.ids.map((id, i) => [id, r.stages.vector.scores[i]]));
  const pts = Array.from({ length: cfg.N }, (_, c) => [cfg.xy[c * 2], cfg.xy[c * 2 + 1]] as [number, number]);
  const D = cfg.D;
  const q = projectQuery(
    index.queries.subarray(r.queryIndex * D, (r.queryIndex + 1) * D),
    index.manifest.quantization.vectors.scale,
    cfg.mean,
    cfg.pc1,
    cfg.pc2,
  );
  const to = fit([...pts, q], SIZE, PAD);
  const xy = pts.map(to),
    qxy = to(q);
  const got = new Set(r.context.map(c => c.id));
  const nearest = r.stages.vector.ids.slice(0, FOCUSABLE); // keyboard reaches the best matches, not every dot

  const show = (id: number) => {
    const w = svg.current?.getBoundingClientRect().width ?? SIZE;
    setProbe({ id, px: screenDistance(xy[id], qxy, w / SIZE) });
    onProbe?.();
  };
  const idOf = (t: EventTarget) => Number((t as Element).getAttribute?.('data-i') ?? NaN);
  const dot = (id: number, focusable: boolean) => (
    <circle
      key={id}
      data-i={id}
      cx={xy[id][0]}
      cy={xy[id][1]}
      r={got.has(id) ? 4.5 : focusable ? 3.4 : 2.2}
      className={`pt${got.has(id) ? ' got' : ''}${probe?.id === id ? ' on' : ''}`}
      {...(focusable
        ? {
            tabIndex: 0,
            role: 'button',
            'aria-label': `Chunk from ${index.corpus[cfg.ranges[id * 3]].title}${got.has(id) ? ', retrieved' : ''}`,
            onFocus: () => show(id),
          }
        : {})}
    />
  );
  const p = probe && cos.has(probe.id) ? probe : null;

  return (
    <div className="map">
      <svg
        ref={svg}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="group"
        aria-label="Map of every chunk by meaning. Tab to the nearest chunks."
        onPointerOver={e => {
          const id = idOf(e.target);
          if (id >= 0) show(id);
        }}
        onClick={e => {
          const id = idOf(e.target);
          if (id >= 0) show(id);
        }}
      >
        {pts.map((_, id) => (nearest.includes(id) ? null : dot(id, false)))}
        {nearest.map(id => dot(id, true))}
        {p && <line x1={qxy[0]} y1={qxy[1]} x2={xy[p.id][0]} y2={xy[p.id][1]} className="ruler" />}
        <path
          d={`M${qxy[0]} ${qxy[1] - 7}L${qxy[0] + 7} ${qxy[1]}L${qxy[0]} ${qxy[1] + 7}L${qxy[0] - 7} ${qxy[1]}Z`}
          className="query"
        />
      </svg>
      <p className="readout" aria-live="polite" data-testid="map-readout">
        {p ? (
          <>
            <span className="said">“{cfg.texts[p.id].split(' ').slice(0, 12).join(' ')}…”</span>
            <span>
              <b>True similarity {cos.get(p.id)!.toFixed(3)}</b> · {Math.round(p.px)} px from your question on screen
            </span>
          </>
        ) : (
          'Point at a dot, or Tab to one, to compare its true similarity with how close it looks.'
        )}
      </p>
      <p className="legend">
        <span className="q">◆ your question</span> <span className="got">● retrieved</span> <span>· other chunks</span>
      </p>
    </div>
  );
}
