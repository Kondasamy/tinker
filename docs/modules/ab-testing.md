# A/B testing (`/ab-testing/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The shop floor** (`src/components/scenes/splitScene.ts`): shoppers queue at the front; a turnstile sends each one at random down a belt to checkout A (today's, left) or checkout B (the change, right), shoppers riding the belts while a test runs. Beside each counter a tower of mint crates grows with its buying rate and, when the guardrail is watched, a tower of tomato crates with its share of orders sent back. At the back a scoreboard holds two bars (A cobalt, B mint) as tall as their rates under the verdict pill (B WINS, NO WINNER, or tomato when returns rise). `splitAt` reads the floor off a run at a day. `AbStage` (`src/content/ab-testing/kit.tsx`) puts it one tab from the Result chart (`resultChart.ts`: B − A by day with its interval band round zero, significant days inked, the planned end dashed and where a daily peek stopped; arrow keys read each day). Repeated runs show as a tally grid in the story column. On phones the pills keep just the names and the caption carries the numbers.
- **Hero object: two different checkouts**: A is an old brass till on a wooden counter under a striped awning, B a slim one-page kiosk on a pedestal beside a steel bagging shelf. Shoppers (CAST shoppers) queue beside the turnstile and walk the belts; the crate towers stand on pallets; the scoreboard is a board on legs with a verdict lamp.

## Engine (`src/lib/ab-testing/`)

- **A seeded visitor simulator, nothing recorded** (KTD11). `sim.ts` sends the same number of shoppers a day to each checkout (an arm); each buys with the arm's true rate and each order comes back with its return rate, drawn as binomials (one uniform each, by inversion) from `mulberry32` with the run's seed. Traffic and rates are Larkspur's labelled assumptions (`data/ab-testing/assumptions.json`); each scenario's true rates and pinned seed are in `data/ab-testing/experiments.json`, written for this site. The copy says simulated shoppers, never a real shop.
- **Rates come from repeated runs, formulas stay folded.** False wins (fixed horizon, daily peeking, twenty colours with and without a correction) and power are counted live over a fixed seed list (`SEEDS`, 1 to `repeats`, 100) and drawn as a tally; the narration shows no formula. `stats.ts` holds the two-proportion z-test (pooled), the interval for B − A (unpooled), Kohavi et al.'s 16σ²/Δ² sample-size rule (fact `sample-size`; the test pins their example) and Bonferroni, shown only in "The maths" fold-aways.
- **Twenty colours share one control**, so the family's false-win rate counted (37 of 100) is below the textbook 1 − 0.95²⁰; the copy only ever shows the counted rate.
- **Pinned runs teach one thing each**: chapter 2's A/A run has a visible gap and no winner, chapter 3's misses at one week and finds the lift at the planned size, chapter 4's peek declares a win the full run does not keep, chapter 5's crowns one colour by luck. `tests/unit/ab-testing-sim.test.ts` and `ab-testing-workbench.test.ts` fail if a seed or rate change breaks one.
- **Chapter 7's workbench** (`workbench.ts`): a decision (ship, keep testing, stop) per experiment, 3^experiments plans, each read once at its planned end. The rule: ship when significant, better and the returns guardrail holds; keep testing when not significant and underpowered (fewer shoppers than `NEEDED`); stop otherwise. `WINNERS` is every plan that follows it (one today). The true effects are revealed after the bench, apart from the rule, including the lucky win the rule ships.
- **Facts about controlled experiments** come from `data/ab-testing/facts.json` with source and access date.

## Toy vs real

The shop is simulated (`SimNote` on every chapter): traffic, true rates and seeds are Larkspur's hand-set numbers (`assumptions.json`, `experiments.json`), so every rate a run shows is labelled. Two rule constants are matched: the significance level reads fact `confidence-level` (`ASSUMPTIONS.level`) and the sample-size rule's 16 reads fact `sample-size` (`RULE` in `stats.ts`).

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| All | 400 shoppers a day per checkout, 1 in 10 buy, 1 in 20 orders returned | none: Larkspur's planning numbers | Labelled (`SimNote`) |
| All | 5% significance level, 95% interval | `confidence-level` (5% of the time) | Matched (`ASSUMPTIONS.level`) |
| 1 Did it work | Day-1 and day-14 rates, B − A in points, its interval, 14 days | `random` | Labelled (true rates 10% and 12% set by hand) |
| 2 Luck | A/A gap, "19 times in 20", 100 A/A tests, false wins counted | `aa-test` (about 5% of the time) | Gap and count labelled (seeded runs); "19 in 20" matched (from the level) |
| 3 How many shoppers | 1-point true rise, power at 1–8 weeks, 14,400 shoppers needed, the 16 in the maths | `power`, `sample-size` | 16 matched (`RULE`); shoppers needed derives from it and the labelled 10% rate; power counted over seeds, labelled |
| 4 Peeking | Day a peek stops, its lead, false wins with daily peeks vs one look | `peeking`, `always-valid` | Labelled (seeded A/A runs; the papers show the same inflation, not these counts) |
| 5 Twenty colours | 20 colours, 100 runs, runs that crown a colour with and without the correction, 0.05 ÷ 20 | `multiple`, `fdr` | Counts labelled (colours share one control, so below 1 − 0.95²⁰); 0.05 matched |
| 6 Guardrails | Buying and returns B − A, share sent back, orders kept per shopper | `short-term`, `guardrails` | Labelled (true rates set by hand) |
| 7 Ship or stop | Shoppers needed, each experiment's result, interval and shoppers, true rises, 2 of 5 ideas truly help | `one-third`, `replicate` | Results labelled; shoppers needed matched via `RULE`; the 2 of 5 is a hand-set mix, shown beside Microsoft's one in three |
| Intro | 400 a day, shoppers needed, peek and colour counts | as above | As above |
