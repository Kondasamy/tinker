# Visual RAG Playground

> An interactive, visual, story-driven learning playground and simulation engine for Generative AI and Retrieval-Augmented Generation (RAG).

A static Astro + React site. Seven chapters teach RAG with real retrieval math running in the browser over precomputed embeddings. There is no backend, no API key and no live model, so it can be hosted on any static host.

---

## Run locally

**Requires** Node.js 22.22 or newer (the version is pinned in `.node-version`) and pnpm 11 (pinned in `package.json` `packageManager`; `corepack enable` installs the right version).

```bash
pnpm install    # install exact dependency versions from pnpm-lock.yaml
pnpm dev        # start the dev server on http://localhost:4321
```

Open http://localhost:4321 and start at chapter 1. The dev server also serves internal test pages at `/dev/blocks`, `/dev/canvas` and `/dev/runner`. These pages are left out of production builds.

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
pnpm dlx wrangler pages deploy dist --project-name visual-rag-playground
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

### After deploying

1. Open the site and confirm chapter 1 loads.
2. Open `/data/index/manifest.json` and confirm it returns JSON. This proves the data files are served.
3. Go through chapters 3–7 once. The canvas should show answers, not stay on "Preparing…".

No monitoring is needed, because there is no backend.

---

## 📚 Research & Curriculum Specifications

Comprehensive research and architectural blueprints generated via Perplexity Deep Research (`sonar-deep-research`):

1. **[Master Blueprint & Curriculum](research/00_master_blueprint_and_curriculum.md)**
   - Core narrative framework: *"The Amnesiac Detective & The Archive"*
   - The "Martini Glass" learning progression (Linear Story $\rightarrow$ Guided Explorables $\rightarrow$ Debugging Puzzles $\rightarrow$ Open Sandbox)
   - 4-level progressive disclosure (Metaphor $\rightarrow$ System Diagram $\rightarrow$ Algorithmic Operation $\rightarrow$ Mathematical Truth)
   - Dual-engine architecture (Deterministic offline mock engine + live in-browser Transformers.js / WebGPU)

2. **[01. Visual RAG Storytelling & Pedagogy](research/01_visual_rag_storytelling_and_pedagogy.md)**
   - Analysis of best-in-class educational visualizers (*Transformer Explainer*, *CNN Explainer*, *Diffusion Explainer*, Google PAIR)
   - Effective metaphors for GenAI hallucination and external retrieval
   - Scaffolding novices to practitioners through counterfactual experimentation

3. **[02. Simulation Technical Architecture](research/02_simulation_technical_architecture.md)**
   - Browser-based execution patterns: deterministic JSON caches vs client-side ONNX Runtime Web / WebGPU vs BYOK APIs
   - In-browser vector search, high-D float32 math, and 2D/3D projection trade-offs (PCA, UMAP, t-SNE)
   - Decoupled DOM control plane, Canvas/WebGL rendering plane, and Web Worker compute plane
   - State machine, step scrubber, and shareable immutable run manifests

4. **[03. RAG Failure Modes & Interactive Puzzles](research/03_rag_failure_modes_and_interactive_puzzles.md)**
   - Comprehensive 33-point failure taxonomy across ingestion, representation, retrieval, context assembly, and generation
   - Hands-on puzzle designs: *The False Alibi* (chunk boundary mutilation), *The Hidden Needle* (lost-in-the-middle), *The Stale Blueprint* (recency decay & metadata filtering), and *The Poisoned Clue* (adversarial distractors)

5. **[04. Forensic Noir Playground Specification](research/04_noir_forensic_playground_spec.md)**
   - Tailored specification based on interview decisions:
     - **Narrative Theme:** The Amnesiac Detective & The Archive (Forensic Noir)
     - **Target Audience:** Hybrid Intuitive-to-Technical (Novices to Engineers)
     - **Engine Model:** Hybrid (Deterministic Core + Transformers.js Web Worker)
     - **UI Aesthetic:** Evidence Room / Forensic Dossier (Immersive Noir with Corkboard, Red String, Typewriter typography)
