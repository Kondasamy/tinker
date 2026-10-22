// Multimodal's engine (KTD10): live patch counts against Anthropic's documented examples, the downscale rule, OpenAI's
// 32 px rule, deterministic and escaped drawings, live grading of the recorded readings, and the workbench's winners.
import { describe, expect, it } from 'vitest';
import { HIGH, STANDARD, imageTokens, openaiPatches, resized, visualTokens } from '../../src/lib/multimodal/patches';
import { IMAGES, image, sizeOf, svgOf } from '../../src/lib/multimodal/images';
import { SIZES, grade, costOf, sumCheck, reading } from '../../src/lib/multimodal/readings';
import { KIND_IDS, LEAST_COST, MOST_RIGHT, PLANS, WINNERS, solved, totals } from '../../src/lib/multimodal/workbench';
import { FACTS, fact } from '../../src/lib/multimodal/facts';

describe('patches', () => {
  it('1000 × 1000 is 1,296 visual tokens, the docs’ worked example', () => {
    expect(visualTokens(1000, 1000)).toBe(Number(fact('example-1000').value));
    expect(imageTokens(1000, 1000).tokens).toBe(1296);
    expect(imageTokens(1000, 1000).downscaled).toBe(false);
  });

  it('matches the docs’ table on both tiers, and the A4 resize example', () => {
    expect(imageTokens(200, 200, STANDARD).tokens).toBe(64);
    expect(imageTokens(1092, 1092, STANDARD).tokens).toBe(1521);
    expect(resized(1920, 1080, STANDARD)).toEqual([1456, 819]);
    expect(imageTokens(1920, 1080, STANDARD).tokens).toBe(1560);
    expect(imageTokens(1920, 1080, HIGH).tokens).toBe(2691);
    // the docs' table says 1269 × 952, their reference implementation gives 1270 × 952; both cost 1,564 tokens
    expect(imageTokens(2000, 1500, STANDARD).tokens).toBe(1564);
    expect(imageTokens(2000, 1500, HIGH).tokens).toBe(3888);
    expect(resized(3840, 2160, HIGH)).toEqual([2576, 1449]);
    expect(imageTokens(3840, 2160, HIGH).tokens).toBe(4784);
    expect(resized(1075, 1520, STANDARD)).toEqual([924, 1307]);
  });

  it('a size past the cap is downscaled first, and its count stays within the cap', () => {
    const big = sizeOf(image('invoice'), 3200),
      t = imageTokens(big.w, big.h);
    expect(t.downscaled).toBe(true);
    expect(t.tokens).toBeLessThanOrEqual(HIGH.maxTokens);
    expect(t.cols * t.rows).toBe(t.tokens);
    expect(Math.max(t.w, t.h)).toBeLessThan(3200);
  });

  it('counts rise with size up to the cap', () => {
    const counts = SIZES.map(s => {
      const z = sizeOf(image('invoice'), s);
      return imageTokens(z.w, z.h).tokens;
    });
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1]);
  });

  it('OpenAI’s rule uses 32 px patches', () => {
    expect(Number(fact('openai-32').value)).toBe(32);
    expect(openaiPatches(1000, 1000)).toBe(32 * 32);
  });

  it('every fact has a source URL and the access date', () => {
    for (const f of FACTS) expect(() => new URL(f.source), f.id).not.toThrow();
    expect(fact('vit').accessed).toBe('2026-10-21');
  });
});

describe('images', () => {
  it('every drawing is deterministic, sized to its native pixels, and described', () => {
    for (const im of IMAGES) {
      const a = svgOf(im.id),
        b = svgOf(im.id);
      expect(a, im.id).toBe(b);
      expect(a).toContain(`viewBox="0 0 ${im.w} ${im.h}"`);
      expect(im.alt.length, im.id).toBeGreaterThan(40);
    }
  });

  it('escapes its text', () => {
    const svg = svgOf('label');
    expect(svg).not.toMatch(/<script/i);
    // every text run has no raw markup characters
    for (const m of svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) expect(m[1]).not.toMatch(/[<>"]/);
    expect(svgOf('invoice')).toContain('$1,284.50');
  });

  it('a size keeps the image’s shape, the long edge at the chosen size', () => {
    const z = sizeOf(image('invoice'), 800);
    expect(z.h).toBe(800);
    expect(z.w).toBe(Math.round((800 * image('invoice').w) / image('invoice').h));
    expect(sizeOf(image('note'), 800).w).toBe(800);
  });
});

describe('readings, graded live', () => {
  it('the smallest size misreads a field the largest reads right (chapter 2)', () => {
    const lo = grade('invoice', 400, 'vision'),
      hi = grade('invoice', 3200, 'vision');
    expect(hi.right).toBe(hi.of);
    expect(lo.fields.some(f => !f.right && hi.fields.find(h => h.id === f.id)!.right)).toBe(true);
  });

  it('at 800 px the payment terms go first', () => {
    const g = grade('invoice', 800, 'vision');
    expect(g.fields.filter(f => !f.right).map(f => f.id)).toEqual(['terms']);
  });

  it('OCR loses the table and the handwriting; vision keeps both at 1,600 px (chapter 3)', () => {
    expect(grade('slip', 1600, 'ocr').right).toBeLessThan(grade('slip', 1600, 'ocr').of);
    expect(grade('slip', 1600, 'vision').right).toBe(3);
    expect(grade('note', 1600, 'ocr').right).toBe(0);
    expect(grade('note', 1600, 'vision').right).toBe(3);
  });

  it('OCR text is far cheaper than image tokens on the printed invoice, for the same fields (chapter 4)', () => {
    expect(grade('invoice', 1600, 'ocr').right).toBe(grade('invoice', 1600, 'vision').right);
    expect(costOf('invoice', 1600, 'ocr')).toBeLessThan(costOf('invoice', 1600, 'vision') / 5);
  });

  it('the front photo asks for another angle; the side photo names the part (chapter 5)', () => {
    expect(reading('part-front', 1600, 'vision').fields.part).toBeNull();
    expect(grade('part-side', 1600, 'vision').right).toBe(1);
  });

  it('the fax’s lines don’t add up to the total it read, and the check says so (chapter 6)', () => {
    const c = sumCheck(reading('fax', 1600, 'vision'));
    expect(c).toMatchObject({ ok: false, sum: 968, total: 963 });
    expect(sumCheck(reading('fax', 1600, 'ocr')).ok).toBe(false);
    expect(grade('fax', 1600, 'vision').right).toBe(0);
  });

  it('a missing reading throws', () => {
    expect(() => reading('fax', 400, 'ocr')).toThrow();
  });
});

describe('the workbench', () => {
  it('has every plan, and the best mixes methods: OCR for the printed invoice, vision for the table and the note', () => {
    expect(PLANS.length).toBe(10 ** KIND_IDS.length);
    expect(MOST_RIGHT).toBe(11);
    expect(WINNERS.length).toBeGreaterThan(0);
    for (const w of WINNERS) {
      expect(w.invoice.method).toBe('ocr');
      expect(w.slip.method).toBe('vision');
      expect(w.note.method).toBe('vision');
      expect(solved(w)).toBe(true);
      expect(totals(w).cost).toBe(LEAST_COST);
    }
  });

  it('vision at the largest size everywhere gets every field but is not a best plan', () => {
    const all = Object.fromEntries(KIND_IDS.map(k => [k, { method: 'vision', size: 3200 }])) as never;
    expect(totals(all).right).toBe(MOST_RIGHT);
    expect(solved(all)).toBe(false);
  });
});
