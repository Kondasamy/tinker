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

--finetune (U18, KTD9) leaves the base alone: it reads the committed model.bin and runs two fine-tunes on the
style set (data/lm/ids.json styleSet), a full one and a LoRA one (rank 4 on the attention projections), and writes
  public/data/lm/finetuned.bin   Float16 weights, the same layout as model.bin
  public/data/lm/lora.bin        Float16 adapter, its layout in meta.json `lora.tensors`
and the new keys `finetune` and `lora` in meta.json and `finetuned` and `lora` in goldens.json. Every other key is
written back as it was.
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


class LoRA(nn.Module):
    """A frozen Linear plus scale * B(A x) (Hu et al. 2021): A [r, in] starts random, B [out, r] at zero."""
    def __init__(self, base, rank, alpha):
        super().__init__()
        self.base, self.scale = base, alpha / rank
        self.A = nn.Parameter(torch.randn(rank, base.in_features) / math.sqrt(base.in_features))
        self.B = nn.Parameter(torch.zeros(base.out_features, rank))

    def forward(self, x):
        return self.base(x) + self.scale * (x @ self.A.T) @ self.B.T


LORA_TARGETS = ('attn.qkv', 'attn.proj')


def add_lora(model, rank, alpha):
    for b in model.h:
        for t in ('qkv', 'proj'):
            b.attn[t] = LoRA(b.attn[t], rank, alpha)


def load_base(vocab):
    """The committed weights, exactly as shipped (Float16), in a float32 model."""
    meta = json.load(open(os.path.join(ROOT, 'public/data/lm/meta.json')))
    blob = open(os.path.join(ROOT, 'public/data/lm/model.bin'), 'rb').read()
    state = {}
    for t in meta['tensors']:
        n = int(np.prod(t['shape']))
        arr = np.frombuffer(blob, dtype='<f2', count=n, offset=t['offset']).astype(np.float32).reshape(t['shape'])
        state[t['name']] = torch.from_numpy(arr.copy())
    model = Mini(vocab)
    model.load_state_dict(state)
    return model


def f16_blob(tensors):
    layout, blob, off = [], bytearray(), 0
    for name, t in tensors.items():
        b = t.to(torch.float16).numpy().astype('<f2').tobytes()
        layout.append(dict(name=name, shape=list(t.shape), offset=off))
        blob += b
        off += len(b)
    return layout, bytes(blob)


def golden_prompts(m64, prompts):
    ctx, out = CFG['ctx'], []
    with torch.no_grad():
        for p in prompts:
            ids = p['ids'][-ctx:]
            logits, atts = m64(torch.tensor([ids]))
            last = logits[0, -1]
            out.append(dict(
                text=p['text'], ids=ids, truncated=len(p['ids']) > ctx,
                top5=last.topk(5).indices.tolist(),
                logits=[round(v, 7) for v in last.tolist()],
                attention=[[[[round(v, 7) for v in row] for row in head] for head in att[0].tolist()] for att in atts],
            ))
    return out


@torch.no_grad()
def greedy(model, ids, n):
    ids = list(ids)
    for _ in range(n):
        ids.append(model(torch.tensor([ids[-CFG['ctx']:]]))[0][0, -1].argmax().item())
    return ids


