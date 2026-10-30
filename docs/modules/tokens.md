# Tokens (`/tokens/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The token press** (`src/components/scenes/tokenScene.ts`) stands on the workshop board: a paper strip (the text) feeds a cutting press (the tokenizer), and one coloured tile per token drops onto a belt (nine at most; the count pill says how many). With no text it stands idle. `TokensStage` (`src/content/tokens/kit.tsx`) puts it one tab from the Tokens row, the same tiles with their piece over their id, in the same colours; arrow keys read the row. Chapters 5 and 6 show RAG's map of meaning (`ProjectionMap`, read-only) instead. On phones the pills keep short names and the caption carries the counts.
- **Hero object: a cast-iron letterpress** (`letterpress()`): a heavy bed, tapered cheeks, a crown with a red cap, a screw down to the steel platen that cuts, a spoked flywheel with a crank on the near cheek and a lever with a ball grip. The strip runs off a paper spool on brackets (`feed()`); the tiles ride the shared roller belt. Structured outputs reuses the same press.

## Engine (`src/lib/tokens/`)

- **The site tokenizer runs live; real tokenizers are recorded.** Counts and tiles come from the language-model kit's BPE (`src/lib/lm/bpe.ts`), run in the browser on whatever the reader types. GPT-2 and GPT-4o (o200k_base) are recorded once by `pnpm record:tokens` (`scripts/record-tokenizers.mjs`, `@huggingface/transformers`, models cached in `.cache/models`) into `data/tokens/encodings.json`: ids and pieces for every sentence in `data/tokens/sentences.json`, and token counts for every corpus document. The site never ships their vocabularies. Re-record after editing `sentences.json` or `data/corpus/`; the output is deterministic, so an unchanged input gives an unchanged file.
- **The site tokenizer's corpus count is in-sample** (it was trained on those documents); the copy says so.
- **Neighbours read RAG's committed vectors, read-only** (`neighbours.ts`): cosine over RAG's int8 chunk and question vectors, loaded through RAG's loader for its default chunks. Nothing is re-embedded and RAG's index never changes.
- **RAG's embedding model reads WordPiece, not BPE**: chapter 5 says so (fact `minilm`), so no one takes the site's BPE tokens for what the embedding model sees.
- **Chapter 7's workbench** (`workbench.ts`) builds a prompt from fixed parts and fits it to a finite list of budgets (`BUDGETS`); every prompt that fits with nothing more to add is a right answer.
- **Facts about tokens and embeddings** come from `data/tokens/facts.json` with source and access date; provider facts (prices, tokenizer changes) are re-checked when a module goes live.

## Toy vs real

The site tokenizer is the language-model kit's BPE, trained ahead of time on Larkspur's documents (`docs/lm-kit.md`), so its counts are never recalibrated (KTD5): every one is labelled. `ToyNote` (`kit.tsx`) gives its size from the data (768 tokens: 256 bytes plus 512 merges, the corpus's document count) and the recorded real tokenizers' vocabularies, beside a cited fact, on one step of chapters 1, 2, 3, 4 and 7. GPT-2 and GPT-4o counts are real tokenizers' output, recorded; chapters 5 and 6 read RAG's real embeddings.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Sample sentence's words, characters and site-tokenizer tokens; the reader's own text's counts and tokens per word (live) | `openai-rule` (about 4 characters per token) | Labelled: `ToyNote` on the `quiz` step beside `openai-rule` |
| 1 | GPT-4o's count of the sample sentence | recorded (`encodings.json`) | Real |
| 2 | 256 byte tokens, 512 merges, the paragraph's bytes, tokens after each merge, pair counts (site tokenizer's trace) | `gpt2-vocab` (50,257), `bpe-origin` | Labelled: narration says real tokenizers learn far more merges; `ToyNote` on `quiz` |
| 3 | The rule's bytes ÷ 4 | `openai-rule` value 4 | Matched: `BYTES_PER_TOKEN` (`src/lib/scale.ts`) is pinned to the fact by `tokens-engine.test.ts` |
| 3 | GPT-2 and GPT-4o corpus counts, bytes per token, the rule's % over each | recorded | Real |
| 3 | Site tokenizer's corpus count (in-sample), its 768-token vocabulary | none | Labelled: "in-sample" in the table and narration; `ToyNote` on `bill` |
| 3 | Cost to send once at $2 per million input tokens | `input-price` (value 2, re-checked 2026-10-30) | Matched: `PER_M` reads the fact |
| 3 | About 30% more tokens on Claude's newer tokenizer | `claude-tokenizer-30` | Real |
| 4 | Tokens per sentence on GPT-2 and GPT-4o; Hindi's ratio to English; the pieces of the shelf word and the number | recorded | Real |
| 4 | Tokens per sentence on the site tokenizer (live) | `language-disparity` (up to 15 times) | Labelled: `ToyNote` on `quiz` beside `language-disparity` |
| 5 | 384 numbers per text; the two cosines | `minilm` (value 384, read by the copy) | Real: RAG's committed vectors |
| 6 | Cosines and shared-word counts of the four pieces | `cosine-dot` | Real: RAG's committed vectors |
| 7 | Budgets 160, 240 and 320; each part's tokens and the prompt total (site tokenizer, live) | `billed-in-tokens`, `count-estimate` | Labelled: budgets are hand-set; narration says a provider's tokenizer would count differently; `ToyNote` on `quiz` |
| Intro, recall | Order sentence's counts on all three tokenizers; corpus counts; 1 token ≈ 4 characters; hypotheticals (500 and 501, a five-digit number) | as above | Real where recorded, labelled for the site tokenizer (the intro says it is this site's small tokenizer) |
