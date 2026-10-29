# When the buyer is an agent (`/agent-commerce/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The trading hatch** (`src/components/scenes/hatchScene.ts`, the hero object): two counters meet at a hatch in a back wall, its frame and raised shutter over a shelf between them. At the left counter stands Reyes Decks' buying agent, a cobalt `modelMachine` with a satchel strapped to its side, and Dana Reyes (CAST `operator`, the builder) behind it; at the right counter, Larkspur's sales agent, the blush `modelMachine`. Names in pills are read from `story.ts`.
- **The slip:** one upright paper slip, at most one, standing at the buyer's counter (`at: 'buyer'`), in the hatch (`'hatch'`) or at the seller's counter (`'seller'`). It has six field rows, one per `shop.ts` `FIELDS` entry, top to bottom: signature, merchant, items, cap, expiry, nonce. A signed slip carries a tomato wax seal at its foot; an unsigned one has none.
- **Stamps, not by colour alone:** once the shop has checked, each row carries its own stamp: a pass is a round mint stamp, a fail a tomato cross. A failed signature also cracks the seal (a dark split across it). Each stamp carries `data-field` and `data-pass`, which the tests read. No words are painted on the slip; its pill says what happened (`ACCEPTED`, `REFUSED · CAP`).
- **The token** (`token: 'live' | 'spent'`, chapter 6): a mustard coin on the seller's counter; spent, it is punched through (a dark hole), so used reads by shape.
- **The Task tab, one tab away** (`HatchStage`, `src/content/agent-commerce/kit.tsx`): the A2A task's states as flat cards in a snake (`hatchLane`, flat.ts `lane`, `card`, `arrow`, `stamp`): five to a row on desktop, two on phones. An input-required card carries a WAITING stamp, completed PASS, failed and canceled FAIL. Read off the same `runTask` run the chapter plays.
- **The mechanic, sign the slip** (`SignSlip`): a real form under the frame: Cap, Good for and Items (`Select`, domains from `workbench.ts`'s `CAPS`, `HOURS`, `ITEMS`), an optional Seller pick, then **Sign** (Web Crypto, Dana's demo key). Signed, the form locks and **Change the cap** (a toggle, `aria-pressed`) edits the signed cap without signing again; **Send** carries the slip through the hatch (buyer → hatch → seller, 450 ms a hop) and the shop's `checkOrder` stamps each field. **Send again** reuses the slip, so an accepted one fails on its nonce; **Start over** clears it. Every control is a real element, at least 44 px on phones; keyboard alone fills, signs and sends.
- **Reduced motion:** Send puts the slip straight at the seller's counter with its stamps, no hatch hop.
- **Read-out:** one polite `role="status"` line under the controls: what Sign signed, then the verdict per field (`Refused: cap fails ($1,200.00 is over the $600.00 cap); the other 5 pass.`), the tamper toggle's change. Chapter units clear it by keying `SignSlip` on the step id.
- **Phones:** pills drop to short words (the builder's first name, BUYER, SELLER); the slip's pill drops the failed field names, which the read-out carries.
- **Parts for callouts** (`say`, `HATCH_PARTS`): `builder`, `buyer`, `satchel`, `hatch`, `seller`, `slip`, `seal`, `token`. `slip` and `seal` draw only with a slip, `seal` only when it is signed, `token` only with a token.

## Chapter pictures

| # | Chapter id | Picture | Mechanic live | Step's control | `say` parts |
|---|---|---|---|---|---|
| 1 | `01-a-page-for-people` | The hatch, no slip; the buyer reads the shop's page (its screen `warn` when it misreads a price) | no | the chapter's own order pick | `buyer`, `seller`, `hatch` |
| 2 | `02-a-menu-for-agents` | The hatch, no slip; the buyer `ok` reading the catalogue | no | the chapter's own view pick (page or menu) | `buyer`, `seller` |
| 3 | `03-agent-to-agent` | The hatch, no slip; the seller `warn` while the task is input-required; Task tab shows the states | Task tab | the chapter's request pick (clear or vague), then the answer | `buyer`, `seller`, `hatch` |
| 4 | `04-who-said-it-could-buy` | Sign the slip, Larkspur's terms (`SLIPS.larkspur`), seller `larkspur` | yes: form, Sign, Change the cap, Send | Sign, then Send | `builder`, `slip`, `seal`, `satchel` |
| 5 | `05-a-seller-that-talks-back` | Sign the slip with `SLIPS['shop-around']`, seller `quarrylane` (its machine `warn`); cap and items stamp fail | yes: Send | Send | `seller`, `slip` |
| 6 | `06-paying-without-the-card` | The slip accepted at the seller's counter, the token `live`, then `spent` on a second order | no (the chapter's own charge control) | the chapter's charge pick | `token`, `slip` |
| 7 | `07-workbench` | The bench's slip against the picked seller, stamped | as exploration | the workbench's term controls | `slip`, `seller` |
