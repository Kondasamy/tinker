// The commit graph (KTD10): Larkspur's price-page repo as real Git objects. A commit is a snapshot of the file, its
// parents, who and when, and a message, named by its hash; a branch is a name pointing at one commit, HEAD the branch
// you are on. Merging is the three-way merge against the merge base, rebasing replays each commit on a new parent, so
// it makes new commits with new hashes. Every function is pure and returns a new repo. Times come from
// data/git/repo.json: a commit's time is start + step × the commits the repo already held, so hashes never drift.
import data from '../../../data/git/repo.json' with { type: 'json' };
import { commitId, treeId, type CommitFields, type Person } from './objects';
import { merge3, resolve, type Merged, type Side } from './merge';

export const REPO = data;
export const FILE = data.file;
export type Who = keyof typeof data.people;
export const PEOPLE = data.people as Record<Who, Person>;
export type BranchId = keyof typeof data.branches;
export const BRANCHES = data.branches as Record<BranchId, { by: Who; commits: { message: string; text: string }[] }>;
/** first names, for copy */
export const NAME = Object.fromEntries(Object.entries(PEOPLE).map(([k, p]) => [k, p.name.split(' ')[0]])) as Record<
  Who,
  string
>;

export interface Commit extends CommitFields {
  id: string;
  /** the price page in this snapshot */
  text: string;
  by: Who;
}
export interface Repo {
  commits: Record<string, Commit>;
  /** ids in the order they were made */
  order: string[];
  refs: Record<string, string>;
  /** the branch HEAD names */
  head: string;
}

interface New {
  parents: string[];
  text: string;
  message: string;
  by: Who;
  /** a replayed commit keeps its author's time; its committer's time is now */
  time?: number;
  committer?: Who;
}
/** Make a commit object (no ref moves). */
function make(repo: Repo, n: New): [Repo, string] {
  const now = data.start + data.step * repo.order.length;
  const c: CommitFields = {
    tree: treeId({ [FILE]: n.text }),
    parents: n.parents,
    author: PEOPLE[n.by],
    time: n.time ?? now,
    committer: PEOPLE[n.committer ?? n.by],
    ctime: now,
    tz: data.tz,
    message: n.message,
  };
  const id = commitId(c);
  return [
    { ...repo, commits: { ...repo.commits, [id]: { ...c, id, text: n.text, by: n.by } }, order: [...repo.order, id] },
    id,
  ];
}

export const tip = (r: Repo, ref = r.head) => r.commits[r.refs[ref]];

/** Commit text on a branch: the branch moves to the new commit. */
export function commitOn(r: Repo, branch: string, by: Who, message: string, text: string): Repo {
  const at = r.refs[branch];
  const [r2, id] = make(r, { parents: at ? [at] : [], text, message, by });
  return { ...r2, refs: { ...r2.refs, [branch]: id } };
}

/** The repo after the history in repo.json (or another list), all on main. */
export function init(history = data.history as { by: Who; message: string; text: string }[]): Repo {
  let r: Repo = { commits: {}, order: [], refs: {}, head: 'main' };
  for (const h of history) r = commitOn(r, 'main', h.by, h.message, h.text);
  return r;
}

/** A new branch: a name pointing at a commit (HEAD's by default). Nothing is copied. */
export const branchAt = (r: Repo, name: string, at = r.refs[r.head]): Repo => ({
  ...r,
  refs: { ...r.refs, [name]: at },
});
export const checkout = (r: Repo, name: string): Repo => ({ ...r, head: name });

/** A fixture branch from repo.json, made at `from`'s commit with its commits on it. */
export function grow(r: Repo, b: BranchId, from = 'main'): Repo {
  let out = branchAt(r, b, r.refs[from]);
  for (const c of BRANCHES[b].commits) out = commitOn(out, b, BRANCHES[b].by, c.message, c.text);
  return out;
}

/** Every commit reachable from id, itself included. */
export function ancestors(r: Repo, id: string): Set<string> {
  const seen = new Set<string>(),
    todo = [id];
  while (todo.length) {
    const x = todo.pop()!;
    if (seen.has(x)) continue;
    seen.add(x);
    todo.push(...r.commits[x].parents);
  }
  return seen;
}
/** Commits reachable from a ref, newest first. */
export const history = (r: Repo, ref: string) => {
  const a = ancestors(r, r.refs[ref]);
  return r.order.filter(id => a.has(id)).reverse();
};

/** The merge base: the nearest commit both reach (the newest common ancestor). */
export function mergeBase(r: Repo, a: string, b: string): string {
  const A = ancestors(r, r.refs[a] ?? a),
    B = ancestors(r, r.refs[b] ?? b);
  const common = r.order.filter(id => A.has(id) && B.has(id));
  return common[common.length - 1];
}

export interface MergeResult {
  repo: Repo;
  /** 'ff' moved the label forward; 'merge' made a merge commit; 'none' had nothing to bring in */
  kind: 'ff' | 'merge' | 'none';
  merged?: Merged;
  base?: string;
}
/** Merge branch `from` into `into`. A conflict is resolved to `side` (a person choosing, in the chapters). */
export function mergeInto(r: Repo, into: string, from: string, by: Who, side: Side = 'theirs'): MergeResult {
  const a = r.refs[into],
    b = r.refs[from];
  if (ancestors(r, a).has(b)) return { repo: r, kind: 'none' };
  if (ancestors(r, b).has(a)) return { repo: { ...r, refs: { ...r.refs, [into]: b } }, kind: 'ff' };
  const base = mergeBase(r, a, b),
    merged = merge3(r.commits[base].text, r.commits[a].text, r.commits[b].text);
  const [r2, id] = make(r, {
    parents: [a, b],
    text: resolve(merged, side),
    message: `Merge branch '${from}'`,
    by,
  });
  return { repo: { ...r2, refs: { ...r2.refs, [into]: id } }, kind: 'merge', merged, base };
}

export interface RebaseResult {
  repo: Repo;
  /** conflict hunks met while replaying, each resolved to the replayed commit's side */
  conflicts: number;
  /** old id → new id, oldest first */
  rewritten: [string, string][];
}
/** Rebase `branch` onto `onto`: replay each of its commits, oldest first, on a new parent. Each replay is a three-way
 * merge (the commit's parent as base), so each gets a new hash even when its change is the same. */
export function rebaseOnto(r: Repo, branch: string, onto: string, by: Who): RebaseResult {
  const target = r.refs[onto],
    have = ancestors(r, target);
  const todo = history(r, branch)
    .filter(id => !have.has(id))
    .reverse();
  // already on top of `onto`: nothing to replay, nothing rewritten
  if (ancestors(r, r.refs[branch]).has(target)) return { repo: r, conflicts: 0, rewritten: [] };
  let out = r,
    cur = target,
    conflicts = 0;
  const rewritten: [string, string][] = [];
  for (const id of todo) {
    const c = r.commits[id],
      m = merge3(r.commits[c.parents[0]].text, out.commits[cur].text, c.text);
    conflicts += m.conflicts.length;
    const [o2, nid] = make(out, {
      parents: [cur],
      text: resolve(m, 'theirs'),
      message: c.message,
      by: c.by,
      time: c.time,
      committer: by,
    });
    out = o2;
    cur = nid;
    rewritten.push([id, nid]);
  }
  return { repo: { ...out, refs: { ...out.refs, [branch]: cur } }, conflicts, rewritten };
}
