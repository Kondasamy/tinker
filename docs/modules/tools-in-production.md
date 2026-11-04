# Tools and MCP in production (`/tools-in-production/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The workshop shadow board** (`src/components/scenes/shadowScene.ts`, `SHADOW_PARTS`): a pegboard on the back wall with twelve tool silhouettes painted on it in dark paint, four columns of three, each column topped by a band in its server's colour and holding that server's tools. A key strip at the board's left end holds the sign-in (one gold key, or a tag per server). In front stand the bench (Tomás, CAST `tomas`, at its right end) and the assistant (the kit's model machine). Four supplier vans (the kit's `van`, cargo box in the server's colour) each have a bay at the front right; a van at the dock has its crate down in front of its rear doors, with a red wax seal on the crate's face. Words only in pills: the vans' names, `12 OUTLINES`, the lit outline's tool, the crate's seal state, the key strip, the bench's tokens and heap.
- **Hero object: the shadow board.** No other scene has one (checked against `docs/modules/*.md` and `src/components/scenes/`): vans and crates appear elsewhere as props, a pegboard with painted outlines nowhere.
- **The unique device:** a tool that changed since it was approved no longer fits its painted outline. It hangs 16° askew and 22% larger, overhanging the silhouette, and the silhouette under it turns tomato with heavy ink. The crate's wax seal splits in two when its server changed a tool; a pinned column carries the kit padlock, and a tool the pin refuses flies up, stops short and drops back into its crate, which is stamped with an ink cross. Lazy loading: vans wait in the yard and back up to the dock only when a search finds one of their tools.
- **Living scene (KTD2, `Scene<Shadow>`, 1000 ms):** vans drive between the yard and the dock (first 40%); tools fly in an arc from the crate to their outline (40–90%, or 5–75% with no van moving), landing askew if changed; unhung tools fly back to their crate; a held tool flies halfway and back; a seal's halves pull apart; extra tools fall onto the bench one by one; a kraft envelope arcs from the bench onto a van's roof, leaving a dotted trail with an arrowhead; a pass card travels from one van's crate to another and lands on the floor before it (let in: a placard with a big check stands on that crate) or bounces back (refused: a placard with a big cross). Reduced motion jumps to the end; every end state shows the change without motion (askew tool with a `NO FIT` pill, tomato outline, split seal, placard cross, padlock, envelope and trail, barrier with a `BARRED` pill). The crate a step is about stands on a mustard pad ringed in heavy ink. A close-up's pill grows with the zoom rather than jumping to phone size.
- **Hands in the picture (KTD4):** drag a tool from its van's crate onto the board (`HitLayer`: a `crate:<server>` drag per docked van whose tools the step offers, `board` drop; a press without a drag hangs too). Dropped off the board, it snaps back and the status line says to drop it on the board. **Twin:** a `Select` of tools (or requests, in chapter 2) and a Hang (Ask) button beside the stage, through the kit's one handler, which writes the visible status line.
- **Pills outside the filter:** the live stage draws pills through `PillLayer` (`shadowPills`, `bare: true` on the state); the share image keeps them inline. On phones the vans' name pills show only for the van a step is about. The heap's count is in the status line only. The stage keeps one size in every chapter: the twin row holds its height when a chapter has no twin.
- **Close-up (KTD6):** on each reveal: the ringed look-alike (1), the bench's tokens (2), the askew outline (3), the held crate (4), DocShelf's van with the file (5), the Order desk's van with the refused pass (6), the board after the best week (7).
- **Second view:** the Prints tab, a table of the twelve board tools' fingerprints: approved, and as each day (chapters 3–4: today; chapter 7: Monday to Friday) has them; a changed one is marked "changed".

## Chapter pictures

Each step's start frame is the previous step's end state; the status line is the step's `status` (R10a).

