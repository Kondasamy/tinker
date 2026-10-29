# Who labels the data (`/labelling/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The sorting room** (`src/components/scenes/pigeonholeScene.ts`): the hero is a **pigeonhole sorting rack**, one long row of five deep holes on legs against the back wall, one hole per intent in rack order (`INTENTS`, keys 1–5), each with its name in a pill. It is not Email's post-room frame (a tall grid of small cubbies on one wall): five big holes in a row, a coloured lip on each, slips lying in them. In front of it a long table; on its near side the three `CAST` labellers stand at it, backs to the reader, told apart by silhouette as well as colour: Rosa (careful, hair in a bun, standing still), Mira (curly hair) and Tom (rushed, beanie, mid-stride). The current ticket lies alone on the table's near edge (one ticket at a time); a gold ticket carries a star. At the table's left end the **gold-star tray** holds the gold tickets (a star on its front, a stack inside). From chapter 6 the model machine stands at the table's right end as a fourth labeller.
- **Slips in the holes are the picks.** Each pick is a slip in its labeller's shirt colour lying in the hole they chose; a hole's pill carries its key and tally (`1 REFUND · 2`; even holes' pills stand over the rack, odd ones hang under its lip, so the diagonal row never collides), so the count never rests on colour. The reader's own pick rings its hole in the accent colour and lights its pill. A vote lights the winning hole's pill. A labeller the gold check flags gets a raised tomato flag at their place (flag and pill, not colour alone). The guideline is a pinned card on the rack's end.
- **Caps** (KTD10): 5 holes, one ticket on the table, at most 6 slips drawn per hole (the pill carries the rest).
- **Phones** (`scale` 2): hole pills show the key number only (the buttons below read `1 Refund` …); the caption and the read-out carry the tallies.
- **The Matrix tab, one tab away** (`RackStage`, `src/content/labelling/kit.tsx`): the 5 × 5 agreement matrix between two labellers (rows one, columns the other, `matrix()`), with agreement, chance agreement and Cohen's kappa under it (`agreement`, `chance`, `kappa`). The diagonal is outlined and bold, so agreement reads without colour. A pair switch (Rosa–Mira, Rosa–Tom, Mira–Tom) picks the two.
- **The mechanic, sort the ticket** (`SortTicket`): the current ticket's text, then five pigeonhole buttons (`1 Refund` … `5 Account`, ≥ 44 px on phones). A click, or a number key 1–5 while the control has focus, files it; then the three labellers' slips drop into their holes (a CSS drop; with reduced motion the slips and tallies appear in place). One polite `role="status"` read-out outside the drawing says where the reader filed it and each labeller's pick, nothing else; it clears when the ticket changes. `SortRoom` wires the stage and the control over a run of tickets (Next ticket; earlier tickets' slips stay in the holes, plain).
- Parts for callouts (`LABEL_PARTS`): `rack`, `ticket`, `gold`, `guide`, `rosa`, `mira`, `tom`, `model`, and each hole by intent id (`refund`, `return`, `delivery`, `product`, `account`).
- **Home and share images:** the home card and the intro are three labellers' picks for one ticket in three holes; the hero plot is `rackPlot`, the rack alone with a few slips.

## Chapter pictures

| Chapter | The picture | Mechanic live | The step's control | `say` parts |
|---|---|---|---|---|
| 1 Someone has to decide | the rack and the three labellers; the three-way ticket `t022` on the table; after the reader files it, three slips land in three different holes | yes: sort `t022` | `SortTicket` (filed intent) | `ticket`, `rack`, `rosa`, `mira`, `tom` |
| 2 How often do they agree? | a few pool tickets sorted in turn, the holes' tallies building; then the Matrix tab over the pool before the guideline | yes, then the matrix | `SortTicket`, then the pair switch | `refund`, `return`, `mira` |
| 3 Write the rule down | the guideline card pinned on the rack; Mira's refund/return slips move under it (17 disagreements to 1) | yes: re-sort a refund/return ticket under the rule | the guideline toggle | `guide`, `refund`, `return` |
| 4 Check the checkers | gold tickets come from the gold-star tray; after the gold check, Tom's flag goes up (gold 0.6 against the 0.8 bar) | yes: sort gold tickets | `SortTicket` on a gold ticket | `gold`, `tom` |
| 5 Many votes | each ticket's three slips and the vote's lit hole; the minority-right ticket `t033` | yes: predict the vote, then file | `SortTicket` (the predicted vote) | `rack`, the hole of the pick |
| 6 Label the hard ones first | the model machine joins the table; a least-sure ticket from `HARD`; its slip lands with the people's | no: the order chooser drives it | the order choice (least-sure or random) | `model`, `ticket` |
| 7 Workbench | the setup drawn: who sits at the table, the model machine when a model labels, the gold tray's share | no: the workbench form | the workbench's controls | `gold`, `model` |
