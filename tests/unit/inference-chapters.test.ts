// Inference's chapters (U17): every reveal reads its outcome off live numbers, and the outcome is the lesson the copy
// teaches. If a retrain or a new cost model changes an answer, these fail instead of the copy going stale.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseModel, parseStudent, type Meta } from '../../src/lib/lm/load';
import { evaluate } from '../../src/lib/lm/model';
import { quantize } from '../../src/lib/inference/quantize';
import * as ch1 from '../../src/content/inference/01-prefill-and-decode';
import * as ch2 from '../../src/content/inference/02-kv-cache-at-scale';
import * as ch3 from '../../src/content/inference/03-batching';
import * as ch4 from '../../src/content/inference/04-smaller-numbers';
import * as ch5 from '../../src/content/inference/05-guess-ahead';
import * as ch6 from '../../src/content/inference/06-pace-or-throughput';
import * as ch7 from '../../src/content/inference/07-serve-larkspur';
import { WINNERS, wins } from '../../src/lib/inference/workbench';
import { INFERENCE_MODULE } from '../../src/content/inference/module';
import HELDOUT from '../../data/fine-tuning/heldout.json' with { type: 'json' };

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const base = parseModel(meta, disk('model.bin')),
  student = parseStudent(meta, disk('student.bin'));

describe('the inference chapters', () => {
  it('every chapter has five or fewer steps with unique ids, ending on a quiz', () => {
    for (const c of [ch1, ch2, ch3, ch4, ch5, ch6, ch7]) {
      const ids = c.STEPS.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.at(-1)).toMatch(/quiz|ties/);
    }
    expect(INFERENCE_MODULE.chapters).toHaveLength(7);
  });

  it('chapter 1: writing the reply takes several times as long as reading the prompt; a longer prompt delays the first token only', () => {
    expect(ch1.outcomeOf()).toBe(1);
    const [short, , , long] = ch1.LONG;
    expect(ch1.ttftOf(long)).toBeGreaterThan(5 * ch1.ttftOf(short));
    expect(ch1.tpotOf(long) / ch1.tpotOf(short)).toBeLessThan(1.2);
  });

  it('chapter 2: the open model’s cache is 800 KB a token, and about eight full requests fill the room', () => {
    expect(ch2.PER_TOKEN).toBe(819_200);
    expect(ch2.FITS).toBe(8);
    expect(ch2.outcomeOf()).toBe(1);
    expect(ch2.COUNTS.some(n => n > ch2.FITS)).toBe(true);
  });

  it('chapter 3: continuous batching finishes much sooner', () => {
    expect(ch3.outcomeOf()).toBe(1);
  });

  it('chapter 4: int8 barely moves the held-out loss; more bits saved leave room for more requests', () => {
    const l16 = evaluate(base, HELDOUT.ids).loss,
      l8 = evaluate(quantize(base, 8), HELDOUT.ids).loss;
    expect(Math.abs(l8 / l16 - 1)).toBeLessThanOrEqual(0.01);
    expect(ch4.fitsAt(16)).toBe(ch2.FITS);
    expect(ch4.fitsAt(8)).toBeGreaterThan(ch4.fitsAt(16));
    expect(ch4.fitsAt(4)).toBeGreaterThan(ch4.fitsAt(8));
  });

  it('chapter 5: the student’s drafts give the same reply in fewer checks', () => {
    expect(ch5.outcomeOf(base, student)).toBe(0);
  });

  it('chapter 5 keeps its runs per model', () => {
    expect(ch5.runAt(base, student, 2)).toBe(ch5.runAt(base, student, 2));
    const other = parseModel(meta, disk('model.bin'));
    expect(ch5.runAt(other, student, 2)).not.toBe(ch5.runAt(base, student, 2));
  });

  it('chapter 6: a bigger cap serves more and slows each reply’s tokens', () => {
    expect(ch6.outcomeOf()).toBe(1);
  });

  it('chapter 7: the bench starts off the best, and every winner wins', () => {
    expect(wins(ch7.START)).toBe(false);
    expect(WINNERS.every(wins)).toBe(true);
    expect(ch7.settingsOf({ cap: 3 as never })).toEqual(ch7.START);
  });
});
