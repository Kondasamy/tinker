# What a model remembers (`/memorisation/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The support desk** (`src/components/scenes/recitalScene.ts`): the training ledger at the front left (lines lit per planted copy, capped at 8; mint where the PINs are scrubbed), RAG's LLM block as the clerk, an output-filter gate (mustard when on) over the reply slip (tomato ring when it gives a PIN away), and on the right the ranking board. `RecitalStage` (`src/content/memorisation/kit.tsx`) puts it one tab from Ledger, the planted lines with their offline ranks per run, and keeps one polite `role="status"` read-out under the frame. Parts: `ledger`, `model`, `filter`, `reply`, `column`, always drawn.
- **Hero object:** the ledger as a bound book open on a lectern; with it the framed peg board on feet that holds the ranking balls, and the filter as a sieve in a hoop between two posts across the reply's path.
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

From `data/memorisation/facts.json` (every fact re-checked 2026-10-30 against its arXiv abstract), labelled a large- or real-model finding where it is one: Lee et al. 2021 (one sentence repeated 60,000+ times in C4; over 1% of unprompted output copied), Carlini et al. 2019 (The Secret Sharer), Carlini et al. 2021 (GPT-2 extraction, sequences from one document), Kandpal, Wallace and Raffel 2022 (deduplication; 10 copies ≈ 1,000× more often generated), Ippolito et al. 2022 (a perfect word-for-word filter, bypassed by restyled prompts), Nasr et al. 2023 (gigabytes from open models; ChatGPT 150× higher rate), Lukas et al. 2023 (scrubbing cuts but doesn't stop leaks of personal data), Abadi et al. 2016 (differential privacy). Each chapter shows one on its reveal: 1 `lee-2021-repeats`, 2 `carlini-2019`, 3 `carlini-2021`, 4 `carlini-2019`, 5 `kandpal-2022`, 6 `ippolito-2022`, `nasr-2023` and `scrub-misses`, 7 `abadi-2016`.

## Toy vs real

The canary model (and Pre-training's recorded runs in chapter 1) is trained ahead of time (`docs/lm-kit.md`), so none of its numbers is recalibrated (KTD5): every one is labelled. `ToyNote` (`kit.tsx`) gives the toy's size from runs.json beside a cited real figure; chapters 1 and 3 say in a note where the toy stops matching (copies needed to recite), chapter 7 that the bench has no differential-privacy switch. Nothing is matched: copies (1, 4, 16, 64), the 10,000 candidates and the 200-PIN sample are design choices of the test, not measurements to fit.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | 10 copies of one policy (Pre-training's recorded run) | `lee-2021-repeats` (one sentence 60,000+ times, over 1% of output copied) | Labelled: the note sets the toy's 10 copies beside the real 60,000 (read from the fact's `value`) |
| 2 | 1 to 64 copies, 85 planted lines | `carlini-2019` | Labelled (`ToyNote`) |
| 3 | 4 prefixes; 2 recited (64 and 16 copies); replies (live, pinned) | `carlini-2021` (GPT-2 recited text from one document) | Labelled: the note says the toy needed 16 copies where GPT-2 needed one document |
| 4 | 200 sample + true PIN; sample ranks; ranks 1, 1, 17, 81 of 10,000; exposure up to 13.3 bits | `carlini-2019` | Labelled (`ToyNote`); the column is said to be a sample |
| 4 | Rank 3 of a million, 18 bits (quiz) | none | Labelled: a hypothetical in the question |
| 5 | Rank 161 of 10,000 after dedup; held-out top-5 per run | `kandpal-2022` (10 copies ≈ 1,000× more often) | Labelled (`ToyNote`) |
| 6 | Four digits in a row; one digit per reply; scrubbed top-5 | `ippolito-2022`, `nasr-2023` (150×), `scrub-misses` | Labelled: the note says the toy's scrub is perfect because its PINs are known; real scrubbers miss some |
| 7 | PINs leaked, worst exposure, top-5 per policy, base top-5, 4 winners (`WINNERS` computed) | `abadi-2016` | Labelled: the note says the bench has no such switch |
| Intro, recall | 4 PINs, 2 recited, rank 81 (chance near 5,000), scrubbed top-5; quiz hypotheticals (5,000 pages, 2nd of 100,000, 16-digit cards) | as above | Labelled: the intro note calls it Larkspur's toy; recall numbers are hypotheticals or read from runs.json |
