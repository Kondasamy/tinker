---
title: Fuller Roadmap and AI Agents Module - Plan
type: feat
date: 2026-10-20
topic: roadmap-and-agents-module
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Fuller Roadmap and AI Agents Module - Plan

## Goal Capsule

- **Objective:** Add four new planned modules to Tinker's roadmap. Then take **AI agents** live as module 3 (Advanced, after Tool calling), continuing the Larkspur Supply Co. story.
- **Product authority:** Product Contract requirements (R-IDs) win on product behaviour. Key Technical Decisions (KTD-IDs) win on mechanism. AGENTS.md decisions stay in force unless a KTD here changes one on purpose; U12 writes every such change back into AGENTS.md.
- **Open blockers:** None.
- **Execution profile:** Brownfield work on the Astro 7 + React islands site. Three phases (see Phased Delivery). Each phase leaves `pnpm check`, `pnpm test` and `pnpm test:e2e` green.
- **Stop conditions:**
  - Stop and ask if a chapter needs a backend, a live model or an API key (R4).
  - Stop and ask if changing the shared tool engine (KTD2) would change any Tool calling chapter's output, recordings or saved runs.
  - Stop and ask if a source in U3's fact check contradicts a chapter's lesson, not just a wording or a date.
- **Tail ownership:** Work on a branch and open a PR to `main`, with conventional commits, one logical change each (AGENTS.md "Commits").

---

## Product Contract

### Summary

The home catalogue gains four planned modules: Evals & LLM testing, Prompt injection & guardrails, Context engineering & memory (all Intermediate) and Fine-tuning vs prompting (Advanced). Then AI agents goes from a roadmap card to a live, seven-chapter module. Larkspur's assistant stops answering one request at a time and starts handling whole support cases: it plans, acts, notices surprises, re-plans, keeps to a budget, manages a growing memory, hands work to sub-agents and decides when it is done. It is built on the tool calling engine and back-office scene the reader already knows.

### Problem Frame

The roadmap has three planned cards, and two of them (Tokens, Transformers) explain model internals. The topics a team adopting AI meets next are missing: how to test the assistant, how it gets attacked, what to put in its context, and when to fine-tune. A visitor sees a short roadmap and no clear path past tool calling.

AI agents is the natural next module. Tool calling ends with a host that runs a fixed request through a call cap and an approval gate. It never shows the model choosing its own path toward an open goal, or what that costs. Chapter 4 ("Many steps") and chapter 6 ("When tools go wrong") already teach multi-step calls, call caps, approval gates and a planted note. The agents module must build on these, not teach them again.

### Requirements

**Roadmap**

- R1. Four planned registry entries, each with an id, title, level and one-line description: `evals` (Evals & LLM testing, Intermediate), `guardrails` (Prompt injection & guardrails, Intermediate), `context` (Context engineering & memory, Intermediate), `fine-tuning` (Fine-tuning vs prompting, Advanced).
- R2. The home workshop hero gives every module a plot: live modules a live plot, planned ones a building site. Plot names come from the registry, so adding a module needs no hand-placed art.

**AI agents module**

- R3. `agents` becomes live: Advanced, prereq `tool-calling`, author Kondasamy Jayaraman, the Larkspur story, seven chapters, a recall bank, an intro, a recap, share images and an e2e spec. It passes every check in `tests/unit/registry.test.ts`.
- R4. Nothing runs a live model. Every model turn a chapter control can reach is recorded, and a unit test proves it (AGENTS.md "Tool calling engine").
- R5. Each chapter teaches one idea that Tool calling did not, in this order:
  1. Workflow or agent: code picks the path vs. the model picks the path, and when each fits.
  2. The loop and stopping: goal → act → observe → decide; who says "done".
  3. Plans: a written plan, re-planning on a surprise, and a person approving the plan instead of every call.
  4. Budgets and stuck loops: a step budget, a token meter, and catching an agent that repeats itself.
  5. Memory: the context grows each step; summarising it, and pinning what must not be lost.
  6. Sub-agents: handing a part of the case to a helper with its own clean context, and what that costs.
  7. Workbench: every control from chapters 1–6 on one case.
- R6. Prompt injection gets one step (chapter 3: a planted line in a customer email tries to change the plan, and plan approval catches it). That step links to the Guardrails roadmap card. The full topic stays in that module.
- R7. Every chapter follows the house loop and rules: an intro with context, predict → reveal, quizzes with a `why` per option and "I'm not sure", and terms defined on first use (`docs/writing-a-module.md`).
- R8. Every claim about agents in the copy (definitions, the ReAct pattern, the advice on when to use an agent) comes from `data/agents/facts.json`, with a source and an access date.
- R9. Tool calling, RAG and their saved progress do not change. No chapter, recording, step id or share image of theirs changes, apart from the home hero and home share image (R2).

