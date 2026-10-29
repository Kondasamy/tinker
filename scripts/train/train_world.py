"""Video and world models' next-frame world models (KTD5): two tiny conv nets trained once on a simulated warehouse.

Writes
  data/video-models/rollouts.json      a few rollouts' seeds, actions, events and frames, for the TS parity test
  public/data/video-models/k1.bin      Float16 little-endian weights, one context frame
  public/data/video-models/k2.bin      the same with two context frames
  public/data/video-models/meta.json   world, layout, training settings, loss curves, held-out scores, goldens

The simulator below mirrors src/lib/video-models/world.ts line for line (including its mulberry32 random numbers);
tests/unit/video-models-world.test.ts replays rollouts.json there. Each model reads its last k frames as one-hot kinds
plus the action broadcast as channels, runs three 3x3 convs with ReLU and a 1x1 conv to per-cell logits over the four
kinds. Goldens are computed in float64 from the Float16-rounded weights; src/lib/video-models/net.ts runs the same maths.
The weights are written only if KTD5's bar holds on held-out rollouts.

Run (seeded and deterministic, a rerun gives byte-identical files):
  uv run --no-project --python 3.12 --with-requirements scripts/train/requirements.txt scripts/train/train_world.py
"""
import argparse
import json
import math
import os
import statistics
import time

import torch
import torch.nn as nn
import torch.nn.functional as F

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SIZE, BELT = 16, 8
FLOOR, SHELF, ROBOT, CRATE = 0, 1, 2, 3
KINDS = ['floor', 'shelf', 'robot', 'crate']
ACTIONS = ['stay', 'up', 'down', 'left', 'right']
MOVES = [(0, 0), (0, -1), (0, 1), (-1, 0), (1, 0)]
M32 = 0xFFFFFFFF
HELD_OUT = 1_000_001  # held-out rollouts start at this seed; training ones at 1


# ---- the simulator (world.ts) ----

def mulberry32(seed):
    a = seed & M32

    def rand():
        nonlocal a
        a = (a + 0x6D2B79F5) & M32
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & M32
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & M32)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296

    return rand


def inside(v):
    return 0 <= v < SIZE


def start(rand):
    def rint(n):
        return math.floor(rand() * n)

    shelves = [FLOOR] * (SIZE * SIZE)
    racks = 4 + rint(4)
    for _ in range(racks):
        across = rand() < 0.5
        length = 2 + rint(4)
        x0, y0 = rint(SIZE), rint(SIZE)
        for i in range(length):
            x, y = (x0 + i, y0) if across else (x0, y0 + i)
            if inside(x) and inside(y) and y != BELT:
                shelves[y * SIZE + x] = SHELF
    while True:
        x, y = rint(SIZE), rint(SIZE)
        if shelves[y * SIZE + x] != SHELF:
            break
    while True:
        cx = rint(SIZE)
        if not (y == BELT and cx == x):
            break
    return dict(shelves=shelves, robot=(x, y), crate=(cx, -1 if rand() < 0.5 else 1))


def step(w, action):
    rx, ry = w['robot']
    cx, d = w['crate']
    bounce = blocked = None

    def free(x):
        return inside(x) and not (ry == BELT and rx == x)

    if not free(cx + d):
        bounce = 'robot' if inside(cx + d) else 'end'
        d = -d
    if free(cx + d):
        cx += d
    dx, dy = MOVES[action]
    nx, ny = rx + dx, ry + dy
    if not inside(nx) or not inside(ny):
        blocked = 'edge'
    elif w['shelves'][ny * SIZE + nx] == SHELF:
        blocked = 'shelf'
    elif ny == BELT and nx == cx:
        blocked = 'crate'
    else:
        rx, ry = nx, ny
    return dict(shelves=w['shelves'], robot=(rx, ry), crate=(cx, d)), dict(bounce=bounce, blocked=blocked)


def frame(w):
    f = list(w['shelves'])
    f[w['robot'][1] * SIZE + w['robot'][0]] = ROBOT
    f[BELT * SIZE + w['crate'][0]] = CRATE
    return f


def rollout(seed, steps):
    """Frames, actions, events and each tick's crate state (x, dir), from world.ts's rollout()."""
    rand = mulberry32(seed)
    w, a = start(rand), 0
    frames, actions, events, crates = [frame(w)], [], [], [w['crate']]
    for _ in range(steps):
        if rand() >= 0.75:
            a = math.floor(rand() * len(ACTIONS))
        actions.append(a)
        w, e = step(w, a)
        frames.append(frame(w))
        events.append(e)
        crates.append(w['crate'])
    return frames, actions, events, crates


def text(f):
    return ''.join(map(str, f))


# ---- the model ----

class WorldNet(nn.Module):
    def __init__(self, k, ch):
        super().__init__()
        self.k = k
        self.c1 = nn.Conv2d(4 * k + len(ACTIONS), ch, 3, padding=1)
        self.c2 = nn.Conv2d(ch, ch, 3, padding=1)
        self.c3 = nn.Conv2d(ch, ch, 3, padding=1)
        self.out = nn.Conv2d(ch, 4, 1)

    def forward(self, x):
        return self.out(F.relu(self.c3(F.relu(self.c2(F.relu(self.c1(x)))))))


