# Structured outputs (`/structured-outputs/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The stencil press** (`src/components/scenes/stencilScene.ts`) is Tokens' press on the workshop board: the prompt's paper strip feeds it (Larkspur mini), and its tiles ride a belt across a stencil plate, the schema. The plate is blue while the model's own first choice is blocked, that tile stopped tomato against it, and mint while tokens pass; its pill counts how many of the 768 tokens pass at this step. No schema, no plate. `StructuredStage` (`src/content/structured-outputs/kit.tsx`) puts it one tab from the Mask view (`maskGrid.ts`: the vocabulary as a grid of tiles, allowed lit, the token written ringed in ink, a blocked first choice in red, beside a focusable list of the likeliest allowed tokens). On phones the pills keep short names and the caption carries the rest.
- **Hero object: a stencil cut-out sheet in a wooden frame** on two feet across the belt: a thin sheet (blue or mint as above) with shapes cut through it, a wide window, a round hole, a slot and a notch, its bottom rail clear of the passing tiles. The press is Tokens' cast-iron letterpress (`letterpress()`, `feed()` from `tokenScene.ts`).

## Engine (`src/lib/structured-outputs/`)

- **Nothing is recorded; Larkspur mini decodes live under a mask** (`decode.ts`). Tool calling's schema subset is compiled to a state machine over bytes (`grammar.ts`): every property required, keys in declared order, no whitespace, values an enum, a boolean, an integer or a capped string (printable ASCII, no escapes). At each step a token is allowed when every one of its bytes keeps the grammar live (`mask.ts`, no precomputed index: 768 tokens is cheap), and the blocked logits go to -Infinity before softmax, so the allowed tokens share the probability. Greedy by default; chapter 5 draws at temperature 1 with `mulberry32` seeds.
- **The 32-token rule.** Prompt and answer share Larkspur mini's 32-token window: a run ends `done` when the grammar accepts, or `cut-off` when the window runs out first. Chapter 6's two-field schema is cut off on purpose; chapter 7's all-model schema is too.
- **`maxLength` is this site's extension** to the schema subset (`FieldSchema`), so a free string always closes inside the window; a string with none gets `DEFAULT_MAX_LENGTH`. Anthropic's structured outputs reject it (fact `anthropic-limits`), and chapter 4 says so.
- **The readable bar** (`data/structured-outputs/prompts.json`): every run a chapter shows is pinned with its prompt, schema, seed and the output Larkspur mini writes; `tests/unit/structured-decode.test.ts` reruns every one and fails on drift. A retrain that breaks one means a new prompt, not new copy.
- **The model ignores the prompt once it is writing JSON.** Larkspur mini never saw JSON, so inside a schema it writes what it prefers, not what the prompt says (given order 1042, it writes another number). The lessons are about preference and what the mask can force, never about what the model knows: facts come from the order system (`data/structured-outputs/orders.json`), as chapter 7 teaches.
- **Chapter 7's workbench** (`workbench.ts`): each field is free text, a list (or a whole number), or left to the order system, a finite domain of 27 schemas decoded over four orders. Every schema that gives valid, right answers for every order is a right answer (`WINNERS`). Decoding all 27 froze the page for seconds, so the chapter reads `SOLVED`, `WINNERS` precomputed on the committed weights; a unit test keeps the two equal, and a retrain changes both.
- **Facts about structured outputs** come from `data/structured-outputs/facts.json` with source and access date; provider limits and features are re-checked when the module changes.

## Toy vs real

Larkspur mini is trained ahead of time (`docs/lm-kit.md`) and every run a chapter shows is pinned (`prompts.json`), so none of its numbers is recalibrated (KTD5): each is labelled. `ToyNote` (`kit.tsx`) sits beside a cited real figure on one step of every chapter, giving the toy's size from its data (learned numbers, `VOCAB_SIZE`, `CTX`). The schema rules are real (`grammar.ts` checks what they say), except `maxLength`, which this site adds and chapter 4's caption says Anthropic rejects.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Its 32-token window; the prose it writes (live) | `openai-eval` (vendor-reported: 100% with Structured Outputs, under 40% for gpt-4-0613) | Labelled: `ToyNote` beside the real eval; the narration says bigger models do better, and likely isn't enough |
| 2 | 3 tries, each try's tokens and the total written (live) | `openai-vs-json-mode` | Labelled; the toy's 3 tries are a setting, not a provider figure |
| 2 | 99 in 100 (quiz) | none | Labelled: a hypothetical in the question |
| 3 | 768 tokens, how many are allowed at each step, the first choice's share and what the mask took (live) | `llguidance` (a 128k-token vocabulary, about 50 µs per token), `anthropic-guarantee` | Labelled: `ToyNote` gives 768 beside 128k |
| 3 | 60% (quiz) | none | Labelled: a hypothetical in the question |
| 4 | Note capped at 8 characters, 32-token window, allowed counts at and before two characters of room, healing shares (live) | `anthropic-limits` (no `maxLength`), `token-healing`, `xgrammar` (up to 100× faster) | Labelled: the caption says the cap is this site's addition, which Anthropic rejects |
| 5 | 2 values, their shares (live), 6 draws, free text capped at 8 characters | `openai-limits` (up to 1,000 enum values) | Labelled |
| 6 | Order 1042, the numbers it writes, the cut-off's tokens of 32 (live) | `anthropic-context` (1M-token window, up to 128k written), `anthropic-max-tokens`, `anthropic-refusal`, `openai-refusal` | Labelled: the narration says real windows are far bigger, and the cut-off stands for hitting `max_tokens` |
| 7 | 4 orders, 3 fields, the score and how many schemas work (`SOLVED`, computed) | `anthropic-limits`, `openai-limits` | Labelled |
| Intro, recall | 768, 32, the masked answer's tokens; 50 µs (`llguidance` value, read from the fact); quiz hypotheticals (five retries, 3 characters of room, a 6-letter token) | as above | Real for 50 µs (read from `fact('llguidance').value`); the rest labelled: the intro says its counts are the toy's |
