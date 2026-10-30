# Interpretability (`/interpretability/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The fuse box** (`src/components/scenes/fuseScene.ts`) composes Transformers' engine room (`engineScene`) and adds a fuse panel beside the second floor: a row per layer (layer 2 on top), a column per part (head 1, head 2, MLP). A fuse that is in is mustard; a pulled one is drawn out and dark, and a pulled head's desk is unlit with no threads (threads only when the chapter asks, chapter 1). `FUSE_PARTS` adds `fuses` and `pulled` to `ENGINE_PARTS`. `InterpStage` (`src/content/interpretability/kit.tsx`) puts it one tab from the Lens (`lensGrid.ts`: a row per stage, output on top, the top 5 guesses at one position, a native range for the position, arrow keys between cells, a watched token in mint). The Lens tab stays off until the model loads and while a prediction is open. On phones the pills shorten to names.
- **Hero object: cartridge fuses in spring clips** on a pale board in a steel cabinet: ceramic barrels with brass end caps, mustard while in, dark and held out in front once pulled. An electrician in overalls and a white hard hat stands at the panel, reaching for it while a fuse is out. The room's pills draw over the panel (`engineLayers`).

## Engine (`src/lib/interpretability/`)

- **Nothing is recorded; Larkspur mini runs live through the KTD5 hooks** (`probe.ts`). Six fuses (`FUSES`): one per head (`h<layer>-<head>`, ablate) and one per MLP (`mlp<layer>`, a model copy with that MLP's `mlp.proj` weight and bias zeroed, cached per set; `src/lib/lm/` is untouched). `run()` is one forward pass with fuses pulled. The model loads through Fine-tuning's loaders (`ModelGate`, `useModel('base')`).
- **Pinned effects** (`data/interpretability/prompts.json`; `tests/unit/interpretability-engine.test.ts` reruns each and fails on drift): chapter 2's held-out counts per head (`headLoss`, over Fine-tuning's held-out copy, `evaluate()`'s windows: of 659 right top-5 guesses, the word-start head L0H0 loses 74, the most) and its one prompt where the word-start fuse bites, labelled one of the few; chapter 3's lens ranks per stage (bar: top 5 after block 1, not after the embedding, for half: 6 of 8); chapter 4's patch flips (`patchGrid`, the swapped word before block 1, the last token after); chapter 5's steering (`steerDirection`, shipping minus billing at the top of layer 2; the target rises from outside the top 5 into it at ×2, a scrap of a word at the strongest); chapter 6's neuron kinds (`kindOf`; bar: half the neurons mix kinds, 199 of 256). A retrain means new prompts, not new copy.
- **Ablation is measured over text, not one prompt** (the user's call when U2's bar failed): one head moves little in a two-layer model; the copy says the work is spread out, and the pinned prompt is labelled as rare.
- **The logit lens** (`lens`) reads three stages: after the embedding, after block 1, the output (`STAGES`); the last equals the model's top 5.
- **Chapter 7's workbench** (`workbench.ts`): a set of fuses keeps a behaviour when, with every other fuse pulled, its expected token is still top 1. `WINNERS` (every smallest set) is pinned in prompts.json and recomputed by the test; the puzzle accepts any of them.
- **Facts about interpretability** come from `data/interpretability/facts.json` with source and access date; Scaling Monosemanticity is cited through Anthropic's research page (the paper page is too large to fetch).

## Toy vs real

Larkspur mini is trained ahead of time (`docs/lm-kit.md`), so none of its numbers is recalibrated (KTD5): every live count is labelled. `OURS` (`kit.tsx`) sits on the step with each chapter's cited fact and gives the toy's own size from `public/data/lm/meta.json` (51,072 weights, 2 layers of 2 heads); the narration on that step says how the toy maps to the real finding. The MLP is called the "thinking part" on every reader surface (`fuseName`: "Layer 2 thinking part").

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Top-5 odds (live); layer and head numbers (2 × 2, the toy's own build); 0.5 weight (an option) | `attention-not-explanation` | Labelled: `OURS` beside the fact; 0.5 is a distractor, not a measurement |
| 2 | Right top-5 guesses lost per head over held-out text (74, 31, 16, 21 of 659, pinned); bars drawn at 4×; six fuses | `heads-removable` (a large share of a big model's heads removable with little loss) | Labelled: the narration says big models lose many heads with little harm too, as the toy's four heads each cost a little |
| 3 | Lens top-5 odds and ranks at three stages (live, pinned); 2 blocks; halfway up (quiz) | `logit-lens` | Labelled: the toy's guess forms at block 1 of 2; the narration says big models firm it up over many layers |
| 4 | The patch grid (3 stages × the prompt's tokens, 39 runs); which cells flip (pinned) | `rome` (GPT's facts sit at the subject's words in middle layers) | Labelled |
| 5 | Strengths ×0, 1, 2, 4, 12; the target's rise into the top 5 at ×2 (pinned); top-5 odds | `actadd`, `scaling-monosemanticity` | Labelled: strengths are the toy's own scale, not comparable across models |
| 6 | 128 neurons per block, 199 of 256 mixed (computed from `neurons.json`); each neuron's five top tokens and firing | `superposition`, `dictionary-learning` (512 neurons split into 4,000+ features), `scaling-monosemanticity`, `attribution-graphs`, `biology`, `fraction` | Labelled |
| 7 | Six fuses; smallest sets of 2 (5 that work) and 5 of 6 (pinned `WINNERS`, recomputed); fuses in | `ioi-circuit` (26 heads in GPT-2 small) | Labelled; the 26 is real, read from the fact's `value` in the narration |
| Intro, recall | 6 fuses, 11% lost with the word-start head, 199 of 256 neurons, 0 weights changed; recall's "layer 10 of 24" | as above | Labelled: the intro's caption says the numbers are Larkspur mini's; the recall numbers are hypotheticals |
