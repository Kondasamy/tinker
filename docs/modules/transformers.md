# Transformers (`/transformers/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The engine room** (`src/components/scenes/engineScene.ts`) is Larkspur mini drawn as a building: two floors, one per layer, with a desk per head; the lit desk is the head shown. Hero object: open-plan factory floors, the second a railed mezzanine on columns, with a clerk (`person`) at every desk, the lit desk's clerk reaching for its monitor. The prompt's pieces stand as tiles along the front, and the lit head's attention runs as ink threads from one token (the query, default the last) back to the tokens it weighs, heavier for more weight (none under `THREAD_FLOOR`). `TransformersStage` (`src/content/transformers/kit.tsx`) puts it one tab from the Attention view (`attentionMap.ts`: one head's heatmap, the mask's cells above the diagonal at 0, and the next-token bar). The Attention tab stays off until the model has loaded, so a press while it loads can't pre-set a step. Chapters 1 and 3–7 keep the tab in the step state; on phones the pills name only token numbers and layers.
- **Hero object: open-plan factory floors**: a steel ground floor and a railed mezzanine on columns, reached by a steel stair to a landing at its left end, a clerk at every head desk (a wooden top on steel legs and a drawer pedestal). Threads stay ink. The scene compacts its SVG (`src/lib/iso/compact.ts`) to keep four clerks inside its size budget, and `engineLayers` hands a composer the drawing and the pills apart.

## Engine (`src/lib/transformers/`)

- **Nothing is recorded; Larkspur mini runs live.** `trace.ts` runs one forward pass of the language-model kit's model and reads it as the chapters show it: the pieces read (the last 32), the top 5 next tokens at every position and every attention matrix. Build-time pictures (the home card, the intro, share images) read the same weights from disk (`diskModel.ts`, Node only).
- **The sampler is seeded** (`sample.ts`): temperature and top-p over the live logits, drawn with `mulberry32`, so a seed always gives the same continuation (chapter 5 keeps it across a reload, and e2e is deterministic). Temperature and top-p step over finite lists (`TEMPERATURES`, `TOP_PS`).
- **Costs are counted, not measured** (`costs.ts`), from the model's shape: attention pairs per head under the causal mask, n(n + 1) / 2, and the numbers the KV cache keeps, layers × 2 × d_model × n.
- **The readable bar** (`data/transformers/prompts.json`): every prompt a chapter shows has its expected next token in Larkspur mini's top 5; `tests/unit/transformers-engine.test.ts` fails otherwise. A retrain that breaks one means new prompts, not new copy typed by hand.
- **Chapter 4's word-start head is layer 0, head 0**, recorded in `prompts.json` with its measured score (`wordStart()` over every 32-token window of the training and held-out documents: 0.39 against 0.09 for spreading evenly). The test recomputes the score and fails if it drifts or the head stops standing out (more than 3× uniform).
- **Facts about transformers** come from `data/transformers/facts.json` with source and access date; the papers, Anthropic's context-engineering note and the nanoGPT, 3Blue1Brown and Transformer Explainer pages are re-checked when the module goes live.

## Toy vs real

Larkspur mini is trained ahead of time (`docs/lm-kit.md`), so none of its numbers is recalibrated (KTD5): every size, weight and probability is labelled. `ToyNote` (`kit.tsx`) gives the toy's shape from `public/data/lm/meta.json` beside a cited real figure on one step of every chapter, usually `llama3-shape` (Llama 3 405B: 126 layers of 128 heads, vectors of 16,384, a 128,000-token vocabulary, a 128K window). The counts that are plain arithmetic (pairs under the mask, the zeros above the diagonal) hold for any decoder, so they are real.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | About 51 thousand learned numbers; 768 tokens in the vocabulary; the bar's probabilities (live) | `llama3-shape` (405 billion, 128,000), `transformer-paper` | Labelled: `ToyNote` and `llama3-shape` on step `run`, whose narration says bigger models do the same job |
| 1 | 3 tokens added | none | A count of reader actions, not a model quantity |
| 2 | Vectors of 32 numbers; the embedding and position rows (live) | `llama3-shape` (16,384), `rope` | Labelled: `ToyNote` on step `look`; a note on the quiz says the toy learns a row per position where Llama 3 uses rotations |
| 3 | Attention weights (live); every weight above the diagonal 0; a row adds up to 1 | `causal-mask`, `attention-formula` | Weights labelled (`ToyNote` on step `prompts`); the 0s and the sum of 1 are real, as in every decoder |
| 4 | 2 layers of 2 heads; the word-start head's 0.39 of the weight against 0.09 spread evenly, and its live score per prompt | `voita-heads` (on `prompts`), `base-size` (8 heads, 6 layers), `llama3-shape` (126 × 128) | Labelled: the toy's head is measured on its own documents (`prompts.json`); Voita et al. found nameable heads in a real Transformer |
| 5 | Temperatures 0 to 2, top-p 0.1 to 1 | `temperature-logits`, `top-p` | Real: the same operations as the papers define |
| 5 | The likeliest token's share, tokens kept of 768, 8 tokens written, the seed | `greedy-repeats` (on `temperature`), `temperature` | Labelled: `ToyNote` on the quiz |
| 6 | Attention pairs per head, n(n + 1) / 2; 8 to 16 tokens, about 4 times the pairs; pairs over all 4 heads | `n-squared` | Real arithmetic; the 4 heads are the toy's (labelled) |
| 6 | KV cache numbers kept (layers × 2 × 32 × n) | `kv-cache-size` (3 TB for 512 prompts of 2,048 tokens on a 500B+ model, on step `cache`) | Labelled |
| 6 | A 32-token window | `llama3-shape` (128K), `attention-budget` | Labelled: `ToyNote` on the quiz, whose narration says bigger windows pay the same square |
| 7 | Tokens read of 32, tokens dropped, 32 numbers per vector, 2 layers of 2 heads, the next token's probability (live) | `llama3-shape`, `lost-in-the-middle`, `transformer-explainer` (GPT-2 small, 124M) | Labelled: `ToyNote` on step `follow` |
| Intro | 51,072 learned numbers, 2 × 2, a 32-token window, 768 scored, the held-out top-5 share | `llama3-shape` (quoted in the note) | Labelled: the note says it is no provider's model, then quotes the real scale |
| Recall | 0.7 of a row's weight and other hypotheticals | none | Hypotheticals in the questions |
