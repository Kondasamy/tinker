---
title: Agent Engineering Roadmap Cards - Plan
type: feat
date: 2026-10-31
topic: agent-engineering-roadmap
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Agent Engineering Roadmap Cards - Plan

## Goal Capsule

- **Objective:** Eleven new AI roadmap cards join the registry, drawn from a 19-line "what an AI engineer should learn in late 2026" list, placed ahead of the five existing roadmap cards (KTD1, KTD2).
- **Product authority:** Requirements win on product behaviour; KTDs win on mechanism. AGENTS.md stays in force.
- **Open blockers:** None.
- **Execution profile:** brownfield, one branch, one PR (`feat:`). No module is built here; each card goes live later through `pnpm new-module` in its own plan.
- **Stop conditions:** a chosen card id collides with a live module id or folder under `src/content/` (stop, pick another id, note it in the PR).
- **Tail ownership:** `ce-work` owns the branch, the PR and the four local checks.

---

## Product Contract

### Summary

Add eleven `planned()` cards to `MODULES`, merging the 19 source topics into modules no live module already teaches. Topics a live module fully covers get no card (the rows marked Covered); where a live module teaches only the start, the card builds on it and names it as the prequel.

### Problem Frame

The home roadmap has five cards left (translation, open weights, AI energy, clocks, GPS). Readers use it to see what comes next, and new modules start from it. The source list names the agent-engineering topics practitioners now meet in production. Most overlap live modules (Agents, Context, Tool calling & MCP, Sandboxing, Guardrails, Evals, Observability, Inference, Mixture of experts, Computer use, Fine-tuning, Post-training, Queues). The roadmap should show the gaps, not repeat what is already playable. The eleven cards are an editorial pick from that list, not reader requests; they lead the build order because agent engineering is where readers' companies are now, and reader requests through `#request` can still jump the queue.

### Requirements

- **R1.** Eleven new planned cards exist, with the ids, titles, levels and descriptions in KTD3, in that order.
- **R2.** The new cards sit after the last live module and before `translation`; the five existing cards keep their order and stay last.
- **R3.** Card descriptions use plain words: no word from `FLAGGED` (`src/components/story/plain-words.ts`), and a test holds it for every planned card.
- **R4.** Every source topic is either served by a new card or recorded as covered by a named live module (topic map below), so nothing from the list silently drops.
- **R5.** Nothing else changes: live modules, their numbers, ids, pages and share images stay as they are.

### Topic map (source line → outcome)

