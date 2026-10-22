// What chapters 1–7 read off Larkspur mini: every prediction's outcome is computed from the live trace or weights,
// never typed, and chapter 4's named head finds the start of the word on every prompt the chapter offers.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { trace, wordStart, HEAD } from '../../src/lib/transformers/trace';
import { costs } from '../../src/lib/transformers/costs';
import { entropy, TEMPERATURES, TOP_PS } from '../../src/lib/transformers/sample';
import { CTX } from '../../src/content/transformers/kit';
import * as ch1 from '../../src/content/transformers/01-one-token-at-a-time';
import * as ch2 from '../../src/content/transformers/02-tokens-become-vectors';
import * as ch3 from '../../src/content/transformers/03-attention';
import * as ch4 from '../../src/content/transformers/04-heads-and-layers';
import * as ch5 from '../../src/content/transformers/05-choosing-the-next-token';
import * as ch6 from '../../src/content/transformers/06-why-long-prompts-cost-more';
import { TRANSFORMERS_MODULE as M } from '../../src/content/transformers/module';

const b = readFileSync('public/data/lm/model.bin');
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const model = parseModel(meta, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);

describe('chapter 1: one token at a time', () => {
  it('every option is one token of the vocabulary', () => {
    for (const p of ch1.PIECES) expect(encode(p), p).toHaveLength(1);
  });
  it('the prediction’s answer is the trace’s top token, which is the prompt’s expected one', () => {
    const top = trace(model, ch1.PROMPT.text).top.at(-1)![0].text;
    expect(ch1.PIECES[ch1.answerOf(model)]).toBe(top);
    expect(top).toBe(ch1.PROMPT.expected);
  });
  it('each added token is the top token of the run before it', () => {
    const { text, added } = ch1.grown(model, ch1.ADD);
    expect(added).toHaveLength(ch1.ADD);
    expect(added[0]).toBe(ch1.PROMPT.expected);
    expect(text).toBe(ch1.PROMPT.text + added.join(''));
  });
});

describe('chapter 2: tokens become vectors', () => {
  it('the token appears twice, and both copies look up the same row but start from different sums', () => {
    expect(ch2.COPIES).toHaveLength(2);
    const [a, b2] = ch2.COPIES.map(t => ch2.inputOf(model, t));
    expect(a.token).toEqual(b2.token);
    expect(a.sum).not.toEqual(b2.sum);
    expect(a.token).toHaveLength(meta.model.d_model);
    expect(ch2.outcomeOf(model)).toBe(1);
  });
});

