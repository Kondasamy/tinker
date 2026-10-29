---
title: AI-First Home Catalogue - Plan
type: feat
date: 2026-10-29
topic: ai-first-catalogue
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# feat: AI-first home catalogue

## Summary

The home catalogue becomes AI-first. AI modules lead, on the full picture cards grouped by level. Classic tech follows in its own quieter section of compact cards with no picture. Continue prefers unfinished AI modules. The work lands on top of PR #40 (`feat/creative-scene-figures`).

---

## Problem Frame

The catalogue on `/` groups every module by level, so AI and classic modules sit side by side with the same weight: 30 AI and 16 classic live today. The author wants AI modules, the trending topic, picked first. Classic modules are common knowledge found everywhere, so they stay on offer but in second place.

---

## Requirements

- **R1.** AI modules (`track` absent) come first in the catalogue on the existing full cards (picture, kicker, level, description, progress, Start), grouped Beginner, Intermediate, Advanced as today.
- **R2.** Classic tech modules (`track: 'Classic tech'`), live and planned, follow in their own section headed "Classic tech", after every AI card and before "Propose a module".
- **R3.** Classic cards are compact: no picture and no "Module N" kicker. Each shows a level tag (visible text), title (linked when live), description, the finder's "Includes:" hit line when a search matches a topic or chapter, progress when started, and a Start link. Planned classic cards keep the roadmap look (dashed, no link).
- **R4.** The finder works unchanged across both sections. The search, the level, track and status dropdowns, the count, the URL view and the no-match request all behave as today. A section with no visible card hides along with its heading.
- **R5.** After the last module played is finished, Continue resumes the next unfinished AI module before any classic one. A first visit still starts with the first live module (RAG).
- **R6.** Registry order, module ids, module pages and saved progress do not change.
- **R7.** The hero stand rotates only live AI modules (newest first, as today), so the first screen is AI-first too. Its still picture and the home share image show the newest AI module. Classic modules no longer take a turn.

---

## Key Technical Decisions

- **KTD1. Compact classic cards (user-directed; chosen over the same cards with smaller pictures, and over identical cards in their own section).** The classic section reads as an index of extras. This also cuts most classic card SVG from the home page.
- **KTD2. The registry stays as is.** Changes stay in `src/pages/index.astro`, `src/components/scenes/heroScene.ts`, their tests, the home share image and `AGENTS.md`. `track` already marks every module. Splitting `LIVE` / `PLANNED` by track at render time keeps `MODULES` order, and the numbering tests built on it, intact (R6).
- **KTD3. AI cards keep today's number, their position among all live modules (`LIVE.indexOf(m) + 1`).** Intro and recap pages compute the same number (and some hard-code it), and per-module specs pin it, so renumbering among AI modules only would make a card disagree with its own intro page (e.g. Calibration 22 on home vs 30 on its intro). AI numbers therefore show gaps where classic modules sit. That is accepted. Classic compact cards carry no number; their intro pages keep theirs.
- **KTD4. Classic level groups carry no headings.** The finder reads a card's level from `closest('[data-level]')` and hides empty `[data-level]` groups. The classic section keeps one `data-level` wrapper per level, so the finder needs no new logic, but the wrappers have no `<h3>`. Each compact card shows its level tag instead, so the classic section adds one heading, not three.
- **KTD5. Heading outline.** "Classic tech" is an `<h3>` in the `#modules` section at the same depth as the AI level headings. Compact card titles are `<h4>`, like AI cards, so there is no heading-order gap for axe. The AI part gets no new heading: it sits under "Pick a concept", and the kicker above that heading changes from "Modules" to "AI modules" so the emphasis is stated once. Per the principle of cutting taglines, there is no explanatory line under "Classic tech".
- **KTD7. The stand reads AI modules only, and the classic plots go (user-approved; chosen over leaving the stand unchanged).** `heroScene.ts` filters its live list by `track` in one place, so `HERO_TURNS`, the label and `undrawn` follow. Classic `DRAW` entries, and any plot helper only they use, are deleted rather than left dead. This also trims the hero SVG, which PR #40 lists as close to its size budget.
- **KTD6. The finder hides a whole section when it is empty.** The group-hiding pass also hides the classic section when none of its cards show (for example, track = AI). A section wrapper with its own selector keeps the existing `[data-level]` pass untouched.

