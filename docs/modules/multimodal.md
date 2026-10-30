# Multimodal (`/multimodal/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The scanning table** (`src/components/scenes/scanScene.ts`) stands on the workshop board: a document (or a photo print) lies under a camera on a post, a patch grid drawn over it (at most 12 lines each way; the picture shows the idea). Read by vision, the patches drop onto a belt as token tiles in Tokens' colours (nine at most) and ride into the model, RAG's LLM block; read by OCR, a strip of text rides the belt instead; before a reading the belt is empty. `MultimodalStage` (`src/content/multimodal/kit.tsx`) puts it one tab from the Patches view: the image rasterised at the chosen size, drawn back pixelated, under its exact grid (`patchGrid.ts`), with its size, count and reading in words. Chapters 1, 2 and 7 keep the tab in the step state; on phones the pills keep short names and the caption carries the counts.
- **Hero object: the camera on a jointed arm** (weighted base, shoulder, elbow and wrist hubs, after the upstream desk lamp), its lens pointing down at the sheet; a warehouse worker in a hi-vis vest stands by it holding the broken bracket.

## Engine (`src/lib/multimodal/`)

- **Images drawn in code, rasterised live, readings recorded** (KTD10). `images.ts` draws each image as a deterministic SVG string at a fixed pixel size: the documents (an invoice, a packing slip with a table, a handwritten note, a faxed invoice, a return label) with `flat.ts`'s ink and palette, and the part photos (front and side) with the iso engine. Words are painted on these pages on purpose: they are what gets read. The browser rasterises a drawing to a canvas at the chosen size and draws it back pixelated, so lost detail shows; build-time pictures (share images, the intro's patch stills) use the SVG. Text is rasterised with system fonts, so the pixels vary a little by machine; nothing graded depends on them.
- **Token counts are computed** (`patches.ts`): ⌈w/28⌉ × ⌈h/28⌉ visual tokens per Anthropic's current vision docs, after the image is scaled down to its tier's long-edge and token limits (`facts.json` `high-res-tier`, `standard-tier`; Larkspur runs on the high-resolution tier). The downscale is ported line for line from Anthropic's reference code; where the docs' table and that code differ (1269 vs 1270 px wide for 2000 × 1500 on the standard tier, the same 1,564 tokens), the code wins and `tests/unit/multimodal-engine.test.ts` says so. OpenAI's 32 px patches are shown once as a fact (`openaiPatches`), not used for counts. OCR's cost is its text, counted by the language-model kit's BPE. Sizes are a finite list (`SIZES`).
- **Readings are recorded** in `data/multimodal/readings.json`, keyed by image × size × method (`ocr`, `vision`): 36 in all, each with a one-line `note`. They illustrate the cited findings (R6); they were not measured on a real model, and the copy says so. Fields are graded live by Evals' `keyFactOf` against `data/multimodal/references.json`.
- **Coverage:** every chapter control has a finite domain (`DOMAINS`, and `WORKBENCH_DOMAINS` for chapter 7), and `tests/unit/multimodal-coverage.test.ts` walks every image × size × method a chapter can reach and fails on a missing or unreachable reading, or past the budget of 90.
- **Chapter 7's workbench** (`workbench.ts`): a method and a size per kind of document, a finite domain of plans. The puzzle accepts every plan with the most fields right at the lowest token cost (`WINNERS`, three today), not one hand-picked answer.
- **Facts about multimodal models** come from `data/multimodal/facts.json` with source and access date; patch sizes and tier limits move and are re-checked when the module changes.

## Toy vs real

Image token counts are real: they run Anthropic's published rule and resize code over facts' patch size and tier limits (matched since the module shipped). Everything a reading says (its text, which fields it got right) was hand-written to illustrate the cited findings, and OCR's cost is this site's tokenizer, not a real model's; `RecordedNote` says both on every step that shows a reading, with a cited fact beside it.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | 28 px patch; the invoice's size, patch grid and image tokens; the 280 px logo's 100 tokens (quiz) | `patches`, `example-1000` | Matched: `PATCH = Number(fact('patches').value)`, counts computed |
| 1 | OpenAI's 32 px patches | `openai-32` | Real (shown as the fact only) |
| 2 | Sizes 400–3,200 px (`SIZES`) and each one's image tokens, the downscaled size | `high-res-tier`, `resize-rule` | Matched: tier limits read from facts, sizes hand-picked |
| 2 | Fields right at each size | `text-legible` (on the same step) | Labelled: recorded readings |
| 2 | 500 px shelf-label photos (quiz) | none | Labelled: a hypothetical in the question |
| 3 | Fields right for the slip and the note, OCR and vision | `ocrbench` | Labelled: recorded readings |
| 4 | OCR text tokens vs vision image tokens at 1,600 and 800 px | `patches` (vision); OCR counted by the site tokenizer | Matched (vision), labelled (OCR: `RecordedNote`) |
| 4 | OCR and vision tie on clean print at 1,600 px (`small` step) | `text-first-gap` (their text-first route scored about 10 points lower than the image for five of eight models) | Labelled: the toy ties; the step says a real test may not |
| 4 | 5 fields, fields right per method and size | `field-by-field` (a real per-field grade found one weak field, the bank account number) | Labelled: recorded readings |
| 4 | 200 delivery notes, 92% overall (quiz) | none | Labelled: a hypothetical in the question |
| 5 | Fields right for the front and side photos | `vizwiz` (28.63% of real photo questions couldn't be answered from the photo) | Labelled: recorded readings |
| 6 | The fax's lines added up vs its total as read | `small-images` (mistakes on low-quality images) | Labelled: the sum runs live over a recorded reading |
| 7 | Each plan's fields right and tokens; the best plan's fields and cost; the number of winning plans (`WINNERS`, computed) | `image-price` (tokens to dollars) | Labelled: recorded readings; vision tokens matched, OCR tokens the site tokenizer's |
| Intro, recall | The same counts (invoice at 400 and 1,600 px, OCR tokens, the note, the workbench's saving); 4,000 px, $63.10/$68.10 (recall) | as above | Labelled (intro notes say "recorded"); recall numbers are hypotheticals |
