# Mixture of experts (`/mixture-of-experts/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The sorting office** (`src/components/scenes/officeRoomsScene.ts`): the prompt's last tokens (at most 8) wait as parcels on a belt at the front, the selected one mustard, a dropped one tomato. Each layer is a floor: a doorman (the router) at the head of a row of eight rooms (the experts). For the selected token two rooms a floor light, with a lit path from the doorman to each; in dense mode every room lights (chapter 1's one big kitchen). Chapter 5 stacks the crates each room was sent, tomato past its capacity. The guess booth reads the model's next token. Room pills carry the expert's most-routed training tokens. The home card, the intro hero and the intro's share image are chapter 2's prompt with its last token's rooms (`roomsCard`, pinned); the hero plot is `roomsPlot`.
- **Hero object: an apartment block per floor**: eight flats sharing party walls, each with a front door of its own colour and a window set back on an open gallery behind a railing, under a flat roof (mustard roof, walls and a lit window when the flat works, tomato roof past capacity). A uniformed doorman in a peaked cap stands at a lectern on each landing (a kit `person` at 0.7 size, tomato while overridden); the belt is the kit's roller conveyor.
- **The Router tab, one tab away** (`RoomsStage`, `src/content/mixture-of-experts/kit.tsx`): each room's router share on each floor for the selected token, the two that run marked. React text.
- **The mechanic** (KTD15): chapter 4's override, a checkbox per room; a third pick unchecks the oldest and "Use router" restores the router's choice. The guess reruns for real.

## Engine (`src/lib/mixture-of-experts/`)

- **The experts path is in the shared forward pass** (`src/lib/lm/model.ts`): a config with `experts` makes each block's MLP `experts` MLPs, `top_k` run per position; the router reads `ln2`'s output, the top logits win (ties to the lower index), and their outputs add up weighted by a softmax over the ones that run. Two hooks: `routes` reports each layer's choice per position (the router's full softmax, the experts run, their weights); `route` forces experts per layer and position, and an empty list skips that position's MLP. Without them the pass is unchanged; dense models never take the path. The weights (`moe.bin`, `train_moe.py`, see `docs/lm-kit.md`) load as `Weights` `'moe'`.
- **Routes and the override** (`routes.ts`): one token's experts forced in every layer through `route`, so the guess reruns. Nothing runs at import.
- **Capacity** (`capacity.ts`, chapter 5): each expert takes ⌈factor × tokens × 2 / 8⌉ tokens of the prompt per layer, earlier positions first. A token turned away by both its experts takes the empty route (its MLP adds zero, as Switch passes a dropped token on through the residual). Layers are capped in order, since a drop in layer 1 changes what layer 2's router sees. Shortcut, noted in the code: a token that keeps one of its two experts gives it the whole weight (the hook renormalises over the experts it runs), where real systems keep the router's original weight.
- **What the experts learned** (chapter 3) is measured, not labelled: each room's most-routed tokens over the training text (`meta.json`) split by kind of token (word starts, punctuation and function words, endings, single letters) more than by topic. Mixtral's finding (no split by topic, more by syntax) is cited apart from the toy's.
- **Model cards** (`cards.ts`, chapters 6 and 7): dated published total and active counts with the shapes behind them (`facts.json` `card`). `count()` redoes the active-parameter maths from the shape (attention, routers, shared experts, dense layers, the experts that run, embeddings); `tests/unit/mixture-of-experts-engine.test.ts` holds it within 2% of each published figure. Bytes follow Inference's memory maths.
- **Chapter 7's workbench** (`workbench.ts`): a card and a precision for Larkspur's server. The budgets (`data/mixture-of-experts/workbench.json`: 160 GB for weights, at most 40B active per word) are Larkspur's planning numbers, not measured, and the copy says so. A plan passes when it fits both; the best hold the most total weights. `WINNERS` is pinned and recomputed by `solve()` in a test.
- **Pinned** (`data/mixture-of-experts/pinned.json`): each chapter's prompt, chapter 4's override (rooms 3 and 4 turn “ days” into “ business”), chapter 5's drops and guesses per factor, the card, the workbench winners. The engine test reruns each live; a retrain means new prompts, not new copy.

