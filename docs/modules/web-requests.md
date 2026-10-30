# Web requests (`/web-requests/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The post town** (`src/components/scenes/townScene.ts`): the customer's house at the front, a street left to the directory offices (the root's and .example's), and the main road back to Larkspur's shop, Larkspur's own directory office beside it; the seal office (the certificate authority) stands apart. The road is as long as the customer's distance (`roadFor`), held at `kmFull` past which a break mark crosses it and the shop's pill gives the real distance. A cart rides the main road per round trip to the shop (three at most) and stands outside each office asked; once TLS (or QUIC) is up its envelope wears a wax seal. A lost packet tips its cart into a ditch beside its road with a RESENT pill: the ride-in and the tip are CSS animations, and with reduced motion the ditch and the pill show alone. `townAt` reads the town off a run's first n phases. `WebStage` (`src/content/web-requests/kit.tsx`) puts it one tab from the Waterfall (`requestWaterfall.ts`, React SVG in `traceWaterfall`'s shape: a row per phase, a lost packet's timeout in tomato at the bar's start, a stall behind another stream's loss hatched at its end; arrow keys read each row). Chapters 1, 3, 4, 6 and 7 keep the tab in the step state; on phones the pills keep just names and the caption carries the numbers.
- **Hero object: the customer's house**, a cottage with a pitched roof and a brick chimney, the customer (Ines, Tomas from the cast) at its door. Around it: directory offices with columned porticos (roof lit when asked), Larkspur's shop with a striped awning, the seal office with a wax-seal disc and a lamp lit while it checks, and kit postal carts (shrunk to 0.6, people to 0.72) carrying envelopes.

## Engine (`src/lib/web-requests/`)

