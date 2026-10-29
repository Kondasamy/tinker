// Constants and helpers that blocks.ts and figures.ts both use: blocks draws the llm with the kit's model machine and the
// kit stands on the blocks' board, so they live here rather than in either (no import cycle).
import { INK, P, Dv, txM } from './core.js';

export const BH = 4; // board thickness: blocks stand at z = BH
export const HALF = 17; // half a block's footprint
export const STATE_COL = { ok: '#8af0ae', warn: '#ffd27a', bad: '#ff9b8a' };
export const STATE_TXT = { ok: 'OK', warn: '???', bad: '!!' };

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Text flat on the vertical face with outward normal n, centred at p; reads left to right from any turn of the view. */
export const faceText = (n: number[], p: number[], str: string, size: number, col = INK, weight = 700) =>
  `<text transform="${txM(P(p[0], p[1], p[2]), Dv(n[1], -n[0], 0), Dv(0, 0, -1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`;
