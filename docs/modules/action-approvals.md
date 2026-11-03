# Approvals and permissions (`/action-approvals/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **Larkspur's refund office** (`src/components/scenes/tollScene.ts`, `TOLL_PARTS`): mail waits in a crate at the back; delivered letters land in the in-tray on a side table; the assistant (the kit's model machine) reads them at its desk and writes refund slips (a slip with a coin on top), which roll down a dark lane to a **toll booth with a boom barrier**. Rosa (CAST `rosa`) keeps the booth from behind a counter. A slip that needs a yes waits at the barrier beside a ringed hourglass at the counter's front; flipping it is her yes, and the flipped hourglass stays on the counter as a **pass**, its sand running down (spent: empty top, tomato ends). A glass tube of coins beside the counter is the day's running total, with a tomato ring at the budget. Paid slips land in the mint bin past the barrier, stopped ones in the tomato tray in front. Words live only in pills (`tollPills`, drawn outside the ink filter through `PillLayer`).
- **Hero object: the toll booth with its boom barrier and an hourglass per pass.** No other scene has one (checked against `docs/modules/*.md` and `src/components/scenes/`): Releases' signal box has level-crossing barriers on a railway, Tool calling's office a barrier across a belt; neither has a booth, hourglasses or a coin tube.
- **Unique device: dye.** Text from outside Larkspur is violet. When the assistant reads a violet letter, the dye runs down the pipe from the in-tray to the machine (its screen shows `???`), and every slip it writes after is violet; when a violet slip leaves the desk the dye runs on down the pipe to the lane. Rosa's own words stay cream. In chapter 6 a grey reader machine with no tools sits behind a glass wall by the in-tray; the dye stops at it, and only a violet summary reaches the desk.
- **Living scene (KTD2, `Scene<Toll>`), 1,000 ms per change:** a letter flies from the crate to the in-tray (0–0.3); the dye runs to the reader (0.2–0.45); a newly flipped hourglass turns over (squashes and swaps its sand, 0–0.35); slips roll from the machine, or from where they were, to their place, the barrier rising while any slip passes it (0.35–0.85); the dye runs on to the lane (0.4–0.65); the coins rise (0.6–1); a pass's sand drains across the whole change. Reduced motion lands on the end state at once; `tollScene(s, s, 1)` equals `tollStill(s)` (tested). The end state shows everything the motion did: dye as colour, slips where they landed, sand left, coins.
- **Hands in the picture (KTD4):** drag the top letter from the crate into the in-tray (`HitLayer`: `letter` drag, `tray` drop; a press without a drag delivers too), and tap the counter to flip the waiting hourglass (`hourglass` tap = Approve). A letter dropped anywhere else snaps back and the status line says to drop it in the in-tray. **Twin:** Deliver the next letter, Approve and Refuse buttons beside the stage, through the kit's one `act` handler, which writes the visible status line (refusals included). Chapter-only controls (Turn on the dye rule, Wait an hour, the workbench's three `Select`s) sit in the step card.
- **Close-up (KTD6):** on each reveal step, on the part that answers the prediction (table below). Reveal steps carry no callout: the close-up's own pill names the part.
- **Second view:** the Table tab, the taint table: each action, what the assistant read to write it, its dye, and its outcome (paid, paid on an earlier yes, waiting, stopped by the budget, refused; or stays/leaves Larkspur in chapter 3).

## Chapter pictures

Each step's start frame is the previous step's end state; the status line is the step's `status` (R10a).

