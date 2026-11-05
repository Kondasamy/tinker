# Working on Tinker

Tinker is a set of hand-drawn, playable explanations of tech concepts. Each **module** is one concept told as a short story the reader plays through. Module requests and bugs go in [issues](https://github.com/Kondasamy/tinker/issues/new/choose) (each has a template), or through the form on the home page (`#request`). Security reports go privately, per [SECURITY.md](SECURITY.md). Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md).

Before you change anything, read [AGENTS.md](AGENTS.md). It records the decisions behind the site (layout, story rules, pictures, share images, tooling). Each decision was made on purpose; change one only on purpose, and say so in your PR.

Comments and `docs/modules/` sometimes cite a decision as `KTD3` of a named plan. Those plans are in git history, not the tree: `git log --all -- docs/plans/` finds them.

---

## Planning a module

Before writing chapters, settle:

- the concept, and who it is for;
- its **level**: Beginner, Intermediate or Advanced (see the guide for what each means);
- the one story the module tells (one fictional company or situation, start to finish);
- a rough chapter list, and the one thing the reader does in each chapter;
- where its facts come from (sources you can cite).

Agreeing on these first saves you from writing chapters that need to be redone.

## Set up

**Requires** Node.js 22.22 or newer (pinned in `.node-version`) and pnpm 11 (`corepack enable` installs the pinned version).

```bash
pnpm install
pnpm dev                                # http://localhost:4321
pnpm exec playwright install chromium   # once, for the e2e tests
```

## Start a module

```bash
pnpm new-module <id> "<Title>"          # for example: pnpm new-module tokens "Tokens & embeddings"
```

This copies `templates/module/` into place: a registry entry, an intro page, a chapter route, a recap page, one example chapter (`01-first-step.tsx`) with a three-item recall bank, a `data/<id>/facts.json` with sources, a kit with the cited `Fact` and a `ToyNote`, the fact lookup in `src/lib/<id>/facts.ts`, a `docs/modules/<id>.md` with its Toy vs real table, and an e2e spec. It also adds the module to `MODULES` in `src/lib/modules.ts`, after the last live module, and removes its planned card if it has one, so live modules keep their numbers; its pages and share-image ids follow from that entry. It refuses an id that is not kebab-case or that already exists, and writes nothing then. Then run `pnpm test`; the registry check lists what your module still needs before it can go live (at first, its share images: run `pnpm og`).

## Checks before you open a PR

```bash
pnpm check       # types: 0 errors, 0 warnings
pnpm lint        # Biome lint + format: 0 diagnostics (pnpm format fixes)
pnpm test        # unit tests, including the module registry checks
pnpm test:e2e    # every chapter played through, axe, keyboard only, reduced motion, phone, offline, share images
pnpm og          # only if you changed a page's text, a chapter list or a share picture; commit the JPEGs
```

CI runs the same checks on every pull request (`pnpm og` excepted; commit its JPEGs yourself). A first-time contributor's run may wait for a maintainer's approval. Also open the pages you changed at desktop width and at 390px wide, and look at them; tests do not catch everything.

**A live module must have:** a level, an author, at least one chapter, an intro page, a recap page, a recall bank covering every chapter with exactly one pinned item, a share image for every page, and an e2e spec. The registry check (`tests/unit/registry.test.ts`) fails with a message naming anything missing.

## Pull requests

- Work on a branch and open the PR against `main`.
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, one logical change each.
- Fill in the PR template checklist.
- Never rename an existing chapter id or module id. Readers' saved progress is keyed by them.

## Credit

- The pictures use **Colorfigures by April Zhu** (MIT). The credit lives in the home footer and the README only; keep `src/lib/iso/LICENSE`.
- Module authors are credited by name on their module card and intro page (the `author` field in the module's registry entry).

## License

Content you add must be yours to give, or properly licensed and credited.