| Ch | Step | Picture (end state) | Motion | Hands / control | Close-up | `say` part | Status line |
|---|---|---|---|---|---|---|---|
| 1 | load | four vans docked; 12 tools hang, 48 lie on the bench; tokens pill | tools fly from crates to outlines; the bench fills | drag a crate, or Select + Hang | — | board (“Each tool’s spot”) | All four vans unloaded: 12 tools hang and 48 more pile on the bench. |
| 1 | predict | the same | none | Predict | — | board | Sixty tools crowd the board and the bench; nothing is picked yet. |
| 1 | ask | create_shipment ringed in mustard, PICKED pill; model amber | none (ring appears) | Ask | — | model | The assistant picked create_shipment, a look-alike, not book_courier. |
| 1 | reveal | the same | zooms in | Reveal | lit | lit | The look-alike create_shipment is ringed on the board. |
| 1 | quiz | the same | none | Quiz | — | — | The board stays crowded, create_shipment ringed. |
| 2 | ask | QuickPost and Order desk docked; three found tools hang; 3,040 tokens | two vans back up; three tools fly up | Select + Ask | — | board | QuickPost and Order desk docked; the three found tools hang, 3,040 tokens loaded. |
| 2 | predict | the same | none | Predict | — | board | Two vans at the dock, three tools on the board, the others still packed. |
| 2 | again | Stockroom docked alone; its found tools (one on the bench); 2,740 tokens | tools fly home, two vans leave, Stockroom backs up, its tools fly up | Select + Ask | — | stockroom | Stockroom docked alone; its three found tools hang, 2,740 tokens loaded. |
| 2 | reveal | the same | zooms in | Reveal | bench, stockroom | — | The bench reads 2,740 tokens for the stock request. |
| 2 | quiz | the same | none | Quiz | — | — | Stockroom’s three tools hang; every other van waits in the yard. |
| 3 | night | QuickPost docked, board empty, seal split | tools fly back to the crate; the seal splits | Next morning | — | quickpost | Overnight QuickPost changed book_courier: its seal broke and the board was cleared. |
| 3 | predict | the same, crate on its lit pad | none | Predict | — | crate (“Renamed field”) | QuickPost’s crate waits at the dock, its wax seal split. |
| 3 | hang | book_courier askew over a tomato outline, NO FIT pill | the tool flies up and turns askew as it lands | drag, or Select + Hang | — | — | book_courier hangs askew: it no longer fits its outline. |
| 3 | reveal | the same | zooms in | Reveal | lit | — (the NO FIT pill says it) | book_courier hangs askew over its tomato outline. |
| 3 | quiz | the same | none | Quiz | — | — | book_courier still hangs askew. |
| 4 | pin | QuickPost's three tools hang; padlock on its column | none (padlock appears) | Pin QuickPost | — | board | A padlock sits on QuickPost’s column: its three approved fingerprints are kept. |
| 4 | night | board cleared, seal split, padlock stays | tools fly back; the seal splits | Next morning | — | — | QuickPost’s seal broke overnight; book_courier’s fingerprint no longer matches. |
| 4 | predict | the same | none | Predict | — | crate | QuickPost’s crate waits at the dock, its seal split, the padlock on its column. |
| 4 | hang | a placard with a big cross on the crate, HELD pill; outline empty | the tool flies up, stops, drops back | drag, or Select + Hang | — | — | The pin held book_courier back in its crate: its print changed. |
| 4 | reveal | the same | zooms in | Reveal | crate | crate | book_courier lies back in QuickPost’s crate, stamped with a cross. |
| 4 | quiz | the same | none | Quiz | — | — | book_courier waits in its crate; the outline stays empty. |
| 5 | read | DocShelf docked, a tall slip in its crate, the crate on a lit pad, SLIP pill | none (pad appears) | Read the description | — | — | DocShelf’s crate is ringed: find_manual’s description hides orders under its first line. |
| 5 | predict | the same; the description in the card | none | Predict | — | — | DocShelf’s crate waits at the dock, the slip sticking out of its lid. |
| 5 | hang | find_manual hangs; a kraft envelope on DocShelf's van roof, a dotted trail from the bench; model red | the tool flies up; the envelope arcs from the bench to the van, drawing its trail | drag, or Select + Hang | — | — | The hidden orders were obeyed: a key file flew to DocShelf’s van. |
| 5 | reveal | the same, find_manual ringed | zooms in | Reveal | docshelf, lit | — | The key file lies on DocShelf’s crate; the assistant’s light is red. |
| 5 | bar | a tall barrier across DocShelf's bay, BARRED pill, van in the yard | the tool flies back, the van pulls away | Stop trusting DocShelf | — | — | A barrier closes DocShelf’s bay; its van stays in the yard. |
| 5 | quiz | the same | none | Quiz | — | — | DocShelf’s bay stays barred. |
| 6 | replay | a gold key appears on the strip; the bright gold pass lies on the floor before the Order desk's crate, a dotted trail with an arrowhead behind it, a placard with a big check on the crate | the pass arcs from QuickPost to the Order desk | Replay at the Order desk | — | — | The Order desk let in the key QuickPost carried over. |
| 6 | predict | the same | none | Predict | — | — | The Order desk’s crate carries a big check and QuickPost’s gold pass. |
| 6 | signin | the gold key becomes four coloured tags on the strip | none (tags replace the key) | Sign in per server | — | key (“One per server”) | Four passes, one per server, replace the shared key on the strip. |
| 6 | own | a placard with a big cross on the Order desk's crate; the pass back on QuickPost's; a dotted trail out and back | the pass arcs over and bounces back | Replay at the Order desk | — | — | The Order desk refused the pass: it was issued for QuickPost. |
| 6 | reveal | the same | zooms in | Reveal | orderdesk | — | A cross on the Order desk’s crate; the pass went back to QuickPost. |
| 6 | quiz | the same | none | Quiz | — | — | Each server holds its own pass on the key strip. |
| 7 | run | all vans docked; every outline filled, two askew; 48 tools on the bench; an envelope on DocShelf's crate | tools fly up, the bench fills, the envelope flies | Run the week | — | board | All 15 requests ran, but 15 leaked through poisoned descriptions. |
| 7 | predict | the same | none | Predict | — | — | Every van docked, the board askew in two places, a file sent off. |
| 7 | fix | the reader's policy: barriers, padlocks, held and askew tools, the bench | as the policy changes | the switches, Run the week | — | — | Best week: 11 of 15 done, no leaks, 39,180 tokens. |
| 7 | reveal | the best week | zooms in | Reveal | board | board | Padlock on QuickPost, DocShelf barred, few tools on the board, the bench clear. |

