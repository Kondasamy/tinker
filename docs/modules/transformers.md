# Transformers (`/transformers/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The engine room** (`src/components/scenes/engineScene.ts`) is Larkspur mini drawn as a building: two floors, one per layer, with a desk per head; the lit desk is the head shown. Hero object: open-plan factory floors, the second a railed mezzanine on columns, with a clerk (`person`) at every desk, the lit desk's clerk reaching for its monitor. The prompt's pieces stand as tiles along the front, and the lit head's attention runs as ink threads from one token (the query, default the last) back to the tokens it weighs, heavier for more weight (none under `THREAD_FLOOR`). `TransformersStage` (`src/content/transformers/kit.tsx`) puts it one tab from the Attention view (`attentionMap.ts`: one head's heatmap, the mask's cells above the diagonal at 0, and the next-token bar). The Attention tab stays off until the model has loaded, so a press while it loads can't pre-set a step. Chapters 1 and 3–7 keep the tab in the step state; on phones the pills name only token numbers and layers.

## Engine (`src/lib/transformers/`)

- **Nothing is recorded; Larkspur mini runs live.** `trace.ts` runs one forward pass of the language-model kit's model and reads it as the chapters show it: the pieces read (the last 32), the top 5 next tokens at every position and every attention matrix. Build-time pictures (the home card, the intro, share images) read the same weights from disk (`diskModel.ts`, Node only).
- **The sampler is seeded** (`sample.ts`): temperature and top-p over the live logits, drawn with `mulberry32`, so a seed always gives the same continuation (chapter 5 keeps it across a reload, and e2e is deterministic). Temperature and top-p step over finite lists (`TEMPERATURES`, `TOP_PS`).
- **Costs are counted, not measured** (`costs.ts`), from the model's shape: attention pairs per head under the causal mask, n(n + 1) / 2, and the numbers the KV cache keeps, layers × 2 × d_model × n.
- **The readable bar** (`data/transformers/prompts.json`): every prompt a chapter shows has its expected next token in Larkspur mini's top 5; `tests/unit/transformers-engine.test.ts` fails otherwise. A retrain that breaks one means new prompts, not new copy typed by hand.
- **Chapter 4's word-start head is layer 0, head 0**, recorded in `prompts.json` with its measured score (`wordStart()` over every 32-token window of the training and held-out documents: 0.39 against 0.09 for spreading evenly). The test recomputes the score and fails if it drifts or the head stops standing out (more than 3× uniform).
- **Facts about transformers** come from `data/transformers/facts.json` with source and access date; the papers, Anthropic's context-engineering note and the nanoGPT, 3Blue1Brown and Transformer Explainer pages are re-checked when the module goes live.
