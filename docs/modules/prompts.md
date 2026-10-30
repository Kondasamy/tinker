# Writing a prompt (`/prompts/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The docket board** (`src/components/scenes/docketScene.ts`): Larkspur's support desk, Office's counter with its phone (`counterAt`, the same piece Office draws), with Rosa (`CAST.rosa`) behind it. Beside her a work-order docket hangs on a clipboard on an easel, its face turned the same way as the model machine's screen, and the machine stands past it reading it. The reply comes out of the machine's slot onto a tray as a reply slip.
- **The docket holds the prompt's parts in the order the model reads them** (`partsOf`): the rules card on top or at the bottom, then role, task, examples, format and the customer's ticket, which is always clipped. At most 6 strips (KTD10's cap); each slot has its own colour, and the tray's buttons carry the same swatch, so a phone reader matches strip to button without a pill. Each strip carries `data-slot`, which the tests read. A card clipped by the last action slides down onto the docket; with reduced motion it is simply there.
- **The machine's screen follows the reply's grade** (`stateOf`): `OK` when every check that applies passes, `???` (warn) when the key fact is in but a format, routing or house-rule check fails or the examples' quirk turned up, `!!` (bad) when the key fact is missing, `...` with no reply yet. The slip carries ruled lines (more for a longer reply, capped) and a round stamp: a mint tick when the key fact is in, a tomato cross when not (never colour alone).
- **Words only in pills**: on desktop each strip's short name; on phones only the slip's pill (the tray and the Text tab carry the names). `esc()` on every pill.
- **Parts for callouts** (`DOCKET_PARTS`): `docket`, `machine`, `rosa`, `slip`, and each card's slot (`role`, `task`, `examples`, `format`, `rules`, `ticket`), drawn only while that card is on the docket.
- **Clip cards** (`DocketStage`, `src/content/prompts/kit.tsx`): every card in `CARDS` is a button in a tray under the frame. Enter (or a click) clips it into its slot, replacing the slot's card; pressing a clipped card unclips it. A card the chapter keeps closed stays focusable with `aria-disabled` and shows its one-line reason (`blocked`, `unclipBlocked`). Where the chapter opens it (`canMoveRules`), one toggle moves the rules card first or last. Every target is at least 44 px.
- **Read-out**: one polite `role="status"` line under the tray naming the reply's grade after each action (`gradeText`), cleared when `step` changes.
- **The Text tab** (the second view, also the precise one): the assembled prompt as text, part by part with its slot name, then the reply with who wrote it (the recording model's id and date, or "simulated" with the simulator and date), then each grade that applies as ✓ or ✗ in words. With `tickets` (chapters 6 and 7) it adds each ticket's pass or miss and the count.
- **Chapter 1** (`MiniStage`): the docket holds one instruction card and Larkspur mini continues it live, loaded once per page through Transformers' model store. The slip holds the continuation; the screen reads `???`, since it answered nothing. The Text tab shows the instruction and Larkspur mini's words.
- **Home and share images:** the home card and the intro are the clear docket tested on all six tickets; the hero plot is `docketPlot`, the easel set down small.

## Chapter pictures

| Ch. | Picture | Mechanic live? | The step's control | `say` parts |
|---|---|---|---|---|
| 1 `it-only-continues` | One instruction card on the docket; Larkspur mini's continuation on the slip, screen `???` | No clipping; the continuation runs live | the instruction pick (`MiniStage`'s two chips, `prompt`) | `machine`, `slip`, `task` |
| 2 `say-what-you-want` | Vague task, then clear, with and without the role card; slip stamp turns from cross to tick | Yes: Who you are, Vague task, Clear task | the tray (`docket`) | `task`, `role`, `slip` |
| 3 `show-dont-tell` | Role and clear task, then one, two or two quirky examples; screen `???` when the quirk turns up | Yes: the three example cards | the tray (`docket`) | `examples`, `slip` |
| 4 `put-it-in-a-shape` | A format card under the task; the slip's grade reads the list or the JSON | Yes: the two format cards | the tray (`docket`) | `format`, `slip` |
| 5 `order-and-emphasis` | Two examples, the rules card on top, then moved last; replies simulated (labelled) | Yes: the rules toggle | the rules toggle (`docket`) | `rules`, `examples` |
| 6 `test-it-like-code` | The JSON docket with the house rule, vague then clear, on six tickets, then the smaller model; the slip's pill counts tickets passed | Yes: the two task cards; the model chips | the tray, then the model chips (`docket`, `model`) | `task`, `machine`, `slip` |
| 7 `workbench` | The bench's docket on six tickets; passes and prompt length beside it | Yes: every card the bench opens, and the rules toggle | the tray (`docket`) | `docket`, `slip` |

## Toy vs real

The replies of chapters 2–4, 6 and 7 are real: recorded once from two real models (`recording-model`, `small-model`) and graded live, so every word and pass count read off them is real. The tickets and Larkspur's policy are hand-written story data (the intro says so). Larkspur mini (chapter 1) and its tokenizer are the shared toy of `docs/lm-kit.md`: labelled by `ToyNote`, never retrained.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Larkspur mini's size (`ToyNote`, from `meta.json`); 24 word pieces per continuation (`MINI_TOKENS`, a hand-set run length) | `instruction-tuning` (137 billion numbers; 20 of 25 tasks) | Labelled: `ToyNote` beside the fact on the quiz step |
| 2 | Words in the vague and role replies; the key fact's extension | `clear-and-direct` | Real (recorded replies); the extension is story data |
| 3 | One or two examples | `example-bias` | Real (recorded replies) |
| 4 | None; the quiz's "one reply in fifty" is a made-up case | `structured-outputs` | Real (recorded reply) |
| 5 | None; replies simulated by stated rules (`simulate.ts`) | `lost-in-the-middle` | Labelled: the copy and bylines say simulated |
| 6 | Tickets passed of 6, vague, clear and on the smaller model | `openai-guide` | Real (recorded replies, live graders); the 6 tickets are hand-written |
| 7 | Tickets passed of 6; the winner's and the longest passing prompt's tokens | `token-price` ($2 per million input tokens) | Passes real; token counts labelled: Larkspur mini's tokenizer, a stand-in (narration and `ToyNote`) |
| Intro | Tickets, passes, replies recorded | `clear-and-direct`, `example-bias`, `openai-guide` | Real (recordings) |
