// A step's callout (`say`) must name a part its chapter's picture draws: each chapter exports PARTS, the parts of the
// scene its stage shows (empty when the picture is a chart). An unknown part would draw nothing, silently.
import { describe, expect, it } from 'vitest';
import type { Step } from '../../src/components/story/steps';

const files = import.meta.glob<Record<string, unknown>>('../../src/content/*/[0-9]*.tsx', { eager: true });

/** Steps whose callout names no part of their chapter's picture, as readable lines. RAG's canvas, timeline and
 * overflow scenes resolve their own targets, so RAG is skipped. */
export function strays(chapters: Record<string, Record<string, unknown>>) {
  const out: string[] = [];
  for (const [path, mod] of Object.entries(chapters)) {
    if (path.includes('/rag/')) continue;
    const steps = (mod.STEPS ?? []) as Step<unknown>[];
    const parts = (mod.PARTS ?? []) as readonly string[];
    for (const s of steps)
      if (s.say && !parts.includes(s.say.block))
        out.push(`${path.split('/').slice(-2).join('/')} step ${s.id}: no part "${s.say.block}"`);
  }
  return out;
}

describe('step callouts', () => {
  it('every callout names a part its chapter picture draws', () => {
    expect(strays(files)).toEqual([]);
  });

  it('flags a callout on a chapter without that part, or with no parts at all', () => {
    const step = (block: string) => ({ id: 's', narration: '', visibleControls: [], predicate: () => true, say: { block, text: 'Here' } });
    expect(
      strays({
        '/x/a/01.tsx': { STEPS: [step('model')], PARTS: ['host', 'model'] },
        '/x/b/01.tsx': { STEPS: [step('desk')], PARTS: ['host'] },
        '/x/c/01.tsx': { STEPS: [step('model')] },
      }),
    ).toEqual(['b/01.tsx step s: no part "desk"', 'c/01.tsx step s: no part "model"']);
  });
});
