// What one model pass costs (KTD11): the conv layers' multiplies, counted from the weights' shapes in meta.json. Each
// 3x3 conv multiplies every cell's 3x3 window of every input channel for every output channel; the 1x1 conv one input
// per output per cell.
import type { NetMeta } from './net';
import { SIZE } from './world';

export function multiplies(meta: Pick<NetMeta, 'tensors'>): number {
  let n = 0;
  for (const t of meta.tensors) if (t.name.endsWith('.weight')) n += t.shape.reduce((a, b) => a * b, 1) * SIZE * SIZE;
  return n;
}
/** Compute units: millions of multiplies, to one decimal. */
export const units = (mults: number) => Math.round(mults / 1e5) / 10;