### Scope Boundaries

- Tokens & embeddings and Transformer architecture stay planned.
- The four new modules are roadmap cards only. Each gets its own plan.
- No live model, no multi-agent frameworks, no real carrier or email APIs.
- Multi-agent orchestration beyond one lead and its helpers (debate, swarms, agent-to-agent protocols) is out.

### Deferred to Follow-Up Work

- Plans for Evals, Guardrails, Context engineering and Fine-tuning.
- A cross-module "learning path" view on the home page; the prereqs already show on each intro.

### Success Criteria

- A reader who has finished Tool calling can say in one sentence what makes a run an agent, and name two ways to stop one that will not stop.
- `pnpm test` fails when any reachable agent turn lacks a recording.
- On the home page, the catalogue shows 3 live modules and 6 planned ones under the correct levels, at 1280px and at 390px.

### Key Decisions

- Continue the Larkspur story and its back office instead of starting a new world. (Assumed default for an open call-out: it reuses the scene and engine and keeps one world across modules 1–3.) Governs R3, R5.
- Sub-agents get one chapter (6), not a module of their own. (Assumed default for an open call-out.) Governs R5.
- Injection gets one step, which links to Guardrails. (Assumed default for an open call-out: it keeps the two modules from overlapping.) Governs R6.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **The agent engine is its own folder, `src/lib/agents/`, and reuses `src/lib/tools/` rather than forking it.** The agent loop needs state the tool calling host never had: a plan, a full history, a memory mode, sub-agent runs and a budget. It reuses `schema.ts` (validation), `server.ts` (the MCP-shaped servers) and `turns.ts`'s lookup pattern. It leaves `host.ts` as it is. Extending `host.ts` would put the new fields into Tool calling's signatures and invalidate its recordings (R9).
- KTD2. **`server.ts` takes a server bundle.** Today `createServer` reads `data/tool-calling/server.json` directly, and each tool's behaviour is a hard-coded handler inside it. Add an optional bundle, defaulting to Tool calling's: the servers, the tools, a handler per tool and the fixture data. `ServerId` widens to cover the agent servers. `host.ts` and `describe()` keep reading the default bundle. The agent handlers and their fixtures (stock, shipments, a sent-mail ledger) live in `src/lib/agents/`. Agents passes `data/agents/server.json`, with the order server plus `warehouse` (`check_stock`, `create_replacement`), `carrier` (`track_shipment`, with a timeout fault) and `mail` (`send_email`). Tool calling's chapter 5 lists `SERVERS`, so its server list must not grow. The change has no effect on Tool calling, and the existing `server.test.ts` and `host.test.ts` prove that.
- KTD3. **The agent signature encodes everything the model could see. Host-only settings stay out.** In the signature: the scenario's tools, the plan mode (`plan=off|on|approved|rejected`), the memory mode (`mem=full|summary|pinned`), and the visible history, meaning every result outcome so far, or the summary's marker once compaction ran. Out of the signature: the step budget, the repeat detector, the approval mode and the token limit. These are host decisions, and they change where the run stops, not what the model says. The rule matches AGENTS.md ("Host-only decisions stay out of the signature"). A run ends in one of five statuses: `done`, `stuck`, `out-of-budget`, `waiting` (a plan still waiting for approval) or `norecord`.
- KTD4. **Recordings live in `data/agents/turns/<scenario>.json`, one reviewed file per scenario.** Each chapter control exports a finite domain, like `DOMAINS` in `host.ts`. `tests/unit/agent-coverage.test.ts` runs every combination and asserts that no step reaches `norecord`. A scenario's domain is kept small, so the files stay reviewable by hand.
- KTD5. **Token counts are computed, never recorded.** The budget meter sums each turn's input and output bytes ÷ `BYTES_PER_TOKEN` from `src/lib/scale.ts`, the same rule RAG chapter 2 uses and sources. A turn's input is the full context the model sees that turn (system text, tools, history or summary, pins), re-sent every turn; its output is the turn's text and calls. It shows tokens, not dollars, so no new price fact is needed.
- KTD6. **Repeat detection is a host rule:** the same call with the same arguments and the same outcome N times in a row (default 3, a chapter 4 knob). It is computed, so the reader can see it fire or miss. The setting stays out of the signature, but its firing does not. When it fires, the host returns a "stopped: repeated failure" result for that call (`track_shipment:<order>:stopped` in the history). The model then gets one last recorded turn to tell the customer, and the run ends `stuck`. The step budget, by contrast, ends the run with no further turn.
- KTD11. **Plan approval binds the run.** A call outside the approved plan, or any re-plan, goes back to Approval. Approval decisions in a domain are a sequence, one per plan: `[approve]`, `[reject, approve]`, `[reject, reject]`. After a second rejection the model's recorded last turn hands the case to a person.
- KTD12. **The context window in chapter 5 is a host setting.** It is a budget the Larkspur host sets for the agent, not a fact about any model, and the copy says so. The storm case with full memory passes it. The gauge in `agentScene` draws it; `ContextOverflow` is not reused.
- KTD7. **A sub-agent run is a nested `run` with its own recording, its own history and its own budget.** The lead receives only the helper's final text as a tool result (`delegate` tool). This makes "clean context" visible: the helper's history never enters the lead's signature. `delegate` is a host-defined tool in `src/lib/agents/loop.ts` with its own input schema, validated by `schema.ts`. It is appended to the listed tools and handled by the loop as a nested run, never sent to a server.
- KTD8. **The agents scene composes `officeScene`; it does not fork it.** `src/components/scenes/agentScene.ts` draws the back office through `officeScene`'s options and adds four props beside it: a clipboard on the model's desk (the plan, ticks per item), a step and token gauge on the host desk, an in-tray of papers that grows each step and becomes one binder after compaction, and a smaller helper desk for sub-agents. Words go in the caption under the drawing, never on faces (AGENTS.md "Pictures"). A Picture / Steps tab switch shows the precise trajectory as a flat lane figure (`src/lib/iso/flat.ts`), driven by the same run.
- KTD9. **Scaffold with `pnpm new-module agents "AI agents"`.** The script already replaces a planned card of the same id (`scripts/new-module.mjs`), so the registry, routes, recap and e2e spec start from the template.
- KTD10. **The hero board grows from the registry.** `heroScene` takes a list of live plots instead of the `[string, string]` tuple. The building-site column becomes a grid that fits at least nine plots (today: 3 live + 6 planned). The agents plot is a small desk with the clipboard prop from KTD8. `HERO_BOARD`'s size may change. The home share image regenerates (R9's one exception).

