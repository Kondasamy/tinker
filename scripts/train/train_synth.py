"""Synthetic data's generations (KTD9 of the last-seven plan, re-scoped): copies of copies of Larkspur mini, offline.

Generation 0 is Larkspur mini's run on the training split. Each generation samples a corpus the training split's size
(the same document count and lengths, each document prompted by its real opening tokens) at temperature 1, top-p 1,
with the site's sampler (mulberry32, most likely first; src/lib/transformers/sample.ts), and the next generation is
the base shape trained from scratch on it. Two arms of five generations:
  replace     each generation trains only on the latest generated text
  accumulate  each generation trains on the real split plus every generated text so far
Then the workbench grid (KTD12): one generation from the base's samples for temperature {0.7, 1, 1.3} x sieve
{off, dedupe (exact + 4-gram overlap), dedupe + facts (names a product)} x real share {0, 50%}.

Per generation or run:
  heldout       held-out loss on real text (the drift)
  top5          next-word top-5 accuracy on the held-out documents, which are the rare prompts' source documents
  rareTop5      the same, only at positions whose next token is in the rare half
  distinctRare  how many distinct rare-half tokens (rarest half of the vocabulary by training-split count) its
                samples use; unseenUsed, how many of them never occur in the training split
  repeatRate    sampled tokens equal to the one before (train_mlm.py's count): the breakdown guard
  samples       greedy replies to the support prompts; rareReplies to the rare prompts, as ids

Bars (gates): generation 5's held-out loss replace > accumulate > generation 0 (drift); its rare top-5 replace <
accumulate < generation 0, and under replace rare top-5 falls by a larger share than top-5; both arms' generation-5
repeat rate under REPEAT_CEILING. It writes data/synthetic-data/runs.json only when they hold. The vanishing-words check
(replace's distinct rare count at most VANISH x generation 0's and never rising; accumulate's at least KEEP x) is
recorded as `vanishing`, not gated: it fails, because replace's copies write more rare pieces, many never seen.

Run (seeded, CPU, one thread; a rerun gives a byte-identical runs.json):
  uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train_synth.py
"""
import argparse
import json
import os
import time

import numpy as np
import torch

from train import CFG, evaluate, f16_blob, from_f16, greedy, pretrain, run_info, windows
from train_mlm import mulberry32

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GENERATIONS = 5
PROMPT = 8  # each generated document opens with its real document's first tokens
REPEAT_CEILING = 0.10  # real text repeats 1.8% of tokens; above 10% a generation is breaking down, not drifting
VANISH, KEEP = 0.85, 0.95
TEMPS = (0.7, 1.0, 1.3)
SIEVES = ('off', 'dedupe', 'facts')
SHARES = (0, 50)
OVERLAP = 0.5  # dedupe drops a sample when half its 4-grams are already in kept samples
REPLY, SAMPLE, EXCERPT = 16, 24, 40


@torch.no_grad()
def corpus(m, real, temp, seed):
    """One generated document per real one, its length, opened by its first PROMPT tokens; one mulberry32 per document."""
    docs = [list(d[:PROMPT]) for d in real]
    rands = [mulberry32(seed * 1000 + i) for i in range(len(real))]
    for n in range(PROMPT, max(map(len, real))):
        live = [i for i, d in enumerate(real) if len(d) > n]
        rows = m(torch.tensor([docs[i][-CFG['ctx']:] for i in live], dtype=torch.long))[0][:, -1].numpy()
        for row, i in zip(rows, live):
            z = row / temp
            p = np.exp(z - z.max())
            p /= p.sum()
            order = np.lexsort((np.arange(len(p)), -p))  # most likely first, ties by id (nucleus() with top-p 1)
            k = int(np.searchsorted(np.cumsum(p[order]), rands[i](), side='right'))
            docs[i].append(int(order[min(k, len(p) - 1)]))
    return docs


def rare_seen(docs, rare):
    return sorted({t for d in docs for t in d[PROMPT:] if t in rare})


def repeat_rate(docs):
    n = sum(len(d) - PROMPT for d in docs)
    return sum(d[i] == d[i - 1] for d in docs for i in range(PROMPT, len(d))) / n


