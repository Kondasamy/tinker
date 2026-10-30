# Backups and recovery (`/backups/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The server room** (`src/components/scenes/safeScene.ts`): Larkspur's server room, cut away (floor and two back walls), with the order database's server rack at the back and the hero, the **tape-reel cabinet**: open shelves where each copy is a reel of tape (at most 7, the newest; a `+N` pill for the rest). A full copy is a big cobalt reel, an incremental a small mint one; a tape that never reads back turns tomato only once it is found out (struck, or caught by a test restore). Mira (`CAST.mira`) stands by it. Outside, the courier (a look of their own) with the **lockbox on a handcart** (the kit's `cart` and `padlock`), the offline copy; across town, the warehouse (the kit's `building`), with a wire on a pole (`pole`) while copies go there.
- **What a disaster draws**: the dead disk turns the rack's lamps tomato and smokes; fire chars the room, the cabinet and its reels and stands flames in front; ransomware hangs a padlock on the rack, the cabinet and the warehouse. The copy the restore came from wears a mint ring (a reel), a mint plate (the lockbox) or a mint step (the warehouse). Each part carries `data-*` the tests read.
- **The mechanic (KTD8): drop the disaster.** The strike bar under the picture (`StrikeBar`, `src/content/backups/kit.tsx`): a `Select` picks the disaster, a range picks the hour, Strike hits. Changing the hour or the disaster clears the strike; changing the plan keeps it, so the result updates at once. Chapters 2, 3 and 6 hold the hour (the reveal depends on it); chapter 7 gives each disaster its fixed hour of the bench's week. One polite `role="status"` line under it says what the strike left (`strikeWords`), never per hour moved. Flames rising and padlocks dropping play only behind `prefers-reduced-motion: no-preference`; with reduced motion the struck picture shows at once.
- **The Week tab** (the second view): the same week as a timeline: orders an hour, each copy in its place's lane (tall full, short incremental, tomato never reads back or lost, mint the one restored), the strike and the restore point, the lost hours shaded.
- **Words only in pills**, escaped; on phones (scale 2) the pills keep their names and the caption carries the counts (`safeReadouts`).
- **Home and share images**: the home card and the intro hero are chapter 5's moment (`safeCard`): ransomware has padlocked the server room and the warehouse, the lockbox restores. Classic tech: no hero `DRAW`.

## Chapter pictures

| Ch. | Picture | Mechanic live? | The step's control | `say` parts |
|---|---|---|---|---|
| 1 `one-copy-is-no-copy` | No tapes; the dead disk takes every order; then nightly tapes and the restore from last night's | Yes: the hour range, Strike (disk only) | the range, Strike, the nightly toggle | `server`, `cabinet` |
| 2 `how-often` | Thursday 17:00's dead disk under nightly, six-hourly, then hourly tapes | Strike at a held hour | Strike, the schedule `Select` | `cabinet` |
| 3 `full-and-since-last` | Six-hourly tapes turn incremental (small reels); Tuesday 13:00's won't read; Week tab shows the chain stop | Strike at a held hour | the incremental and bad-tape toggles, Strike, the Week tab | `cabinet` |
| 4 `not-in-the-same-building` | Fire chars the room and every tape; the warehouse copy restores | Yes: Select (disk, fire), range, Strike | Strike, the warehouse toggle | `cabinet`, `warehouse` |
| 5 `ransomware` | Ransomware padlocks the rack, the cabinet and the warehouse; the lockbox restores | Yes: Select (fire, ransomware), range, Strike | Strike, the lockbox toggle | `warehouse`, `lockbox` |
| 6 `test-the-restore` | Tapes since Monday 07:00 never read back; Friday restores Monday 01:00's; a daily test catches it Monday 09:00 | Strike at a held hour | Strike, the test toggle, the Week tab | `cabinet` |
| 7 `workbench` | The bench's week replayed: a dead disk, a fire, ransomware at their fixed hours | Yes: Select (the three), Strike | three `Select`s: how often, copies, where | `lockbox` |

## Engine (`src/lib/backups/`)

- **A tick simulator over a hand-made week, nothing measured** (KTD6). `sim.ts` runs `data/backups/writes.json` (orders per hour, Monday to Sunday) under a policy: how often (copies from 01:00), full or incremental (each day's first copy full), the warehouse, the lockbox (the courier's full tape at 18:00 daily), a bad copy job from an hour on, the daily test restore at 09:00 (a bad newest tape is caught, the job fixed, a fresh full taken), and one unreadable tape (chapter 3). Deterministic: no random draws, so no seed is needed.
- **A disaster** strikes at the end of its hour and wipes the places `data/backups/disasters.json` names (the server always; fire the cabinet; ransomware the cabinet and the warehouse; the lockbox never). `restore` takes, from each surviving place, the newest copy whose whole chain reads, and picks the one that loses least, then the fastest. Lost work is the orders written since its hour (the whole week when nothing restores, said as "every order"); down time is the place's fetch, the full tape and each incremental link (planning numbers in `data/backups/assumptions.json`).
- **The plan's file list** named `copies.ts`, `disasters.ts`, `restore.ts` and `story.ts`; the engine fits in `sim.ts`, so they were folded into it.
- **The chapters' runs** are `SCENES` and `STRIKES` in `sim.ts`; their results are pinned in `data/backups/pinned.json` and rerun by `backups-sim.test.ts` (`WRITE_PINNED=1` rewrites).
- **Chapter 7's workbench** (`workbench.ts`): how often × full or incremental × where (32 plans) against the bench's dead disk, fire and ransomware. Mira's rule (`data/backups/workbench.json`): every disaster loses at most 120 orders and is back within 10 hours; then the cheapest week. `WINNERS` is pinned and `backups-workbench.test.ts` solves it again.
- **Facts** (the 3-2-1 rule from US-CERT's 2012 paper, CISA's offline backups, Sophos's 2024 survey on attacks on backups, NIST's RPO and RTO, PostgreSQL's incremental restore chain, GitLab's 2017 outage) come from `data/backups/facts.json` with source and access date. No vendor is named as the place to keep backups.
