import { useId, type ReactNode, type Ref, type SVGProps } from 'react';
import { P, INK_REF_VB, withFrame, board, boardTop, filterFor, inkScale } from './core.js';
import { BH } from './blocks';

export type Board = [x0: number, y0: number, x1: number, y1: number];
export interface SceneCtx { top: number[][] }   // board top outline, to clip cast shadows
export interface Frame { ox: number; oy: number; w: number; h: number; inkK: number; view: number; center: number[] }
/** k = magnification (1 = whole board); (u, v) = the point that stays put, as fractions of the frame */
export interface Zoom { k: number; u: number; v: number }

const PAD = 14, ROOM = 55;   // padding around the board; headroom for blocks standing on it

/** The frame a stage draws with at `view`: turned extents, whole-turn ink weight. */
export const stageFrame = (b: Board, view = 0): Frame => ({ ...frameFor(b, view), inkK: frameFor(b).inkK });

// Fit the board (plus ROOM of height) into a viewBox, like the prototype's frame(), turned `view` quarter turns about its centre.
// Every whole turn gives the same box; in between the box grows, so a turn reads as the camera pulling back a little.
export function frameFor([x0, y0, x1, y1]: Board, view = 0): Frame {
  const center = [(x0 + x1) / 2, (y0 + y1) / 2];
  const pts = withFrame({ view, center }, () => [x0, x1].flatMap(x => [y0, y1].flatMap(y => [0, ROOM].map(z => P(x, y, z)))));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minx = Math.min(...xs), miny = Math.min(...ys);
  const w = Math.max(...xs) - minx + PAD * 2, h = Math.max(...ys) - miny + PAD * 2 + 12;
  return { ox: PAD - minx, oy: PAD - miny, w, h, inkK: w / INK_REF_VB, view, center };
}

interface Props extends Omit<SVGProps<SVGSVGElement>, 'role' | 'ref' | 'children'> {
  board: Board;
  scene: string | ((ctx: SceneCtx) => string);
  label: string;
  light?: number;
  /** quarter turns about the board's centre (any real number) */
  view?: number;
  zoom?: Zoom;
  /** "img" for still figures; an interactive canvas passes "group" so its blocks stay reachable by screen readers */
  role?: 'img' | 'group';
  svgRef?: Ref<SVGSVGElement>;
  /** drawn after the art, outside the wobble filter (e.g. a wire being dragged) */
  children?: ReactNode;
}

export default function IsoStage({ board: b, scene, label, light = 105, view = 0, zoom, role = 'img', svgRef, children, ...rest }: Props) {
  const prefix = 'iso' + useId().replace(/[^\w-]/g, '') + '-';
  // the viewBox keeps the whole-turn box, so a turn never resizes the element; part turns (bigger) are scaled into it
  const base = frameFor(b), fr = stageFrame(b, view);
  const fit = Math.min(base.w / fr.w, base.h / fr.h);
  const cam = Math.abs(fit - 1) < 1e-9 ? undefined : `translate(${((base.w - fr.w * fit) / 2).toFixed(2)} ${((base.h - fr.h * fit) / 2).toFixed(2)}) scale(${fit.toFixed(4)})`;
  const k = zoom?.k ?? 1, vw = base.w / k, vh = base.h / k;
  const vx = (zoom?.u ?? .5) * (base.w - vw), vy = (zoom?.v ?? .5) * (base.h - vh);
  const art = withFrame({ ...fr, light, prefix }, () => {
    const top = boardTop(...b, BH, 8);
    return inkScale(board(...b, BH, 8) + (typeof scene === 'function' ? scene({ top }) : scene));
  });
  return (
    <svg {...rest} ref={svgRef} viewBox={`${+vx.toFixed(1)} ${+vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`} role={role} aria-label={label}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: k > 1 ? 'hidden' : 'visible', ...rest.style }}>
      <defs dangerouslySetInnerHTML={{ __html: filterFor(fr.inkK, prefix + 'hand') }} />
      {/* children share the camera, so they use the same coordinates as the art (pointer maths: this group's CTM) */}
      <g className="iso-cam" transform={cam}>
        <g filter={`url(#${prefix}hand)`} dangerouslySetInnerHTML={{ __html: art }} />
        {children}
      </g>
    </svg>
  );
}
