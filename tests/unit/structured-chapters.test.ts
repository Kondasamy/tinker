// The chapters' reveals are read off live runs; these hold the copy's claims about them, so a retrain that changes an
// outcome fails here (and means new prompts, KTD4), not silently in the story.
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { diskModel } from '../../src/lib/transformers/diskModel';
import * as c1 from '../../src/content/structured-outputs/01-asking-nicely';
import * as c2 from '../../src/content/structured-outputs/02-a-schema-is-a-contract';
import * as c3 from '../../src/content/structured-outputs/03-the-mask';
import * as c4 from '../../src/content/structured-outputs/04-tokens-are-not-characters';
import * as c5 from '../../src/content/structured-outputs/05-choices-from-a-list';
import * as c6 from '../../src/content/structured-outputs/06-valid-isnt-right';
import * as c7 from '../../src/content/structured-outputs/07-workbench';
import { RECALL } from '../../src/content/structured-outputs/recall';
import { STRUCTURED_OUTPUTS_MODULE as M } from '../../src/content/structured-outputs/module';

const model = diskModel();

describe('structured outputs chapters', () => {
  it('ch1: asked nicely, Larkspur mini writes something that isn’t JSON', () => expect(c1.answerOf(model)).toBe(1));
  it('ch2: no try passes the check, and every try costs tokens', () => {
    expect(c2.answerOf(model)).toBe(2);
    for (const t of c2.triesOf(model)) expect(t.tokens).toBeGreaterThan(0);
  });
  it('ch3: the schema allows one token at step 1, and the model’s own choice is blocked somewhere', () => {
    expect(c3.answerOf(model)).toBe(2);
  });
  it('ch4: near the cap only tokens that fit whole are allowed, and fewer than before; the quiz’s tokens exist', () => {
    expect(c4.answerOf(model)).toBe(1);
    const c = c4.capStep(model);
    expect(c.allowed).toBeLessThan(c.before);
    expect(encode('30')).toHaveLength(1);
    expect(encode(' 30')).toHaveLength(1);
  });
  it('ch5: the pick is the model’s preference, not the list’s first value', () => expect(c5.answerOf(model)).toBe(1));
  it('ch6: the order number is valid and not the one in the prompt', () => expect(c6.answerOf(model)).toBe(1));
  it('ch7: asking the model for every field gets no order valid and right', () => expect(c7.answerOf(model)).toBe(2));
});

describe('structured outputs recall bank', () => {
  it('covers every chapter with three items, one pinned and first; every option has a why', () => {
    for (const ch of M.chapters) expect(RECALL.filter(r => r.chapter === ch.id)).toHaveLength(3);
    expect(RECALL.filter(r => r.pin)).toHaveLength(1);
    expect(RECALL[0].pin).toBe(true);
    for (const r of RECALL) expect(r.why).toHaveLength(r.options.length);
  });
  it('the answer’s place varies, and each why stays with its option', () => {
    expect(new Set(RECALL.map(r => r.correct)).size).toBe(3);
    for (const r of RECALL) expect(r.why[r.correct]).toMatch(/^Right\./);
  });
});
