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
