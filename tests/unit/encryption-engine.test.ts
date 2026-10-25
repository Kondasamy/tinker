// Locks and keys' engine against its pins (KTD10, KTD12): toy Diffie–Hellman and RSA, SHA-256 against Web Crypto and
// the FIPS 180-4 vector, the real AES-GCM and ECDSA with the demo keys, and the certificate checks.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/encryption/pinned.json' with { type: 'json' };
import story from '../../data/encryption/story.json' with { type: 'json' };
import {
  DH,
  KEYS,
  TOY,
  decrypt,
  encrypt,
  modInv,
  modPow,
  publicOf,
  sharedOf,
  sign,
  verify,
} from '../../src/lib/encryption/toy';
import { bitsDiffer, bytesOf, hashText, sha256 } from '../../src/lib/encryption/sha256';
import { aesLock, aesOpen, ecdsaSign, ecdsaVerify } from '../../src/lib/encryption/real';
import { CERTS, bodyOf, certOf, checkCert, failOf, trusts, type Cert } from '../../src/lib/encryption/certs';
import { EDITED, FORGED, INVOICE, ORDER, ORDER_NUMBER } from '../../src/lib/encryption/story';
import { FACTS } from '../../src/lib/encryption/facts';

describe('toy Diffie–Hellman', () => {
  const B = publicOf(TOY.dh.supplier.secret);
  it('both sides reach the same pinned shared number for every secret', () => {
    expect(B).toBe(pinned.dh.supplier);
    for (const s of TOY.dh.secrets) {
      const pin = pinned.dh.secrets[s.pigment as 'rose'];
      const A = publicOf(s.secret);
      expect(A).toBe(pin.public);
      expect(sharedOf(B, s.secret)).toBe(pin.shared);
      expect(sharedOf(A, TOY.dh.supplier.secret)).toBe(pin.shared);
    }
  });
  it('an eavesdropper sees only the public numbers, never a secret or the shared number', () => {
    for (const s of TOY.dh.secrets) {
      const seen = [Number(DH.p), Number(DH.g), B, publicOf(s.secret)];
      expect(seen).not.toContain(s.secret);
      expect(seen).not.toContain(TOY.dh.supplier.secret);
    }
  });
  it('modPow and modInv agree with small cases', () => {
    expect(modPow(4n, 13n, 497n)).toBe(445n);
    expect(modInv(17n, 3120n)).toBe(2753n);
    expect(() => modInv(6n, 9n)).toThrow();
  });
});

describe('toy RSA', () => {
  it('the keys match the pins', () => {
    for (const [k, v] of Object.entries(KEYS)) {
      const pin = pinned.rsa[k as 'root'];
      expect([Number(v.n), Number(v.d)]).toEqual([pin.n, pin.d]);
    }
  });
  it('encrypt then decrypt returns the message, and the box is the pinned number', () => {
    const c = encrypt(ORDER_NUMBER, KEYS.supplier);
    expect(c).toBe(pinned.locked);
    expect(decrypt(c, KEYS.supplier)).toBe(ORDER_NUMBER);
    expect(c).not.toBe(ORDER_NUMBER);
  });
  it('a message at or above n is refused with a clear error', () => {
    expect(() => encrypt(Number(KEYS.supplier.n), KEYS.supplier)).toThrow(/from 0 to 3232/);
    expect(() => encrypt(-1, KEYS.supplier)).toThrow(RangeError);
    expect(() => encrypt(1.5, KEYS.supplier)).toThrow(RangeError);
  });
  it('sign then verify passes; a message changed by one character fails', () => {
    const s = sign(INVOICE, KEYS.supplier);
    expect(s).toBe(pinned.signed);
    expect(verify(INVOICE, s, KEYS.supplier)).toBe(true);
    expect(verify(EDITED, s, KEYS.supplier)).toBe(false);
    expect(verify(FORGED, s, KEYS.supplier)).toBe(false);
    expect(verify(INVOICE, s, KEYS.root)).toBe(false);
  });
});

describe('SHA-256', () => {
  it('“abc” gives the FIPS 180-4 vector', () => {
    expect(hashText('abc')).toBe(pinned.abc);
  });
  it('agrees with Web Crypto across block boundaries', async () => {
    for (const s of ['', 'abc', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(64), `${INVOICE} £\n`.repeat(30)]) {
      const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytesOf(s)));
      expect(sha256(bytesOf(s))).toBe([...d].map(b => b.toString(16).padStart(2, '0')).join(''));
    }
  });
  it('one character changed flips about half the bits (the pinned count)', () => {
    expect([...INVOICE].filter((c, i) => c !== EDITED[i])).toHaveLength(1);
    expect(hashText(INVOICE)).toBe(pinned.invoice);
    expect(hashText(EDITED)).toBe(pinned.edited);
    const n = bitsDiffer(hashText(INVOICE), hashText(EDITED));
    expect(n).toBe(pinned.flipped);
    expect(n).toBeGreaterThan(256 * 0.35);
    expect(n).toBeLessThan(256 * 0.65);
  });
});

describe('the real algorithms, demo keys', () => {
  it('AES-GCM gives the pinned ciphertext and opens back', async () => {
    const c = await aesLock(ORDER);
    expect(c).toBe(pinned.aes);
    expect(await aesOpen(c)).toBe(ORDER);
  });
  it('a flipped ciphertext byte fails authentication', async () => {
    const flip = (h: string, i: number) =>
      h.slice(0, i) + (Number.parseInt(h[i], 16) ^ 1).toString(16) + h.slice(i + 1);
    expect(await aesOpen(flip(pinned.aes, 0))).toBeNull();
    expect(await aesOpen(flip(pinned.aes, pinned.aes.length - 1))).toBeNull();
  });
  it('the committed ECDSA signature verifies, and fails with a changed byte or text', async () => {
    expect(await ecdsaVerify(INVOICE)).toBe(true);
    expect(await ecdsaVerify(EDITED)).toBe(false);
    expect(await ecdsaVerify(INVOICE, `${pinned.ecdsa.slice(0, 10)}00${pinned.ecdsa.slice(12)}`)).toBe(false);
    expect(await ecdsaVerify(FORGED, await ecdsaSign(FORGED))).toBe(true);
  });
});

describe('certificates', () => {
  it('each fixture fails exactly the pinned checks', () => {
    for (const c of CERTS)
      expect(
        checkCert(c)
          .filter(x => !x.ok)
          .map(x => x.id),
      ).toEqual(pinned.certs[c.id as 'genuine']);
  });
  it('the genuine chain passes; a wrong name, an expired date or an unknown root each fail with their own reason', () => {
    expect(trusts(certOf('genuine'))).toBe(true);
    expect(failOf(certOf('wrong-name'))!.said).toContain(story.impostor.domain);
    expect(failOf(certOf('expired'))!.id).toBe('date');
    expect(failOf(certOf('unknown-root'))!.said).toMatch(/not a root Larkspur trusts/);
  });
  it('a certificate edited after signing fails its signature', () => {
    const g = certOf('genuine'),
      moved: Cert = { ...g, to: '2030-03-01' };
    expect(bodyOf(moved)).not.toBe(bodyOf(g));
    expect(checkCert(moved).find(x => x.id === 'signature')!.ok).toBe(false);
  });
  it('every name is reserved for documentation', () => {
    for (const c of CERTS) expect(c.subject).toMatch(/\.example$/);
  });
});

describe('facts', () => {
  it('each has a source and a claim', () => {
    for (const f of FACTS) {
      expect(f.source).toMatch(/^https:\/\//);
      expect(f.claim.length).toBeGreaterThan(20);
    }
  });
});
