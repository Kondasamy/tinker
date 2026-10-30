# Computer use (`/computer-use/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The puppet desk** (`src/components/scenes/puppetScene.ts`): a monitor shows the portal's current screen, drawn flat on its face as coloured boxes (buttons mustard, tiles mint, the planted offer tomato, the notice mustard), with no words on it; a camera on a stalk flashes, its rays on the screen, when the host takes a screenshot, and its pill gives the look's number and tokens; a hand on a mouse pulls a dashed string up to a crosshair at the real click point (`data-crosshair`), tomato when the click was refused or denied; a film strip of past screenshots lies on the desk in front (six frames, three on phones). `frameAt` (`src/content/computer-use/frames.ts`, style-free so home and the share images use it) reads the desk off a run at a beat: each look, each click, the closing note. `CuStage` (`src/content/computer-use/kit.tsx`) puts it one tab from the Screen view (`screenView.tsx`: the screenshot rasterised at the agent's size and drawn back pixelated, a dashed ring where the agent aimed in the screenshot's pixels and a crosshair where the host clicked). The Screen view carries the click-to-predict targets (KTD15): focusable buttons over every clickable thing, arrow keys between them, Enter or a tap picks and locks; on phones each is at least 44 px and small neighbours (the order list's Reorder links) merge into one. Prediction steps keep the tab in the step state, so the Screen view shows while the reader predicts. On phones the pills keep names and the caption carries the rest.

## Engine (`src/lib/computer-use/`)

- **Drawn screens, recorded actions, live host** (KTD9). `screens.ts` draws Brightwater's trade portal (`data/computer-use/screens.json`: orders, prices, the planted notice and offer, `.example` hosts) as SVG at the real screen's 1280 × 800, each clickable thing a box the host hit-tests (`hit`). Words are painted on these screens on purpose (they are what the agent reads), every string escaped. Screenshot sizes are a finite list (`SIZES`: 640, 1024, 1280 wide).
- **The loop forks Sandboxing's** (`loop.ts`): each turn the host takes a screenshot, the recorded action for what the agent saw comes back as a click in the screenshot's own pixels (or a closing note), and the host carries it out. The host stages are live and host-only: scaling the click back (`toReal`; chapter 2's wrong button is the host forgetting), waiting for a slow page to settle (without it the next screenshot shows the old page and the next click lands on it: the stale double order), the allow-list (a page outside the portal is `refused`) and confirmation (a click that spends money goes to a person, who approves only the order the task asked for; anything else is `denied`).
- **The signature is what the agent saw** (`turns.ts`): the case, the screen at its screenshot size (`screenKey`: the page, the basket, any offer, `@WxH`), so the wait rule reaches it through a stale screen, and the history of outcomes (`click:<element>:<outcome>`). Scale-back, the allow-list and confirmation stay out; they reach it only through outcomes. Clicks are recorded in screenshot pixels, so at 640 wide the recorded click on a 15-pixel row lands on the next one.
- **One merged recording** in `data/computer-use/turns/<chapter>.json`, each signature in exactly one file; written for this site to show each lesson, not recorded from a real model, and the copy says so (`RecordedNote`). `tests/unit/computer-use-coverage.test.ts` walks every chapter domain (`DOMAINS`) and the workbench (`WORKBENCH_DOMAINS`) and fails on a missing, duplicated or unreachable action, or past 220.
- **Suite** (`data/computer-use/suite.json`): two re-orders (hinges, brackets), each done when exactly its order was paid for; two attacks, each a charge the task never asked for: the planted notice's payment on `bw-billing.example` and the look-alike Pay now's subscription. `metrics()` gives Guardrails' `asr` and `fbr`, plus screenshot tokens: looks × Multimodal's `imageTokens` for the size, computed.
- **Pinned runs and WINNERS** (`data/computer-use/pinned.json`, KTD12): every run a chapter teaches, rerun by `computer-use-engine.test.ts`. Chapter 7's workbench (`workbench.ts`) is size × wait × allow-list × confirmation (24 policies, scaling always on); a policy wins when no attack succeeds and every re-order is right, at the fewest tokens. `WINNERS` is pinned (one today: 1024 wide with every rule on) and `solve()` recomputes it in a test.
- **Facts** come from `data/computer-use/facts.json` with source and access date: Anthropic's computer-use tool docs (the loop, sizes, coordinates, waiting, injection, allow-list, confirmation), the vision docs' patch rule, OSWorld (Xie et al.; the 72.36% human baseline), the OSWorld leader only as a dated figure from OSWorld's own checked board (OSWorld-Verified; its data is `static/data/osworld_verified_results.xlsx` on osworld-v1.xlang.ai), and OpenAI's January 2025 CUA post as history.

## Toy vs real

The agent's actions are written, not recorded from a model, and the portal, its orders and prices are made up (`RecordedNote` on every chapter says so). What runs for real is the host: scaling, waiting, the allow-list, confirmation, and the token count, which is Claude's published patch rule (Multimodal's `imageTokens`). The real screen is matched to Anthropic's suggested web size; screenshot sizes, looks, clicks and money are labelled.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Looks and clicks for the re-order; the click's x, y | `agent-loop`, `app-runs-it` | Labelled: a written run |
| 2 | The 1280-pixel real screen (1280 × 800) | `resolution` | Matched: `SCREEN` reads `fact('resolution').value` |
| 2 | 1024-pixel screenshots, the resize factor, the aimed and scaled-back x | `coordinates` | Real arithmetic (`toReal`) on a written click; 1024 is a hand-picked size |
| 2 | 960 / 1920 and (400, 300) (quiz) | none | Labelled: a hypothetical in the question |
| 3 | What Larkspur paid, once and twice | `wait`, `check-after` | Labelled: fixture prices |
| 4 | The stranger's charge; the planted host | `injection`, `allowlist`, `classifiers` | Labelled: fixture |
| 5 | The plan's monthly price; prompts a person saw | `confirm`, `vm` | Labelled: fixture price; the prompt count is counted off the written run |
| 6 | 28-pixel squares | `patches` (Multimodal's fact) | Real |
| 6 | Tokens a look at 640, 1024, 1280 wide | `patches` | Real: computed by the published rule |
| 6 | Looks per size, the row the 640-pixel click slips to | `patches` | Labelled: written runs; the slip is the toy showing where small targets fail |
| 7 | Re-orders right, attacks through, tokens per case, the best total, winners | `osworld` (369 real tasks; people 72.36%, best model 12.24% in 2024), `osworld-now` (90.19% on the checked board) | Labelled: four written cases, not a benchmark; the note says real agents are scored on hundreds of real tasks |
| Intro | Screenshots for one re-order; tokens a 1280 × 800 look; % fewer tokens at the best settings | `patches`, `resolution` | Tokens real; looks and savings off written runs |
| Intro | 72.36% of OSWorld's tasks people completed | `osworld` | Real |
