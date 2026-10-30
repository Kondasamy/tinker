# Guardrails (`/guardrails/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The mail room** (`src/components/scenes/guardScene.ts`) composes `officeScene` (the front desk renamed through its `emp` option) and adds a mail room, read off one run up to the current step: email waits in an inbox tray and rides the front-desk belt in to the host; an outbound chute behind the host leads to a post box, the way out. Each defence is a prop turned on by a flag: a screening arch on the inbound belt (the input checks), a barrier on the chute (the allow-list), the chute shut once untrusted text is in (the taint rule), and the lethal trifecta's three legs named, a removed leg drawn shut, dashed or gone. `officeScene` exports `beltAt`, `archAt` and `barrierAt` so the mail room draws its belts and checks the same way. `GuardStage` (`src/content/guardrails/kit.tsx`) puts it one tab from the Steps lanes (`guardSequence.ts`), where a call a check stopped is a dashed card stamped REFUSED (DENIED when a person said no). Chapter 7 keeps its tab in the step state.
- **Hero object: the screening arch**, a walk-through scanner on the inbound belt, with a security guard standing on the host side of it; the way out is a pillar box.

## Engine (`src/lib/guardrails/`)

- **A small single-agent loop with defence layers as host stages** (`loop.ts`). It reuses Tool calling's schema checks, `server.ts`'s `Bundle`, `combosOf` and `stepsOf`/`answerOf`; no plans, compaction or delegation. Input stages (the classifier, the input policy check) decide what the model sees; the taint rule and the trifecta's legs decide which tools it is offered; output stages (approval, the allow-list, the output policy check, the output filter) act on what it does.
- **The bundle** (`data/guardrails/server.json`) adds `read_inbox` (untrusted email), `get_customer` (private data: address, card's last four, account notes) and `send_email` with a free `to` field (the way out) to the order tools. Replies go through the host-defined `reply` tool, which can only answer the sender of the email being worked, so it is not a way out. The taint rule removes only `send_email`.
- **The signature holds what the model could see** (`turns.ts`): the case, the email's form (`full`, `quarantined` when the classifier held it, `refused` when the input policy check turned it away), whether the prompt rule is in the system text, the tools offered (the taint rule and a removed leg change them) and the history of outcomes, a stopped send entering as `send_email:blocked` or `send_email:denied`. Host-only settings stay out: the threshold's value, the allow-list, the output filter, the output policy check and approval. They change what the host does, not what the model sees.
- **The classifier is a fixture, not a model.** Each email in `data/guardrails/inbox.json` carries a hand-set score, an `attack` label and a note; it is the only home of scores and labels. Copy calls it a stand-in detector whose scores were set to show the trade-off. Thresholds come from a finite list (`THRESHOLDS`).
- **Two suites**: `data/guardrails/suite.json` references inbox emails by id, the attacks (each with a goal check) and the ordinary customers (each with the tools its answer needs). `metrics()` runs both under one defence set and gives attack success rate (`asr`) and false-block rate (`fbr`); the copy names the two counts an eval.
- **One merged recording.** Turns live in `data/guardrails/turns/<chapter>.json`, one reviewed file per chapter scenario holding the turns that chapter first needs; each signature is in exactly one file, and every run looks up the merged `RECORDING`, so later chapters and the red-team workbench reuse earlier turns. This departs on purpose from the plan's per-chapter recordings (as agents keeps): the chapters share most of what the model sees, and one lookup keeps a turn from being recorded twice. Chapter 7 has no file of its own.
- **Coverage:** every chapter control has a finite domain (`DOMAINS`, one per recording file) and chapter 7's red team is one domain over every defence and both suites (`WORKBENCH_DOMAINS`). `tests/unit/guard-coverage.test.ts` runs every combination and fails on any `norecord`, on a signature in two files, or on a recorded turn nothing reaches.
- **Chapter 5's puzzle accepts every minimal winning set**: every defence set the controls can make that stops every attack with the fewest false blocks (`WINNERS`, computed over the chapter's domain), not one hand-picked answer.
- **Facts about prompt injection** come from `data/guardrails/facts.json` with source and access date.
- **Agents chapter 3 links straight to `/guardrails/`** for prompt injection; it changed in the PR that took Guardrails live.

## Toy vs real

Larkspur's test set is written for this module (`data/guardrails/suite.json`: 5 attacks, 2 ordinary customers), the model's turns are recorded and the classifier's scores are hand-set (`inbox.json`), so no count or rate it gives is calibrated to a real system: every one is labelled. `ToyNote` (`kit.tsx`) says so beside a cited real figure wherever the counts and rates show (chapters 2, 5, 6, 7), and gives AgentDojo's 629 attack cases (`agentdojo`'s `value`) for scale. Recorded turns are never re-recorded for this (KTD5).

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Two emails, the prompt rule stops one (recorded turns) | `agentdojo-delimit` (a prompt-level defence cut GPT-4o's attack success from 57.7% to 41.7%) | Labelled: the narration says the turns are recorded to show it |
| 2 | Each email's score, 0 to 1; the thresholds; "N of 3 attacks, M of 2 customers quarantined" | `agentdojo-detector` (a detector cut attack success to 8.0% and tasks done from 69.0% to 41.5%), `scan-untrusted`, `ninety-five-fails` | Labelled: the narration says the scores are hand-set; `ToyNote` beside the real detector's trade-off |
| 3 | None (addresses and card digits are the toy's records) | `owasp-image-exfil`, `link-exfiltration`, `owasp-mitigations` | Real facts only |
| 4 | None (three legs) | `camel` (77% of AgentDojo's tasks solved with provable security, against 84% undefended), `lethal-trifecta`, `avoid-trifecta` | Real facts only |
| 5 | 3 attacks, 2 customers, the filter's catch-all threshold, the matrix, the fewest blocked (`WINNERS` computed) | `agentdojo` (97 tasks, 629 attack cases) | Labelled: `ToyNote` |
| 6 | The discount email's score; the cost table's counts per setting | `xstest` (Llama 2 70B chat fully refused 38% of clearly safe prompts) | Labelled: `ToyNote` beside the real over-refusal rate |
| 7 | Attacks through and customers blocked, as counts and rates, with no defences, clean and strictest | `red-team-rate` (23.6% to 11.2% over 123 cases), `one-percent`, `ninety-five-fails` | Labelled: `ToyNote` beside Anthropic's measured rates |
| Intro | 5 attacks, 2 customers, attacks through with no defences and stacked | as chapter 7 | Labelled: "written for this module"; the model's turns are said to be recorded |
| Recall | Hypothetical counts ("0 of 3 attacks through, 1 of 2 customers blocked") | none | Labelled: hypotheticals in the question |
