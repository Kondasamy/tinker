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

## Toy vs real

Evals has no trained toy: its counts come from RAG's real search over the committed index and the answers recorded for what it found, graded live by code or by recorded judge verdicts and people's labels. What is small on purpose is the sets (12 questions, 9 support messages, 3 cases tried 5 times), so nothing is matched; `SuiteNote` (`kit.tsx`) says the sets are small and recorded and sits beside a cited real figure wherever their counts show.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | 12 questions; v1 and v2 passed counts, fixed and broken counts; 2 tried | `version-drift` (GPT-4's March vs June 2023 versions: 84% then 51% on primes, better on several-fact questions) | Real (computed from the suite); the set's size labelled by `SuiteNote` |
| 1 | Five questions asked by hand (quiz) | none | Labelled: a hypothetical in the question |
| 2 | Kept, dropped and unsorted counts out of 9 support messages | `start-from-failures` (20 to 50 cases to start) | Labelled: `SuiteNote` beside it |
| 3 | Each grader's verdict on three answers | `code-graders`, `model-graders`, `human-graders` | Real (code graders live; judge and person recorded) |
| 4 | Judge vs people agreement under r1 and r2; pairs that change winner | `judge-agreement` (GPT-4 agreed with people over 80% of the time), `agreement-imbalance`, `position-bias` | Labelled: recorded verdicts and labels, `SuiteNote` beside `judge-agreement` |
| 5 | The $5,000 refund; verdicts per grader | `outcome-is-state`, `grade-output-not-steps` | Real (Tool calling's recorded run, graded live) |
| 6 | 3 cases × 5 tries; pass@k and pass^k for k = 1, 3, 5; one question is 8.3 points of 12 | `pass-hat-k-tau-bench` (pass^8 under 25% on its retail tasks), `trial` | Labelled: recorded tries stand in for sampling, `SuiteNote` beside the τ-bench figure |
| 7 | Bars 50, 60, 75, 90%; each candidate's pass rate | `pass-hat-k` | Real pass rates; bars are hand-set choices, `SuiteNote` beside the fact |
| 7 | A 90% gate (quiz) | none | Labelled: a hypothetical in the question |
| Intro, recall | 12 questions, v1 → v2 passed, fixed and broken counts; quiz hypotheticals | as above | Real (computed from the suite); hypotheticals in questions |
