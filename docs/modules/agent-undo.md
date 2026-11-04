# Undo for agents (`/agent-undo/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The hillside funicular** (`src/components/scenes/funicularScene.ts`, `FUNI_PARTS`): a grassy wedge of hill rising toward the back, a track of sleepers and two rails up its middle to a dark engine house with its cable wheel at the top. Four terraces are cut into the hill's left side, one per step of Ana's return, bottom to top in R6f's order: **stock** (wooden crates), **refund** (a blue till with a coin per refund paid), **post box** (a red pillar box, the letters it took lying in front, the second one edged in mustard) and **courier** (QuickPost's hut with a parcel; a failed booking crosses its front). The mustard cable car runs on the track, two stepped cabins with windows, a lamp at the front (red when the assistant stopped) and a key tag on its side when keyed. In the valley wait the assistant (the kit's model machine) and Tomás (CAST `tomas`). Words only in pills: each station's name and state (`REFUND · UNDONE`, `POST BOX · 2 LETTERS`), and the car's `STOPPED` or `KEY`.
- **Hero object: the funicular.** No other scene has a cable car or a hillside track (checked against `docs/modules/*.md` and `src/components/scenes/`). The post box is a prop on one terrace; Email's post scene draws a sorting office, not a pillar box on a hill.
- **The unique device:** each station's flag pole says what happened there by shape, colour and height, never words: done is a green flag at the top, undone a blue flag lowered to half-mast, failed a red pennant, done twice two yellow flags, a lost answer a small yellow pennant. When a step fails, the car runs back down the hill, stopping at each station to undo it (its flag comes down as the car arrives). At the post box it can't take the letter back, so a second letter goes in beside the first. With the post box moved to the top (chapter 5) the car never reaches it. Save points are short mustard pegs at a terrace's back corner; an opposite step is a round blue return sign.
- **Living scene (KTD2, `Scene<Funi>`, 1200 ms):** the car travels its route (the run's events, `routeOf`) stop by stop, pausing at each, and each stop's flag, coins and letters change as the car arrives; in chapter 5 the stations slide along the hill into their new slots. A route already travelled is never travelled again (a later change, like turning the key on, moves the car straight). Reduced motion jumps to the end; every end state shows the change without motion (the flags, the coins, the letters, the car's station and lamp).
- **Hands in the picture (KTD4):** tap the car to run (every chapter); tap the post box to try to take the email back (chapter 4, refused on the status line); drag a station to another stop along the track (chapters 5 and 7; `station:<id>` drags, `slot:<i>` drops). Dropped off a stop, it snaps back and the status line says to drop it on a stop. **Twin:** the buttons beside the stage (Run, Restart, Retry, Take it back, Send a second letter, Run all failures), and an ordered list of stations with Move up and Move down buttons (chapters 5 and 7), all through the kit's one handler, which writes the visible status line.
- **Pills outside the filter:** the live stage draws pills through `PillLayer` (`funiPills`, `bare: true` on the state); the share image keeps them inline. On phones the station names shorten (`POST`) and states become marks (✓ ↺ ✗ ×2 ✉). Mid-motion only the names show, so no state appears before its car arrives. A step's callout sits over the station's prop, clear of the name pills to its left.
- **Close-up (KTD6):** each reveal frames every part its step changed, so nothing it describes is cropped: refund to courier with the car (1), refund and post box doubled (2), the valley to the courier: undone flags, the failed courier and the car (3), the valley to the post box: two letters and the car (4), the valley to the post box on top, untouched (5), refund to courier with the car (6), the valley to the post box after the best setup, the car's KEY pill (7). A close-up spanning three stations or more is a gentle push-in: every part inside keeps its pill as at rest; a two-station one (chapter 2) shows their states alone, larger, above-left of each prop. Callouts point at their part from the right, over the open hill, never over the station above.
- **Second view:** the Log tab, the saga log: each station's step, its opposite (or the email's follow-up), whether it carries a key and a save point, and what happened.

## Chapter pictures

Each step's start frame is the previous step's end state; the status line is the step's `status` (R10a).

| Ch | Step | Picture (end state) | Motion | Hands / control | Close-up | `say` part | Status line |
|---|---|---|---|---|---|---|---|
| 1 | predict | car in the valley, bare poles | none | Predict | — | courier | The car waits in the valley below four stations, no flag flying yet. |
| 1 | run | stock, refund, post box green; courier red pennant, crossed hut; one letter; car at the courier | car climbs, flags rise one by one | tap the car, or Run | — | car | The car climbed three stations and stopped at the courier: QuickPost refused. |
| 1 | reveal | the same | zooms in | Reveal | refund, courier | — | The refund and the post box still fly green: done, and nothing undoes them. |
| 1 | quiz | the same | none | Quiz | — | — | Three steps stand below the courier’s red flag. |
| 2 | run | car at the post box, red lamp, STOPPED; three green flags | car climbs three stations and stops | tap the car, or Run | — | car | The car stopped at the post box, lamp red: stock, refund and email done. |
| 2 | predict | the same | none | Predict | — | email | The car waits at the post box with its red lamp on. |
| 2 | restart | double yellow flags on stock, refund, post box; 4 crates, 2 coins, 2 letters; courier green | car runs to the valley and climbs again | tap the car, or Restart | — | — | Stock, refund and email each happened twice, then the courier was booked. |
| 2 | reveal | the same | zooms in | Reveal | refund, email | — | Two coins on the till, two letters by the post box. |
| 2 | saves | a fresh run: pegs at every station, all green, one of each | car climbs, stops red at the post box, carries on | Save points switch, then Run | — | courier | Pegs at every station: the restart resumed at the courier, every step done once. |
| 2 | quiz | the same | none | Quiz | — | — | Every flag green, a peg at each station. |
| 3 | pick | refund ringed; return signs at stock and courier, then at the refund | none (sign appears) | `Select` + Set | — | refund | The refund now carries a blue return sign: charge the $89 back. |
| 3 | predict | three return signs | none | Predict | — | — | Three stations carry blue return signs; the post box has none. |
| 3 | run | courier red; refund and stock blue, lowered; post box green; car in the valley | car climbs, fails, runs down lowering refund then stock | tap the car, or Run | — | — | Courier failed; the car ran down lowering refund, then stock; the post box flag stays up. |
| 3 | reveal | the same | zooms in | Reveal | car, courier | — | Blue flags, lowered, at the refund and the stock. |
| 3 | quiz | the same | none | Quiz | — | — | Refund and stock undone; the email still stands. |
| 4 | run | car stopped at the ringed post box; courier red; three green flags | car climbs, fails, runs down to the post box | tap the car, or Run | — | email | Courier failed; the car ran back down to the post box and stopped. |
| 4 | unsend | the same (refused) | none | tap the post box, or Take it back | — | — | The post box won’t open: a sent email can’t be taken back. |
| 4 | predict | the same | none | Predict | — | — | The car waits at the post box, one letter inside. |
| 4 | letter | two letters, post box blue lowered; refund, stock blue lowered; car in the valley | the letter goes in; car runs on down | Send a second letter | — | — | A second letter went in; the car ran on down undoing refund, then stock. |
| 4 | reveal | the same | zooms in | Reveal | car, email | — | Two letters by the post box, its flag lowered. |
| 4 | quiz | the same | none | Quiz | — | — | Every flag lowered but the courier’s; two letters sent. |
| 5 | predict | R6f's order, return signs | none | Predict | — | email | Stations bottom to top: stock, refund, post box, courier. |
| 5 | order | post box at the top, ringed | the stations slide into their new slots | drag the post box, or Move up / Move down | — | — | The post box now stands at the top, above the courier. |
| 5 | run | courier (third) red; refund, stock blue lowered; post box bare pole, no letter | car climbs three, fails, runs down | tap the car, or Run | — | — | Courier failed; the car undid refund and stock and never reached the post box. |
| 5 | reveal | the same | zooms in | Reveal | car, email | email | The post box at the top holds no letter; its flag never flew. |
| 5 | quiz | the same | none | Quiz | — | — | Refund and stock undone; the post box untouched at the top. |
| 6 | run | car at the refund; stock green; refund yellow pennant, one coin | car climbs two stations | tap the car, or Run | — | refund | The car waits at the refund under a yellow pennant: paid, but no answer came back. |
| 6 | predict | the same | none | Predict | — | — | The car waits at the refund: one coin on the till, no answer back. |
| 6 | retry | refund two yellow flags, two coins; post box and courier green | car climbs on | tap the car, or Retry | — | — | Ana was refunded twice: two coins on the till, two yellow flags. |
| 6 | reveal | the same | zooms in | Reveal | refund, courier | — | Two coins on the till: $178 paid for an $89 drill. |
| 6 | key | a fresh run with a key tag on the car: all green, one coin | car climbs all four | Key switch, then Run | — | car | With a key the retry got the saved answer: one coin, one refund. |
| 6 | quiz | the same | none | Quiz | — | — | Every flag green, one coin on the till, a key on the car. |
| 7 | run | the opening setup's courier failure: three green, courier red | car climbs, fails | tap the car, or Run all failures | — | car | 1 of 20 ended clean; harm to the customer: 17. |
| 7 | predict | the same | none | Predict | — | email | The courier failed and nothing came undone: every flag below it still green. |
| 7 | fix | the reader's setup: order, signs, pegs, key; its courier failure | as the setup changes | switches, drag or Move up / down, Run all failures | — | — | Best: 20 of 20 clean, harm 0: post box last, every switch on. |
| 7 | reveal | the best setup: post box at the top untouched | zooms in | Reveal | car, email | — | The courier failed; refund and stock undone; the post box at the top untouched. |

Every chapter has an in-picture action (tap the car); chapter 4 adds a tap on the post box, chapters 5 and 7 a drag of the stations.

## Engine (`src/lib/agent-undo/sim.ts`)

- **The return** (`data/agent-undo/story.json`, labelled "hand-written example run"): Ana Ruiz's cordless drill, $89, four steps in R6f's order (restock, refund, email, courier), each with its opposite (the email has none: its follow-up is a second letter). The courier is QuickPost, from Tools in production.
- **Saga runner** (`run(policy, injection)`): runs the steps in the policy's order. A **fail** injection refuses its step (nothing happened); the steps done so far are undone newest first, each by its opposite if set (the email by a second letter), else left standing. A **timeout** means the step went through and its answer was lost: without a key the retry does it a second time. A **crash** after a step restarts the assistant: with save points it resumes; without, it redoes every finished step (the keys live in the log, so a restart without one sends fresh keys).
- **Scores:** a run is **clean** when nothing is left half done and nothing happened twice; **harm** counts what Ana feels: an email that turned out wrong (1 with a second letter, 2 without), a doubled email, a doubled pickup.
- **Workbench** (`score`, `solve`): 24 orders × 6 switches (four opposites, save points, key) = 1,536 setups over twenty hand-written injections (eight refusals, six lost answers, six restarts). Rule: most clean finishes, then least harm. `WINNERS` (12 setups: the post box last, every opposite but the letter, save points and key; the other three in any order, the letter free) and the best score (20 of 20 clean, harm 0) are pinned. The story's order with every switch on scores 20 clean but harm 5: the five courier refusals each reach a sent email.
- **Pins** (`data/agent-undo/pinned.json`): the half-done and letter harms, the opening, best and story-order scores, `WINNERS`. `tests/unit/agent-undo.test.ts` re-derives them, and checks the scene's end frames equal its stills.

## Toy vs real

| Chapter | Number shown | Real figure (fact id) | Matched or labelled |
|---|---|---|---|
| 1–7 | $89 refund, four steps, one customer | `saga`, `partial-undesirable` | Labelled: `ToyNote`, a hand-written example run |
| 2 | two refunds, two emails after a restart | `save-points` | Labelled: hand-written crash |
| 3 | undo order: refund, then stock | `reverse-order`, `semantic-undo` | Real rule, run by `run()` |
| 4 | two letters | `second-letter`, `missile` | Real rule (the paper's own letter example) |
| 5 | no letter with the post box last | `last-step` | Real rule, run by `run()` |
| 6 | $178 paid for an $89 drill; one coin with a key | `retry-safe`, `saved-response`, `key-age` (24 hours) | Labelled: hand-written timeout; the key's behaviour matches Stripe's docs |
| 7 | 20 failures; 1 clean, harm 17 (opening); 20 clean, harm 0 (best); 12 best setups | `saga`, `key-random` | Labelled: hand-written injections, harm a toy count |

## Links to add at go-live (U11, KTD8)

- **Neighbour links back to this module:** Agents' chapter 2 (the loop) or 7 (workbench) → "When a step fails halfway: Undo for agents"; Queues' chapter 5 (ran twice) → this module's chapter 6 (only once); Payments' chapter 4 (Pressed Pay twice) → chapter 6, and this module's chapter 6 links back to it ("the same key, at checkout"); Tools in production's chapter 3 (QuickPost changed) → chapter 1 (QuickPost refuses).
- **plain-words.ts:** none needed. `idempotency` is already flagged and is declared as a chapter 6 term ("Idempotency key"); every use of it (chapter 6's copy, its quiz, recall and the Stripe facts) sits at or after chapter 6. `saga` is declared in chapter 3.
- **Registry edit** (`src/lib/modules.ts`): import `AGENT_UNDO_MODULE` from `../content/agent-undo/module`, add it after the last live module, and remove the `planned('agent-undo', …)` card.
