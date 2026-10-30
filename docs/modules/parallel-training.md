# Many chips, one model (`/parallel-training/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The round table** (`src/components/scenes/ringScene.ts`, the hero object): Fernhill Labs' chip workers, kit `person` figures, stand round a wooden table with a rack wall behind. Each worker's place on the table is a dark chip mat holding one bucket per chunk of the gradient; a bucket's sand rises with how many workers' shares it holds (`fillsAfter` in `ring.ts`), and a full bucket carries a mound over its rim (full by shape, not only by height). Each hop's sends are tomato arrows on the tabletop from one worker's bucket to the same bucket at the next worker. At most 8 workers (KTD10).
- **Memory mode** (`load`): instead of buckets, each worker holds one tall bin, its chip's memory, filled to the share of it the worker's part of the training state takes. Over 1, the bin is full, sand heaps on the mat beside it and the worker's pill says how many times over (chapter 1's one worker, chapter 3's sharding).
- **A chip fails** (`down`): that worker lies fallen beside its place and its bin or buckets are empty.
- **The pipeline** (`mode: 'pipeline'`, from chapter 4): the same workers, redrawn as a line of workbenches, stage 1 on the left. At the current slot of the GPipe schedule (`gpipe` in `pipeline.ts`), a working stage reaches over a bucket (its micro-batch) with an arrow on the bench pointing the way the pass runs (right for forward, left for backward); an idle stage sits on a stool behind an empty bench (`idleAt`). Idle by pose and an empty bench, not only by colour.
- **The Timeline tab, one tab away** (`RingStage`, `src/content/parallel-training/kit.tsx`): a lane per worker (flat.ts `lane`), a column per slot. Ring mode: one compute cell, then a waiting cell per hop of the all-reduce, done hops solid. Pipeline mode: the schedule's slots, forward and backward cells marked F or B (desktop names the micro-batch), bubble cells hatched, the current slot ringed. Read off the same state as the picture.
- **The mechanic, pass the buckets** (`PassControls`): Step advances one hop (one slot in pipeline mode); Play runs it (Play turns into Pause, never starts by itself, stops at the last hop, is hidden under reduced motion, leaving Step); Start over at the end. Workers is a radio group (2, 4, 8); Micro-batches a native range (1 to 8) in pipeline mode. Changing either goes back to the start. One polite `role="status"` read-out under the controls carries only the new result: each Step, Play and Pause, and the milestones (reduce done, all-reduce done, forwards done, step done with its bubble), never each tick while playing. Every control is a real element under the frame, at least 44 px on phones.
- **Reduced motion:** nothing moves between hops anyway (each hop redraws in place); Play is hidden and Step walks every finished stage.
- **Phones:** worker and stage pills drop to their number (and none at 8 workers); the caption carries the numbers.
- **Parts for callouts** (`say`): ring mode `RING_PARTS` = `table`, `worker`, `bucket`, `rack`; pipeline mode `LINE_PARTS` = `line`, `worker`, `bucket`, `idle`, `rack`. `worker` and `bucket` point at worker 1 (in pipeline mode, the first working stage's bucket); `idle` at the first idle stage, so it draws only at a slot with one. A chapter's `PARTS` is the list for the mode its picture uses.
- **Home and share images:** the home card and the intro are the ring all-reduce halfway; the hero plot is `ringPlot`.

## Chapter pictures

| # | Chapter id | Picture | Mechanic live | Step's control | `say` parts |
|---|---|---|---|---|---|
| 1 | `01-wont-fit` | Ring mode, one worker in memory mode: the bin full and sand heaped beside it (`load` = state over one chip's memory) | no | the chapter's own pick (how many chips), not the kit's | `worker`, `bucket`, `rack` |
| 2 | `02-copies` | Ring mode, 4 workers with `GRADIENTS`: buckets fill hop by hop to the mean | yes: Step / Play, Workers 2, 4, 8 | Step (the read-out names each hop) | `bucket`, `table`, `worker` |
| 3 | `03-sharding` | Ring mode, 8 workers in memory mode, `load` from `memoryOf` per ZeRO stage | no (Workers radio may stay as exploration) | the chapter's ZeRO stage radio | `bucket`, `worker` |
| 4 | `04-pipeline` | Pipeline mode, 4 stages: who works and who idles at each slot; Timeline tab shows the bubble | yes: Step / Play over slots, Micro-batches range | Micro-batches range (bubble shrinks), then Step | `idle`, `line`, `bucket` |
| 5 | `05-inside-a-layer` | Ring mode, 8 workers, `rack` and `table` pills carrying the link (inside one box, between boxes) | yes: Step / Play (the layer's all-reduce) | the chapter's link pick | `rack`, `table` |
| 6 | `06-checkpoints` | Ring mode, 8 workers, one worker `down`; the rack's pill names the last saved step | no | the chapter's interval pick | `worker`, `rack` |
| 7 | `07-workbench` | Ring mode for a data-parallel layout, pipeline mode when it has stages; Timeline tab for step time | yes, as exploration | the workbench's layout controls | `worker`, `rack` |

Chapter units clear the read-out when the step changes by keying `PassControls` on the step id.

## Chapter notes

- **Chapter 3 never fits on its own:** with no split inside layers or by layers, one micro-batch of activations (about 91 GB) already passes a chip, so even ZeRO stage 3 over 8 copies stays over. The chapter says so and hands over to the pipeline; no pinned row was added.
- **The read-out clears with the step:** chapters key `PassControls` on the step, so the last Step that finishes a step clears its milestone; the next narration carries the result.

## Toy vs real

Most of this module's numbers are already matched: `src/lib/parallel-training/facts.ts` reads the model's size, the bytes per parameter, the chip's memory and speed, both link speeds, the share of peak, the all-reduces per layer and the failure rate from `facts.json`, and every chapter number is arithmetic over those. What stays a toy is labelled by `SimNote` (the stand-in gradients and the simulated cluster's planning numbers in `workbench.json`), with a real fact on the same step.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | 70 billion parameters, 80 layers | `llama3-70b` | matched (`MODEL`) |
| 1 | 2 + 2 + 12 = 16 bytes a parameter; 140 GB of weights, 1.12 TB of state, 14 chips, 75% optimiser | `zero-16-bytes` | matched (`BYTES`), derived |
| 1 | 80 GB a chip | `h100-memory` (re-checked) | matched (`CHIP.memory`) |
| 1 | Quiz: a 7-billion-parameter model, 14 GB, 112 GB | `zero-16-bytes` | hand-set example size, bytes derived |
| 2 | Stand-in gradients, their mean, 32-byte gradient, 48 and 56 bytes sent | `ring-optimal` (2(N − 1)/N) | labelled (`SimNote`, hand-set in `story.json`); the ratio is the real one and the narration names the real 140 GB gradient |
| 2 | 2, 4 or 8 workers; quiz 64 and 512 chips | `ring-optimal` | toy (the picture draws at most 8), the rule holds at any count |
| 3 | 8 copies; 1.21 TB, 476 GB, 354 GB, 231 GB a chip; 91 GB of activations; 15× over; stage 1 saves 61% | `zero-16-bytes`, `zero-stages`, `activations`, `llama3-batch` | matched, derived; micro-batch of 1 sequence is a planning number (`workbench.json`) |
| 3 | 1.5× the sending at stage 3 | `zero-stages` | matched (`ZERO3_TRAFFIC`) |
| 4 | 80 layers in 4 stages of 20; 1 to 8 micro-batches; 75% and 27% bubble; slots idle | `gpipe-bubble`, `llama3-70b` | real formula on toy stage and micro-batch counts (Llama 3 used 16 stages, `llama3-layout`) |
| 5 | 900 GB/s inside a box, 50 GB/s between, 18× slower; 8 or 16 ways | `nvlink`, `between-boxes` (re-checked) | matched (`LINK`, `PER_BOX`) |
| 5 | 4 all-reduces a layer | `megatron-allreduce` | matched (`TP_ALLREDUCES`) |
| 5 | One all-reduce and step times (5.29 s vs 17.9 s) | `tp-in-box`, `llama3-mfu`, `h100-bf16` | labelled (`SimNote`, "Simulated, on planning numbers"): arithmetic over real chip figures and planning chips |
| 6 | 1,024 chips; one failure every 49 hours | `llama3-interruptions` | chips labelled (planning); the rate matched (`FAILS_PER_CHIP_DAY`) |
| 6 | 5-minute save, 10-minute restart; 30, 170 and 480 minutes; saves, hits, hours lost, days of wall clock | `llama3-interruptions`, `young` | labelled (`SimNote`, planning numbers, simulated stream); Young's interval is the real rule |
| 7 | Layout controls, memory a chip, step parts, share lost, 5.64 s best, 3 tying layouts | `llama3-layout` | labelled (`SimNote`); beside it Meta's real layout, the same 8-way split inside a box |
| Intro | 70 billion, 1.12 TB, 1,024 chips, 49 hours, best step | as above | matched or labelled as above ("a planning number", "simulated") |
