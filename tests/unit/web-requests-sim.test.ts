// Opening a web page's round-trip simulator (KTD6) and its pinned totals (KTD12): the lessons the chapters teach, read
// off real runs, so a change to the data or the rules that breaks a lesson fails here.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/web-requests/pinned.json' with { type: 'json' };
import town from '../../data/web-requests/customers.json' with { type: 'json' };
import {
  ASSUMPTIONS,
  CUSTOMERS,
  FILES,
  customerOf,
  rttOf,
  runOf,
  settingOf,
  simulate,
  type CustomerId,
  type Setting,
} from '../../src/lib/web-requests/sim';

const at = (c: Parameters<typeof simulate>[0], s: Partial<Setting>) => simulate(c, settingOf(s));
const far = (km: number) => ({ ...customerOf('dara'), km, lastVisitMin: null });
const span = (r: ReturnType<typeof simulate>, id: string) => {
  const p = r.phases.find(x => x.id === id)!;
  return p.end - p.start;
};

describe('the round-trip simulator', () => {
  it('a cold load costs every directory level, a TCP and a TLS round trip, then the requests', () => {
    const r = at(far(1000), { http: '2' }),
      rtt = rttOf(1000),
      reply = rtt + ASSUMPTIONS.serverMs;
    const dns = rttOf(ASSUMPTIONS.directoryKm.root) + rttOf(ASSUMPTIONS.directoryKm.tld) + rtt;
    expect(r.asked).toEqual(['root', 'tld', 'nameserver']);
    expect(r.total).toBeCloseTo(dns + rtt + rtt + reply + reply, 9);
  });

  it('a resolver that remembers the answer within its TTL skips the directory', () => {
    const tomas = customerOf('tomas'); // visited 20 minutes ago
    expect(at(tomas, { ttl: 60 }).asked).toEqual([]);
    expect(at(tomas, { ttl: 5 }).asked).toEqual(['nameserver']);
    expect(at(tomas, { ttl: 5 }).total - at(tomas, { ttl: 60 }).total).toBeCloseTo(rttOf(tomas.km), 9);
  });

  it('doubling the distance doubles the handshake’s distance part', () => {
    const a = at(far(1000), {}),
      b = at(far(2000), {});
    expect(span(b, 'tcp') - ASSUMPTIONS.hopMs).toBeCloseTo(2 * (span(a, 'tcp') - ASSUMPTIONS.hopMs), 9);
    expect(span(b, 'tls') - ASSUMPTIONS.hopMs).toBeCloseTo(2 * (span(a, 'tls') - ASSUMPTIONS.hopMs), 9);
  });

  it('HTTP/3’s handshake costs one round trip fewer than TCP and TLS 1.3', () => {
    const c = far(3000);
    expect(at(c, { http: '2' }).total - at(c, { http: '3' }).total).toBeCloseTo(rttOf(3000), 9);
  });

  it('0-RTT resumption saves a round trip for a GET, and is refused for a POST', () => {
    const tomas = customerOf('tomas');
    const plain = at(tomas, { http: '2' }),
      get = at(tomas, { http: '2', resume: true }),
      post = at(tomas, { http: '2', resume: true, method: 'POST' });
    expect(get.zeroRtt).toBe(true);
    expect(plain.total - get.total).toBeCloseTo(rttOf(tomas.km), 9);
    expect(post.zeroRtt).toBe(false);
    expect(post.refused).toBe(true);
    expect(post.total).toBeCloseTo(plain.total, 9);
    // a first visit has no ticket to resume
    expect(at(customerOf('ines'), { resume: true }).zeroRtt).toBe(false);
  });

  it('with one lost file on a shared connection, HTTP/2 stalls every stream and HTTP/3 stalls one', () => {
    const h2 = runOf('wen', { http: '2', loss: true }),
      h3 = runOf('wen', { http: '3', loss: true });
    expect(h2.lost).toEqual(pinned.wenLost);
    expect(h3.lost).toEqual(pinned.wenLost);
    const files = (r: typeof h2) => r.phases.filter(p => p.kind === 'req' && p.file !== 'index.html');
    expect(files(h2).filter(p => p.stalled > 0)).toHaveLength(FILES.length - 1);
    expect(files(h3).filter(p => p.stalled > 0)).toHaveLength(0);
    expect(files(h3).filter(p => p.end > p.start + h3.rtt + ASSUMPTIONS.serverMs + 1)).toHaveLength(1);
    // the lost packet waits the timeout, then goes again
    const lost = h3.phases.find(p => p.lost)!;
    expect(lost.end - lost.start).toBeCloseTo(ASSUMPTIONS.rtoMs + h3.rtt + ASSUMPTIONS.serverMs, 9);
  });

  it('HTTP/1.1 queues files on a few connections; HTTP/2 sends them all at once', () => {
    const h1 = runOf('dara', { http: '1.1' }),
      h2 = runOf('dara', { http: '2' });
    expect(h1.connections).toBeGreaterThan(1);
    expect(h1.connections).toBeLessThanOrEqual(ASSUMPTIONS.h1Connections);
    expect(h2.connections).toBe(1);
    expect(h1.total).toBeGreaterThan(h2.total);
  });

  it('the same seed gives the same timeline', () => {
    const c = customerOf('wen'),
      s = settingOf({ http: '2', loss: true });
    expect(simulate(c, s)).toEqual(simulate(c, s));
  });

  it('every pinned total holds', () => {
    for (const [id, row] of Object.entries(pinned.totals))
      for (const [name, total] of Object.entries(row))
        expect(
          runOf(id as CustomerId, pinned.settings[name as keyof typeof pinned.settings] as Partial<Setting>).total,
        ).toBeCloseTo(total, 6);
  });

  it('every name and address is reserved for documentation', () => {
    expect(town.site).toMatch(/\.example$/);
    const doc = /^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d+$|^2001:db8:/i;
    for (const a of [town.address, town.address6, town.newAddress, town.resolver, ...CUSTOMERS.map(c => c.ip)])
      expect(a).toMatch(doc);
  });
});
