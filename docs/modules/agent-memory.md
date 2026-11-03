# Memory you can trust (`/agent-memory/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The support room and its cork board** (`src/components/scenes/corkScene.ts`, `CORK_PARTS`): Larkspur's support room. A **cork board on an easel** holds source papers along its top (the handbook and order system as ruled printouts, each customer's chats with speech bubbles, a web page with a browser bar) and up to 16 memory cards below in a 4 × 4 grid, coloured by whom they are about (Ada mustard, Ben cobalt, Cara mint, Dan blush, the store lilac). Each card is tied by **red thread** to its paper, or to the card it was learnt from. A metal bin stands in front of the easel; the assistant (the kit's model machine) and the support lead (CAST `supportLead`) stand by; in chapter 1 a side table holds the chat's candidate cards. Words live only in pills: paper names, the lit cards' labels, the bin's count, the assistant.
- **Hero object: the cork board on an easel, with red threads.** No other scene has one (checked against `docs/modules/*.md` and `src/components/scenes/`).
- **Living scene (KTD2, `Scene<Cork>`):** pieces that change place are the moving layer: a pulled paper and every card hanging from it swing flat and fall into the bin, staggered, the paper first; candidates fly from the table to the board; a new card flies out of its paper to its slot (or straight to the bin when it loses a conflict). 1000 ms per change; reduced motion jumps to the end. A lit card or paper gets an accent glow ring and heavier ink that nothing else has; its threads glow. A taken-down page turns grey and is crossed out.
- **Hands in the picture (KTD4):** drag a source paper into the bin to pull its thread (`HitLayer`: `src:<id>` drag, `bin` drop). A tap on a paper traces it where the chapter traces. Dropped anywhere else, the paper snaps back and the status line says to drop it in the bin. **Twin:** a `Select` of sources with Trace and Undo source buttons beside the stage, both through the kit's one `act`, which writes the visible status line. Other actions are buttons (Keep all, Add the new order, Jump to day 30, Forget Cara, Read the page, Run day 19, Pin all back).
- **Pills outside the filter:** `corkPills` draws every pill as a `PillLayer` child of the live stage; the share image and intro keep them inline (`corkStill(s, v, true)`).
- **Close-up (KTD6):** on each reveal: the bin (ch. 1, 4, 6), the traced source and its cards (ch. 2), the kept address (ch. 3), the cards the planted page taught (ch. 5).
- **Second view:** the Table tab: every card on the board with its source, day and trust.

## Chapter pictures

Each step's start frame is the previous step's end state; the status line is the step's `status` (R10a).

| Ch | Step | Picture (end state) | Motion | Hands / control | Close-up | `say` part | Status line |
|---|---|---|---|---|---|---|---|
| 1 | keep-all | 12 cards on the board from Ada's chat; table empty | 12 cards fly from the table to the board | Keep all | — | tray | All 12 cards now hang on the board from Ada's chat. |
| 1 | predict | same | none | Predict | — | board | 12 cards hang from Ada's chat; none has fallen yet. |
| 1 | sort | 3 cards stay; 9 in the bin (BIN 9) | 9 cards fall into the bin | Keep lasting facts | — | board | Nine small-talk cards fell into the bin; three lasting facts stay. |
| 1 | reveal | same | zooms in | Reveal | bin | bin | The bin holds nine small-talk cards; the board keeps three. |
| 1 | quiz | same | none | Quiz | — | — | Three lasting cards hang on the board. |
| 2 | trace | day 10: 8 cards, 5 papers; Ada's paper, threads and 2 cards glow | none (lit) | tap a paper, or Select + Trace | — | source | Ada's chats are lit, with the 2 cards that hang from them. |
| 2 | predict | same | none | Predict | — | — | Ada's 2 cards are still lit. |
| 2 | trace-orders | the order system's paper and its 2 address cards glow | none (lit) | tap, or Select + Trace | — | source | The order system is lit, with its 2 address cards. |
| 2 | reveal | same | zooms in | Reveal | source + card | card | Only 2 cards hang from the order system; the rest are safe. |
| 2 | quiz | same | none | Quiz | — | — | The order system's threads stay lit. |
| 3 | new | day 17 board plus Ada's new address card; both address cards glow | the new card flies out of the order paper | Add the new order | — | card | Two address cards for Ada hang side by side, both lit. |
| 3 | predict | same | none | Predict | — | — | Both of Ada's address cards still hang lit. |
| 3 | reveal | the old address in the bin; the new one glows | old card falls (on predicting) | Reveal | card | card | The old address fell into the bin; 14 Mill Lane stays lit. |
| 3 | web | web paper pinned; its refund card in the bin; the handbook's rule glows | card flies from the web paper into the bin | Read the web page | — | bin | The web page's refund card fell straight into the bin: the handbook outranks it. |
| 3 | quiz | same | none | Quiz | — | — | The handbook's refund rule and Ada's new address hang lit. |
| 4 | jump | Cara's hold note in the bin | it falls | Jump to day 30 | — | board | Cara's hold note passed its 14 days and fell into the bin. |
| 4 | predict | same | none | Predict | — | — | Cara's ladder and address cards still hang on the board. |
| 4 | forget | Cara's paper, ladder and address cards in the bin | paper first, then her cards fall | Forget Cara (dragging her paper is refused) | — | source | Every card about Cara fell, her address from the order system too. |
| 4 | reveal | same | zooms in | Reveal | bin | bin | The bin holds Cara's 2 cards and her chats' paper. |
| 4 | quiz | same | none | Quiz | — | — | No card about Cara is left on the board. |
| 5 | read | web paper pinned; its ID rule glows on the board; its refund card in the bin | cards fly from the paper: one to the board, one to the bin | Read the page | — | bin | The page's refund card fell, but its ID-check card stayed on the board. |
| 5 | chats | a new card hangs from the ID rule, both glow | it flies out of the rule card | Run day 19 | — | card | A new card hangs from the false rule: Ben's ID check was skipped. |
| 5 | predict | same | none | Predict | — | — | 2 cards still hang from the deals page. |
| 5 | reveal | the page grey and crossed out; both cards still pinned and glowing | none (zooms in) | Reveal | card | — | The crossed-out page still holds 2 cards on the board. |
| 5 | quiz | same | none | Quiz | — | — | The false rule and the card it taught still hang lit. |
| 6 | predict | day 26 board; the deals page glows | none | Predict | — | source | 2 cards hang from the deals page, one through the other. |
| 6 | pull | page and its 2 cards in the bin | the paper falls, then its cards | drag the page into the bin, or Select + Undo source | — | bin | The page and its 2 cards fell; nothing else moved. |
| 6 | reveal | same | zooms in | Reveal | bin | — | The bin holds the deals page and its 2 cards. |
| 6 | pull-dan | Dan's paper and 2 cards in the bin | they fall | drag or Undo source | — | source | Dan's chats and the 2 cards from them fell into the bin. |
| 6 | quiz | same | none | Quiz | — | — | Only cards from trusted sources and real customers hang on the board. |
| 7 | bench | the month's end under the reader's rules (up to 16 cards); pulled papers in the bin | cards move between board and bin as rules change | three `Select`s; Undo source / drag; Pin all back | — | board | The board shows the month's end under your rules. |
| 7 | quiz | same | none | Quiz | — | — | No card from a planted source is left on the board. |

