// Saved progress is keyed by chapter and step ids (R15): every pinned module keeps its chapters and steps, in order.
// A module that goes live later is not pinned yet, so it never fails this; WRITE_STEP_IDS=1 pins every live module.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { MODULES } from '../../src/lib/modules';
import type { Step } from '../../src/components/story/steps';
import pinned from '../fixtures/step-ids.json';

const PIN = 'tests/fixtures/step-ids.json';
const files = import.meta.glob<{ STEPS?: Step<unknown>[] }>('../../src/content/*/[0-9]*.tsx', { eager: true });

/** module id → chapter id → its step ids, in order */
const now = Object.fromEntries(
  MODULES.filter(m => m.status === 'live').map(m => [
    m.id,
    Object.fromEntries(
      m.chapters.map(ch => [ch.id, (files[`../../src/content/${m.id}/${ch.id}.tsx`]?.STEPS ?? []).map(s => s.id)]),
    ),
  ]),
);

describe('step ids', () => {
  it('every pinned module keeps its chapter ids and step ids, in order', () => {
    if (process.env.WRITE_STEP_IDS) writeFileSync(PIN, `${JSON.stringify(now, null, 2)}\n`);
    else
      for (const [id, chapters] of Object.entries(pinned as Record<string, Record<string, string[]>>)) {
        expect(now[id], id).toBeDefined();
        expect(Object.keys(now[id]), id).toEqual(Object.keys(chapters));
        expect(now[id], id).toEqual(chapters);
      }
  });

  it('pins every chapter with at least one step', () => {
    for (const [id, chapters] of Object.entries(now))
      for (const [ch, steps] of Object.entries(chapters)) expect(steps.length, `${id}/${ch}`).toBeGreaterThan(0);
  });
});
