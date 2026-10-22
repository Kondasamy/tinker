// What the multimodal chapters say about the recorded readings holds: each chapter's narration is checked against the data
// it describes, and the registry entry is complete.
import { describe, expect, it } from 'vitest';
import { moduleOf } from '../../src/lib/modules';
import { costOf, grade } from '../../src/lib/multimodal/readings';
import { firstLost } from '../../src/content/multimodal/02-size-and-detail';
import { outcome as scanOutcome } from '../../src/content/multimodal/03-reading-a-scan';
import { outcome as fieldsOutcome } from '../../src/content/multimodal/04-pulling-fields-out';
import { outcome as partOutcome } from '../../src/content/multimodal/05-photos-of-parts';
import { outcome as labelOutcome } from '../../src/content/multimodal/06-when-pictures-mislead';
import { START, planOf } from '../../src/content/multimodal/07-workbench';
import { solved, totals, MOST_RIGHT } from '../../src/lib/multimodal/workbench';

describe('multimodal chapters', () => {
  it('is live, Intermediate, after Tokens, with seven chapters and a recall item per chapter, one pinned', () => {
    const m = moduleOf('multimodal');
    expect(m).toMatchObject({ status: 'live', level: 'Intermediate', prereqs: ['tokens'] });
    expect(m.chapters).toHaveLength(7);
    for (const c of m.chapters)
      expect(m.recall!.filter(i => i.chapter === c.id).length, c.id).toBeGreaterThanOrEqual(3);
    expect(m.recall!.filter(i => i.pin)).toHaveLength(1);
  });

  it('chapter 2: the terms go first, the number’s last digit is wrong at 400 px and the total survives', () => {
    expect(firstLost()).toBe('terms');
    const at400 = Object.fromEntries(grade('invoice', 400, 'vision').fields.map(f => [f.id, f.right]));
    expect(at400).toMatchObject({ number: false, total: true, terms: false });
  });

  it('chapter 3: vision keeps the table; OCR breaks the slip and the note', () => {
    expect(scanOutcome()).toBe(1);
    expect(grade('slip', 1600, 'ocr').fields.find(f => f.id === 'brackets')!.right).toBe(false);
  });

  it('chapter 4: both methods right at 1,600 px, OCR far cheaper; at 800 px only the terms fail, for both', () => {
    expect(fieldsOutcome()).toBe(2);
    expect(costOf('invoice', 1600, 'ocr')).toBeLessThan(costOf('invoice', 1600, 'vision'));
    for (const m of ['ocr', 'vision'] as const)
      expect(
        grade('invoice', 800, m)
          .fields.filter(f => !f.right)
          .map(f => f.id),
      ).toEqual(['terms']);
  });

  it('chapter 5: the front reading asks; chapter 6: both label readings carry the instruction', () => {
    expect(partOutcome()).toBe(1);
    expect(labelOutcome()).toBe(1);
  });

  it('chapter 7: the starting plan gets every field but is not best; a bad saved plan falls back to the start', () => {
    expect(totals(START).right).toBe(MOST_RIGHT);
    expect(solved(START)).toBe(false);
    expect(planOf({ invoice: { method: 'nope', size: 7 } } as never)).toEqual(START);
  });
});
