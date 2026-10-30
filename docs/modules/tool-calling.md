# Tool calling (`/tool-calling/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **Lead with a scene, not a diagram.** Tool calling's chapters 1–4 and 6 (and its intro hero and home card) open on the **back office** (`src/components/scenes/officeScene.ts`): an isometric diorama of the employee's desk, the host's sorting desk, the model and the order system's filing cabinet, joined by conveyor belts. The message being sent rides its belt as an envelope coloured by kind; checks stand on the belts (schema arch, ownership arch, approval barrier); a drawer slides out when the orders are read; a planted note pokes out of an envelope. It is driven by the same transcript as the sequence, so the two never disagree. Only stamps ride in the drawing; the message's words go in the caption under it (`ToolStage` in `src/content/tool-calling/kit.tsx`).
- **Hero object: the host as a mail-sorting machine** (`sortingMachine`: a rounded body, a wall of pigeonholes, a hopper on top). The employee is a `person` (CAST `employee`) at a counter with a desk phone; the model is the kit's model machine; the order system is a filing cabinet with bar handles; slatted crates and a potted plant fill the corner. Chapter 5's MCP scenes reuse the same sorter (apps) and cabinet (servers).

## Engine (`src/lib/tools/`)

- **Recorded model turns, live everything else.** Turns live in `data/tool-calling/turns/*.json`, keyed by a signature of what the model could see; a missing one is `norecord`. Every chapter control has a finite exported domain, and a unit test generates every reachable signature from them and asserts each has a turn. Host-only decisions (call cap, permissions, validation) stay out of the signature.
- **Schema checks are a hand-written JSON Schema subset** (`schema.ts`); copy says "a subset". No `ajv` (it compiles with `new Function`).
- **The MCP server is a model of the protocol**, not a conforming SDK: JSON-RPC 2.0 shaped, following the current spec (stateless, 2026-07-28, no opening handshake). Every MCP or API fact in copy comes from `data/tool-calling/facts.json` with its source and access date.

## Tabs

Picture / Messages tabs: chapters 1–4 and 6 keep the tab as view state, outside saved progress; chapters 5 and 7 keep it in the step state. Agents' Picture / Steps tabs work the same way (chapter 7 passes `view` and `onView` to `AgentStage`).

## Toy vs real

Two kinds of number appear. Larkspur's orders, amounts, schema range, servers and calendar are the course's own story data (`data/tool-calling/`), and the host, its checks, the order system and the MCP servers run on them for real in the browser: nothing there stands in for a real-world rate, so they are real already. The model's replies are recorded (`turns/*.json`, never re-recorded for this, KTD5): `RecordedNote` in the kit says so beside them, and a cited fact on the same step gives the real figure.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Order 1042, its delivery date and items; the model's guess | `app-executes` | Real (story data, looked up for real); the guess is a recorded reply, labelled by `RecordedNote` |
| 2 | Message n of N in the player | `tool-definition`, `descriptions-matter` (detailed descriptions are by far the biggest factor, Anthropic's docs) | Real (counted off the run); vague → no call is a recorded reply, labelled |
| 3 | order_id from 1000 to 9999; the asked and wrong order numbers | `mcp-tool-errors`, `strict-mode` (a real strict mode stops the wrong-type call before it is sent) | Real (the schema the host checks); the retry is recorded, labelled |
| 4 | The call cap: 6 (default), 2, 1 calls | `max-turns` (OpenAI's Agents SDK stops after 10 turns by default) | Labelled: a note says the 6 is picked for the story, and this host counts calls where the SDK counts turns, so it is not matched |
| 4 | Two orders looked up in one turn | `parallel-calls`, `tool-choice` | Recorded reply, labelled |
| 5 | 1–4 apps and systems; integrations apps × systems against apps + systems | `mcp-roles`, `mcp-features` | Real (worked out by `integrations()`) |
| 5 | MCP version 2026-07-28 | `mcp-version` | Real (the fact) |
| 6 | Refund limits: none, $500, $100; the refund asked for; the planted $5,000 refund; the ledger | `mcp-human`, `mcp-untrusted-annotations` | Real (story data, run by the host) |
| 6 | The model obeys the planted note every run | `injection-rate` (GPT-4 followed planted instructions 24% of the time in Zhan et al.'s test) | Labelled: the note on the step says the replies are recorded, so it obeys every time, while real models obey some of the time |
| 7 | 4 requests; the refund and its limit; the delivery window | `mcp-human` | Real (judged by `verdict()`, no recorded reply) |
| Intro | Orders, tools and servers counted; the MCP version | `mcp-version` | Real (counted off the data; the fact) |