### High-Level Technical Design

The agent run, as a state machine. Grey states are host-only and never reach the signature (KTD3).

```mermaid
stateDiagram-v2
  [*] --> Plan: plan mode on
  [*] --> Think: plan mode off
  Plan --> Approval: approval mode = plan
  Approval --> Waiting: no decision yet
  Waiting --> [*]
  Approval --> Think: approved
  Approval --> Plan: rejected (model sees rejection and re-plans)
  Act --> Approval: call outside the approved plan
  Plan --> Think
  Think --> Act: turn has calls
  Think --> Done: turn has no calls (model says done)
  Act --> Observe: validate, gate, run tool (or delegate → nested run)
  Observe --> Compact: memory mode summary/pinned and history over threshold
  Compact --> Think
  Observe --> Think
  Observe --> Stuck: repeat detector fires (host)
  Think --> OutOfBudget: steps or tokens exhausted (host)
  Think --> NoRecord: signature missing
  Done --> [*]
  Stuck --> LastTurn: model sees "stopped" result
  LastTurn --> [*]
  OutOfBudget --> [*]
  NoRecord --> [*]
```

What is reused and what is new:

```mermaid
flowchart LR
  subgraph tools[src/lib/tools — unchanged behaviour]
    schema[schema.ts]
    server[server.ts + definitions as data]
    turns[turns.ts lookup]
  end
  subgraph agents[src/lib/agents — new]
    loop[loop.ts: run, budget, repeat, compaction, delegate]
    sig[signature + domains]
  end
  data[(data/agents/: server.json, turns/*.json, facts.json, cases)]
  scene[agentScene.ts → officeScene.ts]
  kit[src/content/agents/kit.tsx: AgentStage, tabs]
  loop --> schema & server & turns
  loop --> sig
  data --> loop
  loop --> kit --> scene
```

Chapters, their scenario and the control each one adds:

| Chapter id | Case | Control (finite domain) | New idea |
|---|---|---|---|
| `01-workflow-or-agent` | Plain refund; damaged delivery, replacement in stock / out of stock | Run as: script / agent | On the routine case the script gets the same result for fewer tokens; on the case it did not foresee it breaks and the agent adapts |
| `02-the-loop` | Damaged delivery | Step through, predict the stop | The loop, and "done" as a model decision |
| `03-plans` | Damaged delivery, stock surprise, planted email line | Plan: off / on; approval: none / plan | Plans, re-plans, approving a plan; one injection step (R6) |
| `04-budgets` | Carrier lookup times out | Step budget; repeat detector on / off | Stuck loops, token meter, budgets |
| `05-memory` | Storm damage across five orders | Memory: full / summary / pinned | Context growth, compaction, pinning |
| `06-sub-agents` | Storm damage across five orders | Lead alone / lead + helpers | Clean context per helper, the cost of handoff |
| `07-workbench` | Any recorded case | That case's chapter controls | Free play, like Tool calling's chapter 7 |

