# Payments (`/payments/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The tube exchange** (`src/components/scenes/tubeScene.ts`): five buildings in a ring, joined by pneumatic glass tubes on posts: the customer's wallet (a masked card standing in it, no number drawn), Larkspur's till, the acquirer (a bank, cobalt roof), the card network's steel tower and the issuer (a bank, mint roof). By day, capsules ride the tubes coloured by message (a request cobalt, a yes mint, a no tomato, a challenge mustard, a capture blush, a refund or chargeback), three at most per kind and tube, and the wallet holds a paper receipt per charge (`data-charges`). The new mechanic is time of day, set by the run's clock alone (no reader toggle): a night tick (`isNight`, after the cut-off) swaps to the night palette (`NIGHT`, named in the scene: a navy board, dusk walls, lit windows), the stage frame takes the night sky (`.pm-stage[data-night]`, a fade only when motion is allowed), a coin convoy stands on the ground from the issuer to Larkspur, and a fee jar by each fee party fills in proportion to its fees so far. The night colours live in the scene and `payments.css`, not `tokens.css` or `PALS`, so `core.js` and the shared tokens stay untouched. `tubeAt` reads the exchange off one tick of a run (optionally for some orders), `hopAt` one authorisation hop by hop (`journeyOf`). `PaymentsStage` (`src/content/payments/kit.tsx`) puts it one tab from the Ledger (`ledgerView.ts`: a row per order, a column per party, every row summing to zero, a table in a focusable region). Chapters 2–7 keep the tab in the step state; on phones the pills keep just the names and the caption carries the money.

## Engine (`src/lib/payments/`)

- **A day simulator over hand-written orders, nothing measured** (KTD7). `sim.ts` runs `data/payments/day.json` (18 orders on day 1 in three kinds: small orders, drill presses and split baskets; every card a masked fixture, `•••• ` and four made-up digits, a test failing on any longer digit run) through authorise, capture, settle and dispute under a setting per kind, over `days` days of two ticks each (by day, then the night's settlement at the cut-off). Money is integer cents throughout; every ledger entry sums to zero, and a test proves customers pay exactly Larkspur's credit plus every fee.
- **Authorise holds, capture charges.** An approval places a hold; capture at order takes all of it, capture at shipment each parcel (a split basket captures only what shipped). A hold lapses after `holdDays` (Larkspur's assumption, labelled); a parcel shipped later needs a new authorisation, which can be declined (`reauthDeclines`). Parts never shipped are refunded when captured at order.
- **Fees**: interchange at the EU caps, read off facts `ifr-debit` and `ifr-credit` (rounded down so it never passes them; Larkspur's assumption that issuers charge the cap); the scheme and acquirer fees and the chargeback fee are labelled planning numbers in `data/payments/assumptions.json`. Fees are kept on refunds and chargebacks (an assumption).
- **3-D Secure** per kind: `always` challenges every order, `risk` only those the issuer flags (`risky`, the rest frictionless), `never` asks for an exemption, granted only at or under the low-value limit (`LOW_VALUE`, read off fact `low-value`); above it the issuer challenges anyway. Honest customers flagged `abandons` give up when challenged; a thief passes or fails (`fraud.passes`). An authenticated payment's fraud falls on the issuer (fact `liability-shift`, Visa's dispute protection); an exempt one is charged back to Larkspur with the fee.
- **Retries**: a `timeout` order is sent twice; without an idempotency key the issuer sees two payments, both captured, and the duplicate is disputed `noticeDays` later.
- **Chapter 7's workbench** (`workbench.ts`): a setting per kind (3 × 2 × 2, so 1,728 policies). A policy meets the owner's rule (`data/payments/workbench.json`: no customer charged twice, Larkspur's fraud loss within the limit) and scores what Larkspur keeps. `WINNERS` (one today) and `BEST` are pinned in `data/payments/pinned.json` with the reference day's counts; `payments-sim.test.ts` and `payments-workbench.test.ts` recompute them (`WRITE_PINNED=1` rewrites).
- **Facts about card payments** (EU rules only, R18) come from `data/payments/facts.json` with source and access date: the IFR caps and four-party definition, PSD2's SCA and its two-factor definition, the RTS's low-value and risk-analysis exemptions, EMVCo 3-D Secure, Visa's dispute protection and dispute categories, Visa's authorisation holds and their 10-day limit online, Visa's 120-day fraud dispute window, the ECB on settlement, PCI masking and the idempotency-key draft. No provider is named as the place to take payments, and no fee is any provider's.

## Toy vs real

Every chapter shows the simulated day's money (Larkspur's hand-written orders), with `SimNote` beside it. The hold length and the dispute timing stay short on purpose: a 10-day hold would outlast the drill press, which ships 9 days after the order (chapter 2's and chapter 7's lesson, and the pinned WINNERS), and a 120-day dispute would not fit the 13-day clock.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | Ana's €24.00 hinge pack | four-party | labelled (hand-written order, `SimNote`) |
| 1 | Message n of N on the way to the issuer and back | four-party | real (the path through the four parties and the network) |
| 2 | Mona's basket, the brackets' share, Finn's hooks | hold | labelled (hand-written orders, `SimNote`) |
| 2 | A hold lapses after 7 days (`holdDays`) | hold-days (Visa: 10 days online) | labelled (`Assumed hold`, kept shorter than the real limit) |
| 2 | Hotel quiz: €200 held, €150 charged | hold | labelled (a made-up example in the question) |
| 3 | Interchange 0.2% debit, 0.3% credit | ifr-debit, ifr-credit | matched (`feesOn` reads the facts) |
| 3 | Ana's net after fees, the fee jars' totals | ifr-debit, settlement | labelled (network and acquirer fees are planning numbers, `Assumed fees`) |
| 3 | Bakery quiz: €10 cake, €0.02 at most | ifr-debit | matched (computed from the fact's value) |
| 3 | Clock: day 09:00, settlement at 22:00 | settlement | labelled (Larkspur's cut-off, `SimNote`) |
| 4 | Ben's €18.50, one or two charges | idempotency | labelled (hand-written order) |
| 4 | €15 chargeback fee, duplicate noticed 3 days later | idempotency | labelled (`Assumed chargeback`, planning numbers) |
| 5 | €30 small-payment limit (which orders may skip the check) | low-value | matched (`LOW_VALUE` reads the fact) |
| 5 | Which customers give up when challenged | 3ds, sca-factors | labelled (`Assumed abandon`, hand-written) |
| 6 | Noor's padlock, Kai's drill press, who loses what | liability-shift | labelled (hand-written orders) |
| 6 | Dispute lands days after the order | dispute-window (Visa: 120 days) | labelled (`Assumed dispute`) |
| 6 | €15 chargeback fee | dispute-groups | labelled (`Assumed chargeback`) |
| 7 | What Larkspur keeps, the best total, how many settings tie | tra | labelled (simulated day, `SimNote`) |
| 7 | €50 fraud limit | tra | labelled (the owner's rule, `workbench.json`) |
| 7 | Ticket quiz: €5 passes, €900 packages | low-value, tra | labelled (a made-up example in the question) |
| Intro | 18 orders, 13 days, 1 best set of settings | four-party | labelled (simulated day) |
| Intro | 5 parties | four-party | real |
