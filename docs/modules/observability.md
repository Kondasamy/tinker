# Observability (`/observability/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The control room** (`src/components/scenes/traceScene.ts`): a wall at the back holds the day's traces as cards pinned in rows (forty at most, `WALL_MAX`), a red stripe on each failed one and the trace being read lit; along the front stand the sorting bins, one per failure mode, each with its pile of sorted cards, and a tally board pill reads the counts (or the chapter's words). `ObsStage` (`src/content/observability/kit.tsx`) puts it one tab from the Waterfall (`traceWaterfall.ts`, React SVG: a lane per span, nested and timed, the first failure stamped FIRST FAILURE; arrow keys read the spans, Enter picks one in chapter 2's puzzle). The Waterfall tab stays off until a trace is open. On phones the bins' pills keep just their counts and the caption carries the names; the waterfall names spans by kind.

## Engine (`src/lib/observability/`)

- **A hand-written day of traffic, nothing measured** (KTD8). `data/observability/traces.json` holds 40 traces of Larkspur's assistant, 18 of them failed: each a span tree (an agent span over retrieval, model calls, tool calls and the reply) shaped like OpenTelemetry's GenAI conventions. The copy says "shaped like". Spans carry only attribute names checked against the spec (`gen_ai.operation.name`, `gen_ai.tool.name`; facts `otel-genai`, `otel-operations`). Timings and failures are written by hand, and `problems()` validates every trace in the engine test.
- **Every failed trace carries a reference**: its first failing span (`first`) and its failure mode (`mode`), one of five modes in the same file, each with a harm rating (1–3). They are the only home of the answers.
- **Notes are the reader's own and never graded** (`coding.ts`): open coding keeps a free note per failed trace in the chapter's saved run (localStorage, this module's progress, so Reset clears them), capped at `MAX_NOTE` (140), rendered as text only, never sent anywhere. Chapter 3 needs five notes (`NEEDED_NOTES`); a trace without a note carries its suggested note into chapter 4.
- **A grouping is checked against the reference modes whatever the groups are called** (`groupingMatches`): it passes when traces share a group exactly when they share a mode. Counts and the harm-weighted ranking (`fixFirst`, ties kept) are computed from the labels, never typed.
- **Chapter 6 grades eval cases with Evals' own code graders**: a failed trace becomes a case (`cases.ts`), its current reply against the fixed version's recorded answer (`data/observability/fixed.json`), graded live by `keyFactOf` and `hasCitation` from `src/lib/evals/graders.ts`. Evals' data and recordings are read, never edited.
- **Chapter 7's workbench** (`workbench.ts`) triages day 2's thumbs-down queue (`data/observability/day2.json`): a mode per trace and the one fix to ship. The tally counts the reader's labels, but the harm a fix removes is counted from the reference modes, so a mislabelled queue can point at the wrong fix. The puzzle accepts every fix tied for the most harm removed (`WINNERS`).
- **Facts about error analysis and tracing** come from `data/observability/facts.json` with source and access date.

## Toy vs real

Every trace, timing and count below comes from the hand-written day (`traces.json`, `day2.json`), so none is matched: a real figure would mean measured traffic, which the module doesn't have (KTD8). Each chapter's `ToyNote` (kit) says so beside a cited real finding and names what the toy stands for. Fact values the copy reads (`saturation`, `annotate-yourself`) are real.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | 40 traces; the trace's 6 spans; ms per span, per kind and in total | `otel-genai`, `otel-operations` (span names from the spec; no timings) | Labelled: a real tracer records start and end as it runs |
| 2 | 18 failed traces; span positions in the chip list | `failure-attribution` (best automatic method found the deciding step 14.2% of the time, 127 systems) | Labelled: the toy's first failures are marked by hand, real ones come unmarked |
| 3 | 5 notes needed (`NEEDED_NOTES`), N of 18 noted, 5 kinds of failure | `annotate-yourself` (30 yourself), `criteria-drift`, `open-coding` | Labelled: 5 notes stand in for a real review's far more |
| 4 | 18 failures in 5 modes; group sizes; most common mode's count; 50 traces (quiz) | `mast-taxonomy` (150 traces, 14 modes in 3 groups, kappa 0.88), `axial-coding` | Labelled; the quiz's 50 is a hypothetical |
| 5 | Count per mode; harm 1–3; count × harm; 30 and 3 failures a week (quiz) | `nist-risk` (risk weighs harm and likelihood together), `error-analysis` | Labelled: ratings are the team's judgement; the quiz numbers are a hypothetical |
| 6 | Cases added; PASS n/N per version; harm 3 of 3 | `behaviour-drift` (GPT-4 84% → 51% on primes, March to June 2023), `evals-from-errors` | Labelled: answers are recorded, grading runs live with Evals' graders |
| 7 | Day 2's queue length; labels right; harm removed of best; tally; tied fixes (`WINNERS`, computed) | `saturation` (about 100 traces), `saturation-interviews` (no new themes after 12 of 60 interviews) | Labelled: one hand-written day stands in for reading until no new modes appear |
| Intro | 40 traces, 18 failed, 5 modes; 30 and 100 | `annotate-yourself`, `saturation` | 40/18/5 labelled ("written by hand"); 30 and 100 real |
