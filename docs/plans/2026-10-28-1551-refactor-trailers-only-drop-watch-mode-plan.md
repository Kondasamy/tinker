---
title: Trailers only, Watch mode removed - Plan
type: refactor
date: 2026-10-28
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Trailers only, Watch mode removed - Plan

## Goal Capsule

- **Objective:** Watch mode (per-step recorded narration, music bed, self-playing chapters, "Was Watch better?") is gone from the site, code, data, tests and docs. The RAG trailer stays, and any module can get a trailer later by following one recipe and dropping in one shared component.
- **Authority:** `AGENTS.md` → this plan. PR #34 (`d2d7cea..ddc0bc5`) is the map of what Watch added.
- **Stop conditions:** stop and ask if removing Watch would change how a chapter plays for a reader who never pressed Watch, or would break the Voice module's clips.
- **Execution profile:** one branch, one PR, commits per unit below.

---

## Product Contract

### Summary

Delete Watch mode end to end; keep the trailer and make it the one per-module video, reusable and documented for the remaining live modules.

### Problem Frame

PR #34 shipped two things: a narrated trailer on `/rag/` and Watch mode, which plays every RAG chapter with ~70 recorded clips and music. Narrating every step of every chapter does not scale to 39 modules and is not worth keeping for one. A trailer per module, made whenever convenient (at go-live or later), is the video story going forward.

### Requirements

- R1. No Watch mode anywhere: no Watch/Pause controls, no `?watch` auto-start, no Watch feedback send, no `demo` on steps.
- R2. No per-chapter narration assets or tooling: `data/watch/`, `public/data/watch/`, the narration recorder and its package scripts.
- R3. Chapters play exactly as before Watch for a reader: same steps, same predicates, same saved-run compatibility.
- R4. The RAG trailer keeps working as today (button in the hero, popup, captions, poster, no-JS link to the MP4).
- R5. The trailer button and popup are one shared component any module intro can use with only its id, name and running time.
- R6. A short recipe tells a contributor how to make a module's trailer, at go-live or after, by copying the RAG trailer project.
- R7. Docs and rules (`AGENTS.md`, `docs/writing-a-module.md`, `docs/modules/rag.md`) describe trailers only.

### Scope Boundaries

- The Voice module's own clips (`scripts/record-voice.mjs`, `src/lib/voice/audio.ts`, `ClipPlayer`) stay. Only Watch-specific code leaves them.
- `docs/plans/2026-10-27-1500-feat-rag-watch-mode-and-trailer-plan.md` stays as history.
- The trailer's own narration and music (`videos/rag-trailer/voice.mjs`, `music.mjs`, `assets/`) stay: that is the trailer, not Watch.

#### Deferred to Follow-Up Work

- Trailers for the other 38 live modules, one module per PR, using the R6 recipe.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **Remove, don't hide.** Watch code, data, tests and rules are deleted, not feature-flagged. Git history (PR #34) is the archive.
- KTD2. **Keep the URL-keyed clip player.** PR #34 changed `src/lib/voice/audio.ts` and `ClipPlayer` to key clips by URL. It is neutral for the Voice module and its tests already use it; reverting is churn. Only the Watch mention in its comments goes.
- KTD3. **Keep `FORM` in `src/lib/site.ts`, drop `FORM_AJAX`.** The home form's constant moved there in PR #34 and is fine where it is; the ajax address existed only for Watch feedback.
- KTD4. **Trailer is a component, presence is the files.** `src/components/intro/Trailer.astro` (props: module id, accessible name, running time) renders the hero link, the `<dialog>`, its script and styles, lifted from `src/pages/rag/index.astro`. A module has a trailer when `public/video/<id>-trailer.mp4` exists; no registry field. Tests find trailers by globbing that folder.
- KTD5. **Recipe is a doc, not a generator.** The RAG trailer project is the template: copy `videos/rag-trailer/` to `videos/<id>-trailer/`, rewrite `BRIEF.md`, `SCRIPT.md`, the takes in `record.mjs` and the facts check. A scaffolding script waits until a second trailer shows what actually varies.
- KTD6. **RAG chapter 6's run queue goes too.** `todo`, `canvasOf`, `finishRuns`, `queue`, `knob` and `QueuedRuns` in `src/content/rag/06-types.tsx` exist only so Watch could fill result rows; nothing else uses them (checked: only `tests/unit/watch-coverage.test.ts`).

