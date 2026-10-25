// Calibration, chapters 2–5 (KTD8): Larkspur mini's own guesses, measured live. Over Fine-tuning's held-out copy (read
// only), in evaluate()'s windows, every position gives a guess: its top-1 probability (the confidence) and whether that
// top pick was the real next piece. Each guess keeps its confidence and log-probability of the right piece at every
// temperature in TEMPERATURES (the top pick never changes with T), so the dial never re-runs the model. A window at a
// time, so a page can spread the work over animation frames.
import { forward, softmax, type Model } from '../lm/model';
import { HELDOUT } from '../fine-tuning/engine';
import { bins, brier, ece, type Item } from './score';
import pinned from '../../../data/calibration/pinned.json' with { type: 'json' };

export { HELDOUT };
/** The dial's settings: the logits are divided by T before the softmax. 1 is the model as trained. */
export const TEMPERATURES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
export type Temperature = (typeof TEMPERATURES)[number];
const ti = (T: number) => {
  const i = TEMPERATURES.indexOf(T as Temperature);
  if (i < 0) throw new Error(`no temperature ${T}`);
  return i;
};
/** The fewest held-out guesses a jar may hold (KTD8's stop condition): thinner tenths are merged. */
export const MIN_BIN: number = pinned.minBin;

export interface Guess {
  ok: boolean;
  /** top-1 probability at each temperature */
  conf: number[];
  /** log-probability of the real next piece at each temperature */
  ll: number[];
}

/** evaluate()'s windows over the held-out documents: ctx + 1 ids, stride ctx. */
export function windows(ctx: number, docs = HELDOUT.ids): number[][] {
  const out: number[][] = [];
  for (const doc of docs) for (let s = 0; s < doc.length - 1; s += ctx) out.push(doc.slice(s, s + ctx + 1));
  return out;
}

/** The guesses in one window. */
export function measureWindow(model: Model, w: number[]): Guess[] {
  return forward(model, w.slice(0, -1)).logits.map((lg, t) => {
    const y = w[t + 1];
    let top = 0;
    for (let i = 1; i < lg.length; i++) if (lg[i] > lg[top]) top = i;
    const conf: number[] = [],
      ll: number[] = [];
    for (const T of TEMPERATURES) {
      const p = softmax(lg.map(x => x / T));
      conf.push(p[top]);
      ll.push(Math.log(p[y]));
    }
    return { ok: top === y, conf, ll };
  });
}

const memo = new WeakMap<Model, Guess[]>();
/** Every held-out guess for one set of weights, measured once per loaded model. */
export function measure(model: Model): Guess[] {
  let g = memo.get(model);
  if (!g) memo.set(model, (g = windows(model.config.ctx).flatMap(w => measureWindow(model, w))));
  return g;
}
/** A measurement finished elsewhere (a page that ran it a window per frame) joins the memo. */
export const remember = (model: Model, g: Guess[]) => memo.set(model, g);
export const measured = (model: Model) => memo.get(model);

/** The guesses as items (confidence, right) at a temperature. */
export const itemsAt = (gs: Guess[], T: number = 1): Item[] => {
  const i = ti(T);
  return gs.map(g => ({ c: g.conf[i], ok: g.ok }));
};
/** The fit half (even positions) sets the dial; the test half (odd) scores it. */
export const half = (gs: Guess[], which: 'fit' | 'test') => gs.filter((_, i) => i % 2 === (which === 'fit' ? 0 : 1));
/** Mean negative log-likelihood of the real next piece at T: the score temperature scaling minimises. */
export const nll = (gs: Guess[], T: number) => {
  const i = ti(T);
  return -gs.reduce((s, g) => s + g.ll[i], 0) / gs.length;
};
/** Temperature scaling: the setting with the lowest NLL on the guesses given (the fit half). */
export const fitT = (gs: Guess[]): Temperature =>
  TEMPERATURES.reduce((best, T) => (nll(gs, T) < nll(gs, best) ? T : best), TEMPERATURES[0] as Temperature);

/** One model's scores at a temperature: jars, ECE (over the jars) and Brier, and how often the top pick is right. */
export function report(gs: Guess[], T: number = 1) {
  const items = itemsAt(gs, T);
  return {
    positions: items.length,
    right: items.filter(x => x.ok).length,
    jars: bins(items, MIN_BIN),
    ece: ece(items, MIN_BIN),
    brier: brier(items),
  };
}
