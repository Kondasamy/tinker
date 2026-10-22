// Inference's speculative decoding (KTD7), real and greedy: the student drafts k tokens, Larkspur mini checks them in
// one forward pass, and the run keeps the longest prefix the target agrees with, plus the target's own next token.
// Every run is capped so no pass reads past the 32-token context: the checking pass then sees exactly what plain
// greedy decoding saw at each position, so the output is the same token for token (a test proves it).
import { forward, type Model } from '../lm/model';

/** The draft lengths the chapters step over; 0 is plain decoding, one target pass per token. */
export const KS = [0, 1, 2, 3, 4] as const;

export const argmax = (xs: ArrayLike<number>) => {
  let b = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[b]) b = i;
  return b;
};

/** The most new tokens a run may write: the last one is predicted from a full window, never from a cut one. */
export const maxNew = (target: Model, prompt: number[]) => Math.max(0, target.config.ctx - prompt.length + 1);

const replies = new WeakMap<Model, Map<string, number[]>>();
/** Plain greedy decoding: one target pass per new token. Cached per (model, prompt, n): the same array comes back, so don't mutate it. */
export function greedy(target: Model, prompt: number[], n: number): number[] {
  if (!replies.has(target)) replies.set(target, new Map());
  const done = replies.get(target)!,
    key = `${prompt.join()}|${n}`;
  if (!done.has(key)) done.set(key, greedyOnce(target, prompt, n));
  return done.get(key)!;
}

function greedyOnce(target: Model, prompt: number[], n: number): number[] {
  const ids = [...prompt],
    out: number[] = [];
  for (let i = 0; i < Math.min(n, maxNew(target, prompt)); i++) {
    const id = argmax(forward(target, ids).logits.at(-1)!);
    ids.push(id);
    out.push(id);
  }
  return out;
}

/** One check: what the student drafted, how many the target kept, and the token the target added itself. */
export interface Round {
  drafted: number[];
  accepted: number;
  added: number;
  truncated: boolean;
}
export interface SpecRun {
  prompt: number[];
  k: number;
  out: number[];
  rounds: Round[];
  /** target passes (one per round) */
  checks: number;
  drafted: number;
  accepted: number;
  /** accepted ÷ drafted (0 when nothing was drafted) */
  rate: number;
  /** new tokens per target pass */
  perCheck: number;
  /** the run stopped at the context limit before writing all it was asked for */
  capped: boolean;
}

/** Writes up to n tokens, drafting k at a time with `draft` and checking each draft with one `target` pass. */
export function speculate(target: Model, draft: Model, prompt: number[], k: number, n: number): SpecRun {
  const limit = Math.min(n, maxNew(target, prompt)),
    ids = [...prompt],
    out: number[] = [],
    rounds: Round[] = [];
  while (out.length < limit) {
    // leave room for the target's own token: a round writes at most kk + 1
    const kk = Math.min(k, limit - out.length - 1),
      drafted: number[] = [],
      d = [...ids];
    for (let i = 0; i < kk; i++) {
      const id = argmax(forward(draft, d).logits.at(-1)!);
      drafted.push(id);
      d.push(id);
    }
    const check = forward(target, [...ids, ...drafted]),
      base = ids.length - 1;
    let accepted = 0;
    while (accepted < kk && argmax(check.logits[base + accepted]) === drafted[accepted]) accepted++;
    const added = argmax(check.logits[base + accepted]);
    const kept = [...drafted.slice(0, accepted), added];
    ids.push(...kept);
    out.push(...kept);
    rounds.push({ drafted, accepted, added, truncated: check.truncated });
  }
  const drafted = rounds.reduce((s, r) => s + r.drafted.length, 0),
    accepted = rounds.reduce((s, r) => s + r.accepted, 0);
  return {
    prompt,
    k,
    out,
    rounds,
    checks: rounds.length,
    drafted,
    accepted,
    rate: drafted ? accepted / drafted : 0,
    perCheck: rounds.length ? out.length / rounds.length : 0,
    capped: limit < n,
  };
}
