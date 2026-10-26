"""Mixture of experts' model (KTD3 of the last-seven-modules plan): Larkspur mini's shape with each MLP replaced by
8 experts of width 32, two run per token, trained once from scratch (never from model.bin).

Reads data/lm/ids.json (the training and held-out splits, the five golden prompts, and `diffusionLlms.pieces`, each
token's bytes, for text; Python never tokenizes) and writes
  public/data/mixture-of-experts/moe.bin     Float16 little-endian weights, tensor layout in meta.json
  public/data/mixture-of-experts/meta.json   config, layout, training settings, loss curve, held-out scores, per-layer
                                             per-expert route shares, each expert's top tokens, the active-matched
                                             dense model's scores, the bar, goldens (logits and routes)

Each block is train.py's Block with its MLP swapped for a router (Linear d_model -> 8, no bias, reading ln2's output)
and 8 tanh-GELU MLPs. Per position the two highest router logits win (ties to the lower index); their outputs add up
weighted by a softmax over those two logits. Training adds Switch's load-balancing loss (Fedus et al. 2021):
coef * E * sum_e f_e * P_e per layer, f_e the share of the batch's top-2 assignments that went to expert e, P_e its
mean router probability. Training split, steps, batch, lr, weight decay and dropout are train.py's.

The active-matched dense model (train.py's Mini with d_mlp 64: per token it runs as many MLP weights as two experts)
is trained the same way and scored, never shipped. Every score and golden is computed in float64 from the weights
rounded to Float16 (what ships). It writes only when the bar holds (the plan's stop condition): every expert's held-out
route share at least 3% in each layer, held-out top-5 within 5 points of the base model's and at least the dense
model's, moe.bin within 150,000 bytes.

Run (seeded and deterministic, a rerun gives a byte-identical moe.bin):
  uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train_moe.py
"""
import argparse
import hashlib
import json
import math
import os
import time

import torch
import torch.nn as nn
import torch.nn.functional as F

from train import CFG as LM_CFG, Block, Mini, evaluate, f16_blob, windows

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CFG = dict(LM_CFG, d_mlp=32, experts=8, top_k=2)
DENSE = dict(LM_CFG, d_mlp=64)  # active-matched: two experts' worth of MLP per token
BAR = dict(min_share=0.03, base_gap=0.05, max_bytes=150_000)


def choose(logits, k):
    """Top k router logits per position, ties to the lower index (as model.ts sorts), and their softmax weights."""
    idx = logits.sort(dim=-1, descending=True, stable=True).indices[..., :k]
    return idx, logits.gather(-1, idx).softmax(dim=-1)


class MoEBlock(Block):
    def __init__(self, d, n_head, d_mlp, dropout, eps, experts, top_k):
        super().__init__(d, n_head, d_mlp, dropout, eps)
        self.k = top_k
        self.mlp = nn.ModuleDict(dict(
            router=nn.Linear(d, experts, bias=False),
            experts=nn.ModuleList(nn.ModuleDict(dict(fc=nn.Linear(d, d_mlp), proj=nn.Linear(d_mlp, d)))
                                  for _ in range(experts))))

    def forward(self, x):
        B, T, D = x.shape
        H, hd = self.n_head, D // self.n_head
        q, k, v = self.attn['qkv'](self.ln1(x)).split(D, dim=2)
        q, k, v = (t.view(B, T, H, hd).transpose(1, 2) for t in (q, k, v))
        att = (q @ k.transpose(-2, -1)) / math.sqrt(hd)
        mask = torch.ones(T, T, dtype=torch.bool).tril()
        att = att.masked_fill(~mask, float('-inf')).softmax(dim=-1)
        y = (self.drop(att) @ v).transpose(1, 2).reshape(B, T, D)
        x = x + self.drop(self.attn['proj'](y))
        n = self.ln2(x)
        logits = self.mlp['router'](n)
        idx, w = choose(logits, self.k)
        # shortcut: every expert runs on every token and the gate zeroes the unchosen; fine at this size
        outs = torch.stack([e['proj'](F.gelu(e['fc'](n), approximate='tanh')) for e in self.mlp['experts']], dim=-2)
        gate = torch.zeros_like(logits).scatter(-1, idx, w)
        x = x + self.drop((gate.unsqueeze(-1) * outs).sum(dim=-2))
        probs = logits.softmax(dim=-1)
        E = logits.shape[-1]
        f = F.one_hot(idx, E).sum(dim=-2).reshape(-1, E).float().mean(0) / self.k  # share of assignments
        self.aux = E * (f.to(probs.dtype) * probs.reshape(-1, E).mean(0)).sum()  # Switch's balance loss, 1 when even
        self.routes = (idx, w)
        return x, att


def moe(vocab, dropout=0.0, cfg=CFG):
    """train.py's Mini (same names, order and initialisation) with experts blocks."""
    model = Mini(vocab, dropout, dict(cfg, n_layer=0))
    model.h = nn.ModuleList(MoEBlock(cfg['d_model'], cfg['n_head'], cfg['d_mlp'], dropout, cfg['ln_eps'],
                                     cfg['experts'], cfg['top_k']) for _ in range(cfg['n_layer']))
    for name, p in model.h.named_parameters():
        if name.endswith('weight') and p.dim() == 2:
            nn.init.normal_(p, std=0.02)
        elif name.endswith('bias'):
            nn.init.zeros_(p)
    return model


