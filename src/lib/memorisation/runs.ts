// The canary model's runs as scripts/train/train_canary.py wrote them, kept apart from the token ids (ids.json) so the
// registry's recall bank can quote a score without bundling them (story.ts re-exports all of it).
import runs from '../../../data/memorisation/runs.json' with { type: 'json' };

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

export const RUNS = runs as unknown as {
  candidates: number;
  replyTokens: number;
  base: { heldout: { loss: number; top5: number } };
  runs: Record<RunId, Run>;
};
/** A canary's offline score in a run, over all 10,000 candidates. */
export const scoreOf = (run: RunId, repeats: number) => RUNS.runs[run].canaries.find(c => c.repeats === repeats)!;
