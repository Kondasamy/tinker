# Skills (`/skills/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The returns desk and its binder carousel** (`src/components/scenes/carouselScene.ts`, `CAROUSEL_PARTS`): Larkspur's returns desk with the assistant (the kit's model machine) behind it and Rosa (CAST `rosa`) at its end, beside a **revolving binder carousel**: a lazy-susan stand of six ring binders standing spines out, one per skill, each spine its own colour with a blank label plate. A ticket waits in a tray at the desk's end. Words live only in pills: the carousel (`6 SKILLS`), the open binder's name, the desk's words loaded, the ticket. The stage draws its pills over the picture, outside the hand-drawn filter, whose wobble smears text this small (`carouselPills`, the scene's `bare` flag); the share image keeps them in. A brass pointer on the stand's base marks the slot that faces the desk, and that slot lights once its binder has been taken, so a turn always ends somewhere you can see.
- **Hero object: the revolving binder carousel.** No other scene has one (checked against `docs/modules/*.md` and `src/components/scenes/`): ring binders appear only as props (agents' tray, fine-tuning's bed, context's in-tray).
- **Living scene (KTD2, `Scene<Carousel>`):** asking a ticket slides it from the tray to the desk; the carousel turns until the picked binder's spine faces the desk, and the binder swings out and opens flat on the desk. A new ask first sends the open binder home. In the long prompt (chapter 1) every binder flies out at once, one after another, and the desk is buried in six open binders over the ticket. No match: the ticket lands, the carousel stays and no binder comes out. 900 ms per change; reduced motion jumps to the end.
- **Hands in the picture (KTD4):** drag the ticket from the tray onto the carousel (`HitLayer`: `ticket` drag, `carousel` drop; a press without a drag asks too). Dropped anywhere else, it snaps back and the status line says to drop it on the carousel. **Twin:** a `Select` of tickets and an Ask button beside the stage, both through the kit's one `ask` handler, which writes the visible status line.
- **Close-up (KTD6):** on each reveal step, on the part that answers the prediction (the buried desk, the one open binder, the newly picked warranty binder).
- **Second view:** the Words tab, a bar per ticket asked in the chapter: words loaded against the 20,000-word prompt.
- **Neighbour links for U11 (KTD8):** chapter 6 links to Dependencies ("read it before installing"); the intro names Context and Tool calling as prerequisites. Plain words: none needed (the copy says "label", never "metadata" or "frontmatter").

## Chapter pictures

Each step's start frame is the previous step's end state; the status line is the step's `status` (R10a). Reveal steps carry no callout: a callout hides while the stage is closed in, so it would only show before the close-up and give the answer away. The answer's binder in chapter 1 is named and ringed only while the stage is closed in on it.

| Ch | Step | Picture (end state) | Motion | Hands / control | Close-up | `say` part | Status line |
|---|---|---|---|---|---|---|---|
| 1 | ask | every binder open on the desk, the ticket buried | six binders fly out in turn and pile on the desk | drag the ticket, or Select + Ask | — | carousel | Every binder lies open on the desk, burying the refund ticket. |
| 1 | predict | the same buried desk (no binder named yet) | none | Predict | — | desk | Six open binders still cover the desk and the ticket. |
| 1 | reveal | close-up: the refund binder lifted off the bottom of the pile, ringed in light, named REFUNDS | zooms in | Reveal | binder, desk | — | The stage closes in: the refund binder, lifted from the bottom of the pile, is ringed in light. |
| 1 | again | a second ticket's edge out from under the pile; desk pill `2 TICKETS · 20,000 WORDS EACH` | ticket slides under the pile; the desk pill swells and settles | Select + Ask | — | desk | A second ticket slides under the same pile, and the desk's count shows the same words again. |
| 1 | quiz | as above | none | Quiz | — | — | The desk stays buried under all six binders. |
| 2 | ask | carousel turned to Refunds; that binder open on the desk, the rest shut | carousel turns, refund binder swings out and opens | drag or Select + Ask | — | carousel | The carousel turned to Refunds, and only that binder lies open. |
| 2 | predict | the same | none | Predict | — | binder | One binder open, five shut on the carousel. |
| 2 | reveal | close-up on the one open binder, its pill alone | zooms in | Reveal | binder | — | The open refund binder holds most of the words loaded. |
| 2 | more | the last ticket's binder open | binder goes home, carousel turns, next binder opens | Select + Ask, twice more | — | carousel | Each ticket turned the carousel to a different binder. |
| 2 | quiz | as above | none | Quiz | — | — | One binder lies open; the labels stay on the carousel. |
| 3 | ask | drill ticket on the desk, no binder out, carousel still | ticket slides in; carousel stays | drag or Select + Ask | — | carousel | No binder opened: no label matched the drill ticket. |
| 3 | predict | the same | none | Predict | — | carousel | The desk holds only the drill ticket. |
| 3 | rewrite | carousel turned to Warranty; its binder open, its slot lit | carousel turns, warranty binder swings out | label `Select`, then Ask | — | — | The sharp label turned the carousel to Warranty, and it opened. |
| 3 | reveal | close-up on the open warranty binder | zooms in | Reveal | binder | — | The warranty binder lies open beside the drill ticket. |
| 3 | quiz | as above | none | Quiz | — | — | The warranty binder stays open on the desk. |
| 4 | (planned) | a binder open with a stamping machine clipped inside: its script | the stamp presses a slip; only the slip slides to the model | Select + Run script | the slip | binder | — |
| 5 | (planned) | Damaged and Warranty labels overlap; the wrong one swings out | wrong binder out, then back, then the right one | label `Select` + Ask | both spines | carousel | — |
| 6 | (planned) | a seventh binder arrives by van; one page carries orders | the binder opens on the desk; a hidden page lights | Read + Install / Refuse | the hidden page | binder | — |
| 7 | (planned) | the carousel with six labels, twelve tickets in turn | each ticket turns the carousel | a label `Select` per skill, Run all | — | carousel | — |

## Engine (`src/lib/skills/`)

- **A word-overlap scorer stands in for the model's pick** (`skills.ts`): a label's score is how many of the ticket's word stems it shares (filler dropped, a crude suffix strip); the top score wins, the first binder on the carousel on a tie, none on zero. The copy says it is a stand-in: a real model reads the label, it doesn't count words.
- **Words loaded**: the long prompt is the base instructions plus every binder's body (20,000 words, 40 pages at 500 words a page); with skills it is the base plus every label plus the one binder picked.
- **Pins** (`data/skills/pinned.json`): each ticket's pick, each total, the vague-label case. `tests/unit/skills.test.ts` re-derives them. Chapter 7's `WINNERS` will join it.

## Toy vs real

Every number a chapter shows, and whether it is the real figure (matched: the code reads the fact's `value`) or a toy one (labelled: a toy note says so, with a cited real figure beside it).

| Chapter | Number shown | Real figure (fact id) | Matched or labelled |
|---|---|---|---|
| 1 | 20,000 words, 40 pages (hand-set binder sizes) | `on-demand`, `only-relevant` | Labelled: `ToyNote` |
| 1, 2 | Words loaded per ticket (computed) | `label-cost` (about 100 tokens a label, under 5,000 for instructions) | Labelled: words, not tokens; `ToyNote` |
| 2 | Labels' words (counted from the label text) | `label-cost`, `label-always` | Labelled |
| 3 | Which binder opens (stand-in scorer) | `label-decides`, `poor-label` | Labelled: the scorer is a stand-in |
