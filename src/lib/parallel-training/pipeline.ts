// A GPipe schedule (Huang et al., 2019; KTD8): p stages, m micro-batches, one slot per stage per micro-batch pass.
// Forwards run down the stages, then backwards run back up once every forward is done. Stage s runs micro-batch j's
// forward at slot s + j and its backward at slot (m + p − 1) + (p − 1 − s) + j. Each stage idles 2(p − 1) of the
// 2(m + p − 1) slots: the bubble, (p − 1)/(m + p − 1) of the time.

export type Slot = { kind: 'F' | 'B'; micro: number } | null;
export interface Schedule {
  p: number;
  m: number;
  /** [stage][slot] */
  grid: Slot[][];
  slots: number;
  idle: number;
}

export function gpipe(p: number, m: number): Schedule {
  const slots = 2 * (m + p - 1);
  const grid = Array.from({ length: p }, (_, s) => {
    const row: Slot[] = Array(slots).fill(null);
    for (let j = 0; j < m; j++) {
      row[s + j] = { kind: 'F', micro: j };
      row[m + p - 1 + (p - 1 - s) + j] = { kind: 'B', micro: j };
    }
    return row;
  });
  const idle = grid.reduce((a, row) => a + row.filter(x => x === null).length, 0);
  return { p, m, grid, slots, idle };
}

/** The share of all stage-slots spent idle. */
export const bubbleOf = (s: Schedule) => s.idle / (s.p * s.slots);
/** The same, by formula. */
export const bubble = (p: number, m: number) => (p - 1) / (m + p - 1);
/** Stages idle at one slot: what the picture greys out. */
export const idleAt = (s: Schedule, slot: number) => s.grid.flatMap((row, i) => (row[slot] === null ? [i] : []));
