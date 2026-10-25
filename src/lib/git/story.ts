// The repos the chapters show, each built from data/git/repo.json by the same steps the real `git` took when the pins
// in data/git/pinned.json were made (tests/unit/git-objects.test.ts compares them).
import {
  BRANCHES,
  REPO,
  branchAt,
  checkout,
  commitOn,
  grow,
  init,
  mergeInto,
  rebaseOnto,
  type BranchId,
  type Repo,
} from './graph';
import type { Side } from './merge';

/** Commit a fixture branch's changes straight onto main. */
export function onMain(r: Repo, b: BranchId): Repo {
  for (const c of BRANCHES[b].commits) r = commitOn(r, 'main', BRANCHES[b].by, c.message, c.text);
  return r;
}

/** The three commits so far, on main. */
export const BASE = init();
/** Chapter 2: Mira's next change, committed. */
export const NEXT = commitOn(BASE, 'main', REPO.next.by as 'mira', REPO.next.message, REPO.next.text);
/** Chapter 2: the same, with the first commit's message reworded. */
export const REWORDED = commitOn(
  init(REPO.history.map((h, i) => ({ ...h, by: h.by as 'mira', message: i === 0 ? REPO.reword : h.message }))),
  'main',
  REPO.next.by as 'mira',
  REPO.next.message,
  REPO.next.text,
);
/** Chapter 3: the sale branch made at main's commit, then the sale committed on it. */
export const BRANCHED = checkout(branchAt(BASE, 'sale'), 'sale');
export const SALE = commitOn(
  BRANCHED,
  'sale',
  BRANCHES.sale.by,
  BRANCHES.sale.commits[0].message,
  BRANCHES.sale.commits[0].text,
);

/** Chapters 4 and 5: the sale branch, then a change on main: hinges (a different line) or the drill press (the same). */
export const BEFORE_CLEAN = onMain(grow(BASE, 'sale'), 'hinge');
export const CLEAN = mergeInto(BEFORE_CLEAN, 'main', 'sale', BRANCHES.hinge.by);
export const BEFORE_CONFLICT = onMain(grow(BASE, 'sale'), 'rise');
export const conflictMerge = (side: Side) => mergeInto(BEFORE_CONFLICT, 'main', 'sale', BRANCHES.rise.by, side);

/** Chapter 6: Tom's shelf branch, main moved on with the hinge change, then shelf rebased onto main. */
export const BEFORE_REBASE = onMain(grow(BASE, 'shelf'), 'hinge');
export const REBASED = rebaseOnto(BEFORE_REBASE, 'shelf', 'main', BRANCHES.shelf.by);