## Engine (`src/lib/agent-memory/memory.ts`)

- **A hand-written month** (`data/agent-memory/month.json`, labelled "hand-written example run"): 7 sources (2 planted: a deals page and Dan's chats, a MINJA-style plant through an ordinary chat), 24 cards with day, subject, kind and source (or parent card), 12 candidates from Ada's chat, 8 month-end questions with their right card (or none).
- **Rules:** keep (all, or lasting kinds only), expiry (none, or a hold note after 14 days), trust (newest wins; the better source wins, then the newer; ranked and web pages never kept without a check). One card per customer and kind: the newcomer takes a free slot, then the loser falls. A full board (16, a toy limit) drops its oldest card. A card learnt from another card exists only if that card is up.
- **Undo by source** drops every card whose thread chain reaches the source; **forget** drops every card about a customer or from her chats.
- **Pins** (`data/agent-memory/pinned.json`): undo sets, both conflicts, forget, expiry, the full board, ch. 1's kept cards, six workbench scores and the WINNERS. `tests/unit/agent-memory.test.ts` re-derives them.

## Toy vs real

| Chapter | Number shown | Real figure (fact id) | Matched or labelled |
|---|---|---|---|
| 1 | 12 candidates, 3 kept, 9 binned (hand-set kinds) | `importance` (Generative Agents rates importance 1 to 10) | Labelled: `ToyNote`, a hand-set kind stands in for a rating |
| 2 | 2 cards from the order system (computed from the month) | `source-attribution` | Labelled: `ToyNote` |
| 3 | which address stays (fixed source ranking) | `update-ops` (Mem0's add, update, delete, nothing) | Labelled: `ToyNote` |
| 4 | 14-day hold expiry (hand-set) | `retention`, `delete-controls` | Labelled: `ToyNote` |
| 5 | 2 cards from the planted page | `minja` (98.2%), `agentpoison` (< 0.1%) | Labelled: `ToyNote`; real figures cited beside it |
| 6 | 2 cards fall per planted source | `rollback` | Labelled: `ToyNote` |
| 7 | right answers of 8, poisoned cards left, 16-card board | `check-first` | Labelled: `ToyNote` (hand-written month, toy board limit) |

## Links to add at go-live (U11, KTD8)

- **Agents** (`src/content/agents/`): where the agent keeps state between runs, link to Memory you can trust.
- **Context** (`src/content/context/`): where context is dropped between chats, link to Memory you can trust for what to keep across them.
- **Guardrails** (`src/content/guardrails/`, the trifecta chapter): link to chapter 5 (a poisoned note) as a memory route for injected text.
- **Approvals and permissions** (`action-approvals`, once live): its dye chapter can link to chapter 6 (undo by source).
- **Plain words** (`src/components/story/plain-words.ts`): none needed; the copy says "source", "planted" and "memory poisoning" (a chapter term), never "provenance", "embedding" or "retrieval".
