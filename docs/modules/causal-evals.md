# Why did it fail? (`/causal-evals/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The inspector's bench with a wooden marble run** (`src/components/scenes/marbleScene.ts`, `MARBLE_PARTS`): eight sloped wooden chute pieces, one per step of the agent's run, stand on trestles in one falling line from a mustard start cup (back left) to a mustard sorting flap (front right). The flap drops the marble into one of two trays, **right** (mint) or **wrong** (tomato); a grey gutter under the whole line catches a marble that falls out (**nothing** sent). Inés (CAST `ines`, clipboard) inspects from the front left; the assistant whose run it is (the kit's model machine) stands behind the trays, its light following the last landing (ok, bad, warn). Words only in pills: each piece's number and step name (numbers only on phones, and only for the piece a step is about), `RIGHT`, `WRONG`, `NOTHING`, with counts in chapter 6.
- **Hero object: the marble run.** No other scene has one (checked against `docs/modules/*.md` and `src/components/scenes/`): Calibration has jars of marbles, a container; this is a wooden chute frame whose pieces are the run's steps.
- **The unique device:** the marble rolls the run's path, so a change to one piece changes where it lands. A **swapped** piece is painted blush with heavier ink; pieces whose output changed downstream carry a thick **blue stripe** (the swap's ripple), and the pieces past it whose output stayed the same fade to half strength; a piece **taken out** leaves a dashed gap over its bare trestle and lies on the floor pile, and the marble either hops the gap (a step the run didn't need) or falls through it into the gutter; a **timed-out** piece has a red gate at its end that stops the marble, and a **retry** lowers the gate and adds a mint circular arrow (the gate gone) where the marble pauses before rolling on. A timed-out piece's pill reads `TIMED OUT`, a retried one's `RETRY`, and on the workbench the named cause's pill reads `CAUSE` (ringed), with the run's name on a pill by the start cup. Batches of marbles turn the assistant's light amber when the trays are mixed. The piece a step is about carries a heavy mustard ring, which nothing else has.
- **Living scene (KTD2, `Scene<Marble>`, 1200 ms):** a changed piece drops in from above (swap) or lifts out and falls to the floor pile (taken out) during the first 30%; then the marble rolls from the cup along the pieces to its tray, the gutter or a red gate. Twenty marbles (chapter 6) roll one after another, staggered over the motion, and heap in the trays. Reduced motion jumps to the end; every end state shows the change without motion (blush piece, blue stripes, gap and floor pile, red gate with the marble against it, mint wheel, marbles in the tray, the flap turned toward it).
- **Hands in the picture (KTD4):** tap a piece to do the chapter's action on it (read it, swap and replay, time it out); in chapter 4 drag a piece onto the floor pile to take it out (a drop anywhere else snaps it back and the status line says to drop it on the pile); tap the start cup to roll. **Twin:** a piece `Select` and the chapter's buttons (Read, Swap and replay, Take out and replay, Time out and roll, Name as the cause) plus a Roll button, through the kit's one handler, which writes the visible status line.
- **Pills outside the filter:** the live stage draws pills through `PillLayer` (`marblePills`, `bare: true`); the share image keeps them inline. A piece's callout sits to its left, clear of its name pill (above and right).
- **Close-up (KTD6):** piece 8 and the wrong tray (1), blush piece 8 and the wrong tray (2), the cause piece 3 and the right tray (3), piece 2's gap and the wrong tray (4), piece 5's red gate (5), the two trays (6), the kettle run's cause and the right tray (7).
- **Second view:** the Replays tab, a table of every replay in the chapter: the change, the outcome, how many replays.

## Chapter pictures

Each step's start frame is the previous step's end state; the status line is the step's `status` (R10a).

| Ch | Step | Picture (end state) | Motion | Hands / control | Close-up | `say` part | Status line |
|---|---|---|---|---|---|---|---|
| 1 | roll | the marble in the wrong tray; the model's light red | the marble rolls all eight pieces | tap the start cup, or Roll | — | start | The marble rolled all eight pieces and dropped into the wrong tray. |
| 1 | pick | piece 4 ringed; its step under the stage | the ring lights (the close-up waits for it, as for a motion) | tap piece 4, or Select + Read | — | — | Piece 4 is ringed: it picked B-50, the top result. |
| 1 | predict | the same | none | Predict | — | p4 | Piece 4 stays ringed; the marble sits in the wrong tray. |
| 1 | send | piece 8 ringed | the ring lights (the close-up waits for it, as for a motion) | tap piece 8, or Select + Read | — | — | Piece 8 is ringed: it sent B-50 to 14 Elm Road. |
| 1 | reveal | the same | zooms in | Reveal | p8, wrong | — | Close in on piece 8 and the wrong tray, where B-50 landed. |
| 1 | quiz | the same | none | Quiz | — | — | The marble rests in the wrong tray. |
| 2 | predict | the marble in the wrong tray; piece 8 ringed | none | Predict | — | p8 | Piece 8 is ringed: the step that sent B-50. |
| 2 | swap | piece 8 blush; the marble in the wrong tray | piece 8 drops in; the marble rolls | tap piece 8, or Swap and replay | — | — | Piece 8 is blush now, and the marble dropped into the wrong tray again. |
| 2 | reveal | the same | zooms in | Reveal | p8, wrong | — | Close in on blush piece 8 and the wrong tray. |
| 2 | quiz | the same | none | Quiz | — | — | The marble rests in the wrong tray beside blush piece 8. |
| 3 | note | piece 7 blush and ringed; wrong tray | piece 7 drops in; the marble rolls | tap piece 7, or Select + Swap and replay | — | — | Piece 7 is blush; the marble still dropped into the wrong tray. |
| 3 | predict | the same | none | Predict | — | wrong | Piece 7 is blush; the marble waits in the wrong tray. |
| 3 | search | piece 3 blush; blue stripes on 3, 4, 5 and 8; right tray; model green | a piece drops in; the marble rolls (per swap tried) | tap pieces, or Select + Swap and replay | — | — | Piece 3 is blush, blue stripes run on to piece 8, and the marble landed right. |
| 3 | reveal | the same | zooms in | Reveal | p3, right | — | Close in on blush piece 3 and the right tray. |
| 3 | quiz | the same | none | Quiz | — | — | The marble rests in the right tray below blush piece 3. |
| 4 | predict | piece 2 ringed; the marble in the cup | none | Predict | — | p2 | Piece 2 is ringed: Dana’s order, an L40 mower. |
| 4 | order | piece 2 a dashed gap, the piece on the floor pile; wrong tray | piece 2 lifts out to the pile; the marble rolls, hopping the gap | drag piece 2 to the pile, or Select + Take out and replay | — | — | Piece 2 lies on the floor; the marble hopped its gap into the wrong tray. |
| 4 | reveal | the same | zooms in | Reveal | p2, wrong | — | Close in on piece 2’s empty slot and the wrong tray. |
| 4 | search | piece 2 back; piece 3 a gap; the marble in the gutter | piece 3 lifts out; the marble falls through the gap | drag, or Take out and replay | — | — | Piece 3 lies on the floor; the marble fell through its gap into the gutter. |
| 4 | quiz | the same | none | Quiz | — | — | Piece 3 stays on the floor; the marble rests in the gutter. |
| 5 | roll | piece 3 blush; right tray | the marble rolls | tap the start cup, or Roll | — | p3 | Piece 3 is blush and the marble landed in the right tray. |
| 5 | predict | piece 5 ringed | none | Predict | — | p5 | The marble rests in the right tray; piece 5 is ringed. |
| 5 | fault | a red gate at piece 5's end, the marble against it; model amber | the marble rolls and stops | tap piece 5, or Time out and roll | — | — | A red gate closed piece 5, and the marble stopped against it. |
| 5 | reveal | the same | zooms in | Reveal | p5, model | — | Close in on piece 5: the marble waits at the red gate. |
| 5 | retry | the gate down, a mint wheel at piece 5; right tray | the marble pauses at piece 5, then rolls on | Add a retry and roll | — | — | A mint wheel sits at piece 5; the marble paused there, then landed right. |
| 5 | quiz | the same | none | Quiz | — | — | The mint wheel stays at piece 5; the marble rests in the right tray. |
| 6 | once | piece 7 blush; one marble in the right tray (fresh dice) | the marble rolls | tap the start cup, or Roll once | — | start | Piece 7 is blush, and this one marble landed in the right tray. |
| 6 | predict | the same | none | Predict | — | start | One marble sits in the right tray beside blush piece 7. |
| 6 | twenty | 4 marbles in the right tray, 16 in the wrong; counts on the tray pills | twenty marbles roll one after another | Roll 20 | — | — | 4 marbles in the right tray, 16 in the wrong, piece 7 still blush. |
| 6 | reveal | the same | zooms in | Reveal | right, wrong | — | Close in on the trays: 4 right, 16 wrong. |
| 6 | search | piece 3 blush; all 20 in the right tray | piece 3 drops in; twenty marbles roll | Swap 3, roll 20 | — | — | Piece 3 is blush and all 20 marbles landed in the right tray. |
| 6 | quiz | the same | none | Quiz | — | — | All 20 marbles rest in the right tray. |
| 7 | replay | the chosen run with the swapped piece; its tray | a piece drops in; the marble rolls | run `Select`; tap a piece, or Select + Swap and replay | — | frame | One replay spent: the marble shows where that swapped run landed. |
| 7 | predict | the same | none | Predict | — | — | Your replays so far wait in the Replays tab. |
| 7 | solve | as the reader works; a named cause ringed | per replay | Swap and replay, Name as the cause | — | — | All 4 causes named: Search, Look up, Row, Read. |
| 7 | reveal | the kettle run fixed: piece 2 blush, the right tray | zooms in | Reveal | p2, right | p2 | The kettle run, fixed: piece 2 blush, the marble in the right tray. |

Every chapter has an in-picture action: tap a piece (1, 2, 3, 5, 7), drag a piece out (4), tap the start cup (1, 5, 6).

## Engine (`src/lib/causal-evals/`)

- **Runs** (`runs.ts`, `data/causal-evals/runs.json`): four hand-written failed runs of eight steps each (the KTD5 cap), written from Who&When's failure patterns and labelled "hand-written example run", never recorded. Each step writes one slot: `as` is what the run wrote, `alt` what a swap writes instead (`=` copies the slot it reads). A step that reads a slot recomputes from it: a `map`, else weighted `odds` rolled with the run's dice (mulberry32 from `src/lib/transformers/sample.ts`), else `as`; `needs` lists slots that must exist or it writes nothing.
- **Replay** (`replay(run, change, seed)`): reruns every step with one change (or a few at different steps): swap, remove (ablation) or timeout (with or without retry). A timeout with no retry halts the run (`stuck`). The outcome is the last slot against the run's right answer: right, wrong, or none.
- **Cause** (`causeOf`): Who&When's decisive error, the earliest step whose swap turns the failure into a success, required in all 20 seeded replays so luck never counts. Each run has exactly one such step (`fixers`, tested): the blade run's search (3), the kettle run's look-up (2), the hours run's row (6), the paint run's read (1). None is the last step.
- **Many runs**: seeds 1–20 (`SEEDS`). Only the blade run's pick rolls dice (B-50 0.7, B-40 0.3, when the search returns both). Nothing changed: 4 of 20 right; the note swapped: the same 4; the search swapped: 20 of 20. Seed 2 is the first fresh dice on which the note swap lands right (the lucky replay). The hand-written run's own dice are seed 0.
- **Budget** (`spend`): 12 replays across the workbench's four runs; the 13th is refused with a reason on the status line.
- **Pins** (`data/causal-evals/pinned.json`): the four causes, the last-step swap's outcome, the ablation and fault outcomes, the 20-replay counts, the lucky seed, the budget. `tests/unit/causal-evals.test.ts` re-derives them.

## Toy vs real

| Chapter | Number shown | Real figure (fact id) | Matched or labelled |
|---|---|---|---|
| 1 | 8 steps, B-50 vs B-40 | `who-when-size` (184 failed tasks from 127 systems) | Labelled: `ToyNote`, hand-written run, made-up parts |
| 2 | — (the last step's swap still wrong) | `step-accuracy` (best method finds the failing step 14.2% of the time) | Real figure, cited; the toy's outcome is hand-written |
| 3 | the cause at piece 3, five pieces before the end | `decisive-error` (fix it and the run succeeds; the earliest is the cause) | Real definition, run by `causeOf()` |
| 4 | — (wrong without piece 2, nothing without piece 3) | `label-hours` (about 84 hours to label causes by hand, 15–30% unsure) | Labelled: hand-written run |
| 5 | — (stuck at piece 5, right with a retry) | `chaos-events`, `chaos-monkey`, `chaos-definition` | Real practice, retold; the toy's timeout is hand-set |
| 6 | 4 / 4 / 20 of 20 right | `pass-k` (gpt-4o under 25% on all 8 tries, retail), `reasoning-models` | Labelled: `ToyNote` says a weighted dice roll stands in for the model's pick |
| 7 | 4 runs, 12 replays | `decisive-error`, `step-accuracy` | Labelled: hand-written runs |

## Links to add at go-live (U11, KTD8)

- **Neighbour links back to this module:** Evals' chapter on comparing versions (a failed eval case) → this module's chapter 3 ("when one case fails, find the step that caused it"); Observability's trace chapter ("Some customers got wrong answers yesterday. Each bad reply has a trace behind it.") → chapter 1 (the run as a trace you can replay); Agents' chapter on the loop failing → chapter 2; Multi-agent's "Trusting a helper" (MAST) → chapter 6's Who&When fact.
- **plain-words.ts:** none needed. `Seeded replay` is declared as chapter 6's term (covering `seeded`); the copy avoids `deterministic`, `stochastic`, `heuristic` and `latency`.
- **Registry edit** (`src/lib/modules.ts`): import `CAUSAL_EVALS_MODULE` from `../content/causal-evals/module`, add it after the last live module, and remove the `planned('causal-evals', …)` card.
