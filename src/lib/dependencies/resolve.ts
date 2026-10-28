// The Dependencies module's resolver (KTD7) over a fictional, dated registry (data/dependencies/registry.json). For each
// range it takes the highest version published on or before the install day (and not yet removed), unless a lockfile
// names the version for that place. Packages go to the top of node_modules; one whose range the top copy does not
// meet gets a nested copy under the package that asked (npm's layout), so "two versions of one" is real. A reader's
// overrides (the pull-a-crate mechanic) force a version, or pull a package out, at one place in the tree; whatever
// needed it and cannot have it is unmet. Pure and deterministic: the same inputs give the same tree.
import REG from '../../../data/dependencies/registry.json' with { type: 'json' };
import APP_DATA from '../../../data/dependencies/app.json' with { type: 'json' };
import { compare, maxSatisfying, satisfies } from './semver';

export interface Release {
  day: number;
  deps?: Record<string, string>;
  /** a bad release: the build's tests fail with it */
  breaks?: string;
  /** the version this one fixes */
  fixes?: string;
  /** a security fix: what it fixes */
  security?: string;
  /** a breaking change, as its notes say */
  major?: string;
  /** published by someone who should not have: the three flags say what it carries (nothing ever runs) */
  hijacked?: string;
  installScript?: string;
  importPayload?: string;
  /** the day the registry took it down */
  removed?: number;
}
export interface Package {
  what: string;
  versions: Record<string, Release>;
}
export const REGISTRY = REG.packages as Record<string, Package>;
/** the month the registry covers: builds run on days 1 to MONTH */
export const MONTH = REG.month;
export const APP = APP_DATA as { name: string; deps: Record<string, string> };

export const releaseOf = (name: string, version: string): Release | undefined => REGISTRY[name]?.versions[version];
/** Every version of a package, oldest first. */
export const versionsOf = (name: string) => Object.keys(REGISTRY[name]?.versions ?? {}).sort(compare);
/** The versions installable on a day: published by then and not yet removed. */
export const availableOn = (name: string, day: number) =>
  versionsOf(name).filter(v => {
    const r = REGISTRY[name].versions[v];
    return r.day <= day && !(r.removed !== undefined && r.removed <= day);
  });

/** One installed package: where it sits (its node_modules path), its version, and who asked for it. */
export interface Node {
  /** "pricebook" at the top, "cartwheel/tidystr" nested under cartwheel */
  path: string;
  name: string;
  version: string;
  /** the paths that asked for it; "" is the app */
  by: string[];
  deps: Record<string, string>;
}
/** A request nothing could meet: no version in range, a pulled package, or a forced version out of range. */
export interface Unmet {
  from: string;
  name: string;
  range: string;
  /** what stood there instead, if anything */
  got?: string;
}
export interface Tree {
  day: number;
  nodes: Node[];
  unmet: Unmet[];
}
/** A lockfile: the version at every place in the tree. */
export type Lock = Record<string, string>;
export interface InstallOpts {
  day: number;
  /** the app's own ranges; APP.deps by default */
  deps?: Record<string, string>;
  lock?: Lock;
  /** the reader's hand: a version forced at a place, or null to pull it out */
  overrides?: Record<string, string | null>;
}

const up = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
const at = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);

