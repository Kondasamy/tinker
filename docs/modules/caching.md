# Caching (`/caching/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The depot map** (`src/components/scenes/depotScene.ts`): Larkspur's central depot at the back, joined by roads to three regional warehouses (north nearest, west farthest). Each warehouse has a shelf in front with a cubby per kind (price mustard, photo cobalt, stock mint), holding a box while a copy is kept. A truck rides a road for each trip this quarter hour (three at most); an overloaded depot has trucks queued round it and a tomato-tinted pill; a tomato tag flies over a warehouse that served a stale copy this quarter hour. `depotAt` reads the map off one quarter hour of a run. `CachingStage` (`src/content/caching/kit.tsx`) puts it one tab from the Timeline (`cacheTimeline.ts`: a lane per warehouse, a cell per quarter hour, mint all hits or mustard any trip, a tomato mark for a stale read, and a depot row of trips against its dashed capacity line; arrow keys read each quarter hour). Chapters 1, 2, 5 and 7 keep the tab in the step state. On phones the pills keep just names and the caption carries the counts.

- **Hero object: the depot**, a sawtooth-roofed shed (north lights at the back) with a loading bay (roller shutter, canopy, dock) where queued vans back up. Warehouses are gable-roofed stores with a striped awning and the cubby shelf in front; trips are small vans with drivers in their cabs; roads are asphalt with a dashed centre line, drawn in `depotScene` (not the office's roller belts).

## Engine (`src/lib/caching/`)

- **A discrete-time simulator over a hand-written day, nothing measured** (KTD6, KTD9). `sim.ts` serves `data/caching/trace.json` (Larkspur's shop, 08:00–20:00 in quarter hours: steady rows, flash-sale bursts and the quarter hours at which the depot's copy of each key changes) from one depot and three regional warehouses (north, east, west). Waits come from `data/caching/assumptions.json`, labelled as Larkspur's planning numbers: 12 ms to a warehouse, 60 ms of depot work, 2 ms of round trip per 100 km, and a capacity of 20 trips a quarter hour, past which every trip waits 40 ms more per extra trip. The copy says so wherever a wait shows (`SimNote`).
- **Freshness follows RFC 9111, stale-while-revalidate RFC 5861.** A copy stored in quarter hour s is fresh through s + TTL. TTLs step over `TTLS` (none, 15 min, 1 hour, 4 hours, a day). A trip's reply lands at the end of its quarter hour, so requests in the same quarter hour all see the shelf as it was: without coalescing each miss makes its own trip (the stampede); with it, requests for one key at one warehouse share one trip. Stale-while-revalidate serves an expired copy for `swrTicks` while one trip revalidates.
- **"Stale" means older than the depot's version**, the reader's meaning; "expired" means past the TTL. Purge (prices and photos only; stock counts change with every order and are never purged, an assumption) drops a key at every warehouse when it changes. Versioned names apply to photos only: a change is a new name no shelf holds.
- **Chapter 7's workbench** (`workbench.ts`): a TTL per kind, purge and versioned names (500 policies), with coalescing on and stale-while-revalidate off. A policy passes when each kind's share of stale reads is within the owner's limit (`data/caching/workbench.json`: prices 0, photos 0, stock 15%, team choices) and scores its hit rate. The puzzle accepts every passing policy tied for the best (`WINNERS`, two today: versioned names add nothing once purge is on).
- **Chapter 6 links `/context/04-order-for-the-cache/` and `/inference/02-kv-cache-at-scale/`**, and those chapters link back to `/caching/`; prompt-cache and KV-cache claims come from the module's own facts.
- **Coverage:** `tests/unit/caching-sim.test.ts` runs every policy and checks the lessons; `caching-workbench.test.ts` checks each chapter's reveal against the runs and that Show me is a winner.
- **Facts about HTTP caching and CDNs** come from `data/caching/facts.json` with source and access date. Fastly's request-collapsing guide is the one CDN document cited, as a source, not a recommendation.

## Toy vs real

Every wait, trip and count comes from the simulated day (`trace.json`, `assumptions.json`), labelled by `SimNote` on each chapter that shows one; the cited fact sits beside it. Real HTTP behaviour (freshness, max-age, purge, versioned names, collapsing, stale-while-revalidate) is the engine's rule set, not a number.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | Distances 300 / 900 / 2,800 km | — (Larkspur's map) | Labelled (planning numbers) |
| 1 | Waits (12 ms to a warehouse, 60 ms depot work, 2 ms round trip per 100 km) | `fiber-delay`: 5 µs per km each way, so 1 ms of round trip per 100 km | Labelled: the copy shows real fibre's floor (computed from the fact) beside the toy's 2 ms |
| 1 | Requests in the day, trips in the sale | — (hand-written trace) | Labelled |
| 2 | Hit rate, trips, mean wait with shelves off and on | `cache-reuse` (what a cache is for; no single real hit rate fits a toy day) | Labelled |
| 3 | TTL steps (15 min, 1 h, 4 h, a day), stale price reads, trips, hit rate | `fresh`, `max-age` (TTL is the reader's setting; any length is valid HTTP) | Labelled (settings and simulated counts) |
| 4 | Hit rate, stale prices and photos per way back | `purge`, `cache-busting` | Labelled |
| 5 | Depot capacity 20 trips a quarter hour, 40 ms per extra trip, trips and waits at the sale, stale stock reads, 30 min of stale-while-revalidate | `collapse-rfc`, `collapse-cdn`, `swr` (RFC 5861 lets the origin set any window) | Labelled |
| 6 | No numbers of its own besides the caption's clock | `prompt-cache-lifetime` (5 minutes), `prompt-cache-match`, `kv-cache` | Real (quoted from the facts) |
| 7 | Owner's limits (0, 0, 15%), hit rate per kind, best hit rate, number of winners | `immutable` | Labelled: limits are team choices (`workbench.json`); best and winners computed |
