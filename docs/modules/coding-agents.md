# Coding agents (`/coding-agents/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The agent's desk** (`src/components/scenes/deskScene.ts`): the agent at its desk, a filing cabinet with a drawer per repo file (shut, hit by a search, read, open), the patch on the desk with a strip per hunk (kept or dropped, or refused by the host), a lamp board with a lamp per test (green, red, off), and a terminal showing the last command and how the host took it. A padlock on the tests drawer means the host protects test files. `deskAt(run, beat)` reads the desk at any beat of a run, so the picture and the Code tab never disagree. The home card, the intro hero and chapter 4's share image are the first test run (`deskCard`); the hero plot is `agentDeskPlot`.
- **The Code tab, one tab away** (`CaStage`, `src/content/coding-agents/kit.tsx`, panels in `codePanel.ts`): the file read, the search's hits, or the patch with a checkbox per hunk and "Run tests". All React text.
- **The mechanic (KTD15)**: chapter 3's hunk checkboxes; the tests then run on the version the reader made.

## Engine (`src/lib/coding-agents/`)

- **Real tests over real version files** (`repo.ts`, `tests.ts`): the fixture repo is `data/coding-agents/repo/` (four source files, one test file). Every version the agent can make is a real module in `versions/` (8 files: the seven non-empty hunk subsets of the discount fix, `discount-001` to `discount-111`, and the weakened test file), imported twice: as code `npm test` runs and as raw text the reader sees. `npm test` runs the real checks over the real version, live.
- **A patch equals its version** (`tests/unit/coding-agents-versions.test.ts`): a patch's hunks are the runs of changed lines in the line diff (`git/merge.ts`), any subset can be applied, and the test proves every subset's text equals its version file. 6 patches (`data/coding-agents/patches.json`), 3 tickets (`tickets.json`: `bulk`, `cheat`, `ship`).
- **Recorded turns, live host** (`loop.ts`, `turns.ts`, `data/coding-agents/turns/`): only the agent's choices are recorded, keyed by a signature of what it saw (ticket, history, tools); the host carries each action out on the repo. The turns were written for this site, not recorded from a model, and the copy says so. One file per chapter scenario; a signature lives in one file; every run looks up the merged recording.
- **A reviewed hunk subset enters `hist`**: the edit's outcome is `reviewed` and names the version the reviewer kept, so the agent's next turn answers the version the reader made.
- **Host-only stages stay outside the signature**: protected test files, the run allow-list and asking a person first (`data/coding-agents/host.json`) change what the host does, never what the agent is told; they reach the agent only through outcomes in `hist`. A command's tier is its longest matching prefix; an unnamed command is `never`.
- **Chapter 7's workbench** (`workbench.ts`): protect, allow-list and ask-first over the ticket queue. A policy wins when every ticket is really done with the fewest questions to a person. `WINNERS` is pinned in `pinned.json` and recomputed by `solve()` in a test.

## Facts

From `data/coding-agents/facts.json` (accessed 2026-10-25), each with its source:

- **SWE-bench** (Jimenez et al., 2023: 2,294 issues, 12 repositories, 1.96% then) and **METR's reward-hacking report** (June 2025) were checked against their pages; **Claude Code's permission rules** (deny, ask, allow, in that order) against its docs.
- **SWE-bench Verified** (August 2024, 500 screened tasks) was confirmed from search results; the OpenAI page itself was not read directly.
- **The Verified leaderboard figure** (97.0%) is third-party (Steel's board, updated 11 October 2026), quoted as dated and attributed, with the note that boards disagree on the leader. Re-check it whenever the module changes.
