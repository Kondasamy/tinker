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
  const at = (b: Breakpoint) => (b === 'end' ? parts.length - 1 : parts.findLastIndex(p => p.kind === b));
  return [...new Set(bps.map(at).filter(i => i >= 0))].sort((a, b) => a - b);
}

/** Tokens read from the cache, written to it, and sent fresh; `parts` is how many leading parts were read. */
export interface Hit {
  read: number;
  write: number;
  fresh: number;
  parts: number;
}
/** A live cache entry: a call's parts and the prefix ends (breakpoints) cached from it. */
export interface Cached {
  parts: Part[];
  marks: number[];
}

const sum = (parts: Part[], from: number, to: number) => parts.slice(from, to + 1).reduce((n, p) => n + p.tokens, 0);
const shared = (a: Part[], b: Part[]) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i].text === b[i].text) i++;
  return i;
};

/**
 * The hit is the longest live entry whose prefix still matches, up to its last breakpoint before the first difference.
 * This call then writes everything after the hit up to its own last breakpoint.
 * shortcut: no minimum cacheable length (facts: 512 to 4,096 tokens by model); Larkspur's windows are small on purpose.
 * shortcut: no limit on how far back the lookup reaches (the API checks about 20 blocks); Larkspur's windows are short.
 */
export function cacheHit(live: Cached[], parts: Part[], bps: Breakpoint[]): Hit {
  const end = Math.max(
    -1,
    ...live.flatMap(c => {
      const d = shared(c.parts, parts);
      return c.marks.filter(m => m < d);
    }),
  );
  const last = Math.max(-1, ...marks(parts, bps));
  const read = sum(parts, 0, end),
    write = last > end ? sum(parts, end + 1, last) : 0;
  return { read, write, fresh: sum(parts, 0, parts.length - 1) - read - write, parts: end + 1 };
}

/** The entry a call leaves: its own breakpoints, plus the prefix it read, which the read refreshed. */
export const entryOf = (h: Hit, parts: Part[], own: number[]): Cached => ({
  parts,
  marks: h.parts ? [h.parts - 1, ...own] : own,
});

/** A call's cost in base input tokens: fresh at 1, hits at READ, writes at WRITE, the reply at OUTPUT. */
export function cost(h: Hit, output: number, lifetime: Lifetime): number {
  return h.fresh + h.read * READ + h.write * WRITE[lifetime] + output * OUTPUT;
}
