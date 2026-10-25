"""Diffusion LMs' masked model (KTD3 of the seven-modules plan): Larkspur mini's shape with the causal mask dropped,
trained once to fill [MASK] slots (the MDLM / LLaDA objective).

Reads data/lm/ids.json (the training and held-out splits, and `diffusionLlms.pieces`, each token's bytes, for text;
Python never tokenizes) and writes
  public/data/diffusion-llms/mlm.bin     Float16 little-endian weights, tensor layout in meta.json (model.bin's names)
  public/data/diffusion-llms/meta.json   config (vocab 769, mask id 768), layout, training settings, loss curve,
                                         held-out masked accuracy, the readable bar, reply quality and repeat rate per k, goldens
  data/diffusion-llms/prompts.json       the pinned held-out phrases: one masked slot each, its expected token, the
                                         held-out reference continuation and the decoded replies per rule and k

The model is train.py's Mini (2 layers, 2 heads, d_model 32, context 32, tied unembedding) with a 769th token,
[MASK], and every block attending both ways. Each training window gets a mask rate t ~ U(0, 1); each token is masked
with probability t and the loss is the mean cross-entropy over the masked tokens only. (LLaDA's 1 / t weighting,
--weighting inverse, stalled at the unigram loss in the spike; so did every run under about 10,000 steps.)
Every score and golden is computed in float64 from the weights rounded to Float16 (what ships).

It writes only when every bar holds (the plan's stop conditions, KTD11 as the orchestrator redefined it): mlm.bin
within 150,000 bytes; the expected token in the top 5 for at least half the pinned phrases; reply quality, the share of
reply tokens equal to the same model's careful fill (k = 1, confidence remasking), lower at the largest k than at k = 1;
random remasking no better than confidence at any k > 1; and the repeat rate (reply tokens equal to the one before)
higher at the largest k than at k = 1 under both rules. Held-out text is not the reference: a model this small almost
never writes unseen text token for token.

Run (about three and a half minutes on one CPU thread; seeded and deterministic, a rerun gives a byte-identical mlm.bin):
  uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train_mlm.py
"""
import argparse
import hashlib
import json
import math
import os
import time

import torch
import torch.nn.functional as F

from train import CFG as LM_CFG, Block, Mini, f16_blob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MASK = 768  # the site's BPE has 768 tokens; [MASK] is one more
VOCAB = MASK + 1
PREFIX, L = 16, 16  # a pinned phrase is 16 held-out tokens; its reply is the next 16 (the 32-token window)
KS = [1, 2, 4, 8, 16]
RULES = ['confidence', 'random']
STARTS = [40, 120]  # per held-out doc: where a phrase starts (moved on to the next word start)


class BiBlock(Block):
    """train.py's Block with the causal mask dropped: every token attends to every token."""

    def forward(self, x):
        B, T, D = x.shape
        H, hd = self.n_head, D // self.n_head
        q, k, v = self.attn['qkv'](self.ln1(x)).split(D, dim=2)
        q, k, v = (t.view(B, T, H, hd).transpose(1, 2) for t in (q, k, v))
        att = ((q @ k.transpose(-2, -1)) / math.sqrt(hd)).softmax(dim=-1)
        y = (self.drop(att) @ v).transpose(1, 2).reshape(B, T, D)
        x = x + self.drop(self.attn['proj'](y))
        x = x + self.drop(self.mlp['proj'](F.gelu(self.mlp['fc'](self.ln2(x)), approximate='tanh')))
        return x, att


def mlm(cfg, dropout=0.0):
    model = Mini(VOCAB, dropout, cfg)
    for b in model.h:
        b.__class__ = BiBlock  # same parameters and initialisation; only the forward changes
    return model


