// Opening a web page's round-trip simulator (KTD6): one customer's browser opens larkspur.example, and every step is a
// round trip whose length comes from map distance at Larkspur's planning rate (data/web-requests/assumptions.json, a
// labelled assumption, never a measurement). The steps: the directory lookup (DNS, a level per office unless the answer
// is remembered within its TTL), the TCP handshake, the TLS 1.3 handshake (or QUIC's one handshake for HTTP/3, and
// 0-RTT on resumption for a GET), then the page's files over HTTP/1.1, 2 or 3. Loss is seeded: each packet's fate is
// drawn by mulberry32 from the customer's seed and the packet's name, so a setting never moves another packet's luck.
import data from '../../../data/web-requests/assumptions.json' with { type: 'json' };
import town from '../../../data/web-requests/customers.json' with { type: 'json' };
import page from '../../../data/web-requests/page.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';

export const ASSUMPTIONS = data;
export const SITE = town.site;
export const ADDRESS = town.address;
export const NEW_ADDRESS = town.newAddress;
export const RESOLVER = town.resolver;
export const DOCUMENT = page.document;
export const FILES = page.files;

export type CustomerId = 'ines' | 'tomas' | 'dara' | 'wen';
export interface Customer {
  id: CustomerId;
  name: string;
  town: string;
  km: number;
  /** minutes since this customer's last visit; null for a first visit */
  lastVisitMin: number | null;
  /** the chance each packet on this customer's line is lost, when loss is on */
  loss: number;
  seed: number;
  ip: string;
}
export const CUSTOMERS = town.customers as Customer[];
export const customerOf = (id: CustomerId) => CUSTOMERS.find(c => c.id === id)!;

export type Http = '1.1' | '2' | '3';
export const HTTPS: Http[] = ['1.1', '2', '3'];
/** DNS TTLs, in minutes, the controls step over. */
export const TTLS = [1, 5, 60, 1440] as const;
export const TTL_NAMES = ['1 min', '5 min', '1 hour', '1 day'] as const;
export const ttlName = (m: number) => TTL_NAMES[(TTLS as readonly number[]).indexOf(m)] ?? `${m} min`;

export interface Setting {
  /** how long resolvers may remember Larkspur's answer, minutes */
  ttl: number;
  http: Http;
  /** a returning browser resumes its TLS session and sends a GET with its first flight (0-RTT) */
  resume: boolean;
  /** lines lose packets at each customer's rate */
  loss: boolean;
  /** the document request's method; 0-RTT is refused for anything but GET */
  method: 'GET' | 'POST';
}
export const BASE: Setting = { ttl: 60, http: '1.1', resume: false, loss: false, method: 'GET' };
export const settingOf = (s: Partial<Setting>): Setting => ({ ...BASE, ...s });

export type Office = 'root' | 'tld' | 'nameserver';
export const OFFICES: Office[] = ['root', 'tld', 'nameserver'];
export type PhaseKind = 'dns' | 'tcp' | 'tls' | 'quic' | 'req';
export interface Phase {
  /** the packet's name, which also seeds its loss draw: "dns:root", "tcp", "tls#2", "req:style.css" */
  id: string;
  kind: PhaseKind;
  office?: Office;
  /** the connection it runs on (1 = the first) */
  conn?: number;
  file?: string;
  start: number;
  end: number;
  /** its packet was lost once and sent again after the timeout */
  lost: boolean;
  /** ms it waited behind another stream's lost packet on the same connection (HTTP/2's head-of-line blocking) */
  stalled: number;
}
export interface Run {
  customer: Customer;
  setting: Setting;
  phases: Phase[];
  /** ms until the last file arrived */
  total: number;
  rtt: number;
  dnsCached: boolean;
  /** offices asked */
  asked: Office[];
  /** the document went out with the first flight (0-RTT) */
  zeroRtt: boolean;
  /** 0-RTT was possible but refused, because the request was not a GET */
  refused: boolean;
  connections: number;
  /** round trips to the shop: handshakes and requests */
  shopTrips: number;
  lost: string[];
}

/** A round trip to a place km away, ms. */
export const rttOf = (km: number) => data.hopMs + (km / 100) * data.msPer100Km;
const officeKm = (o: Office, c: Customer) => (o === 'nameserver' ? c.km : data.directoryKm[o]);

// FNV-1a, so a packet's name picks its own draw
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
/** Whether the packet named id is lost on this customer's line. */
export const lostOn = (c: Customer, id: string) => mulberry32((c.seed ^ hash(id)) >>> 0)() < c.loss;

export const remembers = (c: Customer, s: Setting) => c.lastVisitMin !== null && c.lastVisitMin <= s.ttl;
export const hasTicket = (c: Customer) => c.lastVisitMin !== null && c.lastVisitMin <= data.ticketMinutes;

