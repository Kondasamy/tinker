# Diffusion (`/diffusion/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The darkroom** (`src/components/scenes/darkroomScene.ts`): a developing tray holds the current print, its 32×32 pixels shaded in six greys (so noise shows as speckle), or the 2-D dots with the ideal denoiser's training points ringed in tomato; a step dial beside it has a notch per step count and its pointer on the one set (`dialAngle`); a label card stands mustard when a part is asked for, its pill naming the label and the guidance; a red safelight hangs at the back. `DiffusionStage` (`src/content/diffusion/kit.tsx`) puts it one tab from the Strip (`denoiseStrip.ts`: the sample at up to six steps, or several samples side by side, focusable frames read by arrow keys with a read-out line). On phones the pills keep names and the caption carries the numbers.

## Engine (`src/lib/diffusion/`)

- **An exact ideal denoiser for pictures, a learned denoiser for points** (KTD8). `drawings.ts` holds twelve exact 32×32 part drawings (hinge, drill, bracket, four each), filled in plain TypeScript so Node and every browser see the same pixels. `schedule.ts` holds the cosine schedule, forward noising (`noised`) and the DDPM step (`stepTo`) both denoisers share; step counts (`STEPS`) and noise levels (`NOISE`) are finite lists.
- **The ideal denoiser runs live** (`ideal.ts`): the posterior mean over the drawings, about 4 ms for 50 steps. One step gives the blurred average; two or more land on a drawing. Chapter 4's version over 24 training points on the hinge outline (`trainingPoints`) can only copy them.
- **The label is soft on purpose** (`LABEL_PRIOR`, 3), departing from KTD8's "restrict its average to one class": the labelled guess weighs the label's drawings 3× the others. A strict label already lands on the right part, which leaves guidance nothing to teach; chapter 5's copy says the soft label is this site's choice. Classifier-free guidance mixes guesses as u + scale·(c − u) (Ho and Salimans' (1 + w)·c − w·u with scale = 1 + w), over `GUIDANCE` (0, 1, 2, 4); a scale other than 0 or 1 costs two predictions a step (`passes`).
- **Chapter 2 runs on the learned 2-D dots**, not on pictures: the ideal denoiser lands on a drawing at two steps, so pictures can't show roughness. Its roughness is `roughness()` in `points.ts`, the dots' distance to the hinge outline.
- **The learned 2-D denoiser runs live in slices** (`points.ts`, the kit's `useLearnedPoints`): each animation frame moves as many dots one step as fit in 8 ms, so there is no long task; with reduced motion only the end shows. Its weights are the language-model kit's 2-D denoiser (below).
- **Pinned outputs** (KTD12, `data/diffusion/pinned.json`): what each pinned seed draws, and chapter 7's measurements per choice. `tests/unit/diffusion-engine.test.ts` reruns them and fails on drift.
- **Chapter 7's workbench** (`workbench.ts`): steps × guidance per use (thumbnail, catalogue image), each use's roughness bar in `data/diffusion/workbench.json` (the team's choices); a use passes when every test picture (3 parts × 8 seeds) is the right part within its bar; cost is predictions per picture. The puzzle accepts every plan tied for the lowest cost (`WINNERS`, two today).
- **Facts about diffusion** come from `data/diffusion/facts.json` with source and access date.

## Toy vs real

Every count below comes from the toy denoisers (`ToyNote` on every chapter says so): twelve 32 × 32 drawings and a 25,250-weight network on 2-D dots, trained once (KTD5: labelled, never retrained). Step counts, noise levels and guidance scales are finite lists the pinned outputs and `WINNERS` rest on, so only latent diffusion's shrink factor is matched.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | 50 steps to develop; noise levels 0–100%; roughness in the read-out | `score-sde` (the idea), `ddpm` (1,000 steps) | Labelled |
| 2 | 300 dots; 50, 5 and 1 steps; denoiser runs and roughness per run (pinned `ROUGH`) | `ddpm` | Labelled: 1,000 steps a picture in DDPM, shown on the quiz step |
| 2 | DDPM's 1,000 steps (quiz narration) | `ddpm` | Real: `Number(fact('ddpm').value)` |
| 3 | 300 dots, 50 steps, 20,000 training rounds, 25,250 weights (from `meta.json`) | `ddpm-noise` (trained to guess the noise; 35.7 million weights for 32 × 32 photos) | Labelled; the reveal reads the real count from the fact's `value` |
| 4 | 24 training points, 300 dots, dots on a ring and on the outline | `memorise` (over a thousand training images extracted) | Labelled |
| 5 | 8 pictures, 20 steps, scales 0/1/2/4, the label's weight 3 (`LABEL_PRIOR`), predictions a picture | `cfg` (scale = 1 + w; two predictions mixed) | Labelled: the soft label is this site's choice |
| 6 | Sizes 256/512/1024, 50 steps, positions and units of work | `pixel-cost`, `latent`, `consistency`, `flow-matching` | Labelled: work is counted, not timed |
| 6 | Latent shrink factor 8 each way | `latent` | Matched: `F = Number(fact('latent').value)` |
| 7 | Steps × scale per use, bars 0.25 and 0.02, 3 parts × 8 starting noises, predictions per use and in all, `BEST_COST`, the 50-step scale-4 start | `ddim` (same model, fewer steps, 10× to 50× faster) | Labelled: a prediction is one run of the toy denoiser; `WINNERS` recomputed by `diffusion-workbench.test.ts` |
| Intro | Twelve drawings, roughness at 50 steps, % saved on the workbench | `ddpm` (1,000 steps, shown real) | Labelled ("a toy" in the note) |
| Recall | 30 → 3 steps, 512 → 1024, 60 vs 120 predictions | none | Labelled: hypotheticals in the questions |
