# Dependencies (`/dependencies/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **Hero object: a pillar jib crane** (`crane()` in `towerScene.ts`) in the front corner, its operator at the control box; its hook holds the pulled crate by slings (hangs empty otherwise). Tower crates come in three looks by name (plain slats, steel bands, a stencilled up-arrow mark), never painted words; the lockfile post carries the kit padlock.
- **The crate tower** (`src/components/scenes/towerScene.ts`): every installed package is a crate (Git's `crate()` from `crateScene.ts`, exported with an optional palette), stacked so each stands on what it needs: packages needing nothing on the ground, the shop app's cobalt crate on top. Places are given top row down, each crate taking the free spot nearest the crate above that needs it, so a column stands on something it needs. A broken crate (a bad release, or one that lost something it needs) is tomato **and** carries crossed planks (the non-colour marker); a hijacked release is a dark crate with `· HIJACKED` in its pill; a nested copy's pill is mint. Pulled crates lie as ghosts in front; the lockfile is a sheet on a post with a padlock. At most 12 crates stand; the deepest fold into a `+N DEEPER` pill. `towerOf(tree)` reads broken and hijacked off the tree. `DepsStage` (`src/content/dependencies/kit.tsx`) puts it one tab from the Tree (a nested list in a focusable region).
- **The mechanic (KTD13): pull a crate.** The pull bar under the picture: a button per crate (a toolbar, arrow keys move between them), a drop-down that forces a version on the chosen crate, Pull / Put back. The resolver reruns and everything standing on it turns tomato with planks; the crates that broke on that move topple only behind `prefers-reduced-motion: no-preference` in `dependencies.css`. One polite `role="status"` line outside the drawing says what the move did and what is broken (or, for other actions, what the day's install did). Chapter 7 adds a day slider.

## Engine (`src/lib/dependencies/`)

- **semver** (`semver.ts`): parse, compare (semver.org 2.0.0 precedence, its rule-11 chain is a test), and `^`, `~`, exact, x-ranges, `*` and plain comparators per node-semver's documented table; pre-releases match only a range naming one on the same major.minor.patch. Written test-first (`dependencies-semver.test.ts`).
- **Resolver** (`resolve.ts`) over `data/dependencies/registry.json`, a fictional dated registry (labelled): per range, the highest version published by the install day and not removed; npm-style layout, so a conflict nests a second copy; a lockfile entry wins when it still satisfies; the reader's overrides force or pull a place. `brokenOf`, `dependantsOf`, `diff` and `auditOf` (bad release, hijacked install script run or blocked, import payload) are pure.
- **Lockfile** (`lock.ts`): `lockOf(tree)`; `update()` re-resolves on a day and, with tests, keeps the old lockfile when the candidate brings a `breaks` release.
- **The story** (`story.ts`): day 0 lockfile, Mira's day 2 vs the server's day 10, the bad patch on day 11 (`pricebook 1.4.3`, fixed day 12), the hijacked `inkdrop 1.1.4` on day 18 (removed day 20) reached through `logline`'s caret range, the security fix `shipcalc 3.2.5` on day 9. Every chapter effect is pinned in `data/dependencies/pinned.json` (`chapters`) and recomputed by `dependencies-engine.test.ts` (`WRITE_PINNED=1` rewrites). Nothing runs: install scripts and payloads are flags.
- **Workbench** (`workbench.ts`): range style × lockfile × tested-update cadence × install scripts (48 policies), a build every day of the month. The owner's rule (`data/dependencies/workbench.json`): no broken build, no hijacked code shipped, no hijacked install script run; then fewest days late on the security fix. `WINNERS` (lockfile on, weekly, caret or tilde, scripts either way: 4 policies, 5 days late) is pinned and solved again by `dependencies-workbench.test.ts`.
- **Facts** (`data/dependencies/facts.json`, re-checked 2026-10-30 against npm's v12 docs and pnpm 11's): semver.org, node-semver's ranges, npm's lockfile, folder layout (`nested`), `ignore-scripts` and lifecycle scripts docs, pnpm's `allowBuilds` and `minimumReleaseAge` (`release-age`), this repo's own `pnpm-workspace.yaml` (tested against the file), Zimmermann et al. 2019's average of 79 trusted packages (`trusted-packages`), and left-pad (2016), event-stream (2018) and xz (2024) as dated facts only; no registry package takes their names.

## Toy vs real

The registry is fictional on purpose (`RegistryNote` on every chapter says so): its names, versions and days are invented, and a day is its smallest step. The rules it runs are real: version ranges follow node-semver, the layout follows npm's, and a lockfile works as npm's docs say. So every toy count is labelled and sits beside a cited real figure; no toy constant has a real value to match.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | The app names 5 packages; the install brings 9 (pinned) | `trusted-packages` (an average npm package trusts 79 others) | Labelled: the narration says real packages bring far more; a test holds the toy under a quarter of 79 |
| 1 | left-pad's 2.5-hour outage, 22 March 2016 | `left-pad` | Real |
| 2 | Version numbers (pricebook ^1.4.2, its next major and newest minor; geobits ^0.4.1 and 0.5.0) | `semver`, `ranges` | Labelled numbers; what each range accepts is real (the engine follows node-semver's table) |
| 3 | Two tidystr copies, cartwheel's nested 1.0.4 | `nested` | Real behaviour (npm's layout rule), labelled names |
| 4 | Mira's day 2, the server's day 10, the packages that drifted (pinned) | `lockfile` | Labelled |
| 5 | Day 11's bad pricebook 1.4.3, fixed day 12 | `immutable` | Labelled |
| 6 | The hijacked inkdrop 1.1.4 on day 18 (removed day 20) | `event-stream` (reported 78 days after), `xz`, `this-repo`, `allow-builds` | Labelled |
| 7 | 48 policies, the month's days, 4 winners at 5 days late, the hijack's 2 days up (`UP`), the four case counts (pinned, `WINNERS` recomputed) | `release-age` (most malicious releases go within an hour; pnpm 11 waits 1,440 minutes) | Labelled: a toy hijack stays days, a real one usually an hour, which is why a one-day wait works there |
| Intro, recall | 5 named, 9 installed, the month, 4 tied; hypothetical versions in questions | as above | Labelled |
