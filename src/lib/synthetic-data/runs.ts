// The generation runs (KTD9, re-scoped), trained offline by scripts/train/train_synth.py and read as recorded: two arms
// of five generations (replace, accumulate) and the workbench grid. No weights ship; samples are ids.
import runs from '../../../data/synthetic-data/runs.json' with { type: 'json' };
import { decode } from '../lm/bpe';

export type Arm = 'replace' | 'accumulate';
export const ARMS: Arm[] = ['replace', 'accumulate'];
export interface Scores {
  docs: number;
  tokens: number;
  /** held-out loss on real text: the drift */
  heldout: number;
  /** next-word top-5 accuracy on the held-out documents (the rare prompts' sources) */
  top5: number;
  /** the same, only where the next word is a rare one */
  rareTop5: number;
  /** distinct rare-half pieces its samples use, and how many of them the real text never uses */
  distinctRare: number;
  unseenUsed: number;
  repeatRate: number;
  samples: number[][];
  rareReplies: number[][];
  excerpt: number[];
}
export interface Gen extends Scores {
  gen: number;
}
export interface GridRun extends Scores {
  temperature: number;
  sieve: 'off' | 'dedupe' | 'facts';
  realShare: 0 | 50;
  kept: number;
  realTokens: number;
}
interface Ided {
  text: string;
  ids: number[];
}
export const RUNS = runs as unknown as {
  training: { steps: number; seed: number };
  generations: number;
  prompt: number;
  repeatCeiling: number;
  vanish: number;
  keep: number;
  overlap: number;
  replyTokens: number;
  sampleTokens: number;
  rare: number[];
  unseen: number[];
  realDistinctRare: number;
  realRepeat: number;
  products: Ided[];
  prompts: Ided[];
  rarePrompts: (Ided & { doc: string; facts: Record<string, string[]> })[];
  bars: Record<string, boolean>;
  vanishing: { vanish: boolean; keep: boolean };
  arms: Record<Arm, Gen[]>;
  grid: GridRun[];
};
export const GENS = RUNS.arms.replace.map(g => g.gen);
export const LAST = GENS.at(-1)!;
export const genOf = (arm: Arm, gen: number): Gen => RUNS.arms[arm][gen];
/** A measure across an arm's generations. */
export const series = (arm: Arm, k: 'heldout' | 'distinctRare' | 'repeatRate' | 'rareTop5' | 'top5') =>
  RUNS.arms[arm].map(g => g[k]);
/** A recorded greedy sample as text, cut where the answer ends. */
export const sampleText = (ids: number[]) => decode(ids).split('\n\n')[0].trim();
export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const loss = (x: number) => x.toFixed(2);
