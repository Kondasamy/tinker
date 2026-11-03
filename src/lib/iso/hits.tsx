// In-picture handling (KTD4): transparent, aria-hidden targets over a scene's parts, drawn as IsoStage children (outside
// the wobble filter, in the art's coordinates). A drag or tap calls `act`, the same handler the twin control beside the
// stage calls, so state has one way in; the piece snaps back after every drop, and `act` writes any refusal to the
// status line, the same as for the twin. The twin is the accessible path; this layer is the delight.
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { P, withFrame } from './core.js';
import { frameFor, stageFrame, type Board } from './IsoStage';

export interface Hit {
  /** the scene part, written as data-hit */
  part: string;
  /** 3-D points of its footprint (board x, y, height z); the target is their projected box, padded to 44 px */
  at: number[][];
  /** drag: picked up and dropped on a `drop`; tap: pressed; drop: a place a dragged piece may land (never pressed) */
  kind: 'drag' | 'tap' | 'drop';
}
/** A drag in flight, in the art's units: the kit draws the lifted piece offset by (dx, dy) in its moving layer. */
export interface Drag {
  part: string;
  dx: number;
  dy: number;
  /** the drop target under the pointer */
  over?: string;
}
interface Props {
  board: Board;
  view?: number;
  hits: Hit[];
  /** moving or zoomed: every target is inert (R11) */
  busy?: boolean;
  /** the shared handler the twin calls too: a tap is act(part), a drop act(part, target). It owns the status line,
   * refusals included (say why there); the layer snaps the piece back either way */
  act: (part: string, to?: string) => unknown;
  /** whether `to` would take `part`, to light it while hovered (default: every drop target) */
  legal?: (part: string, to: string) => boolean;
  onDrag?: (d: Drag | null) => void;
  /** change it when a step opens: on touch screens the targets pulse once */
  pulse?: unknown;
}

// shortcut: assumes the stage is about 358 CSS px wide at 390 (16 px gutters, 2 px spare for rounding); a narrower
// stage would need a measured CTM
const PHONE_STAGE = 356,
  MIN_PX = 44,
  SLOP = 2; // art units a press may wander and still be a tap

type Box = { x: number; y: number; w: number; h: number };
const inside = (b: Box, p: { x: number; y: number }) =>
  p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

export default function HitLayer({ board, view = 0, hits, busy, act, legal = () => true, onDrag, pulse }: Props) {
  const g = useRef<SVGGElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<(Drag & { x0: number; y0: number }) | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const fr = stageFrame(board, view),
    min = (MIN_PX * frameFor(board).w) / PHONE_STAGE;
  const boxes = withFrame(fr, () =>
    hits.map(h => {
      const q = h.at.map(p => P(p[0], p[1], p[2] ?? 0));
      const xs = q.map(p => p[0]),
        ys = q.map(p => p[1]);
      const x0 = Math.min(...xs),
        y0 = Math.min(...ys);
      const w = Math.max(...xs) - x0,
        h2 = Math.max(...ys) - y0;
      const W = Math.max(w, min),
        H = Math.max(h2, min);
      return { x: x0 - (W - w) / 2, y: y0 - (H - h2) / 2, w: W, h: H };
    }),
  );

  const end = () => {
    setDrag(null);
    onDrag?.(null);
  };
  useEffect(() => {
    if (!drag) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && end();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [!drag]);
  useEffect(() => {
    if (!matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 900);
    return () => clearTimeout(t);
  }, [pulse]);

  // pointer → the art's coordinates (this group shares IsoStage's camera)
  const at = (e: PointerEvent) => {
    const m = g.current?.getScreenCTM?.();
    return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : { x: e.clientX, y: e.clientY };
  };
  const overAt = (p: { x: number; y: number }) => hits.find((h, i) => h.kind === 'drop' && inside(boxes[i], p))?.part;

  const down = (e: PointerEvent) => {
    const part = (e.target as Element).closest('[data-hit]')?.getAttribute('data-hit');
    const hit = hits.find(h => h.part === part);
    if (busy || !hit || hit.kind === 'drop') return;
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}
    const p = at(e);
    setDrag({ part: hit.part, x0: p.x, y0: p.y, dx: 0, dy: 0 });
  };
  const move = (e: PointerEvent) => {
    if (!drag || hits.find(h => h.part === drag.part)?.kind !== 'drag') return;
    const p = at(e),
      d = { ...drag, dx: p.x - drag.x0, dy: p.y - drag.y0, over: overAt(p) };
    setDrag(d);
    onDrag?.({ part: d.part, dx: d.dx, dy: d.dy, over: d.over });
  };
  const up = (e: PointerEvent) => {
    if (!drag) return;
    const p = at(e),
      moved = Math.hypot(p.x - drag.x0, p.y - drag.y0) > SLOP,
      over = overAt(p);
    end();
    if (!moved) act(drag.part);
    else if (over) act(drag.part, over); // a refusal needs nothing here: the piece is already back, act said why
  };

  const stateOf = (h: Hit) =>
    drag?.part === h.part
      ? 'dragging'
      : drag && h.kind === 'drop' && drag.over === h.part && legal(drag.part, h.part)
        ? 'glow'
        : hover === h.part && !drag && h.kind !== 'drop'
          ? 'hover'
          : 'idle';

  return (
    <g
      ref={g}
      className="iso-hits"
      aria-hidden="true"
      pointerEvents={busy ? 'none' : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={end}
    >
      {hits.map((h, i) => {
        const b = boxes[i],
          st = stateOf(h);
        return (
          <g
            key={h.part}
            data-hit={h.part}
            data-state={st}
            onPointerEnter={() => setHover(h.part)}
            onPointerLeave={() => setHover(x => (x === h.part ? null : x))}
          >
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={4}
              fill="transparent"
              pointerEvents={h.kind === 'drop' ? 'none' : undefined}
              stroke={
                st === 'hover' || st === 'glow' || (pulsing && st === 'idle' && h.kind !== 'drop')
                  ? 'var(--acc, #f4b829)'
                  : 'none'
              }
              strokeWidth={st === 'glow' ? 4 : 2}
              strokeDasharray={st === 'glow' ? undefined : '6 4'}
              vectorEffect="non-scaling-stroke"
              style={{
                cursor:
                  h.kind === 'drag'
                    ? st === 'dragging'
                      ? 'grabbing'
                      : 'grab'
                    : h.kind === 'tap'
                      ? 'pointer'
                      : undefined,
                touchAction: h.kind === 'drag' ? 'none' : 'manipulation',
              }}
            >
              {pulsing && h.kind !== 'drop' && (
                <animate attributeName="stroke-opacity" values="0;1;0" dur="0.9s" fill="freeze" />
              )}
            </rect>
          </g>
        );
      })}
    </g>
  );
}
