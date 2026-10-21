# AGENTS.md

Decisions for anyone (human or agent) changing this repo. Each one is here because it was chosen on purpose; change it only on purpose.

## What this is

- **Tinker**: hand-drawn, interactive explanations of tech concepts, by **Kondasamy Jayaraman** (https://kondasamy.com). Served at **https://explain.kondasamy.com** (`site` in `astro.config.mjs`). GitHub: `Kondasamy/tinker`.
- A platform of **modules**. Each module is one concept told as a playable story at `/<module>/`. **RAG** is module 1, at `/rag/`; **Tool calling & MCP** is module 2, at `/tool-calling/`; **AI agents** is module 3, at `/agents/`; **Evals & LLM testing** is module 4, at `/evals/`; **Prompt injection & guardrails** is module 5, at `/guardrails/`.
- Audience: product managers, engineers and analysts at companies adopting the technology. Assume no background; keep any maths optional.
- Static Astro + React islands site: no backend, no API key, no live model. Anything "live" runs in the browser over data built ahead of time.

## Credit (required)

The pictures use **Colorfigures by April Zhu** (https://april-zhu.com/colorfigures), which grew from her ISO-GLOW, which builds on iso-figure by Tolga Cohce. All MIT. Keep the credit:

- on every chapter page header ("drawn with Colorfigures by April Zhu");
- in the footer of the home page and of every module intro;
- in the README Credits section, and `src/lib/iso/LICENSE` with the engine.

Author credit is always the full name, **Kondasamy Jayaraman**, linked to kondasamy.com.

## Pages and their jobs

| Page | Job |
|---|---|
| `/` (`src/pages/index.astro`) | What Tinker is, the module catalogue grouped by level (planned modules are roadmap cards, no link), how every module plays, credits. Shows progress per module; "Continue" resumes the module played last (through its warm-up when one is due). A first visit goes to the module intro, never straight into a chapter. |
| `/<module>/` (e.g. `src/pages/rag/index.astro`) | Sets the module's context before chapter 1: the idea in one example, how it works, the story's company, the chapter path. Built from the module's own data, never placeholder text. Pictures first: a **Pictures / Words** switch (`src/components/intro/ReadingMode.astro`, default Pictures, remembered in `localStorage` `tinker-reading`) folds away longer text marked `.more`, leaving pictures, headings and one-line captions (`.cap`). The chapter path is picture cards (`ChapterCards.astro`) cropped from each chapter's share image. |
| `/<module>/<chapter>/` | One chapter: live picture + story column (below). |
| `/<module>/recap/` | Recall questions from the chapters the reader finished; works at any progress (nothing done: says so, links chapter 1). |

## Modules

- **Registry (`src/lib/modules.ts`).** Each module declares itself in `src/content/<module>/module.ts` (id, title, level, status, author, prereqs, story, chapters with `intro`, recall bank); `MODULES` collects them. Pages, navigation, share images and checks read from it. Planned modules are registry entries with no chapters, no pages and no images.
- **Levels are per module**: Beginner, Intermediate, Advanced. RAG is Beginner; Tool calling is Intermediate with RAG as its prereq; AI agents is Advanced with Tool calling as its prereq; Evals is Intermediate with RAG as its prereq; Guardrails is Intermediate with Tool calling as its prereq.
- **Each module keeps its own page folder**: `src/pages/<module>/index.astro`, `[chapter].astro`, `recap.astro`. The chapter route picks its island with a ternary chain, one line per chapter: hydration needs a static import, so no lookup table and no shared `[module]/[chapter]` route.
- **Progress is per module** in `localStorage` key `<module>-progress-v1` (RAG's is the original `rag-progress-v1`, no migration), plus `tinker-last-module`. Every read tolerates missing fields and missing storage.
- **Never rename a module id or chapter id**: saved progress is keyed by them.
- **Saved runs carry their step ids.** A run resumes only if its saved ids match the chapter's current ones; otherwise the chapter restarts (`done` is never touched). RAG chapters keep a `legacySteps` signature for runs saved before signing. Changing a chapter's steps restarts its in-progress runs; that is intended.

## Making it stick

- **Predict → reveal:** before a reveal the reader commits a pick (`Predict`); it locks and stays beside the outcome.
- **Quizzes explain every option** (`why` per option) and offer "I'm not sure", which reveals without counting as a miss.
- **Recall bank** per module (`src/content/<module>/recall.ts`), one item per bank pinned (`pin`) so it comes first until answered right. Results live in progress, outside the run, so Reset never wipes them.
- **Recap** draws from the bank for finished chapters with a stored seed (a reload keeps the order). **Warm-up:** up to three questions when the reader returns 20 h or more after finishing a chapter, on the module intro and through home's Continue, with a skip link.
- Nothing a reader enters leaves the browser.

Marketing pages share `src/styles/page.css` (buttons, kickers, chips, top bar, credits). Chapter pages use `src/layouts/ChapterLayout.astro`.

**CSS:** layout-level rules that style elements inside components (e.g. sizing every `svg` in the stage) go in `:where(...)` so component rules always win. Same-specificity rules otherwise depend on the order Astro bundles the CSS, which changes as pages are added (this once made the chapter 6 graph walk overlap a block). Dev-only pages use scoped styles, never `is:global`: dev pages are bundled into `DEV_PAGES` builds, and global rules leak into real pages.

## Chapter page layout

- **Wide screens (≥ 861px): an app frame.** The picture holds still on the left; the story column on the right scrolls on its own. Phones stack the picture above the story.
- **The chapter bar has two fixed rows** (brand and credit, then the chapter nav, which scrolls sideways instead of wrapping), so it is the same height on every chapter. Progress marks keep a fixed slot. Moving between chapters cross-fades (`@view-transition`, off with reduced motion).
- **Every visit opens on the chapter's intro**, a resumed or finished run too; the intro then offers "Continue at step N". The story column scrolls to the step only when the step changes.
- **The story column opens with context**, before step 1: chapter number, title, the story so far, the chapter's question, "You will learn", "Words you'll meet". This lives in each chapter's `intro` in `src/content/<module>/module.ts`. Never drop a reader straight into a step.
- **Finished steps stay visible** as a ticked "story so far" log above the current step card; the current step scrolls into view when it changes.
- Steps are run by `StepRunner` (`src/components/story/`): narration, the one control the step needs, a predicate that advances it, hints after 3 misses, "Show me" for puzzles, progress in `localStorage`.

## Story and content rules

- **One story per module.** RAG: you join the team building an AI assistant for **Larkspur Supply Co.**, a fictional hardware company. (An early "noir detective" concept was dropped; the files in `research/` are background, not the design.)
- **Every fact comes from the data.** History numbers come from `data/history/timeline.json` (with sources). Answers are the recorded ones in `data/answers/`. Counts come from the built index (`public/data/index/manifest.json`). Do not type numbers or answers into page copy by hand; import them.
- Plain words, short sentences, one idea per step. Define a term the first time it appears (and add it to the chapter's `terms`).

## Pictures

- **Style:** Colorfigures: flat three-tone shading, heavy ink silhouettes, flat blue shadows, warm paper. Palette in `src/styles/tokens.css` and `PALS` in the engine.
- **Engine:** `src/lib/iso/core.js` is upstream Colorfigures (`https://april-zhu.com/colorfigures/colorfigures.tar.gz`, `assets/core.js`) with exports added. Keep upstream code as written; mark each local change with an `adapted:` comment. Local changes: `withFrame()` (per-stage origin, ink scale, light, id prefix, view and centre), any-angle view turns (`VIEW` may be fractional), `unrotXY`, `inkK()`, and a `scale` argument on `tag()`. To sync: diff upstream `core.js` against ours and reapply the adaptations.
- **Text in pictures goes in label pills** (`tag()` / `blockTag()`), never as small text painted on faces: face text was unreadable. Pills float at one height so neighbours form a row (`even`), sit low for the track's side bays, are larger on phones (`scale` 2, name only), and let clicks pass through (`pointer-events="none"`).
- **3D view (RAG canvas only):** turn buttons, drag-to-orbit, zoom (buttons, pinch) and pan when zoomed. Part turns are fitted inside the whole-turn frame so the page never resizes. Labels and front-mounted parts move to the faces toward the viewer. The chapter 1–2 scenes keep the fixed front view (their glass drawing assumes it).
- A "See inside" (x-ray glass blocks) mode was built and **rejected**; don't bring it back.
- **Flat figures** (lanes, message cards, arrows, stamps) live in `src/lib/iso/flat.ts` beside the engine, reusing its ink, palette and wobble; `core.js` stays untouched. `FlatStage` mirrors `IsoStage`. Use them for flows over time; isometric blocks show sequences poorly.
- **The home hero is the workshop** (`src/components/scenes/heroScene.ts`): one board, a plot per module from the registry. RAG's pipeline and tool calling's back office are live plots, then agents' desk with its clipboard and evals' stack of graded test cards with a rubber stamp (`testStack`), and guardrails' inbox tray, screening arch and post box; each planned module is a building site (crate, cones, barrier), which invites contributors. Plots after the first two run in one staircase down the front-right edge, so each pill gets its own row; pills are short (the module id for planned ones). The board grows with the registry, so a new module needs no hand-placed art.
- **Lead with a scene, not a diagram.** Tool calling's chapters 1–4 and 6 (and its intro hero and home card) open on the **back office** (`src/components/scenes/officeScene.ts`): an isometric diorama of the employee's desk, the host's sorting desk, the model and the order system's filing cabinet, joined by conveyor belts. The message being sent rides its belt as an envelope coloured by kind; checks stand on the belts (schema arch, ownership arch, approval barrier); a drawer slides out when the orders are read; a planted note pokes out of an envelope. It is driven by the same transcript as the sequence, so the two never disagree. Only stamps ride in the drawing; the message's words go in the caption under it (`ToolStage` in `src/content/tool-calling/kit.tsx`).
- **The agents scene** (`src/components/scenes/agentScene.ts`) composes `officeScene` and adds four props, each turned on by the chapter: a clipboard by the model (the plan, a tick per finished item), a step and context gauge on the host desk, an in-tray of history papers that becomes one binder when the host compacts, and small helper desks for sub-agents. On phones the props' readout pills are left out and the caption carries the readouts; only the helper count pill stays.
- **The evals bench** (`src/components/scenes/evalScene.ts`) composes RAG's `miniPipeline`: a stack of test cards rides a belt into the pipeline, and the answers go to a grader's desk where cards pile up PASS and FAIL, with a scoreboard pill. `EvalStage` (`src/content/evals/kit.tsx`) puts it one tab from the Results grid (`evalGrid.ts`, a column per version, flipped cells marked). Chapter 5 grades a Tool calling run, so its stage is Tool calling's `ToolStage` and ledger. Chapter 7 keeps its tab in the step state.
- **The mail room** (`src/components/scenes/guardScene.ts`) composes `officeScene` (the front desk renamed through its `emp` option) and adds a mail room, read off one run up to the current step: email waits in an inbox tray and rides the front-desk belt in to the host; an outbound chute behind the host leads to a post box, the way out. Each defence is a prop turned on by a flag: a screening arch on the inbound belt (the input checks), a barrier on the chute (the allow-list), the chute shut once untrusted text is in (the taint rule), and the lethal trifecta's three legs named, a removed leg drawn shut, dashed or gone. `officeScene` exports `beltAt`, `archAt` and `barrierAt` so the mail room draws its belts and checks the same way. `GuardStage` (`src/content/guardrails/kit.tsx`) puts it one tab from the Steps lanes (`guardSequence.ts`), where a call a check stopped is a dashed card stamped REFUSED (DENIED when a person said no). Chapter 7 keeps its tab in the step state.
- **One figure on a chapter stage at a time**, chosen by the step, inside a fixed frame. Where the reader may pick the view, a tab switch selects it: tool calling's Picture / Messages tabs (ch. 1–4 and 6 keep the tab as view state, outside saved progress; ch. 5 and 7 keep it in the step state). Agents uses Picture / Steps tabs the same way; chapter 7 keeps its tab in the step state by passing `view` and `onView` to `AgentStage`.
- **Untrusted strings render as text only**: React text nodes, or `esc()` in SVG strings. `FlatStage` and `IsoStage` inject SVG markup, so every string in it must be escaped by the kit first. No `set:html` or other `dangerouslySetInnerHTML` for content.

## Tool calling engine (`src/lib/tools/`)

- **Recorded model turns, live everything else.** Turns live in `data/tool-calling/turns/*.json`, keyed by a signature of what the model could see; a missing one is `norecord`. Every chapter control has a finite exported domain, and a unit test generates every reachable signature from them and asserts each has a turn. Host-only decisions (call cap, permissions, validation) stay out of the signature.
- **Schema checks are a hand-written JSON Schema subset** (`schema.ts`); copy says "a subset". No `ajv` (it compiles with `new Function`).
- **The MCP server is a model of the protocol**, not a conforming SDK: JSON-RPC 2.0 shaped, following the current spec (stateless, 2026-07-28, no opening handshake). Every MCP or API fact in copy comes from `data/tool-calling/facts.json` with its source and access date.

## Agent engine (`src/lib/agents/`)

- **Its own folder, built on `src/lib/tools/`.** It reuses the schema checks, the MCP-shaped server, the turn lookup and `host.ts`'s `combosOf`. It has its own loop and signature, so Tool calling's signatures and recordings never change.
- **`server.ts` takes a bundle** (servers, tools, a handler per tool). Tool calling passes nothing and gets its own default. Agents passes `data/agents/server.json`: the order server plus warehouse, carrier and mail, with fixtures in `data/agents/cases.json`.
- **Recorded turns, keyed by what the model saw.** Turns live in `data/agents/turns/<scenario>.json`, one reviewed file per scenario. The signature holds the case, the tools, the plan state, the memory mode and the visible history (each result so far, or the summary's marker after compaction). Host-only settings stay out: the step budget, the repeat detector's setting, the approval mode and the context budget. They change where a run stops, not what the model says. Every chapter control has a finite domain (`DOMAINS`, and `WORKBENCH_DOMAINS` for chapter 7), and `tests/unit/agent-coverage.test.ts` runs every combination and fails on any `norecord`.
- **Tokens are computed, never recorded**: bytes ÷ `BYTES_PER_TOKEN`, the full context re-sent each turn.
- **The repeat detector is a host rule.** When the same call fails the same way N times in a row, the host returns a "stopped" result. That result enters the history, so the model gets one last recorded turn to tell the customer, and the run ends `stuck`. The step budget ends a run with no further turn (`out-of-budget`).
- **Plan approval binds the run.** A call outside the approved plan, or a new plan, goes back to a person. A plan nobody has answered leaves the run `waiting`.
- **The chapter 5 context budget is a host setting** Larkspur chose, not a fact about any model; the copy says so.
- **A sub-agent is a nested run** with its own history and budget; its turns are the `order-<id>` cases in the same scenario recording. The lead gets only the helper's final line, as the result of the host-defined `delegate` tool, so the helper's history never enters the lead's signature.

## Evals engine (`src/lib/evals/`)

- **Versions over RAG's questions, reading recorded answers.** `suite.ts` defines four versions of Larkspur's assistant (v0 no documents, v1 RAG's defaults, v2 bigger pieces, v3 reranker and top 5) as RAG knobs. Running a version is RAG's real retrieval over the committed index on the 12 questions of RAG chapters 3–6, then the recorded answer for what it found (`data/answers/`). No new model answers; a missing one throws.
- **Code graders are computed; everything else is recorded.** Exact match, key fact and citation run live (`graders.ts`) against `data/evals/references.json`. The model judge (`judge.json`: per answer and rubric, keyed by question and signature), the people's labels (`labels.json`) and the repeated tries (`samples.json`, standing in for sampling a live model) are recorded data.
- **Side-by-side judging is recorded in both orders** (`ab`, `ba`); a pair whose winner changes with the order is position bias.
- **The path chapter reads Tool calling's runs**: it plays `order-status` and `injection` through `src/lib/tools/host.ts` and grades the reply, the ledger and the calls. Tool calling's recordings are never edited; the judge's verdicts on those runs live in `judge.json` `runs`.
- **The release gate is a host rule** (`decide`): a pass-rate bar, and optionally no question that passed on the baseline (v1) may fail.
- **Coverage:** every chapter control has a finite domain (`DOMAINS`, and `WORKBENCH_DOMAINS` for chapter 7). `tests/unit/evals-coverage.test.ts` and `evals-workbench.test.ts` walk every combination and fail on any missing answer, reference or judge verdict.
- **Facts about evals** come from `data/evals/facts.json` with source and access date.

## Guardrails engine (`src/lib/guardrails/`)

- **A small single-agent loop with defence layers as host stages** (`loop.ts`). It reuses Tool calling's schema checks, `server.ts`'s `Bundle`, `combosOf` and `stepsOf`/`answerOf`; no plans, compaction or delegation. Input stages (the classifier, the input policy check) decide what the model sees; the taint rule and the trifecta's legs decide which tools it is offered; output stages (approval, the allow-list, the output policy check, the output filter) act on what it does.
- **The bundle** (`data/guardrails/server.json`) adds `read_inbox` (untrusted email), `get_customer` (private data: address, card's last four, account notes) and `send_email` with a free `to` field (the way out) to the order tools. Replies go through the host-defined `reply` tool, which can only answer the sender of the email being worked, so it is not a way out. The taint rule removes only `send_email`.
- **The signature holds what the model could see** (`turns.ts`): the case, the email's form (`full`, `quarantined` when the classifier held it, `refused` when the input policy check turned it away), whether the prompt rule is in the system text, the tools offered (the taint rule and a removed leg change them) and the history of outcomes, a stopped send entering as `send_email:blocked` or `send_email:denied`. Host-only settings stay out: the threshold's value, the allow-list, the output filter, the output policy check and approval. They change what the host does, not what the model sees.
- **The classifier is a fixture, not a model.** Each email in `data/guardrails/inbox.json` carries a hand-set score, an `attack` label and a note; it is the only home of scores and labels. Copy calls it a stand-in detector whose scores were set to show the trade-off. Thresholds come from a finite list (`THRESHOLDS`).
- **Two suites**: `data/guardrails/suite.json` references inbox emails by id, the attacks (each with a goal check) and the ordinary customers (each with the tools its answer needs). `metrics()` runs both under one defence set and gives attack success rate (`asr`) and false-block rate (`fbr`); the copy names the two counts an eval.
- **One merged recording.** Turns live in `data/guardrails/turns/<chapter>.json`, one reviewed file per chapter scenario holding the turns that chapter first needs; each signature is in exactly one file, and every run looks up the merged `RECORDING`, so later chapters and the red-team workbench reuse earlier turns. This departs on purpose from the plan's per-chapter recordings (as agents keeps): the chapters share most of what the model sees, and one lookup keeps a turn from being recorded twice. Chapter 7 has no file of its own.
- **Coverage:** every chapter control has a finite domain (`DOMAINS`, one per recording file) and chapter 7's red team is one domain over every defence and both suites (`WORKBENCH_DOMAINS`). `tests/unit/guard-coverage.test.ts` runs every combination and fails on any `norecord`, on a signature in two files, or on a recorded turn nothing reaches.
- **Chapter 5's puzzle accepts every minimal winning set**: every defence set the controls can make that stops every attack with the fewest false blocks (`WINNERS`, computed over the chapter's domain), not one hand-picked answer.
- **Facts about prompt injection** come from `data/guardrails/facts.json` with source and access date.
- **Agents chapter 3 links straight to `/guardrails/`** for prompt injection; it changed in the PR that took Guardrails live.

## Share images (OG)

- **Every public page has its own 1200×630 share image**: `public/og/<og>.jpg`, referenced by `Meta.astro` (`og:image`, `twitter:card = summary_large_image`, canonical URL). An e2e test fails if a page has none, or two pages share one.
- **Image names are module-qualified**: `<module>`, `<module>-<chapter>`, `<module>-recap`. RAG chapters keep their original bare names through an `og` override, so already-shared links keep their images.
- Titles, descriptions and the image text all come from **`src/lib/pages.ts`** (`HOME`, `introMeta`, `chapterMeta`, `recapMeta`; `ALL_PAGES` walks the live modules), so a page and its image never disagree.
- The images are drawn by the dev-only template `src/dev/og.astro`, each with the page's own picture (home: one picture per live module; RAG: the minimal pipeline; tool calling: the back office at the moment each chapter turns on, and the MCP scene; guardrails: the mail room with each chapter's defence; chapter 1: the timeline; chapter 2: the overflowing window; chapters 3–7: the track as of that chapter).
- **Regenerate with `pnpm og`** after changing a page's text, a chapter list or a share picture, and commit the JPEGs. JPEG at quality 88 (the paper grain makes PNGs ~4× bigger).
- **A new public page needs:** a `PageMeta` in `pages.ts` (module intros, chapters and recaps get theirs from the registry through `ALL_PAGES`), `<Meta {...meta} />` in its `<head>`, a picture case in `og.astro` (a page without one falls back to the recall cards), then `pnpm og`.

## Tooling

- **pnpm 11** (`packageManager`), **Node 22.23.1** (`.node-version`; Astro 7 needs ≥ 22.22). Install scripts of `onnxruntime-node` and `protobufjs` are off in `pnpm-workspace.yaml` (not needed).
- **The dev server has its own Vite cache (`node_modules/.vite-dev`).** `astro build` and `astro check` pre-bundle production React into the shared cache, which made a running dev server crash with `_jsxDEV is not a function` (figures flashed and vanished). Keep the `dev-cache` integration in `astro.config.mjs`.
- Dev-only pages (`/dev/blocks`, `/dev/canvas`, `/dev/runner`, `/dev/flat`, `/dev/quiz`, `/dev/recap`, `/dev/warmup`, `/dev/og/*`) exist in `astro dev` or with `DEV_PAGES=1`; production builds leave them out.
- The RAG index in `public/data/index/` is committed. Only rebuild it (`pnpm build:index`) after editing `data/corpus/` or `data/questions/`, never on a host.

## Checks before you call it done

```bash
pnpm check       # types: 0 errors, 0 warnings
pnpm test        # unit (Vitest)
pnpm test:e2e    # every chapter played through, axe, keyboard only, reduced motion, phone, offline, share images
```

Look at the pages you changed (desktop and 390px wide), not just the tests. New behaviour gets a test.

`tests/unit/registry.test.ts` walks `MODULES` and the files: it fails, naming what is missing, when a live module lacks a level, an author, a page, the Colorfigures credit on its intro, a share image, recall items for every chapter (exactly one pinned) or an e2e spec, or when module ids, paths or share images collide. CI (`.github/workflows/checks.yml`) runs all three commands on every PR.

## Adding a module

1. Propose it first (issue: concept, level, story, chapter list, sources; see `CONTRIBUTING.md`).
2. `pnpm new-module <id> "<Title>"` copies `templates/module/` (registry entry, intro, chapter route, recap, one chapter, e2e spec) and refuses an id that exists. `templates/` sits outside `src/`, so Astro never builds it.
3. Write it by `docs/writing-a-module.md`; `pnpm test` (the registry test) lists what is still missing.
4. Reuse `src/lib/iso/` for pictures and label pills; keep the Colorfigures credit. Then `pnpm og`.

## Commits

Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), one logical change each. Work on a branch and open a PR to `main`.
