// Toy-size Diffie–Hellman and RSA in BigInt (KTD10), over the small primes in data/encryption/toy.json. Every number
// is small enough to show and to check by hand; the copy labels each one "toy size". The same maths at real sizes
// lives in vetted libraries, never in code like this.
import toy from '../../../data/encryption/toy.json' with { type: 'json' };
import { hashText } from './sha256';

export const TOY = toy;

/** b^e mod m, by squaring. */
export function modPow(b: bigint, e: bigint, m: bigint): bigint {
  let r = 1n,
    x = ((b % m) + m) % m,
    k = e;
  for (; k > 0n; k >>= 1n, x = (x * x) % m) if (k & 1n) r = (r * x) % m;
  return r;
}

/** a⁻¹ mod m, by the extended Euclidean algorithm; throws when a and m share a factor. */
export function modInv(a: bigint, m: bigint): bigint {
  let [r0, r1, s0, s1] = [((a % m) + m) % m, m, 1n, 0n];
  while (r1) {
    const q = r0 / r1;
    [r0, r1, s0, s1] = [r1, r0 - q * r1, s1, s0 - q * s1];
  }
  if (r0 !== 1n) throw new Error(`${a} has no inverse mod ${m}`);
  return ((s0 % m) + m) % m;
}

// ---- Diffie–Hellman ----

export const DH = { p: BigInt(toy.dh.p), g: BigInt(toy.dh.g) };
/** A side's public number: g^secret mod p. Anyone may see it. */
export const publicOf = (secret: number) => Number(modPow(DH.g, BigInt(secret), DH.p));
/** The shared number: the other side's public number to the power of your own secret. */
export const sharedOf = (theirPublic: number, mySecret: number) =>
  Number(modPow(BigInt(theirPublic), BigInt(mySecret), DH.p));

// ---- RSA ----

export interface RsaKey {
  n: bigint;
  e: bigint;
  /** the private exponent: only the owner holds it */
  d: bigint;
}
export type Public = Pick<RsaKey, 'n' | 'e'>;
/** A key pair from two primes and a public exponent. */
export function rsaKey({ p, q, e }: { p: number; q: number; e: number }): RsaKey {
  const P = BigInt(p),
    Q = BigInt(q),
    E = BigInt(e);
  return { n: P * Q, e: E, d: modInv(E, (P - 1n) * (Q - 1n)) };
}
export const KEYS = {
  supplier: rsaKey(toy.rsa.supplier),
  root: rsaKey(toy.rsa.root),
  lookalike: rsaKey(toy.rsa.lookalike),
};

/** Close the padlock: m^e mod n. A message must be a whole number below n, else it can't come back. */
export function encrypt(m: number, k: Public): number {
  if (!Number.isInteger(m) || m < 0 || BigInt(m) >= k.n)
    throw new RangeError(`message ${m} must be a whole number from 0 to ${k.n - 1n}`);
  return Number(modPow(BigInt(m), k.e, k.n));
}
/** Open it with the private key: c^d mod n. */
export const decrypt = (c: number, k: RsaKey) => Number(modPow(BigInt(c), k.d, k.n));

/** A text's fingerprint cut down to the toy key's size: SHA-256 as a number, mod n. */
export const digestOf = (text: string, n: bigint) => Number(BigInt(`0x${hashText(text)}`) % n);
/** Sign: the fingerprint to the private power. */
export const sign = (text: string, k: RsaKey) => Number(modPow(BigInt(digestOf(text, k.n)), k.d, k.n));
/** Verify: the signature to the public power must give back the text's fingerprint. */
export const verify = (text: string, sig: number, k: Public) =>
  Number(modPow(BigInt(sig), k.e, k.n)) === digestOf(text, k.n);
