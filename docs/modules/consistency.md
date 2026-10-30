# Consistency (`/consistency/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The three warehouses** (`src/components/scenes/stockScene.ts`): North at the back, East and West in front, each with a board tray of its own count (a mustard tile per hinge, a cobalt block while it counts the drill press), joined by a phone line on telegraph poles. Messages on their way hang on the wires as envelopes; the wire to a cut-off warehouse is drawn broken, its messages waiting at the sender's end. This minute's orders show at the warehouse that took them: a receipt per sale pinned up its pole (tomato when the final count lost it), a red block per refusal, a tomato flag for a stale look; with reservations a lamp burns on North's roof. `stockAt` reads it off one minute of a run. `ConsistencyStage` (`src/content/consistency/kit.tsx`) puts it one tab from the Timeline (`replicaTimeline.ts`, React SVG: a lane per warehouse, a column per minute, sales, refusals, looks, arrivals as cobalt ticks, the cut lane shaded; a lost sale carries an ink diamond, the conflict marker, drawn in the timeline itself, so `flat.ts`'s `Stamp` gained no conflict stamp; arrow keys read each minute). On phones the pills keep just the names and the caption carries the counts.

- **Hero object:** the telegraph poles (kit `pole`, crossarms with insulators) carrying the phone line between three different warehouses (North a red gable barn, East a brick store with a parapet, West a round-roofed shed), each with its clerk; each pole stands at its warehouse's front corner at the height that keeps the wire on the points the pills mark.

## Engine (`src/lib/consistency/`)

- **A replica simulator over a hand-written morning, nothing measured** (KTD10). `sim.ts` runs `data/consistency/day.json` (30 minutes, 19 orders and stock checks, a hinge stock of 7 and one drill press) over three replicas, one per warehouse. A change reaches the others after Larkspur's assumed lag (`assumptions.json` `lagTicks`, slowed so it can be watched; the copy says so). The morning's partition (the line to West down 10:06–10:14) happens only when a chapter cuts the line; messages across it wait and arrive once it is back.
- **Within a minute everything is concurrent**: every read happens before any write, so two orders in the same minute both read the count before either writes. Reads and writes reach R and W replicas, nearest first; a warehouse that can't reach enough refuses. N is 3; R and W step over `QUORUMS`.
- **Two conflict rules** (`RULES`): `lww` (each write stamped by a global counter, every replica keeps the highest: Dynamo's "last write wins") and `primary` (reservations at North: every order decided there one at a time, refused when the ordering warehouse can't reach it; the warehouse learns the new count from the reply). A sale is `lost` when it is off the chain of bases behind the final count.
- **Outputs are counted, never typed**: sold, oversold, lost, refused and sold-out per product, stale reads (a look older than the newest write before that minute) and read-your-writes misses (a customer's look older than their own order). Sticky reads send a customer's looks to the warehouse that took their order. Names in copy (the buyers of the last hinge) are read off `day.json` too.
- **Chapter 7's workbench** (`workbench.ts`): a setting (R, W, rule) per product, 324 policies, run with the outage on. A policy meets the owner's rule when no product in `workbench.json` `zeroOversell` (the drill press) is oversold; the puzzle accepts every such policy with the fewest refused orders (`WINNERS`, nine today).
- **Coverage:** `tests/unit/consistency-sim.test.ts` pins the plan's scenarios; `consistency-workbench.test.ts` walks every control's domain, checks each reveal against the runs and that Show me lands in `WINNERS`.
- **Facts** (CAP, Dynamo's quorums, last write wins, clash rate and per-service settings, Aurora's replica lag, Jepsen's models, one Raft fact; no consensus internals) come from `data/consistency/facts.json` with source and access date.

## Toy vs real

Every count below is run off Larkspur's hand-written morning (`day.json`, `assumptions.json`): planning numbers, labelled by `SimNote` wherever they show, with a cited real figure on the same step. N = 3 stays fixed by the three-warehouse scene, so it is not read from a fact.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 One count, three copies | 7 hinges in stock, clock 10:00–10:29 | none (story data) | labelled (`SimNote`) |
| 1 | 2-minute lag (`lagTicks`) | Aurora copies usually trail by much less than 100 ms (`aurora-lag`) | labelled: narration says it is slowed to watch and real links take milliseconds; matching it would make the lag invisible |
| 2 Two buyers, one hinge | 1 left, 8 hinges sold from 7, 2 receipts | 99.94% of Dynamo cart requests saw one version (`dynamo-versions`) | labelled: the morning is written so the clash happens; narration says real clashes are rare, not impossible |
| 3 The link goes down | outage 10:06–10:14 (8 minutes), 1 drill press, sold twice or once | CAP (`cap`) | labelled (`SimNote`); the fact has no number |
| 4 Quorums | N = 3, R and W 1–3, stale reads, oversold and refused counts | (N, R, W) = (3, 2, 2) was Dynamo's common setting (`dynamo-322`); R + W > N (`dynamo-quorum`); a bigger W refuses more (`dynamo-w`) | N = 3 and R = W = 2 equal the cited setting (fixed by the scene); counts labelled |
| 5 Who wins | 2 receipts, count down by one, R = W = 2 | last write wins (`lww`); Raft's single leader (`raft`) | labelled (`SimNote`) |
| 6 Eventually | reload minute, the minute every copy agrees | eventual consistency (`eventual`); read your writes (`ryw`) | labelled (`SimNote`) |
| 7 Stock policy | refused and oversold per product, best 1 refused, 9 tied policies (`WINNERS`), 324 policies | Dynamo lets each service set its own N, R, W (`dynamo-tune`) | labelled (`SimNote`); `WINNERS` and `BEST` computed |
| Intro | 19 orders and looks, 3 warehouses, 1 drill press, 9 tied policies | `eventual`, `cap`, `dynamo-quorum`, `lww` | labelled (intro note) |
