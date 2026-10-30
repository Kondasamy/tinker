// Models on your device (KTD4, KTD7): Larkspur mini's greedy replies at 16, 8, 4 and 2 bits rerun to their pins; the
// memory, battery and heat sums hold to their formulas and pins; WINNERS recomputes; Inference's BITS and model.bin
// are unchanged. Regenerate the pins with WRITE_PINNED=1 pnpm vitest run tests/unit/on-device-engine.test.ts
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diskModel } from '../../src/lib/transformers/diskModel';
import { decode } from '../../src/lib/lm/bpe';
import { BITS as INFERENCE_BITS, memory } from '../../src/lib/inference/quantize';
import {
  BITS,
  BRICK,
  bricksOf,
  cacheBytes,
  CRATE,
  FREE,
  fits,
  kvPerToken,
  SIZES,
  sizeOf,
  sizeText,
  weightBytes,
} from '../../src/lib/on-device/memory';
import {
  BATTERY_MWH,
  energyPerReply,
  LENGTHS,
  levelAfter,
  repliesPerCharge,
  rush,
  SHIFT,
  TOKENS,
} from '../../src/lib/on-device/battery';
import { PROMPT, REPLIES, reply } from '../../src/lib/on-device/replies';
import { PLANS, solve, START, WINNERS, wins } from '../../src/lib/on-device/workbench';
import { fact } from '../../src/lib/on-device/facts';
import pinned from '../../data/on-device/pinned.json' with { type: 'json' };

const PINNED = 'data/on-device/pinned.json';
const m = diskModel();
const grid = () =>
  SIZES.flatMap(s =>
    BITS.flatMap(bits =>
      LENGTHS.map(length => ({
        size: s.id,
        bits,
        length,
        weights: weightBytes(s, bits),
        fits: fits(s, bits),
        replies: repliesPerCharge(s, bits, length),
      })),
    ),
  );
const derive = () => ({
  replies: {
    prompt: PROMPT,
    at: BITS.map(bits => {
      const ids = reply(m, bits);
      return { bits, ids, text: decode(ids) };
    }),
  },
  memory: {
    mini: BITS.map(bits => ({ bits, bytes: memory(m, bits).bytes })),
    kvPerToken: Object.fromEntries(SIZES.map(s => [s.id, kvPerToken(s)])),
  },
  battery: {
    grid: grid(),
    rush: LENGTHS.map(length => ({ length, ...rush(sizeOf('3b'), 4, length) })),
  },
  workbench: { winners: solve(PLANS) },
});

if (process.env.WRITE_PINNED)
  it('regenerates the pins', () => {
    writeFileSync(PINNED, `${JSON.stringify(derive(), null, 2)}\n`);
  });

describe('Larkspur mini at fewer bits', () => {
  it('model.bin is the file every module pins', () => {
    expect(createHash('sha256').update(readFileSync('public/data/lm/model.bin')).digest('hex')).toBe(
      'bbeee00ace589152509849245ef72ef9bf337201621b9dd37643eba2b22be2e1',
    );
  });
  it('Inference keeps its own three precisions', () => {
    expect(INFERENCE_BITS).toEqual([16, 8, 4]);
  });
  it('every pinned reply reruns, and its text decodes from its ids', () => {
    expect(derive().replies).toEqual(pinned.replies);
    for (const r of REPLIES) expect(decode(r.ids)).toBe(r.text);
  });
  it('8 bits keeps the full-precision reply; 4 and 2 bits change it', () => {
    const at = (b: number) => REPLIES.find(r => r.bits === b)!.text;
    expect(at(8)).toBe(at(16));
    expect(at(4)).not.toBe(at(16));
    expect(at(2)).not.toBe(at(16));
  });
});

