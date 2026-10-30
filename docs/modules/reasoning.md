# Reasoning (`/reasoning/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The scratchpad desk** (`src/components/scenes/thinkScene.ts`): the model (RAG's LLM block, composed) at the back, a pad of thinking papers beside it whose height follows the thinking tokens (a sheet per 20, capped at 16; its pill still gives the count), an effort dial in front with four notches and the pointer on the chosen effort, and a clock whose pill gives the wait. No thinking, no pad. The model's screen goes green or red once the answer is graded. The thinking text itself goes in a panel under the stage, never on the picture. `ReasoningStage` (`src/content/reasoning/kit.tsx`) puts it one tab from Accuracy (`effortChart.ts`: accuracy against effort, flat, a point per level and a line per kind of question, with focusable levels and a read-out line naming accuracy and cost). Chapter 7 keeps its tab in the step state; on phones the pills keep short names.

- **Hero object:** the spiral notepad propped on a lap desk (the pad), with a stove-knob dial and a twin-bell alarm clock.

## Engine (`src/lib/reasoning/`)

- **Recorded answers, everything else live** (`engine.ts`). Each question × effort has a recorded thinking and answer, each with a one-line note (`data/reasoning/answers.json`); a missing one throws. The token counts (the language-model kit's BPE), the grade, the cost and the wait are computed when the page runs.
- **Effort levels, not token budgets**: `EFFORTS` is none, low, medium and high, naming the APIs' effort settings; chapter 5 says today's APIs take effort and adaptive thinking, not a fixed budget (facts `effort-levels`, `adaptive`, `budget-deprecated`).
- **Three kinds of question** (`data/reasoning/questions.json`): policy lookups (Evals' own questions, in Evals' words), multi-step quotes, stock and delivery questions, and simple counts wrapped in distractions. Lookups are graded by Evals' `keyFact` against Evals' references; the rest by `keyFactOf` against `data/reasoning/references.json`. Evals' data is only read.
- **Thinking is counted and billed as output**: cost is thinking plus answer tokens, in relative units (one output token is 1), never dollars. The wait comes from Larkspur's assumed rate in `data/reasoning/assumptions.json` (a first token after half a second, then a fixed rate), an assumption, not a provider figure; every chapter that shows a wait says so.
- **The answers illustrate sourced findings, they are not measured** (KTD8): how much thinking helps depending on the question follows Snell et al. (2024), and overthinking on simple questions with distractions follows Gema et al. (2025), cited in the reveal.
- **Chapter 6's gate is Evals' `decide`**: a pass-rate bar, and no question that was right with no thinking may go wrong (`GATE`, baseline `none`); the right setting per kind is the lowest effort that ships (`lowestPassing`).
- **Chapter 7's workbench** (`workbench.ts`): an effort per kind of request, a finite domain of 4^kinds plans, read off the recorded answers. Every plan with the most right answers at the lowest cost wins (`WINNERS`), not one hand-picked answer.
- **Coverage:** every chapter control has a finite domain (`DOMAINS`, and `WORKBENCH_DOMAINS` for chapter 7). `tests/unit/reasoning-coverage.test.ts` walks every combination and fails on any missing answer, on a recorded answer nothing reaches, or past the budget of 120 answers.
- **Facts about reasoning models** come from `data/reasoning/facts.json` with source and access date; effort settings and billing move fast and are re-checked when the module changes.

## Toy vs real

Every answer and its thinking is recorded (written for this site), so no count, grade, cost or wait below is a measured model result; each is computed live from those recordings. None is matched to a fact's `value`: the findings are about real models and benchmarks, not Larkspur's questions, so each toy number is labelled (the `recorded` tags, the chapters' "written for this site" notes, `RateNote` for waits) with a real finding on the same step.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Thinking tokens on the split-order quote (0 at none, 150 at medium), right or wrong | GSM8K solve rate 18% → 57% when PaLM 540B writes its steps (`wei-cot`) | Labelled (recorded answers; counts from the site's tokenizer) |
| 2 | Thinking + answer tokens, cost (relative units, one output token is 1), wait per effort | Thinking billed as output (`thinking-billed`, `openai-reasoning-billed`) | Labelled; the wait is Larkspur's assumed rate (`assumptions.json`: 0.5 s, then 40 tokens/s) |
| 3 | 6 multi-step questions; right per effort 1, 3, 5, 5 of 6; thinking tokens and average wait over the set; quiz's 50/75/90/90% | Thinking pays more on harder questions, 4× more efficient per question (`snell`) | Labelled (recorded; the quiz's sweep is a hand-set scenario) |
| 4 | 3 counts with distractors: 3 of 3 right at low, 0 of 3 at high | Inverse scaling on counting with distractors (`gema`) | Labelled (hand-written to illustrate the paper) |
| 5 | Thinking tokens per question at each effort; quiz's 8,000 and 32,000-token budgets | Effort is a signal, not a budget; levels; budget deprecated (`effort-signal`, `effort-levels`, `budget-deprecated`, `openai-effort`) | Labelled (recorded); the quiz budgets are a hand-set scenario |
| 6 | Gate bar 80% (Evals' `GATE`); lowest passing effort per kind (none, medium, low) | Test each effort on your own use cases (`measure-effort`) | Labelled: the bar is a planning number, the picks computed from recordings |
| 7 | Plan totals: right of 12, cost (best 12 for 1,249), average wait; 1 winning plan | Adjust effort to task complexity (`dynamic-effort`) | Labelled; `WINNERS` computed, never hand-typed |
| Intro | 150 thinking tokens, 17% → 83% multi-step right (none → medium), lookups' effort none, 6.0 s wait | `adaptive`, `thinking-billed`, `snell`, `gema`, `effort-signal`, `measure-effort` | Labelled ("written for this site… not any provider's numbers") |
