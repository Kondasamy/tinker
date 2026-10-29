// Logins and passwords' engine against its pins (KTD3, KTD10): fingerprints and salts, PBKDF2 at each work factor, the
// cracking race, TOTP against RFC 6238's own vectors, and the sign-in checks (state, PKCE, signature, audience).
import { describe, expect, it } from 'vitest';
import { pbkdf2Sync } from 'node:crypto';
import pinned from '../../data/logins/pinned.json' with { type: 'json' };
import { ACCOUNTS, LEAKED, accountOf, fingerprint, pbkdf2 } from '../../src/lib/logins/store';
import { LAST, TICKS, WORK, boardAt, crackSeconds, guessesFor, rateOf, spaceOf } from '../../src/lib/logins/race';
import { DEMO_TOTP, hotp, totp } from '../../src/lib/logins/totp';
import { OTHER_TOKEN, TOKEN, challengeOf, checkSignIn, decode, tamper } from '../../src/lib/logins/oidc';
import { CLIENT, FORGED_STATE, STATE, THIEF_VERIFIER, VERIFIER } from '../../src/lib/logins/story';
import { FACTS, fact } from '../../src/lib/logins/facts';
import { bytesOf } from '../../src/lib/encryption/sha256';

const onList = ACCOUNTS.filter(a => LEAKED.includes(a.password));
const offList = ACCOUNTS.filter(a => !LEAKED.includes(a.password));

describe('the accounts', () => {
  it('are demo accounts, at most 12, with one shared password and some on the leaked list', () => {
    expect(ACCOUNTS.length).toBeLessThanOrEqual(12);
    expect(new Set(ACCOUNTS.map(a => a.password)).size).toBe(ACCOUNTS.length - 1);
    expect(onList.length).toBeGreaterThan(0);
    expect(offList.length).toBeGreaterThan(0);
  });
});

describe('fingerprints and salt', () => {
  const [a, b] = ACCOUNTS.filter(x => ACCOUNTS.some(y => y !== x && y.password === x.password));
  it('the two accounts sharing a password share a plain hash and get different salted hashes', () => {
    expect(fingerprint(a, 'sha256')).toBe(fingerprint(b, 'sha256'));
    expect(fingerprint(a, 'salted')).not.toBe(fingerprint(b, 'salted'));
  });
  it('plain keeps the password as written; every fingerprint matches its pin', () => {
    expect(fingerprint(a, 'plain')).toBe(a.password);
    for (const x of ACCOUNTS) {
      expect(fingerprint(x, 'sha256')).toBe(pinned.sha256[x.id as keyof typeof pinned.sha256]);
      expect(fingerprint(x, 'salted')).toBe(pinned.salted[x.id as keyof typeof pinned.salted]);
    }
  });
  it('PBKDF2 at each pinned work factor matches pinned.json and Node’s own PBKDF2', async () => {
    const x = accountOf(pinned.pbkdf2.account);
    for (const n of WORK) {
      const got = await pbkdf2(x.password, x.salt, n);
      expect(got).toBe(pinned.pbkdf2.hex[String(n) as keyof typeof pinned.pbkdf2.hex]);
      expect(got).toBe(pbkdf2Sync(x.password, Buffer.from(x.salt, 'hex'), n, 32, 'sha256').toString('hex'));
    }
  });
});

