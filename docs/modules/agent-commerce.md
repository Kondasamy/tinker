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
| 5 | `05-a-seller-that-talks-back` | Sign the slip with `SLIPS['shop-around']`, seller `quarrylane` (its machine `warn`): the cap stamps fail; then `SLIPS.larkspur` against `lookalike`: the merchant stamps fail (the recorded agent accepted it) | yes: Sign, Send | Sign, then Send (each round) | `seller`, `slip` |
| 6 | `06-paying-without-the-card` | The slip accepted at the seller's counter, the token `live`, then `spent` on a second order | no (the chapter's own charge control) | the chapter's charge pick | `token`, `slip` |
| 7 | `07-workbench` | The bench's slip against the picked seller, stamped | as exploration | the workbench's term controls | `slip`, `seller` |

## Engine

- **Signing happens in the page, on purpose** (KTD7): Sign signs the slip live with Dana's demo ECDSA key (`data/agent-commerce/`, labelled demo), a deliberate departure from Locks and keys' rule that demo keys sign only in tests. ECDSA signatures are randomised, so tests pin verdicts, never signature bytes. The buying agent carries the signed slip, never the key; the shop's checks (signature, merchant, cap, expiry, items, nonce) run live and decide every outcome, never a recorded turn.
- **Home and share images:** the home card and the intro are the shop-around slip refused at Quarrylane's counter; the hero plot is `hatchPlot`.

## Toy vs real

The shop, its sellers, prices, caps and orders are hand-written (`HandNote`); the agent's turns are one recorded run (`RecordedNote`) or the simulated fooled agent; the checks, signatures and token rules run live. The protocols set shapes, not amounts, so only the card's address and the task's states are matched; every price and cap stays hand-set and labelled, with a real fact on the same step.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | The page's prices; the three totals in the prediction (catalogue, first price on the line, stainless) | none | Labelled: hand-written shop |
| 1 | "3 of 3 right" (recorded turns) | `webarena` (best GPT-4 agent 14.41% of real web tasks, people 78.24%) | Labelled: one recorded run on one hand-written page; the narration says agents mostly fail on real sites |
| 2 | The card's address `/.well-known/agent-card.json` | `a2a-card` | Matched: `CARD_PATH = fact('a2a-card').value` |
| 2 | The card's version; the catalogue's prices | `a2a-card` | Labelled: hand-written card and catalogue |
| 3 | The task's states and their counts (vague 5, clear 3) | `a2a-states` | Matched: `STATES = JSON.parse(fact('a2a-states').value)`; counts come from the recorded seller turns |
| 4 | The $600 cap, its doubled $1,200, six checks, the signature's first 32 characters | `ap2-mandates`, `ap2-v02` (AP2 signs a checkout mandate and a payment mandate) | Labelled: hand-set terms; the note says the slip folds AP2's two mandates into one |
| 5 | The shop-around slip's $600 cap, Quarry Lane's offer and its claimed limit | `indirect-injection`, `ap2-injection` (simple prompts reliably subverted a real AP2 agent) | Labelled: hand-written sellers; the fooled agent is simulated |
| 6 | The token's amount, one box's price, the $600 cap | `acp-spt`, `acp-allowance` (one use, up to a maximum amount, one checkout, one merchant) | Labelled: the note says the toy takes only its exact amount, a real allowance anything up to its maximum, once |
| 7 | Caps ($500, $600, $1,500), 1/7/30 days, the $600 confirm threshold, 12 of 12 right, 0 asks (pinned, `WINNERS` recomputed) | `ap2-modes` (person present approves each checkout; person away signs limits that should expire as soon as the task allows) | Labelled: hand-set bench; the note maps "ask every order" and "never ask" to AP2's two modes |
| Intro | 6 checks, 6 sellers, 6 catalogue items; the A2A version | `a2a-version` | Real (version, from the fact); the counts are the module's own hand-written data |
| Recall | "about one task in seven" | `webarena` | Real, rounded from 14.41% |
