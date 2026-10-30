# Pre-training (`/pre-training/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **Hero object: a domed brick kiln with a chimney** (the furnace), fed by the shared roller belt and tended by a stoker with a coal shovel; checkpoints are cast ingots on a trestle shelf, and the model machine grows through its `height`.
- **The foundry** (`src/components/scenes/forgeScene.ts`): crates of Larkspur's documents at the back feed a furnace (the training run) along a belt. The furnace mouth glows and the belt and wire light while training runs, and it is cold before step 1. The model, a blush block, stands beside it and grows taller with each checkpoint. Along the front a shelf holds a slot per checkpoint: saved ones are filled, the current one lit. The crates show the data mix: four crates for all the documents, two for half, a tomato crate for one document copied ten times, a blush crate for the test questions mixed in. `PreTrainingStage` (`src/content/pre-training/kit.tsx`) puts it one tab from a chart: Fine-tuning's `LossChart` (the checkpoints' training and held-out loss, or a recorded run's curve), or, for chapter 6, the scaling view. A stage that needs a checkpoint holds its frame with a "Loading step N" pill, or an error card with Retry, until it is in. On phones only the lit checkpoint keeps its pill and the caption carries the rest.

## Engine (`src/lib/pre-training/`)

- **The base run's checkpoints run live; the variant runs are recorded** (KTD2, KTD3). `engine.ts` reads each checkpoint (`public/data/pre-training/ckpt-<step>.bin`, fetched on demand through `load.ts`'s `ckpt-<step>` weights) for its top 5 next pieces, its greedy continuation of a prompt (24 pieces, cut at the first blank line) and its held-out score, computed live over Fine-tuning's held-out copy, read only. The variant runs (`clean`, `duplicated`, `leaked`, `half`, in `data/pre-training/runs.json`) ship no weights: their curves, scores and greedy samples are read as recorded.
- **The readable bar** (`data/pre-training/prompts.json`): what every checkpoint writes after every prompt is pinned, and `tests/unit/pre-training-engine.test.ts` reruns all of them and fails on drift. The last checkpoint's continuations equal the clean run's recorded samples. The duplicated run's reply to "Larkspur Supply Co. sells office and warehouse" is a sentence from the copied policy, word for word, and the test proves it. A retrain that breaks one of these means new prompts, not hand-typed copy.
- **The published scaling fits are theirs, apart** (`scaling.ts`, `data/pre-training/scaling.json`): Hoffmann et al. (2022) Table 2's exponents (theirs from approach 1, and Kaplan et al.'s), with `grow(fit, k)` giving how many times bigger the model and how many times more tokens for k times the compute, and Table 3's compute-optimal rows. A test checks Kaplan's exponents against the 5.5× and 1.8× the paper cites, and each Table 3 row against 6ND. Larkspur mini is never placed on them: its losses are on other text, in other units, and chapter 6 shows its full and half runs in a separate panel.
- **Chapter 7's workbench** (`workbench.ts`): a data mix (one recorded run) × a stopping step from `STOPS` (steps on every run's curve, including the half run's held-out minimum at 600). A plan scores its run's held-out loss at that step, rounded to the two decimals the chapter shows. Every plan tied for the lowest wins (`WINNERS`, two today: all the documents at steps 2500 and 3000). Each row of the result table gives a computed reason.
- **Facts about pre-training** come from `data/pre-training/facts.json` with source and access date: Kaplan et al., Hoffmann et al., Lee et al. and Magar & Schwartz. Chinchilla's tokens per parameter is shown only as Table 3's rows, never as a rule of thumb.

## Toy vs real

Larkspur mini is trained ahead of time (`docs/lm-kit.md`), so none of its numbers is recalibrated (KTD5): every one is labelled. `ToyNote` (`kit.tsx`) sits beside a cited real figure on one step of every chapter, giving the toy's own size from its data (weights, vocabulary, steps, documents). The only real numbers on the stage are the published scaling fits in chapter 6.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Each next piece about one in 768 (the vocabulary); step 0's top-5 odds (live) | `llama3-vocab` (128K pieces, 405 billion weights, 15.6 trillion tokens) | Labelled: `ToyNote` gives the toy's 768 pieces and 51,072 weights beside the real ones |
| 2 | 3,000 steps, 8 checkpoints; training loss at step 0 and at the end (recorded) | `pythia-checkpoints` (143,000 steps, 154 checkpoints, about 300 billion tokens) | Labelled |
| 3 | Training loss at the end; held-out loss (live); the gap at step 250 and at the end | `kaplan-overfitting` (8 times the model needs about 5 times the data) | Labelled: the toy's gap grows because it reads 42 documents over and over |
| 4 | 10 copies of one document; held-out loss with and without them (recorded) | `dedup-copying`, `dedup-less-memorised` | Labelled |
| 5 | 12 leaked test questions; test and held-out loss for both runs (recorded) | `contamination`, `dedup-overlap` | Labelled |
| 6 | Model and data growth for 1× to 1,000× the compute | Hoffmann et al. (2022) Table 2 exponents (`scaling.json`), `chinchilla-kaplan-10x` | Real (their fits, their units) |
| 6 | Half and all the documents (21, 42), their held-out loss | `chinchilla-gopher`, `chinchilla-undertrained`, `kaplan-big-models` | Labelled: in its own panel, never on the published fits |
| 7 | Held-out loss per mix and stop, the best score, 2 tied plans, the half run's best step 600 (recorded, `WINNERS` computed) | `repeat-passes` (up to 4 passes over the same text are almost as good as fresh) | Labelled: the note computes the toy's own passes (`passes()`, about 190 for all the documents, 400 for half), far past 4 |
| 7 | Step 4,000 of 20,000 (quiz) | none | Labelled: a hypothetical in the question |
| Intro, recall | 51,072 weights, 42 documents, 3,000 steps, 8 checkpoints; quiz hypotheticals (loss 7.1 to 3.4, 500 copies, 95%, step 8,000 of 40,000) | as above | Labelled: the intro says its numbers are the toy's, not any provider's; the recall numbers are hypotheticals |