/** Install the app: the tree a package manager would lay out on that day. */
export function install(o: InstallOpts): Tree {
  const nodes = new Map<string, Node>(),
    unmet: Unmet[] = [],
    over = o.overrides ?? {};
  const pick = (path: string, name: string, range: string): string | null => {
    if (path in over) return over[path];
    const locked = o.lock?.[path];
    if (locked && satisfies(locked, range) && releaseOf(name, locked)) return locked;
    return maxSatisfying(availableOn(name, o.day), range);
  };
  const queue: { from: string; deps: Record<string, string> }[] = [{ from: '', deps: o.deps ?? APP.deps }];
  for (let i = 0; i < queue.length; i++) {
    const { from, deps } = queue[i];
    for (const name of Object.keys(deps).sort()) {
      const range = deps[name];
      // the nearest copy this package can see: its own folder, then each folder above it
      let seen: string | undefined;
      for (let d = from; ; d = up(d)) {
        const k = at(d, name);
        if (nodes.has(k) || over[k] === null) {
          seen = k;
          break;
        }
        if (!d) break;
      }
      if (seen !== undefined) {
        const n = nodes.get(seen);
        if (!n) {
          unmet.push({ from, name, range });
          continue;
        }
        if (satisfies(n.version, range)) {
          n.by.push(from);
          continue;
        }
        // a copy the reader forced is what everyone gets: out of range is unmet, not quietly nested
        if (seen in over) {
          unmet.push({ from, name, range, got: n.version });
          continue;
        }
      }
      const path = seen === undefined && !nodes.has(name) ? name : at(from, name);
      const version = pick(path, name, range);
      const rel = version === null ? undefined : releaseOf(name, version);
      if (version === null || !rel) {
        unmet.push({ from, name, range });
        continue;
      }
      nodes.set(path, { path, name, version, by: [from], deps: { ...(rel.deps ?? {}) } });
      if (!satisfies(version, range)) unmet.push({ from, name, range, got: version });
      if (rel.deps) queue.push({ from: path, deps: rel.deps });
    }
  }
  return { day: o.day, nodes: [...nodes.values()].sort((a, b) => (a.path < b.path ? -1 : 1)), unmet };
}

export const nodeAt = (t: Tree, path: string) => t.nodes.find(n => n.path === path);
export const releaseAt = (n: Node) => releaseOf(n.name, n.version)!;

/** Everything that stands on a place, directly or through others, up to the app (""). */
export function dependantsOf(t: Tree, paths: string[]): Set<string> {
  const out = new Set<string>(),
    todo = [...paths];
  while (todo.length) {
    const p = todo.pop()!;
    for (const by of p === '' ? [] : (nodeAt(t, p)?.by ?? []))
      if (!out.has(by)) {
        out.add(by);
        todo.push(by);
      }
  }
  return out;
}

/** What is broken: a bad release itself, whatever asked for something it could not have, and everything standing on
 * either, up to the app (""). */
export function brokenOf(t: Tree): Set<string> {
  const bad = t.nodes.filter(n => releaseAt(n).breaks).map(n => n.path),
    asked = t.unmet.map(u => u.from);
  return new Set([...bad, ...asked, ...dependantsOf(t, [...bad, ...asked])]);
}

/** One place that differs between two installs. */
export interface Change {
  path: string;
  name: string;
  from?: string;
  to?: string;
}
/** The places whose version differs between two trees, added or gone included. */
export function diff(a: Tree, b: Tree): Change[] {
  const paths = [...new Set([...a.nodes, ...b.nodes].map(n => n.path))].sort();
  return paths.flatMap(path => {
    const x = nodeAt(a, path),
      y = nodeAt(b, path);
    return x?.version === y?.version ? [] : [{ path, name: (x ?? y)!.name, from: x?.version, to: y?.version }];
  });
}

/** What an install brings that matters to a build: a bad release, a hijacked one's install script (run or blocked)
 * and its import payload (in the app either way). Nothing runs: these are the registry's flags. */
export function auditOf(t: Tree, scripts = true) {
  const flagged = (k: keyof Release) => t.nodes.filter(n => releaseAt(n)[k]);
  const hijacked = flagged('hijacked');
  return {
    breaks: flagged('breaks').map(n => n.path),
    hijacked: hijacked.map(n => n.path),
    scriptRan: scripts ? flagged('installScript').map(n => n.path) : [],
    scriptBlocked: scripts ? [] : flagged('installScript').map(n => n.path),
    payload: flagged('importPayload').map(n => n.path),
  };
}
