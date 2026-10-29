# Bias and fairness (`/fairness/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The sorting gate** (`src/components/scenes/gateScene.ts`): Larkspur's trade counter, with two lanes of applicants walking toward it. Northvale's lane (region A) is cobalt and sits at the back; Eastmere's (region B) is mustard and sits at the front. Each lane passes a score post at the gate: a round disc on Northvale's post and a square plate on Eastmere's, with a tomato collar at the lane's bar. The model machine stands between the two posts and does the scoring. The approved walk on to the counter, where the clerk (`CAST.employee`) serves them. The turned down walk back out through a grey pen on the near side of their lane, beside the queue. Someone who would have repaid but was turned down leaves their bag (tomato) on the ground.
- **Region is never shown by people's looks** (R13). The applicants are generic shoppers whose skin tones (`SKIN`), tops and hair repeat in the same order in both lanes. Region is shown by lane colour, side (back or front) and the shape on the post, never by colour alone.
- **Drawn people stand for counts.** People are packed closer than the kit's 11-unit footprint, so each sorts by its body's own box. The drawing is passed through `compact()` and is about 280 kB (`scene-size.test.ts` baseline 100,000). Each lane draws at most 12 people (6 on phones), split across the four outcomes (approved or turned down, repaid or not) by largest remainder (`drawnOf`). A count pill on each lane gives the true totals from `metrics.ts` (`N IN · M OUT`). Each lane carries its true counts as `data-tp/fp/fn/tn`, which the tests read.
- **Slide the bar** (`GateStage`, `src/content/fairness/kit.tsx`): one native range per lane, over `BARS` (0.20–0.80) or the workbench's `BENCH_BARS`. While `linked` (ch. 1–4), moving either range moves both. From ch. 5 each moves alone. When the stage mounts, the applicants walk through the gate in about a second. With reduced motion, the final split shows at once. Each range is at least 44 px tall on phones. In `astro dev` the stage logs a hydration warning: the kit's walking `person` sorts its own parts one way in Node and another in Chromium (a rounding difference). The walk's first tick re-renders it, so nothing shows.
- **Read-out**: one polite `role="status"` line under the ranges. It gives each lane's new split after each move and once the walk-through ends, and it clears when `step` changes.
- **The Bars tab** (the second view): per-group false-decline, false-approve, error and precision bars, Northvale and Eastmere side by side, with each bar's value written beside it. Both views are read off the same `runOf` call.
- **Parts for callouts** (`GATE_PARTS`): `check` (the model machine), `lane-a`, `lane-b`, `post-a`, `post-b`, `out-a`, `out-b` (the turned-down pens), `counter`.

## Chapter pictures

| Ch. | Picture | Mechanic live? | The step's control | `say` parts |
|---|---|---|---|---|
| 1 `right-on-average` | Both lanes at the shared bar 0.50, every field, no fix; the overall error in the caption | Yes, linked | linked bar range (`bars`), then a predict quiz | `check`, `counter` |
| 2 `errors-by-group` | The same lanes; the dropped bags show more often in Eastmere's pen; the Bars tab shows the two false-decline rates | Yes, linked | linked bar range; the tab (`view`) where a step asks for the bars | `out-b`, `out-a`, `lane-b` |
| 3 `where-skew-comes-from` | The same lanes; the count pills show the thin sample (300 against 100) | Yes, linked (exploration only) | a predict quiz on the proxy and the sample | `lane-b`, `post-b` |
| 4 `dropping-the-column` | The lanes rerun with the region field dropped, then with both region and postcode dropped (`features`) | Yes, linked | the field-set chips (chapter's own, `features`) | `check`, `out-b` |
| 5 `one-bar-or-two` | The ranges are split; Eastmere's bar moves down to the pinned even pair (0.28) | Yes, split | Eastmere's range (`bars.B`) | `post-b`, `post-a` |
| 6 `every-kind` | Split bars; the Bars tab shows that precision and both error rates can't all match | Yes, split (exploration) | the tab (`view`), then a predict quiz | `post-a`, `post-b` |
| 7 `workbench` | Fields, sample fix and a bar per lane over `BENCH_BARS`; Bars tab for the gap | Yes, split | the bench's controls (fields, fix, both ranges) | `check`, `out-b` |

## Chapters

- **Every number on the page is computed** from `runOf()` or read from `pinned.json`; `tests/unit/fairness-chapters.test.ts` checks each prediction's outcome against the engine.
- **The range steps name one bar.** Ch. 1 asks for the shared 0.50 (0.51 ties on overall error but shifts the regions' rates, so the reveal would lie). Ch. 5 keeps Northvale's bar where it started and accepts every Eastmere bar that evens false declines (the pinned 0.28 and its neighbours); its cost table is read off the reader's own bars.
- **The thin sample is noise, not a fix.** Counting Eastmere three times in the fit widens the gap here (one rule made both regions' records), and ch. 3 says so; the lesson is that one Eastmere repayer is about 2 points of its rate.
- **The protected-class setting is named once**, beside `ecoa`, in ch. 5 (and the workbench repeats only that two bars are a legal question). "Hand-made" is said once in narration (ch. 1); `ApplicantsNote` sits under every stage (R6). The no-held-out-set caveat folds away in ch. 1 and the workbench.
