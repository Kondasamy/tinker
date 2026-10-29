// Names for Many chips, one model (R13), read from data/parallel-training/story.json, never typed into copy. Larkspur's
// model vendor trains its next model on a simulated cluster (KTD13), and Larkspur's team reads the quote.
import story from '../../../data/parallel-training/story.json' with { type: 'json' };

export const COMPANY = story.company;
export const VENDOR = story.vendor;
export const MODEL_NAME = story.model;
/** four workers' stand-in gradients for the ring (chapter 2), hand-set */
export const GRADIENTS = story.gradients;
/** the failure stream's seed (chapter 6) */
export const SEED = story.seed;

/** Bytes as people say them: "1.12 TB", "80 GB", "640 MB". */
export function bytesText(b: number) {
  const [unit, n] = b >= 1e12 ? ['TB', 1e12] : b >= 1e9 ? ['GB', 1e9] : b >= 1e6 ? ['MB', 1e6] : ['KB', 1e3];
  const x = b / (n as number);
  return `${x >= 100 ? Math.round(x) : Number(x.toPrecision(3))} ${unit}`;
}
/** Seconds as "8.4 s" or "350 ms". */
export const secondsText = (s: number) => (s >= 1 ? `${Number(s.toPrecision(3))} s` : `${Math.round(s * 1000)} ms`);
export const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
