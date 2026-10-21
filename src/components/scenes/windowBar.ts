// Module 8's precise view (the Window tab): the window as one flat stacked bar, a segment per part in window order, each
// as wide as its tokens. The budget is a line across it; the room the host keeps free for the reply follows the parts,
// dashed, and anything that ends past the line is over. A cache hit brackets the shared prefix: exactly the parts read
// from the cache. Pure layout, so the tests check it without drawing; the kit draws it as React SVG (text nodes only).
import { PALS, METAL, CERAMIC } from '../../lib/iso/core.js';
import { num } from '../../lib/format';
import { REPLY_ROOM } from '../../lib/context/loop';
import type { Hit } from '../../lib/context/cache';
import type { PartKind, Window } from '../../lib/context/window';

type Mat = { l: string; m: string; d: string };
/** A part's colour, the same in the picture's papers and the bar's segments. Never colour alone: names go with them. */
export const KIND_PAL: Record<PartKind, Mat> = {
  tools: PALS.cobalt, system: PALS.mustard, memory: PALS.blush, docs: CERAMIC, history: METAL, message: PALS.mint,
};
export const KIND_NAME: Record<PartKind, string> = {
  tools: 'tools', system: 'system prompt', memory: 'memory notes', docs: 'documents', history: 'history', message: 'this turn',
};
/** the word a segment wears when it is wide enough */
const SHORT: Record<PartKind, string> = { tools: 'TOOLS', system: 'SYS', memory: 'MEM', docs: 'DOCS', history: 'HIST', message: 'NOW' };

export interface Seg {
  i: number; kind: PartKind; label: string; tokens: number;
  /** where it sits along the window, in tokens */
  from: number; to: number;
  /** where it is drawn, in the bar's units */
  x: number; w: number;
  /** read from the cache (inside the hit's shared prefix) */
  cached: boolean;
  /** ends past the budget line */
  over: boolean;
  cleared: boolean;
  /** its short word, when it fits inside the segment */
  word: string;
}
export interface BarOpts { budget: number; hit?: Hit | null; room?: number; phone?: boolean }

const DESK = { w: 600, pad: 16, fs: 10 }, PHONE = { w: 300, pad: 10, fs: 11 };
const fits = (s: string, w: number, fs: number) => s.length * fs * .62 + fs < w;

/** The bar's layout. The scale fits the budget or the whole window, whichever is longer, so an over-budget window is
 * drawn past the line instead of off the edge. An empty window draws an empty bar (never divides by zero). */
export function windowBar(win: Window | null, { budget, hit, room = REPLY_ROOM, phone = false }: BarOpts) {
  const L = phone ? PHONE : DESK, parts = win?.parts ?? [], total = win?.tokens ?? 0;
  const k = (L.w - L.pad * 2) / Math.max(budget, total + room, 1), shared = hit?.parts ?? 0;
  let at = 0;
  const segs: Seg[] = parts.map((p, i) => {
    const s = { i, kind: p.kind, label: p.label, tokens: p.tokens, from: at, to: at + p.tokens, x: L.pad + at * k, w: p.tokens * k,
      cached: i < shared, over: at + p.tokens > budget, cleared: !!p.cleared, word: '' };
    s.word = [`${SHORT[p.kind]} ${num(p.tokens)}`, SHORT[p.kind]].find(t => fits(t, s.w, L.fs)) ?? '';
    at += p.tokens;
    return s;
  });
  return {
    segs, k, total, budget, w: L.w, pad: L.pad, fs: L.fs,
    /** the budget line */
    line: L.pad + budget * k,
    /** the reply's room, after the parts */
    room: { from: total, to: total + room, x: L.pad + total * k, w: room * k },
    over: !!win && total + room > budget,
    /** tokens read from the cache, and where the shared prefix ends */
    cached: hit?.read ?? 0, cacheEnd: L.pad + segs.filter(s => s.cached).reduce((n, s) => n + s.tokens, 0) * k,
  };
}
export type Bar = ReturnType<typeof windowBar>;

/** A segment's name, for the list and the read-out line. */
export const segName = (s: Seg, n: number) =>
  `Part ${s.i + 1} of ${n}: ${s.label} (${KIND_NAME[s.kind]}), ${num(s.tokens)} tokens${s.cleared ? ', cleared' : ''}`
  + `${s.cached ? ', read from the cache' : ''}${s.over ? ', past the budget' : ''}`;

/** The bar in words, for its label. */
export function barLabel(b: Bar): string {
  if (!b.segs.length) return `The window is empty. Budget: ${num(b.budget)} tokens.`;
  return `The window: ${b.segs.length} parts, ${num(b.total)} tokens, plus ${num(b.room.to - b.room.from)} kept for the reply, `
    + `${b.over ? 'over' : 'within'} the ${num(b.budget)}-token budget${b.cached ? `; ${num(b.cached)} tokens read from the cache` : ''}.`;
}
