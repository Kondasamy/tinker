// Chapter 7's workbench: model size, bits and reply length against fit (with a shift's context), stock answers,
// battery and privacy (data/on-device/workbench.json, planning numbers). WINNERS is pinned in pinned.json and
// recomputed by solve() in a test.
import bench from '../../../data/on-device/workbench.json' with { type: 'json' };
import pinned from '../../../data/on-device/pinned.json' with { type: 'json' };
import { LENGTHS, repliesPerCharge, SHIFT, type Length } from './battery';
import { BITS, fits, SIZE_IDS, sizeOf, usedBytes, type SizeId } from './memory';

export const BENCH = bench;
export interface Plan {
  size: SizeId;
  bits: number;
  length: Length;
}
export const START = bench.start as Plan;
export const PLANS: Plan[] = SIZE_IDS.flatMap(size =>
  BITS.flatMap(bits => LENGTHS.map(length => ({ size, bits, length }))),
);

export function resultOf(p: Plan) {
  const s = sizeOf(p.size),
    fit = fits(s, p.bits, bench.shiftContext),
    replies = repliesPerCharge(s, p.bits, p.length);
  return {
    used: usedBytes(s, p.bits, bench.shiftContext),
    fit,
    /** a question that doesn't fit falls back to the cloud: it leaves the handheld */
    private: fit,
    right: s.right,
    answers: s.right >= bench.bar && p.bits >= bench.minBits,
    replies,
    lasts: replies >= SHIFT,
  };
}
export type Result = ReturnType<typeof resultOf>;
export const passes = (r: Result) => r.fit && r.private && r.answers && r.lasts;

/** Every plan that passes the rule. */
export const solve = (plans: Plan[]) => plans.filter(p => passes(resultOf(p)));

const same = (a: Plan, b: Plan) => a.size === b.size && a.bits === b.bits && a.length === b.length;
export const WINNERS = pinned.workbench.winners as Plan[];
export const wins = (p: Plan) => WINNERS.some(w => same(w, p));
