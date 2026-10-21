// The shared byte-level BPE over Larkspur's documents: ids 0-255 are raw bytes, 256 + i is merge i.
// Works on UTF-8 bytes, so any string encodes (no unknown token) and decodes back exactly.
import MERGES from '../../../data/lm/merges.json' with { type: 'json' };
import { BYTE_TOKENS, SPLIT, mergePair, type Merge } from './bpe-train.ts';

const merges = MERGES as Merge[];
const rank = new Map(merges.map(([a, b], i) => [a * 65536 + b, i]));

/** Each token's bytes; the vocabulary is derived from the merges, never stored. */
export const vocab: Uint8Array[] = Array.from({ length: BYTE_TOKENS }, (_, i) => Uint8Array.of(i));
for (const [a, b] of merges) {
  const v = new Uint8Array(vocab[a].length + vocab[b].length);
  v.set(vocab[a]);
  v.set(vocab[b], vocab[a].length);
  vocab.push(v);
}
export const VOCAB_SIZE = vocab.length;

const enc = new TextEncoder();
// ignoreBOM: keep a leading U+FEFF, or it would vanish on the way back.
const dec = new TextDecoder('utf-8', { ignoreBOM: true });
const strict = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

const chunks = (text: string) => (text.match(SPLIT) ?? []).map((w) => [...enc.encode(w)]);

/** The pair in ids with the lowest merge rank, or -1. */
function lowest(ids: number[]): number {
  let best = -1;
  for (let i = 0; i < ids.length - 1; i++) {
    const r = rank.get(ids[i] * 65536 + ids[i + 1]);
    if (r !== undefined && (best < 0 || r < best)) best = r;
  }
  return best;
}

export function encode(text: string): number[] {
  return chunks(text).flatMap((ids) => {
    for (let r = lowest(ids); r >= 0; r = lowest(ids)) ids = mergePair(ids, merges[r][0], merges[r][1], BYTE_TOKENS + r);
    return ids;
  });
}

export function decode(ids: number[]): string {
  const bytes = new Uint8Array(ids.reduce((n, id) => n + vocab[id].length, 0));
  let o = 0;
  for (const id of ids) { bytes.set(vocab[id], o); o += vocab[id].length; }
  return dec.decode(bytes);
}

export const pieceBytes = (id: number) => vocab[id];

/** The token's text, or null when its bytes are only part of a character (show them as byte chips). */
export function pieceText(id: number): string | null {
  try { return strict.decode(vocab[id]); } catch { return null; }
}

export type TraceStep = { id: number; pair: Merge; count: number; ids: number[] };

/**
 * Replays the merges on text in rank order, one step per merge that fires: the pair, how many times
 * it fired, and the whole token list after it. Ends at encode(text), since a merge only ever makes
 * pairs of higher rank than itself.
 */
export function mergeTrace(text: string): { start: number[]; steps: TraceStep[] } {
  let cs = chunks(text);
  const next = () => cs.reduce((m, c) => { const x = lowest(c); return x >= 0 && x < m ? x : m; }, Infinity);
  const start = cs.flat(), steps: TraceStep[] = [];
  for (let r = next(); Number.isFinite(r); r = next()) {
    const [a, b] = merges[r];
    const before = cs.reduce((n, c) => n + c.length, 0);
    cs = cs.map((c) => mergePair(c, a, b, BYTE_TOKENS + r));
    const ids = cs.flat();
    steps.push({ id: BYTE_TOKENS + r, pair: [a, b], count: before - ids.length, ids });
  }
  return { start, steps };
}