Chapters 2, 6 and 7 have no in-picture action (their mechanics are a request, a sign-in and switches); chapters 1, 3, 4 and 5 do (drag a tool from its crate).

## Engine (`src/lib/tools-in-production/`)

- **Catalogue** (`tools.ts`, `data/tools-in-production/servers.json`): four fictional MCP servers on `.example` domains, fifteen tools each (60), hand-set token sizes; twelve board tools carry a full definition (name, description, input shape). Tool ids are `server.name`, as the spec suggests prefixing by server.
- **Tool search**: a word-matching stand-in (labelled): stems of the request against each tool's name (counted double) and description; the best three, catalogue order on a tie. Lazy tokens = the search tool + the three found.
- **Fingerprint**: FNV-1a (32-bit) over a key-sorted serialisation of name, description and input shape (`canonical`), shown as 8 hex digits. `changed()` applies a rename or a new description.
- **Poisoned-description check** (`poisoned`): a toy check for a few telltale phrases (Invariant Labs' example among them); the copy says a person reads it.
- **Passes** (`accepts`): a server's own pass works only there; the shared key works everywhere.
- **The hand-written example run** (`story.json` `eagerRun`): with every tool loaded, the courier request picks `orderdesk.create_shipment`. Labelled "hand-written example run", never recorded.
- **Workbench** (`week.ts`): a hand-written week (`story.json`): Tuesday Stockroom renames `warehouse` to `site`; Wednesday QuickPost's `track_parcel` gains hidden orders (a rug pull); DocShelf's `find_manual` is poisoned from day one. Per server: trust, pin, load when needed (4,096 policies). A request is held if its tool's server is pinned and the tool drifted, untrusted if its server is off, done if its tool loaded; an incident whenever a poisoned description is in the prompt (every request for an eager server, found tools for a lazy one). Rule: fewest incidents, then most done, then fewest tokens. `WINNERS` (8 policies: DocShelf off, QuickPost pinned, Stockroom unpinned, everything trusted loaded lazily; Order desk's pin and DocShelf's other switches free) and the best score (11 of 15, 0 leaks, 39,180 tokens) are pinned.
- **Pins** (`data/tools-in-production/pinned.json`): eager tokens, each request's found tools and lazy tokens, the saving, the overnight prints, the week's opening and best scores, `WINNERS`. `tests/unit/tools-in-production.test.ts` re-derives them.

## Toy vs real

| Chapter | Number shown | Real figure (fact id) | Matched or labelled |
|---|---|---|---|
| 1 | 60 tools, 4 servers, 12 outlines | `selection-degrades` (picks degrade past 30–50 tools) | Labelled: `ToyNote`, fictional servers |
| 1 | 51,220 tokens for every definition (hand-set sizes) | `definitions-cost` (about 55,000 tokens for five servers) | Labelled: `ToyNote` |
| 1 | The look-alike pick | `selection-degrades`, `search-accuracy` | Labelled: hand-written example run |
| 2 | 3,040 / 2,740 tokens loaded; three tools found per search | `search-saving` (over 85%, 3–5 tools, vendor-reported), `search-returns` (5 by default) | Labelled: `ToyNote` says the toy saves more than the cited 85% because its sizes are hand-set; the toy finds 3, within the cited 3–5 |
| 3, 4 | Fingerprints (8 hex digits) | `pin-tools` | Real (computed); the note says a real pin would use a longer code |
| 5 | — | `tool-poisoning`, `annotations-untrusted`, `show-inputs` | Real description pattern, retold from Invariant Labs |
| 6 | — | `mcp-oauth`, `token-audience`, `stdio-env` | Real rule, run by `accepts()` |
| 7 | 15 requests, 11 done, 0 leaks, 39,180 / 768,300 tokens | `pin-tools`, `search-saving` | Labelled: hand-written week |

## Links to add at go-live (U11, KTD8)

- **Neighbour links back to this module:** Tool calling's chapter 5 (MCP) intro or chapter note, "When you run many servers: Tools and MCP in production"; Dependencies' chapter on hijacked releases ("pinning versions") → this module's chapter 4 (pinning tool fingerprints); Guardrails' trifecta chapter → chapter 5 (hidden instructions); Skills' chapter 6 (a skill from outside) → chapter 5.
- **plain-words.ts:** none needed. The copy avoids `schema`, `json`, `api`, `metadata`, `payload`, `exfiltration` and `deterministic`; "input shape" and "fingerprint" stand in.
- **Registry edit** (`src/lib/modules.ts`): import `TOOLS_IN_PRODUCTION_MODULE` from `../content/tools-in-production/module`, add it after the last live module, and remove the `planned('tools-in-production', …)` card.