| Ch | Step | Picture (end state) | Motion | Hands / control | Close-up | `say` part | Status line |
|---|---|---|---|---|---|---|---|
| 1 | deliver | a cream refund waits at the barrier; the ringed hourglass at the counter | letter to in-tray, slip rolls to the barrier | drag the letter, or Deliver | — | gate | A refund waits at the barrier beside an hourglass for Rosa’s yes. |
| 1 | approve | the saw refund in the paid bin; a full hourglass (pass) on the counter | hourglass flips, barrier lifts, slip rolls to the bin, coins rise | tap the hourglass, or Approve | — | hourglass | The barrier rose: the saw refund lies in the paid bin, and a pass stands on the counter. |
| 1 | rush | three refunds in the paid bin, three passes | twice: letter in, slip to the barrier, flip, slip to the bin | Deliver + Approve ×2 | — | paid | All three of the morning’s refunds lie in the paid bin. |
| 1 | predict | as above | none | Predict | — | — | The paid bin holds three refunds; the barrier is down. |
| 1 | reveal | the fake order-88 slip ringed, raised and banded red in the paid bin | none (zooms in) | Reveal | paid | — | The fake order-88 refund is ringed and marked red in the paid bin. |
| 1 | quiz | as above, unzoomed | none | Quiz | — | — | The fake refund stays in the paid bin with the good ones. |
| 2 | note | Rosa's cream refund in the paid bin; pipes grey | letter in, slip through the barrier | drag or Deliver | — | tray | Rosa’s cream refund for order 12 rolled through to the paid bin. |
| 2 | email | a violet refund beside the cream one; both pipes violet | violet letter in, dye down pipe 1, violet slip through the barrier, dye down pipe 2 | drag or Deliver | — | model | The violet dye ran down both pipes, and a violet refund for order 88 reached the paid bin. |
| 2 | predict | as above | none | Predict | — | — | One cream and one violet refund lie in the paid bin. |
| 2 | reveal | the violet slip ringed in the paid bin | none (zooms in) | Reveal | paid | — | The violet order-88 refund is ringed in the paid bin beside Rosa’s cream one. |
| 2 | rule | a fresh office; the violet refund in the stopped tray | letter in, violet slip waits at the barrier, then rolls to the stopped tray | Turn on the dye rule, Deliver, Refuse | — | gate | The violet order-88 refund lies in the stopped tray, refused at the barrier. |
| 2 | quiz | as above | none | Quiz | — | — | The violet refund stays in the stopped tray. |
| 3 | request | a cream letter in the in-tray; a cream note on the desk | letter in, note out of the machine onto the desk | drag or Deliver | — | desk | Rosa’s request is cream, and so is the note the assistant wrote on its desk. |
| 3 | predict | as above | none | Predict | — | — | One cream note lies on the desk; the email waits in the crate. |
| 3 | reveal | violet letter in the tray; on the desk a violet refund, log line and reply (envelope) beside the cream note | letter in, dye to the machine, three violet slips onto the desk | Reveal (plays on entry) | desk | — | The refund, the log line and the reply are violet; only the first note is cream. |
| 3 | trifecta | the reply ringed and banded red | none | pick the one that leaves | — | desk | The violet reply to billing is ringed and marked red: it carries order 88’s card details out. |
| 3 | quiz | as above | none | Quiz | — | — | Three violet things lie on the desk, the reply marked red. |
| 4 | first | one £60 refund paid; coins at £60 under the tomato ring at £150 | letter in, slip waits, flip, slip to the bin, coins rise | Deliver + Approve | — | coins | £60 of the £150 budget is spent: the coins rose under the tomato ring. |
| 4 | second | two refunds paid; coins at £120; the first pass run out | the same; the first pass's sand drains | Deliver + Approve | — | coins | £120 of £150 spent: the coins sit just under the tomato ring. |
| 4 | predict | as above | none | Predict | — | — | Two refunds lie in the paid bin; the coins stand at £120. |
| 4 | reveal | the third refund in the stopped tray; coins still at £120 | letter in, slip rolls straight to the stopped tray (nobody asked) | Reveal (plays on entry) | coins, stopped | — | The third £60 refund lies in the stopped tray; the coins stay at £120, under the ring. |
| 4 | quiz | as above | none | Quiz | — | — | The third refund stays stopped, the coins under the ring. |
| 5 | approve | saw refund paid; a full hourglass for order 41 | letter in, slip waits, flip, slip to the bin | Deliver + Approve | — | hourglass | A full hourglass for order 41 stands on the counter; the saw refund is paid. |
| 5 | other | the order-88 refund in the stopped tray | letter in, slip waits despite the pass, then to the stopped tray | Deliver + Refuse | — | gate | The order-88 refund waited despite the pass, and now lies in the stopped tray. |
| 5 | wait | order 41's hourglass empty, with tomato ends | the sand runs down | Wait an hour | — | hourglass | The sand ran down: order 41’s hourglass is empty, with tomato ends. |
| 5 | predict | as above | none | Predict | — | — | The empty hourglass stands on the counter; nothing waits at the barrier. |
| 5 | reveal | the second order-41 refund waits at the barrier beside a fresh ringed hourglass | letter in, slip to the barrier | Reveal (plays on entry) | gate, hourglass | — | The second order-41 refund waits at the barrier; the run-out pass let nothing through. |
| 5 | quiz | as above | none | Quiz | — | — | The second order-41 refund still waits at the barrier for a fresh yes. |
| 6 | one | one mind: violet letter read; a violet order-88 refund waits at the barrier | letter in, dye to the machine, slip to the barrier | drag or Deliver | — | gate | With one mind, the email’s order became a violet refund waiting at the barrier. |
| 6 | predict | two minds: a grey reader behind glass by the in-tray; nothing written | the refund goes; a reader appears behind glass | Predict | — | reader | A grey reader sits behind glass by the in-tray; the planner sits at the desk. |
| 6 | reveal | violet letter read by the reader; only a violet summary on the desk; barrier empty | letter in, dye to the reader, summary onto the desk | Reveal (plays on entry) | reader, desk | — | Only a violet summary lies on the desk for Rosa; no refund reached the barrier. |
| 6 | quiz | as above | none | Quiz | — | gate | The barrier stays empty; the violet summary waits on the desk for Rosa. |
| 7 | bench | the week under the chosen rules: harm slips banded red wherever they landed | slips move between bin and tray as rules change | three `Select`s | — | paid | The week replays under your rules: harm marked red wherever it landed. |
| 7 | tune | the winning rules: all three harm slips in the stopped tray | as above | three `Select`s, Show me | — | stopped | Every harmful refund lies in the stopped tray, every good one in the paid bin. |
| 7 | quiz | as above | none | Quiz | — | — | The week ends with all harm stopped and Rosa asked as little as possible. |

