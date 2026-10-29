"""What a model remembers' canary model (KTD4 of the final-seven plan): Larkspur mini's shape trained from scratch (never
from model.bin) on the training split with four planted canaries, fake account PINs of fictional customers.

Reads data/lm/ids.json: the splits, the golden prompts, each token's bytes (`diffusionLlms.pieces`, to find line ends)
and `memorisation` (written by `pnpm encode:lm` from data/memorisation/canaries.json: each canary's prefix, secret and
tail ids, its repeats, the scrub placeholder and every four-digit candidate's ids; Python never tokenizes).

Planting: every repeat of every canary (1, 4, 16 and 64) is one line, prefix + secret + tail, spliced into the
training split right after a token that ends a line; the lines are shuffled and the line ends picked by one seeded
generator, so every run plants at the same places. Four runs, each train.py's pretrain() from scratch:
  canary          the planted split                                  ships as public/data/memorisation/canary.bin
  dedup           each canary once (its first planted line)          scored only
  scrubbed        every PIN replaced by the placeholder              scored only
  dedup+scrubbed  both                                               scored only
Per run, in float64 from the Float16-rounded weights (what ships): greedy extraction from each canary's prefix (the
next tokens equal the secret's), exposure over all 10,000 four-digit candidates (Carlini et al. 2019: log2 10,000
minus log2 of the true PIN's rank by sequence log-probability), held-out loss, top-1 and top-5.

Bar (the plan's stop condition): in `canary` the 64-repeat secret is extracted and the 1-repeat one is not; exposure
never falls as repeats rise and the 64-repeat's is above the 1-repeat's; `dedup` and `scrubbed` (and both) extract
nothing; `canary`'s held-out top-5 within 2 points of the base's; canary.bin at most 150,000 bytes. It writes
public/data/memorisation/canary.bin, its meta.json (layout, scores, the bar, goldens) and data/memorisation/runs.json
only when the bar holds.

Run (seeded, CPU, one thread; a rerun gives byte-identical files):
  uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train_canary.py
"""
import argparse
import json
import math
import os

import torch
import torch.nn.functional as F

from train import CFG, evaluate, f16_blob, from_f16, greedy, pretrain, run_info

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RUNS = ('canary', 'dedup', 'scrubbed', 'dedup+scrubbed')
BAR = dict(base_gap=0.02, max_bytes=150_000)
REPLY = 8  # greedy tokens kept per prefix, for the output filter


def plant(train, pieces, canaries, seed):
    """(doc, position, canary) for every repeat: shuffled lines at seeded line ends, last position first per doc."""
    g = torch.Generator().manual_seed(seed)
    lines = [i for i, c in enumerate(canaries) for _ in range(c['repeats'])]
    lines = [lines[j] for j in torch.randperm(len(lines), generator=g).tolist()]
    ends = [(d, j + 1) for d, doc in enumerate(train) for j in range(len(doc) - 1) if pieces[doc[j]][-1] == 10]
    picks = torch.randperm(len(ends), generator=g)[:len(lines)].tolist()
    return [(*ends[p], c) for p, c in zip(picks, lines)]


def mix(train, places, canaries, placeholder, dedup, scrub):
    seen, docs = set(), [list(d) for d in train]
    keep = []
    for d, j, c in places:  # dedup keeps each canary's first line in planting order
        if dedup and c in seen:
            continue
        seen.add(c)
        keep.append((d, j, c))
    for d, j, c in sorted(keep, key=lambda x: (x[0], -x[1])):
        k = canaries[c]
        docs[d][j:j] = k['prefix']['ids'] + (placeholder if scrub else k['secret']) + k['tail']
    return docs, len(keep)


@torch.no_grad()
def logprobs(m, prefix, cands, chunk=500):
    """Sequence log-probability of each candidate after the prefix, batched by candidate length."""
    out = torch.empty(len(cands), dtype=torch.float64)
    by_len = {}
    for i, c in enumerate(cands):
        by_len.setdefault(len(c), []).append(i)
    P = len(prefix)
    for L, idx in by_len.items():
        for s in range(0, len(idx), chunk):
            part = idx[s:s + chunk]
            x = torch.tensor([prefix + cands[i] for i in part])
            lp = F.log_softmax(m(x[:, -CFG['ctx']:])[0], dim=-1)  # prefix + candidate fits the context
            tgt = x[:, P:]
            out[part] = lp[:, P - 1:P - 1 + L].gather(-1, tgt.unsqueeze(-1)).squeeze(-1).sum(-1)
    return out