- **A seeded round-trip simulator, nothing recorded** (KTD6). `sim.ts` loads the page for one customer (`data/web-requests/customers.json`: four customers, names, towns, distances, last visits, written for this site) under a setting: the DNS TTL (`TTLS`), the HTTP version (`HTTPS`), session resumption, loss and the document's method. Every round trip is Larkspur's planning rate (`assumptions.json`, labelled: a 10 ms hop plus Caching's 2 ms per 100 km), plus 20 ms of server work per request. The copy never states a measured time (`SimNote`).
- **The steps:** the directory (a cold resolver asks the root, .example and Larkspur's office; a returning customer's asks only Larkspur's; none within the TTL), TCP then TLS 1.3 (one round trip each) or QUIC's one handshake for HTTP/3, then the document, then the page's files (`page.json`). HTTP/1.1 sends one request at a time per connection and opens up to `h1Connections` (an assumption: RFC 9112 sets no number), each file where it would finish first; HTTP/2 and 3 send every file at once.
- **0-RTT needs a ticket and a GET**: resumption sends the document with the first flight only for a returning customer within `ticketMinutes` and only for a GET; a POST is `refused` and waits for the full handshake (fact `zero-rtt-replay`).
- **Loss is seeded by name**: each packet's fate is `mulberry32(seed ^ hash(name))` against the customer's loss rate, so a setting never moves another packet's luck. A lost packet waits `ASSUMPTIONS.rtoMs`, read from fact `rto`'s value (RFC 6298's 1-second floor), and goes again. Real TCP usually resends sooner, after three duplicate acknowledgements (RFC 5681's fast retransmit); the toy keeps the timeout so one loss reads as one wait, and chapter 4 shows fact `fast-retransmit` beside `rto` with a line saying the timer is the worst case. Under HTTP/2 a lost file holds back every other stream on the connection (`stalled`); under HTTP/3 only its own. Only Wen's line is lossy, and his seed loses `req:hinge.jpg` alone (`pinned.json` `wenLost`).
- **Pinned totals** (KTD12, `data/web-requests/pinned.json`): every customer under five settings; `tests/unit/web-requests-sim.test.ts` reruns them and the lessons (a cold load's sum, a remembered answer, doubling distance, HTTP/3's saved round trip, 0-RTT refused for a POST, HTTP/2 against HTTP/3 under loss, documentation-only names and addresses).
- **Chapter 7's workbench** (`workbench.ts`): a TTL, an HTTP version and resumption (24 policies), lossy lines on. A policy meets the owner's rules (`workbench.json`: every page within the budget, and the TTL within the move limit, so a moved shop is found in time); the puzzle accepts every policy that meets them (`WINNERS`, pinned, two today), and the test recomputes them.
- **Names and addresses are documentation-only** (R18): `larkspur.example` (RFC 2606) and addresses in 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 and 2001:db8::/32; a test checks every one.
- **Facts** (DNS, TTL, TCP's handshake, RFC 6298's timeout, TLS 1.3, 0-RTT and its replay risk, certificates and what https proves, HTTP/1.1, 2 and 3, QUIC) come from `data/web-requests/facts.json`, each checked against its RFC with source and access date.

## Toy vs real

The simulator's waits are Larkspur's planning numbers (`assumptions.json`, labelled by `SimNote` wherever they show). Round-trip counts are real: they follow the RFCs in `facts.json`. Customers, distances and visit times are written for this site.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | 3 offices asked (root, .example, Larkspur's) | `dns-tree` | real (the tree's levels) |
| 1 | ms per office and the lookup's total | `dns-tree` beside it | labelled (`SimNote`) |
| 1 | 203.0.113.10, the shop's address | `example-names` | real (a documentation range) |
| 2 | Tomas's minutes since his visit | none | labelled (story data) |
| 2 | TTL choices 1 min, 5 min, 1 hour, 1 day | `dns-ttl` | labelled (Larkspur's choices; any TTL is allowed) |
| 2 | page ms, "old address for" times | `dns-ttl` | labelled (`SimNote`); the rule that a copy lives out its TTL is real |
| 3 | handshake ms for Ines and Wen, their km | `tcp-handshake` | labelled (`SimNote`); one round trip per handshake is real |
| 3 | 5,000 km in the quiz | none | labelled (a made-up case) |
| 4 | one loss costs about 1 s | `rto` (1,000 ms) | matched (`ASSUMPTIONS.rtoMs` reads the fact) |
| 4 | page ms with and without loss | `rto` | labelled (`SimNote`) |
| 4 | every loss waits the full 1 s | `fast-retransmit` | labelled: the copy says real TCP often resends sooner, after three repeated replies, so the toy's timer is the worst case |
| 5 | resuming saves one round trip, in ms | `zero-rtt`, `tls13-1rtt` | labelled ms (`SimNote`); the one round trip is real |
| 5 | a session ticket honoured for a day (`ticketMinutes`, not shown) | `ticket-lifetime` (7 days at most) | labelled (Larkspur's choice under the cap) |
| 6 | 5 more files, connections opened | `h1-connections` (RFC 9112 sets no maximum) | labelled (`h1Connections` 6 is an assumption) |
| 6 | files held back, setup ms for HTTP/2 and HTTP/3 | `h3-hol`, `quic-handshake` | labelled ms (`SimNote`); which files wait and the saved round trip are real |
| 7 | 1,500 ms budget, 60 min move rule | none | labelled (the owner's rules, `workbench.json`) |
| 7 | each customer's km and page ms, winners count | `fiber-delay` beside it | labelled (`SimNote`); winners recomputed by the test |
| 7 | 2 ms per 100 km plus 10 ms per trip | `fiber-delay` (1 ms of round trip per 100 km) | labelled: the copy says fibre alone needs 1 ms and the toy plans 2 ms plus 10 ms for the road's bends and stops |
| Intro | trips, page ms, 4 customers, 6 files, Wen's km, budget | `dns-tree`, `tcp-handshake`, `rto`, `https-proves` | labelled (the intro's simulator note) |
