"""Synthetic data's generations (KTD9 of the last-seven plan): copies of copies of Larkspur mini, trained offline.

Generation 0 is Larkspur mini's run on the training split. Each generation samples a corpus the training split's size
(the same document count and lengths, each document prompted by its real opening tokens) at temperature 1, top-p 1,
with the site's sampler (mulberry32, most likely first; src/lib/transformers/sample.ts), and the next generation is
the base shape trained from scratch on it. Two arms of five generations:
  replace     each generation trains only on the latest generated text
  accumulate  each generation trains on the real split plus every generated text so far
Then the workbench grid (KTD12): one generation from the base's samples for temperature {0.7, 1, 1.3} x sieve
{off, dedupe (exact + 4-gram overlap), dedupe + facts (names a product)} x real share {0, 50%}.

Per generation or run: held-out loss on real text, the rare-token share of its samples (tokens from the rarest half of
the vocabulary by training-split count), the repeat rate (sampled tokens equal to the one before, as train_mlm.py
counts it), the rare-request score (greedy replies to ids.json `syntheticData.rare`, graded like keyFactOf in
src/lib/evals/graders.ts) and greedy samples for the support prompts, as ids. No generation weights ship.

It writes data/synthetic-data/runs.json only when the stop bars hold (KTD9): under replace, generation 5's rare-token
share below 0.6 x generation 0's; under accumulate, above 0.8 x; under both, generation 5's repeat rate under
REPEAT_CEILING. Otherwise it prints the numbers and stops.

Run (seeded, CPU, one thread; a rerun gives a byte-identical runs.json):
  uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train_synth.py
"""
import argparse
import json
import os
import time

import numpy as np
import torch

from train import CFG, evaluate, f16_blob, from_f16, greedy, pretrain, run_info
from train_mlm import mulberry32

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GENERATIONS = 5
PROMPT = 8  # each generated document opens with its real document's first tokens
REPEAT_CEILING = 0.10  # real text repeats 1.8% of tokens; above 10% a generation is breaking down, not losing tails
TEMPS = (0.7, 1.0, 1.3)
SIEVES = ('off', 'dedupe', 'facts')
SHARES = (0, 50)
OVERLAP = 0.5  # dedupe drops a sample when half its 4-grams are already in kept samples
REPLY, SAMPLE, EXCERPT = 16, 24, 40


def norm(s):
    """graders.ts norm: lower case, one space, trimmed, no final full stop or bang."""
    s = ' '.join(s.lower().split())
    return s[:-1] if s[-1:] in '.!' else s


class Bigram:
    """The fallback (KTD9): next-token counts over the training text, sampled as counted (no smoothing), so a pair
    no sample repeats is gone for every later generation. Held-out loss adds SMOOTH to every count, or it is infinite."""

    SMOOTH = 0.01

    def __init__(self, docs, vocab):
        self.c = np.zeros((vocab, vocab))
        for d in docs:
            np.add.at(self.c, (d[:-1], d[1:]), 1)
        self.uni = np.log(np.bincount([t for d in docs for t in d], minlength=vocab) + 1e-300)

    def logits(self, contexts):  # a token never followed in training falls back to the unigram counts
        with np.errstate(divide='ignore'):
            return np.stack([np.log(self.c[c[-1]]) if self.c[c[-1]].any() else self.uni for c in contexts])

    def greedy(self, ids, n):
        ids = list(ids)
        for _ in range(n):
            ids.append(int(self.logits([ids])[0].argmax()))
        return ids

    def heldout(self, docs):
        p = (self.c + self.SMOOTH) / (self.c + self.SMOOTH).sum(1, keepdims=True)
        return -np.mean([np.log(p[a, b]) for d in docs for a, b in zip(d[:-1], d[1:])])


def logits_of(m):
    if isinstance(m, Bigram):
        return m.logits
    return lambda cs: m(torch.tensor([c[-CFG['ctx']:] for c in cs], dtype=torch.long))[0][:, -1].numpy()


