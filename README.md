# Tinker

> See how tech works by playing with it. Hand-drawn, interactive explanations of tech concepts, by [Kondasamy Jayaraman](https://kondasamy.com). Home: **https://explain.kondasamy.com** (once the domain is connected; see Deploy).

Each module is a short story you play through: the picture on the left is live, the story on the right asks you to do one thing at a time in it, and you watch what changes. Build the thing, break it, fix it.

![Tinker home: one workshop, a plot per module. RAG, tool calling, AI agents, evals and guardrails are live; the planned modules are building sites](docs/images/home.png)

---

## Modules

Every module has a level, a story, an intro at `/<module>/`, its chapters, and a recap at `/<module>/recap/`. The home page lists them by level.

| Level | Module | Status |
|---|---|---|
| Beginner | [RAG: Retrieval-Augmented Generation](#rag-retrieval-augmented-generation-rag) | Live, 7 chapters |
| Beginner | Tokens & embeddings | Planned |
| Intermediate | [Tool calling & MCP](#tool-calling--mcp-tool-calling) (RAG recommended first) | Live, 7 chapters |
| Intermediate | [Evals & LLM testing](#evals--llm-testing-evals) (RAG recommended first) | Live, 7 chapters |
| Intermediate | [Prompt injection & guardrails](#prompt-injection--guardrails-guardrails) (Tool calling recommended first) | Live, 7 chapters |
| Intermediate | Context engineering & memory | Planned |
| Advanced | [AI agents](#ai-agents-agents) (Tool calling recommended first) | Live, 7 chapters |
| Advanced | Transformer architecture | Planned |
| Advanced | Fine-tuning vs prompting | Planned |

### RAG: Retrieval-Augmented Generation (`/rag/`)

How AI assistants answer from a company's documents, why they invent answers, and the levers that make them accurate. You join the team building an assistant for **Larkspur Supply Co.**, a fictional hardware company, and follow it from its first confident wrong answer to its best one.

| # | Chapter | What you do |
|---|---|---|
| 1 | How RAG came to be | Watch a model invent a refund policy, then walk the 2020–2026 history: small context windows, then RAG, then agents that use retrieval as one tool |
| 2 | Why not stuff it all in the prompt? | Grow the company drive from 50 KB to petabytes against a context window; see size, lost-in-the-middle, freshness and permissions |
| 3 | What is RAG? | Wire docs → retriever → LLM and turn an invented answer into a cited one |
| 4 | The layers of a RAG system | Chunker, embedder, vector index, context assembler: find the bad cut that hid a rule, fix it with overlap |
| 5 | Making RAG accurate | Two meters (retrieval recall vs. answer) and seven levers: top-k, metadata filters, query rewrite, reranking, hybrid search, overlap, chunking strategy |
| 6 | Types of RAG | Naive, advanced, agentic, GraphRAG, self-correcting and multimodal RAG, each on a question that needs it |
| 7 | Sandbox | Rewire the whole pipeline on a workbench, then match five teams to the RAG type each needs |

![A RAG chapter: the live pipeline on the left, the story on the right](docs/images/chapter.png)

### Tool calling & MCP (`/tool-calling/`)

How AI assistants go from answering to acting. The Larkspur story continues: staff want the assistant to check an order or issue a refund, which an answer from documents cannot do.

| # | Chapter | What you do |
|---|---|---|
| 1 | Answers aren’t actions | Ask the documents-only assistant where an order is, watch it guess, and see why only the software around the model can act |
| 2 | Your first tool | Give the model a tool definition (name, description, schema) and follow the loop: the model proposes a call, the host runs it, the result goes back |
| 3 | Valid isn’t correct | Validate calls against the schema, send a rejected one back as an error the model fixes, and catch a valid but wrong call with a business check |
| 4 | Many tools, many steps | Send independent lookups together, make a dependent call wait for its input, and cap the loop |
| 5 | MCP: one plug for many tools | Connect a host to an orders server and a calendar server over the Model Context Protocol: hosts, clients, servers, and the tools, resources and prompts they offer |
| 6 | When tools go wrong | Put an approval gate in front of a refund, narrow its permission, and stop an instruction planted in a tool result |
| 7 | Workbench | Set up servers, the gate and the limits for four requests, each needing its own setup |

The chapters play out in Larkspur's **back office**, an isometric diorama: the employee's desk, the host app's sorting desk, the model and the order system's filing cabinet, joined by conveyor belts. Each message rides its belt as an envelope. A schema arch holds back a malformed call, an approval barrier waits for a person, a cabinet drawer slides out when an order is read, and a planted instruction pokes out of an envelope. The same run is one tab away as a message-by-message sequence.

![A tool calling chapter: a refund waits at the approval barrier, the ledger below shows nothing has moved](docs/images/tool-calling.png)

### AI agents (`/agents/`)

How an assistant goes from one request to a whole case. The Larkspur story continues: the assistant now gets support cases, and the model picks each next step itself.

| # | Chapter | What you do |
|---|---|---|
| 1 | Workflow or agent? | Run a damaged-delivery case as a fixed script and as an agent, with the stock in and out, and see when each one fits |
| 2 | The loop, and who says done | Follow act, look, decide, again, and see that a turn with no tool call is the answer |
| 3 | Plans, and approving a plan | Have the agent write a plan, re-plan on a surprise, and approve the plan instead of every call; catch a planted line in an email |
| 4 | Budgets and stuck loops | Set a step budget, watch the token meter, and stop an agent that retries a failing call |
| 5 | Memory, and what survives it | Watch the history grow, summarise it, and pin the one note that must not be lost |
| 6 | Sub-agents, and the cost of a handoff | Hand each order to a helper with a clean context, and compare what the lead and the whole run spend |
| 7 | Workbench | Every control from chapters 1–6 on one case at a time |

The chapters play out in the same back office. The agent adds four props: the plan on a clipboard, a step and context gauge on the host's desk, an in-tray of history that becomes one binder when the host compacts it, and small desks for helpers. The same run is one tab away as a step-by-step sequence.

### Evals & LLM testing (`/evals/`)

How a team shows a change made the assistant better, and not just better on the questions it tried. Back at Larkspur, the team keeps changing the RAG assistant; RAG's questions are the test set.

| # | Chapter | What you do |
|---|---|---|
| 1 | It worked when I tried it | Try two questions a change fixes, then run the whole test set on both versions and find the one it broke |
| 2 | The test set | Pick cases from a support log, give each a reference answer, and find the gap your set leaves |
| 3 | Graders | Grade answers by code, by a model judge and by a person, and see where each goes wrong |
| 4 | Judge the judge | Check the judge against people's labels, fix its rubric, and catch position bias by swapping the order |
| 5 | Grading the path | Grade a Tool calling run by its reply, its ledger and its calls, and catch a refund nobody asked for |
| 6 | Run it twice | Ask the same cases five times and compare pass@k with pass^k |
| 7 | Release day | Pick a candidate, a grader and a release gate, and decide what ships |

The chapters play on a test bench: RAG's pipeline at the back, a stack of test cards riding a belt into it, and a grader's desk where answers pile up PASS and FAIL. The same run is one tab away as a results grid, a column per version.

### Prompt injection & guardrails (`/guardrails/`)

What happens when the text an assistant reads tries to give it orders, and the defences that hold. Larkspur's assistant now works the support inbox: it reads customer email, looks up customer records and can send email out.

| # | Chapter | What you do |
|---|---|---|
| 1 | Data or instructions? | Run a direct attack and a note planted in a forwarded invoice, then add a prompt rule and see which one still gets through |
| 2 | Input filters | Slide a classifier's threshold and count the attacks it holds against the customers it holds too |
| 3 | The way out | Stop a leak with an allow-list of recipients, an output filter for links, or a person approving each email |
| 4 | The lethal trifecta | Take away private data, untrusted text or the way out, and see what each costs the customer |
| 5 | Defence in depth | Stack defences until no attack gets through, blocking as few customers as possible |
| 6 | When the user is the attacker | Stop a customer who asks for too much with policy checks, without refusing fair requests |
| 7 | Red team | Run both suites under every defence and decide whether the assistant ships |

The chapters play in a mail room added to Tool calling's back office: email rides in from an inbox tray past a screening arch, and an outbound chute with a barrier leads to a post box, the way out. The same run is one tab away as a step-by-step sequence.

---

## How it's built

- **Static site:** Astro with React islands. No backend, no API key, no live model, so it runs on any static host, and a chapter keeps working offline once its data has loaded.
- **Real retrieval, precomputed answers (RAG):** the corpus is embedded at build time (`pnpm build:index`, all-MiniLM-L6-v2 and a cross-encoder reranker); the browser runs the real similarity, BM25, reranking, graph-walk and agent maths over those vectors. Model answers are pre-recorded for each kind of evidence that can reach the model, so every knob changes the outcome honestly.
- **Recorded turns, live tools (Tool calling, AI agents):** the model's turns are pre-recorded per scenario (`data/tool-calling/turns/`). The host loop, a JSON Schema subset validator, the approval gate, the tools running on fixture data and an MCP-shaped JSON-RPC server all run in the browser (`src/lib/tools/`). A unit test checks every reachable control setting has a recorded turn. MCP facts come from `data/tool-calling/facts.json`, each with its source. The agent loop (`src/lib/agents/`) reuses those tools and adds plans, approval, budgets, a repeat detector, memory and helpers, all computed in the browser; its recorded turns are in `data/agents/turns/` and its facts in `data/agents/facts.json`. The guardrails loop (`src/lib/guardrails/`) puts defences around the model as host stages (input filters, the taint rule, the allow-list, the output filter, policy checks, approval); its turns are in `data/guardrails/turns/`, its stand-in classifier's hand-set scores in `data/guardrails/inbox.json`, and its attack and customer suites in `data/guardrails/suite.json`.
- **Real retrieval, recorded grading (Evals):** each version of the assistant runs RAG's real retrieval over the same 12 questions and reads the recorded answer for what it found. Code graders run in the browser (`src/lib/evals/`); the model judge's verdicts, people's labels and repeated tries are recorded in `data/evals/`, and every combination a control can reach is checked by a unit test.
- **Pictures:** hand-inked isometric figures drawn by the Colorfigures engine (see Credits), extended to orbit, zoom and turn the view. Each module leads with a scene you can picture rather than a flow chart: RAG's pipeline on a workbench, tool calling's back office (`src/components/scenes/officeScene.ts`), evals' test bench (`evalScene.ts`), guardrails' mail room (`guardScene.ts`), and the home page's workshop with a plot per module (`heroScene.ts`). Flat sequence figures (lanes and message cards, `src/lib/iso/flat.ts`) in the same ink show the exact messages, a tab away. Names sit in label pills so they stay readable.
- **Works on a phone:** below 861px the picture stacks above the story, pills grow, and the sequence shows one message at a time.

<p align="center"><img src="docs/images/phone.png" width="300" alt="A tool calling chapter on a phone: the back office above, the INVALID call held at the schema check"></p>
- **Story:** every chapter is a list of steps run by one step runner (`src/components/story/`): each step has narration, the one control it needs, a check that advances it, hints after a few tries and, for puzzles, “Show me”. Progress is saved in the browser, per module.
- **Pictures first, words on request:** each module intro opens in a Pictures reading mode (pictures, headings and one-line captions, the chapters as picture cards); a Words switch shows the full text.
- **Making it stick:** chapters ask for a prediction before a reveal, quizzes explain why each option is right or wrong and offer “I’m not sure”, each module's recap asks recall questions from the chapters you finished, and a reader who returns 20 hours or more after finishing a chapter is offered a short warm-up. Nothing leaves the browser.
- **Tests:** unit tests for the engine and story logic (Vitest), and end-to-end tests that play every chapter, check accessibility with axe, keyboard-only play, reduced motion, phone size and offline use (Playwright).

---

## Project layout

| Path | What lives there |
|---|---|
| `src/pages/index.astro` | Tinker home: what Tinker is and the modules, grouped by level |
| `src/lib/modules.ts` | The module registry: every module, live or planned, with its level, chapters and recall bank |
| `src/pages/<module>/` | A module's pages: its intro (`index.astro`), the chapter route (`[chapter].astro`) and the recap (`recap.astro`) |
| `src/content/<module>/` | A module's registry entry (`module.ts`: chapters and each chapter's opening context), its chapter scripts and its recall bank (`recall.ts`) |
| `src/lib/rag/`, `data/` | RAG engine (retrieval maths, agent, graph) and its corpus, questions, answers and index |
| `src/lib/tools/`, `data/tool-calling/` | Tool calling engine (host loop, schema validator, MCP-shaped server) and its recorded turns, fixtures and facts |
| `src/lib/agents/`, `data/agents/` | Agent engine (the agent loop, its budgets, memory and helpers) and its recorded turns, fixtures and facts |
| `src/lib/evals/`, `data/evals/` | Evals engine (versions, the suite, code graders, the release gate) and its references, judge verdicts, labels, samples and facts |
| `src/lib/guardrails/`, `data/guardrails/` | Guardrails engine (the loop and its defence layers, the suites' metrics) and its recorded turns, inbox, customers, suites and facts |
| `src/lib/iso/` | The drawing engine (Colorfigures, adapted), the isometric stage and the flat figure kit, shared by every module |
| `src/components/story/` | The step runner every chapter uses: the live picture on the left, the story column on the right |
| `src/components/quiz/` | Quizzes, predictions and the recap |
| `templates/module/`, `scripts/new-module.mjs` | The new-module template and the script that copies it (`pnpm new-module`) |

Decisions behind the design (layout, story rules, pictures, share images, tooling) are recorded in [AGENTS.md](AGENTS.md); read it before changing things.

---

## Run locally

**Requires** Node.js 22.22 or newer (the version is pinned in `.node-version`) and pnpm 11 (pinned in `package.json` `packageManager`; `corepack enable` installs the right version).

```bash
pnpm install    # install exact dependency versions from pnpm-lock.yaml
pnpm dev        # start the dev server on http://localhost:4321
```

Open http://localhost:4321 for the Tinker home; the modules are at http://localhost:4321/rag/, http://localhost:4321/tool-calling/, http://localhost:4321/agents/, http://localhost:4321/evals/ and http://localhost:4321/guardrails/. The dev server also serves internal test pages at `/dev/blocks`, `/dev/canvas`, `/dev/runner`, `/dev/flat`, `/dev/quiz`, `/dev/recap` and `/dev/warmup`. These pages are left out of production builds.

To try the production build locally:

```bash
pnpm build      # writes the static site to dist/
pnpm preview    # serves dist/ on http://localhost:4321
```

### Tests and checks

```bash
pnpm check                              # type-check Astro and TypeScript
pnpm test                               # unit tests (Vitest)
pnpm exec playwright install chromium   # one-time browser download for e2e
pnpm test:e2e                           # end-to-end, accessibility, mobile and offline tests (Playwright)
```

`pnpm test:e2e` builds the site and starts its own preview server on port 4399.

### Share images

Every public page has its own 1200×630 share image in `public/og/`. After changing a page's title or text (`src/lib/pages.ts`), a chapter, or a share picture, redraw them and commit the result:

```bash
pnpm og     # builds with the dev pages, captures src/dev/og.astro for each page into public/og/<page>.jpg
```

### Regenerating the data (only when the corpus or questions change)

The retrieval index in `public/data/index/` is committed. Normal development and deploys never rebuild it. Run these steps only after you edit `data/corpus/` or `data/questions/`:

```bash
pnpm build:index                  # re-embed and re-score; the first run downloads two small models into .cache/ (about 8 minutes cold, seconds when cached)
node scripts/draft-answers.mjs    # redraft data/answers/*.json from rules; review the answers before committing
pnpm test                         # the scenario and answer-coverage tests must still pass
```

---

## Deploy

The site is fully static. Every host does the same three things:

- **Install command:** `pnpm install` (hosts pick pnpm from `pnpm-lock.yaml`)
- **Build command:** `pnpm build`
- **Output directory:** `dist`
- **Node version:** 22.22 or newer (both hosts below read it from `.node-version` or `package.json` `engines`)

Do not run `build:index` on the host. The committed `public/data/index/` files (about 8 MB) ship as they are.

### Cloudflare Pages

**From Git (recommended):**

1. In the Cloudflare dashboard, open **Workers & Pages → Create → Pages → Connect to Git** and pick this repository.
2. Set **Framework preset** to *Astro*, **Build command** to `pnpm build` and **Build output directory** to `dist`.
3. Under **Environment variables**, add `PNPM_VERSION` = `11.22.0` (the build image's default pnpm is older and can't read this lockfile). If the build uses an older Node, also add `NODE_VERSION` = `22.23.1`.
4. Deploy. Each push to `main` deploys production, and other branches get preview URLs.

**From your machine (direct upload):**

```bash
pnpm build
pnpm dlx wrangler pages deploy dist --project-name tinker
```

The first run asks you to log in to Cloudflare and creates the project.

### Vercel

**From Git (recommended):**

1. In the Vercel dashboard, choose **Add New → Project** and import this repository.
2. Vercel detects Astro. Keep **Install command** `pnpm install`, **Build command** `pnpm build` and **Output directory** `dist`. Add the environment variable `ENABLE_EXPERIMENTAL_COREPACK` = `1` so Vercel uses the pnpm version in `packageManager`.
3. Under **Settings → General → Node.js Version**, choose 22.x if it isn't already selected.
4. Deploy. Pushes to `main` go to production, and pull requests get preview URLs.

**From your machine:**

```bash
pnpm dlx vercel          # first run links the project and makes a preview deploy
pnpm dlx vercel --prod   # production deploy
```

### Custom domain: explain.kondasamy.com

- **Cloudflare Pages:** project → **Custom domains** → add `explain.kondasamy.com`. With kondasamy.com's DNS on Cloudflare, the CNAME is created for you; otherwise add a CNAME `explain` → `<project>.pages.dev`.
- **Vercel:** project → **Settings → Domains** → add `explain.kondasamy.com`, then a CNAME `explain` → `cname.vercel-dns.com` at your DNS provider.
- `astro.config.mjs` sets `site` to this address (canonical URLs). Change it there if the domain changes.
- Optional: on whatever serves kondasamy.com, redirect a short path (for example `/tinker`) to `https://explain.kondasamy.com/`.

### After deploying

1. Open the home page, then the RAG module at `/rag/`, and confirm chapter 1 loads.
2. Open `/data/index/manifest.json` and confirm it returns JSON. This proves the data files are served.
3. Go through chapters 3–7 once. The canvas should show answers, not stay on "Preparing…".

No monitoring is needed, because there is no backend.

---

## Contributing

The empty plots on the home page are open. New modules and fixes arrive as pull requests to this repository. Start with [CONTRIBUTING.md](CONTRIBUTING.md) (setup, checks, the PR flow, credit) and [docs/writing-a-module.md](docs/writing-a-module.md) (the house style for a module). `pnpm new-module <id> "<Title>"` scaffolds a module, and `pnpm test` lists what it still needs.

---

## Credits

The illustrations are drawn with [Colorfigures](https://april-zhu.com/colorfigures) by [April Zhu](https://april-zhu.com/): the hand-inked isometric style and the drawing engine in `src/lib/iso/core.js` come from it, adapted for Tinker. Colorfigures builds on April's [ISO-GLOW](https://isoglow.dev), which builds on [iso-figure](https://github.com/MrBongoC/ai-iso-skill) by Tolga Cohce. All MIT licensed (see `src/lib/iso/LICENSE`).

---

## Background research (RAG module)

Early research for the RAG module, generated with Perplexity Deep Research. It informed the build but is **not the shipped design**: the noir detective story, the live in-browser model and the corkboard look described in these files were all dropped in favour of the Larkspur assistant story, precomputed embeddings with real in-browser maths, and Colorfigures illustrations. The design actually built is in [`docs/plans/2026-10-19-1752-feat-rag-learning-module-plan.md`](docs/plans/2026-10-19-1752-feat-rag-learning-module-plan.md).

- [Master blueprint and curriculum](research/00_master_blueprint_and_curriculum.md): the story → guided explorables → puzzles → sandbox progression the chapters follow
- [Visual RAG storytelling and pedagogy](research/01_visual_rag_storytelling_and_pedagogy.md): what makes explainers like Transformer Explainer and Google PAIR work
- [Simulation technical architecture](research/02_simulation_technical_architecture.md): in-browser vector search, projections, state machines
- [RAG failure modes and puzzles](research/03_rag_failure_modes_and_interactive_puzzles.md): the failure taxonomy several chapter puzzles came from
- [Early spec: forensic noir playground](research/04_noir_forensic_playground_spec.md): the first concept, kept for reference
