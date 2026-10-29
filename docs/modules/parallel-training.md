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