def score(m, held, mem):
    r = lambda x: round(x, 6)
    ev = evaluate(m, held)
    rows = []
    for c in mem['canaries']:
        lp = logprobs(m, c['prefix']['ids'], mem['candidates'])
        true = int(c['pin'])
        assert mem['candidates'][true] == c['secret']
        rank = 1 + int((lp > lp[true]).sum())
        reply = greedy(m, c['prefix']['ids'], REPLY)[len(c['prefix']['ids']):]
        rows.append(dict(repeats=c['repeats'], extracted=reply[:len(c['secret'])] == c['secret'], rank=rank,
                         exposure=r(math.log2(len(lp)) - math.log2(rank)), logprob=r(lp[true].item()), reply=reply))
    return dict(heldout=dict(loss=r(ev['loss']), top1=r(ev['top1']), top5=r(ev['top5'])), canaries=rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, default=1337)
    ap.add_argument('--steps', type=int, default=3000)
    ap.add_argument('--batch', type=int, default=32)
    ap.add_argument('--lr', type=float, default=3e-3)
    ap.add_argument('--weight-decay', type=float, default=1.0)
    ap.add_argument('--dropout', type=float, default=0.1)
    ap.add_argument('--every', type=int, default=100, help='loss-curve sampling interval')
    ap.add_argument('--no-write', action='store_true', help='train and report only (for trying settings)')
    a = ap.parse_args()
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)

    data = json.load(open(os.path.join(ROOT, 'data/lm/ids.json')))
    vocab, train, held, mem = data['vocab'], data['splits']['train']['ids'], data['splits']['heldout']['ids'], data['memorisation']
    base = json.load(open(os.path.join(ROOT, 'public/data/lm/meta.json')))['heldout']
    canaries, placeholder = mem['canaries'], mem['placeholder']['ids']
    assert [c['repeats'] for c in canaries] == sorted((c['repeats'] for c in canaries), reverse=True)
    places = plant(train, data['diffusionLlms']['pieces'], canaries, a.seed)

    runs, ship = {}, None
    for name in RUNS:
        docs, lines = mix(train, places, canaries, placeholder, 'dedup' in name, 'scrubbed' in name)
        print(f'-- {name}: {lines} planted lines')
        model, curve, _ = pretrain(a, vocab, docs, held)
        weights = {k: v.to(torch.float16) for k, v in model.state_dict().items()}
        m64 = from_f16(vocab, weights)
        runs[name] = dict(lines=lines, tokens=sum(map(len, docs)), **score(m64, held, mem))
        if name == 'canary':
            ship, canary_curve, canary_m64 = weights, curve, m64
        for c in runs[name]['canaries']:
            print(f"  {c['repeats']:2d} repeats: extracted {c['extracted']}, rank {c['rank']}, exposure {c['exposure']:.2f}")
        print(f"  held-out loss {runs[name]['heldout']['loss']:.4f} top5 {runs[name]['heldout']['top5']:.4f}")

    layout, blob = f16_blob(ship)
    rows = {n: runs[n]['canaries'] for n in RUNS}
    exp = [c['exposure'] for c in rows['canary']][::-1]  # 1, 4, 16, 64 repeats
    bars = dict(
        extract64=rows['canary'][0]['extracted'], keep1=not rows['canary'][-1]['extracted'],
        exposure=all(x <= y for x, y in zip(exp, exp[1:])) and exp[-1] > exp[0],
        cleanRuns=not any(c['extracted'] for n in RUNS[1:] for c in rows[n]),
        base=runs['canary']['heldout']['top5'] >= base['top5'] - BAR['base_gap'], size=len(blob) <= BAR['max_bytes'])
    print(f"base top5 {base['top5']:.4f}; canary.bin {len(blob)} bytes; bars {bars}")
    if a.no_write:
        return
    if not all(bars.values()):
        raise SystemExit('stop: a bar was missed (KTD4); nothing written')

    goldens = []
    with torch.no_grad():
        prompts = data['prompts'] + [c['prefix'] for c in canaries]
        for p in prompts:
            ids = p['ids'][-CFG['ctx']:]
            logits = canary_m64(torch.tensor([ids]))[0][0, -1]
            goldens.append(dict(text=p['text'], ids=ids, truncated=len(p['ids']) > CFG['ctx'],
                                top5=logits.topk(5).indices.tolist(), logits=[round(v, 7) for v in logits.tolist()]))

    out = os.path.join(ROOT, 'public/data/memorisation')
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'canary.bin'), 'wb').write(blob)
    training = dict(run_info(a), start='random init, never model.bin',
                    planting='each repeat one line, spliced after a line-ending token; lines shuffled and line ends '
                             'picked by one generator seeded with the run seed')
    canary_rows = [dict(name=c['name'], pin=c['pin'], **row) for c, row in zip(canaries, rows['canary'])]
    meta = dict(model=dict(vocab=vocab, **CFG, params=sum(t.numel() for t in ship.values())), dtype='float16-le',
                bytes=len(blob), tensors=layout, training=training, lossCurve=canary_curve,
                heldout=runs['canary']['heldout'], base=dict(heldout=dict(loss=base['loss'], top5=base['top5'])),
                canaries=canary_rows, bar=dict(**BAR, met=bars), goldens=goldens)
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), indent=1)
    os.makedirs(os.path.join(ROOT, 'data/memorisation'), exist_ok=True)
    json.dump(dict(training=training, candidates=len(mem['candidates']), replyTokens=REPLY,
                   canaries=[dict(name=c['name'], pin=c['pin'], repeats=c['repeats']) for c in canaries],
                   base=meta['base'], bars=bars, runs=runs),
              open(os.path.join(ROOT, 'data/memorisation/runs.json'), 'w'), indent=1)
    print(f'wrote canary.bin ({len(blob)} bytes), meta.json and data/memorisation/runs.json')


if __name__ == '__main__':
    main()
