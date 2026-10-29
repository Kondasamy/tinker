// The installs the Dependencies chapters show, each read off the registry by the resolver; their counts are pinned in
// data/dependencies/pinned.json and rerun by tests/unit/dependencies-engine.test.ts.
import { BAD_DAY, HIJACK_DAY, MIRA_DAY, SERVER_DAY, START_DAY } from './days';
import { lockOf } from './lock';
import { APP, REGISTRY, auditOf, brokenOf, diff, install, type Change, type Tree } from './resolve';

export { BAD_DAY, HIJACK_DAY, MIRA_DAY, SERVER_DAY, START_DAY } from './days';

export const FIRST = install({ day: START_DAY });
export const FIRST_LOCK = lockOf(FIRST);
export const DIRECT = Object.keys(APP.deps);
/** The install on a day, from the first lockfile or from the ranges alone (chapters 4 and 5). */
export const installAt = (day: number, lock: boolean) => install({ day, ...(lock ? { lock: FIRST_LOCK } : {}) });

/** Chapter 2: the package whose ranges the reader tries, and the versions they force on it. */
export const PRICE = 'pricebook';
/** Chapter 3: the package two parts of the app need at different majors. */
export const TWICE = 'tidystr';

/** Chapter 6: the direct dependency that reaches the hijacked package, and that package. */
export const LOGGER = 'logline',
  HIJACKED = 'inkdrop';

/** The release the registry flags with a key, as name and version (each flag is used once). */
function flagged(key: 'breaks' | 'hijacked' | 'security') {
  for (const [name, p] of Object.entries(REGISTRY))
    for (const [version, r] of Object.entries(p.versions)) if (r[key]) return { name, version, ...r };
  throw new Error(`no release flagged ${key}`);
}
export const BAD = flagged('breaks');
export const HIJACK = flagged('hijacked');
export const SECURITY = flagged('security');

/** The app's ranges with one dependency pinned exactly at the version it has today. */
export const pinned = (name: string, t: Tree = FIRST) => ({
  ...APP.deps,
  [name]: t.nodes.find(n => n.path === name)!.version,
});

const change = (c: Change) => `${c.path} ${c.from ?? '-'} > ${c.to ?? '-'}`;
/** Every effect the chapters teach, as data/dependencies/pinned.json pins it (KTD10). */
export function effects() {
  const bad = install({ day: BAD_DAY });
  return {
    installed: FIRST.nodes.length,
    direct: DIRECT.length,
    nested: FIRST.nodes.filter(n => n.path.includes('/')).map(n => `${n.path}@${n.version}`),
    drift: diff(install({ day: MIRA_DAY }), install({ day: SERVER_DAY })).map(change),
    driftLocked: diff(install({ day: MIRA_DAY, lock: FIRST_LOCK }), install({ day: SERVER_DAY, lock: FIRST_LOCK })).map(
      change,
    ),
    badPatch: diff(install({ day: BAD_DAY - 1 }), bad).map(change),
    badBroken: [...brokenOf(bad)].sort(),
    badLocked: [...brokenOf(install({ day: BAD_DAY, lock: FIRST_LOCK }))],
    hijackPinned: auditOf(install({ day: HIJACK_DAY, deps: pinned(LOGGER) }), false),
    hijackLocked: auditOf(install({ day: HIJACK_DAY, lock: FIRST_LOCK })),
  };
}