### Assumptions

- Saved RAG runs from readers who used Watch need no migration: `demo` never changed step ids, and runs only carry state the reader's own play also produces. A stray `todo` field in a saved run's state is ignored once the type drops it.

---

## Implementation Units

### U1. Remove Watch from the step runner and RAG chapters

**Goal:** Chapters no longer know about Watch.

**Requirements:** R1, R3. KTD1, KTD6.

**Dependencies:** none.

**Files:**
- Delete `src/components/story/watch.ts`, `src/components/story/WatchFeedback.tsx`.
- Modify `src/components/story/StepRunner.tsx` (narration glob, `useWatch`, the Watch strip, `?watch` auto-start, Watch focus handling, the intro's Watch chip, `aria-live` switch).
- Modify `src/components/story/steps.ts` (drop `demo` and the `watch` action).
- Modify `src/content/rag/01-history.tsx` … `07-sandbox.tsx` (drop every `demo`; chapter 6's run queue per KTD6; chapter 7's `play` demo).
- Modify `src/layouts/ChapterLayout.astro` (drop `.watch*` styles; restore `.intro .resume { align-self: flex-start; }`).
- Modify `src/lib/site.ts` (drop `FORM_AJAX`, KTD3).
- Modify `src/lib/voice/audio.ts` comments only (KTD2).
- Delete `tests/unit/watch.test.ts`, `tests/unit/watch-ui.test.ts`, `tests/unit/watch-coverage.test.ts`, `tests/e2e/watch.spec.ts`.
- Modify `tests/unit/steps.test.ts` (drop the `watch` action cases), `tests/e2e/opening.spec.ts` (restore the pre-#34 intro text check).

**Approach:** Use `git diff d2d7cea ddc0bc5` on each file as the removal list; reverse the Watch hunks, keep unrelated later edits. The live region stays `polite` always.

**Patterns to follow:** `StepRunner.tsx` and `steps.ts` as of `d2d7cea`.

**Test scenarios:**
- Every RAG chapter still plays to the end by hand in e2e (existing chapter-play specs, unchanged).
- A RAG intro with a saved run shows "Continue at step N" and no Watch button.
- Opening `/rag/<chapter>/?watch` behaves like the plain URL (no auto-play).
- `steps.test.ts` passes without the `watch` cases; `sync` and `solution` ("Show me") behave as before.
- Voice module clip tests (`clip-player.test.ts`, `voice-engine.test.ts`) pass unchanged.

**Verification:** `grep -ri "watch" src/components/story src/content/rag src/layouts` finds nothing Watch-related; chapter pages render with no Watch strip at desktop and 390px.

### U2. Remove narration assets and tooling

**Goal:** No per-chapter narration remains in the repo.

**Requirements:** R2.

**Dependencies:** U1 (the runner no longer imports `data/watch/`).

**Files:**
- Delete `data/watch/`, `public/data/watch/`, `scripts/record-narration.mjs`, `tests/unit/narration.test.ts`.
- Modify `package.json` (drop `narration:script`, `record:narration`).
- Modify `scripts/lib/elevenlabs.mjs` (drop `compose`, used only by the narration recorder; keep what `record-voice.mjs` imports).

**Test expectation:** none -- deletions; `pnpm check`, `pnpm test` and the build prove nothing still imports them.

**Verification:** `pnpm build` output has no `data/watch/` files; `node --check scripts/record-voice.mjs` passes and its imports from `scripts/lib/elevenlabs.mjs` still resolve.

### U3. Shared trailer component and tests

**Goal:** Any module intro gets a trailer by adding one line once its video files exist.

**Requirements:** R4, R5. KTD4.

**Dependencies:** none (independent of U1–U2).

**Files:**
- Create `src/components/intro/Trailer.astro`.
- Modify `src/pages/rag/index.astro` (use the component; drop the inline dialog, script and styles).
- Modify `tests/e2e/trailer.spec.ts` (loop over every `public/video/*-trailer.mp4`, visiting `/<id>/`).
- Create `tests/unit/trailers.test.ts`.

**Approach:** Move markup, script and CSS as-is. The script must work with the component used once per page and look up its own dialog rather than a global `.trailer-box` query. Keep `preload="none"`, poster, default English captions track, the no-JS MP4 link, the `aria-label` naming the module.

**Patterns to follow:** `src/pages/rag/index.astro` trailer block; component style in `src/components/intro/ReadingMode.astro`.

**Test scenarios:**
- For each trailer found: `/<id>/` requests no MP4 before the button is pressed; the button opens the dialog and fetches the MP4; Esc, ✕ and backdrop close it and pause the video.
- For each trailer: the link's `href` is the MP4 with JS off.
- Axe clean with the popup open at desktop and 390px; the popup is 16:9 inside the screen (existing checks, now per trailer).
- Unit: every `public/video/<id>-trailer.mp4` has a matching `.jpg` and `.vtt`, a `videos/<id>-trailer/` project, and `<id>` is a live module in `MODULES`.
- Unit: every live module intro page that uses `Trailer` has its MP4 (no button pointing at a missing file).

**Verification:** `/rag/` looks and behaves identically to before; the existing `tests/unit/rag-trailer.test.ts` captions check still passes.

### U4. Docs: trailers only

**Goal:** The rules and guides describe trailers as the one per-module video and how to make one.

**Requirements:** R6, R7. KTD5.

**Dependencies:** U1–U3.

**Files:**
- Modify `AGENTS.md`: drop the Watch bullet and the Watch narration tooling bullet; restore "Nothing a reader enters leaves the browser, except the home request form on submit."; extend the Trailers bullet with "made at go-live or any time after; `Trailer.astro` on the intro; recipe in `docs/writing-a-module.md`".
- Modify `docs/writing-a-module.md`: replace the Watch line with a short "Trailer (optional, any time)" recipe — copy `videos/rag-trailer/`, edit `BRIEF.md`/`SCRIPT.md` (spoken facts from the module's data), retarget takes in `record.mjs`, run voice → music → record → cut → render → deliver, add a `tests/unit/<id>-trailer.test.ts` captions check modelled on RAG's, add `<Trailer>` to the intro.
- Modify `docs/modules/rag.md`: "Watch and trailer" becomes "Trailer" (keep the trailer bullet only).

**Test expectation:** none -- docs only.

**Verification:** `grep -rn "Watch\|narration:script\|record:narration\|data/watch" AGENTS.md docs/*.md docs/modules README.md` returns only the step-narration copy meaning (narration field), nothing about Watch mode.

---

## Verification Contract

- `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` all green.
- Manual look at `/rag/` and two RAG chapters at desktop and 390px: trailer popup works; chapters have no Watch controls.

## Definition of Done

- R1–R7 hold; U1–U4 merged in one PR to `main` with conventional commits.
- No file under `data/watch/` or `public/data/watch/` exists; `package.json` has no narration scripts.
- A contributor can make the next module's trailer from `docs/writing-a-module.md` alone.

## Sources

- PR #34 diff `d2d7cea..ddc0bc5` (what Watch added).
- `videos/rag-trailer/BRIEF.md` (trailer pipeline steps).
- Research ran in this session without subagents: the scope is one PR's footprint, fully mapped from its diff.