describe('chapter 3: attention', () => {
  it('every head gives every later token 0 on every prompt offered (the mask), and rows sum to 1', () => {
    expect(ch3.outcomeOf(model)).toBe(0);
    for (const p of ch3.OFFERED)
      for (const rows of trace(model, p.text).attention.flat())
        for (const r of rows) expect(r.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
  });
});

describe('chapter 4: heads and layers', () => {
  it('the prediction’s query ends a three-token word, and the named head weighs where the word began most', () => {
    expect(ch4.QUERY).toBeGreaterThan(1);
    expect(ch4.outcomeOf(model)).toBe(0);
    expect(HEAD.kind).toBe('word-start');
  });
  it.each(ch4.OFFERED.map(p => [p.id, p] as const))('the named head’s pattern holds on “%s”', (_, p) => {
    const t = trace(model, p.text);
    const w = wordStart(
      t.tokens.map(x => x.id),
      t.attention[HEAD.layer][HEAD.head],
    );
    expect(w.n).toBeGreaterThan(0);
    expect(w.score).toBeGreaterThanOrEqual(2 * w.uniform);
    expect(ch4.scoreOf(model, p.text)).toEqual(w);
  });
});

describe('chapter 5: choosing the next token', () => {
  it('raising the temperature from 1 to 1.5 flattens the bar (the prediction’s answer)', () => {
    expect(ch5.outcomeOf(model)).toBe(0);
    expect(entropy(ch5.distOf(model, 1.5, 1))).toBeGreaterThan(entropy(ch5.distOf(model, 1, 1)));
  });
  it('the same settings and seed give the same continuation; temperature 0 ignores the seed', () => {
    const s = { t: 4, p: 5, seed: 3 };
    expect(ch5.continuation(model, s)).toBe(ch5.continuation(model, { ...s }));
    expect(ch5.continuation(model, { t: 0, p: 5, seed: 1 })).toBe(ch5.continuation(model, { t: 0, p: 5, seed: 9 }));
  });
  it('the quiz’s “drift off the documents at 1.5” holds: the reveal’s draw (seed 1) leaves the greedy “days”', () => {
    const [t0, hot, all] = [TEMPERATURES.indexOf(0), TEMPERATURES.indexOf(1.5), TOP_PS.indexOf(1)];
    expect(ch5.continuation(model, { t: t0, p: all, seed: 1 }).startsWith(ch5.PROMPT.expected)).toBe(true);
    expect(ch5.continuation(model, { t: hot, p: all, seed: 1 }).startsWith(ch5.PROMPT.expected)).toBe(false);
  });
  it('lowering top-p keeps fewer tokens', () => {
    expect(ch5.keptOf(model, 4, 0)).toBeLessThan(ch5.keptOf(model, 4, 5));
    expect(ch5.keptOf(model, 4, 5)).toBe(meta.model.vocab);
  });
  it('top-p 1 keeps the whole vocabulary at every temperature above 0', () => {
    const all = TOP_PS.indexOf(1);
    TEMPERATURES.forEach((t, i) => {
      if (t > 0) expect(ch5.keptOf(model, i, all), `T=${t}`).toBe(meta.model.vocab);
    });
  });
});

describe('a resumed run saved under older lists', () => {
  it('chapters 3 and 4 fall back to the first offered prompt for a prompt id they no longer offer', () => {
    for (const ch of [ch3, ch4]) {
      expect(ch.textOf('gone')).toBe(ch.OFFERED[0].text);
      expect(ch.textOf(ch.OFFERED[1].id)).toBe(ch.OFFERED[1].text);
    }
  });
  it('chapter 5 clamps saved slider positions into TEMPERATURES and TOP_PS', () => {
    const [tN, pN] = [TEMPERATURES.length - 1, TOP_PS.length - 1];
    expect(ch5.continuation(model, { t: 99, p: -3, seed: 2 })).toBe(ch5.continuation(model, { t: tN, p: 0, seed: 2 }));
    expect(ch5.keptOf(model, 99, 99)).toBe(ch5.keptOf(model, tN, pN));
    expect(ch5.keptOf(model, -1, pN)).toBe(1);
  });
});

describe('chapter 6: why long prompts cost more', () => {
  it('the text fills the window, and doubling the prompt about quadruples the pairs (the prediction’s answer)', () => {
    expect(ch6.IDS).toHaveLength(CTX);
    expect(ch6.outcomeOf()).toBe(1);
    expect(costs(meta.model, 2 * ch6.SHORT).pairs / costs(meta.model, ch6.SHORT).pairs).toBeGreaterThan(3);
  });
  it('each token adds the same to the cache, and one more pair than the token before it', () => {
    const a = ch6.countsOf(10),
      b2 = ch6.countsOf(11);
    expect(b2.newKv).toBe(a.newKv);
    expect(b2.newPairs).toBe(a.newPairs + 1);
  });
});

describe('the registry entry', () => {
  it('has seven chapters, each with a full intro, and the six intro terms across chapters 1–4', () => {
    expect(M.chapters).toHaveLength(7);
    for (const c of M.chapters) {
      expect(c.intro.learn).toHaveLength(3);
      expect(c.intro.terms.length).toBeGreaterThan(0);
    }
    const terms = M.chapters.slice(0, 4).flatMap(c => c.intro.terms.map(([t]) => t.toLowerCase()));
    for (const t of ['model', 'next-token prediction', 'embedding', 'attention', 'head', 'layer'])
      expect(terms).toContain(t);
  });
  it('recall covers every chapter with exactly one pinned item, first', () => {
    for (const c of M.chapters) expect(M.recall!.filter(i => i.chapter === c.id).length).toBeGreaterThanOrEqual(3);
    expect(M.recall!.filter(i => i.pin)).toHaveLength(1);
    expect(M.recall![0].pin).toBe(true);
  });
});
