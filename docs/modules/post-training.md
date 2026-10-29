# Post-training (`/post-training/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The exam hall** (`src/components/scenes/examScene.ts`): the model (RAG's LLM block, composed) at the back, a row of answer-card stacks in front, one per written answer and as tall as the toy policy's probability (`STACK_H` at 1), with a mint or tomato mark on top once graded; the grader's desk at the front right with evalScene's rubber stamp (`rubberStamp`, exported) and the latest group of drafts on it, its pill naming the grader; a curve board at the back reading the round or the strength. `PostStage` (`src/content/post-training/kit.tsx`) puts it one tab from Bars (`policyBars.ts`: before and after per answer, its reward, the gaming answer in tomato; arrow keys read each answer). Chapter 7 keeps its tab in the step state; on phones the cards' pills keep only their letters and the caption carries the numbers.
- **Hero object:** the curve board is a chalkboard on an A-frame easel with a rising curve chalked on it; each answer's stack stands in a wooden card holder (the gaming answer's cards carry a tomato tab), and a teacher stands behind the grader's desk reaching for the stamp.

## Engine (`src/lib/post-training/`)

- **Recorded answers, live toy-policy maths** (KTD4). `data/post-training/candidates.json` holds 4–5 hand-written answers per question (four of Evals' checkable questions, plus a tone question), each with a note, a hand-set starting probability (`ref`) and flags (`best`, `gaming`, `base`). The policy is a categorical distribution over one question's answers; every chapter's copy calls it a toy policy (`TOY`).
- **Graders are rule sets** (`graders.ts`): an answer's reward is how many rules it passes. `fact` and `exact` are Evals' `keyFactOf` and `exactMatchOf` against `data/post-training/references.json`; `number`, `signoff` (Fine-tuning's `signsOff`) and `short` are weak surface checks. `FULL` is the key fact; `WEAK` is a number plus the sign-off, which every gaming answer passes while failing the key fact. Evals' and Fine-tuning's code is only read.
- **DPO is the closed form** (`policy.ts`): a Bradley–Terry reward fitted with an L2 pull to the reader's pairs, then π ∝ π_ref·exp(r/β), β from `BETAS`. Iterating DPO's loss on a table-shaped policy ignores β; the maths fold-away says so and shows `dpoLoss`.
- **GRPO is seeded** (`grpoRun`, `mulberry32`, `seedOf(question)`): a group of `GROUP` drafts, advantage (r − mean) / std, zero for a group with no spread, `INNER` clipped policy-gradient steps (`CLIP`) per round, `ROUNDS` rounds. No KL term (`shortcut:`).
- **Chapter 1 runs Fine-tuning's live `replyOf`** from the base and fine-tuned weights; it links `/fine-tuning/`.
- **Chapter 3 reads chapter 2's saved picks** (`loadChapter`), and uses the team's picks (`TEAM_PICKS`), saying so, when there are none.
- **Chapter 7's workbench** (`workbench.ts`): every subset of `RULES` (2^5) run with GRPO on each checkable question; `WINNERS` is every rule set where each question's best answer ends most likely, so no gaming answer wins (20 of 32 today). Tests: `post-training-policy`, `post-training-coverage` (budget 30 answers), `post-training-workbench`, `exam-scene`.
- **Facts about post-training** come from `data/post-training/facts.json` with source and access date: InstructGPT, DPO, DeepSeekMath (GRPO), Tülu 3 (RLVR), DeepSeek-R1, reward-model overoptimisation and DeepMind's specification gaming.
