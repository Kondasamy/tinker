// What a model remembers: the canaries and the canary model's runs, read as written by scripts/train/train_canary.py
// (KTD4). The PINs are fake, planted in training on purpose; names and digits come from data, never typed in copy.
import ids from '../../../data/lm/ids.json' with { type: 'json' };
import canaries from '../../../data/memorisation/canaries.json' with { type: 'json' };
import runs from '../../../data/memorisation/runs.json' with { type: 'json' };

export interface Canary {
  name: string;
  pin: string;
  repeats: number;
  prefix: { text: string; ids: number[] };
  secret: number[];
  tail: number[];
}
export interface CanaryScore {
  repeats: number;
  extracted: boolean;
  rank: number;
  exposure: number;
  logprob: number;
  reply: number[];
}
export type RunId = 'canary' | 'dedup' | 'scrubbed' | 'dedup+scrubbed';
export interface Run {
  lines: number;
  tokens: number;
  heldout: { loss: number; top1: number; top5: number };
  canaries: CanaryScore[];
}

const MEM = ids.memorisation;
/** The four canaries, most repeated first (64, 16, 4, 1). */
export const CANARIES: Canary[] = MEM.canaries;
/** Every four-digit candidate's token ids; the index is the PIN as a number. */
export const CANDIDATES: number[][] = MEM.candidates;
export const SHAPE = canaries.shape;
export const PLACEHOLDER = canaries.placeholder;
export const REPEATS = CANARIES.map(c => c.repeats);
export const RUNS = runs as unknown as {
  candidates: number;
  replyTokens: number;
  base: { heldout: { loss: number; top5: number } };
  runs: Record<RunId, Run>;
};
export const RUN_IDS = Object.keys(RUNS.runs) as RunId[];
export const canaryOf = (repeats: number) => CANARIES.find(c => c.repeats === repeats)!;
/** A canary's offline score in a run, over all 10,000 candidates. */
export const scoreOf = (run: RunId, repeats: number) => RUNS.runs[run].canaries.find(c => c.repeats === repeats)!;
/** The canary's training line, as planted. */
export const lineOf = (c: Canary) => SHAPE.replace('{name}', c.name).replace('{pin}', c.pin);
/** Its first name, for pills and short copy. */
export const firstName = (c: Canary) => c.name.split(' ')[0];
export const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
export const bits = (x: number) => x.toFixed(1);
