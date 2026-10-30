# Coding agents (`/coding-agents/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The agent's desk** (`src/components/scenes/deskScene.ts`): the agent at its desk, a filing cabinet with a drawer per repo file (shut, hit by a search, read, open), the patch on the desk with a strip per hunk (kept or dropped, or refused by the host), a lamp board with a lamp per test (green, red, off), and a terminal showing the last command and how the host took it. A padlock on the tests drawer means the host protects test files. `deskAt(run, beat)` reads the desk at any beat of a run, so the picture and the Code tab never disagree. The home card, the intro hero and chapter 4's share image are the first test run (`deskCard`); the hero plot is `agentDeskPlot`.
- **Hero object: the rounded robot agent at a workbench**, hands on the patch, beside a drawer-pull filing cabinet and a rounded terminal; the test lamps are a traffic light on a pole, a lamp per test.
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

From `data/coding-agents/facts.json`, every fact re-checked against its source on 2026-10-30:

- **SWE-bench** (Jimenez et al., 2023: 2,294 issues, 12 repositories, 1.96% then) and its **patch vs whole file** result (Claude 2: 4.8% writing patches, 2.2% rewriting whole files) from the arXiv paper; **SWE-agent's search ablation** (Yang et al., 2024: 18.0% with a search that lists every matching file, 15.7% with none, 12.0% paging one match at a time) from its arXiv paper.
- **SWE-bench Verified** (August 2024, 500 screened tasks) and **OpenAI's February 2026 audit** (at least 59.4% of 138 hard tasks had tests that reject correct fixes; OpenAI stopped reporting it) were read from openai.com through the Internet Archive, since openai.com refuses scripted fetches. The audit doesn't contradict chapter 4: it is where the toy stops matching (the toy's tests are right; real ones can be wrong).
- **The Verified leaderboard figure** is now the official board (swebench.com: 79.2%, checked 2026-10-30), replacing a third-party board's 97.0%. Re-check it whenever the module changes.
- **METR's reward-hacking report** (June 2025), **Claude Code's permission rules** (deny, ask, allow, in that order) from its docs, and **Anthropic's approval rate** (users accept 93% of permission prompts, March 2026, Anthropic's own usage data).
- The host's tiers differ from Claude Code's on purpose: the toy takes a command's longest matching prefix, Claude Code checks deny before ask before allow whatever the specificity. Larkspur's tiers never overlap, so both give the same answers here.

## Toy vs real

The repository is a toy (six small files, one of them a test file with four checks) and the agent's turns are written, not recorded (KTD12): `RecordedNote` says both wherever the turns show. Every count below is computed live from that toy, so it is labelled, not matched; nothing in it can be read off a real figure without changing what the chapter shows.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | 5 actions to fix the ticket | `swe-bench` (2,294 issues, 1.96% in 2023) | Labelled (written turns) |
| 2 | 4 files read, 541 → 264 tokens with search | `search-tool` (18.0% vs 15.7% vs 12.0%) | Labelled (toy repository) |
| 2 | about four bytes a token | OpenAI tokenizer rule of thumb (`BYTES_PER_TOKEN`, `src/lib/scale.ts`) | Real |
| 3 | 3 hunks; 50 items counts as bulk; 4 of 4 tests pass | `patch-vs-file` (4.8% vs 2.2%) | Labelled (toy repository) |
| 4 | 3 hunks; 1 of 4 fails | `verified` (500 tasks), `verified-flaws` (59.4%) | Labelled; the copy says real tests can be wrong |
| 5 | 2 red tests; 50-item threshold; 5 pm release | `reward-hacking` | Labelled (written ticket and turns) |
| 6 | 3 tiers | `permissions` (deny, ask, allow) | Real (the same three kinds) |
| 7 | 3 tickets; 1 question to a person at best; winners count | `approvals` (93% of prompts accepted) | Labelled; the copy says people stop reading prompts they see often |
| Intro | 541 → 264 tokens; 4 tests; 1.96%; 1 question; 79.2% | `swe-bench`, `verified-now` | Toy counts labelled; percentages real |