describe('the cracking race', () => {
  it('reads its guess rates from dated facts, and slower work factors guess slower', () => {
    expect(rateOf('sha256', 1)).toBe(Number(fact('gpu-sha256').value));
    expect(rateOf('pbkdf2', 999)).toBeCloseTo(Number(fact('gpu-pbkdf2').value));
    expect(WORK[0]).toBe(Number(fact('sp800-132').value));
    expect(WORK.at(-1)).toBe(Number(fact('owasp-pbkdf2').value));
    expect(rateOf('pbkdf2', WORK[2])).toBeLessThan(rateOf('pbkdf2', WORK[0]));
    expect(rateOf('plain', 1)).toBe(Number.POSITIVE_INFINITY);
  });
  it('a password on the list costs its place on it; any other, the whole list and then its brute-force space', () => {
    expect(guessesFor(LEAKED[0])).toBe(1);
    expect(guessesFor('hinge4u')).toBe(LEAKED.length + 36 ** 7);
    expect(spaceOf('Gr8-Pl4ster-Day!')).toBe(95 ** 16);
  });
  it('plain storage hands over every account at once', () => {
    expect(boardAt('plain', WORK[0], 0).cracked).toHaveLength(ACCOUNTS.length);
  });
  it('plain SHA-256 cracks every leaked-list account within the first tick', () => {
    const first = boardAt('sha256', WORK[0], 0).cracked;
    for (const a of onList) expect(first).toContain(a.id);
  });
  it('under PBKDF2 at the top work factor, leaked-list accounts still crack and the others never do', () => {
    const top = WORK.at(-1)!,
      end = boardAt('pbkdf2', top, LAST).cracked;
    expect(end.sort()).toEqual(onList.map(a => a.id).sort());
    for (const a of onList) expect(crackSeconds(a, 'pbkdf2', top)).toBeLessThan(TICKS[0].seconds);
  });
  it('salt makes each guess work on one account at a time: every crack takes as many times longer as there are accounts', () => {
    for (const a of ACCOUNTS)
      expect(crackSeconds(a, 'salted', 1) / crackSeconds(a, 'sha256', 1)).toBeCloseTo(ACCOUNTS.length);
  });
  it('the board only ever grows, and its guess counter is the rate times the time', () => {
    for (const f of ['sha256', 'salted', 'pbkdf2'] as const)
      for (let t = 1; t <= LAST; t++) {
        const [was, now] = [boardAt(f, WORK[1], t - 1), boardAt(f, WORK[1], t)];
        for (const id of was.cracked) expect(now.cracked).toContain(id);
        expect(now.guesses).toBeCloseTo(rateOf(f, WORK[1]) * TICKS[t].seconds);
      }
  });
  it('the pinned boards hold', () => {
    for (const [k, ids] of Object.entries(pinned.race)) {
      const [f, w] = k.split(':');
      expect(boardAt(f as 'sha256', Number(w), LAST).cracked).toEqual(ids);
    }
  });
});

describe('TOTP (RFC 6238)', () => {
  const KEY = bytesOf('12345678901234567890');
  it('produces RFC 6238’s published SHA-1 codes', async () => {
    const vectors: [number, string][] = [
      [59, '94287082'],
      [1111111109, '07081804'],
      [1111111111, '14050471'],
      [1234567890, '89005924'],
      [2000000000, '69279037'],
      [20000000000, '65353130'],
    ];
    for (const [t, code] of vectors) expect(await totp(KEY, t, 8)).toBe(code);
  });
  it('HOTP matches RFC 4226’s first vectors', async () => {
    expect(await hotp(KEY, 0, 6)).toBe('755224');
    expect(await hotp(KEY, 1, 6)).toBe('287082');
  });
  it('the demo code at the demo time is pinned', async () => {
    expect(await totp(DEMO_TOTP.key, DEMO_TOTP.time)).toBe(pinned.totp);
  });
});

describe('sign in with another site', () => {
  const ok = { state: STATE, verifier: VERIFIER, token: TOKEN };
  const failed = async (x: Partial<typeof ok>) =>
    (await checkSignIn({ ...ok, ...x })).filter(c => !c.ok).map(c => c.id);
  it('the code challenge is the base64url SHA-256 of the verifier (RFC 7636’s own example)', () => {
    expect(challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });
  it('the genuine sign-in passes every check', async () => {
    expect(await failed({})).toEqual([]);
    expect(decode(TOKEN).payload.aud).toBe(CLIENT);
  });
  it('a one-letter change, a wrong audience, a wrong state and a wrong PKCE verifier each fail with their own reason', async () => {
    expect(await failed({ token: tamper(TOKEN) })).toEqual(['signature']);
    expect(await failed({ token: OTHER_TOKEN })).toEqual(['audience']);
    expect(await failed({ state: FORGED_STATE })).toEqual(['state']);
    expect(await failed({ verifier: THIEF_VERIFIER })).toEqual(['pkce']);
  });
});

describe('facts', () => {
  it('every fact has a claim, an https source and an access date', () => {
    for (const f of FACTS) {
      expect(f.claim.length).toBeGreaterThan(20);
      expect(f.source).toMatch(/^https:\/\//);
      expect(fact(f.id).accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
