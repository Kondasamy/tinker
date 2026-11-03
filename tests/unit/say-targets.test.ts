// A step's callout (`say`) and close-up (`closeUp`) must name parts its chapter's picture draws: each chapter exports
// PARTS, the parts of the scene its stage shows (empty when the picture is a chart). An unknown part would draw nothing,
// silently. The existing `focus` (the control a step highlights) is not a part and is not checked. A living-scene module
// (its kit exports `LIVING = true`) carries a one-sentence `status` on every step (R10a).
import { describe, expect, it } from 'vitest';
import type { Step } from '../../src/components/story/steps';

const files = import.meta.glob<Record<string, unknown>>('../../src/content/*/[0-9]*.tsx', { eager: true });
const kits = import.meta.glob<{ LIVING?: boolean }>('../../src/content/*/kit.tsx', { eager: true });
/** the module folders whose kit declares a living scene */
const living = new Set(
  Object.entries(kits).flatMap(([path, kit]) => (kit.LIVING ? [path.split('/').slice(-2)[0]] : [])),
);
const STATUS_WORDS = 20;

/** Steps whose callout names no part of their chapter's picture, as readable lines. RAG's canvas, timeline and
 * overflow scenes resolve their own targets, so RAG is skipped. */
function strays(chapters: Record<string, Record<string, unknown>>) {
  const out: string[] = [];
  for (const [path, mod] of Object.entries(chapters)) {
    if (path.includes('/rag/')) continue;
    const steps = (mod.STEPS ?? []) as Step<unknown>[];
    const parts = (mod.PARTS ?? []) as readonly string[];
    const at = path.split('/').slice(-2).join('/');
    for (const s of steps) {
      if (s.say && !parts.includes(s.say.block)) out.push(`${at} step ${s.id}: no part "${s.say.block}"`);
      for (const p of s.closeUp ?? [])
        if (!parts.includes(p)) out.push(`${at} step ${s.id}: close-up on no part "${p}"`);
    }
  }
  return out;
}

/** Steps of living-scene modules with no end-state line, or one over a sentence or the word budget. */
function silent(chapters: Record<string, Record<string, unknown>>, modules: Set<string>) {
  const out: string[] = [];
  for (const [path, mod] of Object.entries(chapters)) {
    const [id, file] = path.split('/').slice(-2);
    if (!modules.has(id)) continue;
    for (const s of (mod.STEPS ?? []) as Step<unknown>[]) {
      const st = s.status?.trim() ?? '';
      if (!st) out.push(`${id}/${file} step ${s.id}: no status`);
      else if (st.split(/(?<=[.!?])\s+/).length > 1 || st.split(/\s+/).length > STATUS_WORDS)
        out.push(`${id}/${file} step ${s.id}: status over one sentence of ${STATUS_WORDS} words`);
    }
  }
  return out;
}

describe('step callouts', () => {
  it('every callout names a part its chapter picture draws', () => {
    expect(strays(files)).toEqual([]);
  });

  it('flags a callout on a chapter without that part, or with no parts at all', () => {
    const step = (block: string) => ({
      id: 's',
      narration: '',
      visibleControls: [],
      predicate: () => true,
      say: { block, text: 'Here' },
    });
    expect(
      strays({
        '/x/a/01.tsx': { STEPS: [step('model')], PARTS: ['host', 'model'] },
        '/x/b/01.tsx': { STEPS: [step('desk')], PARTS: ['host'] },
        '/x/c/01.tsx': { STEPS: [step('model')] },
      }),
    ).toEqual(['b/01.tsx step s: no part "desk"', 'c/01.tsx step s: no part "model"']);
  });

  it('flags a close-up on a part the chapter does not draw, and never checks `focus`', () => {
    const step = (closeUp: string[]) => ({
      id: 'r',
      narration: '',
      visibleControls: [],
      predicate: () => true,
      focus: 'some-control',
      closeUp,
    });
    expect(
      strays({
        '/x/a/02.tsx': { STEPS: [step(['model', 'host'])], PARTS: ['host', 'model'] },
        '/x/b/02.tsx': { STEPS: [step(['model', 'desk'])], PARTS: ['model'] },
      }),
    ).toEqual(['b/02.tsx step r: close-up on no part "desk"']);
  });
});

describe('end-state lines', () => {
  it('every step of a living-scene module has a one-sentence status', () => {
    expect(silent(files, living)).toEqual([]);
  });

  it('flags a living-scene step with no status, or a long one; other modules are not held to it', () => {
    const step = (id: string, status?: string) => ({
      id,
      narration: '',
      visibleControls: [],
      predicate: () => true,
      status,
    });
    const chapters = {
      '/x/live/01.tsx': {
        STEPS: [
          step('ok', 'The binder swung open.'),
          step('none'),
          step('two', 'It spun. It opened.'),
          step('long', `${'word '.repeat(STATUS_WORDS)}more.`),
        ],
      },
      '/x/old/01.tsx': { STEPS: [step('none')] },
    };
    expect(silent(chapters, new Set(['live']))).toEqual([
      'live/01.tsx step none: no status',
      `live/01.tsx step two: status over one sentence of ${STATUS_WORDS} words`,
      `live/01.tsx step long: status over one sentence of ${STATUS_WORDS} words`,
    ]);
  });
});
