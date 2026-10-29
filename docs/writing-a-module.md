# Writing a Tinker module

A module explains one concept, from AI or classic tech, as a story the reader plays. The picture on the left is live; the story column on the right asks the reader to do one thing at a time in it, and they watch what changes. This guide is the house style. [AGENTS.md](../AGENTS.md) holds the full list of decisions; where the two overlap, AGENTS.md wins.

---

## 1. Pick the concept, the reader and the level

- **The reader** works at a company adopting the technology: a product manager, an engineer, an analyst. Assume no background. Keep any maths optional.
- **One concept per module.** If the chapter list needs two stories, it is two modules.
- **Level** describes the reader the module is written for, not how hard the topic sounds:

| Level | The reader | Example |
|---|---|---|
| Beginner | Has used the technology, never looked inside. Needs no other module. | RAG, Caching & CDNs |
| Intermediate | Knows the basics of one related module and builds on it. Names a prerequisite. | Tool calling & MCP, Evals (after RAG) |
| Advanced | Comfortable with the Intermediate ideas; the module goes into the machinery. | AI agents (after Tool calling), Replication & consistency (after Databases) |

## 2. Write one story

Each module tells one story from the first problem to the best fix. Most modules follow **Larkspur Supply Co.**, a fictional hardware company: its AI assistant in RAG and Tool calling, its shop, warehouses and orders in Caching, Databases and Consistency. A new module may continue that story or start its own. The story is the reason each chapter exists: something goes wrong, the reader finds out why, and fixes it.

## 3. Shape each chapter as a loop

Every chapter opens with context, never straight into a step, and keeps it short: the story so far (at most 30 words) and the chapter's question (at most 20) show; "You will learn" and "Words you'll meet" fold under "About this chapter". All of it lives in the chapter's `intro` in the module file. Then the steps run this loop:

1. **Orient.** What are we trying to do, and why does it matter here?
2. **Predict.** Before a reveal, the reader commits to what will happen (`Predict`). Their pick locks and stays visible beside the outcome. Ask about the exact relationship the next step will show. Predictions help the reader remember the thing they predicted, not the material around it.
3. **Act.** One control, one change: a click, a choice, a knob.
4. **Observe.** The picture changes. The reader sees the consequence, not a description of it.
5. **Explain.** One or two short sentences on why. Say why the plausible wrong answer fails.
6. **Check.** A checkpoint quiz (`Quiz` with `why` and `unsure`) in a new context, without hints on screen.

Rules for steps:

- One idea per step, in plain words and short sentences: at most 25 words. The picture shows what happened; the narration says what it means, and `act` says what to do next ("Click 2020."). The runner draws `act` as its own bold, highlighted line: testers could not pick an instruction out of the narration.
- Define a term the first time it appears, and add it to the chapter's `terms`. Use the term's own word in the narration: the runner marks its first use as a tap-to-define button.
- Give a step a callout (`say: { block, text }`, at most 5 words and 16 characters) when the picture has a part to point at, so the lesson sits on the picture, not only in the text. `block` names one of the scene's exported parts; export `PARTS` from the chapter (the scene's list, or `[]` for a chart) and pass `say` into the stage.
- Facts carry their source through a `Fact` (or `Cite`): the source opens from a small mark, never an inline "Source:" link.
- Puzzles (`puzzle()`) hand the reader a broken setup. Hints appear after three misses; "Show me" is always there.
- Finished steps stay reachable as a folded "story so far" log. Don't write a step that only makes sense if the previous one is still on screen.
- `tests/unit/copy-budget.test.ts` checks every budget above; a new module is strict from its first chapter.

## 4. Write questions that teach

Quizzes and recall items are where the explanation sticks. Retrieval practice with explained feedback is the most reliable way to make learning last; a right/wrong stamp alone does very little.

- **Every wrong option is a real misconception.** Write the reasoning path that leads to it ("the model runs the tool itself"), not a joke option or a random number.
- **Every option has a `why` line.** For a wrong pick, it names the misconception and the cue the reader missed. For the right one, it says why it holds.
- **Offer "I'm not sure".** It shows the answer without counting as a miss, so readers don't guess.
- **One defensible best answer.** No "all of the above", no trick wording.
- **Recall items ask in a new context.** The recap and the warm-up reuse ideas, not sentences: if chapter 3 asked about a refund, the recall item asks about a delivery.

Each module has a **recall bank** (`src/content/<module>/recall.ts`): three to five items per chapter. Mark the module's single most important idea with `pin: true`; the warm-up always includes it until the reader gets it right. The recap page (`/<module>/recap/`) and the warm-up on the module intro read from this bank.

## 5. Get every fact from data

- Numbers, dates, recorded answers and claims about real systems live in `data/<module>/` with their sources, and the copy imports them. Never type a number or an answer into page copy.
- There is no backend. Whatever the browser can't run for real (a large model's reply, a live network) is **pre-recorded** or simulated for every situation the reader's controls can reach, and a coverage test proves it. Keep each control to a small set of prepared choices so the recordings stay finite.
- Everything else (validation, scoring, maths, a cache, an index, the protocol messages) runs for real in the browser.

## 6. Draw the pictures

