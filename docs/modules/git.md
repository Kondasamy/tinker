# Git (`/git/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **Hero object: HEAD as a lit lantern hanging off a hook** on its branch's flagpole (`pole()` in `crateScene.ts`); branches fly cloth flags, rails run on wooden sleepers, Mira and Tom (`CAST`) stand at the yard's ends, and Mira writes the page at the packing desk.
- **The crate yard** (`src/components/scenes/crateScene.ts`): every commit is a sealed wooden crate, its real hash's first seven characters in a pill on its front edge (the stamp), chained by a rail on sleepers to each parent; a merge crate stands on two rails. A column per generation, left to right (six at most, older ones folded into a `+N OLDER` pill), a lane per branch with commits of its own, main's at the back; crates no branch reaches (left behind by a rebase) stand pale in the front lane. A branch is a flagpole on its crate, a flag in the branch's colour and its name in a pill; HEAD is a lit lantern on its branch's pole. A conflict crate stands lid off, both sides' papers poking out, a tomato tag and pill. `yardOf` lays a repo out; chapter 1 draws the packing view instead (`PACK_BOARD`): the page on a desk beside the saved version's crate and yours, which the editor re-stamps. The new mechanic (KTD15) is typing: `GitStage` (`src/content/git/kit.tsx`) puts a native `textarea` (capped at `MAX_TEXT`) under the frame; each keystroke re-stamps the crate with the typed page's real blob id (a CSS stamp animation, none with reduced motion), the full id sits outside any live region, and a hidden live region names the new stamp only once typing pauses. The Graph tab (`commitGraph.ts`, React SVG: a dot per commit in the yard's columns and lanes, a line per parent, branch names over their commit, focusable commits read by arrow keys with a read-out line) is one tab away. Chapters 2–7 keep the tab in the step state. On phones the pills keep only hashes and branch names, and only crates a branch names or the step lights carry a stamp; the caption carries the count.

## Engine (`src/lib/git/`)

- **Real Git object ids, nothing recorded** (KTD10). `objects.ts` hashes blobs, trees (flat: `100644 <name>\0<20-byte id>` per file, sorted) and commits (`tree`, `parent`s, `author`, `committer`, blank line, message) as `"<type> <length>\0<content>"` through SHA-1. SHA-1 is computed in plain TypeScript, synchronously, departing on purpose from KTD10's Web Crypto: the yard is drawn at build time and on every keystroke, and a sync hash keeps every picture pure. `tests/unit/git-objects.test.ts` checks it against Web Crypto, pins `hello\n` to `ce01362…`, and checks every fixture id against the real CLI's.
- **A fixture repo, fixed people and times** (`data/git/repo.json`, written for this site): the price page's three commits on main, the next change, and four fixture branches (`sale`, `hinge`, `rise`, `shelf`). A commit's time is `start + step ×` the commits the repo already held, so hashes never drift. Names in copy (Mira, Tom) are read from it.
- **Pinned against the real Git** (`data/git/pinned.json`): the ids real Git (2.50.1) produced from `repo.json` by the same steps as `src/lib/git/story.ts` (a rebase as one cherry-pick per commit, committer dates set by the repo clock), the clean merge's text and the conflict's diff3 markers. The CLI was run once, by hand; the engine is tested against the pins and never calls it.
- **The graph is pure** (`graph.ts`): commits, refs and HEAD; a branch is a ref, so making one adds no object. The merge base is the newest common ancestor; `mergeInto` fast-forwards when it can, else makes a merge commit (parents: into, then from) with conflicts resolved to a side (a person choosing, in the chapters; the incoming side on the bench); `rebaseOnto` replays each commit (its parent as base) on a new parent, keeping author and author time, so each gets a new id, and does nothing when the branch already sits on top.
- **The diff is a line LCS; the merge is diff3-style** (`merge.ts`): a stretch changed on one side takes that side, the same change on both is taken once, different changes are one conflict hunk with both sides and the base. Adjacent lines changed on both sides conflict, as in Git. `shortcut:` no rename detection, no recursive merge base.
- **Commands only in fold-aways** (`Commands` in the kit); the lesson is the object model.
- **Chapter 7's workbench** (`workbench.ts`): merge or rebase per branch × the order of the three (48 plans), each run for real on the repo. The owner's rule: never rewrite a branch others have (`data/git/workbench.json` `shared`); rebasing one that already sits on top rewrites nothing and is allowed. Score: fewest conflicts, then the shortest history on main. `WINNERS` (every tied best plan, ten today) is pinned in `pinned.json` and recomputed by `tests/unit/git-workbench.test.ts`. The lesson it rests on: rebasing `shelf` after the sale meets a conflict the merge never sees, because a rebase replays each step.
- **SHA-256 is a dated fact, never the default**: `git init`'s docs (checked 2026-10-30) still name sha1 the default.
- **Facts about Git** come from `data/git/facts.json` with source and access date (Pro Git §§3.1, 3.2, 3.6, 10.2; the hash-function transition doc; Stevens et al. 2017, the first SHA-1 collision; `git init`; `git config` `core.abbrev`).

## Toy vs real

Git is the one thing here that isn't a toy: every hash, merge and rebase is real Git's algorithm, pinned against Git 2.50.1 (`data/git/pinned.json`). What is made up is the repo itself, Larkspur's price page (`RepoNote` says so where its people and times show), and the bench's stand-in for a person resolving a conflict. So most numbers are real, computed from the fixture.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | The page's 40-character blob id (editor), its first 7 on the crates; how many characters change | `header` | Real: SHA-1 of Git's header and the bytes, checked against the CLI |
| 1 | 7-character short names (crates, graph, intro) | `abbrev` (Git picks the length from the repo's size, at least 4) | Labelled: 7 is the site's display choice (`short()`), the fact sits beside it |
| 1 | The prices on the page | none | Labelled: fixture text written for this site |
| 2 | Three commits on main; the parent's short name; all N names changed after the reword | `commit` | Real (fixture repo, real ids); `RepoNote` on the step |
| 3 | Zero crates added by a branch | `branch-41` (a branch is a 41-byte file) | Real |
| 4 | Two parents on the merge commit; the merged page | `three-way` | Real (clean merge pinned against Git) |
| 5 | One conflict, its two sides and the base | `conflict` | Real (diff3 markers pinned against Git) |
| 6 | The shelf branch's N commits, all renamed | `rebase-rule` | Real (rebased ids pinned against Git) |
| 7 | Conflicts and commits on main, commits added per branch, the best score, `WINNERS.length` (ten) plans tie | `rebase-rule`, `replay-vs-merge` | Real, run on the fixture; conflicts resolved to the incoming side, labelled a stand-in for a person on the bench; `WINNERS` recomputed by `git-workbench.test.ts` |
| Intro | 3 commits, 2 people, 3 branches, the tied plans | as above | Real counts of the fixture repo |
