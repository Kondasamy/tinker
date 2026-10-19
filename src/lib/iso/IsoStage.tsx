import { useId } from 'react';
import { P0, INK_REF_VB, withFrame, board, boardTop, filterFor, inkScale } from './core.js';
import { BH } from './blocks';

export type Board = [x0: number, y0: number, x1: number, y1: number];
export interface SceneCtx { top: number[][] }   // board top outline, to clip cast shadows
export interface Frame { ox: number; oy: number; w: number; h: number; inkK: number }

const PAD = 14, ROOM = 55;   // padding around the board; headroom for blocks standing on it

// Fit the board (plus ROOM of height) into a viewBox, like the prototype's frame().
export function frameFor([x0, y0, x1, y1]: Board): Frame {
  const pts = withFrame({}, () => [x0, x1].flatMap(x => [y0, y1].flatMap(y => [0, ROOM].map(z => P0(x, y, z)))));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minx = Math.min(...xs), miny = Math.min(...ys);
  const w = Math.max(...xs) - minx + PAD * 2, h = Math.max(...ys) - miny + PAD * 2 + 12;
  return { ox: PAD - minx, oy: PAD - miny, w, h, inkK: w / INK_REF_VB };
}

interface Props {
  board: Board;
  scene: string | ((ctx: SceneCtx) => string);
  label: string;
  light?: number;
  className?: string;
}

export default function IsoStage({ board: b, scene, label, light = 105, className }: Props) {
  const prefix = 'iso' + useId().replace(/[^\w-]/g, '') + '-';
  const fr = frameFor(b);
  const art = withFrame({ ...fr, light, prefix }, () => {
    const top = boardTop(...b, BH, 8);
    return inkScale(board(...b, BH, 8) + (typeof scene === 'function' ? scene({ top }) : scene));
  });
  return (
    <svg className={className} viewBox={`0 0 ${fr.w.toFixed(1)} ${fr.h.toFixed(1)}`} role="img" aria-label={label}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      <defs dangerouslySetInnerHTML={{ __html: filterFor(fr.inkK, prefix + 'hand') }} />
      <g filter={`url(#${prefix}hand)`} dangerouslySetInnerHTML={{ __html: art }} />
    </svg>
  );
}