def mulberry32(seed):
    """The site's PRNG (src/lib/transformers/sample.ts), so the browser can replay random remasking."""
    M, a = 0xFFFFFFFF, seed & 0xFFFFFFFF
    imul = lambda x, y: (x * y) & M

    def rand():
        nonlocal a
        a = (a + 0x6D2B79F5) & M
        t = imul(a ^ (a >> 15), a | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & M
        return ((t ^ (t >> 14)) & M) / 4294967296

    return rand


_r = mulberry32(7)
assert [_r(), _r(), _r()] == [0.011704753153026104, 0.06195825757458806, 0.97690763277933], 'mulberry32 drifted from JS'


@torch.no_grad()
def masked_eval(model, docs, ctx):
    """Held-out windows (stride ctx), every position masked alone: loss, top-1 and top-5 at that slot."""
    model.eval()
    nll, top1, top5, n = 0.0, 0, 0, 0
    for doc in docs:
        for s in range(0, len(doc), ctx):
            w = torch.tensor(doc[s:s + ctx])
            T = len(w)
            x = w.repeat(T, 1)
            x[torch.arange(T), torch.arange(T)] = MASK
            logits = model(x)[0][torch.arange(T), torch.arange(T)]
            logits[:, MASK] = float('-inf')
            nll += F.cross_entropy(logits, w, reduction='sum').item()
            top = logits.topk(5, dim=-1).indices
            top1 += (top[:, 0] == w).sum().item()
            top5 += (top == w[:, None]).any(-1).sum().item()
            n += T
    return dict(loss=nll / n, top1=top1 / n, top5=top5 / n, tokens=n)


def train(a, cfg, docs, held):
    torch.manual_seed(a.seed)
    ctx = cfg['ctx']
    starts = torch.tensor([(d, s) for d, doc in enumerate(docs) for s in range(len(doc) - ctx + 1)])
    docs_t = [torch.tensor(doc) for doc in docs]
    model = mlm(cfg, a.dropout)
    decay = [p for p in model.parameters() if p.dim() == 2]
    other = [p for p in model.parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([dict(params=decay, weight_decay=a.weight_decay), dict(params=other, weight_decay=0.0)],
                            lr=a.lr, betas=(0.9, 0.99))
    gen = torch.Generator().manual_seed(a.seed)
    curve, t0, train_loss = [], time.time(), float('nan')
    for step in range(1, a.steps + 1):
        lr = a.lr * 0.5 * (1 + math.cos(math.pi * (step - 1) / a.steps))  # cosine to zero
        for g in opt.param_groups:
            g['lr'] = lr
        pick = starts[torch.randint(len(starts), (a.batch,), generator=gen)]
        y = torch.stack([docs_t[d][s:s + ctx] for d, s in pick.tolist()])
        t = (1 - a.eps) * torch.rand(a.batch, 1, generator=gen) + a.eps  # LLaDA's mask rate per window
        masked = torch.rand(y.shape, generator=gen) < t
        x = y.masked_fill(masked, MASK)
        model.train()
        ce = F.cross_entropy(model(x)[0].reshape(-1, VOCAB), y.reshape(-1), reduction='none').view_as(y)
        if a.weighting == 'inverse':
            loss = (ce * masked / t).sum() / y.numel()
        else:
            loss = (ce * masked).sum() / masked.sum().clamp(min=1)
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        train_loss = 0.9 * train_loss + 0.1 * loss.item() if step > 1 else loss.item()
        if step % a.every == 0 or step == a.steps:
            ev = masked_eval(model, held, ctx)
            curve.append(dict(step=step, train=round(train_loss, 4), heldout=round(ev['loss'], 4)))
            print(f"step {step:5d} train {train_loss:.3f} heldout {ev['loss']:.3f} top1 {ev['top1']:.3f} "
                  f"top5 {ev['top5']:.3f}")
    return model, curve, time.time() - t0


@torch.no_grad()
def slot_logits(model, ids, slot):
    logits = model(torch.tensor([ids]))[0][0, slot].clone()
    logits[MASK] = float('-inf')
    return logits


@torch.no_grad()
def decode(model, prompt, k, rule, seed):
    """Fill L [MASK] slots after the prompt, committing k a pass: the most confident (ties to the earlier slot) or
    k drawn with mulberry32(seed), each pick floor(rand() * slots left) from the slots still masked, in order.
    [MASK] is never committed. Returns the reply and the passes it took (ceil(L / k))."""
    x, P = list(prompt) + [MASK] * L, len(prompt)
    rand, passes = mulberry32(seed), 0
    while MASK in x[P:]:
        logits = model(torch.tensor([x]))[0][0]
        logits[:, MASK] = float('-inf')
        conf, tok = logits.softmax(-1).max(-1)
        left = [i for i in range(P, P + L) if x[i] == MASK]
        if rule == 'confidence':
            pick = sorted(left, key=lambda i: (-conf[i].item(), i))[:k]
        else:
            pick = [left.pop(int(rand() * len(left))) for _ in range(min(k, len(left)))]
        for i in pick:
            x[i] = tok[i].item()
        passes += 1
    return x[P:], passes


def text_of(pieces, ids):
    return b''.join(bytes(pieces[i]) for i in ids).decode('utf-8', errors='replace')


def pinned_prompts(held, pieces):
    """Per held-out doc, a 16-token phrase from each of STARTS (moved on to a word start), the next 16 tokens as its
    reference, and its slot: the first whole word of two or more letters in one piece (a space, letters, and no
    letter after it) at position 6 or later, else the nearest before 6."""
    out = []
    piece = lambda i: bytes(pieces[i])
    word = lambda doc, i: piece(doc[i])[:1] == b' ' and piece(doc[i])[1:].isalpha() and len(piece(doc[i])) >= 3 \
        and not piece(doc[i + 1])[:1].isalpha()
    for name, doc in zip(held['docs'], held['ids']):
        for s in STARTS:
            while pieces[doc[s]][0] != 32:
                s += 1
            ids, ref = doc[s:s + PREFIX], doc[s + PREFIX:s + PREFIX + L]
            slot = next(i for i in [*range(6, PREFIX), *range(5, 0, -1)] if word(doc, s + i))
            masked = ids[:slot] + [MASK] + ids[slot + 1:]
            out.append(dict(
                doc=name, start=s, ids=ids, slot=slot, expected=ids[slot],
                text=text_of(pieces, ids), expectedText=text_of(pieces, [ids[slot]]),
                masked=text_of(pieces, ids[:slot]) + '[MASK]' + text_of(pieces, ids[slot + 1:]),
                maskedIds=masked, reference=ref, referenceText=text_of(pieces, ref), seed=len(out) + 1))
    return out


def golden(m64, ids, slot, text):
    """train.py's golden_prompts shape, read at the masked slot instead of the last position."""
    with torch.no_grad():
        logits, atts = m64(torch.tensor([ids]))
        at = logits[0, slot]
        return dict(text=text, ids=ids, slot=slot, top5=at.topk(5).indices.tolist(),
                    logits=[round(v, 7) for v in at.tolist()],
                    attention=[[[[round(v, 7) for v in row] for row in head] for head in att[0].tolist()]
                               for att in atts])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, default=1337)
    ap.add_argument('--d-model', type=int, default=32, help='32, or the fallback 40 (KTD3)')
    ap.add_argument('--steps', type=int, default=25000)
    ap.add_argument('--batch', type=int, default=32)
    ap.add_argument('--lr', type=float, default=3e-3)
    ap.add_argument('--weight-decay', type=float, default=0.1)
    ap.add_argument('--dropout', type=float, default=0.0)
    ap.add_argument('--weighting', choices=['inverse', 'mean'], default='mean', help='1 / t, or the mean over masked')
    ap.add_argument('--eps', type=float, default=1e-3, help='the smallest mask rate')
    ap.add_argument('--every', type=int, default=1000, help='loss-curve sampling interval')
    ap.add_argument('--no-write', action='store_true', help='train and report only (for trying settings)')
    a = ap.parse_args()

    torch.manual_seed(a.seed)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)

    cfg = dict(LM_CFG, d_model=a.d_model, d_mlp=4 * a.d_model)
    data = json.load(open(os.path.join(ROOT, 'data/lm/ids.json')))
    assert data['vocab'] == MASK
    train_s, held, pieces = data['splits']['train'], data['splits']['heldout'], data['diffusionLlms']['pieces']
    model, curve, secs = train(a, cfg, train_s['ids'], held['ids'])

    # What ships: Float16. Everything below is computed in float64 from those rounded weights.
    f16 = {k: v.to(torch.float16) for k, v in model.state_dict().items()}
    m64 = mlm(cfg).double().eval()
    m64.load_state_dict({k: v.to(torch.float64) for k, v in f16.items()})
    final = masked_eval(m64, held['ids'], cfg['ctx'])

    prompts = pinned_prompts(held, pieces)
    for p in prompts:
        top = slot_logits(m64, p['maskedIds'], p['slot']).topk(5).indices.tolist()
        p['top5'], p['inTop5'] = top, p['expected'] in top
        careful = decode(m64, p['ids'], 1, 'confidence', p['seed'])[0]
        p['replies'] = {}
        for rule in RULES:
            p['replies'][rule] = {}
            for k in KS:
                reply, passes = decode(m64, p['ids'], k, rule, p['seed'])
                assert passes == math.ceil(L / k) and MASK not in reply
                p['replies'][rule][str(k)] = dict(
                    ids=reply, agree=sum(x == y for x, y in zip(reply, careful)),  # same token as the careful fill
                    repeat=sum(reply[i] == reply[i - 1] for i in range(1, L)))  # same token as the one before
        print(f"{'ok ' if p['inTop5'] else 'MISS'} {p['masked']!r} -> {p['expectedText']!r}; top5 "
              f"{[text_of(pieces, [i]) for i in top]}")
    readable = sum(p['inTop5'] for p in prompts)
    share = lambda how, rule, k, per: round(sum(p['replies'][rule][str(k)][how] for p in prompts) / (per * len(prompts)), 6)
    quality = {rule: {str(k): share('agree', rule, k, L) for k in KS} for rule in RULES}
    repeats = {rule: {str(k): share('repeat', rule, k, L - 1) for k in KS} for rule in RULES}
    params = sum(t.numel() for t in f16.values())
    layout, blob = f16_blob(f16)
    print(f"d_model {a.d_model}: {params} params, {len(blob)} bytes; held-out masked loss {final['loss']:.4f} "
          f"top1 {final['top1']:.3f} top5 {final['top5']:.3f}; {secs:.1f}s")
    print(f'mlm.bin sha256 {hashlib.sha256(blob).hexdigest()}')
    print(f'readable bar: {readable} of {len(prompts)} expected tokens in the top 5')
    for rule in RULES:
        for name, of in (('agreement', quality), ('repeat rate', repeats)):
            print(f'{name}, {rule}: ' + ', '.join(f'k={k} {of[rule][str(k)]:.3f}' for k in KS))
    bars = dict(size=len(blob) <= 150_000, readable=2 * readable >= len(prompts),
                drop=quality['confidence'][str(KS[-1])] < quality['confidence']['1'],
                random=all(quality['random'][str(k)] <= quality['confidence'][str(k)] for k in KS[1:]),
                repeats={rule: repeats[rule][str(KS[-1])] > repeats[rule]['1'] for rule in RULES})
    print(f'bars: {bars}')
    if a.no_write:
        return
    assert bars['size'] and bars['readable'] and bars['drop'] and bars['random'] and all(bars['repeats'].values()), 'stop: a bar was missed (KTD3, KTD11)'

    out = os.path.join(ROOT, 'public/data/diffusion-llms')
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'mlm.bin'), 'wb').write(blob)
    r = lambda x: round(x, 6)
    goldens = [golden(m64, p['maskedIds'], p['slot'], p['masked']) for p in prompts[:3]]
    goldens.append(golden(m64, prompts[0]['ids'] + [MASK] * L, PREFIX, prompts[0]['text'] + ' + 16 [MASK]'))
    meta = dict(
        model=dict(vocab=VOCAB, **cfg, params=params), mask=MASK, bidirectional=True,
        dtype='float16-le', bytes=len(blob), tensors=layout,
        training=dict(seed=a.seed, steps=a.steps, batch=a.batch, lr=a.lr, schedule='cosine to 0',
                      optimizer='AdamW betas (0.9, 0.99), grad clip 1.0', weight_decay=a.weight_decay,
                      dropout=a.dropout, weighting=a.weighting, objective='masked tokens only, mask rate t ~ U(eps, 1) per window, ' +
                                                   ('mean cross-entropy over the masked tokens' if a.weighting == 'mean' else 'cross-entropy weighted 1 / t'), eps=a.eps,
                      torch=torch.__version__, seconds=round(secs, 1),
                      trainTokens=sum(len(d) for d in train_s['ids']), trainDocs=train_s['docs']),
        lossCurve=curve,
        heldout=dict(docs=held['docs'], tokens=final['tokens'], how='every position masked alone',
                     loss=r(final['loss']), top1=r(final['top1']), top5=r(final['top5'])),
        readable=dict(inTop5=readable, prompts=len(prompts)),
        decoding=dict(prefix=PREFIX, length=L, ks=KS, rules=RULES, quality=quality, repeats=repeats),
        goldens=goldens,
    )
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), indent=1)
    os.makedirs(os.path.join(ROOT, 'data/diffusion-llms'), exist_ok=True)
    json.dump(dict(mask=MASK, prefix=PREFIX, length=L, ks=KS, rules=RULES, readable=readable, quality=quality,
                   repeats=repeats, prompts=prompts),
              open(os.path.join(ROOT, 'data/diffusion-llms/prompts.json'), 'w'), indent=1)
    print(f'wrote mlm.bin ({len(blob)} bytes), meta.json, data/diffusion-llms/prompts.json')


if __name__ == '__main__':
    main()
