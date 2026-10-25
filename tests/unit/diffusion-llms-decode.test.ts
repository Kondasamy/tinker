// Diffusion LMs' decoder (KTD11): passes follow ⌈L / k⌉, stamped slots stay stamped, confidence remasking stamps the
// surest slots, random remasking replays from its seed, every pinned reply comes out again, and Larkspur mini's
// baseline takes a pass per token.
import { beforeAll, describe, expect, it } from 'vitest';
import type { Model } from '../../src/lib/lm/model';
import {
  KS,
  L,
  MASK,
  RULES,
  agreeing,
  decode,
  passesFor,
  repeating,
  show,
  typewriter,
} from '../../src/lib/diffusion-llms/decode';
import { diskMini, diskMlm } from '../../src/lib/diffusion-llms/diskModel';
import { PHRASES } from '../../src/lib/diffusion-llms/workbench';
import PINNED from '../../data/diffusion-llms/prompts.json' with { type: 'json' };

let mlm: Model;
beforeAll(() => {
  mlm = diskMlm();
});
const p1 = PHRASES[0];

describe('passes', () => {
  it('takes ⌈L / k⌉ passes: one at k = L, L at k = 1', () => {
    expect(decode(mlm, p1.ids, L, 'confidence', 1).passes).toHaveLength(1);
    expect(decode(mlm, p1.ids, 1, 'confidence', 1).passes).toHaveLength(L);
    for (const k of KS) for (const n of [4, 8, 16]) expect(passesFor(k, n)).toBe(Math.ceil(n / k));
    expect(decode(mlm, p1.ids, 4, 'random', 1, 8).passes).toHaveLength(2);
  });

  it('never masks a stamped slot again, and fills every slot', () => {
    for (const rule of RULES) {
      const f = decode(mlm, p1.ids, 2, rule, 3);
      const seen = new Set<number>();
      f.passes.forEach((pass, n) => {
        for (const i of pass.stamped) {
          expect(seen.has(i)).toBe(false);
          expect(f.at[i]).toBe(n);
          seen.add(i);
        }
        for (const i of seen) if (!pass.stamped.includes(i)) expect(pass.guesses[i]).toBeNull();
      });
      expect(seen.size).toBe(L);
      expect(f.reply).not.toContain(MASK);
    }
  });

  it('confidence remasking stamps the k surest slots of each pass', () => {
    const f = decode(mlm, p1.ids, 4, 'confidence', 1);
    for (const pass of f.passes) {
      const open = pass.guesses.flatMap((g, i) => (g ? [{ i, p: g.p }] : []));
      const floor = Math.min(...pass.stamped.map(i => pass.guesses[i]!.p));
      for (const o of open) if (!pass.stamped.includes(o.i)) expect(o.p).toBeLessThanOrEqual(floor);
    }
  });

  it('replays random remasking from its seed', () => {
    const a = decode(mlm, p1.ids, 4, 'random', 7),
      b = decode(mlm, p1.ids, 4, 'random', 7);
    expect(a.reply).toEqual(b.reply);
    expect(a.at).toEqual(b.at);
  });
});

describe('the pinned replies', () => {
  it('come out again for every phrase, rule and k, and never hold [MASK]', () => {
    for (const p of PHRASES)
      for (const rule of RULES)
        for (const k of KS) {
          const r = decode(mlm, p.ids, k, rule, p.seed).reply,
            pin = p.replies[rule][k];
          expect(r, `${rule} k=${k} seed ${p.seed}`).toEqual(pin.ids);
          expect(r).not.toContain(MASK);
          expect(agreeing(r, p.replies.confidence[1].ids)).toBe(pin.agree);
          expect(repeating(r)).toBe(pin.repeat);
        }
  }, 120_000);

  it('give up agreement as k grows, and surest-first keeps at least random’s', () => {
    const q = PINNED.quality as Record<string, Record<string, number>>;
    expect(q.confidence[KS.at(-1)!]).toBeLessThan(q.confidence[1]);
    for (const k of KS.slice(1)) expect(q.random[k]).toBeLessThanOrEqual(q.confidence[k]);
  });
});

describe('Larkspur mini, left to right', () => {
  it('takes one pass per token', () => {
    const out = typewriter(diskMini(), p1.ids);
    expect(out).toHaveLength(L);
  });
});

describe('show', () => {
  it('draws newlines, blanks and spaces visibly', () => {
    expect(show(MASK)).toBe('▢');
    expect(show(10)).toBe('↵');
    expect(show(32)).toBe('␣');
  });
});
