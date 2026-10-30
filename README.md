# Tinker

> See how tech works by playing with it. Hand-drawn, interactive explanations of how tech works, AI and classic, by [Samy (Kondasamy Jayaraman)](https://kondasamy.com). Home: **https://tinker.kondasamy.com**.

Each module is a short story you play through: the picture on the left is live, the story on the right asks you to do one thing at a time in it, and you watch what changes. Build the thing, break it, fix it.

![Tinker home: the workshop, where each module takes a turn on the stand](docs/images/home.png)

## Modules

Every module has an intro at `/<module>/`, its chapters, and a recap at `/<module>/recap/`. They run from beginner to advanced, across AI (RAG, agents, transformers, evals…) and classic tech (caching, Git, payments, queues…). Module 0, Before GenAI, comes first: the bots that came before GenAI, what changed, and what didn't.

The catalogue lives on the [home page](https://tinker.kondasamy.com/#modules); its source of truth is the registry, `src/lib/modules.ts`. Planned modules show there as roadmap cards, and readers propose new ones through the form at the bottom of the home page.

![A RAG chapter: the live pipeline on the left, the story on the right](docs/images/chapter.png)

## How it's built

- **Static site:** Astro with React islands. No backend, no API key, no live model; it runs on any static host, and a chapter keeps working offline once its data has loaded.
- **Real maths, recorded models:** whatever can run in the browser does (retrieval, validators, simulators, graders, a tiny trained model); whatever needs a real model is recorded ahead of time and labelled as such. Each module's engine and data are described in `docs/modules/<module>.md`.
- **Pictures:** hand-inked isometric scenes drawn with the Colorfigures engine (see Credits), one per module in `src/components/scenes/`, with flat figures (`src/lib/iso/flat.ts`) a tab away. Names sit in label pills.
- **Story:** every chapter is a list of steps run by one step runner (`src/components/story/`): narration, the one control it needs, a check that advances it, hints, and “Show me” for puzzles. Progress is saved in the browser, per module.
- **Making it stick:** predict before a reveal, quizzes that explain every option, a recap of recall questions, and a short warm-up when you come back. Nothing leaves the browser.
- **Search and sharing:** every page has its own title, description, canonical URL, structured data and 1200×630 share image.
- **Tests:** Vitest for the engines and story logic; Playwright plays every chapter and checks accessibility (axe), keyboard play, reduced motion, phone size and offline use.

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

