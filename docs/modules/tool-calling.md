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
