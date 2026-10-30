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

- **Hand-set, never measured** (KTD3, R13): `data/choosing-models/machines.json` (public score, price per million input tokens (output is input times the real price list's multiple, `OUT_TIMES` from the `prices` fact), time to first word, words per second), `questions.json` (Larkspur's 20 with which machine passed each, Support's bar, a typical reply's tokens and words), `workbench.json` (the three teams: own quality per machine, typical request, needs). The note in `machines.json` shows under every stage. No real model is ranked; real leaderboards, prices and retirement notices are cited facts with dates (`facts.json`).
- **Numbers chosen to teach**: public A > B > C; Larkspur's 20 A 18, C 17, B 14 (B falls to last); A costs about 30 times C per answer; Support's bar 16 clears A and C, and C is cheapest; C's new version scores higher in public and 15 on Larkspur's 20 (one answer fixed, three broken). Each team's needs leave exactly one machine (Support C, Warehouse B, Catalogue A).
- **Pins**: every effect above is in `pinned.json`, re-derived by `tests/unit/choosing-models-engine.test.ts` (`WRITE_PINNED=1` rewrites); the workbench's fits and WINNERS (every weight set per team that tips to its machine) by `choosing-models-workbench.test.ts`. The start (quality 4 alone for every team, the leaderboard habit) serves only Catalogue.
- **Links**: ch. 2 to Evals' test set, ch. 4 to Inference's prefill and decode, ch. 6 to Evals' release day; the intro names Small models.

## Toy vs real

The machines, Larkspur's questions and the teams are made up (`MachinesNote` under every stage says so); real figures sit beside them as cited facts. Only output's price over input's is matched.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Public-test scores A 88, B 84, C 76, out of 100 | Arena's 240,000 votes (`arena`); 27 private Meta versions (`leaderboard-illusion`) | Labelled |
| 1 | Poise weights 0 to 4 | none: a control, not a measurement | Labelled (toy control) |
| 1 | 240,000 votes; 27 versions | `arena`, `leaderboard-illusion` | Real |
| 2 | Larkspur's 20 questions; passes A 18, C 17, B 14 | Up to 8 points lower on fresh questions (`contamination`) | Labelled |
| 2 | 8 points | `contamination` | Real |
| 3 | Input prices A $3, B $0.50, C $0.10 per million tokens | Real lists run $0.10 to $10 in (`prices`) | Labelled (C's sits at the cheap end of the real range) |
| 3 | Output price = input × 5 (A $15, B $2.50, C $0.50) | Output costs 5 × input (`prices`) | Matched (`OUT_TIMES`) |
| 3 | 1,200 input and 250 output tokens per answer; 40,000 answers a month | none | Labelled |
| 3 | Per 1,000 answers A $7.35, B $1.23, C $0.24; A about 30 × C; the monthly bill | Real lists span 100 × (`prices`); narration says so | Labelled (derived from the toy prices) |
| 4 | First word A 0.9 s, B 0.4 s, C 0.2 s; 60, 90, 150 words a second; 180 words; whole reply 3.9, 2.4, 1.4 s | Time to first token and end-to-end wait, as NVIDIA defines them (`ttft`); the term names the real measure | Labelled |
| 5 | Support's bar 16 of 20; C $0.24 against A $7.35 per 1,000 | Cheaper models first matched GPT-4 for up to 98% less; prices differ up to 100 × (`good-enough`) | Labelled |
| 5 | 98%; 100 × | `good-enough` | Real |
| 6 | Versions c-2026-06 and c-2026-11; public 76 to 79; 15 of 20, 1 fixed, 3 broken | Pin a snapshot (`snapshot`) | Labelled |
| 6 | 60 days' notice (quiz) | `retirement` | Real (read from the fact) |
| 7 | Each team's quality per machine (%), needs (quality, $ per 1,000, longest wait), tokens per request | 30 models on 7 measures across 16 uses (`many-measures`) | Labelled |
| 7 | 7 measures; 30 models; 16 uses | `many-measures` | Real |
| Intro | 3 machines, 20 questions, A · C per 1,000, bar 16 of 20 | as chapters 1, 3 and 5 | Labelled |
