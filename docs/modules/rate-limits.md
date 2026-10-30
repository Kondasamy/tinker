# Rate limits (`/rate-limits/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The rain barrel** (`src/components/scenes/barrelScene.ts`): Larkspur's stock API door at the back (a back office, its lamp mint while the server answers, tomato once it has fallen over); beside it the hero, a wooden **rain barrel on a four-legged stand** with two iron hoops and water at its level. A drip pipe from the gutter refills it (a drop per token a second, at most four); a brass tap at its foot pours one cup per request served, shut with a tomato handle when the barrel is empty. Couriers (kit people) queue at the door two by two, at most 12 drawn and a count pill for the rest, the served ones carrying a parcel; couriers turned away walk off to the left with a red ticket (at most 4), under a `429 · WAIT n S` pill. A fixed window is the same barrel topped up all at once as each minute starts (a gush from the pipe); one barrel per partner key stands up to four smaller barrels in a row, each with its partner's pill. `barrelAt` reads it off one moment of a run; `barrelCard` is the home card and intro hero (chapter 4's empty barrel). `RateStage` (`src/content/rate-limits/kit.tsx`) puts it one tab from the Requests chart (stacked bars a second: served, 429, failed at a fallen server).
- **The mechanic (KTD8): hold to flood.** In chapter 3 the reader floods the live barrel: Hold to flood (pointer, or Space held; 20 a second, at most 200 a hold; release, pointer-cancel, lost capture or blur stops it) and a plain Send 10 beside it for click, Enter, Space and assistive tech. A range sets the drip. One polite `role="status"` read-out says each burst's tally and names the first 429 once. With reduced motion only Send 10 shows; nothing in the stage animates (the barrel changes level on a 250 ms redraw, never moves). Elsewhere a Time range under the picture reads the run at any moment.

| Chapter | Picture | Live | The step's control | `say` parts |
|---|---|---|---|---|
| 1 Too many at once | no barrel; the flood's queue and the door going dark | the flood run read at the slider's time | Time range, Predict, Requests tab | `door` |
| 2 Count per minute | the window barrel, empty at 0:59.9, topped up at 1:00 | the fixed-window run | Time range, Predict, Requests tab | `barrel` |
| 3 The token bucket | the live barrel the reader floods | the reader's own requests through `bucket.ts` | Hold to flood / Send 10, Drip range, Predict | `barrel`, `tap`, `drip` |
| 4 The 429 reply | turned-away couriers under `429 · WAIT 2 S` | ignore and listen runs | Time range, the reply text, Predict, Listen checkbox | `away` |
| 5 Back off with jitter | 30 tablets' couriers at once | four retry policies | Time range, Predict, Requests tab, Back off and Jitter checkboxes | `couriers` |
| 6 Who gets turned away | one shared barrel, then one per key | shared and per-key runs | Time range, Predict, One barrel per key | `barrel` |
| 7 Set the limits | the bench's barrels over sale day | the bench's run | Barrel size and Drip ranges, per-key checkbox, Time range | `barrel` |

## Engine (`src/lib/rate-limits/`)

