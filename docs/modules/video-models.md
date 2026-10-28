# Video and world models (`/video-models/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The warehouse dream** (`src/components/scenes/dreamFloorScene.ts`): the real test floor on the left (16 × 16 cells as flat tiles, the belt row dark, shelves as mint racks, the robot a mustard drum, the crate a tomato box) and the projector screen beside it, a pale slab where the model's frame lies as flat tiles, every cell that differs from the real floor ringed in tomato. `PAIR_BOARD` holds both; on phones (`show: 'real' | 'dream'`, the kit's Real / Dream switch) one floor stands alone on `FLOOR_ONLY_BOARD` so cells stay large. Parts for callouts: `floor`, `dream`, `robot`, `crate`, `belt`. Each floor carries its frame as `data-frame`, which the tests read. `dreamPlot` is ready for the hero's `DRAW` at go-live.
- **The Frames tab, one tab away** (`DreamStage`, `src/content/video-models/kit.tsx`): the real and dreamed frames as flat React SVG grids (stacked on phones), misses ringed, and a checkbox that shades the cells the model was under 90% sure of (the softmax's top share, `confidence()`). The robot is its own rect so it slides between cells (CSS); with reduced motion each press redraws without the slide.
- **The mechanic, drive the dream** (KTD13, `DrivePad`): the pad takes focus (visible ring) and only then do arrow keys drive; Tab leaves it as usual. Four buttons (≥ 44 px on phones) and Re-sync. One polite `role="status"` read-out says what each action did (moved, blocked) and the milestones (the dream agrees or not, robot lost, crate vanished, re-synced, end of route), never per frame.

## Engine (`src/lib/video-models/`)

- `world.ts` and `net.ts` are the committed simulator and forward pass (U3); this module adds files beside them and changes neither.
- **Rollouts** (`rollout.ts`): `oneStep` guesses frame t + 1 from real frames; `dream` runs open loop from real frames 0 and 1, the action always real, a frame real instead of guessed at each step in `syncs` or each multiple of `every` (no pass runs there). Guesses are cached by their history (actions, re-syncs, model) so a drive one key longer runs one pass. `realOf` is the reader's drive: the seed's start and its first recorded action, then the reader's actions through `world.ts`.
- **The drive** (`drive.ts`): moves and re-syncs live in chapter state; `driven()` replays them; `readout()` writes the read-out line.
- **Compute** (`compute.ts`): multiplies per pass from the weights' shapes (k1 1,527,808; k2 1,675,264), shown in millions.
- **Chapter 7's workbench** (`workbench.ts`): context (k1 or k2) × re-sync (never, 16, 8, 4, 2) over 8 held-out routes of 32 steps (`data/video-models/workbench.json`, Larkspur's planning bar 70%). **A frame is right when its one robot and one crate both sit where the real ones do**, departing from KTD11's robot cell alone: open loop, k1 keeps a robot far longer than k2 (it just repeats one) while losing the crate's way, so robot-only scoring would teach the opposite of chapter 3. Real frames are the cost Larkspur set out to save, so the rule is the fewest real frames that clear the bar, then the least compute. `WINNERS` is k2, re-sync every 4 (pinned, recomputed by `solve()`); no k1 plan clears the bar, nor k2 without re-sync.
- **Pinned** (`data/video-models/pinned.json`, rerun by `tests/unit/video-models-engine.test.ts`): the pinned route (the first held-out seed + 4) and k2's open-loop dream frame by frame; it keeps one robot 9 steps, has 2 robots at step 11 and 185 at step 32, and loses the crate at step 24; re-synced every 4 it gets 30 of 31 frames right and keeps the crate. Chapter 2's one-step guess (4 of 4 changed cells), chapter 3's bounce (k1 puts the crate back toward the end, k2 right), chapter 1's bytes (33 frames, 8,448 raw, 284 packed by Compression's pair coder), every plan's result and the winners.

## Chapters

1. Frames, Movie Gen's frame rate and Compression's bytes a pixel for a second of raw 1080p; packing the toy's frames with Compression's coder (links Compression chapter 1).
2. One-step guesses along the pinned route; the changed cells are the test.
3. One frame against two at the pinned bounce.
4. The drive.
5. Drift on the pinned route, then re-sync every 4.
6. GameNGen's 64 frames and noisy training, denoising (links Diffusion), Sora and Movie Gen making clips at once, published sizes beside the toy.
7. The workbench.

## Facts

From `data/video-models/facts.json` (accessed 2026-10-28): Ha and Schmidhuber (2018); GameNGen (20 fps on one TPU, raters near chance; 64 frames of context, degrading after 10 to 20 frames without noise augmentation); Genie (11B parameters, 30,000 hours of platformer video); Movie Gen (30B parameters, 16 s at 16 fps, 1080p, 73K-token context); Sora's report (up to a minute, spacetime patches, no model details); BT.709 for 1080p's 1920 × 1080. Sora's page refused automated fetches on the access date; its claims were checked against search results quoting the page.
