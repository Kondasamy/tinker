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

**After a base retrain, rerun with `--finetune` (below).** The base run rewrites `meta.json` and `goldens.json` without the `finetune` / `lora` keys, and `finetuned.bin` and `lora.bin` were trained on the old base, so they go stale. The Fine-tuning tests fail until you do.

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

The model is shaped after Andrej Karpathy's [nanoGPT](https://github.com/karpathy/nanoGPT) (MIT).
