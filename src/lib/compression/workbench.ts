// Compression chapter 7's workbench: a setting per site file against a size and a quality budget. Each text and the
// random file get a lossless coder; the picture gets its shades and block size, then the pair. A plan fits when the
// total is within the budget and the picture's difference within its limit (data/compression/workbench.json, planning
// numbers). WINNERS (every plan that fits) is pinned in data/compression/pinned.json and recomputed by
// tests/unit/compression-workbench.test.ts, so nothing is solved at import (KTD12).
import budget from '../../../data/compression/workbench.json' with { type: 'json' };
import pinned from '../../../data/compression/pinned.json' with { type: 'json' };
import { CODER_IDS, sizeOf, type CoderId } from './coders';
import { FILES, PICTURE, type FileId } from './files';
import { BLOCKS, LEVELS, lossOf } from './lossy';

export const BUDGET = { bytes: budget.bytes, diff: budget.diff, picture: budget.picture };
/** The files a coder is picked for: every one but the picture. */
export const LOSSLESS = FILES.filter(f => f.kind !== 'picture').map(f => f.id);
export interface Plan {
  coders: Partial<Record<FileId, CoderId>>;
  levels: number;
  block: number;
}

export const PLANS: Plan[] = (() => {
  let ways: Plan['coders'][] = [{}];
  for (const id of LOSSLESS) ways = ways.flatMap(w => CODER_IDS.map(c => ({ ...w, [id]: c })));
  return ways.flatMap(coders => LEVELS.flatMap(levels => BLOCKS.map(block => ({ coders, levels, block }))));
})();

export interface Row {
  id: FileId;
  /** bytes before packing, and after */
  raw: number;
  size: number;
  /** the picture's difference from the original, percent; 0 for the lossless files */
  diff: number;
}
export interface Result {
  rows: Row[];
  total: number;
  diff: number;
  fits: boolean;
}

/** Run a plan: every file's packed size, the total, and whether it keeps both budgets. */
export function runPlan(p: Plan): Result {
  const rows = FILES.map(f => {
    if (f.kind === 'picture') {
      const l = lossOf(PICTURE, { levels: p.levels, block: p.block });
      return { id: f.id, raw: f.bytes.length, size: l.size, diff: l.diff };
    }
    return { id: f.id, raw: f.bytes.length, size: sizeOf(p.coders[f.id] ?? 'store', f.bytes, f.id), diff: 0 };
  });
  const total = rows.reduce((a, r) => a + r.size, 0),
    diff = Math.max(...rows.map(r => r.diff));
  return { rows, total, diff, fits: total <= BUDGET.bytes && diff <= BUDGET.diff };
}

/** Every plan that fits: computed over the whole domain (the test checks the pin). */
export const solve = () => PLANS.filter(p => runPlan(p).fits);

export const planKey = (p: Plan) =>
  `${LOSSLESS.map(id => `${id}:${p.coders[id] ?? 'store'}`).join(',')}|${p.levels}x${p.block}`;
export const WINNERS: Plan[] = pinned.winners.map(k => {
  const [c, l] = k.split('|'),
    [levels, block] = l.split('x').map(Number);
  return { coders: Object.fromEntries(c.split(',').map(x => x.split(':'))) as Plan['coders'], levels, block };
});
const WIN = new Set(pinned.winners);
export const wins = (p: Plan) => WIN.has(planKey(p));
/** The smallest total that fits, read off the winners. */
export const BEST = Math.min(...WINNERS.map(p => runPlan(p).total));

/** Where the bench starts: everything as it is, the picture untouched. */
export const START: Plan = { coders: Object.fromEntries(LOSSLESS.map(id => [id, 'store'])), levels: 256, block: 1 };
/** The plan in a saved run's state; anything unknown falls back to START's. */
export function benchPlan(s: Partial<Plan>): Plan {
  return {
    coders: Object.fromEntries(
      LOSSLESS.map(id => [id, CODER_IDS.includes(s.coders?.[id] as CoderId) ? s.coders![id] : START.coders[id]]),
    ),
    levels: LEVELS.includes(s.levels as never) ? s.levels! : START.levels,
    block: BLOCKS.includes(s.block as never) ? s.block! : START.block,
  };
}