| # | Source topic | Outcome |
|---|---|---|
| 1 | Agent harness design: loops, sub-agents, handoffs, one vs five | `multi-agent` (Agents already teaches the loop and sub-agents) |
| 2 | Context lifecycle: compaction, retention, provenance, forgetting | `agent-memory` (prequels: Context's "Clearing the desk" and "Memory outside the window", Agents' "Memory, and what survives it") |
| 3 | Memory integrity: provenance, poisoning, contradictions, rollback | `agent-memory` |
| 4 | Tool capability negotiation: deferred loading, schema evolution, fingerprints, signed manifests | `tools-in-production` |
| 5 | MCP in production: auth, versioning, spec migrations, third-party supply chain | `tools-in-production` (Tool calling's MCP chapter and Dependencies are the prequels) |
| 6 | Skills and procedural memory | `skills` |
| 7 | Adaptive compute: reasoning, retrieval, verifier or bigger model | `adaptive-compute`, about choosing per request (prequels: Reasoning's effort dial, RAG, Small models' "Send it the easy ones", Choosing models) |
| 8 | Multi-turn KV cache coherence | `cache-reuse` (prequels: Inference's "KV cache at scale", Context's "Order for the cache") |
| 9 | MoE serving: expert parallelism, locality-aware routing | Covered: Mixture of experts ("Send it elsewhere", "The busy room") with Parallel training |
| 10 | Agent-aware scheduling: admission, deadlines, cancellation, fairness | `agent-scheduling` (prequels: Queues, Rate limits' "Who gets turned away") |
| 11 | RL on verifiable rewards vs SFT vs a better harness | Covered: Fine-tuning ("Larkspur’s decision") and Post-training ("Grade, don’t judge") |
| 12 | Agent state consistency: checkpoints, sagas, compensation, exactly-once | `agent-undo`, about undoing earlier steps (prequels: Queues' "Ran twice", Payments' "Pressed Pay twice") |
| 13 | Multi-agent systems as distributed systems | `multi-agent` |
| 14 | Computer use: flakiness, retries, independent completion verification | Covered by Computer use; independent completion checks go to `agent-incidents` |
| 15 | Agent identity and sandboxing: scoped credentials, egress, per-action auth | Covered by Sandboxing; per-action authorization goes to `action-approvals` |
| 16 | Information-flow security: taint tracking | `action-approvals` (prequels: Guardrails' "The trifecta", Computer use's "Ask before you pay" and the page that gives orders, Agent commerce's "Who said it could buy?") |
| 17 | Cumulative-risk approvals: chained harm, consent fatigue, expiry | `action-approvals` (Sandboxing's "Fewer prompts" covers consent fatigue) |
| 18 | Causal evals: replay, ablations, fault injection, attribution | `causal-evals` |
| 19 | Production failure modes | `agent-incidents`, the capstone, agent-specific failures only (prequels: Observability, Agents' "The loop, and who says done", Coding agents' "Green by cheating") |

### Scope Boundaries

- Not building any module, scene, chapter, fact file or share image.
- Not adding chapters to live modules for the "covered" topics.
- Not changing the five existing roadmap cards.

#### Deferred to Follow-Up Work

- Build plans for the cards, in waves, as earlier roadmap plans did (`docs/plans/2026-10-30-0831-feat-last-roadmap-seven-modules-plan.md` is the shape).
- Possible add-on chapters for topics 9, 11, 14 and 15 if a reader request asks for more depth than the live module gives.

---

## Planning Contract

### Key Technical Decisions

- **KTD1. Merge to eleven cards.** One card per source line would duplicate live modules and split topics that teach best together (harness design and multi-agent as distributed systems). (session-settled: user-approved — chosen over one card per line and over cards plus chapter add-ons.)
- **KTD2. New cards first.** They are the next build order; the five existing cards stay last, which the existing "five cards stay planned last" test already expects. (session-settled: user-approved — chosen over placing them after the existing five.)
- **KTD3. The cards, in build order.** Order follows dependencies, not difficulty: stand-alone cards first, the capstone after the agent cards it draws on, and the two serving-side cards (`agent-scheduling`, `cache-reuse`) last because they speak least to PMs and analysts. `causal-evals` and `adaptive-compute` carry plain titles; their ids keep the field's names. Descriptions are one sentence, plain words, and final unless the plain-words test rejects a word.

  | id | Title | Level | Description |
  |---|---|---|---|
  | `skills` | Skills | Intermediate | Know-how packed as files the assistant opens only when a task needs it, instead of one long prompt. |
  | `action-approvals` | Approvals and permissions | Intermediate | Harmless steps that add up to harm, approvals that expire, and keeping text the agent read from approving what it does. |
  | `multi-agent` | Multi-agent systems | Advanced | When one agent beats five: handing work between agents, agreed message shapes, deadlocks and how far to trust a helper. |
  | `agent-memory` | Memory you can trust | Advanced | What an assistant should keep and forget, where each memory came from, and undoing a poisoned one. |
  | `tools-in-production` | Tools and MCP in production | Advanced | Loading tools only when needed, tools that change under you, signed tool lists, logins and risky third-party servers. |
  | `agent-undo` | Undo for agents | Advanced | When step four fails after three went through: save points, undoing the earlier steps, and side effects that happen once. |
  | `causal-evals` | Why did it fail? | Advanced | Replay a run with one thing changed, break parts on purpose, and find the step that really caused a failure. |
  | `adaptive-compute` | Where the effort goes | Advanced | Deciding per request whether the next effort goes to thinking longer, looking something up, checking, or a bigger model. |
  | `agent-incidents` | When agents fail | Advanced | Runaway helpers, cluttered memory, double refunds and agents that say done when they are not, and how to check. |
  | `agent-scheduling` | Scheduling agents | Advanced | Long agent jobs on shared machines: who gets in, passing deadlines down, cancelling cleanly and taking fair turns. |
  | `cache-reuse` | Reusing the model’s notes | Advanced | Keeping a conversation’s saved work between turns and machines, and when the reused copy is quietly wrong. |

- **KTD4. Ids are chosen to last.** A card id becomes the module's URL and progress key at go-live, and only then does AGENTS.md's no-rename rule bind; before that a build plan may still rename a weak id for free. All eleven are absent from `src/content/` today.
- **KTD5. Extend the plain-words test to planned cards** rather than adding a new test file. It already checks live module descriptions, and the home roadmap card is a reader-facing surface. A planned card has no chapters, so a flagged word always fails it.

---

## Implementation Units

### U1. Add the eleven cards to the registry

**Goal:** The cards render on home as roadmap cards, in KTD3 order, before `translation`.
**Requirements:** R1, R2, R4, R5; KTD1–KTD4.
**Dependencies:** none.
**Files:** `src/lib/modules.ts`, `tests/unit/modules.test.ts`, `tests/e2e/catalogue.spec.ts`.
**Approach:**
1. Add eleven `planned(id, title, level, description)` calls after `ROBOTS_MODULE` and before `planned('translation', …)`, with no track argument (AI) and no comment line: `pnpm new-module` inserts a go-live right before the first `planned(` line, so a comment there would separate it from the live modules.
2. In the test's `ROADMAP` list, add the eleven entries before `translation` under a comment naming this plan, matching the comments on earlier batches.

**Patterns to follow:** the existing `planned(...)` calls and the dated comments in `ROADMAP`.
**Test scenarios:**
- The registry test passes with the planned list in `ROADMAP` order, each at its KTD3 level with no track, no chapters and no prereqs.
- `planned.slice(-5)` is still translation, open weights, AI energy, clocks, GPS.
- The catalogue e2e shows sixteen roadmap cards and the finder count's planned part reads "16 planned" with the live part unchanged.
- Filtering the finder by Advanced lists the new Advanced cards after the live Advanced ones, in registry order.
- `tests/e2e/catalogue.spec.ts` computes counts and orders from the registry, but its own `ROADMAP` id list needs the eleven ids before `translation`.

**Verification:** home at desktop and 390px shows the new cards in the AI section with the "Planned" tag; no live module number changed.

### U2. Hold planned-card descriptions to plain words

**Goal:** A planned card can't ship jargon on the home page.
**Requirements:** R3; KTD5.
**Dependencies:** U1.
**Files:** `tests/unit/plain-words.test.ts`.
**Approach:** add one case that runs `flaggedIn` over every planned module's description and expects none.
**Test scenarios:**
- Every current planned card passes, the five existing ones included.
- A description containing "latency" or "KV" (checked once by hand during implementation) is reported with the card id.

**Verification:** `pnpm test` is green. If a KTD3 description trips the check, swap the word for its `FLAGGED` plain form and record the change in the PR.

---

## Verification Contract

- `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` all pass locally (no CI).
- Home looked at on desktop and at 390px wide.
- `pnpm og` not needed: home's share image text says "more on the way", not a count, and planned cards have no pages.

## Definition of Done

- Eleven cards appear on the home roadmap in KTD3 order, ahead of the existing five.
- The topic map above is in the PR description, so the merge and coverage choices are reviewable.
- All four checks pass and the PR is open against `main`.

## Sources

- The 19-line source list, supplied by the user in the planning request (2026-10-31).
- Live module chapter lists read from `src/content/*/module.ts` for the coverage calls in the topic map.
