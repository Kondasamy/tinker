# Finding the way (`/routes/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Chapter to picture

| Chapter | Picture | Mechanic live | The step's control | `say` parts |
|---|---|---|---|---|
| 1 Roads as a graph | the toy town, the van parked at the customer, the fastest route painted | close a road: the van reroutes; both bridges closed hold it at the depot | road listbox + Close / Reopen all | `van`, `bridge`, `depot` |
| 2 Fewest roads or fewest minutes | the route each search picks | breadth-first against Dijkstra, live | radio chips (Fewest roads, Fewest minutes) | `route`, `market` |
| 3 Dijkstra | flags planted as junctions settle, lit signposts on the frontier | Dijkstra, one settle per Step | Step / Play | `flags`, `frontier` |
| 4 A* | the same, leaning east | A* at weight 1, then a weight range | algorithm chips, Step / Play, weight range | `frontier`, `customer` |
| 5 Live traffic | queued cars on the jammed road | Dijkstra over the jammed minutes | a range for Lock to Dock's minutes; the road listbox | `road`, `route` |
| 6 Whole-country maps | shortcut arcs over the town (illustration) | each shortcut's minutes from Dijkstra | Show shortcuts toggle | `shortcuts` |
| 7 Workbench | the town under each delivery's closures and jams | the whole day under the chosen search | algorithm `Select`, weight range, delivery chips | `van`, `route` |

## Picture

- **The tabletop town** (`src/components/scenes/tabletopScene.ts`): Larkspur's town as a toy town on a wooden table: a felt mat, grey road strips between 30 signposted junctions, a river with two plank bridges, Larkspur's depot shed at the west and the customer's cottage at the east. The fastest route is painted mustard. `TableStage` (`src/content/routes/kit.tsx`) puts it one tab from the Frontier view (settled junctions in order, the frontier, the route's minutes, and the closed roads).
- **Hero object: the delivery van on a toy town table with signposted junctions** (a post with a pointing blade at every junction), and **flags planted** at each junction as a search settles it (the newest pops in with motion allowed). No earlier scene has a road graph or a table town; web-requests' post town is a street scene with carts.
- **A closed road shows a barrier by shape**: a striped bar on two posts across the road, in the picture; in the Frontier view and the listbox a closed road carries the same barrier glyph and the word "closed". A jam draws queued cars on the road (more cars, more minutes).
- **No route** holds the van at the depot with a NO ROUTE pill; the read-out says so and Reopen all is one tap.
- **The mechanic (KTD8): close a road.** The road listbox (arrow keys move, Enter toggles a roadblock) and a tap on a road in the picture share one selection: a tap selects that road in the list; the Close/Reopen button and Enter toggle it. Step / Play grow the frontier one settled junction at a time; with reduced motion Play still steps, a little slower, and nothing pops. One polite `role="status"` read-out says what changed on closures, a found route, or no route; never per step.

## Engine (`src/lib/routes/`)

- **Real searches over a hand-made town** (`data/routes/town.json`, labelled hand-made): `bfs.ts` (fewest roads), `astar.ts` (best-first on minutes so far plus weight × the straight-line guess at the fastest road's pace; weight 0 is `dijkstra.ts`). Ties break by town order, so runs repeat exactly. Closures and jams are `Edits` read through `costOf`: live traffic only changes road weights.
- **Pinned effects** (`data/routes/pinned.json`): breadth-first's 7-road route takes more minutes than Dijkstra's 9-road one; A* at weight 1 matches Dijkstra's minutes and settles fewer junctions; closing the bridge on the route detours over the other; closing both is no route; a jam on Lock to Dock flips the route. `routes-engine.test.ts` re-derives each.
- **Chapter 7's workbench** (`workbench.ts`): six settings (fewest roads, Dijkstra, A* at 1, 1.5, 2, 3) over the day in `data/routes/deliveries.json`. The rule: the day's minutes within the slack of the fastest; then the fewest junctions looked at. `WINNERS` is pinned and `routes-workbench.test.ts` solves it again.
- **Contraction hierarchies are cited, not run** (chapter 6): the shortcuts in the picture store the minutes Dijkstra finds between their ends, drawn for illustration only.
- **Facts** come from primary sources only, in `data/routes/facts.json` with source and access date: Dijkstra 1959, Hart, Nilsson and Raphael 1968 (A*), Likhachev, Gordon and Thrun 2003 (weighted A*'s bound), Geisberger et al. 2008 (contraction hierarchies), and the official OSRM and Google Maps route docs. Every chapter shows at least one.
- **Where it meets Search**: chapter 6 links to Search's index: both work hard ahead of time so a question looks at little.

## Toy vs real

The town, its roads and their minutes are hand-made (`data/routes/town.json`); `TownNote` says so on every step that shows them beside a cited fact. The searches are real, so where a real finding is about the method (settle order, A*'s exactness, weighted A*'s bound) the toy agrees with it and a test pins that.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | the route's minutes and roads (19 min, 9 roads); the detour (22 min) | links of known length (`graph`) | labelled (hand-made town; `TownNote` on the detour step) |
| 2 | fewest roads 7 roads, 22 min; fewest minutes 9 roads, 19 min | shortest and fastest differ (`osrm-cost`) | labelled; the effect itself is real, pinned in `routes-engine.test.ts` |
| 3 | junctions settled, the minutes each settled at, rising | settles in rising distance (`dijkstra`) | labelled minutes; the rising order is real, pinned ("Dijkstra settles junctions in non-decreasing minutes") |
| 4 | junctions looked at (Dijkstra 28, A* 21), the same 19 min; weights 1, 1.5, 2, 3; weight 2's minutes "within the 2× limit" | a guess that never overestimates finds a cheapest path (`astar`); a weighted path costs at most weight × the cheapest (`weighted`) | labelled counts; exactness and the 2× limit are real, pinned ("A* at weight 1 matches…", "a heavier weight never costs more than weight × the fastest") |
| 5 | Lock to Dock's free minutes (`FREE`), the range up to `FREE` + 8, the flip point and the new route's minutes | traffic arrives as new road speeds (`osrm-traffic`); live traffic is optional (`traffic`) | labelled (hand-set jam) |
| 6 | 28 of 30 junctions looked at; 18 million junctions; the three shortcuts' minutes | Western Europe's 18,029,721 junctions (`ch`), shortcuts on only-quickest paths (`ch-paper`), OSRM's two ways (`osrm`) | 18 million matched (`EUROPE` reads `fact('ch').value`); shortcut minutes labelled (drawn for illustration, `TownNote`) |
| 7 | 6 drops, their times, closures and jams; 2 min slack; the day's minutes; junctions looked at; best 100 | weighted A*'s bound (`weighted`) | labelled (hand-made day, `TownNote`); `WINNERS` recomputed by `routes-workbench.test.ts` |
| intro | 30 junctions, road count, 6 drops, winners count; the two routes' minutes | `dijkstra`, `astar`, `traffic` beside the ideas | labelled ("A hand-made town…") |
