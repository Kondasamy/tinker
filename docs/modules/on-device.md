# Models on your device (`/on-device/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Engine

- **Replies are live** (`src/lib/on-device/replies.ts`): Inference's `quantize()` (widened to any bit width; `BITS` stays `[16, 8, 4]` for Inference and Mixture of experts) rounds Larkspur mini, and `forward()` picks greedily until a new line. The prompt and the replies at 16, 8, 4 and 2 bits are pinned in `data/on-device/pinned.json` and rerun by `tests/unit/on-device-engine.test.ts`: 8 bits keeps the reply, 4 bits changes the answer, 2 bits repeats one word.
- **Memory** (`memory.ts`): params × bits ÷ 8, plus the KV cache (keys and values, 16 bits, every layer's key-value heads) per token. Larkspur mini's shape is its config; the 1B and 3B take Llama 3.2's published sizes and shapes (cited). The handheld's free memory is a planning number.
- **Battery and heat** (`battery.ts`): energy per token reads MELTing point's 0.2 mWh a token for a 3B model at 4 bits from `melt-energy`'s value (matched), scaled by each model's weight bytes; speed is the handheld's bandwidth over the weights' bytes (each token reads every weight). A rush of ten replies back to back runs at full speed for the burst the handheld can cool, then throttled. All planning numbers, labelled where they show.
- **Workbench** (`workbench.ts`): size × bits × reply length, against fit with a shift's context (a miss falls back to the cloud, so it isn't private), the hand-set stock-answer bar and at least 4 bits, and a shift's questions on one charge. `WINNERS` is pinned and recomputed.

## Picture

- **The warehouse aisle** (`src/components/scenes/phoneCrateScene.ts`): a pallet rack of stock behind, and in front the hero object, the handheld drawn as a **walk-in phone-shaped crate** lying on its back, open on top, with a speaker slot and a camera dot on its top end. A **battery water tank** stands on its back end: a glass cylinder whose water level is the charge left, piped into the crate. The picker (`CAST.tomas`) stands beside it.
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

## Toy vs real

The handheld (free memory, battery, bandwidth, cool burst, throttle, questions an hour, shift hours) is Larkspur's planning device, labelled by `PLANNING` in every crate caption. Larkspur mini is trained ahead of time (`docs/lm-kit.md`), so its replies are labelled by `TOY` (chapter 2's caption), never recalibrated (KTD5). The 1B and 3B sizes and shapes are Llama 3.2's published ones.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Larkspur mini's 51,072 parameters | its own config (engine test) | Real (the toy's own count) |
| 1 | 1.23 and 3.21 billion parameters; 2.46 GB and 6.42 GB at 16 bits; about 3 crates | `llama-sizes` | Real (copied into `phones.json`, sums computed) |
| 1 | 2 GB free memory, 16 bricks | `gemma-3n` (runs in as little as 2 GB, read from its value in the narration) | Labelled: planning number, with Gemma 3n beside it |
| 1 | 7 billion parameters (quiz) | none | Labelled: a hypothetical in the question |
| 2 | 16, 8, 4 and 2 bits; the 1B at 8 bits, 1.23 GB; three values at 2 bits | `apple-3b` (3.7 bits on average), `apple-2bit` (trained for 2 bits), `llama-quantized` (41% less memory) | Real (arithmetic and the quantiser's own levels) |
| 2 | Larkspur mini's replies at 16, 8, 4 and 2 bits (pinned) | `apple-2bit` | Labelled: `TOY` says it is a 51,072-weight toy; the narration says models trained for low bits hold up better |
| 3 | 115 KB of cache a token for the 3B; 115 MB at 1,000 tokens; spill at 4,000 (459 MB) | `llama-shape` (layers, key-value heads, head size) | Real (computed from the published shape) |
| 3 | Context steps 0 to 8,000 tokens; 2 GB free | `apple-2bit` (sharing keys and values cut the cache by 37.5%) | Labelled: planning numbers |
| 4 | Energy a token (0.2 mWh for the 3B at 4 bits, scaled by weight bytes) | `melt-energy` value | Matched: `MELT_MWH` reads the fact |
| 4 | 135 tokens a long reply | `melt-energy` (the study's average reply) | Real (copied into `phones.json`, asserted by the engine test) |
| 4 | 20 tokens a short reply; 75 questions an hour; 8 hours; a shift's 600; 15 Wh battery; the tank's level | `melt-energy` | Labelled: planning numbers; a note says the 555 long replies a charge sit inside the study's measured 490 to 590 |
| 5 | About 19 tokens a second; 30-second cool burst; half speed when hot; 10 replies a rush; 114 s against 72 s; 11 s short | `melt-heat` (47.9 °C, slowing over 50 prompts), `apple-3b` (30 tokens a second on an iPhone 15 Pro) | Labelled: a note names the speed and burst as planning numbers beside the measured phones |
| 6 | 8,000 tokens of context (the fallback case) | `pcc`, `llama-quantized` | Labelled: planning number |
| 7 | 2,000 tokens a shift; bar 16 of 20; 4+ bits; stock scores 2, 14, 18; replies a charge per setup; the winner (3B, 4 bits, short) | `apple-3b` (a 3B at 3.7 bits on average) | Labelled: hand-set scores say so; a note compares Apple's shipped setup to the winner; `WINNERS` recomputed |
| Intro | 2 GB free; 6.42 GB and 1.60 GB for the 3B; 3,750 short replies a charge; a shift's 600 | as above | Labelled planning numbers, beside the cited claims |
| Recall | 4 GB tablet, 2-billion model, 8 to 4 bits, twice as fast | none | Labelled: hypotheticals in the questions |
