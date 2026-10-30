# Models on your device (`/on-device/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Engine

- **Replies are live** (`src/lib/on-device/replies.ts`): Inference's `quantize()` (widened to any bit width; `BITS` stays `[16, 8, 4]` for Inference and Mixture of experts) rounds Larkspur mini, and `forward()` picks greedily until a new line. The prompt and the replies at 16, 8, 4 and 2 bits are pinned in `data/on-device/pinned.json` and rerun by `tests/unit/on-device-engine.test.ts`: 8 bits keeps the reply, 4 bits changes the answer, 2 bits repeats one word.
- **Memory** (`memory.ts`): params × bits ÷ 8, plus the KV cache (keys and values, 16 bits, every layer's key-value heads) per token. Larkspur mini's shape is its config; the 1B and 3B take Llama 3.2's published sizes and shapes (cited). The handheld's free memory is a planning number.
- **Battery and heat** (`battery.ts`): energy per token is a planning number scaled from MELTing point's 0.2 mWh a token for a 3B model at 4 bits, per GB of weights; speed is the handheld's bandwidth over the weights' bytes (each token reads every weight). A rush of ten replies back to back runs at full speed for the burst the handheld can cool, then throttled. All planning numbers, labelled where they show.
- **Workbench** (`workbench.ts`): size × bits × reply length, against fit with a shift's context (a miss falls back to the cloud, so it isn't private), the hand-set stock-answer bar and at least 4 bits, and a shift's questions on one charge. `WINNERS` is pinned and recomputed.

## Picture

- **The warehouse aisle** (`src/components/scenes/phoneCrateScene.ts`): a pallet rack of stock behind, and in front the hero object, the handheld drawn as a **walk-in phone-shaped crate** lying on its back, open on top, with a rounded rim, a camera bump and a home bar. A **battery water tank** stands on its back end: a glass cylinder whose water level is the charge left, piped into the crate. The picker (`CAST.tomas`) stands beside it.
- **Pack the crate**: each brick is one sixteenth of the free memory. Weight bricks (cobalt) fill the crate's 4 × 4 floor first, then cache bricks (mint); bricks past 16 spill onto the floor beside it, tomato-edged, with a count pill when more spill than are drawn. A hot handheld glows tomato with heat lines over it.
- **Parts for callouts** (`CRATE_PARTS`): `crate`, `bricks`, `cache`, `spill`, `tank`, `picker`.
- **The stage** (`CrateStage`, `src/content/on-device/kit.tsx`): a radio group for model size and one for bits, beside the stage; chapters add a context range, a reply-length radio, Ask (runs Larkspur mini's reply live, and drains the tank by an hour of questions) and Rush. One polite `role="status"` read-out gives each action's result. With reduced motion the bricks and level show their end state at once (nothing animates anyway: each change redraws). The **Bars** tab (second view) shows memory and battery as bars from the same numbers.
- **Chapter 6** is a flow over time, so it uses `FlatStage`: handheld, model and cloud as lanes.

## Chapter pictures

| Ch. | Picture | Mechanic live? | The step's control | `say` parts |
|---|---|---|---|---|
| 1 `will-it-fit` | The crate packed with the chosen size at 16 bits; the 3B spills | Yes, pack | size radio | `crate`, `spill` |
| 2 `smaller-numbers` | The 1B packed at the chosen bits; Larkspur mini's live reply beside | Yes, pack and Ask | bits radio, Ask | `bricks` |
| 3 `working-memory` | The 3B at 4 bits plus cache bricks for the context; spills at 4,000 | Yes, context range | context range | `cache`, `spill` |
| 4 `battery-tank` | The 3B at 4 bits; the tank drains an hour of questions per Ask | Yes, Ask | reply length radio, Ask | `tank` |
| 5 `heat-and-speed` | The same; a rush glows hot for long replies | Yes, Rush | reply length radio, Rush | `crate`, `picker` |
| 6 `what-never-leaves` | Flat lanes: handheld → model on device, or → cloud | No | route radio (chapter's own) | none |
| 7 `workbench` | The crate at the bench's plan, its tank after a shift | Yes | size, bits, length | `crate`, `tank` |
