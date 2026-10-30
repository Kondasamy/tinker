# Calibration (`/calibration/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The forecaster's booth** (`src/components/scenes/jarScene.ts`): glass jars stand on a long shelf that is a ruler of stated confidence (0% left, 100% right, a tick each tenth), one jar per reliability bin at its guesses' mean confidence, pushed apart where two crowd (`jarPlaces`). Each jar holds 20 marbles in proportion (KTD15's cap; `marblesOf`), mint for right and tomato for wrong, mint at the bottom, and a mustard ring is painted at its stated level, so an honest jar's mint comes up to its ring. A temperature dial at the front right mirrors the story column's native range over `TEMPERATURES` (the dial is never the control); a help desk at the front left counts hand-overs, and a post on the shelf marks the hand-over line, the jars below it emptied; a slate at the back carries a score; a crate of unsorted marbles stands in front. Marbles drop in when the jars' contents change (sorted, or re-sorted by the dial; CSS in `calibration.css`, none with reduced motion). `CalibrationStage` (`src/content/calibration/kit.tsx`) puts it one tab from the Diagram (`reliabilityChart.ts`: stated confidence against how often right, the dashed diagonal honest, a gap whisker per jar, focusable jars read by arrow keys with a read-out line). Desktop jar pills read the level and the count in three staggered rows; on phones they keep only percentages, in two.

## Engine (`src/lib/calibration/`)

- **A real model measured first, then a stand-in** (KTD8). `measure.ts` reads Larkspur mini's guesses over Fine-tuning's held-out copy (read only), in `evaluate()`'s windows: each position is a guess, its top-1 probability the confidence and whether the top pick was the real next piece. Each guess keeps its confidence and the right piece's log-probability at every temperature in `TEMPERATURES` (the top pick never changes with T), so the dial never re-runs the model. The kit measures a few windows per animation frame (8 ms) through Fine-tuning's loaders, kept once per loaded model; the copy says these are the tiny model's own numbers.
- **Jars are tenths merged to a minimum** (`score.ts` `bins`): equal-width tenths, merged from the sure end down until each holds `MIN_BIN` (20, pinned) held-out guesses, so no jar any chapter shows rests on a handful; `calibration-measure.test.ts` checks every jar for both weights, both halves and every temperature. ECE is computed over those jars; Brier, coverage and accuracy are computed live.
- **The fine-tune's lost calibration is pinned** (`data/calibration/pinned.json`): the style fine-tune, scored on text it was not tuned for, has a higher ECE than the base (0.270 against 0.032), KTD8's bar; chapter 3 cites GPT-4's post-training loss apart, as OpenAI's finding about a far larger model.
- **Temperature scaling over a finite list**: fit on the even positions (the fit half) by log loss (`fitT`), scored on the odd (the test half); the fine-tune's fitted T and its test-half ECE before and after are pinned.
- **The assistant's answers are a stand-in** (`data/calibration/answers.json`): sixty answers in three kinds, each with a hand-set confidence written to show the overconfidence Guo et al. report, graded live by Evals' `keyFact` (where an answer names an Evals question) or `keyFactOf` against `data/calibration/references.json`. Every chapter that shows them says so (`StandIn`). A yes-or-no confidence is softened at T by dividing its log-odds (`soften`).
- **Chapter 7's workbench** (`workbench.ts`): per kind, a temperature (what customers are shown) and a hand-over line on the stated confidence (which the dial never reorders), 45 choices a kind. The desk's rules (`data/calibration/workbench.json`, the team's choices): wrong answers sent at most 10% a kind, the shown confidence's average within 5 points of how often it is right, and all hand-overs within the desk's capacity. `WINNERS` (every plan keeping the rules with the fewest hand-overs, 18 today) is pinned and recomputed by `calibration-workbench.test.ts`; one line for every kind overflows the desk.
- **Facts about calibration** come from `data/calibration/facts.json` with source and access date (Guo et al., Kadavath et al., the GPT-4 report's Figure 8 read from the paper, Brier 1950 by its DOI, Geifman and El-Yaniv).

## Toy vs real

Two kinds of number show, and neither is matched: Larkspur mini's are measured live on this site's tiny model (trained ahead of time, so labelled and never retrained; `MiniNote`), and the assistant's are the hand-set stand-in answer set (`StandIn`). Each chapter puts a cited finding beside them, introduced as a separate finding about other models. The desk's rules are the team's choices (`workbench.json`), not measurements.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | 60 answers, each jar's stated level and right count, overall right share | `forecasters` (weather forecasters' stated chances come true about that often) | Labelled: stand-in, written to be overconfident |
| 1 | 30% rain on 100 days, 31 wet (quiz) | none | Labelled: a hypothetical in the question |
| 2 | Held-out guesses, right share, top jar's stated level and count | `kadavath` (larger models well calibrated on multiple-choice questions) | Labelled: the tiny model's own measurement |
| 2 | 90% (prediction); 60%, 95%, 94% (quiz) | none | Labelled: hypotheticals in the questions |
| 3 | Sure on average and right share, base and fine-tune | `gpt4` (0.007 before further training, 0.074 after) | Labelled: the tiny model's measurement; GPT-4's figures cited apart |
| 4 | Temperatures 0.5–3, fitted T, log loss, fit and test half sizes, sure and right share | `guo` (temperature scaling works on modern networks) | Labelled: the tiny model's measurement |
| 5 | Always-the-hit-rate forecaster, calibration error and Brier score per forecaster | `brier` | Labelled: the tiny model's measurement |
| 6 | Hand-over lines 70–95%, coverage, accuracy, wrong sent; the 10% limit | `selective` (set the error rate you accept, decline to keep it) | Labelled: stand-in answers; the limit is the team's choice |
| 6 | 95% answered by a bank's chatbot (quiz) | none | Labelled: a hypothetical in the question |
| 7 | Per-kind wrong sent, shown vs right, hand-overs; 10%, 5 points, 25 a day; best 18, ties | `per-domain` (one temperature over pooled kinds: 1.1% pooled, 5.8% within a kind) | Labelled: stand-in answers and the team's rules; `WINNERS` recomputed by its test |
| Intro, recall | The same measured calibration errors (0.032, 0.270, after fitting), 18 of 25, GPT-4's 0.007 and 0.074 | as above | Labelled (MiniNote / stand-in note on the page); GPT-4's read from `gpt4.value` |