def encode(ctx, actions, dtype=torch.float32):
    """ctx: (B, k, 256) kinds, oldest first; actions: (B,). -> (B, 4k + 5, 16, 16)."""
    b, k, _ = ctx.shape
    kinds = F.one_hot(ctx.long(), 4).to(dtype).permute(0, 1, 3, 2).reshape(b, 4 * k, SIZE, SIZE)
    act = F.one_hot(actions.long(), len(ACTIONS)).to(dtype)[:, :, None, None].expand(b, len(ACTIONS), SIZE, SIZE)
    return torch.cat([kinds, act], dim=1)


def predict(model, ctx, actions):
    with torch.no_grad():
        return model(encode(ctx, actions, next(model.parameters()).dtype)).argmax(1).reshape(len(ctx), SIZE * SIZE)


def samples(rolls, k):
    """Every (context, action, next frame) from ticks t >= 1, so k1 and k2 are scored on the same steps."""
    ctx, act, nxt, meta = [], [], [], []
    for r, (frames, actions, events, crates) in enumerate(rolls):
        for t in range(1, len(actions)):
            ctx.append(frames[t + 1 - k:t + 1])
            act.append(actions[t])
            nxt.append(frames[t + 1])
            meta.append((r, t))
    return torch.tensor(ctx, dtype=torch.uint8), torch.tensor(act), torch.tensor(nxt), meta


def score(model, rolls, k, open_steps):
    """KTD5's held-out measures."""
    ctx, act, nxt, meta = samples(rolls, k)
    pred = torch.cat([predict(model, ctx[i:i + 2048], act[i:i + 2048]) for i in range(0, len(ctx), 2048)])
    cur = ctx[:, -1].long()
    changed = cur != nxt
    robot_cell = nxt == ROBOT
    crate_hits = crate_n = 0
    for i, (r, t) in enumerate(meta):
        frames, actions, events, crates = rolls[r]
        if events[t]['bounce'] is None and events[t - 1]['bounce'] is None:  # bounce-free, and seen moving
            crate_n += 1
            belt = pred[i, BELT * SIZE:(BELT + 1) * SIZE].tolist()  # right only if the crate is there and nowhere else
            crate_hits += int([x for x in range(SIZE) if belt[x] == CRATE] == [crates[t + 1][0]])
    kept = []
    for frames, actions, _, _ in rolls:
        window = [list(f) for f in frames[2 - k:2]]
        n = 0
        for t in range(1, 1 + open_steps):
            g = predict(model, torch.tensor([window[-k:]], dtype=torch.uint8), torch.tensor([actions[t]]))[0].tolist()
            if g.count(ROBOT) != 1:
                break
            n += 1
            window.append(g)
        kept.append(n)
    return dict(
        changedAccuracy=round((pred[changed] == nxt[changed]).float().mean().item(), 4),
        robotCell=round((pred[robot_cell] == ROBOT).float().mean().item(), 4),
        crateNext=round(crate_hits / crate_n, 4),
        cellAccuracy=round((pred == nxt).float().mean().item(), 4),
        openLoopMedian=statistics.median(kept),
        openLoopAll=sum(n == open_steps for n in kept) / len(kept),
    )


def train(k, rolls, a):
    torch.manual_seed(a.seed + k)
    gen = torch.Generator().manual_seed(a.seed + k)
    model = WorldNet(k, a.channels)
    opt = torch.optim.Adam(model.parameters(), lr=a.lr)
    ctx, act, nxt, _ = samples(rolls, k)
    curve, run = [], float('nan')
    for s in range(1, a.steps + 1):
        for g in opt.param_groups:
            g['lr'] = a.lr * 0.5 * (1 + math.cos(math.pi * (s - 1) / a.steps))
        i = torch.randint(len(ctx), (a.batch,), generator=gen)
        logits = model(encode(ctx[i], act[i])).reshape(a.batch, 4, SIZE * SIZE)
        loss = F.cross_entropy(logits, nxt[i])
        opt.zero_grad(set_to_none=True)
        loss.backward()
        opt.step()
        run = 0.99 * run + 0.01 * loss.item() if s > 1 else loss.item()
        if s % a.every == 0 or s == a.steps:
            curve.append(dict(step=s, loss=round(run, 4)))
            print(f'k{k} step {s:6d} loss {run:.4f}')
    return model, curve


