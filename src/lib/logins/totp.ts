// Time-based one-time passwords (RFC 6238 over RFC 4226's HOTP, HMAC-SHA1 by Web Crypto). The chapter's secret is a
// labelled demo value and its clock a fixed demo time (data/logins/story.json), so its code is pinned.
import { unhex } from './store';
import { NOW, TOTP_SECRET } from './story';

/** RFC 4226: an HMAC-SHA1 of the counter, dynamically truncated to `digits` digits. */
export async function hotp(key: Uint8Array<ArrayBuffer>, counter: number, digits = 6): Promise<string> {
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setBigUint64(0, BigInt(counter));
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, msg)),
    o = h[19] & 0xf,
    bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

/** RFC 6238: HOTP over the count of 30-second steps since 1970. */
export const totp = (key: Uint8Array<ArrayBuffer>, unixSeconds: number, digits = 6, step = 30) =>
  hotp(key, Math.floor(unixSeconds / step), digits);

export const DEMO_TOTP = { key: unhex(TOTP_SECRET), time: Date.parse(NOW) / 1000 };
