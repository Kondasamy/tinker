# Agent (`/agents/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The agents scene** (`src/components/scenes/agentScene.ts`) composes `officeScene` and adds four props, each turned on by the chapter: a clipboard by the model (the plan, a tick per finished item), a step and context gauge on the host desk, an in-tray of history papers that becomes one binder when the host compacts, and small helper desks for sub-agents. On phones the props' readout pills are left out and the caption carries the readouts; only the helper count pill stays.
- **Hero object: the case in a manila folder**, held out over the counter by the support lead (CAST `supportLead`, in the employee's place); with helper desks on, the lead has gone and the folder lies on the counter (the lead's look and five desks don't fit the size budget together). A helper clerk sits at the working helper's desk; the gauge is a pair of dials (`dialGauge`), and compaction leaves a ring binder.

## Engine (`src/lib/agents/`)

- **Its own folder, built on `src/lib/tools/`.** It reuses the schema checks, the MCP-shaped server, the turn lookup and `host.ts`'s `combosOf`. It has its own loop and signature, so Tool calling's signatures and recordings never change.
- **`server.ts` takes a bundle** (servers, tools, a handler per tool). Tool calling passes nothing and gets its own default. Agents passes `data/agents/server.json`: the order server plus warehouse, carrier and mail, with fixtures in `data/agents/cases.json`.
- **Recorded turns, keyed by what the model saw.** Turns live in `data/agents/turns/<scenario>.json`, one reviewed file per scenario. The signature holds the case, the tools, the plan state, the memory mode and the visible history (each result so far, or the summary's marker after compaction). Host-only settings stay out: the step budget, the repeat detector's setting, the approval mode and the context budget. They change where a run stops, not what the model says. Every chapter control has a finite domain (`DOMAINS`, and `WORKBENCH_DOMAINS` for chapter 7), and `tests/unit/agent-coverage.test.ts` runs every combination and fails on any `norecord`.
- **Tokens are computed, never recorded**: bytes ÷ `BYTES_PER_TOKEN`, the full context re-sent each turn.
- **The repeat detector is a host rule.** When the same call fails the same way N times in a row, the host returns a "stopped" result. That result enters the history, so the model gets one last recorded turn to tell the customer, and the run ends `stuck`. The step budget ends a run with no further turn (`out-of-budget`).
- **Plan approval binds the run.** A call outside the approved plan, or a new plan, goes back to a person. A plan nobody has answered leaves the run `waiting`.
- **The chapter 5 context budget is a host setting** Larkspur chose, not a fact about any model; the copy says so.
- **A sub-agent is a nested run** with its own history and budget; its turns are the `order-<id>` cases in the same scenario recording. The lead gets only the helper's final line, as the result of the host-defined `delegate` tool, so the helper's history never enters the lead's signature.

## Toy vs real

Every run is replayed from hand-written model turns (`data/agents/turns/`), so no count in a run is recalibrated: changing one means new recordings and a rerun of `agent-coverage.test.ts`. Tokens are computed (bytes ÷ `BYTES_PER_TOKEN`, the shared rule from RAG chapter 2), and the step budget, repeat detector and context budgets are Larkspur's own host settings (KTD12), for which no real default exists to match. So every run number is labelled: `ToyNote` (`kit.tsx`) sits beside a cited real figure on one step of every chapter, with a line saying what the toy number stands for or where it stops matching.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Tool calls and model tokens per run (script 0); the agent's tokens on the refund | `multi-agent-tokens` (agents about 4×, multi-agent about 15× the tokens of chat) | Labelled: the note sets the toy's refund tokens against Anthropic's real, chat-relative figures |
| 2 | Turns taken, tool calls, the 12-turn step budget, context of 3,000 tokens on the gauge | `stopping-conditions` | Labelled: the note says the budget is Larkspur's choice; the guide names the rule, not a number |
| 3 | Plan items, order numbers, the refund amount the planted line takes | `indirect-injection`, `human-checkpoints` | Labelled: one planted line in one made-up email, against the study's attacks on real apps |
| 4 | Step budgets 12, 8 and 4; the detector at 3; tokens sent per turn and in all; tries | `agent-costs`, `stopping-conditions` | Labelled: the meter counts hand-written turns; a real model is also sent the whole conversation each turn |
| 5 | 5 storm orders; the 2,000-token budget; compaction past 900 tokens; tokens the last turn needed; results dropped; bytes ÷ 4 | `context-finite`, `compaction`, `tool-result-clearing` | Labelled: the budget stands in for a model's context window; bytes ÷ 4 is RAG's sourced rule (real) |
| 6 | Lead's turns and biggest turn; the total's growth (2.5 times, read off the runs); each helper's turns and tokens | `multi-agent-tokens` (`value` 15, read by the note), `subagent-clean-context`, `multi-agent-performance` | Labelled: the toy ratio is against the lead alone, Anthropic's against chat, from real runs |
| 7 | 5 cases, 5 endings; turns, tokens and emails per run | `agent-costs`, `stopping-conditions` | Labelled |
| Intro | Cases, tools and storm orders in the course's data; the agent's tokens on the cracked printer | `workflow-vs-agent`, `react-loop`, `stopping-conditions` | Real (counts of the course's own data); tokens labelled (the intro says the replies were written ahead of time) |
| Recall | 30 suppliers, 40 units at $12, page 2 of 40 | none | Labelled: hypotheticals in the questions |
