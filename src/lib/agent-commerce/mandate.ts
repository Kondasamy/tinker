// Who said it could buy? (chapter 4, KTD7): the builder signs a spending slip, a mandate, with their own demo ECDSA
// P-256 key (data/agent-commerce/demo-key.json, labelled demo, used nowhere else) through the browser's Web Crypto. The
// buying agent carries the signed slip but never the key. The reader's "Sign" signs live in the page, on purpose unlike
// Locks and keys' sign-in-tests-only rule; ECDSA signatures are randomised, so only verdicts are pinned, never bytes.
import key from '../../../data/agent-commerce/demo-key.json' with { type: 'json' };
import { BUILDER, TODAY } from './story';

export const DEMO_KEY = key;

/** What the builder allows. Prices in US cents; `*` in `merchants` or `items` allows any; an item is a sku or `category:<name>`. */
export interface Mandate {
  buyer: string;
  merchants: string[];
  items: string[];
  cap: number;
  currency: string;
  /** ISO time after which the slip is no good */
  expiry: string;
  /** a one-time number: the shop accepts each slip once */
  nonce: string;
}
export interface Slip {
  mandate: Mandate;
  /** the ECDSA signature over `canonical(mandate)`, P1363 (r then s), hex */
  sig: string;
}

/** The exact bytes signed: every field in a fixed order, so the same slip always signs the same text. */
export const canonical = (m: Mandate) =>
  JSON.stringify({
    buyer: m.buyer,
    merchants: m.merchants,
    items: m.items,
    cap: m.cap,
    currency: m.currency,
    expiry: m.expiry,
    nonce: m.nonce,
  });

export const addHours = (iso: string, h: number) => new Date(Date.parse(iso) + h * 3600e3).toISOString();

/** A slip of the builder's terms, starting now and good for `hours`. */
export const mandateOf = (
  t: { merchants: string[]; items: string[]; cap: number; hours: number },
  nonce: string,
): Mandate => ({
  buyer: BUILDER.firm,
  merchants: t.merchants,
  items: t.items,
  cap: t.cap,
  currency: 'USD',
  expiry: addHours(TODAY, t.hours),
  nonce,
});

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], b => Number.parseInt(b, 16));
const bytes = (m: Mandate) => new TextEncoder().encode(canonical(m));
const ecdsa = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const signing = { name: 'ECDSA', hash: 'SHA-256' } as const;
const publicJwk = { kty: 'EC', crv: 'P-256', x: key.x, y: key.y, ext: true };

/** Sign with the builder's demo key, or with `other` (any other private key, to show a forged slip failing). */
export async function sign(m: Mandate, other?: CryptoKey): Promise<Slip> {
  const k = other ?? (await crypto.subtle.importKey('jwk', { ...publicJwk, d: key.d }, ecdsa, false, ['sign']));
  return { mandate: m, sig: hex(await crypto.subtle.sign(signing, k, bytes(m))) };
}

/** Does the signature match this slip and the builder's public key? Any change to any field fails it. */
export async function verify(slip: Slip): Promise<boolean> {
  try {
    const k = await crypto.subtle.importKey('jwk', publicJwk, ecdsa, false, ['verify']);
    return await crypto.subtle.verify(signing, k, unhex(slip.sig), bytes(slip.mandate));
  } catch {
    return false;
  }
}
