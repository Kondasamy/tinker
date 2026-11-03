# Multi-agent systems (`/multi-agent/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **Larkspur's back office around an operator's cord switchboard** (`src/components/scenes/switchboardScene.ts`, `SWITCH_PARTS`): a wooden switchboard with a cream panel stands at the back. Each of its five columns (one per helper desk) has a lamp, a round reply port and a patch jack; two dials sit at its left, a token meter (a needle) and a timer (a sweep). A coil of spare cords lies on its base. The lead agent (the kit's model machine) stands beside the board with its own desk; a cart of catalogues waits behind it. Five helper desks stand in a row, each with a small helper machine on it (blush when hired, grey when not) and a jack at its back. Ines (CAST `ines`) waits by a tray for the report. Words live only in pills: the lead, the cart's count, the meter's tokens, the report, and what a run left behind (`SAME AS 1`, `6 UNREAD`, `BOUNCED`, `ON HOLD`, the misread price, `TIMER RANG`).
- **Hero object: the operator's cord switchboard.** No other scene has one (checked against `docs/modules/*.md` and `src/components/scenes/`).
- **Unique device (KTD5):** patch cords snake from the board's jack to a helper desk's jack as work is handed off; a reply in the wrong shape is a square plug that won't seat in its round port and springs back onto the base; two helpers waiting on each other blink their lamps at each other (CSS, half a beat apart; steady with reduced motion) and hold a mustard cord between their jacks until the timer's sweep fills and the lead pulls it.
- **Colour carries the split:** a catalogue's cover is the colour of its slice under a detailed split, and each desk's cord matches. With a one-line brief, desk 2 holds a red pile (desk 1's colours) and the blue slice stays on the cart.
- **Living scene (KTD2, `Scene<Switch>`), 1100 ms per change:** hiring lays the new cords along their path; a run sends each pile from the cart to its desk (0.05–0.35), drops any spill (0.35–0.5), sends each reply capsule back up its cord to its port (0.45–0.8; with a timeout the timer sweeps first and the hold cord drops, then replies 0.6–0.82), and slides the report sheet onto Ines's tray (0.82–1). Laid cords and the setting are the still; pieces in flight, the board's live face and the piles are the moving layer. Reduced motion jumps to the end.
- **Hands in the picture (KTD4):** drag a cord from the board's coil onto a helper desk to hire that helper (`HitLayer`: `cord` drag, `desk1`–`desk5` drops; a press without a drag hires the next free desk). Dropped off every desk, it snaps back and the status line says to drop it on a desk; a desk already wired, or past the step's cap, is refused the same way. Tapping the board's panel runs the job. **Twins:** a Helpers radio group (0–5), Brief (One line / Detailed), Check replies and Timeout radio groups, and a Run button, all through the kit's one `act` handler, which writes the visible status line.
- **Pills** are drawn outside the hand-drawn filter (`switchPills` through `PillLayer`); the share image keeps them inline.
- **Close-up (KTD6):** each reveal closes in on the part that answers it: the lead's desk and its spill, the token meter, desk 2, the ports (the square plug, the set-aside capsule), the timer with the lamps.
- **Second view:** Messages, the run's timeline as lanes (`FlatStage`): briefs, replies, a bounce (`INVALID`), waits (`WAITING`), the timeout (`STOPPED`), checks (`PASS`/`FAIL`).

## Chapter pictures

Each step's start frame is the previous step's end state; the status line is the step's `status` (R10a).

| Ch | Step | Picture (end state) | Motion | Hands / control | Close-up | `say` part | Status line |
|---|---|---|---|---|---|---|---|
| 1 | predict | 30 catalogues on the cart, the lead's desk empty, no cords | none | Predict | — | desk | 30 catalogues wait on the cart beside the lead's empty desk. |
| 1 | run | 24 on the lead's desk, 6 splayed on the floor (`6 UNREAD`), report `6 MISSING` | the pile flies to the desk, six fall, the sheet slides to the tray | tap the board, or Run | — | board | The lead read 24 catalogues; 6 fell off its full desk unread. |
| 1 | reveal | the same | none (zooms in) | Reveal | desk | — | 6 unread catalogues lie on the floor by the lead's desk. |
| 1 | quiz | the same | none | Quiz | — | — | The report on Ines's tray is missing 6 suppliers. |
| 2 | hire | three cords from the board to desks 1–3, helpers turn blush | cords snake out | drag cords, or Helpers radio | — | coil | 3 cords run from the board to 3 helper desks. |
| 2 | predict | the same | none | Predict | — | meter | 3 cords wait; the catalogues are still on the cart. |
| 2 | run | a pile on each desk, three mint knobs, lamps lit, meter needle up, `41,000 TOKENS`, report `24 MIN` | piles fly, capsules travel up the cords, the sheet slides | tap the board, or Run | — | — | Each desk read 10, 3 replies seated, and the report reached Ines in 24 minutes. |
| 2 | reveal | the same | none (zooms in) | Reveal | meter | — | The token meter's needle sits past where the lead alone left it. |
| 2 | quiz | the same | none | Quiz | — | — | The complete report lies on Ines's tray. |
| 3 | run | desk 2 holds a red pile (`SAME AS 1`), the blue pile stays on the cart, report `10 MISSING` | piles fly; one stays | tap the board, or Run | — | cart | Desk 2 read desk 1's catalogues again, and 10 stayed on the cart. |
| 3 | predict | the same | none | Predict | — | — | The report on Ines's tray is missing 10 suppliers. |
| 3 | brief | each desk its own colour, the cart empty, report done | the piles go home and fly again | Brief radio, then Run | — | — | Each desk read its own share; the cart is empty and the report complete. |
| 3 | reveal | the same | none (zooms in) | Reveal | desk2 | — | Desk 2 holds its own blue pile now, beside desk 1's red one. |
| 3 | quiz | the same | none | Quiz | — | — | The complete report lies on Ines's tray. |
| 4 | predict | three cords, round ports empty | none | Predict (desk 2's reply shown beside it) | — | port | 3 cords wait; every port on the board is round. |
| 4 | run | a red square plug on the base under port 2 (`BOUNCED`), three mint knobs seated | desk 2's square plug rises to its port, springs back, a round resend follows | tap the board, or Run | — | — | Desk 2's square plug sprang back from its port; the resent round one seated. |
| 4 | reveal | the same | none (zooms in) | Reveal | port | — | The square plug lies on the board's base, under port 2. |
| 4 | quiz | the same | none | Quiz | — | — | Every port holds a round reply, and the report is complete. |
| 5 | run | lamps 1 and 2 blink amber, a mustard cord between jacks 1 and 2 (`ON HOLD`), tray empty (`NO REPORT`) | piles fly, the hold cord loops, lamps start blinking | tap the board, or Run | — | lamps | Lamps 1 and 2 blink at each other on hold, and no report reached the tray. |
| 5 | predict | the same | none | Predict | — | — | Desks 1 and 2 hold a cord between their jacks, waiting. |
| 5 | timeout | the timer face full (`TIMER RANG`), the hold cord hanging loose, lamps steady, report `27 MIN` | the timer sweeps, the hold cord drops, replies travel, the sheet slides | Timeout radio, then Run | — | — | The timer rang, the lead pulled the hold cord, and the list arrived at 27 minutes. |
| 5 | reveal | the same | none (zooms in) | Reveal | timer, lamps | — | The timer's face is full, and lamps 1 and 2 are steady again. |
| 5 | quiz | the same | none | Quiz | — | — | The euro price list lies on Ines's tray. |
| 6 | run | a red knob in port 2 (`42.00`), report `WRONG PRICE` | piles fly, capsules travel (desk 2's red) | tap the board, or Run | — | report | Desk 2's reply seated with 42.00, and the report printed it. |
| 6 | predict | the same | none | Predict | — | report | The red capsule sits in port 2, and the report shows 42.00. |
| 6 | check | the red capsule set aside on the base (`CAUGHT 42.00`), port 2 mint, report done | as a run; the caught capsule lands on the base | Check replies radio, then Run | — | — | The check set desk 2's 42.00 aside; the report has the catalogue's 4.20. |
| 6 | reveal | the same | none (zooms in) | Reveal | port | — | The red capsule lies set aside on the board's base, under port 2. |
| 6 | quiz | the same | none | Quiz | — | — | The right report lies on Ines's tray. |
| 7 | bench | the job picked in the Job `Select`, run live with its setup | each setting change reruns that job | Job `Select`, Helpers, Brief, Check replies (drag cords too) | — | coil | Each job's report is right, within its budget and on time. |
| 7 | quiz | the same | none | Quiz | — | — | All three reports lie right on Ines's tray. |

## Engine (`src/lib/multi-agent/sim.ts`)

- **A deterministic toy, no model** (KTD3): who reads what, what it costs and what comes back follow fixed rules over hand-written data (`data/multi-agent/jobs.json`, a hand-written example run: 30 catalogues with the price of a box of deck screws).
- **Room:** a desk (a context window) holds 24 catalogues; the rest fall unread.
- **Split:** the first n catalogues in contiguous slices (`slices`); a one-line brief with two or more helpers gives helper 2 helper 1's slice again, and slice 2 stays on the cart.
- **Cost:** tokens = lead 2,000 + 3,000 per helper + 1,000 per catalogue read + 500 per reply checked; minutes = brief 2 + 2 per catalogue on the busiest desk + merge 2, + check 2, + resend 4, + timeout 15 (the lead alone skips brief and merge).
- **Agreed shape:** `validate(reply)` lists what a reply must fix (rows a whole number, cheapest a supplier, price a number). The malformed scenario's desk 2 writes its price in words; it bounces and is resent.
- **Deadlock:** `findCycle` over the hand-written waits (helper 1 waits on 2's rate sheet, 2 on 1's supplier list) on a job whose parts talk; with a timeout the lead steps in.
- **Slip:** a run with a slip misreads one catalogue (decimal point lost, ×10); unchecked it reaches the report, a check catches it.
- **Workbench:** the lead's timeout is always set and every job carries a slip; a job passes when right, within budget and by its deadline. `WINNERS` is every passing setup, enumerated.
- **Pins** (`data/multi-agent/pinned.json`): alone, three helpers, the token bill by helper count, the vague brief, the bounce, the deadlock and its timeout, the slip checked and not, and the workbench winners. `tests/unit/multi-agent.test.ts` re-derives them.

## Toy vs real

Every number a chapter shows, and whether it is the real figure (matched: the code reads the fact's `value`) or a toy one (labelled: a toy note says so, with a cited real figure beside it).

| Chapter | Number shown | Real figure (fact id) | Matched or labelled |
|---|---|---|---|
| 1 | 30 catalogues, room for 24, 6 unread | `truncated` (200,000 tokens, Anthropic's lead) | Labelled: `ToyNote` |
| 1–7 | Tokens per run (hand-set unit costs) | `tokens-15x` (vendor-reported, Anthropic, June 2025) | Labelled: `ToyNote`; ch. 2's note sets the toy's multiple beside the real 15× |
| 1–7 | Minutes per run (hand-set) | — | Labelled: `ToyNote` |
| 2 | 24 minutes and complete vs 48 with gaps | `better-90` (vendor-reported 90.2%), `own-room` | Labelled |
| 3 | 10 catalogues left on the cart | `vague-brief` | Labelled |
| 4 | Resend costs 4 minutes | `a2a-parts`, `a2a-reject` | Labelled |
| 5 | 27 minutes with the timeout, 16 alone | `circular-wait`, `blocked-wait`, `poor-fit` | Labelled |
| 6 | 42.00 misread for 4.20; check costs 2 minutes and 1,500 tokens | `mast-verify` (8.2% / 9.1%), `mast-modes` | Labelled |
| 7 | Budgets and deadlines per job | `worth-it` | Labelled |

## Links to add at go-live (U11, KTD8)

- **Registry:** import `MULTI_AGENT_MODULE` from `../content/multi-agent/module`, place it after the last live module (after Skills and Approvals, in KTD1 order), and remove the `multi-agent` planned card.
- **Neighbour links:** AI agents (`/agents/`) chapter 6 "Sub-agents" → link forward to Multi-agent systems; Context (`/context/`) where it covers the context window filling → link to chapter 1. The intro names AI agents as the prerequisite.
- **Hero (`heroScene.ts` `DRAW`):** a plot with the switchboard in miniature (`mini`): the board with two lit lamps and two cords to two small desks.
- **Share images (`og.astro`):** the intro and chapters use `switchStill(switchOf(…))` for each chapter's reveal state (ch. 1 alone, ch. 2 three helpers, ch. 3 vague, ch. 4 bounce, ch. 5 hold, ch. 6 caught, ch. 7 three helpers checked); then `pnpm og multi-agent`.
- **Plain words:** none needed (the copy says "agreed shape", never "schema"; "context window" is a chapter 1 term; "deadlock" and "timeout" are chapter 5 terms).
