# Tinker

> See how tech works by playing with it. Hand-drawn, interactive explanations of how tech works, AI and classic, by [Samy (Kondasamy Jayaraman)](https://kondasamy.com). Home: **https://tinker.kondasamy.com**.

Each module is a short story you play through: the picture on the left is live, the story on the right asks you to do one thing at a time in it, and you watch what changes. Build the thing, break it, fix it.

![Tinker home: one workshop, a plot per module; a wave names each module in turn. Thirty-three modules are live, from RAG and tool calling to search, card payments, Git, diffusion language models and queues](docs/images/home.png)

---

## Modules

Every module has a level, a story, an intro at `/<module>/`, its chapters, and a recap at `/<module>/recap/`. The home page lists them by level, numbered in the order they went live, with the planned modules as roadmap cards. Readers propose new ones through the form at the bottom of the home page.

| Level | Module | Status |
|---|---|---|
| Beginner | [RAG: Retrieval-Augmented Generation](https://tinker.kondasamy.com/rag/) | Live, 7 chapters |
| Beginner | [Tokens & embeddings](https://tinker.kondasamy.com/tokens/) | Live, 7 chapters |
| Beginner | [Caching & CDNs](https://tinker.kondasamy.com/caching/) | Live, 7 chapters |
| Beginner | [Databases & indexes](https://tinker.kondasamy.com/databases/) | Live, 7 chapters |
| Beginner | [A/B testing](https://tinker.kondasamy.com/ab-testing/) | Live, 7 chapters |
| Beginner | [Search before AI](https://tinker.kondasamy.com/search/) | Live, 7 chapters |
| Beginner | [Opening a web page](https://tinker.kondasamy.com/web-requests/) | Live, 7 chapters |
| Beginner | [Card payments](https://tinker.kondasamy.com/payments/) | Live, 7 chapters |
| Beginner | [Git](https://tinker.kondasamy.com/git/) | Live, 7 chapters |
| Beginner | [Queues and background jobs](https://tinker.kondasamy.com/queues/) | Live, 7 chapters |
| Intermediate | [Tool calling & MCP](https://tinker.kondasamy.com/tool-calling/) (RAG recommended first) | Live, 7 chapters |
| Intermediate | [Evals & LLM testing](https://tinker.kondasamy.com/evals/) (RAG recommended first) | Live, 7 chapters |
| Intermediate | [Prompt injection & guardrails](https://tinker.kondasamy.com/guardrails/) (Tool calling recommended first) | Live, 7 chapters |
| Intermediate | [Context engineering & memory](https://tinker.kondasamy.com/context/) (RAG and Tool calling recommended first) | Live, 7 chapters |
| Intermediate | [Structured outputs](https://tinker.kondasamy.com/structured-outputs/) (Tool calling and Tokens recommended first) | Live, 7 chapters |
| Intermediate | [Reasoning models & thinking budgets](https://tinker.kondasamy.com/reasoning/) (Evals recommended first) | Live, 7 chapters |
| Intermediate | [Observability & error analysis](https://tinker.kondasamy.com/observability/) (Evals recommended first) | Live, 7 chapters |
| Intermediate | [Multimodal models](https://tinker.kondasamy.com/multimodal/) (Tokens recommended first) | Live, 7 chapters |
| Intermediate | [Pre-training](https://tinker.kondasamy.com/pre-training/) (Tokens recommended first) | Live, 7 chapters |
| Intermediate | [Diffusion models](https://tinker.kondasamy.com/diffusion/) (Multimodal recommended first) | Live, 7 chapters |
| Intermediate | [Calibration](https://tinker.kondasamy.com/calibration/) (Evals recommended first) | Live, 7 chapters |
| Advanced | [AI agents](https://tinker.kondasamy.com/agents/) (Tool calling recommended first) | Live, 7 chapters |
| Advanced | [Transformer architecture](https://tinker.kondasamy.com/transformers/) (Tokens recommended first) | Live, 7 chapters |
| Advanced | [Fine-tuning vs prompting](https://tinker.kondasamy.com/fine-tuning/) (Evals and Transformers recommended first) | Live, 7 chapters |
| Advanced | [Small models: distillation & routing](https://tinker.kondasamy.com/small-models/) (Fine-tuning and Evals recommended first) | Live, 7 chapters |
| Advanced | [Inference engineering](https://tinker.kondasamy.com/inference/) (Transformers recommended first) | Live, 7 chapters |
| Advanced | [Agent sandboxing](https://tinker.kondasamy.com/sandboxing/) (AI agents and Guardrails recommended first) | Live, 7 chapters |
| Advanced | [Voice agents](https://tinker.kondasamy.com/voice/) (Tool calling and Multimodal recommended first) | Live, 7 chapters |
| Advanced | [Post-training](https://tinker.kondasamy.com/post-training/) (Fine-tuning and Evals recommended first) | Live, 7 chapters |
| Advanced | [Interpretability](https://tinker.kondasamy.com/interpretability/) (Transformers recommended first) | Live, 7 chapters |
| Advanced | [Replication & consistency](https://tinker.kondasamy.com/consistency/) (Databases recommended first) | Live, 7 chapters |
| Advanced | [Computer use](https://tinker.kondasamy.com/computer-use/) (AI agents and Multimodal recommended first) | Live, 7 chapters |
| Advanced | [Diffusion language models](https://tinker.kondasamy.com/diffusion-llms/) (Diffusion models and Transformers recommended first) | Live, 7 chapters |
| Beginner | Locks and keys | Planned |
| Beginner | Compression | Planned |
| Intermediate | Coding agents | Planned |
| Intermediate | Synthetic data | Planned |
| Intermediate | Load balancing | Planned |
| Advanced | Mixture of experts | Planned |

![A RAG chapter: the live pipeline on the left, the story on the right](docs/images/chapter.png)

## How it's built

- **Static site:** Astro with React islands. No backend, no API key, no live model, so it runs on any static host, and a chapter keeps working offline once its data has loaded.
- **Real retrieval, precomputed answers (RAG):** the corpus is embedded at build time (`pnpm build:index`, all-MiniLM-L6-v2 and a cross-encoder reranker); the browser runs the real similarity, BM25, reranking, graph-walk and agent maths over those vectors. Model answers are pre-recorded for each kind of evidence that can reach the model, so every knob changes the outcome honestly.
- **Recorded turns, live tools (Tool calling, AI agents):** the model's turns are pre-recorded per scenario (`data/tool-calling/turns/`). The host loop, a JSON Schema subset validator, the approval gate, the tools running on fixture data and an MCP-shaped JSON-RPC server all run in the browser (`src/lib/tools/`). A unit test checks every reachable control setting has a recorded turn. MCP facts come from `data/tool-calling/facts.json`, each with its source. The agent loop (`src/lib/agents/`) reuses those tools and adds plans, approval, budgets, a repeat detector, memory and helpers, all computed in the browser; its recorded turns are in `data/agents/turns/` and its facts in `data/agents/facts.json`. The guardrails loop (`src/lib/guardrails/`) puts defences around the model as host stages (input filters, the taint rule, the allow-list, the output filter, policy checks, approval); its turns are in `data/guardrails/turns/`, its stand-in classifier's hand-set scores in `data/guardrails/inbox.json`, and its attack and customer suites in `data/guardrails/suite.json`.
- **Real retrieval, recorded grading (Evals):** each version of the assistant runs RAG's real retrieval over the same 12 questions and reads the recorded answer for what it found. Code graders run in the browser (`src/lib/evals/`); the model judge's verdicts, people's labels and repeated tries are recorded in `data/evals/`, and every combination a control can reach is checked by a unit test.
- **Pictures:** hand-inked isometric figures drawn by the Colorfigures engine (see Credits), extended to orbit, zoom and turn the view. Each module leads with a scene you can picture rather than a flow chart (RAG's pipeline on a workbench, tool calling's back office, caching's depot map, Git's crate yard…), one file each in `src/components/scenes/`, and the home page's animated workshop has a plot per module (`heroScene.ts`). Flat figures (`src/lib/iso/flat.ts`) in the same ink show the exact messages or charts a tab away. Names sit in label pills so they stay readable.
- **Search:** every page has its own title, description, canonical URL and share image; intros and chapters carry schema.org course and lesson data with breadcrumbs; `/sitemap.xml` and `/robots.txt` are built from the page list, and recaps and the 404 page stay out of search.
- **Works on a phone:** below 861px the picture stacks above the story, pills grow, and the sequence shows one message at a time.

- **Story:** every chapter is a list of steps run by one step runner (`src/components/story/`): each step has narration, the one control it needs, a check that advances it, hints after a few tries and, for puzzles, “Show me”. Progress is saved in the browser, per module.
- **Pictures first, words on request:** each module intro opens in a Pictures reading mode (pictures, headings and one-line captions, the chapters as picture cards); a Words switch shows the full text.
- **Making it stick:** chapters ask for a prediction before a reveal, quizzes explain why each option is right or wrong and offer “I’m not sure”, each module's recap asks recall questions from the chapters you finished, and a reader who returns 20 hours or more after finishing a chapter is offered a short warm-up. Nothing leaves the browser.
- **Tests:** unit tests for the engine and story logic (Vitest), and end-to-end tests that play every chapter, check accessibility with axe, keyboard-only play, reduced motion, phone size and offline use (Playwright).

<p align="center"><img src="docs/images/phone.png" width="300" alt="A tool calling chapter on a phone: the back office above, the INVALID call held at the schema check"></p>

---

## Project layout

| Path | What lives there |
|---|---|
| `src/pages/index.astro` | Tinker home: a centred hero over the workshop picture, then the modules as picture cards, grouped by level |
| `src/lib/modules.ts` | The module registry: every module, live or planned, with its level, chapters and recall bank |
| `src/pages/<module>/` | A module's pages: its intro (`index.astro`), the chapter route (`[chapter].astro`) and the recap (`recap.astro`) |
| `src/content/<module>/` | A module's registry entry (`module.ts`: chapters and each chapter's opening context), its chapter scripts and its recall bank (`recall.ts`) |
| `src/lib/rag/`, `data/` | RAG engine (retrieval maths, agent, graph) and its corpus, questions, answers and index |
| `src/lib/<module>/`, `data/<module>/` | Each module's engine (simulator, recorded turns or live model code, graders, its workbench) and its fixtures, pinned outputs and dated facts; see `docs/modules/<module>.md` |
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

Open http://localhost:4321 for the Tinker home; each module is at `/<module>/` (for example http://localhost:4321/rag/). The dev server also serves internal test pages at `/dev/*` (one per module, plus `/dev/blocks`, `/dev/canvas`, `/dev/runner` and friends); production builds leave them out.

To try the production build locally:

```bash
pnpm build      # writes the static site to dist/
pnpm preview    # serves dist/ on http://localhost:4321
```

### Tests and checks

```bash
pnpm check                              # type-check Astro and TypeScript
pnpm lint                               # lint and format check with Biome
pnpm format                             # format and apply safe lint fixes
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
pnpm record:tokens                # re-record GPT-2's and GPT-4o's tokens for data/tokens/ (downloads the tokenizers into .cache/ once)
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

### Custom domain: tinker.kondasamy.com

- **Cloudflare Pages:** project → **Custom domains** → add `tinker.kondasamy.com`. With kondasamy.com's DNS on Cloudflare, the CNAME is created for you; otherwise add a CNAME `tinker` → `<project>.pages.dev`.
- **Vercel:** project → **Settings → Domains** → add `tinker.kondasamy.com`, then a CNAME `tinker` → `cname.vercel-dns.com` at your DNS provider.
- `astro.config.mjs` sets `site` to this address (canonical URLs). Change it there if the domain changes.
- The site used to live at `explain.kondasamy.com`. Keep that hostname attached and redirect it (301, path kept) to `https://tinker.kondasamy.com`, so links already shared keep working.
- Optional: on whatever serves kondasamy.com, redirect a short path (for example `/tinker`) to `https://tinker.kondasamy.com/`.

### After deploying

1. Open the home page, then the RAG module at `/rag/`, and confirm chapter 1 loads.
2. Open `/data/index/manifest.json` and confirm it returns JSON. This proves the data files are served.
3. Go through chapters 3–7 once. The canvas should show answers, not stay on "Preparing…".

No monitoring is needed, because there is no backend.

---

## Requests and feedback

This repository is private. Readers ask for new modules or send feedback through the form at the bottom of the home page ([tinker.kondasamy.com/#request](https://tinker.kondasamy.com/#request)); it is mailed to the author through FormSubmit.

To build a module, see [CONTRIBUTING.md](CONTRIBUTING.md) (setup, checks, the PR flow, credit) and [docs/writing-a-module.md](docs/writing-a-module.md) (the house style). `pnpm new-module <id> "<Title>"` scaffolds a module, and `pnpm test` lists what it still needs.

---

## Credits

The illustrations are drawn with [Colorfigures](https://april-zhu.com/colorfigures) by [April Zhu](https://april-zhu.com/): the hand-inked isometric style and the drawing engine in `src/lib/iso/core.js` come from it, adapted for Tinker. Colorfigures builds on April's [ISO-GLOW](https://isoglow.dev), which builds on [iso-figure](https://github.com/MrBongoC/ai-iso-skill) by Tolga Cohce. All MIT licensed (see `src/lib/iso/LICENSE`).

The tokenizer in `src/lib/lm/` follows the byte-level BPE algorithm of Andrej Karpathy's [minbpe](https://github.com/karpathy/minbpe) (MIT). Larkspur mini, the tiny model in `scripts/train/` and `src/lib/lm/model.ts`, is shaped after his [nanoGPT](https://github.com/karpathy/nanoGPT) (MIT).

