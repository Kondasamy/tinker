"""Diffusion's learned 2-D denoiser (KTD8): a small MLP trained once on points from a Larkspur hinge outline.

Writes
  public/data/diffusion/points.bin   Float16 little-endian weights, tensor layout in meta.json
  public/data/diffusion/meta.json    config, layout, noise schedule, the outline, training settings, loss curve, goldens

The network predicts the noise added to a point (DDPM's epsilon, Ho et al. 2020) from the noisy point and sinusoidal
embeddings of its coordinates (so it can draw fine detail like the screw holes) and of the time t in [0, 1]. The noise schedule is cosine (Nichol and Dhariwal 2021), squeezed so the last step
keeps a little signal. Goldens are computed in float64 from the weights rounded to Float16 (what ships);
src/lib/diffusion/points.ts runs the same maths and tests/unit/diffusion-learned.test.ts checks it against them.

Run (about 35 seconds on one CPU thread; seeded and deterministic, a rerun gives a byte-identical points.bin):
  uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train_diffusion.py
"""
import argparse
import json
import math
import os
import time

import torch
import torch.nn as nn
import torch.nn.functional as F

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CFG = dict(d_time=32, max_freq=1000.0, d_space=32, max_space_freq=30.0, d_hidden=96, n_hidden=2)
SCHEDULE = dict(kind='cosine', s=0.008, squeeze=0.985)


def outline():
    """The hinge, opened flat, as line segments [x1, y1, x2, y2] in about [-1, 1]: two leaves either side of the
    barrel, the barrel's two knuckle joints, and two screw holes per leaf."""
    pts = [(-0.9, -0.7), (-0.12, -0.7), (-0.12, -0.85), (0.12, -0.85), (0.12, -0.7), (0.9, -0.7),
           (0.9, 0.7), (0.12, 0.7), (0.12, 0.85), (-0.12, 0.85), (-0.12, 0.7), (-0.9, 0.7)]
    segs = [[*pts[i], *pts[(i + 1) % len(pts)]] for i in range(len(pts))]
    segs += [[x, -0.7, x, 0.7] for x in (-0.12, 0.12)]  # where the leaves meet the barrel
    segs += [[-0.12, y, 0.12, y] for y in (-0.28, 0.28)]  # knuckle joints
    for cx in (-0.5, 0.5):
        for cy in (-0.35, 0.35):
            ring = [(cx + 0.12 * math.cos(2 * math.pi * k / 16), cy + 0.12 * math.sin(2 * math.pi * k / 16))
                    for k in range(16)]
            segs += [[*ring[k], *ring[(k + 1) % 16]] for k in range(16)]
    return [[round(v, 6) for v in s] for s in segs]


def sample_outline(segs, n, gen):
    """n points uniformly by length along the outline."""
    s = torch.tensor(segs, dtype=torch.float64)
    length = (s[:, 2:] - s[:, :2]).norm(dim=1)
    pick = torch.multinomial(length / length.sum(), n, replacement=True, generator=gen)
    u = torch.rand(n, 1, generator=gen, dtype=torch.float64)
    return (s[pick, :2] + u * (s[pick, 2:] - s[pick, :2])).float()


def alpha_bar(t):
    """The share of signal left at time t (1 at t = 0, near 0 at t = 1)."""
    s, q = SCHEDULE['s'], SCHEDULE['squeeze']
    return torch.cos((t * q + s) / (1 + s) * math.pi / 2) ** 2 / math.cos(s / (1 + s) * math.pi / 2) ** 2


