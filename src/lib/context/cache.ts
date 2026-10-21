// Prompt caching for the Context module (KTD7): which tokens of a turn are read from the cache, which are written to it,
// and what the turn costs with the dated multipliers in facts.json. Breakpoints, lifetime and prices are host-only.
import { fact } from './facts';
import type { Part } from './window';

const num = (id: string) => Number(fact(id).value);
/** Cost multipliers on the base input token price. */
export const READ = num('cache-read');
export const WRITE = { '5m': num('cache-write-5m'), '1h': num('cache-write-1h') } as const;
export const OUTPUT = num('output-ratio');
export type Lifetime = keyof typeof WRITE;
export const LIFETIME_MINUTES: Record<Lifetime, number> = { '5m': num('cache-lifetime'), '1h': 60 };

/** Where a breakpoint sits: after the last part of that kind, or after the whole window (`end`). */
export type Breakpoint = 'tools' | 'system' | 'memory' | 'docs' | 'end';

/** The part indexes a breakpoint closes, ascending; a kind the window lacks sets none. */
export function marks(parts: Part[], bps: Breakpoint[]): number[] {
  const at = (b: Breakpoint) => (b === 'end' ? parts.length - 1 : parts.findLastIndex((p) => p.kind === b));
  return [...new Set(bps.map(at).filter((i) => i >= 0))].sort((a, b) => a - b);
}

/** Tokens read from the cache, written to it, and sent fresh; `parts` is how many leading parts were read. */
export interface Hit { read: number; write: number; fresh: number; parts: number }
/** What the last call left in the cache: its parts and the breakpoints it wrote. */
export interface Cached { parts: Part[]; marks: number[] }

const sum = (parts: Part[], from: number, to: number) => parts.slice(from, to + 1).reduce((n, p) => n + p.tokens, 0);

/**
 * The hit is the prefix shared with the previous call, up to the last breakpoint at or before the first difference.
 * This call then writes everything after the hit up to its own last breakpoint.
 * shortcut: no minimum cacheable length (facts: 512 to 4,096 tokens by model); Larkspur's windows are small on purpose.
 */
export function cacheHit(prev: Cached | null, parts: Part[], bps: Breakpoint[]): Hit {
  let diff = 0;
  while (prev && diff < parts.length && diff < prev.parts.length && prev.parts[diff].text === parts[diff].text) diff++;
  const end = Math.max(-1, ...(prev?.marks ?? []).filter((m) => m < diff));
  const last = Math.max(-1, ...marks(parts, bps));
  const read = sum(parts, 0, end), write = last > end ? sum(parts, end + 1, last) : 0;
  return { read, write, fresh: sum(parts, 0, parts.length - 1) - read - write, parts: end + 1 };
}

/** A call's cost in base input tokens: fresh at 1, hits at READ, writes at WRITE, the reply at OUTPUT. */
export function cost(h: Hit, output: number, lifetime: Lifetime): number {
  return h.fresh + h.read * READ + h.write * WRITE[lifetime] + output * OUTPUT;
}
