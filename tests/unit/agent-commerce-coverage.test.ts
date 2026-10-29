import { describe, expect, it } from 'vitest';
import { READ_ITEMS } from '../../src/lib/agent-commerce/card';
import { SIMULATOR } from '../../src/lib/agent-commerce/simulate';
import { SELLERS } from '../../src/lib/agent-commerce/story';
import { runTask } from '../../src/lib/agent-commerce/task';
import {
  FILES,
  MENU_TURNS,
  OFFER_TURNS,
  offerSig,
  PAGE_TURNS,
  RECORDINGS,
  readSig,
  TASK_TURNS,
} from '../../src/lib/agent-commerce/turns';

// Every signature each chapter's controls can reach, recorded or simulated alike (KTD4, KTD13).
const reachable: Record<string, string[]> = {
  [FILES.page]: READ_ITEMS.map(sku => readSig('page', sku)),
  [FILES.menu]: READ_ITEMS.map(sku => readSig('menu', sku)),
  [FILES.task]: (['clear', 'vague'] as const).flatMap(r => runTask(TASK_TURNS, r).turns.map(t => t.sig)),
  [FILES.offer]: SELLERS.map(s => offerSig(s.id)),
};

describe('agent commerce recordings coverage (KTD4)', () => {
  it('one file per recorded chapter, and nothing else', () => {
    expect(Object.keys(RECORDINGS).sort()).toEqual(Object.values(FILES).sort());
  });

  it.each(Object.values(FILES))('%s: every reachable signature has a turn, and every turn is reachable', name => {
    const rec = RECORDINGS[name];
    for (const sig of reachable[name]) expect(rec.turns, `${name} ${sig}`).toHaveProperty([sig]);
    expect(Object.keys(rec.turns).sort()).toEqual([...new Set(reachable[name])].sort());
  });

  it('no task run ends without a record', () => {
    for (const r of ['clear', 'vague'] as const)
      for (const cancel of [false, true]) expect(runTask(TASK_TURNS, r, cancel).status).not.toBe('norecord');
  });

  it('every file names its model and date; a file with simulated turns names the simulator', () => {
    for (const rec of Object.values(RECORDINGS)) {
      expect(rec.meta.model).toBeTruthy();
      expect(rec.meta.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const simulated = Object.values(rec.turns).some(t => (t as { simulated?: true }).simulated);
      expect(rec.meta.simulator).toBe(simulated ? SIMULATOR : undefined);
    }
  });

  it('the turns stay small', () => {
    expect(JSON.stringify([PAGE_TURNS, MENU_TURNS, TASK_TURNS, OFFER_TURNS]).length).toBeLessThan(150_000);
  });
});
