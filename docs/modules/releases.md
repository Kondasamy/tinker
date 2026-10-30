# Shipping a release (`/releases/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The signal box** (`src/components/scenes/signalScene.ts`): checkout traffic runs in from the left through the pipeline's gates (a level-crossing barrier per gate, a lamp each: mint passed, tomato stopped, the boom down across the track where the change stopped, with the change's wagon where it stands), then a junction splits it onto the old track (back) and the new one (front). Twenty shoppers wait along the island platform between them, each beside their track, each a twentieth of the minute's checkouts: the share on the new track is lit mustard, a failed checkout this minute is tomato. The signal box holds the lever (pulled and tomato while the way back runs) and the check's lamp (tomato once the alarm rang). A semaphore in front is the feature flag (arm raised: on). `signalAt` reads it off one minute of a run; `signalCard` is the intro hero (chapter 6's alarm); `signalPlot` is ready for the home hero's `DRAW`. `ReleasesStage` (`src/content/releases/kit.tsx`) puts it one tab from the Errors chart (`rolloutChart.ts`: failure rate per minute on each track over a band of the share on new, drawn as React SVG).
- **Hero object: the signal box** — a brick locking room under a glazed operating floor and a hipped slate roof (the check's lamp on its ridge), a stair up the side, the signalman at the lever frame in front; the semaphore is a white post with a painted blade. Shoppers are kit people at 0.6 size, drawn once per look and placed with `<use>` to stay inside the size budget.
- **The mechanic (KTD13): the rollout dial.** A native range for the share on the new version, live while the run plays; Play/Pause and Step; and the lever ("Pull the rollback lever", or "Switch the flag off" for a flagged change). Each dial move and pull is an event inserted at the current minute. With reduced motion, Play becomes **Next event** (jump to the run's next milestone) and Step stays as the single-minute step; motion (the lever, a shopper lighting up) lives only behind `prefers-reduced-motion: no-preference` in `releases.css`.
- **One read-out.** A single polite `role="status"` under the stage says the latest minute's milestones (stage, dial, check passed, alarm, rolling back, refused, track empty, everyone) or the reader's last Play/Pause; a plain minute never changes it.

## Engine (`src/lib/releases/`)

- **A minute-tick simulator in Consistency's shape, nothing measured** (KTD8). `sim.ts` runs 40 minutes of 100 checkouts a minute under a policy: the change (`data/releases/changes.json`, hand-written, each with its true failure rate), a staged plan (stages, bake, start), the check's threshold, a flag, expand-and-contract, and the reader's events. Each checkout has two seeded draws fixed for its place in line whatever the policy (common random numbers): one picks its track (new when under the share, so a bigger share only adds checkouts), one decides it. A new-track checkout the old version would have completed is **hurt**.
- **The check** compares the canary's failure rate with the rest's at the end of each stage under everyone; more than the threshold rings the alarm and pulls the way back. Rollback takes 5 minutes, a flag 1; a migration without expand refuses the lever. All are labelled planning numbers in `assumptions.json` (`note` / `words`).
- **The seed (68)** was picked so chapter 3 shows a false alarm (the good change on a 2-minute bake) and a miss (the tax rounding passes a 10-minute bake), and the staged rollout halts at its canary.
- **The pipeline** (`pipeline.ts`) stops a change only at the gate whose test covers its bug (`caughtBy`).
- **Pins:** every chapter's run is pinned in `data/releases/pinned.json` and rerun by `releases-sim.test.ts` (`WRITE_PINNED=1` rewrites).
- **Chapter 7's workbench** (`workbench.ts`): canary (1, 5, 25%) × bake (2, 5, 10 min) × flag × check (none, 2, 5 points), 54 plans, each run over four changes (one good, three bad), stepping canary, half, everyone. The rule (`workbench.json`): the good change reaches everyone and at most 45 are hurt in all; then the soonest to everyone. `WINNERS` is pinned and `releases-workbench.test.ts` solves it again.
- **Facts** (Google SRE Workbook on canarying, CrowdStrike's July 2024 technical note and root cause analysis, Hodgson on feature toggles, LaunchDarkly's flag speed (vendor-reported), Sato on parallel change, DORA's metrics) come from `data/releases/facts.json` with source and access date. Chapter 3 links to A/B testing's luck chapter (R17).

## Toy vs real

Every count is the simulated morning's (`SimNote` beside each chapter's quiz or bench says so); the cited fact on the same step is the real figure it stands beside. Rates, minutes and the 100 checkouts a minute are Larkspur's planning numbers (`assumptions.json`), kept because the seed and the pins (chapter 3's false alarm and miss, chapter 6's halt, chapter 7's `WINNERS`) are built on them. Only the canary's share is matched. `releases-sim.test.ts` (`toy vs real`) pins the match and each comparison the copy makes with a real figure.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Rollback takes 5 minutes (predict, watch, hint, quiz step) | `crowdstrike-window` (pulled back 78 minutes after release) | Labelled: the quiz narration sets 5 against CrowdStrike's 78, read from the fact |
| 1 | Clock times, customers hurt so far (caption) | `dora-recovery` | Labelled |
| 2 | Three gates | `crowdstrike-tests` (12 automated test cases, none met the bug) | Labelled: toy gates; the real tests passed a crashing update |
| 3 | Canary of 5% of checkouts | `canary-size` | Matched: `CANARY = Number(fact('canary-size').value)` |
| 3 | 2- and 10-minute bakes; the alarm's counts (failures of canary and rest); tax rounding 2% against 1% | `canary-strict` (long enough to stand for the whole deployment; the Workbook's example canary runs 30 minutes) | Labelled: toy bakes are short so a reader can step them |
| 3 | 10 shoppers, 1 in 100 (quiz) | none | Labelled: a hypothetical in the question |
| 4 | Flag off within 1 minute; dial at 10%; watch 3 minutes; hurt so far | `flag-speed` (typically within 200 ms, vendor-reported) | Labelled: the quiz narration says real flag services switch in under a second |
| 5 | A quarter of checkouts on the change; hurt so far | `parallel-change` | Labelled |
| 6 | Stages 5%, 25%, 50%, everyone; 4-minute bake; hurt against chapter 1's | `canary-rollback`, `crowdstrike-staged` | Labelled |
| 7 | Canary 1/5/25%, bake 2/5/10, check at 2 or 5 in 100 worse, 45 hurt at most, minutes to everyone, winners (`WINNERS` recomputed) | `dora` | Labelled |
| Intro, recall | Straight to everyone against staged hurt; 100 checkouts a minute, 40 minutes, 4 changes, winning plans; recall's hypotheticals | as above | Labelled ("simulated morning" in each caption) |