---

## Implementation Units

### U1. Split the catalogue into AI and classic sections

**Goal:** Render AI cards first and classic compact cards after them, with the finder working across both.

**Requirements:** R1, R2, R3, R4, R6; KTD1–KTD6.

**Dependencies:** none.

**Files:** `src/pages/index.astro`, `tests/e2e/catalogue.spec.ts`.

**Approach:**
1. Split the existing `LIVE` / `PLANNED` lists by `track`. `atLevel` takes the track it renders. AI kickers keep `LIVE.indexOf(m) + 1` (KTD3).
2. AI part: today's level groups (h3 headings, full cards, roadmap cards for planned AI modules), unchanged markup.
3. Classic part: one `<section>` (its own class or data attribute for KTD6) with an `<h3>Classic tech</h3>`. Inside it, per level, a heading-less `data-level` wrapper (a plain div, no ARIA role) holding compact cards. Live compact cards keep the `.module` class plus a modifier, and every finder hook: `data-module`, `data-track`, `data-status`, `data-search`, a `[data-hit]` paragraph, `data-progress` and `data-cta`. Planned classic cards reuse `.roadmap` with its attributes as they are.
4. Compact cards drop `.pic` and the kicker. Grid: 4 across on desktop, 3 under 900px, 1 under 620px (matching the AI cards' phone fallback). Order inside a card: level tag, title, description, hit line, progress, Start link. Ink border as the AI cards, but a 3px offset shadow instead of 5px, so AI cards stay the emphasis. The title and the Start link stay two links, as on AI cards; Start keeps the existing `.btn` size so it stays a comfortable tap target at 390px.
5. Finder: the level-group pass also hides the classic section when it has no visible card (KTD6). Every other behaviour (count, URL, dropdowns, no-match) stays as is.
6. Kicker above "Pick a concept" reads "AI modules" (KTD5).

**Patterns to follow:** existing `.module` / `.roadmap` cards and `.level-group` in `src/pages/index.astro`; `:where(...)` rule and scoped styles per AGENTS.md Styles.

**Test scenarios** (`tests/e2e/catalogue.spec.ts`, at 1280 and 390px). These existing tests encode the old layout and are rewritten or scoped to one section: "levels in order, live then planned cards grouped by level" (per-level order), "live modules keep their numbers" (classic cards have no kicker; check AI ids only), "live cards numbered from 1" (AI kickers only, numbers as today), and the finder test's `[data-level="Advanced"]` hidden check (now two wrappers).
- AI part shows level headings Beginner, Intermediate, Advanced, and within each level, the live AI cards and then planned AI cards, in registry order.
- The classic section comes after the last AI card and before "Propose a module". Its cards list live then planned classic modules, level by level, in registry order.
- Every live classic card has no `.pic`, no "Module" kicker, a level tag, and a Start link to `/<id>/`. Every live AI card has a picture.
- AI kickers keep their all-live numbers (e.g. Agents reads Module 3 and Diffusion Module 25, matching their intro pages).
- `.module` count still equals live modules, and `.roadmap` count equals planned modules.
- Track = Classic tech plus status = Planned shows exactly the planned classic cards, and every AI level group is hidden. After a reload, the same view returns.
- Track = AI hides the classic section, heading included.
- Track = Classic tech hides every AI level group, while the "AI modules" kicker and "Pick a concept" heading stay (they head the whole catalogue and finder).
- A search that matches only a classic module (e.g. a classic topic) shows that compact card and its "Includes:" hit line.
- Progress on a classic module (seed `<id>-progress-v1`) shows the progress line and the Continue text on its compact card.

**Verification:** the home page at desktop and 390px shows AI first on full cards and classic compact cards after them. The axe check in the existing home e2e test stays clean.

### U2. Continue prefers unfinished AI modules

**Goal:** Make the hero's Continue walk readers through AI modules before classic ones.

**Requirements:** R5, R6.

**Dependencies:** U1 (same file; land after it).

**Files:** `src/pages/index.astro`, `tests/e2e/catalogue.spec.ts` (new cases; per-module specs such as `tests/e2e/agents.spec.ts` keep their existing last-played Continue tests unchanged).

**Approach:** In the inline script, the "next unfinished" lookup searches live modules ordered AI first, then classic, each in registry order. The last-played and first-visit rules are untouched.

**Test scenarios:**
- Every AI module finished and no classic one started: Continue starts the first classic module in registry order.
- The last module played (an AI one) is finished, an earlier-registered classic module is unfinished, and a later AI module is unfinished: Continue picks the AI module.
- The last module played is an unfinished classic module: Continue still resumes it (last-played wins).
- A first visit with no progress keeps "Start with the basics →" to `/rag/`.

**Verification:** the existing Continue tests pass unchanged, and the new AI-first cases pass.

### U4. AI-only hero stand

**Goal:** Only AI modules take turns on the home stand.

**Requirements:** R7; KTD7.

**Dependencies:** none.

**Files:** `src/components/scenes/heroScene.ts`, `tests/unit/hero.test.ts`, the home page's share image under `public/og/` (regenerated). The hero's size budget in `tests/unit/scene-size.test.ts` stays as is; the hero only gets smaller.

**Approach:**
1. Filter the hero's live list to modules with no `track` (AI). `HERO_TURNS`, `heroLabel` and `undrawn` derive from it.
2. Delete the classic modules' `DRAW` entries and any plot helper no other entry uses.
3. `pnpm og` for the home page so the share image shows the newest AI module.

**Patterns to follow:** the existing `LIVE` filter in `heroScene.ts`; AGENTS.md "home hero" rules (pills never overlap, plots no taller than their neighbours).

**Test scenarios** (`tests/unit/hero.test.ts`):
- Turn count equals live AI modules minus RAG and tool calling, and no stand pill names a classic module.
- "Draws a plot for every live module" becomes every live AI module; a classic id is not reported as undrawn.
- The label names every live AI module and no classic one.
- The pill-overlap check still passes for every live AI module.

**Verification:** the home hero at 1280 and 390px cycles AI modules only; with reduced motion it shows the newest AI module.

### U3. Record the decision

**Goal:** Keep AGENTS.md true to the page.

**Requirements:** R1–R5.

**Dependencies:** U1, U2, U4.

**Files:** `AGENTS.md`.

**Approach:** In "Pages and their jobs", update two bullets. **Cards:** AI first on full cards, classic tech after on compact cards with no picture and no number; AI cards are numbered among AI modules. **Main button:** next unfinished AI module, then classic. In Pictures, the home hero line becomes "every later live AI module takes a turn" and "a new AI module needs only its `DRAW` entry". The "Home numbers live modules by list position" line under Modules stays true for AI cards; add that classic cards carry no number.

**Test expectation:** none, docs only.

---

## Scope Boundaries

- No change to module intros, chapter pages, the registry, or the `track` field.
- No "AI" badge on AI cards; their position and full size carry the emphasis.

### Deferred to Follow-Up Work

- Re-measure the hero SVG after U4 and update the PR #40 residual note with the new size.

---

## Risks

- **E2E selectors that assume one set of level groups.** `[data-level="Advanced"]` now matches two wrappers. Scope such assertions to the AI part or the classic section.
- **Number-based expectations elsewhere.** KTD3 keeps every number, so per-module specs pinning "Module N" stay green; grep e2e tests for `Module ` and `.module .kicker` before finishing anyway.

---

## Verification Contract

- `pnpm check`, `pnpm lint`, `pnpm test` and `pnpm test:e2e` all pass.
- The home page has been viewed at 1280px and 390px, both with no progress and with seeded progress.

## Definition of Done

U1–U4 are committed on `feat/creative-scene-figures`, all four gates pass, and the PR #40 description mentions the AI-first catalogue.

---

## Revisions after first build (user feedback, 2026-10-29)

- **Classic cards read as modules again (supersedes KTD1's "no picture" and R3's "no kicker").** Compact cards keep the 4/3/1 grid and lighter shadow but gain a small picture thumbnail (90px tall) and the "Module N · X chapters" kicker; every live card is numbered by its all-live position.
- **Intro meta line shows the level alone.** The prerequisite "… recommended" links and the "· by Samy" byline go from every module intro; the top bar still credits the author.
- **Every drop-down is the site's own `Select`.** A shared React combobox (`src/components/story/Select.tsx`) replaces all native selects in module workbenches and RAG's canvas; `tests/unit/no-native-select.test.ts` guards it and e2e picks with `choose()`.
