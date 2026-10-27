# RAG (`/rag/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The canvas** has the only 3D view: turn buttons, drag-to-orbit, zoom (buttons, pinch) and pan when zoomed. Part turns are fitted inside the whole-turn frame so the page never resizes. Labels and front-mounted parts move to the faces toward the viewer. The chapter 1–2 scenes keep the fixed front view (their glass drawing assumes it).
- The model's own pill carries the verdict (CORRECT, WRONG, MADE UP), coloured like its screen; passage cards ride the live wires once after a change (never with reduced motion); the track outlines only the blocks this chapter adds.
- Callouts: RAG's canvas, timeline and context-overflow scenes draw them; RAG callouts are not held to the 16-character limit.
- Share images: chapter 1 the timeline, chapter 2 the overflowing window, chapters 3–7 the track as of that chapter.

## Watch and trailer

- Every non-question step has a `demo`. Chapter 6's run steps queue engine runs in `todo`, filled by `QueuedRuns` after `RagStage` (a pure demo can't compute a result row). Chapter 7's `play` demo opens the challenge without running a question.
- Narration: one voice (River), `data/watch/rag.json`; music `public/data/watch/music.mp3`.
- Trailer: `videos/rag-trailer/` (chapters 1, 3, 7 by scripted hand-play), shown on `/rag/` behind its poster. It quotes 2020, 2023 and the corpus's 47 documents; re-render if those change.

## Data

History numbers from `data/history/timeline.json`, answers from `data/answers/`, counts from `public/data/index/manifest.json`. An e2e check counts the first screen of every RAG chapter.
