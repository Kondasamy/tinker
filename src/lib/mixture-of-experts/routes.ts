// Mixture of experts' routes (KTD4): Larkspur's toy experts model (public/data/mixture-of-experts/moe.bin) run live
// with the `routes` hook, and the reader's override through the `route` hook: one token's experts forced in every
// layer, so its guess reruns for real. Nothing runs at import; every function takes the loaded model.
import { forward, softmax, type Model, type Route } from '../lm/model';
import { encode, pieceText } from '../lm/bpe';
import data from '../../../data/mixture-of-experts/prompts.json' with { type: 'json' };
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };

/** The toy's shape and measured numbers, copied from meta.json (the engine test proves the copy). */
export const ROOMS = pinned.rooms;
export const EXPERTS = ROOMS.experts,
  TOP_K = ROOMS.topK,
  LAYERS = ROOMS.layers;
/** The picture and the controls show a prompt's last 8 tokens at most (KTD15). */
export const SHOWN = 8;

/** A token as the reader sees it: a leading space as ␣ only when the piece is all space, newlines as ↵. */
export function show(id: number): string {
  const t = pieceText(id);
  if (t === null) return '?';
  return t.trim() === '' && !t.includes('\n') ? '␣'.repeat(t.length) : t.replace(/\n/g, '↵');
}
/** A token quoted, as copy and pills write it. */
export const quote = (id: number) => `“${show(id)}”`;
export const pct = (p: number) => `${Math.round(p * 100)}%`;
/** A piece of text from meta.json (an expert's top token) the way show() writes a token. */
export const showPiece = (t: string) =>
  t.trim() === '' && !t.includes('\n') ? '␣'.repeat(t.length) : t.replace(/\n/g, '↵');
/** Rooms are numbered from 1 for readers; experts from 0 in the model. */
export const roomName = (e: number) => `Room ${e + 1}`;

export interface Prompt {
  id: string;
  text: string;
  /** the next token in the source text */
  expected: number;
  ids: number[];
}
const one = (piece: string) => {
  const ids = encode(piece);
  if (ids.length !== 1) throw new Error(`expected token “${piece}” is ${ids.length} tokens`);
  return ids[0];
};
export const PROMPTS: Prompt[] = data.prompts.map(p => ({
  id: p.id,
  text: p.text,
  expected: one(p.expected),
  ids: encode(p.text),
}));
export function promptOf(id: string): Prompt {
  const p = PROMPTS.find(x => x.id === id);
  if (!p) throw new Error(`unknown prompt: ${id}`);
  return p;
}
/** The positions the picture shows: the prompt's last SHOWN tokens. */
export const shownPositions = (ids: number[]) =>
  Array.from({ length: Math.min(SHOWN, ids.length) }, (_, i) => ids.length - Math.min(SHOWN, ids.length) + i);

/** The reader's override: position → the experts it is sent to, in every layer. */
export type Override = Record<number, number[]>;
export interface Guess {
  tok: number;
  p: number;
}
export interface Pass {
  /** the next token's five likeliest, best first */
  top: Guess[];
  /** [layer][position]: who ran, as the router chose or as forced */
  routes: Route[][];
}

/** Five likeliest next tokens from a row of logits, ties to the lower id. */
export function top5(logits: ArrayLike<number>): Guess[] {
  const p = softmax(logits);
  return Array.from(p, (v, tok) => ({ tok, p: v }))
    .sort((a, b) => b.p - a.p || a.tok - b.tok)
    .slice(0, 5);
}

/** Every layer forced the same way for the overridden positions. */
export const asRoute = (o: Override): Record<number, Record<number, number[]>> =>
  Object.fromEntries(Array.from({ length: LAYERS }, (_, l) => [l, o]));

/** One pass: the guess and the routes, with the reader's override (and any per-layer forcing, for capacity). */
export function run(model: Model, ids: number[], override: Override = {}, layers?: Record<number, Override>): Pass {
  const route = layers ?? (Object.keys(override).length ? asRoute(override) : undefined);
  const out = forward(model, ids, route ? { routes: true, route } : { routes: true });
  return { top: top5(out.logits.at(-1)!), routes: out.routes! };
}

/** How many tokens each expert takes in one layer of a pass. */
export function loadOf(routes: Route[][], layer: number): number[] {
  const c = new Array<number>(EXPERTS).fill(0);
  for (const r of routes[layer]) for (const e of r.experts) c[e]++;
  return c;
}

/** Each expert's share of top-k assignments per layer over documents, read in evaluate()'s windows (as train_moe.py). */
export function routeShares(model: Model, docs: number[][]): number[][] {
  const ctx = model.config.ctx,
    c = Array.from({ length: LAYERS }, () => new Array<number>(EXPERTS).fill(0));
  for (const doc of docs)
    for (let s = 0; s < doc.length - 1; s += ctx) {
      const routes = forward(model, doc.slice(s, s + ctx + 1).slice(0, -1), { routes: true }).routes!;
      routes.forEach((layer, l) => {
        for (const r of layer) for (const e of r.experts) c[l][e]++;
      });
    }
  return c.map(row => {
    const n = row.reduce((a, b) => a + b, 0);
    return row.map(v => v / n);
  });
}

/** Dense mode for chapter 1's picture: every expert in every layer, as one big kitchen would run. */
export const ALL = Array.from({ length: EXPERTS }, (_, e) => e);
