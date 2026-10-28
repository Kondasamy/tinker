// Ranking (chapter 4): each candidate PIN's log-probability after a canary's prefix, under the canary model. The true
// PIN's rank among them gives its exposure (Carlini et al. 2019): log2(candidates) − log2(rank). Candidates share
// leading tokens, so each distinct partial PIN runs the model once, not each candidate.
import { forward, softmax, type Model } from '../lm/model';
import { mulberry32 } from '../transformers/sample';
import { CANDIDATES, type Canary } from './story';

/** A candidate's sequence log-probability after `prefix`; partial candidates already run are remembered. */
export function scorer(model: Model, prefix: number[]) {
  const seen = new Map<string, Float64Array>();
  const next = (part: number[]) => {
    const key = part.join(',');
    let lp = seen.get(key);
    if (!lp) {
      lp = softmax(forward(model, [...prefix, ...part]).logits.at(-1)!).map(Math.log);
      seen.set(key, lp);
    }
    return lp;
  };
  return (cand: number[]) => cand.reduce((s, t, i) => s + next(cand.slice(0, i))[t], 0);
}
export const logprobs = (model: Model, prefix: number[], cands: number[][]) => cands.map(scorer(model, prefix));

/** 1 + how many candidates the model rates strictly likelier than the true one, as train_canary.py counts it. */
export const rankIn = (lps: number[], truth: number) => 1 + lps.filter(x => x > lps[truth]).length;
export const exposure = (n: number, rank: number) => Math.log2(n) - Math.log2(rank);

/** The column for a canary: its true PIN first, then the pinned sample's PINs. */
export const columnPins = (c: Canary, sample: string[]) => [c.pin, ...sample];
export const idsOf = (pin: string) => CANDIDATES[Number(pin)];

/** The true PIN's place among `pins`, the true one first: each PIN's log-probability, the rank and the exposure. */
export function rankAmong(model: Model, c: Canary, pins: string[]) {
  const lps = pins.map(p => idsOf(p)).map(scorer(model, c.prefix.ids));
  const rank = rankIn(lps, 0);
  return { lps, rank, exposure: exposure(pins.length, rank) };
}

/** The pinned sample's draw (data/memorisation/candidates.json): `n` distinct PINs, uniform, none of `skip`. */
export function drawSample(seed: number, n: number, skip: string[]): string[] {
  const rnd = mulberry32(seed);
  const out: string[] = [];
  while (out.length < n) {
    const p = String(Math.floor(rnd() * 10_000)).padStart(4, '0');
    if (!skip.includes(p) && !out.includes(p)) out.push(p);
  }
  return out;
}
