// The lockfile (KTD7): a snapshot of every resolved version at its place in the tree. Installing with it ignores
// anything released since. An update re-resolves on the day, and with tests on, a candidate that brings a bad release
// is rejected and the old lockfile stays.
import { auditOf, install, type Lock, type Tree } from './resolve';

export const lockOf = (t: Tree): Lock => Object.fromEntries(t.nodes.map(n => [n.path, n.version]));

export interface Update {
  lock: Lock;
  /** the fresh install the update tried */
  candidate: Tree;
  /** the tests failed on the candidate, so the lockfile did not move */
  rejected: boolean;
}
/** Re-resolve on a day; with tests, keep the old lockfile when the candidate's build breaks. */
export function update(lock: Lock, day: number, deps?: Record<string, string>, tests = true): Update {
  const candidate = install({ day, deps });
  const rejected = tests && auditOf(candidate).breaks.length > 0;
  return { lock: rejected ? lock : lockOf(candidate), candidate, rejected };
}
