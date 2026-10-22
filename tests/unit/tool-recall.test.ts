import { describe, it, expect } from 'vitest';
import { RECALL } from '../../src/content/tool-calling/recall';
import { TOOL_CALLING_MODULE } from '../../src/content/tool-calling/module';

describe('tool calling recall bank', () => {
  const chapters = TOOL_CALLING_MODULE.chapters.map(c => c.id);

  it('every item belongs to a module 2 chapter, and every chapter has three to five items', () => {
    for (const i of RECALL) expect(chapters, i.id).toContain(i.chapter);
    for (const c of chapters) expect(RECALL.filter(i => i.chapter === c).length, c).toBeGreaterThanOrEqual(3);
    for (const c of chapters) expect(RECALL.filter(i => i.chapter === c).length, c).toBeLessThanOrEqual(5);
  });

  // index range, why per option, unique ids and options, one pin first: the registry checks every live module (registry.test.ts)
  it('every why line says something', () => {
    for (const i of RECALL) for (const w of i.why) expect(w.trim(), i.id).not.toBe('');
  });

  it('the pinned item is "the model proposes a tool call; the host runs it", from chapter 1, and the module carries the bank', () => {
    expect(RECALL[0].chapter).toBe(chapters[0]);
    expect(RECALL[0].options[RECALL[0].correct]).toMatch(/model proposes.*host runs/i);
    expect(TOOL_CALLING_MODULE.recall).toBe(RECALL);
  });

  it('numbers come from the data, never undefined or NaN', () => {
    for (const i of RECALL)
      expect(`${i.question} ${i.options.join(' ')} ${i.why.join(' ')}`, i.id).not.toMatch(/undefined|NaN|Infinity/);
  });
});
