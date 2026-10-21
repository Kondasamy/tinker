"""Larkspur mini: trains the tiny decoder once and writes the files the browser runs (KTD2, KTD3).

Reads data/lm/ids.json (written by scripts/encode-for-training.mjs; Python never tokenizes) and writes
  public/data/lm/model.bin   Float16 little-endian weights, tensor layout in meta.json
  public/data/lm/meta.json   config, layout, training settings, loss curve, held-out docs and scores
  tests/fixtures/lm/goldens.json   logits and attention for the five prompts, plus held-out scores

Every golden and held-out score is computed in float64 from the weights rounded to Float16 (what ships).
The model is nanoGPT-shaped (Andrej Karpathy, MIT): learned positions, pre-LayerNorm blocks, causal
softmax attention, tanh-GELU MLP, unembedding tied to the token embedding.

Run (see scripts/train/README.md):
  uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train.py
"""
import argparse
import json
import math
import os
import time

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CFG = dict(n_layer=2, n_head=2, d_model=32, ctx=32, d_mlp=128, ln_eps=1e-5)


class Block(nn.Module):
    def __init__(self, d, n_head, d_mlp, dropout):
        super().__init__()
        self.n_head = n_head
        self.ln1 = nn.LayerNorm(d, eps=CFG['ln_eps'])
        self.attn = nn.ModuleDict(dict(qkv=nn.Linear(d, 3 * d), proj=nn.Linear(d, d)))
        self.ln2 = nn.LayerNorm(d, eps=CFG['ln_eps'])
        self.mlp = nn.ModuleDict(dict(fc=nn.Linear(d, d_mlp), proj=nn.Linear(d_mlp, d)))
        self.drop = nn.Dropout(dropout)

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
        x = x + self.drop(self.mlp['proj'](F.gelu(self.mlp['fc'](self.ln2(x)), approximate='tanh')))
        return x, att


class Mini(nn.Module):
    def __init__(self, vocab, dropout=0.0):
        super().__init__()
        d = CFG['d_model']
        self.wte = nn.Embedding(vocab, d)
        self.wpe = nn.Embedding(CFG['ctx'], d)
        self.h = nn.ModuleList(Block(d, CFG['n_head'], CFG['d_mlp'], dropout) for _ in range(CFG['n_layer']))
        self.lnf = nn.LayerNorm(d, eps=CFG['ln_eps'])
        self.drop = nn.Dropout(dropout)
        for name, p in self.named_parameters():
            if name.endswith('weight') and p.dim() == 2:
                nn.init.normal_(p, std=0.02)
            elif name.endswith('bias'):
                nn.init.zeros_(p)

    def forward(self, idx):
        T = idx.shape[1]
        x = self.drop(self.wte(idx) + self.wpe(torch.arange(T)))
        atts = []
        for b in self.h:
            x, att = b(x)
            atts.append(att)
        return self.lnf(x) @ self.wte.weight.T, atts  # tied unembedding


def windows(doc, ctx):
    """The held-out windows (shared with model.ts): stride ctx, each predicts up to ctx next tokens."""
    return [doc[s:s + ctx + 1] for s in range(0, len(doc) - 1, ctx)]


