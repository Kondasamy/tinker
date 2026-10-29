# Evals (`/evals/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The evals bench** (`src/components/scenes/evalScene.ts`) composes RAG's `miniPipeline`: a stack of test cards rides a belt into the pipeline, and the answers go to a grader's desk where cards pile up PASS and FAIL, with a scoreboard pill. `EvalStage` (`src/content/evals/kit.tsx`) puts it one tab from the Results grid (`evalGrid.ts`, a column per version, flipped cells marked). Chapter 5 grades a Tool calling run, so its stage is Tool calling's `ToolStage` and ledger. Chapter 7 keeps its tab in the step state.
- **Hero object: the grader's desk with a big rubber stamp and an inked pad** (evals' own stamp, larger than the `rubberStamp` other scenes share); the grader stands behind it, the tests wait in a card box, and a scoreboard on a stand shows the passed and failed shares as bars.

## Engine (`src/lib/evals/`)

- **Versions over RAG's questions, reading recorded answers.** `suite.ts` defines four versions of Larkspur's assistant (v0 no documents, v1 RAG's defaults, v2 bigger pieces, v3 reranker and top 5) as RAG knobs. Running a version is RAG's real retrieval over the committed index on the 12 questions of RAG chapters 3–6, then the recorded answer for what it found (`data/answers/`). No new model answers; a missing one throws.
- **Code graders are computed; everything else is recorded.** Exact match, key fact and citation run live (`graders.ts`) against `data/evals/references.json`. `exactMatchOf(reference, text)` and `keyFactOf` take a reference, so other modules grade their own fixtures by Evals' rules; `exactMatch` and `keyFact` call them. The model judge (`judge.json`: per answer and rubric, keyed by question and signature), the people's labels (`labels.json`) and the repeated tries (`samples.json`, standing in for sampling a live model) are recorded data.
- **Side-by-side judging is recorded in both orders** (`ab`, `ba`); a pair whose winner changes with the order is position bias.
- **The path chapter reads Tool calling's runs**: it plays `order-status` and `injection` through `src/lib/tools/host.ts` and grades the reply, the ledger and the calls. Tool calling's recordings are never edited; the judge's verdicts on those runs live in `judge.json` `runs`.
- **The release gate is a host rule** (`decide`): a pass-rate bar, and optionally no question that passed on the baseline (v1) may fail.
- **Coverage:** every chapter control has a finite domain (`DOMAINS`, and `WORKBENCH_DOMAINS` for chapter 7). `tests/unit/evals-coverage.test.ts` and `evals-workbench.test.ts` walk every combination and fail on any missing answer, reference or judge verdict.
- **Facts about evals** come from `data/evals/facts.json` with source and access date.