## Engine (`src/lib/action-approvals/gate.ts`)

- **A hand-written example week** (`data/action-approvals/week.json`, labelled so in the copy, never "recorded"): Rosa's own request and seven letters, three of them harm: a fake billing refund (obvious to a reader), the third of three £60 refunds on a £120 order (not obvious: only the total is wrong), and a stranger asking to refund order 41 again (obvious).
- **The booth**, per refund, in order: the day's running total (stopped if it would pass the budget, before anyone is asked); then, if the policy asks about it (none, dyed, all), an earlier yes for that order still in date waves it through, else it waits for a person. A yes leaves a pass for that order (one hour, or forever).
- **The hand-set approver** (workbench only): reads the first `fatigue` (3) prompts of a day closely and refuses an obvious harm; after that, clicks yes. Labelled a toy rule.
- **Dye** (`dyeOf`): over one task's turns (`data/action-approvals/run.json`, a hand-written example run), each written action carries every outside source read before it. **Two minds** (`minds`): one mind turns each letter into a refund; two minds plan only Rosa's request and hand the mail to a reader as a summary.
- **Pins** (`data/action-approvals/pinned.json`): the dye per action, the budget case, every policy's score over the week, and the workbench `WINNERS` (computed: all harm stopped, every good refund paid, fewest prompts; one winner: dyed refunds wait, £150 a day, one-hour passes). `tests/unit/action-approvals.test.ts` re-derives them.

## Toy vs real

| Chapter | Number shown | Real figure (fact id) | Matched or labelled |
|---|---|---|---|
| 1 | 40 prompts a day (hand-set) | `approval-fatigue`, `click-ok` (no count) | Labelled: `ToyNote` |
| 1–7 | refund amounts, orders (hand-written week) | — | Labelled: `ToyNote` |
| 4 | £150 budget, £60 refunds, £120 order | `spend-total` (Stripe's limits are per interval, set by the user) | Labelled: `ToyNote` |
| 5 | one-hour pass | `approval-lasts` (Claude Code: until session end, or permanent per command) | Labelled: `ToyNote` |
| 6 | — | `camel-cost` (77% vs 84%, AgentDojo) | Matched: the intro reads its `value` |
| 7 | harm stopped, good paid, prompts (computed over the hand-written week) | `human-loop` | Labelled: `ToyNote` (the approver's 3-prompt rule is a toy) |

## Links to add at go-live (U11, KTD8)

- **Neighbours linking back here:** Agent sandboxing ch. 6 "Fewer prompts, same safety" → `/action-approvals/01-the-approve-button/` (approval fatigue at a booth); Prompt injection & guardrails ch. 4 "The lethal trifecta" → `/action-approvals/03-following-the-dye/` (which actions the trifecta reaches); Computer use ch. 5 "Ask before you pay" → `/action-approvals/05-approvals-run-out/` (a yes that runs out).
- **This module links out** (already in its copy): ch. 1 → `/sandboxing/06-fewer-prompts/`; ch. 3 → `/guardrails/04-the-trifecta/`.
- **Plain words:** none needed. The copy avoids every flagged word ("exfiltration", "payload", "idempotent"); its own terms (Approval, Dye, Trifecta, Budget, Pass, Planner, Reader, Prompt) are chapter terms.
