# Tokens (`/tokens/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The token press** (`src/components/scenes/tokenScene.ts`) stands on the workshop board: a paper strip (the text) feeds a cutting press (the tokenizer), and one coloured tile per token drops onto a belt (nine at most; the count pill says how many). With no text it stands idle. `TokensStage` (`src/content/tokens/kit.tsx`) puts it one tab from the Tokens row, the same tiles with their piece over their id, in the same colours; arrow keys read the row. Chapters 5 and 6 show RAG's map of meaning (`ProjectionMap`, read-only) instead. On phones the pills keep short names and the caption carries the counts.

## Engine (`src/lib/tokens/`)

- **The site tokenizer runs live; real tokenizers are recorded.** Counts and tiles come from the language-model kit's BPE (`src/lib/lm/bpe.ts`), run in the browser on whatever the reader types. GPT-2 and GPT-4o (o200k_base) are recorded once by `pnpm record:tokens` (`scripts/record-tokenizers.mjs`, `@huggingface/transformers`, models cached in `.cache/models`) into `data/tokens/encodings.json`: ids and pieces for every sentence in `data/tokens/sentences.json`, and token counts for every corpus document. The site never ships their vocabularies. Re-record after editing `sentences.json` or `data/corpus/`; the output is deterministic, so an unchanged input gives an unchanged file.
- **The site tokenizer's corpus count is in-sample** (it was trained on those documents); the copy says so.
- **Neighbours read RAG's committed vectors, read-only** (`neighbours.ts`): cosine over RAG's int8 chunk and question vectors, loaded through RAG's loader for its default chunks. Nothing is re-embedded and RAG's index never changes.
- **RAG's embedding model reads WordPiece, not BPE**: chapter 5 says so (fact `minilm`), so no one takes the site's BPE tokens for what the embedding model sees.
- **Chapter 7's workbench** (`workbench.ts`) builds a prompt from fixed parts and fits it to a finite list of budgets (`BUDGETS`); every prompt that fits with nothing more to add is a right answer.
- **Facts about tokens and embeddings** come from `data/tokens/facts.json` with source and access date; provider facts (prices, tokenizer changes) are re-checked when a module goes live.