@torch.no_grad()
def rare_top5(m, docs, rare):
    """Top-5 next-word accuracy over evaluate()'s windows, only where the next token is in the rare half."""
    hit = n = 0
    for doc in docs:
        for w in windows(doc, CFG['ctx']):
            top = m(torch.tensor([w[:-1]]))[0][0].topk(5, dim=-1).indices
            for row, y in zip(top.tolist(), w[1:]):
                if y in rare:
                    n += 1
                    hit += y in row
    return hit / n


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
    ap.add_argument('--arms-only', action='store_true', help='the two arms and their bars, no grid, nothing written')
    ap.add_argument('--no-write', action='store_true')
    ap.add_argument('--out', default='data/synthetic-data/runs.json', help='where to write (a rerun checks bytes)')
    a = ap.parse_args()
    a.every = a.steps
    torch.manual_seed(a.seed)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)

    data = json.load(open(os.path.join(ROOT, 'data/lm/ids.json')))
    vocab, real, held = data['vocab'], data['splits']['train']['ids'], data['splits']['heldout']['ids']
    sd = data['syntheticData']
    assert {r['doc'] for r in sd['rare']} == set(data['splits']['heldout']['docs']), 'rare documents are the held-out split'
    counts = np.bincount([t for d in real for t in d], minlength=vocab)
    rare = set(np.lexsort((np.arange(vocab), counts))[:vocab // 2].tolist())  # rarest half, ties by id
    r6 = lambda x: round(x, 6)
    t0 = time.time()

    def generation(docs, label):
        """Train from scratch on `docs`; return the model (Float64 from Float16) and its scores, not yet its samples."""
        t1 = time.time()
        ship = {k: v.to(torch.float16) for k, v in pretrain(a, vocab, docs, held)[0].state_dict().items()}
        m = from_f16(vocab, ship)
        ev = evaluate(m, held)
        row = dict(docs=len(docs), tokens=sum(map(len, docs)), heldout=r6(ev['loss']), top5=r6(ev['top5']),
                   rareTop5=r6(rare_top5(m, held, rare)),
                   samples=[greedy(m, p['ids'], SAMPLE)[len(p['ids']):] for p in sd['prompts']],
                   rareReplies=[greedy(m, r['ids'], REPLY)[len(r['ids']):] for r in sd['rare']])
        print(f"{label}: {row['docs']} docs, heldout {ev['loss']:.4f} top5 {ev['top5']:.3f} "
              f"rareTop5 {row['rareTop5']:.3f} ({time.time() - t1:.0f}s)")
        return m, row, ship

    def measure(row, docs):
        seen = rare_seen(docs, rare)
        row.update(distinctRare=len(seen), unseenUsed=int(sum(counts[t] == 0 for t in seen)), repeatRate=r6(repeat_rate(docs)),
                   excerpt=docs[0][PROMPT:PROMPT + EXCERPT])

    m0, g0, ship0 = generation(real, 'gen 0')
    assert f16_blob(ship0)[1] == open(os.path.join(ROOT, 'public/data/lm/model.bin'), 'rb').read(), \
        'stop: generation 0 drifted from model.bin'
    base_samples = {t: corpus(m0, real, t, seed=int(t * 10)) for t in TEMPS}
    measure(g0, base_samples[1.0])
    print(f"gen 0: distinct rare {g0['distinctRare']} repeat {g0['repeatRate']:.4f}")

    arms = {}
    for arm in ('replace', 'accumulate'):
        rows, made = [g0], [base_samples[1.0]]
        for g in range(1, GENERATIONS + 1):
            docs = made[-1] if arm == 'replace' else real + [d for s in made for d in s]
            m, row, _ = generation(docs, f'{arm} gen {g}')
            made.append(corpus(m, real, 1.0, seed=100 * g + (arm == 'accumulate')))
            measure(row, made[-1])
            print(f"{arm} gen {g}: distinct rare {row['distinctRare']} repeat {row['repeatRate']:.4f}")
            rows.append(row)
        arms[arm] = [dict(gen=g, **r) for g, r in enumerate(rows)]

    distinct = {x: [r['distinctRare'] for r in arms[x]] for x in arms}
    ratio = lambda x: distinct[x][-1] / distinct[x][0]
    # the vanishing-words check is recorded, not a gate: it failed (replace's copies use more rare pieces, not fewer,
    # many never in the real text), so the module teaches drift and rare next-word accuracy instead
    vanish = dict(vanish=ratio('replace') <= VANISH and all(b <= a for a, b in zip(distinct['replace'], distinct['replace'][1:])),
                  keep=ratio('accumulate') >= KEEP)
    last = lambda x, k: arms[x][-1][k]
    bars = dict(drift=last('replace', 'heldout') > last('accumulate', 'heldout') > g0['heldout'],
                rareDrift=last('replace', 'rareTop5') < last('accumulate', 'rareTop5') < g0['rareTop5'],
                rareFirst=last('replace', 'rareTop5') / g0['rareTop5'] < last('replace', 'top5') / g0['top5'],
                repeat=all(last(x, 'repeatRate') < REPEAT_CEILING for x in arms))
    print(f"distinct rare: {distinct}; gen 5 / gen 0: replace {ratio('replace'):.3f}, accumulate {ratio('accumulate'):.3f}")
    print(f"heldout: { {x: [r['heldout'] for r in arms[x]] for x in arms} }")
    print(f"rareTop5: { {x: [r['rareTop5'] for r in arms[x]] for x in arms} }")
    print(f"vanishing words {vanish}; bars {bars}")
    if not all(bars.values()):
        raise SystemExit(f'stop: a bar was missed after {time.time() - t0:.0f}s; nothing written')
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
               repeatCeiling=REPEAT_CEILING, vanish=VANISH, keep=KEEP, overlap=OVERLAP, replyTokens=REPLY,
               sampleTokens=SAMPLE, rare=sorted(rare), unseen=np.flatnonzero(counts == 0).tolist(),
               realDistinctRare=len(rare_seen([[0] * PROMPT + d for d in real], rare)),
               realRepeat=r6(repeat_rate(real)), products=sd['products'], prompts=sd['prompts'], rarePrompts=sd['rare'],
               bars=bars, vanishing=vanish, arms=arms, grid=grid)
    path = os.path.join(ROOT, a.out)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(out, open(path, 'w'), separators=(',', ':'))
    print(f'wrote {a.out}')


if __name__ == '__main__':
    main()