## Facts

From `data/mixture-of-experts/facts.json` (file accessed 2026-10-25; the cards and the facts added on 2026-10-30 carry their own date), each with its source:

- **Mixtral's routing analysis** (Jiang et al., 2024) was checked against the paper: no obvious split by topic across The Pile's subsets (ArXiv, biology, philosophy; only DM Mathematics differs a little), the router following syntax (“self” in Python, “Question” in English, indentation). The claim's topic examples were changed from “biology, philosophy, maths” to “ArXiv papers, biology, philosophy”, since maths is the one subset that differs.
- **Shazeer et al. (2017)** (a trainable gating network picks a sparse combination of experts per example; capacity grows without a proportional rise in compute) and **Switch Transformers** (2021: expert capacity set by a capacity factor, overflowing tokens skip the layer through the residual connection; an auxiliary load-balancing loss minimised by uniform routing) were checked against the papers.
- The model cards (Mixtral 8x7B and 8x22B, DeepSeek-V3, Llama 3 70B) cite their makers' pages and configs; re-checked 2026-10-30 (totals, active counts and every shape field against each `config.json`).
- **One finding per chapter** (2026-10-30): chapter 1 shows Kaplan et al. (2020: about two operations per weight per token, so a dense model's work grows with its size); chapter 2 Shazeer et al.; chapter 4 Lu et al. (2024: removing 2 of Mixtral 8x7B's 8 experts per layer at random cut its average over eight tests from 67.58 to 63.04); chapter 7 NVIDIA's H100 page (80 GB a card), which sets the memory budget.

## Toy vs real

The toy is trained ahead of time (`moe.bin`), so its counts, routes and guesses are labelled, never recalibrated: `ToyNote` sits beside the chapter's cited fact.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | 46.7B weights in the vendor's model | `mixtral-8x7b` | Real |
| 1 | 8 rooms a floor, 2 lit per token | Mixtral's 8 and 2 (`mixtral-8x7b`) | Labelled (the toy's own shape; it happens to equal Mixtral's) |
| 1 | “twice the size, about twice the work” (quiz) | about 2 operations per weight per token (`kaplan-2020`) | Real (the fact backs the ratio) |
| 2 | 8 rooms, 2 floors, each room's router share (%) | Shazeer's sparse gate (`shazeer-2017`) | Labelled |
| 2 | 64 experts, top-2 (quiz) | none | Hypothetical in the question |
| 3 | each room's most-sent training tokens | Mixtral's split by syntax (`mixtral-routing`) | Labelled (measured on the toy) |
| 4 | the guess before and after the override (pinned) | 67.58 → 63.04 with 2 of 8 experts removed (`lu-2024-pruning`) | Labelled (pinned toy output) |
| 5 | factors 2, 1.5, 1; seats ⌈factor × tokens × 2 ÷ 8⌉; tokens turned away; the new guess | capacity factor and dropped tokens (`switch-capacity`, `switch-balance`) | Labelled (a batch is one prompt here) |
| 6 | 68,672 total, 43,328 active, the dense toy's count, the ratio, top-5 scores | none | Labelled (measured on the toy) |
| 6 | 46.7B total, 12.9B active, 93.4 GB at 16 bits | `mixtral-8x7b` | Real (bytes derived) |
| 6 | 100B / 10B / 30B (quiz) | none | Hypothetical in the question |
| 7 | each card's total and active count, memory per plan | `mixtral-8x7b`, `mixtral-8x22b`, `deepseek-v3`, `llama-3-70b` | Real (memory derived) |
| 7 | 160 GB memory budget | 2 cards × 80 GB (`h100-memory`) | Matched (`workbench.ts` reads the fact) |
| 7 | 40B active budget | none | Labelled (Larkspur's planning number) |
| 7 | 16, 8, 4 bits | Inference's precision set | Real (shared engine) |
| 7 | the toy's counts and bytes | none | Labelled |
