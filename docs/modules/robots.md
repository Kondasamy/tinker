# Robots that act (`/robots/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The parts bay** (`src/components/scenes/clawScene.ts`, the hero object): a gridded parts bin under a gantry. Four posts carry two mustard rails along the bin's columns; a bridge rides them to the claw's column, a dark trolley rides the bridge to its row with a camera on its side, and the claw gripper hangs from it on a cable, its four fingers closing while it holds the part. Crates fill whole cells; the part is a cobalt flanged bushing; the mint goal tray stands on a short post just past the bin's right wall, at its row. Mira (`CAST.mira`) stands at the bay; the model machine (the policy) sits beside it, its screen the last replay's outcome (`ok` done, `warn` stuck, `bad` off the grid). The claw's path so far is a line on the bin floor.
- **Poor light** (`light` under 1, the real bins of chapters 6 and 7) dims the whole bay with a cobalt wash, the way the camera sees it.
- **Words only in pills**: the claw's pill (`YOU` at the wheel, `POLICY` while replaying, then `DONE`, `STUCK` or `OFF GRID`) and `TRAY` on desktop. `esc()` on every pill.
- **Parts for callouts** (`CLAW_PARTS`): `claw`, `camera`, `part` (while it lies in the bin), `tray`, `crate` (the first), `bin`, `mira`, `machine`.
- **The Camera tab** (the second view): the camera grid as a table (crate, part, tray and claw cells; the part missing when the light hides it), the state the policy reads in words (`obsText`), and the action log, latest last. Read off the same state as the picture.
- **Drive the claw** (`DriveBench`, `src/content/robots/kit.tsx`): four arrow buttons and Grip (Drop while holding) in one labelled group; the arrow keys and G work while focus is inside the group, and only then is the default (page scroll) prevented. Hand over is `aria-disabled` with its one-line reason until one demo is finished; it replays the policy on the chapter's fresh bin, a frame every 180 ms, stopping at the step cap (stuck), off the grid or done. Try again goes back to driving with the demos kept; Take the wheel (chapter 5) drives from where the replay stopped, and each move there is recorded as a correction. Every target is at least 44 px on phones.
- **Read-out**: one polite `role="status"` line under the controls, set on each press (moved, bumped, gripped, a demo done, off the grid) and at a replay's start and end, never per frame.
- **Reduced motion:** a replay shows its last frame at once; the claw always jumps cell to cell.
- **Home and share images:** the intro and home card are Mira's first demo with the part in the tray; the hero plot is `clawPlot`, the gantry over the bin set down small.

## Chapter pictures

| # | Chapter id | Picture | Mechanic live | Step's control | `say` parts |
|---|---|---|---|---|---|
| 1 | `01-see-decide-move` | Training bin 1, the claw driven a press at a time | yes: drive (no Hand over) | the pad | `claw`, `tray` |
| 2 | `02-what-the-camera-gives` | The same bin; the Camera tab's grid and state | yes: drive | the Camera tab, then the pad | `camera`, `crate` |
| 3 | `03-rules-break` | Bin A, then bin B, the rule replayed blind | no: Run on bin A / B | the run buttons | `claw`, `part` |
| 4 | `04-show-it` | The reader's demo bins, then the fresh bin replayed | yes: drive, Hand over, Try again | the pad, then Hand over | `claw`, `machine` |
| 5 | `05-mistakes-snowball` | Bin C replayed with the forced slip, stalled past the part | yes: Hand over, Take the wheel | Hand over, then the pad | `claw`, `part`, `machine` |
| 6 | `06-practice-in-a-game` | One dim real bin replayed under the chosen practice | no: Practice radios, Test | the Practice radios and Test | `machine`, `camera` |
| 7 | `07-workbench` | Real bin 1 replayed under the bench's setup | Run bin 1, as exploration | the bench's three radio groups | `machine`, `tray` |

## Engine

