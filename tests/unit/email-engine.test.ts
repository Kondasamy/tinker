// How email arrives (U8): parsing, SPF, DKIM, DMARC and the spam score over the fixture mail in data/email/. The DKIM
// signatures were made once by scripts/sign-email.mjs and are committed; this test verifies them with real RSA in
// Web Crypto and never re-signs. Every verdict a chapter teaches is pinned in data/email/pinned.json
// (WRITE_PINNED=1 rewrites it).
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crlf, envelopeOf, fromOf, header, hops, parse, serialize } from '../../src/lib/email/parse';
import { NO_RECORDS, mxOf, txt, type Records } from '../../src/lib/email/dns';
import { inCidr, spf } from '../../src/lib/email/spf';
import { bodyHash, canonBody, canonHeader, verify } from '../../src/lib/email/dkim';
import { orgOf } from '../../src/lib/email/dmarc';
import { spamScore, tokens } from '../../src/lib/email/spam';
import {
  DOMAIN,
  FORGER,
  MESSAGES,
  RECEIVER_MX,
  VENDOR_SPF,
  dkimOf,
  ipOf,
  messageAs,
  verdictOf,
  type MessageId,
} from '../../src/lib/email/story';
import demo from '../../data/email/demo-dkim.json' with { type: 'json' };
import dns from '../../data/email/dns.json' with { type: 'json' };
import pinned from '../../data/email/pinned.json' with { type: 'json' };

const PINNED = 'data/email/pinned.json';
const IDS = Object.keys(MESSAGES) as MessageId[];
const OWN = 'v=spf1 ip4:192.0.2.0/28 -all';
const ALL_ON: Records = { spf: VENDOR_SPF, dkim: true, dmarc: 'reject' };

describe('parsing', () => {
  it('reads the headers, the envelope and the From line', () => {
    const m = parse(MESSAGES.forged);
    expect(header(m, 'subject')).toBe('Invoice 1207');
    expect(fromOf(m)).toBe('billing@larkspur.example');
    expect(envelopeOf(m)).toBe(`pay@${FORGER}`);
    expect(m.body.endsWith('\r\n')).toBe(true);
  });

  it('every message’s hops come out bottom-up, in time order, with servers and times', () => {
    const order = hops(parse(MESSAGES.order));
    expect(order.map(h => [h.from, h.by])).toEqual([
      ['app.larkspur.example', 'mail.larkspur.example'],
      ['mail.larkspur.example', 'mx1.hollisbuild.example'],
      ['mx1.hollisbuild.example', 'store.hollisbuild.example'],
    ]);
    expect(order.map(h => h.time)).toEqual(['09:14:02', '09:14:05', '09:14:06']);
    expect(order[1].ip).toBe('192.0.2.10');
    for (const id of IDS) {
      const hs = hops(parse(MESSAGES[id]));
      expect(hs.length, id).toBeGreaterThanOrEqual(2);
      expect(hs.length, id).toBeLessThanOrEqual(6);
      for (let i = 1; i < hs.length; i++) {
        expect(hs[i].from, id).toBe(hs[i - 1].by);
        expect(Date.parse(hs[i].at) >= Date.parse(hs[i - 1].at), id).toBe(true);
      }
      expect(hs.at(-1)!.by, id).toBe('store.hollisbuild.example');
    }
    expect(hops(parse(MESSAGES.forwarded))).toHaveLength(5);
  });

  it('the receiver’s MX comes from DNS, and the IP SPF checks is the one that handed it to the MX', () => {
    expect(mxOf('hollisbuild.example')).toBe(RECEIVER_MX);
    expect(ipOf('order')).toBe('192.0.2.10');
    expect(ipOf('forwarded')).toBe('198.51.100.200');
    expect(ipOf('newsletter')).toBe('198.51.100.40');
    expect(ipOf('forged')).toBe('203.0.113.66');
  });

  it('serialises back to the same text, CRLF line ends', () => {
    for (const id of IDS) expect(serialize(parse(MESSAGES[id]))).toBe(crlf(MESSAGES[id]));
  });
});

