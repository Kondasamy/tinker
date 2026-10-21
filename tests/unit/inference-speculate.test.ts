// Inference's speculative decoding (KTD7): the student drafts, Larkspur mini checks, and the output is plain greedy
// decoding's, token for token, with no checking pass ever cut short by the context.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { forward } from '../../src/lib/lm/model';
import { parseModel, parseStudent, type Meta } from '../../src/lib/lm/load';
import { encode } from '../../src/lib/lm/bpe';
import { KS, argmax, greedy, maxNew, speculate } from '../../src/lib/inference/speculate';
import P from '../../data/inference/prompts.json' with { type: 'json' };

const disk = (f: string) => { const b = readFileSync('public/data/lm/' + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const base = parseModel(meta, disk('model.bin')), student = parseStudent(meta, disk('student.bin'));
// the chapter prompts, plus one long enough that the context cap binds
const PROMPTS = [...P.prompts.map(p => p.text), 'Our warehouse inspects returned items within five business days. Expedited delivery takes two business'];

describe('speculative decoding', () => {
  for (const text of PROMPTS) for (const k of KS) {
    it(`k = ${k}, “${text.slice(0, 24)}…”: the same output as greedy, every check within the context`, () => {
      const ids = encode(text), r = speculate(base, student, ids, k, P.write);
      expect(r.out).toEqual(greedy(base, ids, P.write));
      expect(r.rounds.every(x => !x.truncated)).toBe(true);
      expect(ids.length + r.out.length - 1).toBeLessThanOrEqual(base.config.ctx);
      expect(r.rate).toBeGreaterThanOrEqual(0);
      expect(r.rate).toBeLessThanOrEqual(1);
      expect(r.accepted + r.checks).toBe(r.out.length);
      if (k === 0) { expect(r.checks).toBe(r.out.length); expect(r.drafted).toBe(0); }
    });
  }

  it('a long prompt stops at the context limit, and says so', () => {
    const ids = encode(PROMPTS.at(-1)!), r = speculate(base, student, ids, 4, 40);
    expect(r.capped).toBe(true);
    expect(r.out).toHaveLength(maxNew(base, ids));
    expect(r.out).toEqual(greedy(base, ids, 40));
  });

  it('greedy is the argmax of a full forward pass at each step', () => {
    const ids = encode(P.prompts[0].text), out = greedy(base, ids, 3);
    expect(out[0]).toBe(argmax(forward(base, ids).logits.at(-1)!));
    expect(out[1]).toBe(argmax(forward(base, [...ids, out[0]]).logits.at(-1)!));
  });

  it('the student guesses well enough to save passes on the chapter prompt', () => {
    const r = speculate(base, student, encode(P.prompts[0].text), 2, P.write);
    expect(r.rate).toBeGreaterThan(0.3);
    expect(r.perCheck).toBeGreaterThan(1.5);
  });
});