- **A tick simulator over hand-made traces, nothing recorded** (KTD6). `sim.ts` runs `data/rate-limits/traces.json` (partners' requests in milliseconds, written as periodic segments and bursts) through a limiter: none, a fixed window (`window.ts`), one token bucket or one per partner key (`bucket.ts`). A request the limiter lets through reaches a server that answers at most 50 in any one second and otherwise falls over for 3 seconds (hand-set, labelled). A refused client gives up, retries every 0.2 s, waits the reply's Retry-After (whole seconds, rounded up from the time to the next token), or backs off (`backoff.ts`: 1 s fixed or doubling, with Brooker's full jitter seeded per client and try through Queues' `rollOf`). Runs are deterministic and cached.
- **The chapters' runs** are `SCENES` (and `crowdOf`, `liveOf`) in `sim.ts`; their effects are pinned in `data/rate-limits/pinned.json` and rerun by `rate-limits-sim.test.ts` (`WRITE_PINNED=1` rewrites).
- **Chapter 7's workbench** (`workbench.ts`): barrel size × drip × shared or per key (32 settings) over the sale-day trace. The team's rule (`data/rate-limits/workbench.json`): the server never falls over and no quiet partner loses a request. `WINNERS` (three settings, all per key) is pinned and `rate-limits-workbench.test.ts` solves it again.
- **Facts** (Google's SRE book on overload, Cloudflare on fixed windows, RFC 6585's 429, RFC 9110's Retry-After, API Gateway's token bucket and its account quota, GitHub's per-user limit and its retry advice, Brooker on jitter) come from `data/rate-limits/facts.json` with source and access date, one on every chapter. GitHub's 5,000 an hour and API Gateway's 10,000 a second with a burst of 5,000 are moving figures: re-check them when the module changes.
- **Links where modules meet:** Load balancing (chapter 1, raising the ceiling), Web requests (chapter 4, status codes), Queues' try-again-later (chapter 5, backoff and jitter).

## Toy vs real

Every count is the simulator's over hand-made traces (`SimNote` on every chapter names the hand-set server limit); the cited fact on the same chapter is the real figure beside it. No toy number is matched: the limits are Larkspur's team choices, and real ones (API Gateway's 10,000 a second, GitHub's 5,000 an hour) would need traffic far too large for a barrel that draws at most 12 couriers. Copy that types a hand-set number (chapter 2's and 5's stories, the backoff label, chapter 7's reasons) is pinned to the data by `rate-limits-chapters.test.ts`.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Server answers 50 a second, then falls over for 3 s; Quickfix's 83 a second; Oakmoor's lost of sent | `overload` (servers handling 1,000 a second that get 1,200 crash and answer well below 1,000) | Labelled: the toy falls over outright, a real one crashes server by server |
| 1 | 50 and 80 a second (recall) | none | Labelled: a hypothetical in the question |
| 2 | 40 a minute; 80 through in two seconds around 1:00 | `fixed-window` (a count reset each period lets spikes through; Cloudflare's fix erred on 0.003% of 400 million) | Labelled |
| 2 | 5 tries a minute, 10 across the edge (quiz); 100 a minute (recall) | none | Labelled: hypotheticals |
| 3 | The live barrel holds 10, drips 1–5 a second | `token-bucket` (rate is the drip, burst is the size) | Labelled |
| 3 | 100 tokens, 10 a second, 600 (quiz) | none | Labelled: a hypothetical |
| 4 | 20 at once, a barrel of 10 dripping one per 2 s, retries every 0.2 s, refusals and served counts | `429`, `listen` | Labelled |
| 4 | Retry-After: 2 | `retry-after` (whole seconds; 120 means 2 minutes) | Real rule: rounded up from the sim's time to the next token, as the RFC's seconds |
| 4 | Retry-After: 30 (quiz) | none | Labelled: a hypothetical |
| 5 | 30 tablets, 10 tokens, waits of 1, 2, 4 s; most retries in a tenth of a second (pinned) | `jitter` (with 100 clients, jitter more than halves the calls in Brooker's simulation) | Labelled |
| 6 | Shared barrel of 20 dripping 10; Quickfix 40 a second, Oakmoor 2; share served | `per-key` (5,000 an hour per signed-in user, 60 per address) | Labelled |
| 6 | 10 partners at 10 a second (recall) | none | Labelled: a hypothetical |
| 7 | Barrel sizes 5–40, drips 2–20, the server's 50, busiest second, lost counts, 3 settings that work (`WINNERS`, recomputed) | `aws-quota` (10,000 a second, burst 5,000) | Labelled: the team's rule over a toy sale day |
| Intro | 5 callers, 50 a second, chapter 6's requests, settings that work, Oakmoor's lost and served | as above | Labelled (the intro's note says simulated) |