@torch.no_grad()
def corpus(m, real, temp, seed):
    """One generated document per real one, its length, opened by its first PROMPT tokens; one mulberry32 per document."""
    docs = [list(d[:PROMPT]) for d in real]
    rands = [mulberry32(seed * 1000 + i) for i in range(len(real))]
    step = logits_of(m)
    for n in range(PROMPT, max(map(len, real))):
        live = [i for i, d in enumerate(real) if len(d) > n]
        for row, i in zip(step([docs[i] for i in live]), live):
            z = row / temp
            p = np.exp(z - z.max())
            p /= p.sum()
            order = np.lexsort((np.arange(len(p)), -p))  # most likely first, ties by id (nucleus() with top-p 1)
            k = int(np.searchsorted(np.cumsum(p[order]), rands[i](), side='right'))
            docs[i].append(int(order[min(k, len(p) - 1)]))
    return docs


def tail_share(docs, rare):
    toks = [t for d in docs for t in d[PROMPT:]]
    return sum(t in rare for t in toks) / len(toks)


def repeat_rate(docs):
    n = sum(len(d) - PROMPT for d in docs)
    return sum(d[i] == d[i - 1] for d in docs for i in range(PROMPT, len(d))) / n


def text(ids, pieces):
    return b''.join(bytes(pieces[i]) for i in ids).decode('utf-8', errors='replace')


def reply(m, ids, n):
    return (m.greedy(ids, n) if isinstance(m, Bigram) else greedy(m, ids, n))[len(ids):]


def rare_score(m, rare, pieces):
    replies = [reply(m, r['ids'], REPLY) for r in rare]
    passes = [all(any(norm(p) in norm(text(rep, pieces)) for p in ps) for ps in r['facts'].values())
              for r, rep in zip(rare, replies)]
    return sum(passes) / len(passes), passes, replies


def has(doc, seq):
    return any(doc[i:i + len(seq)] == seq for i in range(len(doc) - len(seq) + 1))


