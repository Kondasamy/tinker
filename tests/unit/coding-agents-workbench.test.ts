// Chapter 7's workbench (KTD12): the pinned WINNERS are what solving every policy gives, and they finish every ticket.
import { describe, expect, it } from 'vitest';
import { metrics } from '../../src/lib/coding-agents/loop';
import { POLICIES, solve, WINNERS } from '../../src/lib/coding-agents/workbench';

describe('coding-agents workbench', () => {
  it('has every policy the controls can make', () => expect(POLICIES).toHaveLength(8));
  it('WINNERS equals the pin', () => expect(solve()).toEqual(WINNERS));
  it('every winner really finishes every ticket', () => {
    for (const w of WINNERS) {
      const m = metrics(w);
      expect(m.right).toBe(m.tickets);
    }
  });
  it('with no rules, only the plain ticket is really done', () => expect(metrics({}).right).toBe(1));
});
