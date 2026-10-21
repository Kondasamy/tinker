---
title: AI Engineering Roadmap - Plan
type: feat
date: 2026-10-21
topic: ai-engineering-roadmap
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# AI Engineering Roadmap - Plan

## Goal Capsule

- **Objective:** Refill Tinker's empty roadmap with eight trending AI-engineering modules, added as planned cards in the registry so the home catalogue and the hero's building sites show them.
- **Product authority:** Requirements (R-IDs) in this Product Contract win on product behaviour. AGENTS.md decisions stay in force. Building any of the eight modules is not active scope: each gets its own plan when it goes live.
- **Open blockers:** None.
- **Means:** eight `planned()` lines in the registry; the home page, hero and checks already read planned cards from it (KTD1).
- **Stop conditions:** stop and ask if a planned card would need a page, a share image or chapters, or if the hero headline, both buttons and the "Free · No sign-up" line leave the first screen at 1280×800 or 390×844 and tuning `slotXY`/`plotAt`/`heroBoard` in `src/components/scenes/heroScene.ts` cannot bring them back (KTD5).
- **Execution profile:** Lightweight brownfield change, one branch and PR to `main`, conventional commits.

---

## Product Contract

### Summary

Eight planned modules join the end of `MODULES`, after the nine live ones. Each has an id, a title, a level and a one-line description, chosen so its edge against the live modules is sharp. The order of the list is the proposed build order.

### Problem Frame

Every planned module is live, so the roadmap is empty. The home page shows no building sites, and nothing tells a visitor or a contributor what comes next. Meanwhile the field has moved on. The 2026 conversation is about reasoning budgets, cheaper models, serving costs, traces from production, sandboxed agents, and models that see and speak, and none of the nine modules covers them.

### Key Decisions

- **Distillation and routing are one module.** Both answer "when is a small model good enough, and how do you get one?". Splitting them would teach the quality, cost and speed trade-off twice. Governs R1.
- **Compaction is left out.** AI agents ch. 5 ("Memory, and what survives it") and Context engineering ch. 5 ("Clearing the desk") already teach it. Governs R6.
- **Build order follows reuse.** Modules 1–6 can run on engines that exist: the language-model kit, the Evals graders and the agent loop. Multimodal and Voice need new kinds of asset (images, audio), so they go last. Governs R1.
- **Every module continues the Larkspur Supply Co. story** (AGENTS.md "One story per module"). Governs R3.

### Requirements

**The roadmap cards**

- R1. Eight `planned()` entries are appended to `MODULES` in this order, with these ids, titles, levels and descriptions:

  | # | id | Title | Level | Description (card line) |
  |---|---|---|---|---|
  | 1 | `structured-outputs` | Structured outputs | Intermediate | How a model is made to answer in valid JSON, every time: a schema masks the tokens it may pick. |
  | 2 | `reasoning` | Reasoning models & thinking budgets | Intermediate | Models that think before they answer: what a thinking budget buys, what it costs, and when more thinking hurts. |
  | 3 | `small-models` | Small models: distillation & routing | Advanced | Teach a small model from a big one, send it the easy questions, and fall back when it isn't sure. |
  | 4 | `inference` | Inference engineering | Advanced | What happens between the prompt and the reply on a server: batching, the KV cache, quantization and speculative decoding. |
  | 5 | `observability` | Observability & error analysis | Intermediate | Reading what the assistant really did in production: traces, labelling failures by hand, and finding the ones that matter. |
  | 6 | `sandboxing` | Agent sandboxing | Advanced | Where an agent's code runs, and what it can reach: a sandbox, its files, and the network it can or can't call out to. |
  | 7 | `multimodal` | Multimodal models | Intermediate | How images and documents become tokens, and how a model reads a photo, a scan or an invoice. |
  | 8 | `voice` | Voice agents | Advanced | Assistants you talk to: speech in and out, taking turns, being interrupted, and the latency budget. |

- R2. Each card's prerequisites, recorded for its go-live plan and shown once it is live:

  | Module | Prereqs |
  |---|---|
  | Structured outputs | Tool calling, Tokens |
  | Reasoning | Evals |
  | Small models | Fine-tuning, Evals |
  | Inference engineering | Transformers |
  | Observability | Evals |
  | Sandboxing | AI agents, Guardrails |
  | Multimodal | Tokens |
  | Voice | Tool calling, Multimodal |

**Each module's edge**

