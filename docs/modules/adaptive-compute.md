# Where the effort goes (`/adaptive-compute/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **Larkspur's mill yard** (`src/components/scenes/millScene.ts`, `MILL_PARTS`): a **water tower** at the back holds the day's effort budget; its pipe runs through a dark **sorter** box (a hopper on top, five coloured chutes) into a **valve manifold**, one hand-wheel valve per kind of question (Everyday, Puzzles, Stock, Totals, Warranty). Each valve's hose runs across the yard to the mill it is turned to: the **thinking wheel** (mustard shed, large water wheel), the **library wheel** (cobalt shed with book spines), the **checking sieve** (mint frame with a tilted mesh tray) or the **big model machine** (the kit's model machine in tomato, with a wheel). Valves turned to "Answer straight" have no hose; "Every mill" sends four. The assistant (the kit's model machine, blush) stands at the back right; the yard operator (CAST `operator`) beside the sorter.
- **Hero object: the water tower and valve manifold.** No other scene has a water tower, valve or water wheel (checked against `docs/modules/*.md` and `src/components/scenes/`).
- **What the end state shows without motion:** the tower's water level (blue below, pale above) is the budget left; hoses show where each kind goes; a wet mill has water in its trough and a pool under its wheel; each valve wheel's rim is mint when every answer of its kind came out right, tomato when wrong, grey when the water ran out before them. A lit valve gets an accent ring and heavier ink; a lit mill an accent outline on the ground; the lit tower an accent ring at its base.
- **Living scene (KTD2, `Scene<MillYard>`):** 1100 ms per change. Turned valve wheels spin to their new setting (the knob on the rim points at the setting), new hoses grow out of their spout and gone ones shrink back, water pulses along every wet hose, wet mill wheels turn one and a half times, and the tower's level slides to the new bill. Changing numbers (valve scores, the bill, the score) wait until the motion lands. Reduced motion jumps to the end.
- **Hands in the picture (KTD4):** tap a valve wheel to turn it one notch, or drag its hose onto a mill (`HitLayer`: `valve:<kind>` drag, `mill:<id>` drop). Dropped anywhere else, the hose snaps back and the status line says to drop it on a mill. **Twin:** one `type="range"` per valve (six positions: Answer straight, Think longer, Look it up, Check the work, Bigger model, Every mill) with value text, through the kit's one `act`. Buttons where a chapter acts on the whole yard (Run the day, Shut every valve, Sort each question).
- **Pills outside the filter:** `millPills` draws every pill as a `PillLayer` child; the intro and share image keep them inline (`millStill(s, v, true)`). Valve pills sit left of each wheel (a pill's height apart); valve and manifold callouts sit out over the hoses so they never cover a valve pill. On phones only the lit valve and lit mill are named, with the bill and score.
- **Close-up (KTD6):** each reveal closes in on the part that answers it: the tower (ch. 1, 6), the stock valve and the thinking wheel (ch. 2), the library wheel (ch. 3), the sieve (ch. 4), the big model (ch. 5).
- **Second view:** the Table tab: each kind's valve, answers right and share of the bill, with the day's totals.

## Chapter pictures

Each step's start frame is the previous step's end state; the status line is the step's `status` (R10a). Numbers come from the engine.

| Ch | Step | Picture (end state) | Motion | Hands / control | Close-up | `say` part | Status line |
|---|---|---|---|---|---|---|---|
| 1 | predict | every valve to every mill (20 hoses), tower full, rims grey | none | Predict | — | manifold | Every valve feeds every mill; the tower is full and no question has run yet. |
| 1 | run | tower empty (DRY 104 OF 110), tower ringed, rims grey | wheels turn, the level drains | Run the day | — | tower | The tower ran dry after 8 questions; 32 got no answer at all. |
| 1 | reveal | same | zooms in | Reveal | tower | — | Maximum effort spent 104 of 110 on just 8 questions. |
| 1 | shut | no hoses, tower mostly full; Everyday rim mint, the rest tomato; assistant lit | hoses shrink, valves spin shut, the level rises | Shut every valve | — | model | All 40 answered for 40, but only 14 right: the everyday ones. |
| 1 | quiz | same | none | Quiz | — | — | 14 of 40 right with every valve shut, and the tower nearly full. |
| 2 | predict | every valve shut, 14 of 40 | none | Predict | — | model | Every valve is shut: 14 of 40 right, 40 spent. |
| 2 | stock | a hose from the Stock valve (ringed) to the thinking wheel (outlined, wet); Stock rim still tomato; level drops | valve spins, hose grows, wheel turns, level drops | tap / drag the Stock valve, or its range | — | think | Stock questions now cost 4 each at the thinking wheel, and all 8 are still wrong. |
| 2 | reveal | same | zooms in | Reveal | valve + think | — | The stock valve’s rim is red: 0 of 8 right, at a higher bill. |
| 2 | puzzle | a second hose, Puzzles valve ringed, its rim mint (PUZZLES 8/8) | valve spins, hose grows | Puzzles valve or its range | — | valve | Puzzles at the thinking wheel: 8 of 8 right, 22 of 40 in all. |
| 2 | quiz | same | none | Quiz | — | — | Puzzles are all right; stock still wrong; 88 of the budget spent. |
| 3 | predict | Stock and Puzzles hoses to the thinking wheel; library wheel dry, outlined | none | Predict | — | lookup | Stock questions sit at the thinking wheel: 0 of 8 right. |
| 3 | turn | Stock hose swings to the library wheel (wet); Stock rim mint; level rises | hose shrinks and regrows, wheels turn | Stock valve or range | — | lookup | Stock at the library wheel: 8 of 8 right, at 2 each, not 4. |
| 3 | reveal | same | zooms in | Reveal | lookup | — | The library wheel turns: 30 of 40 right, 72 spent. |
| 3 | puzzles | Puzzles hose swings to the library wheel; Puzzles rim tomato | hose moves | Puzzles valve or range | — | valve | Puzzles at the library wheel: 0 of 8 right, 22 of 40 in all. |
| 3 | quiz | same | none | Quiz | — | — | Stock is right at the library wheel; puzzles are wrong there. |
| 4 | predict | puzzles→think, stock→library; Totals rim tomato; sieve outlined | none | Predict | — | valve | Totals go straight to the assistant: 0 of 6 right. |
| 4 | turn | Totals hose to the sieve (wet, drips through the mesh); Totals rim mint | hose grows, sieve wheel turns | Totals valve or range | — | check | Totals through the sieve: 6 of 6 right, at 2 each. |
| 4 | reveal | same | zooms in | Reveal | check | — | The sieve runs wet: 36 of 40 right, 78 spent. |
| 4 | everyday | a hose from Everyday to the sieve too; tower ringed and lower | hose grows, level drops | Everyday valve or range | — | tower | Everyday answers checked: still 36 right, but 14 more spent. |
| 4 | quiz | same | none | Quiz | — | — | 36 of 40 right with 92 spent: the everyday check bought nothing. |
| 5 | predict | everything mint but Warranty (ringed) | none | Predict | — | valve | Every rim is mint but warranty’s: 36 of 40 right. |
| 5 | think | Warranty hose to the thinking wheel; rim still tomato | hose grows, level drops | Warranty valve or range | — | think | Warranty at the thinking wheel: still 0 of 4 right, 12 more spent. |
| 5 | big | Warranty hose to the big model (outlined, screen OK); every rim mint; tower low | hose moves, level drops | Warranty valve or range | — | big | Warranty at the big model: 4 of 4 right, at 8 each. |
| 5 | reveal | same | zooms in | Reveal | big | — | All 40 right, for 106 of 110 spent. |
| 5 | quiz | same | none | Quiz | — | — | Every rim is mint: 40 of 40 right, 4 left in the tower. |
| 6 | max | tower (520) drained to empty, every hose to every mill, rims mint | wheels turn, level drains | Run the day | — | tower | Maximum effort: all 40 right, and the tower drained to the last drop. |
| 6 | predict | same | none | Predict | — | sorter | 40 of 40 right for 520 spent; every hose runs to every mill. |
| 6 | route | one hose per hard kind; sorter and tower ringed; tower 80% full | hoses shrink, valves spin, level rises | Sort each question | — | manifold | Sorted: still 40 of 40 right, and only 106 of 520 spent. |
| 6 | reveal | same | zooms in | Reveal | tower | — | The tower is still 80% full, for the same 40 right answers. |
| 6 | quiz | same | none | Quiz | — | — | Each valve feeds one mill, or none; 106 of 520 spent. |
| 7 | bench | the day under the reader's five valves; tower ringed | as valves turn | five ranges, or tap / drag in the picture; Show me | — | tower | The yard shows the whole day under your valve settings. |
| 7 | quiz | every rim mint, tower 4 of 110 left | none | Quiz | — | — | Every rim is mint and the tower still holds water. |

## Engine (`src/lib/adaptive-compute/effort.ts`)

- **A hand-written example day** (`data/adaptive-compute/day.json`, labelled as such): 40 questions to Larkspur's assistant in five kinds (14 everyday, 8 puzzles, 8 stock, 6 totals, 4 warranty), each kind with the options that answer it right (hand-set: everyday any; puzzles thinking; stock look-up; totals check; warranty big model; "every mill" all). Toy costs per answer: straight 1, look-up 2, check 2, think 4, big model 8, every mill 13. Budget 110.
- **Rules:** one option per kind. The day runs in order while the budget lasts; the first question that doesn't fit ends it (the tower runs dry).
- **Pins** (`data/adaptive-compute/pinned.json`): which kinds each option helps, the maximum-effort and no-effort days, every chapter's valve turn, routed vs maximum effort with no budget (40 right for 106 vs 520), and the WINNERS (one setting). `tests/unit/adaptive-compute.test.ts` re-derives them.

## Toy vs real

| Chapter | Number shown | Real figure (fact id) | Matched or labelled |
|---|---|---|---|
| 1 | budget 110; 8 answered, 104 spent at maximum effort; 14 right for 40 with none (toy costs) | `effort-billed` (OpenAI, vendor documentation) | Labelled: `ToyNote` |
| 2 | think costs 4; stock 0 of 8, puzzles 8 of 8 (hand-set) | `think-14x` (14×, Snell et al.) | Labelled: `ToyNote`; real figure cited beside it |
| 3 | look-up costs 2; stock 8 of 8 (hand-set) | `lookup-facts` (Lewis et al.) | Labelled: `ToyNote` |
| 4 | check costs 2; totals 6 of 6; everyday check +14 spent | `verifiers` (Cobbe et al.) | Labelled: `ToyNote` |
| 5 | big model costs 8; warranty 4 of 4 (hand-set) | `hard-bigger` (Snell et al.) | Labelled: `ToyNote` |
| 6 | 520 vs 106 for the same 40 right ("about a fifth", pinned) | `routellm-2x` (over 2×), `per-prompt-4x` (about 4×) | Labelled: `ToyNote` (the toy sorter is free and never misreads) |
| 7 | right of 40, spent of 110 | `per-prompt-4x` | Labelled: `ToyNote` |

## Links to add at go-live (U11, KTD8)

- **Reasoning** (`src/content/reasoning/`, chapter 3 "The effort dial" and chapter 7 "an effort per request"): link to Where the effort goes for the other three kinds of effort beside thinking.
- **Choosing a model** (`src/content/choosing-models/`, chapter 3 "Price per answer"): link to chapter 5 (the bigger model) and chapter 6 (deciding per request).
- **RAG** (`src/content/rag/`): where a look-up fixes a fact the model can't know, link to chapter 3 (look it up).
- This module already links out to Reasoning's "The effort dial" (ch. 2), RAG (ch. 3) and Choosing a model (ch. 5).
- **Plain words** (`src/components/story/plain-words.ts`): none needed; the copy says "effort", "thinking", "look-up", "checker", "bigger model" and "routing" (chapter terms), never "inference", "test-time compute", "verifier" or "parameters".
- **Registry** (`src/lib/modules.ts`): import `ADAPTIVE_COMPUTE_MODULE` from `../content/adaptive-compute/module`, add it after the last live module, and remove the `planned('adaptive-compute', …)` card.
