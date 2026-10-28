# What a model remembers (`/memorisation/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The support desk** (`src/components/scenes/recitalScene.ts`): the training ledger at the front left (lines lit per planted copy, capped at 8; mint where the PINs are scrubbed), RAG's LLM block as the clerk, an output-filter gate (mustard when on) over the reply slip (tomato ring when it gives a PIN away), and on the right the ranking board. `RecitalStage` (`src/content/memorisation/kit.tsx`) puts it one tab from Ledger, the planted lines with their offline ranks per run, and keeps one polite `role="status"` read-out under the frame. Parts: `ledger`, `model`, `filter`, `reply`, `column`, always drawn.
- **The mechanic** (KTD13, the ranking column): a native radio group for copies (1, 4, 16, 64) picks the canary; the board holds 201 balls, the 200 pinned sample PINs (`data/memorisation/candidates.json`, a seeded uniform draw) plus the true PIN in tomato, each at a height set by the canary model's log-probability. Slot from the top is the rank, ties to the true PIN, as `train_canary.py` counts. The column is ranked live a dozen candidates per frame. The true ball rises in with motion; with reduced motion (and on the server) it is drawn where it ends.
- **Why heights, not only slots:** in a uniform sample of 200 every planted PIN ranks 1 or 2 (ranks 17 and 81 of 10,000 compress to the top). The heights show what the slots hide: 64 and 16 copies float far above the crowd, 4 copies just above it, 1 copy inside its top. The read-out pairs the sample's rank with the offline rank and exposure over all 10,000 (runs.json), and chapter 4 says the column is a sample.
- `recitalPlot` is ready for the hero stand at go-live; the home card can be the intro's hero (64 copies, recited, rank 1).

## Engine (`src/lib/memorisation/`)

- **The model** is the canary model (`docs/lm-kit.md`; weights `'canary'`), never retrained here. `diskModel.ts` reads it from disk for build-time pictures and tests.
- **Extraction** (`extract.ts`): greedy, 8 reply tokens, as `train_canary.py`; extracted when the first tokens are the secret. 64 and 16 copies are recited; 4 and 1 come back as the 64-copy PIN, which chapter 3 teaches (the slot fills with the PIN seen most).
- **Ranking** (`rank.ts`): sequence log-probability of each candidate after the prefix; each distinct partial PIN runs the model once, so all 10,000 take about 2 s in Node. `tests/unit/memorisation-engine.test.ts` reproduces runs.json's ranks over all 10,000 (81, 17, 1, 1) and the pinned sample ranks.
- **Exposure tops out:** 16 and 64 copies both rank first of 10,000, so both have exposure log2(10,000) = 13.3. Chapter 4 says so instead of claiming exposure keeps rising.
- **The output filter** (`filter.ts`) redacts runs of exactly four digits. **The pinned bypass** (KTD10): the toy model never spaces digits out on request, so the bypass is to ask one token at a time, adding each reply to the prompt (`drip`). Each reply is a single digit, the filter passes all four, and together they are the PIN spaced out. Those tokens are the greedy reply by construction, so on the workbench any run that recites a PIN leaks it past the filter too.
- **Chapter 7's workbench** (`workbench.ts`): dedup × scrub picks a run; the filter is the live third axis (8 policies). A policy wins when it leaks nothing and no other leak-free policy is at least as good on worst exposure (1 decimal) and held-out top-5 (tenths of a percent) and better on one. `WINNERS` (4, every one scrubs; dedup alone is beaten by scrubbing on exposure) is pinned and recomputed in `tests/unit/memorisation-workbench.test.ts`. No `workbench.json`: the grid is runs.json.
- **Pinned** (`data/memorisation/pinned.json`): chapter 3's replies, chapter 4's sample ranks (1, 1, 1, 2), the bypass and the filtered reply. Chapter 1 cites Pre-training's recorded `duplicated` run (its engine's `sampleOf`), not retrained.

## Facts

From `data/memorisation/facts.json` (accessed 2026-10-28), each checked against its arXiv abstract and labelled a large-model finding where it is one: Carlini et al. 2019 (The Secret Sharer), Carlini et al. 2021 (GPT-2 extraction), Kandpal, Wallace and Raffel 2022 (deduplication; 10 copies ≈ 1,000× more often generated), Nasr et al. 2023 (gigabytes from open models; ChatGPT 150× higher rate), Abadi et al. 2016 (DP-SGD).