- R3. Each module's go-live plan must hold to this boundary against the live modules, and use Larkspur's story:
  - **Structured outputs** teaches constrained decoding and schema-shaped answers. Tool calling's argument checks are a host check *after* the model answers; this module is about masking *during* decoding. Expected to run live on Larkspur mini.
  - **Reasoning** teaches thinking tokens and budgets, and how accuracy, cost and latency trade off. Transformers ch. 5 covers sampling, not thinking. Expected to use recorded answers per budget, graded by the Evals graders.
  - **Small models** teaches distillation (a student trained on a teacher's answers) and routing with a confidence fallback. Fine-tuning covers style and LoRA, not teacher → student. Expected to reuse the fine-tuning pipeline on Larkspur mini and the Evals grid.
  - **Inference engineering** teaches serving: batching, the KV cache at serving scale, quantization, speculative decoding, and time to first token against throughput. Transformers ch. 6 counts one request's cost; this module is about many requests on one server. Expected to run live on Larkspur mini (quantized weights, a draft model), with server timings computed from counts, never measured.
  - **Observability** teaches production traces and error analysis: reading traces, labelling failures, grouping them into failure modes, and turning the worst into eval cases. Evals covers offline suites; this module starts from what real traffic did.
  - **Sandboxing** teaches isolation: files, network egress, secrets, and what a breakout looks like. Guardrails covers what the model is offered and what the host lets through; this module covers where the code runs.
  - **Multimodal** teaches image and document tokens, vision models reading a photo or a scan, and extraction from documents (Larkspur's invoices and part photos). Needs pre-rendered images and recorded readings.
  - **Voice** teaches speech in and out, chained pipelines against speech-to-speech models, end-of-turn detection, barge-in (the caller interrupting) and the latency budget (Larkspur's phone line). Needs recorded audio and timing; no live microphone.
- R4. No module may need a backend, a live LLM or an API key (AGENTS.md "What this is"). A go-live plan that finds otherwise stops and asks.

**The site**

- R5. The home catalogue shows the eight cards under their levels, and the hero gets a building site for each, with its "building sites" wording back in the label. The home share image is regenerated (`pnpm og`). Nothing else on a live module changes.
- R6. Compaction, harness engineering, agent-to-agent protocols and agentic commerce are not on the roadmap.

### Scope Boundaries

- Building any of the eight modules: chapters, engines, scenes and facts each come in their own go-live plan, as Agents and Evals did.
- New chapters in live modules (for example, observability as Evals chapters): rejected in favour of standalone cards.
- A public `ROADMAP.md`: the registry and the home catalogue are the roadmap.

### Success Criteria

- On the home page, at 1280px and 390px, the catalogue shows 9 live modules and 8 planned ones under the correct levels, and the hero shows eight building sites.
- `pnpm check`, `pnpm test` and `pnpm test:e2e` stay green. The registry test passes with the planned cards, and the hero test's planned path now runs against real entries.
- A reader can tell from the card line alone how each new module differs from the live module nearest to it.

### Outstanding Questions

**Deferred to Planning**

- Whether prerequisites go on the planned cards now (`planned()` takes none today) or wait for each go-live plan.
- Whether the hero board's layout still reads well with eight building sites at 390px, or needs a tweak.
- Each module's chapter list, story beats and `facts.json` sources: in its own go-live plan, which re-checks the trend claims against primary sources.

**Product Contract preservation:** Product Contract unchanged.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **Reuse the planned-card path as built.** `planned()` in `src/lib/modules.ts`, the `.roadmap` cards in `src/pages/index.astro`, the building sites in `src/components/scenes/heroScene.ts` and `heroLabel` already handle planned modules; this change adds data, not code.
- KTD2. **`planned()` keeps `prereqs: []`.** Roadmap cards never show prerequisites, so R2's table lives in this plan for each go-live plan to set; `pnpm new-module` replaces the card with a live entry that declares them. Resolves the deferred prereqs question.
- KTD3. **Planned cards sit after the nine live entries, in R1's order.** `scripts/new-module.mjs` appends a new live module at the end and removes its planned line, so live numbering (AGENTS.md "Modules") is unaffected. Within each level the catalogue shows live cards first, then planned ones in R1's order (`atLevel` keeps registry order); no "next up" marker.
- KTD4. **Planned pills join the hero's hop wave.** Today `heroScene` draws planned pills outside `hop()`, so eight would stay on screen and overlap. Wrapping them in `hop()` after the live plots, and setting `.hero-pic`'s `--n` to all plots, keeps the board resting unlabelled with one pill at a time. Reduced motion and the share image show every pill, as they do for live plots now. Building sites themselves stay still, with no hop.
- KTD5. **The first screen bounds the board.** Fifteen slots grow `heroBoard` from 340×336 to about 340×504. If that pushes the hero text out of the first screen, tune `slotXY`/`plotAt` (for example tighter row steps); never drop a module's plot.

### Assumptions

- `plotAt(0..14)` stays inside `heroBoard(15)` without overlap (hand-checked in review; U2 turns it into a test).
- When every pill shows at once (reduced motion, share image), long planned pills such as "SOON: STRUCTURED OUTPUTS" may touch their neighbours; accepted if they stay legible, otherwise shorten the pill to the id alone in U2.
- Planned ids (`structured-outputs`, `reasoning`, `small-models`, `inference`, `observability`, `sandboxing`, `multimodal`, `voice`) collide with no page route under `src/pages/`.

---

## Implementation Units

- U1. **Add the eight planned cards to the registry**
  - **Goal:** R1 holds in `MODULES`.
  - **Requirements:** R1, R6; KTD1, KTD2, KTD3.
  - **Files:** `src/lib/modules.ts`, `tests/unit/modules.test.ts`.
  - **Approach:** append eight `planned(id, title, level, description)` calls after `FINE_TUNING_MODULE`, copying R1's table verbatim. Drop "though the roadmap is empty" from the `planned()` doc comment.
  - **Test scenarios:** replace the "no planned modules left" case with one asserting the planned ids equal R1's list in order, each at R1's level with no chapters and no prereqs. Live modules keep their existing ids and order (no "live first" assertion: `new-module` appends live modules after planned lines).
  - **Verification:** `pnpm test` (registry, modules, hero and new-module suites).

- U2. **Home catalogue and hero show the cards**
  - **Goal:** R5 on the home page, with the hero still resting unlabelled and inside the first screen.
  - **Requirements:** R5; KTD3, KTD4, KTD5.
  - **Dependencies:** U1.
  - **Files:** `src/components/scenes/heroScene.ts`, `src/pages/index.astro` (`--n` on `.hero-pic` only), `tests/unit/hero.test.ts`, `tests/e2e/catalogue.spec.ts`.
  - **Approach:** wrap planned pills in `hop()` with indices after the live plots, and set `--n` to live plus planned plots (KTD4). Tune `slotXY`/`plotAt` only if the first-screen check fails (KTD5). Update the catalogue spec from "roadmap is empty" to eight `.roadmap` cards; refresh the hero test's empty-roadmap comment.
  - **Test scenarios:**
    - Unit: the plot-overlap and on-board loop in `hero.test.ts` runs to the real slot count (`LIVE.length - 2 + PLANNED.length`, at least 12), not a fixed 12.
    - Unit: every `SOON: <ID>` pill sits inside a `.hero-hop` group, and the label still names the building sites (existing assertion, now on real entries).
    - E2E at 1280px and 390px: each R1 card appears once in `[data-level="<level>"] .roadmap[data-module="<id>"]`, planned cards in R1's order after the live ones; the figcaption reads "The empty plots are open" with a link to CONTRIBUTING.md; "Propose a module" stays.
    - E2E: at 1280×800 and 390×844, the headline, both hero buttons and the "Free · No sign-up" line are in the viewport without scrolling.
    - Existing: no planned card is a Tab stop; no sideways scroll at 390px.
  - **Verification:** `pnpm test`, `pnpm test:e2e`; look at `/` at 1280px and 390px, with and without reduced motion.

- U3. **Regenerate the home share image**
  - **Goal:** the home image shows the eight building sites.
  - **Requirements:** R5.
  - **Dependencies:** U1.
  - **Files:** `public/og/home.jpg`.
  - **Approach:** `pnpm og`; commit only the images that changed (expected: `home.jpg`). The home meta description also changes on its own: `HOME.sub` in `src/lib/pages.ts` adds ", more on the way" once a module is planned.
  - **Test expectation:** none (generated asset); the smoke e2e already checks every page has its own image and planned ids have none.

- U4. **Docs say the roadmap is no longer empty**
  - **Goal:** AGENTS.md and README.md match the registry.
  - **Requirements:** R1, R5.
  - **Files:** `AGENTS.md`, `README.md`.
  - **Approach:** in AGENTS.md, replace "The roadmap is empty: every planned module is live" with the eight planned cards and point to this plan; update the hero bullet's "roadmap is empty … no building site" wording. In README.md line ~335, say the roadmap has eight planned modules and invite proposals.
  - **Test expectation:** none (docs).

---

## Verification Contract

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm test`: all unit suites, including `tests/unit/modules.test.ts`, `registry.test.ts`, `hero.test.ts`.
- `pnpm test:e2e`: including `tests/e2e/catalogue.spec.ts` and `smoke.spec.ts` (planned ids return 404 for page and image).
- Visual: `/` at 1280px and 390px.

## Definition of Done

- U1–U4 landed; all three commands green; the home page shows 9 live modules and 8 roadmap cards under their levels, eight building sites in the hero with one pill at a time, and the hero text inside the first screen at 1280×800 and 390×844.
- No experimental or abandoned code left in the diff.