- **Style:** Colorfigures: flat three-tone shading, heavy ink silhouettes, flat blue shadows, warm paper. Palette in `src/styles/tokens.css` and `PALS` in the engine.
- **Kinds:** isometric scenes (`src/lib/iso/`, `IsoStage`) for things with parts; flat sequences (`src/lib/iso/flat.ts`, `FlatStage`) for flows over time. Both use the same ink.
- **Lead with a scene the reader can picture**, not a flow chart. Tool calling's back office (`src/components/scenes/officeScene.ts`) turns a message sequence into a place: desks, belts, envelopes, a barrier that lifts. Keep the precise view (the sequence) one tab away, and drive both from the same data. A new figure kind goes beside the engine, never inside `core.js` (upstream code; mark local changes with `adapted:`).
- **Text in pictures goes in label pills**, never as small text painted on faces. Long text (JSON, messages, documents) goes in the story column or the drawer.
- **One figure on the stage at a time**, chosen by the step, in a fixed frame so the page never resizes.
- **Check at 390px wide.** Phones stack the picture above the story; pills are larger there.
- **Reduced motion:** show final states at once; motion is never the only way to see what happened.

## 7. Files a module needs

`pnpm new-module <id> "<Title>"` creates them. Why each one exists:

| File | Job |
|---|---|
| `src/content/<id>/module.ts` | Registry entry: title, description, level, status, author, prerequisites, story, chapters with their `intro` |
| `src/content/<id>/NN-<slug>.tsx` | One chapter: its steps, controls, stage and drawer panels. The template's is `01-first-step.tsx` |
| `src/content/<id>/recall.ts` | The recall bank |
| `src/pages/<id>/index.astro` | Module intro: the idea in one example, how it works, the story's company, the chapter path, credits. Lead each section with a picture and a one-line caption; mark longer text `.more` so the Pictures reading mode folds it away. Use `ReadingMode` and `ChapterCards` from `src/components/intro/` |
| `src/pages/<id>/[chapter].astro` | Chapter route. It picks the chapter's island with a chain of `chapter === ... ?` checks, not a lookup table, because hydration needs a static import per island. |
| `src/pages/<id>/recap.astro` | The recap page |
| `data/<id>/` | Facts with sources, recorded answers, fixtures |
| `tests/e2e/<id>.spec.ts` | Plays every chapter (mouse and keyboard), axe, phone width |

The scaffold registers the module after the last live module in `MODULES` (`src/lib/modules.ts`) (removing its planned card), so the home keeps every live module's number. Its pages join `ALL_PAGES` (`src/lib/pages.ts`) from that entry: the intro's share card is built from the title and description unless you write one in `introMeta`. `src/dev/og.astro` draws a new module's pages with the recall cards until you add a picture case for them; then run `pnpm og` and commit the JPEGs. Add each new chapter to `module.ts`, `recall.ts` and the `[chapter].astro` chain, and a walk for it to the e2e spec.

The template lives in `templates/module/` (outside `src/`, so it is never built or type-checked); its files use `__ID__`, `__TITLE__` and `__CONST__` for the scaffold to fill in.

**Never rename a chapter id or module id once it ships.** Readers' saved progress is keyed by them.

## 8. Done checklist

- [ ] Every chapter opens with its `intro` and runs orient → predict → act → observe → explain → check
- [ ] The copy budgets pass (`tests/unit/copy-budget.test.ts`): short steps, a short opening, one-sentence quiz `why`s, chapter terms used in the narration
- [ ] Every quiz option has a `why` line naming a real misconception; "I'm not sure" is offered
- [ ] The recall bank covers every chapter, items ask in a new context, one item is pinned
- [ ] Every fact, number and model answer comes from `data/` with a source
- [ ] Text in pictures is in label pills; one figure on the stage at a time
- [ ] Looked at every page at desktop width and 390px, with and without reduced motion
- [ ] Credits: the module author in the registry (Colorfigures is credited on the home footer only)
- [ ] `pnpm check`, `pnpm test`, `pnpm test:e2e` pass; `pnpm og` run and JPEGs committed

## Notes for maintainers

- The dev server keeps its own Vite cache (`node_modules/.vite-dev`); keep the `dev-cache` integration in `astro.config.mjs`. Without it, running `astro build` or `astro check` beside a dev server crashes the dev server.
- Layout-level rules that style elements inside components go in `:where(...)`, so component rules always win whatever order Astro bundles the CSS. Dev-only pages use scoped styles, never `is:global`.

## Trailer (optional, at go-live or any time after)

A trailer is a module's one video: under a minute of the live chapters played by hand, narrated, on the intro. `videos/rag-trailer/` is the template; its `BRIEF.md` lists the pipeline.

1. Copy `videos/rag-trailer/` to `videos/<id>-trailer/` (skip `node_modules/`, `capture/`, `renders/`). Output names follow the folder.
2. Rewrite `BRIEF.md` and `SCRIPT.md`. Every spoken number comes from the module's data.
3. Point the takes in `record.mjs` at the module's chapters, and the cut ranges in `cut.sh` at the takes.
4. Retitle the chapter plates and end card in `index.html`, the `name` in `package.json` and `meta.json`, and pick the poster time (`POSTER`) in `deliver.sh`.
5. Run `voice.mjs` → `music.mjs` → `record.mjs` → `cut.sh` → render → `deliver.sh` (commands in `BRIEF.md`).
6. Add `<Trailer id="<id>" name="<short name>" length="m:ss" />` to the intro's hero buttons, and a `tests/unit/<id>-trailer.test.ts` modelled on RAG's that finds every captioned number in the module's data.

`tests/unit/trailers.test.ts` and `tests/e2e/trailer.spec.ts` pick the new trailer up on their own.
