# Watermarks and made-by-AI (`/watermarks/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The UV print room** (`src/components/scenes/uvScene.ts`): a light table with a reply page on it, the model machine that wrote it at the table's left end, and Larkspur's clerk (`CAST.employee`) at the right end. The page carries the reply's 64 tokens as tiles in two rows of 32, in reading order. A tile never shows its word: text sits in pills (the picked tile's) or in the Strip tab.
- **The UV lamp** is a variant of the kit's `lamp`: the same weighted base, slim post and cap, on a carriage that runs along a rail at the table's back edge, with an arm reaching over the page to a long violet tube in a hood. It lights an 8-column window, both rows (`WINDOW`), so 16 tokens at a time. Under it, a green token is a raised mint tile, and a red token is a flat tomato tile with a notch cut in its front edge (never colour alone). Unlit tiles are flat paper tiles, all alike. "Light all" stretches the tube over the whole page. With the lamp parked (`lamp: null`) nothing is lit.
- **Colours come from `greenlist.ts`**: tile `i` is green when `isGreen(previous id, id, γ)`, where the first tile's previous id is the prompt's last token. Each tile carries `data-i`, `data-lit` and `data-green`, which the tests read. The checker's numbers (green pairs, z) always come from `check()`, which re-reads the text and counts each pair once, so they can differ by a repeat or two from the tiles' own count.
- **The print** (chapter 6): the same table with the toy picture as a photo print (its 64×64 greys read as 16×16 cells, a crop drawn smaller) instead of the page, and the signed label as a card with a wax seal beside it, absent after a screenshot. Under the lamp a found mark shows as a fine dotted pattern over the print.
- **Parts for callouts** (`UV_PARTS`): `page`, `lamp`, `machine`, `clerk`, `print`, `label`.
- **Sweep the lamp** (`UvStage`, `src/content/watermarks/kit.tsx`): a native range (`ListRange`) moves the lamp along the page, a column at a time, and a "Light all" toggle lights every tile. With reduced motion every tile is lit at once whatever the range says. When a chapter opens rewording, the reader picks a token (a `Select` of the 64, or a chip in the Strip tab) and swaps it for one of Larkspur mini's six next-best there (`choicesAt`, a second `Select`), or presses "Reword all" (the pinned paraphrase, `pinned.rewording.all`). The page re-scores and redraws. Larkspur mini is loaded once per page through Transformers' model store (`MODEL`); only the swap list waits for it, and the page and its score never do.
- **Read-out**: one polite `role="status"` line under the controls. It gives the new result of each action (the lamp's green and red count, the z-score after Light all, a swap or Reword all) and clears when `step` changes.
- **The Strip tab** (the second view, also the precise one; hidden while the lamp is parked, as in chapter 1, and on the print): the reply's tokens as text chips in two blocks of 32, green chips raised with a ✓, red chips notched with a ✗, then the checker's green count over the pairs it scored and a z-score meter with the line at 4 marked.
- **Home and share images:** the home card and the intro are the pinned marked reply lit all over; the hero plot is `uvPlot`, the light table with the lamp over the reply's middle.

## Chapter pictures

| Ch. | Picture | Mechanic live? | The step's control | `say` parts |
|---|---|---|---|---|
| 1 `can-you-tell` | The page holding a reply as plain paper tiles, lamp parked: no mark to look for; the guesses are a quiz beside it | No | the guess quiz (chapter's own) | `page`, `clerk` |
| 2 `a-hidden-pattern` | The pinned reply (`REPLY`, seed 1) under the lamp; green tiles raised, red notched | Yes, sweep | the lamp range (`lamp`), then Light all | `lamp`, `page` |
| 3 `leaning-green` | The reply written at each δ in `DELTAS` (`pinned.leaning`), all lit; more raised tiles as δ grows | Light all on; the δ picker is the chapter's | the δ radio (chapter's own) | `machine`, `page` |
| 4 `counting-green` | The first N tokens of the reply (`PREFIXES`), all lit; the Strip tab's meter shows "too short to say" under 16 pairs | Light all on | a prefix range (chapter's own); the tab (`view`) where a step asks for the meter | `page` |
| 5 `rewording` | The reply as the reader rewords it; the Strip tab's meter drops under the line | Yes, reword | the token and swap `Select`s (`ids`); Show me plays `pinned.rewording.swaps`; Reword all | `page`, `machine` |
| 6 `pictures-and-labels` | The print with its label card on the table, after each trip in `TRIPS` | Lamp lit; the trip picker is the chapter's | the trip radio (chapter's own) | `print`, `label` |
| 7 `workbench` | The reply at the bench's δ where one is pinned (`pinned.leaning`), all lit; the bench's results beside it | Yes, sweep and reword (exploration) | the bench's γ and δ controls | `page`, `lamp` |

## Toy vs real

Larkspur mini (the shared tiny model, `docs/lm-kit.md`) writes every marked reply, so its scores, green counts and nats are labelled, never recalibrated: the kit's `ToyNote` (and chapter 2's own note) says so, and a cited finding sits beside it. The checker's line is the one real number the toy can take as is.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 `can-you-tell` | the 64 tokens on the page; the recorded model's name and date | `detector-bias` (no number) | real (recorded reply, dated) |
| 2 `a-hidden-pattern` | green share by chance (γ 0.5), green pairs of the reply and their share, the lamp's 16-token window, the model's 32-token context | `green-list` | labelled (chapter 2's note: tiny model, unsure at almost every token) |
| 3 `leaning-green` | nudges 0, 1, 2, 4; green pairs and z per nudge; nats lost a token; Larkspur's chosen δ | `nudge-cost`, `synthid-text` (20 million replies) | labelled (`ToyNote`: real marks show the same trade-off, tuned to cost nothing readers notice) |
| 4 `counting-green` | the line at 4 | `z-line` (4) | matched: `LINE` reads `fact('z-line').value` |
| 4 `counting-green` | the 16-pair minimum; prefixes 8–64 tokens; z per prefix; the email's z; hand-written max z; the lower line 1 and its false alarms | `short-text` (25 tokens, about 128 on average) | labelled (the email note: the minimum is the toy checker's, real text needs far more) |
| 5 `rewording` | the fewest swaps, z before and after, reworded green pairs and z, tokens changed | `paraphrase-weakens`, `paraphrase-attack` | labelled (the toy's six next-best swaps stand in for a paraphrasing model) |
| 6 `pictures-and-labels` | the 64 × 64 grey picture, z per trip, one grey level on one pixel | `c2pa` (version 2.5), `c2pa-stripped` | labelled (the pixel mark reads "(toy)"; the label is C2PA-shaped, signed with a demo key) |
| 7 `workbench` | green shares 0.25 and 0.5, nudges 1, 2, 4; the rule (18 of 20 caught, 0.4 nats, no false alarm, one token in 4 swapped); every result | `small-green-list` (0.1), `eu-ai-act` (2026-12-02) | labelled (the rule is a planning number; `ToyNote`: real models also favour the smaller list) |
| intro | the marked reply's z, the 32-token context, hand-written replies flagged, swaps to wash out | `detector-bias`, `green-list`, `z-line`, `paraphrase-attack` | labelled (the band's note: Larkspur mini is tiny) |
