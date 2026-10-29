// The real algorithms, run by the browser's Web Crypto with fixed demo keys (KTD10, data/encryption/demo-keys.json,
// labelled demo and used nowhere else): AES-GCM with a fixed demo IV, so its ciphertext is pinned, and an ECDSA P-256
// signature committed once and verified live. Both are async, as Web Crypto is.
import demo from '../../../data/encryption/demo-keys.json' with { type: 'json' };
import pinned from '../../../data/encryption/pinned.json' with { type: 'json' };
import { bytesOf } from './sha256';

export const DEMO = demo;
/** The ECDSA signature over the supplier's invoice, made once with the demo key (P1363: r then s). */
export const SIGNATURE = pinned.ecdsa;

export const unhex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], b => Number.parseInt(b, 16));
export const hex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

const aesKey = () => crypto.subtle.importKey('raw', unhex(demo.aes.key), 'AES-GCM', false, ['encrypt', 'decrypt']);
const iv = () => unhex(demo.aes.iv);

/** Lock a text with the demo AES key: the ciphertext and its 16-byte tag, as hex. */
export async function aesLock(text: string): Promise<string> {
  return hex(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv() }, await aesKey(), bytesOf(text)));
}
/** Open it again; a changed byte fails the tag check, and this resolves null. */
export async function aesOpen(cipher: string): Promise<string | null> {
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv() }, await aesKey(), unhex(cipher));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

const ecdsa = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const publicJwk = { kty: 'EC', crv: 'P-256', x: demo.ecdsa.x, y: demo.ecdsa.y, ext: true };
/** Check a text against a signature with the supplier's demo public key. */
export async function ecdsaVerify(text: string, sig = SIGNATURE): Promise<boolean> {
  const key = await crypto.subtle.importKey('jwk', publicJwk, ecdsa, false, ['verify']);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unhex(sig), bytesOf(text));
}
/** Sign with the demo private key (tests only: the page verifies the committed signature). */
export async function ecdsaSign(text: string): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', { ...publicJwk, d: demo.ecdsa.d }, ecdsa, false, ['sign']);
  return hex(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, bytesOf(text)));
}