describe('SPF', () => {
  it('matches ip4 ranges', () => {
    expect(inCidr('192.0.2.10', '192.0.2.0/28')).toBe(true);
    expect(inCidr('192.0.2.16', '192.0.2.0/28')).toBe(false);
    expect(inCidr('203.0.113.66', '203.0.113.66')).toBe(true);
  });

  it('gives pass, fail, softfail and neutral, by sender and qualifier', () => {
    const rec = (spf: string): Records => ({ ...NO_RECORDS, spf });
    expect(spf(DOMAIN, ipOf('order'), rec(OWN))).toBe('pass');
    expect(spf(DOMAIN, ipOf('spoofed'), rec(OWN))).toBe('fail');
    expect(spf(DOMAIN, ipOf('spoofed'), rec('v=spf1 ip4:192.0.2.0/28 ~all'))).toBe('softfail');
    expect(spf(DOMAIN, ipOf('spoofed'), rec('v=spf1 ip4:192.0.2.0/28 ?all'))).toBe('neutral');
    expect(spf(DOMAIN, ipOf('spoofed'), rec('v=spf1 +all'))).toBe('pass');
    expect(spf(DOMAIN, ipOf('order'), NO_RECORDS)).toBe('none');
    expect(spf(FORGER, ipOf('forged'), NO_RECORDS)).toBe('pass');
  });

  it('follows include to the vendor’s list', () => {
    const rec = { ...NO_RECORDS, spf: VENDOR_SPF };
    expect(spf(DOMAIN, ipOf('newsletter'), rec)).toBe('pass');
    expect(spf(DOMAIN, ipOf('newsletter'), { ...NO_RECORDS, spf: OWN })).toBe('fail');
    expect(spf(DOMAIN, ipOf('forwarded'), rec)).toBe('fail');
  });

  it('stops an include loop at the ten-lookup cap', () => {
    expect(spf('loop.example', '192.0.2.1', NO_RECORDS)).toBe('permerror');
  });
});

describe('DKIM', () => {
  it('relaxed canonicalisation tidies header and body whitespace', () => {
    expect(canonHeader({ name: 'Subject', value: ' Order  1207\r\n\tconfirmed ', raw: '' })).toBe(
      'subject:Order 1207 confirmed',
    );
    expect(canonBody('a  b \r\n\r\nc\t\r\n\r\n\r\n')).toBe('a b\r\n\r\nc\r\n');
    expect(canonBody('')).toBe('');
  });

  it('the DNS key is the demo key pair’s public half', async () => {
    const p = txt('demo2026._domainkey.larkspur.example', ALL_ON)!.match(/p=([^;\s]+)/)![1];
    const key = await crypto.subtle.importKey('jwk', demo.key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, [
      'sign',
    ]);
    const pub = await crypto.subtle.exportKey('jwk', key);
    const spki = await crypto.subtle.importKey(
      'spki',
      Uint8Array.from(atob(p), c => c.charCodeAt(0)),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['verify'],
    );
    expect((await crypto.subtle.exportKey('jwk', spki)).n).toBe(pub.n);
    expect(demo.note).toMatch(/public on purpose/);
  });

  it('verifies the real invoice; one changed byte fails; extra spaces still pass', async () => {
    const text = MESSAGES.invoice;
    expect(await verify(parse(text), ALL_ON)).toEqual({ result: 'pass', domain: DOMAIN });
    const digit = text.replace('1880.00', '1980.00');
    expect(digit.length).toBe(text.length);
    expect(await verify(parse(digit), ALL_ON)).toEqual({ result: 'fail', domain: DOMAIN });
    const spaced = text.replace('within 30 days.', 'within  30 days.   ');
    expect(await verify(parse(spaced), ALL_ON)).toEqual({ result: 'pass', domain: DOMAIN });
    const subject = text.replace('Subject: Invoice 1207', 'Subject: Invoice 1208');
    expect((await verify(parse(subject), ALL_ON)).result).toBe('fail');
  });

  it('the body hash in each signature is the body’s', async () => {
    for (const id of ['order', 'invoice', 'forwarded'] as const) {
      const m = parse(MESSAGES[id]);
      expect(header(m, 'dkim-signature')!.replace(/\s/g, '')).toContain(`bh=${await bodyHash(m.body)};`);
    }
  });

  it('unsigned mail has no result; with DKIM off Larkspur’s signature is gone', async () => {
    expect(await verify(parse(MESSAGES.forged), ALL_ON)).toEqual({ result: 'none' });
    expect(await verify(parse(messageAs('order', { ...ALL_ON, dkim: false })), ALL_ON)).toEqual({ result: 'none' });
  });

  it('the pinned verdicts are what verifying gives', async () => {
    const live = Object.fromEntries(
      await Promise.all(IDS.map(async id => [id, (await verify(parse(MESSAGES[id]), ALL_ON)).result])),
    );
    if (process.env.WRITE_PINNED) return write({ dkim: live });
    expect(live).toEqual(pinned.dkim);
    for (const id of IDS) expect(dkimOf(id, ALL_ON).result).toBe(pinned.dkim[id]);
  });
});