def train(a, model, vocab, docs, held, coef):
    """train.py's pretrain() loop, plus the balance loss summed over the experts layers."""
    ctx = CFG['ctx']
    starts = torch.tensor([(d, s) for d, doc in enumerate(docs) for s in range(len(doc) - ctx)])
    train_t = [torch.tensor(doc) for doc in docs]
    decay = [p for p in model.parameters() if p.dim() == 2]
    other = [p for p in model.parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([dict(params=decay, weight_decay=a.weight_decay), dict(params=other, weight_decay=0.0)],
                            lr=a.lr, betas=(0.9, 0.99))
    gen = torch.Generator().manual_seed(a.seed)
    curve, t0, train_loss = [], time.time(), float('nan')
    for step in range(1, a.steps + 1):
        for g in opt.param_groups:
            g['lr'] = a.lr * 0.5 * (1 + math.cos(math.pi * (step - 1) / a.steps))
        pick = starts[torch.randint(len(starts), (a.batch,), generator=gen)]
        xy = torch.stack([train_t[d][s:s + ctx + 1] for d, s in pick.tolist()])
        model.train()
        ce = F.cross_entropy(model(xy[:, :-1])[0].reshape(-1, vocab), xy[:, 1:].reshape(-1))
        aux = sum(b.aux for b in model.h) if isinstance(model.h[0], MoEBlock) else torch.zeros(())
        loss = ce + coef * aux
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        train_loss = 0.9 * train_loss + 0.1 * ce.item() if step > 1 else ce.item()
        if step % a.every == 0 or step == a.steps:
            ev = evaluate(model, held)
            curve.append(dict(step=step, train=round(train_loss, 4), heldout=round(ev['loss'], 4),
                              balance=round(aux.item(), 4)))
            print(f"step {step:5d} train {train_loss:.3f} balance {aux.item():.3f} heldout {ev['loss']:.3f} "
                  f"top5 {ev['top5']:.3f}")
    return model, curve, time.time() - t0


def to64(ship, make):
    m64 = make().double()
    m64.load_state_dict({k: v.to(torch.float64) for k, v in ship.items()})
    return m64.eval()


@torch.no_grad()
def route_stats(m64, docs, vocab):
    """Per layer: each expert's share of top-k assignments, and per token id, how often it went to each expert."""
    E, L = CFG['experts'], CFG['n_layer']
    counts = torch.zeros(L, E, dtype=torch.long)
    by_tok = torch.zeros(L, E, vocab, dtype=torch.long)
    seen = torch.zeros(vocab, dtype=torch.long)
    for doc in docs:
        for w in windows(doc, CFG['ctx']):
            x = torch.tensor([w[:-1]])
            m64(x)
            seen.index_add_(0, x[0], torch.ones(len(x[0]), dtype=torch.long))
            for l, b in enumerate(m64.h):
                idx = b.routes[0][0]  # [T, k]
                counts[l] += F.one_hot(idx, E).sum(dim=(0, 1))
                for j in range(idx.shape[1]):
                    by_tok[l].index_put_((idx[:, j], x[0]), torch.ones(len(x[0]), dtype=torch.long), accumulate=True)
    return counts / counts.sum(-1, keepdim=True), by_tok, seen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, default=1337)
    ap.add_argument('--steps', type=int, default=3000)
    ap.add_argument('--batch', type=int, default=32)
    ap.add_argument('--lr', type=float, default=3e-3)
    ap.add_argument('--weight-decay', type=float, default=1.0)
    ap.add_argument('--dropout', type=float, default=0.1)
    ap.add_argument('--balance', type=float, default=0.01, help="Switch's load-balancing coefficient")
    ap.add_argument('--every', type=int, default=100, help='loss-curve sampling interval')
    ap.add_argument('--no-write', action='store_true', help='train and report only (for trying settings)')
    a = ap.parse_args()

    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)

    data = json.load(open(os.path.join(ROOT, 'data/lm/ids.json')))
    vocab, train_s, held, pieces = data['vocab'], data['splits']['train'], data['splits']['heldout'], data['diffusionLlms']['pieces']
    base = json.load(open(os.path.join(ROOT, 'public/data/lm/meta.json')))['heldout']
    r = lambda x: round(x, 6)
    scores = lambda e: dict(loss=r(e['loss']), top1=r(e['top1']), top5=r(e['top5']))

    print('-- experts')
    torch.manual_seed(a.seed)
    model, curve, secs = train(a, moe(vocab, a.dropout), vocab, train_s['ids'], held['ids'], a.balance)
    print('-- active-matched dense')
    torch.manual_seed(a.seed)
    dense, dense_curve, dense_secs = train(a, Mini(vocab, a.dropout, DENSE), vocab, train_s['ids'], held['ids'], 0.0)

    # What ships: Float16. Everything below is computed in float64 from those rounded weights.
    ship = {k: v.to(torch.float16) for k, v in model.state_dict().items()}
    m64 = to64(ship, lambda: moe(vocab))
    final, train_eval = evaluate(m64, held['ids']), evaluate(m64, train_s['ids'])
    d64 = to64({k: v.to(torch.float16) for k, v in dense.state_dict().items()}, lambda: Mini(vocab, cfg=DENSE))
    dense_final = evaluate(d64, held['ids'])
    shares, _, _ = route_stats(m64, held['ids'], vocab)
    _, by_tok, seen = route_stats(m64, train_s['ids'], vocab)

    layout, blob = f16_blob(ship)
    params = sum(t.numel() for t in ship.values())
    per_expert = sum(t.numel() for k, t in ship.items() if '.experts.0.' in k) // CFG['n_layer']
    active = params - CFG['n_layer'] * (CFG['experts'] - CFG['top_k']) * per_expert
    dense_params = sum(p.numel() for p in dense.parameters())
    bars = dict(shares=bool((shares >= BAR['min_share']).all()), base=final['top5'] >= base['top5'] - BAR['base_gap'],
                dense=final['top5'] >= dense_final['top5'], size=len(blob) <= BAR['max_bytes'])
    print(f"experts: {params} params ({active} active), {len(blob)} bytes, held-out loss {final['loss']:.4f} "
          f"top1 {final['top1']:.3f} top5 {final['top5']:.3f}; {secs:.1f}s")
    print(f"dense d_mlp 64: {dense_params} params, held-out loss {dense_final['loss']:.4f} top5 {dense_final['top5']:.3f}; "
          f"{dense_secs:.1f}s; base top5 {base['top5']:.3f}")
    for l in range(CFG['n_layer']):
        print(f"layer {l} route shares: {[round(v, 3) for v in shares[l].tolist()]}")
    print(f'moe.bin sha256 {hashlib.sha256(blob).hexdigest()}')
    print(f'bars: {bars}')
    if a.no_write:
        return
    assert all(bars.values()), 'stop: a bar was missed (KTD3)'

    text = lambda i: bytes(pieces[i]).decode('utf-8', errors='replace')
    top_tokens = []
    for l in range(CFG['n_layer']):
        layer = []
        for e in range(CFG['experts']):
            c = by_tok[l, e]
            order = sorted(range(len(c)), key=lambda i: (-c[i].item(), i))[:5]
            layer.append([dict(id=i, piece=text(i), routed=c[i].item(), share=r(c[i].item() / seen[i].item()))
                          for i in order])
        top_tokens.append(layer)

    goldens = []
    with torch.no_grad():
        for p in data['prompts']:
            ids = p['ids'][-CFG['ctx']:]
            logits = m64(torch.tensor([ids]))[0][0, -1]
            goldens.append(dict(
                text=p['text'], ids=ids, truncated=len(p['ids']) > CFG['ctx'], top5=logits.topk(5).indices.tolist(),
                logits=[round(v, 7) for v in logits.tolist()],
                routes=[dict(experts=b.routes[0][0].tolist(), weights=[[round(v, 7) for v in w] for w in b.routes[1][0].tolist()])
                        for b in m64.h]))

    out = os.path.join(ROOT, 'public/data/mixture-of-experts')
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'moe.bin'), 'wb').write(blob)
    settings = dict(seed=a.seed, steps=a.steps, batch=a.batch, lr=a.lr, schedule='cosine to 0',
                    optimizer='AdamW betas (0.9, 0.99), grad clip 1.0', weight_decay=a.weight_decay, dropout=a.dropout)
    meta = dict(
        model=dict(vocab=vocab, **CFG, params=params), active=active, dtype='float16-le', bytes=len(blob), tensors=layout,
        training=dict(**settings, balance=a.balance,
                      balanceLoss='coef * experts * sum_e f_e * P_e per layer (Switch), f_e share of top-k assignments',
                      start='random init, never model.bin', torch=torch.__version__, seconds=round(secs, 1),
                      trainTokens=sum(len(d) for d in train_s['ids'])),
        lossCurve=curve,
        heldout=dict(tokens=final['tokens'], **scores(final)),
        trainEval=scores(train_eval),
        routeShares=dict(split='heldout', how='share of top-k assignments per layer', layers=[[r(v) for v in row] for row in shares.tolist()]),
        topTokens=dict(split='train', how="the five token ids routed to each expert most often (count, and share of the token's occurrences)", layers=top_tokens),
        dense=dict(model=dict(vocab=vocab, **DENSE, params=dense_params), shipped=False, training=settings,
                   seconds=round(dense_secs, 1), lossCurve=dense_curve, heldout=scores(dense_final)),
        base=dict(heldout=dict(top5=base['top5'], loss=base['loss'])),
        bar=dict(**BAR, met=bars),
        goldens=goldens,
    )
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), indent=1)
    print(f'wrote moe.bin ({len(blob)} bytes) and meta.json')


if __name__ == '__main__':
    main()
