# Context (`/context/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The window desk** (`src/components/scenes/windowScene.ts`): a glass case of fixed size on a desk is the context window, its height the token budget. The call's parts lie in it as stacked papers, bottom up in window order, coloured by kind and as thick as their tokens; a window over the budget rises past the rim and spills papers onto the desk. Agents' gauge stands on the desk (the cached share, then the fill), and each prop is turned on by the chapter: a cache shelf behind (a copy of the shared prefix, lit on a hit), a filing cabinet for memory (a drawer out when notes were read) and agents' in-tray for cleared results (a binder once summarised). `ContextStage` (`src/content/context/kit.tsx`) puts it one tab from the Window view (`windowBar.ts`: the same call as one stacked bar, the budget line and the reply's room; arrow keys read the parts). Only chapter 7 keeps the tab in the step state; on phones the props' readout pills are left to the caption.
- **Hero object:** the reading desk with a lit banker's lamp under the glass case, a reader seated at it; the cache shelf is a bookcase, spilled papers curl.

## Engine (`src/lib/context/`)

- **A turn assembler plus recorded answers keyed by what the model saw** (`loop.ts`, `window.ts`), mirroring Guardrails' turns. The host builds each window from parts: the system prompt, the tools, the history (`full`, `cleared` when old tool results are dropped, `summary`), the retrieved documents (which, in what order, where the needed fact sits) and memory notes (none or read). Token counts come from the language-model kit's BPE, live; the copy says they are this site's counts, not a provider's.
- **The signature is what the model sees** (`turns.ts`): the case, the system prompt's form, the tools offered, whether every document is stuffed, the documents and search results in window order, the history and the memory files read. Host-only settings stay out: the token budget, the cache breakpoints, the cache lifetime, the gap between calls and the prices. They change cost or where a run stops, not what the model says.
- **Over budget is refused.** A window whose tokens plus the reply's room (`REPLY_ROOM`) pass the budget gets no model turn (`over-budget`, the refused window kept for the picture), so nothing needs recording and the budget stays host-only.
- **A cache hit is the longest live entry whose prefix still matches, up to its last breakpoint at or before the first difference** (`cache.ts`). The host keeps the session's live entries (each call's parts and breakpoints, plus the prefix it read, which the read refreshes); the call then writes everything after the hit up to its own last breakpoint. A later session starts cold, and an entry neither written nor read within the lifetime expires. No minimum cacheable length and no lookback limit (`shortcut:` comments say so; Larkspur's windows are small on purpose), and chapter 4 shows the minimum as a fact.
- **Costs are in relative units, never dollars**: a fresh input token is 1, a cache read, a cache write (5-minute or 1-hour) and an output token are the dated multipliers in `data/context/facts.json`. The copy says so.
- **One merged recording.** Turns live in `data/context/turns/<chapter>.json`, one reviewed file per chapter holding the turns that chapter first needs; a signature is in exactly one file, and every run looks up the merged `RECORDING`. Every chapter control has a finite domain (`DOMAINS`, one per file) and chapter 7's policy bench is `WORKBENCH_DOMAINS`. `tests/unit/context-coverage.test.ts` runs every combination and fails on any `norecord`, on a signature in two files, on a recorded turn nothing reaches, or past the budget of 150 turns.
- **Answers illustrate sourced findings, they are not measured** (KTD8): each recorded turn carries a one-line `note` and a verdict, and chapter 2's answers by position and distractor count follow Liu et al. (2023) and Chroma (2025), cited in the reveal.
- **Memory is files the host keeps** (`memory.ts`): a note the model writes with the memory tool persists across sessions and is read at the next session's start when the tool is on, the only thing that crosses from one conversation to the next.
- **Chapter 4's and chapter 7's puzzles accept every winning answer**: every block order that reaches the best cache hit rate, and every policy with the most right answers at the lowest cost.
- **Facts about context windows, caching and memory** come from `data/context/facts.json` with source and access date; caching multipliers, lifetimes and window sizes move the most and are re-checked when the module changes.

## Toy vs real

Larkspur's desk is a toy: an 8,000-token budget (`DEFAULTS.budget`), 150 tokens kept for the reply (`REPLY_ROOM`), 15 short passages (`data/context/docs.json`) and answers recorded to illustrate the findings (KTD8, never measured). Token counts are this site's own BPE, live, never a provider's. The cost multipliers are matched: `cache.ts` reads them from the facts, so copy and costs can't drift. `ToyNote` (`kit.tsx`) names the toy's budget and passages beside the real window size (`window-size`) in chapters 1, 2, 3 and 5; chapters 4, 5 and 7 also carry the relative-units note.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Each part's tokens and the window total (live); budget 8,000; reply's room 150 | `window-size` (1M tokens), `window-everything` | Labelled: `ToyNote` beside the real window; counts are this site's |
| 1 | 20-page guide, 15 tools (quiz) | none | Labelled: hypotheticals in the question |
| 2 | 15 passages; 4 and 12 distractors; right answers per place (recorded) | `lost-in-the-middle`, `chroma-distractors`, `chroma-rot` (18 models) | Labelled: answers written to follow the findings, `ToyNote` says so |
| 3 | Tokens per question, stuffed against searched (live); right or wrong (recorded) | `just-in-time`, `smallest-set` | Labelled: `ToyNote` says real documents are far longer |
| 3 | 200-page manual, 20 pages (quiz) | none | Labelled: hypotheticals |
| 4 | Cache hit rate, read and write tokens per call (computed); 0.1× read, 1.25× write, 5× output; up to 4 breakpoints; the number of winning orders (`WINNERS`, computed) | `cache-read`, `cache-write-5m`, `output-ratio`, `cache-breakpoints` | Matched: `READ`, `WRITE`, `OUTPUT` and `MAX_MARKS` read the facts |
| 4 | No minimum cacheable length | `cache-minimum` (512 to 4,096 tokens) | Labelled: the note says windows this small may not be cached at all |
| 5 | Last window and total tokens per history form (live); cost in relative units (computed); keeps the latest 1 result | `clear-tool-results` (keeps 3, clears past 100,000 tokens), `clear-breaks-cache` | Labelled: `ToyNote` gives the toy's 1 against the default 3 (changing `KEEP` would need new recordings) |
| 6 | Two conversations a week apart | `memory-tool`, `memory-client-side` | Real behaviour, no toy number |
| 7 | Right answers, tokens, cost and share of the stuffed cost per policy (recorded answers, computed cost); `WINNERS` computed | `smallest-set`, `context-rot` | Matched multipliers; answers labelled as recorded in the note |
| 7 | 300-page catalogue (quiz) | none | Labelled: hypothetical |
| Intro, recall | 8,000 budget, the window's parts (live); 0.1×, 1.25×, 4; 1M real window; recall hypotheticals (40 tools, 90,000 of 100,000 tokens, 300 pages) | as above | Matched multipliers; the intro sets the toy budget beside the real 1M; recall numbers are hypotheticals |