describe('memory', () => {
  it('Larkspur mini’s cache per token comes from its config: keys and values, 16 bits, every layer', () => {
    const c = m.config;
    expect(kvPerToken(sizeOf('mini'))).toBe(2 * c.n_layer * c.d_model * 2);
    expect(sizeOf('mini').params).toBe(c.params ?? 51072);
  });
  it('params × bits ÷ 8 is Larkspur mini’s real count without the row scales and vectors', () => {
    const s = sizeOf('mini');
    expect(weightBytes(s, 16)).toBe(memory(m, 16).bytes);
    for (const bits of [8, 4, 2]) {
      expect(memory(m, bits).bytes).toBeGreaterThan(weightBytes(s, bits));
      expect(memory(m, bits).bytes / weightBytes(s, bits)).toBeLessThan(1.5);
    }
    expect(pinned.memory).toEqual(derive().memory);
  });
  it('chapter 1: neither phone model fits at 16 bits; the 1B fits at 8, the 3B only at 4', () => {
    const [b1, b3] = [sizeOf('1b'), sizeOf('3b')];
    expect(fits(b1, 16)).toBe(false);
    expect(fits(b1, 8)).toBe(true);
    expect(fits(b3, 8)).toBe(false);
    expect(fits(b3, 4)).toBe(true);
  });
  it('chapter 3: the 3B at 4 bits fits with a short context and overflows at 4,000 tokens', () => {
    const s = sizeOf('3b');
    expect(fits(s, 4, 2000)).toBe(true);
    expect(fits(s, 4, 4000)).toBe(false);
    expect(cacheBytes(s, 4000)).toBe(4000 * 114_688);
  });
  it('bricks: the crate holds 16, any bytes take one', () => {
    expect(BRICK * CRATE).toBe(FREE);
    expect(bricksOf(0)).toBe(0);
    expect(bricksOf(1)).toBe(1);
    expect(bricksOf(FREE)).toBe(CRATE);
    expect(bricksOf(FREE + 1)).toBe(CRATE + 1);
  });
  it('sizes read in KB, MB or GB', () => {
    expect(sizeText(102_144)).toBe('102 KB');
    expect(sizeText(229_376_000)).toBe('229 MB');
    expect(sizeText(2_460_000_000)).toBe('2.46 GB');
  });
});

describe('battery and heat', () => {
  it('replies per charge is the battery over the energy per reply, everywhere on the grid', () => {
    for (const g of pinned.battery.grid) {
      const s = sizeOf(g.size as 'mini');
      expect(g.replies).toBe(Math.floor(BATTERY_MWH / energyPerReply(s, g.bits, g.length as 'long')));
    }
    expect(pinned.battery).toEqual(derive().battery);
  });
  it('the 3B at 4 bits lands in MELTing point’s measured range for long replies', () => {
    const [lo, hi] = [490, 590];
    expect(fact('melt-energy').claim).toContain(`${lo} to ${hi}`);
    const r = repliesPerCharge(sizeOf('3b'), 4, 'long');
    expect(r).toBeGreaterThanOrEqual(lo);
    expect(r).toBeLessThanOrEqual(hi);
    expect(TOKENS.long).toBe(135);
  });
  it('long replies drain a shift’s tank; short ones leave most of it', () => {
    const s = sizeOf('3b');
    expect(repliesPerCharge(s, 4, 'long')).toBeLessThan(SHIFT);
    expect(repliesPerCharge(s, 4, 'short')).toBeGreaterThan(SHIFT);
    expect(levelAfter(s, 4, 'long', 8)).toBe(0);
    expect(levelAfter(s, 4, 'short', 8)).toBeGreaterThan(0.5);
  });
  it('a rush of long replies throttles and takes longer than its cool time; short ones stay cool', () => {
    const s = sizeOf('3b'),
      long = rush(s, 4, 'long'),
      short = rush(s, 4, 'short');
    expect(long.hot).toBe(true);
    expect(long.seconds).toBeGreaterThan(long.coolSeconds);
    expect(short.hot).toBe(false);
    expect(short.seconds).toBeCloseTo(short.coolSeconds, 9);
  });
});

describe('the workbench', () => {
  it('recomputes WINNERS; the start is not one', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(solve(PLANS)).toEqual(WINNERS);
    expect(wins(START)).toBe(false);
  });
});
