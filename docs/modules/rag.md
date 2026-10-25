# RAG (`/rag/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The canvas** has the only 3D view: turn buttons, drag-to-orbit, zoom (buttons, pinch) and pan when zoomed. Part turns are fitted inside the whole-turn frame so the page never resizes. Labels and front-mounted parts move to the faces toward the viewer. The chapter 1–2 scenes keep the fixed front view (their glass drawing assumes it).
- The model's own pill carries the verdict (CORRECT, WRONG, MADE UP), coloured like its screen; passage cards ride the live wires once after a change (never with reduced motion); the track outlines only the blocks this chapter adds.
- Callouts: RAG's canvas, timeline and context-overflow scenes draw them; RAG callouts are not held to the 16-character limit.
- Share images: chapter 1 the timeline, chapter 2 the overflowing window, chapters 3–7 the track as of that chapter.

## Data

History numbers from `data/history/timeline.json`, answers from `data/answers/`, counts from `public/data/index/manifest.json`. An e2e check counts the first screen of every RAG chapter.
