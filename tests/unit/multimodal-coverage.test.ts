// Multimodal's recorded readings (KTD12): every image × size × method a chapter or the workbench can reach has a reading
// with its one-line note, every recorded reading is reachable, no key is recorded twice, and the recording stays within
// its budget of 90.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DOMAINS, WORKBENCH_DOMAINS, RECORDED, combos, reading, fieldsOf } from '../../src/lib/multimodal/readings';

// the parsed JSON has already dropped a repeated key, so read the file text: the path of every key must be unique
const keyPaths = (file: string) => {
  const stack: string[] = [],
    paths: string[] = [];
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/^( *)"([^"]+)": /gm)) {
    stack.length = m[1].length / 2 - 1;
    stack.push(m[2]);
    paths.push(stack.join('|'));
  }
  return paths;
};

describe('multimodal readings coverage (R3, KTD12)', () => {
  it.each(Object.keys(DOMAINS))('%s: every image × size × method has a reading', id => {
    for (const [im, s, m] of combos(DOMAINS[id]))
      expect(() => reading(im, s, m), `${id} ${im} ${s} ${m}`).not.toThrow();
  });

  it('the workbench: every document × size × method', () => {
    for (const [im, s, m] of combos(WORKBENCH_DOMAINS))
      expect(() => reading(im, s, m), `${im} ${s} ${m}`).not.toThrow();
  });

  it('no key is repeated in the readings file', () => {
    const p = keyPaths('data/multimodal/readings.json');
    expect(p.length).toBeGreaterThan(0);
    expect(new Set(p).size).toBe(p.length);
  });

  it('every recorded reading is reachable, and none is recorded twice', () => {
    const reached = new Set(
      [...Object.values(DOMAINS), WORKBENCH_DOMAINS].flatMap(d => combos(d).map(c => c.join('|'))),
    );
    expect(RECORDED.filter(k => !reached.has(k))).toEqual([]);
    expect(new Set(RECORDED).size).toBe(RECORDED.length);
  });

  it('every reading has text, a one-line note, and a value or null for every graded field', () => {
    for (const k of RECORDED) {
      const [im, s, m] = k.split('|');
      const r = reading(im, Number(s), m as never);
      expect(r.text.trim(), k).not.toBe('');
      expect(r.note.trim(), k).not.toBe('');
      expect(r.note.includes('\n'), k).toBe(false);
      for (const f of fieldsOf(im))
        expect(r.fields[f.id] === null || typeof r.fields[f.id] === 'string', `${k} ${f.id}`).toBe(true);
    }
  });

  it('stays within the budget of 90 readings', () => {
    expect(RECORDED.length).toBeLessThanOrEqual(90);
  });
});
