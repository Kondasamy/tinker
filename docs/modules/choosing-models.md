# Choosing a model (`/choosing-models/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The market hall** (`src/components/scenes/steelyardScene.ts`): three model machines (the kit's `modelMachine`), A, B and C, on stone plinths in a row at the back. In front of them a **brass steelyard** hangs from a timber gallows: the hero object no other scene uses. Rosa (`CAST.rosa`, with her clipboard) stands by to read it.
- **The steelyard is the weighing**: each criterion (quality, cost, wait) is scaled 0 (worst here) to 1 (best here) across the machines in play, times its poise's weight, and summed (`score.ts`). The short arm swings round to the machine with the highest sum and dips over it, further as its lead grows (`tiltOf`, 4° to 14°); its pan holds that machine's reply slips. A tie (no weight, or equal sums) hangs the beam level toward B with an empty pan. The winner's screen reads `OK`.
- **The poises** hang on the long arm at `notch(w)`, one per criterion, side by side across the beam so equal weights never hide one another: quality cobalt, cost mint, wait tomato. Each range beside the stage carries the same swatch and its name, so colour is never the only cue.
- **Under the bar** (ch. 5–6): a machine below Support's bar gets a tomato rope across its plinth and is left out of the weighing (`inPlay`). Ch. 6's new version shows `???` on C's screen.
- **Words only in pills**: on desktop each machine's pill carries its letter and its score in the chapter's terms (`A · 88`, `A · 18/20`, `C NEW · 15/20`, `A · 90%`); on phones only the letter, and the caption carries the numbers. `esc()` on every pill. Machine callouts hang below the plinths, the beam's at the long arm's end, the pan's below the pan, so none covers a name pill.
- **Parts for callouts** (`STEELYARD_PARTS`): `beam`, `pan`, `quality`, `cost`, `wait`, `machine-a`, `machine-b`, `machine-c`.
- **Slide the poise weights** (`SteelyardStage`, `src/content/choosing-models/kit.tsx`): one native range per criterion, 0 to 4, under the frame; a chapter opens only the ones it teaches (`only`). Arrow keys move a poise a notch. The beam swings to its new heading and tilt in 10 ticks over half a second; with reduced motion it shows the final tilt at once. Ranges are 44 px tall on phones.
- **Read-out**: one polite `role="status"` line under the ranges, `Tips to Machine C (quality 2, cost 1, wait 0).` after each move, cleared when the step changes.
- **The Scores tab** (the second view): one row per machine: quality in the chapter's terms, dollars per 1,000 answers, first word, whole reply and the weighed sum, the winner stamped PICK and any machine under the bar stamped. Read off the same `weigh` call as the picture.
- **Home and share images:** the home card and the intro hero are Larkspur's 20 with B under the bar, weighed quality 2, cost 1, wait 1 (C wins); the hero plot is `steelyardPlot`, the gallows and steelyard alone tipping toward C, set down small.

## Chapter pictures

| Ch. | Picture | Mechanic live? | The step's control | `say` parts |
|---|---|---|---|---|
| 1 `the-leaderboard` | Public-test pills (`A · 88`); level beam, then tipping to A | Yes: Quality only | predict (`p1`), then the Quality range (`weights`) | `beam`, `quality`, `machine-a` |
| 2 `your-own-questions` | Public pills, then Larkspur's 20 (`B · 14/20`); weighed on quality, B last | No: a Run button swaps the source | predict, the Run button (`run`) | `machine-b` |
| 3 `price-per-answer` | Larkspur's 20; quality 2, the cost poise tips it to C | Yes: Quality and Cost | predict, the Cost range (`weights`) | `pan`, `cost`, `machine-c` |
| 4 `the-wait` | Larkspur's 20; quality 2, the wait poise tips it to C | Yes: Quality and Wait | predict, the Wait range (`weights`) | `machine-a`, `wait`, `pan` |
| 5 `good-enough` | Quality alone tips to A; Apply the bar ropes off B and weighs cost: C | No: the bar button | predict, Apply the bar (`bar`) | `machine-a`, `machine-c` |
| 6 `models-change` | Cost among those over the bar (C); Run the new version: C `???`, roped off, the pick moves to A | No: the Run button | predict, Run (`run`) | `machine-c` |
| 7 `workbench` | One team's rows at a time (team `Select`); its poises | Yes: all three, per team | the team Select and the three ranges (`weights`) | `beam`, `pan` |

## Engine and data

- **Hand-set, never measured** (KTD3, R13): `data/choosing-models/machines.json` (public score, prices per million tokens in and out, time to first word, words per second), `questions.json` (Larkspur's 20 with which machine passed each, Support's bar, a typical reply's tokens and words), `workbench.json` (the three teams: own quality per machine, typical request, needs). The note in `machines.json` shows under every stage. No real model is ranked; real leaderboards, prices and retirement notices are cited facts with dates (`facts.json`).
- **Numbers chosen to teach**: public A > B > C; Larkspur's 20 A 18, C 17, B 14 (B falls to last); A costs about 33 times C per answer; Support's bar 16 clears A and C, and C is cheapest; C's new version scores higher in public and 15 on Larkspur's 20 (one answer fixed, three broken). Each team's needs leave exactly one machine (Support C, Warehouse B, Catalogue A).
- **Pins**: every effect above is in `pinned.json`, re-derived by `tests/unit/choosing-models-engine.test.ts` (`WRITE_PINNED=1` rewrites); the workbench's fits and WINNERS (every weight set per team that tips to its machine) by `choosing-models-workbench.test.ts`. The start (quality 4 alone for every team, the leaderboard habit) serves only Catalogue.
- **Links**: ch. 2 to Evals' test set, ch. 4 to Inference's prefill and decode, ch. 6 to Evals' release day; the intro names Small models.
