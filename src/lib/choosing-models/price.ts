// Price per answer and the wait (R7a ch. 3–4): tokens in and out times the price, and time to the first word plus the
// words at the machine's pace. Pure sums over the hand-set numbers.
import type { Machine } from './machines';

export interface Request {
  tokensIn: number;
  tokensOut: number;
  /** words in the reply */
  words: number;
}
/** Dollars for one answer: tokens × price per million, in and out. */
export const perAnswer = (m: Machine, r: Request) => (r.tokensIn * m.priceIn + r.tokensOut * m.priceOut) / 1e6;
/** Dollars per 1,000 answers. */
export const per1000 = (m: Machine, r: Request) => 1000 * perAnswer(m, r);
/** Seconds until the whole reply is written: the first word, then the rest at the machine's pace. */
export const wholeReply = (m: Machine, r: Request) => m.ttft + r.words / m.wps;

export const money = (x: number) => (x < 10 ? `$${x.toFixed(2)}` : `$${Math.round(x).toLocaleString('en-US')}`);
export const secs = (x: number) => `${x.toFixed(1)} s`;