### Assumptions

- The three scoping call-outs went unanswered when the scope was confirmed. The defaults in Key Decisions apply. Any of them can be changed before U5 without rework to U1–U4.
- External research did not run in this planning pass. The planned sources for `facts.json` are: Yao et al., "ReAct" (arXiv 2210.03629); Anthropic, "Building effective agents" (workflows vs. agents, when to use an agent); Anthropic, "How we built our multi-agent research system" (sub-agents, token cost); Anthropic, "Effective context engineering for AI agents" (compaction). U3 checks each claim against its source and records the access date.
- The storm case's orders come from `data/agents/cases.json`: five delivered orders with no planted notes, passed to the order server through its `orders` option. The existing fixture has undelivered orders and chapter 6's planted note. `data/tool-calling/orders.json` does not change.

### Phased Delivery

| Phase | Units | Ships |
|---|---|---|
| A. Roadmap | U1, U2 | Four new cards, a hero that scales |
| B. Engine and frame | U3, U4, U5 | Agent engine with coverage test, scene and kit, a scaffolded live module with chapter 1 |
| C. Chapters and polish | U6–U12 | Chapters 2–7, recall bank, intro, share images, docs |

### Risks

- **Recording count grows fast** (history × plan × memory). Mitigation: KTD4's small domains, one scenario per chapter, and a coverage test that names the missing signature. If a scenario passes ~40 turns, split its domain or drop a combination from the controls.
- **The scene gets crowded**: four props on top of the back office. Mitigation: each prop shows only when its chapter turns it on (like `officeScene`'s `gate`/`owner` flags). On phones the props keep their shapes, the caption repeats their readouts (step N of M, tokens, plan ticks), and helper desks collapse to one with a count pill. A check at 390px is part of U4.
- **Overlap with Tool calling chapters 4 and 6.** Mitigation: R5's table names the one new idea per chapter, and doc review checks each chapter's `learn` list against Tool calling's.

---

## Implementation Units

| U-ID | Title | Key files | Depends on |
|---|---|---|---|
| U1 | Four roadmap cards | `src/lib/modules.ts` | — |
| U2 | Hero that scales | `src/components/scenes/heroScene.ts` | U1 |
| U3 | Agent engine and facts | `src/lib/agents/`, `data/agents/` | — |
| U4 | Agent scene and kit | `src/components/scenes/agentScene.ts`, `src/content/agents/kit.tsx` | U3 |
| U5 | Scaffold + ch. 1 | `src/content/agents/`, `src/pages/agents/` | U2, U3, U4 |
| U6 | Ch. 2 The loop | `src/content/agents/02-the-loop.tsx` | U5 |
| U7 | Ch. 3 Plans | `src/content/agents/03-plans.tsx` | U5 |
| U8 | Ch. 4 Budgets | `src/content/agents/04-budgets.tsx` | U5 |
| U9 | Ch. 5 Memory | `src/content/agents/05-memory.tsx` | U5 |
| U10 | Ch. 6 Sub-agents | `src/content/agents/06-sub-agents.tsx` | U5 |
| U11 | Ch. 7 Workbench | `src/content/agents/07-workbench.tsx` | U6–U10 |
| U12 | Intro, recall, share images, docs | `src/pages/agents/index.astro`, `src/dev/og.astro`, `AGENTS.md` | U11, U2 |

### U1. Four roadmap cards

- **Goal:** The catalogue lists the four new planned modules under their levels.
- **Requirements:** R1.
- **Dependencies:** None.
- **Files:** `src/lib/modules.ts`, `src/pages/index.astro`, `tests/e2e/catalogue.spec.ts`, `tests/unit/modules.test.ts`.
- **Approach:** Add four `planned(...)` lines after `agents`. The descriptions are one plain sentence each, in the voice of the current three. Give each roadmap card `id="module-<id>"`, so chapter 3 can link to one.
- **Patterns to follow:** The existing `planned('tokens', ...)` entries.
- **Test scenarios:**
  - The home page shows `Evals & LLM testing`, `Prompt injection & guardrails` and `Context engineering & memory` under Intermediate, and `Fine-tuning vs prompting` under Advanced.
  - None of the new cards has a link, and Tab skips them.
  - The Guardrails card carries `id="module-guardrails"`.
  - `registry.test.ts` still passes: planned modules need no pages or images.
- **Verification:** The catalogue at 1280px and 390px shows the new cards; all checks pass.

### U2. Hero that scales

- **Goal:** The workshop hero draws a plot for every module from the registry, live or planned.
- **Requirements:** R2, R9.
- **Dependencies:** U1.
- **Files:** `src/components/scenes/heroScene.ts`, `src/pages/index.astro`, `src/dev/og.astro`, `tests/unit/hero.test.ts` (new), `public/og/home.jpg`.
- **Approach:**
  1. Replace the `live` tuple with a list of live plots, each with a name and a drawing (KTD10).
  2. Lay out the building sites on a grid that fits at least nine plots, so that nothing tall stands in front of a plot.
  3. Agents stays a building site here. U5 adds its live plot (the desk and clipboard from U4), the three-live `HOME_HERO_LABEL` and the home share-image layout for three live modules.
  4. Run `pnpm og` for `home` only, with the two live modules that exist at this point.
- **Patterns to follow:** The current `heroScene`; `even` pill rows and `scale` from AGENTS.md "Pictures".
- **Test scenarios:**
  - With 2 live and 7 planned modules, the scene has one name pill per module, and every pill text comes from `MODULES`.
  - No two plot mats overlap (compare their board rectangles).
  - With 3 live and 6 planned, the same holds, and the agents plot is drawn as live.
  - The hero label names every live and planned module.
- **Verification:** The home page at 1280px and 390px shows every plot with readable pills; the home share image regenerates and no other share image changes.

### U3. Agent engine and facts

- **Goal:** A deterministic agent loop over recorded turns, with the budget, repeat, compaction and delegate rules computed in the browser.
- **Requirements:** R4, R8, R9; KTD1–KTD7.
- **Dependencies:** None.
- **Files:** `src/lib/tools/server.ts` (definitions as data), `src/lib/agents/loop.ts`, `src/lib/agents/turns.ts`, `src/lib/agents/facts.ts`, `data/agents/server.json`, `data/agents/facts.json`, `data/agents/turns/*.json`, `tests/unit/agent-loop.test.ts`, `tests/unit/agent-coverage.test.ts`, `tests/unit/server.test.ts`.
- **Approach:**
  1. Let `createServer` take a definition bundle, defaulting to Tool calling's (KTD2).
  2. Define the agent servers and tools in `data/agents/server.json`. `track_shipment` returns a timeout error for the order marked to time out. `create_replacement` fails for an item `check_stock` reports as out.
  3. Write `run(recording, setup)` in `loop.ts`, following the state diagram above, with the signature from KTD3 and the domains from KTD4.
  4. Record the turns, one JSON file per scenario, written by hand and reviewed like Tool calling's.
  5. Write `facts.json`: check each planned source (Assumptions), record `accessed`, and export them through `facts.ts` as `src/lib/tools/facts.ts` does.
- **Execution note:** Write the coverage test first, so each recording file grows until it passes.
- **Patterns to follow:** `src/lib/tools/host.ts` (`run`, `DOMAINS`, `combos`, step kinds), `src/lib/tools/turns.ts`, `tests/unit/host.test.ts`, `tests/unit/scenarios.test.ts`.
- **Test scenarios:**
  - Damaged delivery, replacement in stock, plan off: get_order → check_stock → create_replacement → send_email → answer; status `done`.
  - Same case, stock out: the agent switches to issue_refund. The run never calls create_replacement after the stock result.
  - Plan on, approval mode `plan`, decisions `[reject, approve]`: the model sees the rejection and writes a new plan. The second plan differs from the first.
  - Decisions `[reject, reject]`: the run ends `done` with the recorded hand-to-a-person answer, and no tool call runs.
  - A call outside the approved plan returns to Approval before it runs.
  - Carrier timeout, detector on: after the `stopped` result, the model's last turn sends the "lookup failed" email, and the run ends `stuck`.
  - Carrier timeout, repeat detector off, step budget 12: status `out-of-budget`, with track_shipment called repeatedly.
  - Carrier timeout, repeat detector on (N=3): status `stuck` after the third identical failed call. The steps show where the detector fired.
  - Token meter: each turn's count equals the turn's bytes ÷ `BYTES_PER_TOKEN`, and the total is their sum.
  - Memory `summary` with five orders: compaction runs once over the threshold, and later signatures carry the summary marker, not the dropped results.
  - Memory `summary` drops the customer's "no phone calls" request, and the final email breaks it. Memory `pinned` keeps it, and the email honours it.
  - Delegate: each helper's history appears in no lead signature. The lead's next signature contains only `delegate:<order>:ok`.
  - Coverage: every combination of every scenario's domain ends without `norecord`.
  - Server: Tool calling's `SERVERS` and its `tools/list` output are unchanged (existing tests stay green, untouched).
  - Facts: every fact has a claim, a source URL and an accessed date. Every fact id referenced in `src/content/agents/` exists.
- **Verification:** `pnpm test` passes. A deliberately deleted turn makes the coverage test fail, naming the signature.

### U4. Agent scene and kit

- **Goal:** The back office with the agent's props, and a stage that switches between Picture and Steps.
- **Requirements:** R5, R7; KTD8.
- **Dependencies:** U3.
- **Files:** `src/components/scenes/agentScene.ts`, `src/components/scenes/agentSequence.ts`, `src/content/agents/kit.tsx`, `src/content/agents/agents.css`, `src/dev/agents.astro` (dev-only), `tests/unit/agent-scene.test.ts`.
- **Approach:**
  1. Compose `officeScene` and add the clipboard, gauge, in-tray/binder and helper desk. Each one is a flag turned on per chapter.
  2. Draw the Steps tab as flat lanes (model, host, tools, helpers), built from `run().steps`.
  3. `AgentStage` in `kit.tsx` mirrors `ToolStage`. It writes the caption from the current step, escapes every string (AGENTS.md "Untrusted strings"), and keeps the tab as view state outside saved progress.
  4. The dev page shows every prop state for visual checks; it uses scoped styles only.
- **Patterns to follow:** `src/components/scenes/officeScene.ts`, `src/components/scenes/toolSequence.ts`, `src/content/tool-calling/kit.tsx`, `tests/unit/office.test.ts`.
- **Test scenarios:**
  - The clipboard shows one tick per finished plan item and none before the first.
  - After compaction the in-tray draws one binder, not N papers.
  - The gauge's fill matches tokens used ÷ budget, with a 0 budget drawn empty rather than divided by zero.
  - The helper desk appears only when the run has delegate steps.
  - A note text containing `<script>` renders escaped in the SVG string.
  - The Steps lanes have one mark per run step, in order.
- **Verification:** The dev page renders every state at 1280px and 390px without overlap, and labels sit in pills.

### U5. Scaffold the module and chapter 1

- **Goal:** `agents` is live with its frame and its first chapter, "Workflow or agent?".
- **Requirements:** R3, R5.1, R7, R9; KTD9.
- **Dependencies:** U2, U3, U4.
- **Files:** `src/lib/modules.ts`, `src/content/agents/module.ts`, `src/content/agents/01-workflow-or-agent.tsx`, `src/content/agents/recall.ts`, `src/pages/agents/index.astro`, `src/pages/agents/[chapter].astro`, `src/pages/agents/recap.astro`, `tests/e2e/agents.spec.ts`, `tests/e2e/agents-flow.ts`, `src/components/scenes/heroScene.ts` (agents' live plot, three-live label), `src/pages/index.astro` (`CARD.agents`), `src/dev/og.astro` (home layout for three live modules).
- **Approach:**
  1. Run `pnpm new-module agents "AI agents"`. Set the level to Advanced, the prereq to `tool-calling`, and write the story sentence.
  2. Chapter 1: the support lead hands over the damaged-delivery case. The reader first runs a plain refund both ways: same result, and the script uses fewer tokens. Then the damaged-delivery case, with stock available and with stock out. Before each reveal they predict which run does better, so the lesson goes both ways.
  3. Chapter 1's intro opens from Tool calling's ending, defines *agent*, *workflow* and *goal*, and cites `facts.json` for the workflow/agent distinction.
  4. Recall: three to five items for chapter 1, one of them pinned for the module.
  5. Add a `CARD.agents` entry in `src/pages/index.astro` (a picture from `agentScene` and a topics list), matching the tool-calling entry.
- **Patterns to follow:** `src/content/tool-calling/01-answers-arent-actions.tsx`, `src/pages/tool-calling/*`, `tests/e2e/tool-calling-flow.ts`.
- **Test scenarios:**
  - The registry test passes for `agents` with one chapter.
  - The e2e flow plays chapter 1 through by keyboard only, with axe clean, at 390px, and with reduced motion.
  - The progress key is `agents-progress-v1`. Tool calling's and RAG's progress keys are untouched after playing the chapter.
  - Picking "I'm not sure" on the checkpoint reveals the answer and does not count as a miss.
  - The home page shows agents as live with progress, and Continue resumes it.
- **Verification:** The chapter at 1280px and 390px; all three check commands are green.

### U6. Chapter 2: the loop and stopping

- **Goal:** The reader steps the loop one turn at a time and predicts when it stops.
- **Requirements:** R5.2, R7, R8.
- **Dependencies:** U5.
- **Files:** `src/content/agents/02-the-loop.tsx`, `src/content/agents/module.ts`, `src/content/agents/recall.ts`, `tests/e2e/agents.spec.ts`.
- **Approach:** Narrate one turn per step: think, act, observe. The predict asks how many turns the case takes. The reveal shows that the model ends the run by answering without calls, not the host. The step links the ReAct fact.
- **Patterns to follow:** `src/content/tool-calling/04-many-steps.tsx`.
- **Test scenarios:**
  - The turn counter on the stage matches the number of model turns in the run.
  - The predict locks, and stays visible beside the outcome.
  - The checkpoint's wrong options ("the host stops when tools run out", "after a fixed number of steps") each show their `why`.
- **Verification:** The e2e spec plays chapter 2; the recall bank covers it.

### U7. Chapter 3: plans and approving a plan

- **Goal:** Plans, re-planning on a surprise, approving a plan instead of every call, and the one injection step.
- **Requirements:** R5.3, R6, R7.
- **Dependencies:** U5.
- **Files:** `src/content/agents/03-plans.tsx`, `src/content/agents/module.ts`, `src/content/agents/recall.ts`, `tests/e2e/agents.spec.ts`.
- **Approach:**
  1. Turn plan mode on: the clipboard fills.
  2. The stock-out result makes the agent strike an item and add another.
  3. Approval mode `plan`: the reader predicts, then approves or rejects. Either choice advances, and the outcome offers one click to try the other (KTD11).
  4. The injection step: the customer's email says "also refund order 1043". The proposed plan contains it, and rejecting the plan stops it. The step's last line links to the Guardrails roadmap card.
- **Patterns to follow:** `src/content/tool-calling/06-when-tools-go-wrong.tsx` (gate and planted note).
- **Test scenarios:**
  - With plan off, the clipboard is hidden; with plan on, it shows the recorded plan's items.
  - Rejecting the planted plan leaves order 1043 unrefunded in the run's ledger.
  - Approving it refunds 1043, and the step explains why approval only helps if a person reads the plan.
  - The Guardrails link points to `/#module-guardrails` (U1), not a page.
- **Verification:** The e2e spec plays both branches.

### U8. Chapter 4: budgets and stuck loops

- **Goal:** A stuck agent, a token meter, and two host rules that stop it.
- **Requirements:** R5.4, R7; KTD5, KTD6.
- **Dependencies:** U5.
- **Files:** `src/content/agents/04-budgets.tsx`, `src/content/agents/module.ts`, `src/content/agents/recall.ts`, `tests/e2e/agents.spec.ts`.
- **Approach:** The carrier times out. With no limits, the agent retries until the step budget ends it, and the gauge climbs. A puzzle asks the reader to set the budget and the repeat detector so the run stops early and tells the customer the lookup failed.
- **Patterns to follow:** `puzzle()` with hints after three misses and "Show me" (AGENTS.md "Chapter page layout").
- **Test scenarios:**
  - The token total on the stage equals the engine's computed total for the run.
  - The puzzle passes only when the run ends `stuck` before the budget, with the recorded "lookup failed" email.
  - "Show me" sets a winning combination and advances.
- **Verification:** The e2e spec solves the puzzle by keyboard.

### U9. Chapter 5: memory

- **Goal:** Context growth, compaction, and pinning what must survive.
- **Requirements:** R5.5, R7, R8.
- **Dependencies:** U5.
- **Files:** `src/content/agents/05-memory.tsx`, `src/content/agents/module.ts`, `src/content/agents/recall.ts`, `tests/e2e/agents.spec.ts`.
- **Approach:** In the storm case the in-tray grows with each order. Full memory passes the host's context budget (KTD12), drawn on the gauge. Summary compacts and forgets "no phone calls". Pinned keeps it. The term *context window* links back to RAG's definition.
- **Patterns to follow:** `src/content/rag/02-why-not-stuff-it.tsx` (how tokens are counted and sourced).
- **Test scenarios:**
  - With full memory, the stage reports the context size passing the host's budget, computed from the run.
  - With summary, the final email breaks the customer's request, and the step names the dropped line.
  - With pinned, the email keeps it.
- **Verification:** The e2e spec plays all three modes.

### U10. Chapter 6: sub-agents

- **Goal:** A lead hands each damaged order to a helper with a clean context, and the reader weighs the cost.
- **Requirements:** R5.6, R7, R8; KTD7.
- **Dependencies:** U5.
- **Files:** `src/content/agents/06-sub-agents.tsx`, `src/content/agents/module.ts`, `src/content/agents/recall.ts`, `tests/e2e/agents.spec.ts`.
- **Approach:** Lead alone vs. lead + helpers on the storm case. The predict asks which uses more tokens in total. The reveal: helpers keep the lead's context small, but the total grows. The figure for that comes from the run, and the advice on when it is worth it comes from `facts.json`.
- **Test scenarios:**
  - The helper desk shows one helper per delegated order.
  - The lead's context size with helpers is smaller than without, and the total tokens are larger. Both are computed.
  - The checkpoint asks about a new case (a supplier price check), not the storm (R7, recall in a new context).
- **Verification:** The e2e spec plays both modes.

### U11. Chapter 7: workbench

- **Goal:** Every control from chapters 1–6 on one case of the reader's choice.
- **Requirements:** R5.7, R4.
- **Dependencies:** U6–U10.
- **Files:** `src/content/agents/07-workbench.tsx`, `src/content/agents/module.ts`, `tests/unit/agent-workbench.test.ts`, `tests/e2e/agents.spec.ts`.
- **Approach:** It mirrors Tool calling's workbench in layout. Each case shows only the controls its chapter recorded, so the reachable set is small. `src/lib/agents/` exports it as `WORKBENCH_DOMAINS`, and U3's coverage test walks it.
- **Patterns to follow:** `src/content/tool-calling/07-workbench.tsx`, `tests/unit/workbench.test.ts`.
- **Test scenarios:**
  - Every workbench control combination reaches `done`, `stuck`, `out-of-budget` or `waiting`, never `norecord`.
  - The control state is kept in the step state and survives a reload.
- **Verification:** The e2e spec runs two contrasting combinations.

### U12. Intro, recap, share images and docs

- **Goal:** The module reads complete from the home page to the recap, and the docs record the new decisions.
- **Requirements:** R3, R7, R8, R9.
- **Dependencies:** U11, U2.
- **Files:** `src/pages/agents/index.astro`, `src/components/intro/ChapterCards.astro` (only if a variant is needed), `src/content/agents/recall.ts`, `src/dev/og.astro`, `public/og/agents*.jpg`, `AGENTS.md`, `README.md`, `docs/writing-a-module.md`.
- **Approach:**
  1. The intro, pictures first, under the Pictures / Words switch: the idea in one example (the damaged-delivery case as script vs. agent), how the loop works, the Larkspur company, the chapter path, and the Colorfigures credit.
  2. Complete the recall bank: three to five items per chapter, exactly one pinned for the whole module (AGENTS.md "Recall bank").
  3. Add a share picture case in `og.astro` for each agents page: the back office at each chapter's moment. Run `pnpm og`, which also regenerates `home.jpg` with agents live.
  4. AGENTS.md: add the module to "What this is", a short "Agent engine (`src/lib/agents/`)" section (KTD1–KTD7), the scene's props under "Pictures", and the hero's grid (KTD10). README lists the module.
- **Patterns to follow:** `src/pages/tool-calling/index.astro`, AGENTS.md "Share images".
- **Test scenarios:**
  - The registry test passes for the full module: seven chapters, recall for each chapter, one pin, every share image present.
  - The e2e share-image test finds a distinct image for each of the nine agents pages.
  - The recap with no chapters done says so and links chapter 1. After chapter 3 it draws only from chapters 1–3.
  - The warm-up appears on the intro 20 hours after a chapter is finished, and has a skip link.
- **Verification:** Every agents page at 1280px and 390px; all three check commands are green.

---

## Verification Contract

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm test`: all unit tests, including the new `agent-loop`, `agent-coverage`, `agent-scene`, `agent-workbench` and `hero` tests. Existing Tool calling and RAG tests pass unchanged (R9).
- `pnpm test:e2e`: all specs, including `agents.spec.ts` (keyboard only, axe, reduced motion, phone, offline, share images) and `catalogue.spec.ts`.
- `pnpm og` regenerates only `home.jpg` and the new `agents*.jpg`; `git status` shows no other image changed.
- A manual look at every changed page at 1280px and 390px wide (AGENTS.md "Checks before you call it done").

## Definition of Done

- R1–R9 hold, and every unit's verification passes.
- The home catalogue shows 3 live and 6 planned modules under the correct levels.
- No Tool calling or RAG recording, step id, chapter id or share image changed, except the home hero (R9).
- AGENTS.md describes the agent engine, the scene props and the hero grid.
- No dead code from abandoned approaches is left in the diff, and dev-only pages stay out of production builds.

## Appendix

### Sources

- `docs/plans/2026-10-20-1119-feat-platform-and-tool-calling-module-plan.md`: the platform, registry and Tool calling decisions this plan builds on.
- `docs/writing-a-module.md`, `AGENTS.md`: house rules for modules, pictures and checks.
- `src/lib/tools/host.ts`, `src/lib/tools/turns.ts`: the recorded-turn engine and coverage pattern.
- `src/components/scenes/heroScene.ts`: the current two-live, three-plot limit that U2 removes.
- `scripts/new-module.mjs`: replaces a planned card of the same id.