def goldens(m64, rolls, k, picks):
    """Logits in float64 at the 3x3 cells round the robot and the crate, for five held-out steps."""
    out = []
    for r, t in picks:
        frames, actions, _, _ = rolls[r]
        ctx = frames[t + 1 - k:t + 1]
        x = encode(torch.tensor([ctx]), torch.tensor([actions[t]]), torch.float64)
        with torch.no_grad():
            lg = m64(x)[0].reshape(4, SIZE * SIZE)
        g = frames[t]
        cells = sorted({(cy + dy) * SIZE + cx + dx
                        for c in (g.index(ROBOT), g.index(CRATE)) for cx, cy in [(c % SIZE, c // SIZE)]
                        for dy in (-1, 0, 1) for dx in (-1, 0, 1) if inside(cx + dx) and inside(cy + dy)})
        out.append(dict(frames=[text(f) for f in ctx], action=actions[t], cells=cells,
                        logits=[[round(lg[j, c].item(), 8) for j in range(4)] for c in cells],
                        guess=text(lg.argmax(0).tolist())))
    return out


def bar(s1, s2, open_steps):
    return (s2['changedAccuracy'] >= 0.9 and s2['robotCell'] >= 0.95 and s2['crateNext'] >= 0.9
            and s1['crateNext'] <= 0.65 and 6 <= s2['openLoopMedian'] < open_steps)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, default=1337)
    ap.add_argument('--channels', type=int, default=16)
    ap.add_argument('--steps', type=int, default=1300)
    ap.add_argument('--batch', type=int, default=64)
    ap.add_argument('--lr', type=float, default=3e-3)
    ap.add_argument('--rollouts', type=int, default=1500)
    ap.add_argument('--length', type=int, default=32, help='ticks per training rollout')
    ap.add_argument('--held-out', type=int, default=300)
    ap.add_argument('--open-steps', type=int, default=16)
    ap.add_argument('--every', type=int, default=100, help='loss-curve sampling interval')
    ap.add_argument('--no-write', action='store_true', help='train and report only (for trying settings)')
    a = ap.parse_args()

    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)
    t0 = time.time()

    # Parity rollouts: three plain ones and the first seed past them whose robot meets the crate both ways.
    parity = [1, 2, 3]
    s = 4
    while True:
        ev = rollout(s, 32)[2]
        if any(e['bounce'] == 'robot' for e in ev) and any(e['blocked'] == 'crate' for e in ev):
            parity.append(s)
            break
        s += 1
    recorded = []
    for s in parity:
        frames, actions, events, _ = rollout(s, 32)
        recorded.append(dict(seed=s, actions=actions, events=events, frames=[text(f) for f in frames]))

    train_rolls = [rollout(s, a.length) for s in range(1, a.rollouts + 1)]
    held = [rollout(HELD_OUT + i, max(32, a.open_steps + 2)) for i in range(a.held_out)]
    models, scores, curves = {}, {}, {}
    for k in (1, 2):
        models[k], curves[k] = train(k, train_rolls, a)
        f16 = {n: v.to(torch.float16) for n, v in models[k].state_dict().items()}
        m64 = WorldNet(k, a.channels).double()
        m64.load_state_dict({n: v.to(torch.float64) for n, v in f16.items()})
        models[k] = (f16, m64)
        scores[k] = score(m64, held, k, a.open_steps)  # scored as shipped: the Float16 weights
        print(f'k{k}', scores[k])
    ok = bar(scores[1], scores[2], a.open_steps)
    print(f'bar {"holds" if ok else "MISSED"}; {time.time() - t0:.1f}s')
    if a.no_write or not ok:
        return

    os.makedirs(os.path.join(ROOT, 'data/video-models'), exist_ok=True)
    with open(os.path.join(ROOT, 'data/video-models/rollouts.json'), 'w') as fh:
        json.dump(dict(rollouts=recorded), fh, indent=1)
    out = os.path.join(ROOT, 'public/data/video-models')
    os.makedirs(out, exist_ok=True)
    picks = [(0, 1), (1, 5), (2, 9), (3, 14), (4, 20)]
    meta = dict(
        world=dict(size=SIZE, belt=BELT, kinds=KINDS, actions=ACTIONS),
        training=dict(seed=a.seed, steps=a.steps, batch=a.batch, lr=a.lr, schedule='cosine to 0', optimizer='Adam',
                      rollouts=a.rollouts, length=a.length, torch=torch.__version__),
        heldOut=dict(firstSeed=HELD_OUT, rollouts=a.held_out, openSteps=a.open_steps),
        models={},
    )
    for k in (1, 2):
        f16, m64 = models[k]
        layout, blob = [], bytearray()
        for name, w in f16.items():
            layout.append(dict(name=name, shape=list(w.shape), offset=len(blob)))
            blob += w.numpy().astype('<f2').tobytes()
        with open(os.path.join(out, f'k{k}.bin'), 'wb') as fh:
            fh.write(blob)
        meta['models'][f'k{k}'] = dict(
            k=k, channels=a.channels, params=sum(w.numel() for w in f16.values()), dtype='float16-le',
            bytes=len(blob), tensors=layout, lossCurve=curves[k], scores=scores[k],
            goldens=goldens(m64, held, k, picks))
        print(f'wrote k{k}.bin ({len(blob)} bytes)')
    with open(os.path.join(out, 'meta.json'), 'w') as fh:
        json.dump(meta, fh, indent=1)
    print('wrote meta.json, rollouts.json')


if __name__ == '__main__':
    main()
