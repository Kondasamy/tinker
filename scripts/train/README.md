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

The model is shaped after Andrej Karpathy's [nanoGPT](https://github.com/karpathy/nanoGPT) (MIT).