def sinusoids(v, d, max_freq):
    """[sin(f v), cos(f v)] for d / 2 frequencies f from 1 to max_freq, spaced geometrically."""
    freqs = torch.exp(torch.linspace(0, math.log(max_freq), d // 2, dtype=v.dtype))
    a = v[:, None] * freqs[None]
    return torch.cat([a.sin(), a.cos()], dim=1)


class Denoiser(nn.Module):
    def __init__(self, cfg=CFG):
        super().__init__()
        h = cfg['d_hidden']
        self.inp = nn.Linear(2 + cfg['d_space'] + cfg['d_time'], h)
        self.hidden = nn.ModuleList(nn.Linear(h, h) for _ in range(cfg['n_hidden']))
        self.out = nn.Linear(h, 2)

    def forward(self, x, t):
        d, f = CFG['d_space'] // 2, CFG['max_space_freq']
        feats = [x, sinusoids(x[:, 0], d, f), sinusoids(x[:, 1], d, f), sinusoids(t, CFG['d_time'], CFG['max_freq'])]
        y = F.gelu(self.inp(torch.cat(feats, dim=1)), approximate='tanh')
        for layer in self.hidden:
            y = F.gelu(layer(y), approximate='tanh')
        return self.out(y)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, default=1337)
    ap.add_argument('--steps', type=int, default=20000)
    ap.add_argument('--batch', type=int, default=256)
    ap.add_argument('--lr', type=float, default=2e-3)
    ap.add_argument('--points', type=int, default=8000)
    ap.add_argument('--every', type=int, default=500, help='loss-curve sampling interval')
    ap.add_argument('--no-write', action='store_true', help='train and report only (for trying settings)')
    a = ap.parse_args()

    torch.manual_seed(a.seed)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)
    gen = torch.Generator().manual_seed(a.seed)

    segs = outline()
    data = sample_outline(segs, a.points, gen)
    model = Denoiser()
    opt = torch.optim.Adam(model.parameters(), lr=a.lr)
    curve, t0, run = [], time.time(), float('nan')
    for step in range(1, a.steps + 1):
        for g in opt.param_groups:
            g['lr'] = a.lr * 0.5 * (1 + math.cos(math.pi * (step - 1) / a.steps))  # cosine to zero
        x0 = data[torch.randint(len(data), (a.batch,), generator=gen)]
        t = torch.rand(a.batch, generator=gen)
        eps = torch.randn(a.batch, 2, generator=gen)
        ab = alpha_bar(t)[:, None]
        loss = F.mse_loss(model(ab.sqrt() * x0 + (1 - ab).sqrt() * eps, t), eps)
        opt.zero_grad(set_to_none=True)
        loss.backward()
        opt.step()
        run = 0.99 * run + 0.01 * loss.item() if step > 1 else loss.item()
        if step % a.every == 0 or step == a.steps:
            curve.append(dict(step=step, loss=round(run, 4)))
            print(f'step {step:6d} loss {run:.4f}')
    secs = time.time() - t0

    # What ships: Float16. The goldens below are computed in float64 from those rounded weights.
    f16 = {k: v.to(torch.float16) for k, v in model.state_dict().items()}
    m64 = Denoiser().double()
    m64.load_state_dict({k: v.to(torch.float64) for k, v in f16.items()})
    inputs = [[0.0, 0.0, 0.0], [0.5, -0.35, 0.02], [-0.9, 0.7, 0.1], [0.3, 0.2, 0.5], [-1.4, 0.8, 0.9],
              [1.1, -1.7, 1.0]]
    with torch.no_grad():
        x = torch.tensor([i[:2] for i in inputs], dtype=torch.float64)
        t = torch.tensor([i[2] for i in inputs], dtype=torch.float64)
        eps = m64(x, t).tolist()
    goldens = [dict(x=i[:2], t=i[2], eps=[round(v, 8) for v in e]) for i, e in zip(inputs, eps)]
    print(f'final loss {run:.4f}; {secs:.1f}s')
    if a.no_write:
        return

    layout, blob = [], bytearray()
    for name, w in f16.items():
        layout.append(dict(name=name, shape=list(w.shape), offset=len(blob)))
        blob += w.numpy().astype('<f2').tobytes()
    out = os.path.join(ROOT, 'public/data/diffusion')
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'points.bin'), 'wb').write(blob)
    meta = dict(
        model=dict(**CFG, params=sum(w.numel() for w in f16.values())),
        schedule=SCHEDULE,
        dtype='float16-le', bytes=len(blob), tensors=layout,
        training=dict(seed=a.seed, steps=a.steps, batch=a.batch, lr=a.lr, schedule='cosine to 0', optimizer='Adam',
                      points=a.points, torch=torch.__version__, seconds=round(secs, 1)),
        lossCurve=curve,
        outline=segs,
        goldens=goldens,
    )
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), indent=1)
    print(f'wrote points.bin ({len(blob)} bytes), meta.json')


if __name__ == '__main__':
    main()
