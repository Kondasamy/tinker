# Training Larkspur mini

`train.py` trains the tiny decoder the language-model modules run in the browser. It is run by hand, once; CI never runs Python. Its outputs are committed:

- `public/data/lm/model.bin`: Float16 little-endian weights;
- `public/data/lm/meta.json`: tensor layout, config, training settings, loss curve, held-out documents and scores;
- `tests/fixtures/lm/goldens.json`: logits and attention for five prompts, and the held-out scores, computed in float64 from the Float16 weights. `tests/unit/lm-model.test.ts` checks the TypeScript forward pass against them.

## Run

Needs [uv](https://docs.astral.sh/uv/). It fetches Python 3.12 and the pinned torch into its own cache; nothing is installed into the system Python.

```bash
pnpm encode:lm   # data/lm/ids.json: token ids from the site's tokenizer (Python never tokenizes)
uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train.py
pnpm test
```

About 30 seconds on one CPU thread. The run is seeded and deterministic: a retrain gives a byte-identical `model.bin` (only `meta.json`'s `seconds` changes).

To try settings without writing anything, add `--no-write` and any of `--steps`, `--lr`, `--weight-decay`, `--dropout`, `--batch`, `--seed`. The defaults are the committed run.

**After a base retrain, rerun with `--finetune`, `--distill`, `--checkpoints` and `--variants` (below).** The base run rewrites `meta.json` and `goldens.json` without the `finetune`, `lora` and `student` keys, and `finetuned.bin`, `lora.bin` and `student.bin` were trained from the old base, so they go stale. The Fine-tuning and student tests fail until you do.

## Fine-tunes (Fine-tuning module)

`--finetune` never retrains the base. It reads the committed `model.bin` and runs two fine-tunes on the style set (`data/lm/style-set.jsonl`, encoded into `ids.json` `styleSet` by `pnpm encode:lm`): every reply signs off "Cheers, the Larkspur team", which the corpus never says.

- **Full:** every weight trains. Writes `public/data/lm/finetuned.bin` (model.bin's layout and size).
- **LoRA:** the base is frozen; rank-4 adapters on each layer's `attn.qkv` and `attn.proj` train (alpha 4, so scale 1). Writes `public/data/lm/lora.bin` (3 KB), laid out in `meta.json` `lora.tensors`.

Each writes its loss curve (style-set loss and held-out loss), held-out and style scores under `meta.json` `finetune` / `lora`, and goldens (the five base prompts plus the five style prompts, and held-out scores) under `goldens.json` `finetuned` / `lora`, all from the Float16-rounded weights. Every other key in both files is written back unchanged.

```bash
pnpm encode:lm   # after editing the style set
uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train.py --finetune
pnpm test        # fine-tuning-runs.test.ts: goldens, the sign-off, forgetting, parameter counts
```

About 3 seconds; seeded and deterministic (byte-identical `.bin` files; only `seconds` changes). Try settings with `--no-write` and `--ft-steps`, `--ft-batch`, `--ft-lr`, `--lora-lr`, `--rank`, `--alpha`, `--ft-dropout`. A base retrain means rerunning `--finetune` too.

## Student (Small models, Inference)

`--distill` never retrains the base either. It reads the committed `model.bin` as the teacher and trains a smaller student on its next-token distribution softened by a temperature (2), plus a small weight (0.1) on the true next token, over the training split (Hinton et al. 2015). The student is 1 layer, 2 heads, d_model 16, d_mlp 64, context 32, the same vocabulary, tied unembedding (16,112 parameters).

- Writes `public/data/lm/student.bin` (Float16, 32 KB; the budget is 40 KB), its config, layout, loss curve, held-out scores and `agreement` (the share of held-out positions where its greedy next token is the base's) under `meta.json` `student`, and goldens (the five base prompts, held-out scores) under `goldens.json` `student`, all from the Float16-rounded weights. Every other key is written back unchanged.
- Agreement must be at least 0.40 (the plan's stop condition). If a retrain misses it, try `--student-layers 2`; never a wider student (the embedding alone breaks the budget).

```bash
uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train.py --distill
pnpm test        # lm-student.test.ts: goldens, size, agreement, the loader, the other weights untouched
```

About 30 seconds; seeded and deterministic (a byte-identical `student.bin`; only `seconds` changes). Try settings with `--no-write` and `--student-layers`, `--kd-steps`, `--kd-lr`, `--kd-weight-decay`, `--temperature`, `--hard`, `--batch`.

## Checkpoints and variant runs (Pre-training)

Neither retrains the base; both rerun its settings and seed, and neither writes `model.bin`, the base `meta.json` or `goldens.json`.

- **`--checkpoints`** reruns the full 3,000-step base run and keeps its Float16 weights at steps 0 (the initial weights), 100, 250, 500, 1000, 1500, 2000 and 3000, copied by a hook inside the training loop (it draws no randomness, so the run is unchanged). It writes `public/data/pre-training/ckpt-<step>.bin` (model.bin's layout, 817 KB in all; the budget is 1 MB) and `public/data/pre-training/meta.json` (layout, steps, settings with the torch version and platform, and each checkpoint's train and held-out scores, computed in float64 from the Float16 weights after the run). The last checkpoint must be `model.bin`, byte for byte; if the rerun drifts, it stops and writes nothing.
- **`--variants`** reruns the base on four data mixes: `clean` (the training split; it must reproduce `model.bin`), `duplicated` (one policy document ten times), `leaked` (Evals' twelve questions with their reference answers added) and `half` (every other training document). It writes `data/pre-training/runs.json`: each run's loss curve (every 50 steps), train, held-out and leaked-question scores, the step of its lowest held-out loss, greedy samples for the pinned prompts (ids; the site decodes them), and `earlyMinimum`, the runs whose held-out loss bottoms out before the last step. No variant weights ship. The duplicated document, the leaked questions and the prompts come from `ids.json` `preTraining`, written by `pnpm encode:lm`.

```bash
pnpm encode:lm   # after editing the corpus, the Evals questions or the prompts
uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train.py --checkpoints
uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train.py --variants
pnpm test        # pre-training-runs.test.ts: the last checkpoint is model.bin, sizes, losses, runs.json
```

About a minute and three minutes; seeded and deterministic (byte-identical files). A base retrain means rerunning both, and updating the sha256 pins in `pre-training-runs.test.ts`.

The model is shaped after Andrej Karpathy's [nanoGPT](https://github.com/karpathy/nanoGPT) (MIT).

## Masked model (Diffusion language models)

`train_mlm.py` is standalone: it trains Larkspur mini's shape (train.py's `Mini`, its blocks attending both ways) with a 769th token, `[MASK]` (id 768), on the training split. Each window gets a mask rate t ~ U(0.001, 1) and the loss is the mean cross-entropy over the masked tokens only. It reads `ids.json` `diffusionLlms.pieces` (each token's bytes, written by `pnpm encode:lm`) to write its pinned held-out phrases as text. It writes `public/data/diffusion-llms/mlm.bin` and `meta.json` and `data/diffusion-llms/prompts.json` only when every bar holds (the plan's stop conditions); otherwise it prints the numbers and stops. The bars: `mlm.bin` within 150,000 bytes; the expected token in the top 5 for at least half the pinned phrases; reply quality (the share of a 16-token reply equal to the same model's careful fill, k = 1 with confidence remasking) lower at k = 16 than at k = 1; random remasking no better than confidence at any k > 1; and the repeat rate (reply tokens equal to the one before) higher at k = 16 than at k = 1 under both rules. `tests/unit/diffusion-llms-model.test.ts` checks the TypeScript pass against its goldens and decodes every pinned reply again.

```bash
pnpm encode:lm   # after editing the corpus
uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train_mlm.py
pnpm test
```

About three and a half minutes; seeded and deterministic (it prints `mlm.bin`'s sha256; a rerun gives a byte-identical `mlm.bin` and `prompts.json`, only `meta.json`'s `seconds` changes). Try settings with `--no-write` and `--d-model` (32, or the fallback 40), `--steps`, `--lr`, `--weight-decay`, `--dropout`, `--weighting` (`inverse` is LLaDA's 1 / t; it stalled at the unigram loss), `--batch`, `--seed`.
