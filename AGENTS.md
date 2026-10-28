# AGENTS.md

Decisions for anyone (human or agent) changing this repo. Each was chosen on purpose; change it only on purpose.

Working on one module? Its picture and engine decisions are in `docs/modules/<id>.md`; the shared tiny model is `docs/lm-kit.md`. Read those only when you touch that code.

## Principles

- Cut taglines, helper text and secondary labels. If a screen needs them to make sense, fix the layout.
- Make the decision that elevates UX, DX and AX (agent experience) together, without breaking anything.

## What this is

- **Tinker**: hand-drawn, interactive explanations of how tech works, AI and classic tech alike, by **Kondasamy Jayaraman** (https://kondasamy.com). Served at **https://tinker.kondasamy.com** (`site` in `astro.config.mjs`). GitHub: `Kondasamy/tinker` (private).
- A platform of **modules**, each one concept told as a playable story at `/<module>/`. The list, levels, tracks, prereqs and planned roadmap cards live in the registry (`src/lib/modules.ts`), not here. New modules start as reader requests through the home page form (`#request`).
- Audience: product managers, engineers and analysts at companies adopting the technology. Assume no background; keep any maths optional.
- Static Astro + React islands site: no backend, no API key, no live model. Anything "live" runs in the browser over data built ahead of time.

## Credit (required)

Pictures use **Colorfigures by April Zhu** (https://april-zhu.com/colorfigures), which grew from her ISO-GLOW, which builds on iso-figure by Tolga Cohce. All MIT. Keep the credit on every chapter page header ("drawn with Colorfigures by April Zhu"), in the footer of home and every module intro, in the README Credits, and `src/lib/iso/LICENSE` with the engine.

Author credit is always **Samy (Kondasamy Jayaraman)**: alias then full name, linked to kondasamy.com, `target="_blank" rel="noopener"`. The registry's `author.name` carries it; `Meta.astro`'s structured data names Kondasamy Jayaraman with `alternateName` Samy.

## Pages and their jobs

- **`/`** (`src/pages/index.astro`): centred hero (headline, one-line lede, two buttons, a "Free · No sign-up…" note) over the workshop picture, all in the first screen; then the catalogue by level, a "Propose a module" link, what Tinker is, how a module plays, the request form (`#request`, FormSubmit, the site's one outbound form; `?sent` shows the thanks), credits.
  - **Finder**: sticky over the catalogue. A search (focused by `/`) over each card's title, description, story, topics and chapter titles, naming a topic or chapter hit under the card; three dropdowns beside it for level, track and status (each a `<details>` menu of radios, never a native select; a status no card has is no option; a dropdown that filters is lit); the count reads "N live · M planned". The view lives in the URL (`?q=&level=&track=&status=`); no match offers Clear filters and a pre-filled module request. Without JS it stays hidden and every card shows. On phones the search takes its own row, the dropdowns share the next.
  - Cards: three across (two under 900px, one under 620px), no topic chips. A planned module is a roadmap card, no link.
  - Main button: "Start with the basics →" on a first visit (to the first live module's intro, never straight into a chapter); later it resumes the module played last (through its warm-up when due), then the next unfinished one in registry order.
- **`/<module>/`**: the idea in one example, how it works, the story's company, the chapter path, built from the module's own data. A **Pictures / Words** switch (`ReadingMode.astro`, default Pictures, `localStorage` `tinker-reading`) folds away `.more` text. The chapter path is picture cards (`ChapterCards.astro`) cropped from share images. No "At a glance" chips, no "How a chapter page works" box.
- **`/<module>/<chapter>/`**: live picture + story column.
- **`/<module>/recap/`**: recall questions from finished chapters; works at any progress.

## Modules

- **New modules go after the last live module in `MODULES`**, before the roadmap cards, in go-live order (`pnpm new-module` inserts it there and removes the planned card). Home numbers live modules by list position; Agents, Evals and Guardrails keep hard-coded "Module 3/4/5" kickers.
- **Registry**: each module declares itself in `src/content/<module>/module.ts` (id, title, level, track, status, author, prereqs, story, chapters with `intro`, recall bank). Planned modules have no chapters, pages or images. `track: 'Classic tech'` marks non-AI modules; absent means AI.
- **Each module keeps its own page folder** (`index.astro`, `[chapter].astro`, `recap.astro`). The chapter route picks its island with a ternary chain, one line per chapter: hydration needs a static import, so no lookup table and no shared route.
- **Progress** is per module in `localStorage` `<module>-progress-v1` (RAG's is `rag-progress-v1`), plus `tinker-last-module`. Every read tolerates missing fields and storage.
- **Never rename a module or chapter id**: saved progress is keyed by them.
- **Saved runs carry their step ids**; a run resumes only if they match, else the chapter restarts (`done` is kept). RAG keeps a `legacySteps` signature for older runs.

## Making it stick

- **Predict → reveal**: the reader commits a pick before a reveal; it locks and stays beside the outcome.
- **Quizzes explain every option** (`why`) and offer "I'm not sure", which reveals without counting a miss.
- **Recall bank** per module (`src/content/<module>/recall.ts`), one item `pin`ned. Results live in progress outside the run, so Reset never wipes them.
- **Recap** draws from the bank for finished chapters with a stored seed. **Warm-up**: up to three questions when the reader returns 20 h+ after finishing a chapter, on the intro and through home's Continue, with a skip link.
- Nothing a reader enters leaves the browser, except the home request form on submit.
- **Analytics is Cloudflare Web Analytics, page views only**: its beacon in `Meta.astro` (production builds, not `DEV_PAGES`; `spa` off so the Finder's URL never sends), site `tinker.kondasamy.com`. No cookies, no custom events; another tracker is a deliberate change.

## Styles

Marketing pages share `src/styles/page.css`; chapter pages use `src/layouts/ChapterLayout.astro`. Layout-level rules that style elements inside components go in `:where(...)` so component rules win (bundle order changes as pages are added). Dev-only pages use scoped styles, never `is:global`: they leak into real pages in `DEV_PAGES` builds.

## Chapter page layout

- **≥ 861px: an app frame**, picture still on the left, story column scrolling on the right. Phones stack picture above story.
- **The chapter bar has two fixed rows** (brand and credit; the chapter nav, scrolling sideways), same height everywhere. Moving between chapters cross-fades (`@view-transition`, off with reduced motion).
- **Every visit opens on the chapter's intro**, which offers "Continue at step N" for a saved run. The story column scrolls only when the step changes.
- **Opening context is short**: chapter number, title, story so far, the question; "You will learn" and "Words you'll meet" fold under "About this chapter". It lives in the chapter's `intro`. Never drop a reader into a step, never put a wall of text before it.
- **Terms are defined at first use**: `StepRunner` marks each chapter `term` in the narration (`src/components/story/terms.ts`) as a button opening the definition, outside the live region.
- **Finished steps** fold into "Story so far (n)" above the current card.
- **What to do goes in `act`**, drawn as its own bold line under the narration, on every step that asks for something.
- **Copy budgets** (`tests/unit/copy-budget.test.ts`, every module strict): narration + `act` ≤ 25 words, story 30, question 20, "You will learn" 3 items, callout 5 words, each quiz `why` one sentence, story + question + step 1 ≤ 62; every term appears in narration or `act`.
- Steps run in `StepRunner` (`src/components/story/`): narration, one control, a predicate, hints after 3 misses, "Show me" for puzzles, progress in `localStorage`.

## Story and content rules

- **One story per module.** RAG's: you join the team building an assistant for **Larkspur Supply Co.**, a fictional hardware company; most modules continue it.
- **Every fact comes from the data**, never typed into copy: history from `data/history/timeline.json`, answers from `data/answers/`, counts from the built index, module facts from `data/<module>/facts.json` with source and access date. Name whose figure and when; re-check moving facts (prices, limits) when a module changes.
- Plain words, short sentences, one idea per step. Let the picture show what happened; the narration says what it means and what to do next.
- **Sources open from a mark** (`Cite.tsx`): a small ↗ opens title, link and checked date. No inline "Source:" links.
- **Recorded, simulated or hand-set data is labelled as such** in the copy (stand-in scores, planning numbers, toy models). Puzzles accept every winning answer (`WINNERS`, computed or pinned and recomputed in a test), never one hand-picked answer. Pinned outputs of live models are rerun by a test; a retrain means new prompts, not hand-typed copy.

## Pictures

- **Style**: Colorfigures: flat three-tone shading, heavy ink silhouettes, flat blue shadows, warm paper. Palette in `src/styles/tokens.css` and `PALS` in the engine.
- **Engine**: `src/lib/iso/core.js` is upstream Colorfigures (`https://april-zhu.com/colorfigures/colorfigures.tar.gz`, `assets/core.js`) with exports added. Keep upstream code as written; mark local changes with `adapted:` (`withFrame()`, fractional `VIEW`, `unrotXY`, `inkK()`, `scale`/`fill` on `tag()`). To sync, diff upstream and reapply.
- **Text in pictures goes in label pills** (`tag()` / `blockTag()`), never painted on faces. Pills float at one height (`even`), are larger on phones (`scale` 2, name only) and pass clicks through.
- **Flat figures** (lanes, cards, arrows, stamps) live in `src/lib/iso/flat.ts`; `FlatStage` mirrors `IsoStage`. Use them for flows over time.
- **Lead with a scene, not a diagram.** Each module has its own isometric scene in `src/components/scenes/<name>Scene.ts`, read off the same run as its second view, so the two never disagree; a `<Module>Stage` in the module's `kit.tsx` puts it one tab from that view. Scenes compose earlier ones (`officeScene`, RAG's LLM block, `engineScene`) rather than redrawing them. Details per module in `docs/modules/<id>.md`.
- **RAG's canvas** alone has the 3D view (turn, drag, zoom, pan, fitted so the page never resizes); chapters 1–2 keep the front view. A "See inside" x-ray mode was built and **rejected**; don't bring it back.
- **The home hero is the workshop** (`heroScene.ts`), one fixed board that never grows: RAG's pipeline, tool calling's back office, a building site (`#request`) and a stand. Every later live module takes a 2.4 s turn on the stand, newest first, drawn 1.5× with its ink kept even; hovering holds it, clicking opens it. A new module needs only its `DRAW` entry. Still with reduced motion and in the share image (the newest module on the stand). `tests/unit/hero.test.ts` checks the pills never overlap at any registry size.
- **Callouts**: a step may carry `say: { block, text }` (≤ 5 words; outside RAG ≤ 16 characters), pinned as a lit pill over the named part. Each scene exports its parts (`OFFICE_PARTS`…) and each chapter its `PARTS`; `tests/unit/say-targets.test.ts` fails a callout naming a part its picture doesn't draw. Prefer large, separated parts.
- **One figure on a stage at a time**, in a fixed frame. Picture / second-view tabs are view state unless a chapter keeps the tab in step state. On phones, pills keep short names and the caption carries the numbers.
- **Trailers are a module's only video**: no narration inside chapters. One per module, made at go-live or any time after (recipe in `docs/writing-a-module.md`). Each lives in `videos/<module>-trailer/`, recorded by scripted hand-play of the live chapters, ships as `public/video/<module>-trailer.{mp4,jpg,vtt}` and shows on the intro through `Trailer.astro` behind its poster (`preload="none"`); `tests/unit/trailers.test.ts` checks every one. Re-render one when a picture or quoted fact it shows changes.
- **Untrusted strings render as text only**: React text nodes, or `esc()` in SVG strings. No `set:html` or `dangerouslySetInnerHTML` for content.

## Search (SEO)

- **`Meta.astro` owns the head**: title, description (≤ ~160 chars), canonical, author, icons, Open Graph and Twitter tags.
- **Structured data is read off the path and registry**: home `WebSite`, intro `Course`, chapter `LearningResource` (`isPartOf` its course), plus `BreadcrumbList`. JSON-LD escapes `<`.
- **Recaps and 404 are `noindex`.** `/sitemap.xml` and `/robots.txt` are endpoints built from `ALL_PAGES` and `site`; robots.txt blocks nothing (pages fetch `/data/`).

## Share images (OG)

- **Every public page has its own 1200×630 image** `public/og/<og>.jpg` (`<module>`, `<module>-<chapter>`, `<module>-recap`; RAG chapters keep bare names via `og`). An e2e test fails on a missing or shared image.
- Titles, descriptions and image text come from `src/lib/pages.ts` (`ALL_PAGES`), so page and image never disagree. Images are drawn by `src/dev/og.astro`, each with the page's own picture.
- **Regenerate with `pnpm og`** (or `pnpm og <slug|module-id>…`) after changing a page's text, chapters or picture; commit the JPEGs (quality 88).
- **A new public page needs** a `PageMeta`, `<Meta {...meta} />`, a picture case in `og.astro`, then `pnpm og`.

## Tooling

- **pnpm 11**, **Node 22.23.1** (`.node-version`). `onnxruntime-node` and `protobufjs` install scripts are off.
- **The dev server has its own Vite cache** (`node_modules/.vite-dev`, the `dev-cache` integration): a shared cache crashed dev with `_jsxDEV is not a function`.
- **Imports from `public/` go through the `public-json` plugin in dev.**
- Dev-only pages (`/dev/*`) exist in `astro dev` or with `DEV_PAGES=1`.
- **Biome** lints and formats (2 spaces, single quotes, 120 columns; `pnpm format`, `pnpm lint`). A real exception gets a `biome-ignore` with its reason, never a rule switched off for one site.
- The RAG index in `public/data/index/` is committed; rebuild (`pnpm build:index`) only after editing `data/corpus/` or `data/questions/`, never on a host.

## Checks before you call it done

```bash
pnpm check       # types: 0 errors, 0 warnings
pnpm lint        # Biome: 0 diagnostics
pnpm test        # unit (Vitest)
pnpm test:e2e    # every chapter played, axe, keyboard, reduced motion, phone, offline, share images
```

Look at the pages you changed (desktop and 390px wide). New behaviour gets a test. `tests/unit/registry.test.ts` names what a live module is missing. CI runs all four on every PR, e2e in eight shards; `E2E_PORT` moves the preview server off 4399.

## Adding a module

1. Plan it (concept, level, story, chapters, sources; `CONTRIBUTING.md`).
2. `pnpm new-module <id> "<Title>"` copies `templates/module/` and appends to `MODULES`.
3. Write it by `docs/writing-a-module.md`, picture-first from the first commit; `pnpm test` lists what's missing. Add `docs/modules/<id>.md` for its picture and engine decisions.
4. Reuse `src/lib/iso/`, keep the credit, then `pnpm og`.

## Commits

Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), one logical change each, on a branch with a PR to `main`.
