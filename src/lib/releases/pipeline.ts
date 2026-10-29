// Releases chapter 2's pipeline: every change rides through the gates in data/releases/changes.json, in order. A gate
// stops a change only when one of its tests covers that change's bug (`caughtBy`); a bug no test checks passes every
// gate and ships.
import changes from '../../../data/releases/changes.json' with { type: 'json' };
import { changeOf } from './sim';

export const GATES = changes.gates;
export interface GateResult {
  id: string;
  name: string;
  pass: boolean;
}
export interface Pipeline {
  gates: GateResult[];
  /** the gate that stopped it, if one did */
  stoppedAt?: string;
  ships: boolean;
}

/** Runs one change through the gates; gates after a failing one never run. */
export function pipelineOf(id: string): Pipeline {
  const c = changeOf(id),
    out: GateResult[] = [];
  for (const g of GATES) {
    const pass = c.caughtBy !== g.id;
    out.push({ ...g, pass });
    if (!pass) return { gates: out, stoppedAt: g.id, ships: false };
  }
  return { gates: out, ships: true };
}
