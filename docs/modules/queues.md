# Queues and background jobs (`/queues/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The ticket rail** (`src/components/scenes/railScene.ts`): Larkspur's till at the back left; an order rail behind the packing benches with a paper ticket per waiting job (at most 12, a `+N` pill for the rest; mustard once tried before); a bench per worker (busy with a ticket and a parcel, a tomato flag when this try fails, or knocked over, lying in front); a retry hook by the till; the dead-letter shelf; the courier's booth with its lamp (tomato while its site is down) and the parcels (tomato for an order booked twice). A ticket whose lease is held by a fallen worker lies on that bench, then hangs greyed on the rail once the worker is up, and slides back into line when the lease runs out. Inline (chapter 1) there is no rail: customers wait in line at the till. `railAt` reads it off one minute of a run; `railCard` is the home card and intro hero (chapter 5's crash). `QueuesStage` (`src/content/queues/kit.tsx`) puts it one tab from the Jobs table (a row per order, a focusable region).
- **Hero object: the ticket rail with clips**, a steel channel bar on two posts, each paper ticket held in its own spring clip. Rosa, Tomás, Wen and Kofi are kit people at packing benches (the fallen worker in the `fallen` pose); inline customers queue as people at a till with a cash drawer; the courier's kiosk has its bike parked beside it.
- **The mechanic (KTD15): knock a worker over.** The crash bar is real buttons over the rail, one per worker: only busy workers can be picked (the rest are disabled, with a line saying why when none is busy), the arrow keys move between them, Enter knocks one over at the current minute. Play, Pause and Step sit under the picture. Motion (the topple, the slide back) lives only behind `prefers-reduced-motion: no-preference` in `queues.css`; with reduced motion the same minute shows the fallen worker and the returned ticket at once.

## Engine (`src/lib/queues/`)

- **A tick simulator over a hand-written sale morning, nothing measured** (KTD5). `sim.ts` runs `data/queues/day.json` (38 orders and Moe's unreadable one, 09:00–09:59) under a policy: workers, lease, most tries, backoff, jitter, idempotent jobs, the courier's outage, the poison order, inline work and crashes. A job books the courier first (the side effect), then packs and acks; a lease that runs out before the ack makes it visible again and the late ack is refused. Every lease taken is a try; past the most tries a failure or lapsed lease dead-letters it. Outage failures and jitter are seeded per job and try (web-requests' `lostOn` pattern, mulberry32). A crash `{ worker, tick }` is an event in the run, so replays are deterministic.
- Service times, the fail time, the restart time, the backoff base and the outage's failure rate are labelled planning numbers in `data/queues/assumptions.json`.
- **The chapters' runs** are `SCENES` in `sim.ts`; their counts are pinned in `data/queues/pinned.json` and rerun by `queues-sim.test.ts` (`WRITE_PINNED=1` rewrites).
- **Chapter 7's workbench** (`workbench.ts`): workers × most tries × lease (48 settings) over the whole morning with everything going wrong. The owner's rule (`data/queues/workbench.json`): no good order dead-lettered and no wait over the limit; then the fewest workers. `WINNERS` is pinned and `queues-workbench.test.ts` solves it again.
- **Facts** (Heroku's 30-second request cut-off, RabbitMQ's work queues and requeue on a lost worker, Little's law, SQS's visibility timeout and how to size it, at-least-once delivery and dead-letter queues, Brooker on backoff and jitter) come from `data/queues/facts.json` with source and access date, one per chapter at least. No vendor is named as the place to run a queue.

## Toy vs real

Every count below comes from the simulated sale (`SimNote` says so: a minute here stands for a second or less of real work, slowed to watch). Ticks are minutes on purpose (KTD5), so no real time limit in seconds fits the toy without breaking the slow-motion picture: every number is labelled, with the real figure on the same step.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | The till serves 2 at a time; the slowest page has waited 8 min at 09:16; a parcel's work is 2 min (predict, reveal, caption) | `request-timeout` (Heroku cuts a web request off at 30 s) | Labelled: a toy minute stands for a second or less, so a real page would be cut off long before a crowd this size cleared |
| 1 | Photo-site uploads (quiz) | none | Labelled: a hypothetical in the question |
| 2 | Ben's order at 09:02, packed by 09:04; the page waits 0 min | `work-queue` (RabbitMQ: do slow work later, not in the request) | Labelled |
| 3 | 2 orders a minute from 09:05; one worker per 2 min; 22 waiting at 09:20; 23 / 10 / 0 waiting at 09:30 with 1 / 2 / 3 workers; 3 workers fewest (pinned in `queues-chapters.test.ts`) | `littles-law` (jobs inside = arrival rate × time each spends) | Labelled: the law holds for any steady queue, toy minutes or real seconds; the flood is not steady, which is why the line grows |
| 3 | 30 orders an hour, 10 per baker (quiz) | none | Labelled: a hypothetical in the question |
| 4 | Outage 09:10–09:16; 4 tries; 2 orders given up; up to 6 retries due in one minute with backoff, 4 with jitter; waits of 2, 4, 8, 16 min (pinned) | `jitter` (Brooker: jitter more than halves the calls, 100 simulated callers) | Labelled: the toy's drop in bunched retries stands for Brooker's drop in calls, not the same size |
| 4 | Ten thousand phones (quiz) | none | Labelled: a hypothetical in the question |
| 5 | A 6-min lease; runs so far (2 after the crash) | `lease-crash`, `at-least-once` (and `lease`: SQS's default is 30 s) | Labelled |
| 6 | 17 tries by 09:40 with no limit; a limit of 5 tries | `dead-letter` | Labelled |
| 7 | 1–4 workers, 2/3/5/8 tries, 3/6/20-min leases; 20-min wait limit; 3 workers fewest, 3 winning settings, each with a lease longer than the 4-min pallet (pinned, `WINNERS` recomputed; the lease rule tested) | `lease-fit` (SQS: size the hidden time to the longest job, at most 12 h) | Labelled: the toy's rule (lease outlasts the slowest job) is SQS's advice; the minutes are toy |
| 7 | A 3-minute ticket job (quiz) | none | Labelled: a hypothetical in the question |
| Intro, recall | 38 orders, 60 minutes, 4 workers, 3 winners, the slowest page's wait; recall's seconds and counts | as above | Labelled ("simulated sale" note on the intro); recall items are hypotheticals |
