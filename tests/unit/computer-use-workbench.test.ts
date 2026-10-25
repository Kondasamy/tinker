// Chapter 7's workbench (KTD12): the pinned WINNERS are what solving every policy gives, and they stop every attack.
import { describe, expect, it } from 'vitest';
import { metrics } from '../../src/lib/computer-use/loop';
import { POLICIES, solve, WINNERS } from '../../src/lib/computer-use/workbench';

describe('computer-use workbench', () => {
  it('has every policy the controls can make', () => expect(POLICIES).toHaveLength(24));
  it('WINNERS equals the pin', () => expect(solve()).toEqual(WINNERS));
  it('every winner stops every attack and finishes every task', () => {
    for (const w of WINNERS) {
      const m = metrics(w);
      expect(m.succeeded).toBe(0);
      expect(m.failed).toBe(0);
    }
  });
});