describe('DMARC and the spam score', () => {
  it('relaxed alignment compares organisational domains', () => {
    expect(orgOf('mail.larkspur.example')).toBe(DOMAIN);
    expect(orgOf(FORGER)).not.toBe(DOMAIN);
  });

  it('forwarding breaks SPF and keeps DKIM, so DMARC passes on alignment', () => {
    const v = verdictOf('forwarded', ALL_ON);
    expect([v.spf, v.dkim, v.dmarc, v.fate]).toEqual(['fail', 'pass', 'pass', 'inbox']);
  });

  it('the forged invoice passes SPF for its own domain, fails DMARC, and each policy routes it', () => {
    for (const [dmarc, fate] of [
      [null, 'inbox'],
      ['none', 'inbox'],
      ['quarantine', 'junk'],
      ['reject', 'bounced'],
    ] as const) {
      const v = verdictOf('forged', { ...ALL_ON, dmarc });
      expect(v.spf).toBe('pass');
      expect(v.dmarc).toBe(dmarc ? 'fail' : 'none');
      expect(v.fate, String(dmarc)).toBe(fate);
    }
  });

  it('with no records the real confirmation is junk and the forgery gets in (chapter 1’s problem)', () => {
    expect(verdictOf('order', NO_RECORDS).fate).toBe('junk');
    expect(verdictOf('order', NO_RECORDS).why).toBe('unvouched');
    expect(verdictOf('forged', NO_RECORDS).fate).toBe('inbox');
  });

  it('a message that passes DMARC can still be junk on its words', () => {
    const v = verdictOf('prize', NO_RECORDS);
    expect([v.dmarc, v.fate, v.why]).toEqual(['pass', 'junk', 'spam']);
  });

  it('counts words: the prize is spammy, every Larkspur message and the forgeries are not', () => {
    expect(tokens('Claim your FREE prize, now!')).toEqual(['claim', 'your', 'free', 'prize', 'now']);
    const scores = Object.fromEntries(IDS.map(id => [id, spamScore(parse(MESSAGES[id]))]));
    if (process.env.WRITE_PINNED) return write({ spam: scores });
    expect(scores).toEqual(pinned.spam);
    for (const id of IDS) expect(scores[id] >= 0.5, id).toBe(id === 'prize');
  });

  it('every message’s verdict under the chapters’ records is pinned', () => {
    const rows = Object.fromEntries(
      Object.entries(pinned.records).map(([k, rec]) => [
        k,
        Object.fromEntries(IDS.map(id => [id, verdictOf(id, rec as Records).fate])),
      ]),
    );
    if (process.env.WRITE_PINNED) return write({ verdicts: rows });
    expect(rows).toEqual(pinned.verdicts);
  });
});

function write(part: Record<string, unknown>) {
  const file = JSON.parse(readFileSync(PINNED, 'utf8'));
  writeFileSync(PINNED, `${JSON.stringify({ ...file, ...part }, null, 2)}\n`);
}

// the DNS fixture is made up, and its key record was written by the signing script
it('the DNS fixture holds the DKIM key and only .example names', () => {
  expect(dns.txt['demo2026._domainkey.larkspur.example']).toMatch(/^v=DKIM1; k=rsa; p=/);
  for (const name of [...Object.keys(dns.txt), ...Object.keys(dns.mx)]) expect(name).toMatch(/\.example$/);
});
