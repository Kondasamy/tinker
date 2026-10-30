# RAG (`/rag/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The canvas** has the only 3D view: turn buttons, drag-to-orbit, zoom (buttons, pinch) and pan when zoomed. Part turns are fitted inside the whole-turn frame so the page never resizes. Labels and front-mounted parts move to the faces toward the viewer. The chapter 1–2 scenes keep the fixed front view (their glass drawing assumes it).
- The model's own pill carries the verdict (CORRECT, WRONG, MADE UP), coloured like its screen; passage cards ride the live wires once after a change (never with reduced motion); the track outlines only the blocks this chapter adds.
- Callouts: RAG's canvas, timeline and context-overflow scenes draw them; RAG callouts are not held to the 16-character limit.
- Share images: chapter 1 the timeline, chapter 2 the overflowing window, chapters 3–7 the track as of that chapter.

## Data

History numbers from `data/history/timeline.json`, answers from `data/answers/`, counts from `public/data/index/manifest.json`. An e2e check counts the first screen of every RAG chapter.

## Toy vs real

RAG runs on a real built index (`public/data/index/`: all-MiniLM-L6-v2 embeddings, an ms-marco cross-encoder) over Larkspur's made-up documents, so most numbers are real outputs of that index. Each chapter also shows a published finding from `data/rag/facts.json` (`Fact` in `src/content/rag/kit.tsx`); nothing is calibrated to it, since the index is never rebuilt for copy.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Era dates and context windows (timeline drawer, narration) | `rag-vs-memory` (2020 reveal: 34.5% from memory vs 44.5% with RAG) | Real: `data/history/timeline.json` |
| 1 | The made-up “60 days” answer | none | Labelled: the panel calls it a guess from training data |
| 2 | Corpus sizes, tokens (bytes ÷ 4), largest window, price, windows needed | `ruler-32k` (lost-in-the-middle step) | Real: `src/lib/scale.ts` over the timeline and its cited sources |
| 2 | 5 TB company drive | none | Labelled: a hypothetical drive in the question and slider |
| 3 | Similarity scores of the passages found | `meaning-beats-keywords` | Real: the built index |
| 4 | 16-word chunks, top-k 1, 25% overlap | `numbers-first` (map step) | Labelled: the team's chosen settings (“the team now cuts…”), not measurements |
| 4 | 384 numbers per embedding | `numbers-first` | Real: read from `manifest.models.embedding.dims` |
| 5 | Recall@k and answer verdicts; top-k 5–6 works, 7+ buries the rule; keyword weight 20%+; overlap above 0% | `seven-failures` (quiz step) | Real: swept on the built index, pinned by `tests/unit/accuracy.test.ts` |
| 5 | $150, 2018 and 2025 policies | none | Real to the made-up corpus (`data/corpus/`) |
| 6 | Max calls 2, hops 1–2, one 16-word chunk | `search-again` (agent quiz step) | Labelled: settings the chapter fixes |
| 6 | “About two dozen chunks” on two hops | `search-again` | Real: `tests/unit/graph.test.ts` holds it at 20 or more |
| 6 | Pass mark 6 for the best chunk | none | Labelled: “Our pass mark” (`GRADE_BAR`, hand-set on the cross-encoder score) |
| 6 | $410 for 50+ K2 scanners | none | Real to the made-up corpus (price table) |
| 7 | Five teams in the challenge | `adaptive-rag` (challenge step) | Story count |
| Intro | ~4,000 customers, ~260 staff, 2 warehouses | none | Labelled: “a made-up company” on the intro page and in chapter 1's story |
| Intro | Documents on the drive | none | Real: `manifest.corpus.docs` |
