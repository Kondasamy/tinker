---
workflow: general-video
flow: automation
storyboard: no
message: "An assistant makes up an answer; documents, retrieval and citations make it right. Play it yourself."
destination: website
aspect: 1920x1080
language: en
audience: "Product managers, engineers and analysts"
length: 47s
angle: "The RAG module played for real: an assistant makes up an answer, then documents, retrieval and citations make it right"
---

## Intent

Trailer for the RAG module intro (`/rag/`), shown only when the reader presses play. The live site, recorded by
scripted hand-play (chapter 1 history, chapter 3 what-is-rag, chapter 7 sandbox), narrated in plain words over a
quiet music bed, ending on a Tinker card that points to chapter 1. Pre-approved by the owner; built without an intent
interview (plan `docs/plans/2026-10-27-1500-feat-rag-watch-mode-and-trailer-plan.md`, U6).

## Assets

- assets/footage.mp4 — the three takes cut together (41 s); ranges in assets/footage.json, clicks in assets/clicks.json (recorded by record.mjs, cut by cut.sh).
- assets/voice/NN.mp3, assets/voice/words.json — ElevenLabs narration (Liam) with word timings, from SCRIPT.md by voice.mjs.
- assets/audio/bgm.mp3 — ElevenLabs Music bed (music.mjs), levelled to -30 LUFS by cut.sh and carved under the voice.

## Customizations

- Captions ship as WebVTT (`public/video/rag-trailer.vtt`, from vtt.mjs), not burned in: the page's captions track would otherwise double them.
- A drawn cursor with click ripples over the real clicks; a chapter chip per take; punch-ins on the answer and the stage.
- End card: Tinker, "Start chapter 1 →", the URL, and "drawn with Colorfigures by April Zhu".

## Notes

- Every spoken number is the repo's data (see SCRIPT.md); `tests/unit/rag-trailer.test.ts` checks the captions.
- Delivery: `public/video/rag-trailer.mp4` (H.264 CRF 25, 1920×1080, under 6 MB), `.jpg` poster (a sandbox frame), `.vtt`.
- Re-render when a picture or quoted fact it shows changes: record.mjs → cut.sh → `npx hyperframes render --video-frame-format png -o renders/rag-trailer.mp4` → deliver.sh.