/** One page load. */
export function simulate(c: Customer, s: Setting): Run {
  const rtt = rttOf(c.km),
    phases: Phase[] = [],
    lose = (id: string) => s.loss && lostOn(c, id);
  const add = (p: Omit<Phase, 'end' | 'lost' | 'stalled'>, ms: number) => {
    const lost = lose(p.id),
      ph: Phase = { ...p, end: p.start + ms + (lost ? data.rtoMs : 0), lost, stalled: 0 };
    phases.push(ph);
    return ph;
  };
  // the directory: a cold resolver asks every office; a returning customer's still knows the root's and .example's
  // answers, so it asks only Larkspur's own, unless it remembers that too
  const dnsCached = remembers(c, s),
    asked: Office[] = dnsCached ? [] : c.lastVisitMin === null ? OFFICES : ['nameserver'];
  let t = 0;
  for (const o of asked) t = add({ id: `dns:${o}`, kind: 'dns', office: o, start: t }, rttOf(officeKm(o, c))).end;
  // 0-RTT needs a session ticket from an earlier visit, and only a GET may ride the first flight (it may be replayed)
  const early = s.resume && hasTicket(c),
    zeroRtt = early && s.method === 'GET',
    reply = rtt + data.serverMs;
  /** Opens connection n at time t; returns when the document (or the next file) may go out. */
  const open = (n: number, at: number) => {
    const tag = n === 1 ? '' : `#${n}`;
    if (s.http === '3') {
      const q = add({ id: `quic${tag}`, kind: 'quic', conn: n, start: at }, rtt);
      return zeroRtt ? at : q.end;
    }
    const tcp = add({ id: `tcp${tag}`, kind: 'tcp', conn: n, start: at }, rtt);
    const tls = add({ id: `tls${tag}`, kind: 'tls', conn: n, start: tcp.end }, rtt);
    return zeroRtt ? tcp.end : tls.end;
  };
  const req = (file: string, conn: number, at: number) =>
    add({ id: `req:${file}`, kind: 'req', conn, file, start: at }, reply);
  const doc = req(DOCUMENT, 1, open(1, t));
  // the files the document names are known once it arrives
  const T = doc.end;
  let connections = 1;
  if (s.http === '1.1') {
    // one request at a time per connection: each file goes where it would finish first, an open connection or a new
    // one (up to the browser's limit), in the page's order
    const free = [T];
    for (const f of FILES) {
      const i = free.indexOf(Math.min(...free));
      const reuse = free[i] + reply;
      if (free.length < data.h1Connections && T + (zeroRtt ? rtt : 2 * rtt) + reply < reuse) {
        connections = free.length + 1;
        free.push(req(f, connections, open(connections, T)).end);
      } else free[i] = req(f, i + 1, free[i]).end;
    }
  } else {
    // HTTP/2 and 3 send every file at once on the one connection
    const sent = FILES.map(f => req(f, 1, T));
    const late = sent.filter(p => p.lost);
    if (s.http === '2' && late.length) {
      // TCP hands over bytes in order: a lost packet holds back every stream behind it until it is sent again
      const until = Math.max(...late.map(p => p.end));
      for (const p of sent)
        if (!p.lost && p.end < until) {
          p.stalled = until - p.end;
          p.end = until;
        }
    }
  }
  const total = Math.max(...phases.map(p => p.end));
  return {
    customer: c,
    setting: s,
    phases,
    total,
    rtt,
    dnsCached,
    asked,
    zeroRtt,
    refused: early && !zeroRtt,
    connections,
    shopTrips: phases.filter(p => p.kind !== 'dns').length,
    lost: phases.filter(p => p.lost).map(p => p.id),
  };
}

const runs = new Map<string, Run>();
/** A customer's load under a setting, computed once per page. */
export function runOf(id: CustomerId, s: Partial<Setting> = {}): Run {
  const full = settingOf(s),
    k = JSON.stringify([id, full.ttl, full.http, full.resume, full.loss, full.method]);
  if (!runs.has(k)) runs.set(k, simulate(customerOf(id), full));
  return runs.get(k)!;
}

/** Minutes a customer who visited m minutes before a move may still go to the old address, under a TTL. */
export const oldFor = (ttl: number, m: number) => Math.max(0, ttl - m);

/** The phase's name in words. */
export function phaseName(p: Phase): string {
  const conn = p.conn && p.conn > 1 ? ` (connection ${p.conn})` : '';
  if (p.kind === 'dns') return { root: 'Ask the root', tld: 'Ask .example', nameserver: `Ask ${SITE}` }[p.office!];
  if (p.kind === 'tcp') return `TCP handshake${conn}`;
  if (p.kind === 'tls') return `TLS handshake${conn}`;
  if (p.kind === 'quic') return `QUIC handshake${conn}`;
  return `Get ${p.file}${conn}`;
}