@torch.no_grad()
def evaluate(model, docs):
    model.eval()
    nll, top1, top5, n = 0.0, 0, 0, 0
    for doc in docs:
        for w in windows(doc, CFG['ctx']):
            x, y = torch.tensor([w[:-1]]), torch.tensor(w[1:])
            logits = model(x)[0][0]
            nll += F.cross_entropy(logits, y, reduction='sum').item()
            top = logits.topk(5, dim=-1).indices
            top1 += (top[:, 0] == y).sum().item()
            top5 += (top == y[:, None]).any(-1).sum().item()
            n += len(y)
    return dict(loss=nll / n, top1=top1 / n, top5=top5 / n, tokens=n)


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

    torch.manual_seed(a.seed)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)

    data = json.load(open(os.path.join(ROOT, 'data/lm/ids.json')))
    vocab, train, held = data['vocab'], data['splits']['train'], data['splits']['heldout']
    ctx = CFG['ctx']
    starts = torch.tensor([(d, s) for d, doc in enumerate(train['ids']) for s in range(len(doc) - ctx)])
    train_t = [torch.tensor(doc) for doc in train['ids']]

    model = Mini(vocab, a.dropout)
    decay = [p for n, p in model.named_parameters() if p.dim() == 2]
    other = [p for n, p in model.named_parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([dict(params=decay, weight_decay=a.weight_decay), dict(params=other, weight_decay=0.0)],
                            lr=a.lr, betas=(0.9, 0.99))
    gen = torch.Generator().manual_seed(a.seed)
    curve, t0, train_loss = [], time.time(), float('nan')
    for step in range(1, a.steps + 1):
        lr = a.lr * 0.5 * (1 + math.cos(math.pi * (step - 1) / a.steps))  # cosine to zero
        for g in opt.param_groups:
            g['lr'] = lr
        pick = starts[torch.randint(len(starts), (a.batch,), generator=gen)]
        xy = torch.stack([train_t[d][s:s + ctx + 1] for d, s in pick.tolist()])
        model.train()
        logits = model(xy[:, :-1])[0]
        loss = F.cross_entropy(logits.reshape(-1, vocab), xy[:, 1:].reshape(-1))
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        train_loss = 0.9 * train_loss + 0.1 * loss.item() if step > 1 else loss.item()
        if step % a.every == 0 or step == a.steps:
            ev = evaluate(model, held['ids'])
            curve.append(dict(step=step, train=round(train_loss, 4), heldout=round(ev['loss'], 4)))
            print(f"step {step:5d} train {train_loss:.3f} heldout {ev['loss']:.3f} top1 {ev['top1']:.3f} top5 {ev['top5']:.3f}")
    secs = time.time() - t0

    # What ships: Float16. Everything below is computed in float64 from those rounded weights.
    state = {k: v for k, v in model.state_dict().items()}
    f16 = {k: v.to(torch.float16) for k, v in state.items()}
    m64 = Mini(vocab).double()
    m64.load_state_dict({k: v.to(torch.float64) for k, v in f16.items()})
    final = evaluate(m64, held['ids'])
    train_eval = evaluate(m64, train['ids'])
    print(f"shipped weights: heldout loss {final['loss']:.4f} top1 {final['top1']:.3f} top5 {final['top5']:.3f}; "
          f"train loss {train_eval['loss']:.4f} top5 {train_eval['top5']:.3f}; {secs:.1f}s")
    if a.no_write:
        return

    layout, blob, off = [], bytearray(), 0
    for name, t in f16.items():
        b = t.numpy().astype('<f2').tobytes()
        layout.append(dict(name=name, shape=list(t.shape), offset=off))
        blob += b
        off += len(b)
    os.makedirs(os.path.join(ROOT, 'public/data/lm'), exist_ok=True)
    open(os.path.join(ROOT, 'public/data/lm/model.bin'), 'wb').write(blob)

    r = lambda x: round(x, 6)
    meta = dict(
        model=dict(vocab=vocab, **CFG, params=sum(t.numel() for t in f16.values())),
        dtype='float16-le', bytes=len(blob), tensors=layout,
        training=dict(seed=a.seed, steps=a.steps, batch=a.batch, lr=a.lr, schedule='cosine to 0',
                      optimizer='AdamW betas (0.9, 0.99), grad clip 1.0', weight_decay=a.weight_decay,
                      dropout=a.dropout, torch=torch.__version__, seconds=round(secs, 1),
                      trainTokens=sum(len(d) for d in train['ids']), trainDocs=train['docs']),
        lossCurve=curve,
        heldout=dict(docs=held['docs'], tokens=final['tokens'], loss=r(final['loss']), top1=r(final['top1']),
                     top5=r(final['top5'])),
        trainEval=dict(loss=r(train_eval['loss']), top1=r(train_eval['top1']), top5=r(train_eval['top5'])),
    )
    json.dump(meta, open(os.path.join(ROOT, 'public/data/lm/meta.json'), 'w'), indent=1)

    goldens = []
    with torch.no_grad():
        for p in data['prompts']:
            ids = p['ids'][-ctx:]
            logits, atts = m64(torch.tensor([ids]))
            last = logits[0, -1]
            goldens.append(dict(
                text=p['text'], ids=ids, truncated=len(p['ids']) > ctx,
                top5=last.topk(5).indices.tolist(),
                logits=[round(v, 7) for v in last.tolist()],
                attention=[[[[round(v, 7) for v in row] for row in head] for head in att[0].tolist()] for att in atts],
            ))
    os.makedirs(os.path.join(ROOT, 'tests/fixtures/lm'), exist_ok=True)
    json.dump(dict(heldout=dict(loss=final['loss'], top1=final['top1'], top5=final['top5']), prompts=goldens),
              open(os.path.join(ROOT, 'tests/fixtures/lm/goldens.json'), 'w'), separators=(',', ':'))
    print(f'wrote model.bin ({len(blob)} bytes), meta.json, goldens.json')


if __name__ == '__main__':
    main()