- **The world** (`src/lib/robots/world.ts`, KTD5): an 8 × 6 bin, the claw parked at the back corner, four crates, the part at least two columns in, the tray at `(W, row)`. A move into a crate or wall bumps in place; past the edge (not into the tray) ends off the grid; a slip carries one cell further when that cell is free. Layouts come from seeds and are redrawn until the expert clears them.
- **The state** is what the camera gives: holding or not, the target's direction as −1/0/1 on each axis, and the four neighbours blocked. In light outside the detector's range the part is not seen and reads as under the claw.
- **The expert** is a careful driver who reads only the camera: across towards the target if free, else up or down towards it, else round the crate. Mira's demos (`data/robots/demos.json`) are its moves on the eight training bins, pinned.
- **The policy** (`policy.ts`) is nearest neighbour over (state → action) pairs: lookup, never training (R3). Ties go to the earliest pair.
- **Corrections** (`dagger.ts`, DAgger, Ross et al. 2011, cited): run the policy, label every distinct frame it reached with the expert's move, add them. **Practice** (Tobin et al. 2017, cited): the expert on twelve crate-free simulated bins, slips at 25% and the light spread over 0.4–1.2 when varied; the camera's detector widens to every light practised under.
- **The real bay** (chapters 6–7): the 20 held-out bins, each with its own seeded light in 0.5–1.1 and 15% slips. Every effect is counted over all 20 (bins cleared, and the median steps with a miss counted at the cap), never one bin.
- **Pins** (`data/robots/pinned.json`, `WRITE_PINNED=1` rewrites it and the demos): the rule on bins A and B, the clean held-out score for 1/2/4/8 demos, the forced slip (clean, slipped, corrected, corrections), practice per kind, and the workbench's results and `WINNERS` (most bins cleared, then fewest labels).

## Toy vs real

Every count below is the simulated bay's (`SimNote` on every chapter says so, with the real bay's slip rate); the cited fact on the same step is the real figure it stands beside. The bay is a grid world on purpose (KTD5): cells, steps and bins have no real unit, so only the loop rate is matched.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | RT-1 looks and acts 3 times a second (predict, reveal, intro) | `rt1-loop` | Matched: `RT1 = Number(fact('rt1-loop').value)` |
| 1 | ALOHA sets its joints 50 times a second (quiz step, intro) | `aloha-loop` | Matched: `ALOHA = Number(fact('aloha-loop').value)` |
| 1 | One press is one see, decide, move; a demo's steps in the read-out | `rt1-loop` (a real loop runs on its own, 3 a second) | Labelled |
| 2 | The 8 × 6 camera grid; the action count in the log | `transparent-depth` (where a real camera's picture fails) | Labelled |
| 3 | The rule's move count (bin A) | `hand-designed-grasp` (hand-designed grasping failed 35% on new objects, learned 20%) | Labelled: the toy rule is blind, a real hand-written method reads the camera and still loses to learning |
| 3 | 500 bin layouts (quiz) | none | Labelled: a hypothetical in the question |
| 4 | Fresh bins cleared from 1, 2, 4 and 8 demos, of 20 (pinned) | `act-demos` (6 fine tasks at 80–90% from 10 minutes of demos) | Labelled: toy demos are a few presses each, real ones minutes of a person's time |
| 5 | The slip's step, steps until stuck, corrections so far (pinned) | `dagger` | Labelled |
| 6 | Bins cleared of 20 per practice kind, median steps; the bin's light (0.5–1.1 of the demos' 1); 15% slips (SimNote) | `domain-randomisation` (an object finder trained only on random simulated images found real objects to within 1.5 cm) | Labelled |
| 6 | Five finishes (quiz) | none | Labelled: a hypothetical in the question |
| 7 | Bins cleared of 20, labels, median steps, best without practice; real bin 1's light (pinned, `WINNERS` recomputed) | `rt1-unseen` (97% on trained tasks, 76% new tasks, 59% new backgrounds) | Labelled: a simulated score drops on what it wasn't tested on, as RT-1's did |
| Intro, recall | The same pinned counts (4 demos, plain → both varied, 19 of 20) | as above | Labelled ("simulated" in each caption) |
