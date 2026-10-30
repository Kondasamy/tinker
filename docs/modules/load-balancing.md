# Load balancing (`/load-balancing/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The switchyard** (`src/components/scenes/yardScene.ts`): requests ride in as carts on one track to the switch house (the balancer), whose points send each cart down a spur to one of the server sheds in a row on the right (at most six). The spur the switch points down is lit. Waiting carts sit on a shed's spur (four drawn at most; the pill carries the count). A shed's roof shows its state (wood fine, mustard slow, dark dead), its lamp the health check (mint answers, tomato misses); a pulled shed has a barrier across its spur. `yardAt(run, t, rule)` reads it off one moment of a run; the home card and intro hero are chapter 7's first winning setting mid-sale.
- **The latency board, one tab away** (`LbStage`, `src/content/load-balancing/kit.tsx`): every request's wait as it lands, the p99 marker, and the percentiles as text. React SVG.
- **The mechanic (KTD15): play a run.** The controls sit beside the stage (the rule, each server's state, the health-check miss count, the sticky switch, the hedge wait); a run plays as requests land, with Replay. With reduced motion a run shows its end at once.

## Engine (`src/lib/load-balancing/`)

- **A per-request event simulator over a hand-written sale** (KTD7, `sim.ts`): `data/load-balancing/traffic.json` (the servers, customers and phases). Each server works one request per slot at its own speed and queues the rest. From the trouble time a server may be slow, dead or gray (slow but answering its check). Health checks pull a server after N misses; sticky sessions keep a customer on the server holding their cart; hedging sends a second copy after a set wait. The customer gives up `timeoutMs` after asking, whatever server holds the request (dead, slow or gray) and however many copies are out; a request is failed when every copy has given up. Every number is a labelled planning number in `data/load-balancing/assumptions.json`, never a measurement.
- **The rules** (`rules.ts`): round robin, weighted round robin, least outstanding and power of two choices, each a small stateful picker made per run, so a run is deterministic from its seed.
- **Chapter 7's workbench** (`workbench.ts`): rule × miss count × hedge wait (4 × 4 × 4) with Cedar dead and Dogwood gray as the sale starts. A policy passes when no customer gives up and the extra copies stay within the budget (`data/load-balancing/workbench.json`); score: p99 in whole ms. `WINNERS` (every passing policy tied for the lowest) is pinned there and recomputed by a test.
- **Facts** (round robin, least connections, weights, power of two choices and Envoy's use of it, health checks and failing open, gray failure, sticky sessions, the tail at scale and hedged requests) come from `data/load-balancing/facts.json` with source and access date. No vendor is named as the place to balance load.

## Toy vs real

Every wait, count and share comes from the simulated sale (`traffic.json`, `assumptions.json`), labelled by `SimNote` on each reveal. The sale is squeezed into 4 seconds, so its clock (service times, timeout, check interval) can't match real systems' seconds-apart checks; those stay labelled, with the real figure beside them.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | Ash's 4 slots, capacity ~100 a second, sale 120 a second, morning/sale/four-server p50 and p99 | queues fill and waits rise past capacity (`overload-queue`) | labelled |
| 1 | quiz booth: 2 sold, 3 joining a minute | none (a worked example) | labelled (example) |
| 2 | Ash 4 slots vs 2, weight 2, each server's share, p99 before and after | weights 3:1:1 send 3 of 5 (`weights`) | labelled |
| 3 | Birch 5× slower, every fourth request, customers who gave up, 1 s timeout, p99 per rule | least-connected, P2C with 2 choices (`least-connected`, `envoy-p2c`, `two-choices`) | labelled; "two" choices real (Envoy's default is 2) |
| 4 | checks every 200 ms, 1 and 3 misses, failed requests, time to pull, Dogwood's share | ALB: every 30 s, out after 2 misses (`health-checks`), `gray-failure` | labelled (note says real checks run seconds apart) |
| 5 | pull after 2 misses (not shown in copy), missing carts, failed requests, p99 | ALB's default unhealthy threshold of 2 (`health-checks`) | matched: `CHECKS` reads the fact's value |
| 6 | hedge after 50 / 100 ms, 5× slower, p50, p99, extra copies; quiz 20 ms / 400 ms / 95 in 100 | hedge past the 95th percentile (`hedged`, `tail-at-scale`) | labelled |
| 7 | 15% cap on extra copies, 0 failed, best p99 190 ms, 2 winning setups of 64 | 2% extra in Google's hedging test (`hedge-benchmark`) | labelled: the team's cap is a team choice; the note compares it with the real 2%, read from the fact and pinned by a test |
