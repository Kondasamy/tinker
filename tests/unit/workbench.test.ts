import { describe, it, expect } from 'vitest';
import { REQUESTS, SERVER_IDS, verdict, needs, type Setup } from '../../src/content/tool-calling/07-workbench';
import { LIMITS } from '../../src/content/tool-calling/kit';

// every setup the workbench's controls can reach
const ALL: Setup[] = [[], ['orders'], ['calendar'], ['orders', 'calendar']].flatMap(servers =>
  [false, true].flatMap(gate => LIMITS.map(limit => ({ servers: servers as Setup['servers'], gate, limit }))));
const req = (id: string) => REQUESTS.find(r => r.id === id)!;

describe('workbench rules', () => {
  it('has four requests, each solved by its own needed setup and by at least one reachable setup', () => {
    expect(REQUESTS).toHaveLength(4);
    for (const r of REQUESTS) {
      expect(verdict(r, needs(r)).ok, r.id).toBe(true);
      expect(ALL.some(s => verdict(r, s).ok), r.id).toBe(true);
    }
  });

  it('rejects the refund with the gate off, whatever else is set, and says why', () => {
    const r = req('refund');
    for (const s of ALL.filter(s => !s.gate)) {
      const v = verdict(r, s);
      expect(v.ok).toBe(false);
      if (s.servers.join() === 'orders' && s.limit !== null) expect(v.why).toMatch(/gate/i);
    }
    expect(verdict(r, { ...needs(r), gate: false }).why).toMatch(/moves real money/);
  });

  it('a limit below the refund refuses it; no limit at all is not least privilege', () => {
    const r = req('refund'), refund = r.refund!;
    expect(verdict(r, { ...needs(r), limit: LIMITS.find(l => l !== null && l < refund)! }).ok).toBe(false);
    expect(verdict(r, { ...needs(r), limit: null }).ok).toBe(false);
  });

  it('a missing or extra server is rejected; a calendar-only request does not care about the gate', () => {
    for (const r of REQUESTS) {
      const n = needs(r);
      for (const id of SERVER_IDS) {
        const other = n.servers.includes(id) ? n.servers.filter(x => x !== id) : [...n.servers, id];
        expect(verdict(r, { ...n, servers: other }).ok, `${r.id} ${id}`).toBe(false);
      }
    }
    const cal = req('calendar');
    expect(verdict(cal, { ...needs(cal), gate: !needs(cal).gate }).ok).toBe(true);
  });

  it('every verdict explains itself', () => {
    for (const r of REQUESTS) for (const s of ALL) expect(verdict(r, s).why.trim(), r.id).not.toBe('');
  });
});
