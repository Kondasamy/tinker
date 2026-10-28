// What a model remembers' live engine (U24): extraction, the ranking column, exposure over all 10,000 candidates, the
// output filter and its pinned bypass, all run on the canary model from disk and checked against
// data/memorisation/pinned.json and runs.json.
import { describe, expect, it } from 'vitest';
import { diskCanary } from '../../src/lib/memorisation/diskModel';
import { drip, extract } from '../../src/lib/memorisation/extract';
import { caught, filterReply } from '../../src/lib/memorisation/filter';
import { columnPins, drawSample, exposure, logprobs, rankAmong, rankIn } from '../../src/lib/memorisation/rank';
import { CANARIES, CANDIDATES, RUNS, canaryOf, lineOf, scoreOf } from '../../src/lib/memorisation/story';
import PINNED from '../../data/memorisation/pinned.json' with { type: 'json' };
import SAMPLE from '../../data/memorisation/candidates.json' with { type: 'json' };
import CANARY_FILE from '../../data/memorisation/canaries.json' with { type: 'json' };

const model = diskCanary();
const key = (r: number) => String(r) as keyof typeof PINNED.extract;

describe('the canaries', () => {
  it('are the four planted lines, most repeated first', () => {
    expect(CANARIES.map(c => c.repeats)).toEqual([64, 16, 4, 1]);
    expect(lineOf(CANARIES[0])).toBe(
      CANARY_FILE.shape.replace('{name}', CANARY_FILE.canaries[0].name).replace('{pin}', CANARY_FILE.canaries[0].pin),
    );
  });
});

describe('extraction (chapter 3), live', () => {
  it.each(CANARIES.map(c => [c.repeats, c] as const))('%i repeats: the reply matches the pin', (r, c) => {
    const got = extract(model, c);
    expect({ text: got.text, extracted: got.extracted }).toEqual(PINNED.extract[key(r)]);
    expect(got.reply).toEqual(scoreOf('canary', r).reply);
  });
  it('64 and 16 are recited; 4 and 1 are not, and come back as the 64-repeat PIN', () => {
    expect(CANARIES.filter(c => PINNED.extract[key(c.repeats)].extracted).map(c => c.repeats)).toEqual([64, 16]);
    for (const r of [4, 1]) expect(PINNED.extract[key(r)].text.trim()).toBe(`${canaryOf(64).pin}.`);
  });
});

describe('the ranking column (chapter 4)', () => {
  it('the sample is the pinned uniform draw of 200, none a canary’s PIN', () => {
    const pins = CANARIES.map(c => c.pin);
    expect(SAMPLE.pins).toEqual(drawSample(SAMPLE.seed, 200, pins));
    expect(new Set(SAMPLE.pins).size).toBe(200);
  });
  it.each(CANARIES.map(c => [c.repeats, c] as const))('%i repeats: the true PIN’s rank among 201 is pinned', (r, c) => {
    const col = rankAmong(model, c, columnPins(c, SAMPLE.pins));
    expect(col.lps).toHaveLength(201);
    expect(col.rank).toBe(PINNED.column[key(r)]);
    expect(col.exposure).toBeCloseTo(exposure(201, col.rank), 9);
  });
  it('over all 10,000 candidates the ranks are runs.json’s, offline and live alike', () => {
    for (const c of CANARIES) {
      const lps = logprobs(model, c.prefix.ids, CANDIDATES);
      const rank = rankIn(lps, Number(c.pin));
      expect(rank).toBe(scoreOf('canary', c.repeats).rank);
      expect(exposure(RUNS.candidates, rank)).toBeCloseTo(scoreOf('canary', c.repeats).exposure, 5);
    }
  });
  it('exposure tops out: 64 and 16 repeats both rank first of 10,000', () => {
    expect(scoreOf('canary', 64).exposure).toBe(scoreOf('canary', 16).exposure);
    expect(scoreOf('canary', 64).exposure).toBeCloseTo(Math.log2(10_000), 5);
  });
});

describe('the output filter (chapter 6)', () => {
  it('redacts every four-digit run and leaves other numbers', () => {
    expect(filterReply(' 4719.')).toBe(PINNED.filtered);
    expect(filterReply('PINs 1234 and 5678')).toBe('PINs [redacted] and [redacted]');
    expect(filterReply('Order 12345, part K-207, $49.99')).toBe('Order 12345, part K-207, $49.99');
    expect(caught('7 1 9')).toBe(false);
  });
  it('the pinned bypass: asked one token at a time, every reply passes and together they are the PIN', () => {
    const c = canaryOf(PINNED.bypass.repeats);
    const got = drip(model, c);
    expect(got).toEqual(PINNED.bypass.drip);
    expect(got.some(caught)).toBe(false);
    expect(caught(got.join(' '))).toBe(false);
    expect(got.join('').replace(/\D/g, '')).toBe(c.pin);
  });
});
