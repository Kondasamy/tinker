# Before GenAI (`/before-genai/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Placement

- **Module 0, fixed first in `MODULES`.** It is the prequel every new reader meets through "Start with the basics"; numbering it 0 keeps every other module's number (`moduleNumber()`).
- **A first-visit entry only.** Home's Continue leaves it out of the next-unfinished pick once a reader has progress in any other module.
- **What changed, not how it works.** Chapters 4–6 end on a link to the chapter that goes deeper (Transformers ch1, Pre-training, Post-training ch1, Prompts ch1), read from the registry.

## Picture

- **Larkspur's help counter** (`src/components/scenes/kioskScene.ts`): three stations in one frame. The hero object is the **scripted help kiosk**, a standing kiosk with a button panel and a rack of fixed reply cards; beside it a **sorting rack** with one bin per Labelling intent; then `modelMachine` for the GenAI bot. A `CAST` customer holds a blank message card.
- **One run, both views.** `run(message)` (`src/lib/before-genai/bots.ts`) feeds the scene, the side-by-side view (`kioskFlat`, three lanes) and the story column (`Transcript`). `outcomes(run)` gives each bot answered / fell back / not recorded; a station lights when it answered, and a fallback shows by shape (the kiosk's raised card, an empty bin).
- **Sentences live in the story column** (R17): the message and every reply are quoted transcript lines; pictures carry pills only. Lanes stack on phones (the shared `flat.css` breakpoint).
- **Chapter 3** draws `predictScene`: Email's post tray and gauge (`postScene.ts`) and Recommendations' shelf (`shelfPiece`), each in `mini`. Before the reveal it is neutral: needle upright, both trays empty.
- Parts for callouts: `KIOSK_PARTS` (`kiosk`, `cards`, `sorter`, `model`, `customer`) and `PREDICT_PARTS` (`spam`, `junk`, `shelf`).
- **Hero plot** `kioskPlot`: the kiosk alone in `mini`. The prequel takes the stand's first turn and is the module in the home share image (`HERO_LIVE`).

## Engine

- **Scripted bot:** ordered keyword rules in `data/before-genai/rules.json`, first match wins, else the fallback card. Chapter 1's `WINNERS` are computed: a word of the missed message wins if it makes that message match and steals no other.
- **Intent bot:** Labelling's naive Bayes (`src/lib/labelling/triage.ts`) on Labelling's 120 tickets and intents, counted on first use (the home hero never trains it). A lead under `MARGIN_FLOOR` (0.25) falls back.
- **GenAI bot:** the recorded reply from `data/before-genai/replies.json`, written by `scripts/record/before-genai.mjs` (one instruction-tuned model, temperature 0, needs `NVIDIA_API_KEY`). Replies are never hand-edited; a new recording means new messages. Tests that read recorded replies skip until a recording exists.
- **Readers pick from a fixed message set** (`data/before-genai/messages.json`); there is no free-text input.
- Chapter 6's base-model and assistant replies are written for the site and labelled so, as Post-training ch1 does.

## Toy vs real

Every number a chapter shows, and whether it is the real figure (matched: the code reads the fact's `value`) or a toy one (labelled: a toy note says so, with a cited real figure beside it).

| Chapter | Number shown | Real figure (fact id) | Matched or labelled |
|---|---|---|---|
| 2 | Intent bot's lead over the next intent | none: a toy model on Labelling's tickets | labelled |
| 3 | Spam score of the prize email | Sahami et al. 1998, 99.9% threshold (`spam-filter`) | labelled |
| 4 | Larkspur mini's top-5 chances, its parameter count | GPT-3, 175 billion parameters (`few-shot`) | labelled toy, real beside it |
| 5 | GPT-3's size against Larkspur mini | 175 billion (`few-shot`) | toy labelled, real matched |
| 5 | Transformer 2017, GPT-3 2020 | `transformer-paper`, `gpt3-date` | matched |
| 6 | InstructGPT 1.3B preferred over 175B; ChatGPT 30 Nov 2022 | `instructgpt-small`, `chatgpt` | matched |
