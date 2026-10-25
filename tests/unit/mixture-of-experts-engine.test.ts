// Mixture of experts' engine (KTD4, KTD11, KTD12): every pinned prompt's expected token in the toy's top 5, the pinned
// override changing the guess, held-out route shares as meta.json has them, capacity's drops, the cards' active maths
// within 2% of the published counts, the toy's own counts and bytes, and the workbench's WINNERS.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { modelLoader } from '../../src/lib/lm/load';
import type { Model } from '../../src/lib/lm/model';
import { encode } from '../../src/lib/lm/bpe';
import { memory } from '../../src/lib/inference/quantize';
import { PROMPTS, ROOMS, promptOf, routeShares, run } from '../../src/lib/mixture-of-experts/routes';
import { FACTORS, capacityOf, capped } from '../../src/lib/mixture-of-experts/capacity';
import { CARDS, TOY, bytesAt, count } from '../../src/lib/mixture-of-experts/cards';
import { PLANS, START, WINNERS, judge, solve, wins } from '../../src/lib/mixture-of-experts/workbench';
import PINNED from '../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import META from '../../public/data/mixture-of-experts/meta.json' with { type: 'json' };
import IDS from '../../data/lm/ids.json' with { type: 'json' };

const DIR = 'public/data/mixture-of-experts/';
const disk = async (f: string) => {
  const b = readFileSync(DIR + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const tok = (piece: string) => {
  const ids = encode(piece);
  expect(ids).toHaveLength(1);
  return ids[0];
};

let model: Model;
beforeAll(async () => {
  model = await modelLoader(disk, 'moe').load();
});

describe('the toy’s routes', () => {
  it.each(PROMPTS.map(p => [p.id, p] as const))('“%s” has its expected token in the top 5', (_, p) => {
    expect(run(model, p.ids).top.map(g => g.tok)).toContain(p.expected);
  });

  it('every chapter’s prompt is a pinned prompt', () => {
    for (const [k, id] of Object.entries(PINNED.chapters)) if (k !== 'note') expect(() => promptOf(id)).not.toThrow();
  });

  it('the pinned override changes the guess; the router alone keeps it', () => {
    const o = PINNED.override,
      p = promptOf(o.prompt),
      last = p.ids.length - 1;
    expect(run(model, p.ids).top[0].tok).toBe(tok(o.before));
    expect(run(model, p.ids, { [last]: o.experts }).top[0].tok).toBe(tok(o.after));
  });

  it('two rooms run per token per floor, and an override lights the chosen ones in every floor', () => {
    const p = promptOf('reply'),
      last = p.ids.length - 1;
    for (const layer of run(model, p.ids).routes) for (const r of layer) expect(r.experts).toHaveLength(2);
    const forced = run(model, p.ids, { [last]: [5, 6] }).routes;
    for (const layer of forced) expect(layer[last].experts).toEqual([5, 6]);
  });

  it('per-expert load over held-out text matches meta.json’s shares', () => {
    const shares = routeShares(model, IDS.splits.heldout.ids);
    shares.forEach((row, l) => row.forEach((v, e) => expect(v).toBeCloseTo(META.routeShares.layers[l][e], 3)));
  });

  it('the rooms copy in pinned.json is meta.json’s', () => {
    expect(ROOMS.params).toBe(META.model.params);
    expect(ROOMS.active).toBe(META.active);
    expect(ROOMS.heldoutTop5).toBe(META.heldout.top5);
    expect(ROOMS.dense).toEqual({ params: META.dense.model.params, top5: META.dense.heldout.top5 });
    expect(ROOMS.baseTop5).toBe(META.base.heldout.top5);
    expect(ROOMS.shares).toEqual(META.routeShares.layers);
    expect(ROOMS.tops).toEqual(META.topTokens.layers.map(l => l.map(e => e.map(t => t.piece))));
  });

  it('the card picture is the model’s own routes and guess', () => {
    const c = PINNED.card,
      p = promptOf(c.prompt);
    expect(c.tokens).toEqual(p.ids);
    const r = run(model, p.ids);
    expect(r.routes.map(l => l.at(-1)!.experts)).toEqual(c.lit);
    expect(r.top[0].tok).toBe(c.guess);
  });
});

describe('capacity', () => {
  it('is ⌈factor × tokens × k / experts⌉', () => {
    expect(capacityOf(1, 14)).toBe(4);
    expect(capacityOf(2, 14)).toBe(7);
    expect(capacityOf(1.5, 7)).toBe(3);
  });
  it('drops the pinned tokens at each factor, none at 2, and the guess reruns without their work', () => {
    const c = PINNED.capacity,
      p = promptOf(c.prompt);
    for (const f of FACTORS) {
      const key = f === null ? 'none' : String(f),
        out = capped(model, p.ids, f);
      expect(out.dropped.length, key).toBe(c.dropped[key as keyof typeof c.dropped]);
      expect(out.pass.top[0].tok, key).toBe(tok(c.guess[key as keyof typeof c.guess]));
      if (out.capacity !== null)
        for (const d of out.drops) expect(out.asked[d.layer][d.expert]).toBeGreaterThan(out.capacity);
    }
    expect(capped(model, p.ids, 2).drops).toEqual([]);
  });
});

describe('model cards', () => {
  it.each(CARDS.map(c => [c.name, c] as const))(
    '%s: the shape’s maths is within 2% of the published counts',
    (_, c) => {
      const n = count(c);
      expect(Math.abs(n.total / c.total - 1)).toBeLessThan(0.02);
      expect(Math.abs(n.active / c.active - 1)).toBeLessThan(0.02);
      expect(n.active).toBeLessThanOrEqual(n.total);
    },
  );
  it('the toy’s counts are its tensors: every expert in memory, two of eight at work', () => {
    const total = Object.values(model.tensors).reduce((a, t) => a + t.length, 0);
    const idle = Object.entries(model.tensors)
      .filter(([name]) => /experts\.\d+\./.test(name))
      .reduce((a, [, t]) => a + t.length, 0);
    expect(total).toBe(TOY.total);
    expect(total - (idle * (TOY.experts - TOY.topK)) / TOY.experts).toBe(TOY.active);
    expect(memory(model, 16).bytes).toBe(bytesAt(TOY.total, 16));
    expect(memory(model, 16).bytes).toBe(META.bytes);
  });
});

describe('the workbench', () => {
  it('WINNERS are every passing plan with the most total weights', () => {
    expect(solve()).toEqual(WINNERS);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) expect(judge(w).ok).toBe(true);
  });
  it('the start fails, and every card fails somewhere or loses on size', () => {
    expect(judge(START).ok).toBe(false);
    expect(wins(START)).toBe(false);
    expect(PLANS.filter(p => !judge(p).fitsMemory).length).toBeGreaterThan(0);
    expect(PLANS.filter(p => !judge(p).fitsCompute).length).toBeGreaterThan(0);
  });
});