def finetune(a, data):
    """Two runs from the committed base on the style set: full (every weight) and LoRA (adapters only)."""
    vocab, held, style = data['vocab'], data['splits']['heldout'], data['styleSet']
    ctx = CFG['ctx']
    stream = torch.tensor([i for ex in style['ids'] for i in ex])
    starts = torch.arange(len(stream) - ctx)
    base_ev = evaluate(load_base(vocab).double(), held['ids'])
    runs, r = {}, (lambda x: round(x, 6))
    sign = style['signoff']['ids']  # " Larkspur team": the style signal

    for kind in ('full', 'lora'):
        torch.manual_seed(a.seed)
        model = load_base(vocab)
        model.drop.p = a.ft_dropout
        for b in model.h:
            b.drop.p = a.ft_dropout
        if kind == 'lora':
            for p in model.parameters():
                p.requires_grad_(False)
            add_lora(model, a.rank, a.alpha)
        params = [p for p in model.parameters() if p.requires_grad]
        lr = a.ft_lr if kind == 'full' else a.lora_lr
        opt = torch.optim.AdamW(params, lr=lr, betas=(0.9, 0.99), weight_decay=0.0)
        gen = torch.Generator().manual_seed(a.seed)
        ev, sv = evaluate(model, held['ids']), evaluate(model, [stream.tolist()])
        curve, train_loss, t0 = [dict(step=0, train=round(sv['loss'], 4), heldout=round(ev['loss'], 4))], float('nan'), time.time()
        for step in range(1, a.ft_steps + 1):
            for g in opt.param_groups:
                g['lr'] = lr * 0.5 * (1 + math.cos(math.pi * (step - 1) / a.ft_steps))
            pick = starts[torch.randint(len(starts), (a.ft_batch,), generator=gen)]
            xy = torch.stack([stream[s:s + ctx + 1] for s in pick.tolist()])
            model.train()
            loss = F.cross_entropy(model(xy[:, :-1])[0].reshape(-1, vocab), xy[:, 1:].reshape(-1))
            opt.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(params, 1.0)
            opt.step()
            train_loss = 0.9 * train_loss + 0.1 * loss.item() if step > 1 else loss.item()
            if step % a.ft_every == 0 or step == a.ft_steps:
                ev = evaluate(model, held['ids'])
                curve.append(dict(step=step, train=round(train_loss, 4), heldout=round(ev['loss'], 4)))
                print(f"{kind} step {step:4d} style {train_loss:.3f} heldout {ev['loss']:.3f}")
        secs = time.time() - t0

        # What ships: Float16; everything below is float64 from those rounded weights (KTD2).
        if kind == 'full':
            ship = {k: v.to(torch.float16) for k, v in model.state_dict().items()}
            m64 = Mini(vocab).double()
            m64.load_state_dict({k: v.to(torch.float64) for k, v in ship.items()})
        else:
            ship = {}
            for l, b in enumerate(model.h):
                for t in ('qkv', 'proj'):
                    ship[f'h.{l}.attn.{t}.A'] = b.attn[t].A.detach().to(torch.float16)
                    ship[f'h.{l}.attn.{t}.B'] = b.attn[t].B.detach().to(torch.float16)
            m64 = load_base(vocab)
            add_lora(m64, a.rank, a.alpha)
            m64 = m64.double()
            with torch.no_grad():
                for l, b in enumerate(m64.h):
                    for t in ('qkv', 'proj'):
                        b.attn[t].A.copy_(ship[f'h.{l}.attn.{t}.A'].double())
                        b.attn[t].B.copy_(ship[f'h.{l}.attn.{t}.B'].double())
        m64.eval()
        final, sfinal = evaluate(m64, held['ids']), evaluate(m64, [stream.tolist()])
        trainable = sum(p.numel() for p in params)
        print(f"{kind}: heldout loss {base_ev['loss']:.4f} -> {final['loss']:.4f}, style loss {sfinal['loss']:.4f}, "
              f"trainable {trainable}, {secs:.1f}s")
        for p in style['prompts']:
            out = greedy(m64, p['ids'], 24)[len(p['ids']):]
            signed = any(out[i:i + len(sign)] == sign for i in range(len(out)))
            print(f"  {p['text']!r} signs off: {signed}")
        runs[kind] = dict(ship=ship, m64=m64, final=final, sfinal=sfinal, curve=curve, secs=secs, trainable=trainable)

    print(f"forgetting (held-out loss rise): full {runs['full']['final']['loss'] - base_ev['loss']:+.4f}, "
          f"lora {runs['lora']['final']['loss'] - base_ev['loss']:+.4f}")
    if a.no_write:
        return

    layout, blob = f16_blob(runs['full']['ship'])
    lora_layout, lora_blob = f16_blob(runs['lora']['ship'])
    meta_path = os.path.join(ROOT, 'public/data/lm/meta.json')
    meta = json.load(open(meta_path))
    assert [t['name'] for t in meta['tensors']] == [t['name'] for t in layout] and meta['bytes'] == len(blob)
    open(os.path.join(ROOT, 'public/data/lm/finetuned.bin'), 'wb').write(blob)
    open(os.path.join(ROOT, 'public/data/lm/lora.bin'), 'wb').write(lora_blob)

    settings = dict(seed=a.seed, steps=a.ft_steps, batch=a.ft_batch, schedule='cosine to 0',
                    optimizer='AdamW betas (0.9, 0.99), grad clip 1.0, no weight decay', dropout=a.ft_dropout,
                    torch=torch.__version__, styleTokens=len(stream), styleExamples=len(style['ids']),
                    start='model.bin')
    scores = lambda e: dict(loss=r(e['loss']), top1=r(e['top1']), top5=r(e['top5']))
    meta['finetune'] = dict(
        file='finetuned.bin', trainable=runs['full']['trainable'],
        training=dict(**settings, lr=a.ft_lr, seconds=round(runs['full']['secs'], 1)),
        lossCurve=runs['full']['curve'], heldout=scores(runs['full']['final']), style=scores(runs['full']['sfinal']))
    meta['lora'] = dict(
        file='lora.bin', rank=a.rank, alpha=a.alpha, targets=list(LORA_TARGETS), bytes=len(lora_blob),
        tensors=lora_layout, trainable=runs['lora']['trainable'],
        training=dict(**settings, lr=a.lora_lr, seconds=round(runs['lora']['secs'], 1)),
        lossCurve=runs['lora']['curve'], heldout=scores(runs['lora']['final']), style=scores(runs['lora']['sfinal']))
    json.dump(meta, open(meta_path, 'w'), indent=1)

    g_path = os.path.join(ROOT, 'tests/fixtures/lm/goldens.json')
    goldens = json.load(open(g_path))
    for key, kind in (('finetuned', 'full'), ('lora', 'lora')):
        f = runs[kind]['final']
        goldens[key] = dict(heldout=dict(loss=f['loss'], top1=f['top1'], top5=f['top5']),
                            prompts=golden_prompts(runs[kind]['m64'], data['prompts'] + style['prompts']))
    json.dump(goldens, open(g_path, 'w'), separators=(',', ':'))
    print(f'wrote finetuned.bin ({len(blob)} bytes), lora.bin ({len(lora_blob)} bytes), new keys in meta.json and goldens.json')


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
    ap.add_argument('--finetune', action='store_true', help='fine-tune the committed base on the style set (U18)')
    ap.add_argument('--ft-steps', type=int, default=300)
    ap.add_argument('--ft-batch', type=int, default=16)
    ap.add_argument('--ft-lr', type=float, default=3e-4)
    ap.add_argument('--ft-dropout', type=float, default=0.0)
    ap.add_argument('--ft-every', type=int, default=25)
    ap.add_argument('--lora-lr', type=float, default=3e-2)
    ap.add_argument('--rank', type=int, default=4)
    ap.add_argument('--alpha', type=float, default=4.0)
    a = ap.parse_args()

    torch.manual_seed(a.seed)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)

    data = json.load(open(os.path.join(ROOT, 'data/lm/ids.json')))
    if a.finetune:
        return finetune(a, data)
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