def sieve(docs, kind, products):
    """Dedupe: drop exact copies and samples whose 4-grams are mostly in kept ones; facts: keep those naming a product."""
    if kind == 'off':
        return list(range(len(docs)))
    kept, seen = [], set()
    for i, d in enumerate(docs):
        grams = {tuple(d[j:j + 4]) for j in range(PROMPT, len(d) - 3)}
        if any(docs[k][PROMPT:] == d[PROMPT:] for k in kept) or len(grams & seen) >= OVERLAP * len(grams):
            continue
        if kind == 'facts' and not any(has(d[PROMPT:], p['ids']) for p in products):
            continue
        kept.append(i)
        seen |= grams
    return kept


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, default=1337)
    ap.add_argument('--steps', type=int, default=3000)
    ap.add_argument('--batch', type=int, default=32)
    ap.add_argument('--lr', type=float, default=3e-3)
    ap.add_argument('--weight-decay', type=float, default=1.0)
    ap.add_argument('--dropout', type=float, default=0.1)
    ap.add_argument('--bigram', action='store_true', help='the fallback: bigram-model generations (KTD9)')
    ap.add_argument('--arms-only', action='store_true', help='the spike: the two arms and their bars, no grid')
    ap.add_argument('--no-write', action='store_true')
    a = ap.parse_args()
    a.every = a.steps
    torch.manual_seed(a.seed)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)

    data = json.load(open(os.path.join(ROOT, 'data/lm/ids.json')))
    vocab, real, held = data['vocab'], data['splits']['train']['ids'], data['splits']['heldout']['ids']
    sd, pieces = data['syntheticData'], data['diffusionLlms']['pieces']
    counts = np.bincount([t for d in real for t in d], minlength=vocab)
    rare = set(np.lexsort((np.arange(vocab), counts))[:vocab // 2].tolist())  # rarest half, ties by id
    r6 = lambda x: round(x, 6)
    t0 = time.time()

    def generation(docs, label):
        """Train from scratch on `docs`; return the model (Float64 from Float16) and its scores, not yet its samples."""
        t1, ship = time.time(), None
        if a.bigram:
            m = Bigram(docs, vocab)
            loss = m.heldout(held)
        else:
            model = pretrain(a, vocab, docs, held)[0]
            ship = {k: v.to(torch.float16) for k, v in model.state_dict().items()}
            m = from_f16(vocab, ship)
            loss = evaluate(m, held)['loss']
        score, passes, replies = rare_score(m, sd['rare'], pieces)
        row = dict(docs=len(docs), tokens=sum(map(len, docs)), heldout=r6(loss),
                   rareScore=r6(score), rarePasses=passes, rareReplies=replies,
                   samples=[reply(m, p['ids'], SAMPLE) for p in sd['prompts']])
        print(f"{label}: {row['docs']} docs, heldout {loss:.4f}, rare-request {score:.3f} ({time.time() - t1:.0f}s)")
        return m, row, ship

    def measure(row, docs):
        row.update(tailShare=r6(tail_share(docs, rare)), repeatRate=r6(repeat_rate(docs)),
                   excerpt=docs[0][PROMPT:PROMPT + EXCERPT])

    m0, g0, ship0 = generation(real, 'gen 0')
    same = a.bigram or f16_blob(ship0)[1] == open(os.path.join(ROOT, 'public/data/lm/model.bin'), 'rb').read()
    assert same, 'stop: generation 0 drifted from model.bin'
    base_samples = {t: corpus(m0, real, t, seed=int(t * 10)) for t in TEMPS}
    measure(g0, base_samples[1.0])
    print(f"gen 0: tail {g0['tailShare']:.4f} repeat {g0['repeatRate']:.4f}")

    arms = {}
    for arm in ('replace', 'accumulate'):
        rows, made = [g0], [base_samples[1.0]]
        for g in range(1, GENERATIONS + 1):
            docs = made[-1] if arm == 'replace' else real + [d for s in made for d in s]
            m, row, _ = generation(docs, f'{arm} gen {g}')
            made.append(corpus(m, real, 1.0, seed=100 * g + (arm == 'accumulate')))
            measure(row, made[-1])
            print(f"{arm} gen {g}: tail {row['tailShare']:.4f} repeat {row['repeatRate']:.4f}")
            rows.append(row)
        arms[arm] = [dict(gen=g, **r) for g, r in enumerate(rows)]

    tail = lambda arm: arms[arm][-1]['tailShare'] / g0['tailShare']
    bars = dict(replace=tail('replace') < 0.6, accumulate=tail('accumulate') > 0.8,
                repeat=all(arms[x][-1]['repeatRate'] < REPEAT_CEILING for x in arms))
    print(f"gen 5 / gen 0 tail share: replace {tail('replace'):.3f}, accumulate {tail('accumulate'):.3f}; bars {bars}")
    if not all(bars.values()):
        raise SystemExit(f'stop: a bar was missed (KTD9) after {time.time() - t0:.0f}s; nothing written')
    if a.arms_only:
        return print(f'arms pass; {time.time() - t0:.0f}s')

    grid = []
    for t in TEMPS:
        samples = base_samples[t]
        for kind in SIEVES:
            kept = sieve(samples, kind, sd['products'])
            for share in SHARES:
                if share == 0:
                    docs = [samples[i] for i in kept]
                else:  # a fixed mix: real documents at even places, generated ones (if kept) at odd places
                    docs = [d if i % 2 == 0 else samples[i] for i, d in enumerate(real) if i % 2 == 0 or i in kept]
                m, row, _ = generation(docs, f'grid t {t} sieve {kind} real {share}%')
                measure(row, corpus(m, real, 1.0, seed=7))
                n_real = sum(len(real[i]) for i in range(0, len(real), 2)) if share else 0
                grid.append(dict(temperature=t, sieve=kind, realShare=share, kept=len(kept),
                                 realTokens=r6(n_real / row['tokens']), **row))
    print(f'total {time.time() - t0:.0f}s')
    if a.no_write:
        return
    out = dict(training=dict(run_info(a), every=a.steps), generations=GENERATIONS, prompt=PROMPT,
               repeatCeiling=REPEAT_CEILING, overlap=OVERLAP, replyTokens=REPLY, sampleTokens=SAMPLE,
               rare=sorted(rare), realTail=r6(tail_share(real, rare)), realRepeat=r6(repeat_rate(real)),
               products=sd['products'], prompts=sd['prompts'], rarePrompts=sd['rare'], bars=bars, arms=arms, grid=grid)
    os.makedirs(os.path.join(ROOT, 'data/synthetic-data'), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, 'data/synthetic-data/runs.json'), 'w'), separators=(',', ':'))
    print('wrote data/synthetic-data/runs.json')


if __name__ == '__main__':
    main()
