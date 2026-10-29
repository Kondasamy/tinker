// DKIM (RFC 6376), cut to the module's needs: rsa-sha256 with relaxed/relaxed canonicalisation, verified by the
// browser's Web Crypto against the public key in (made-up) DNS at <selector>._domainkey.<domain>. The signatures in
// data/email/messages/ were made once by scripts/sign-email.mjs with a labelled demo key; nothing here signs.
// The script repeats canonHeader, canonBody and signedData in plain JS; verifying its signatures here proves they agree.
import { header, type Header, type Message } from './parse';
import { txt, type Records } from './dns';

export type DkimResult = { result: 'pass' | 'fail'; domain: string } | { result: 'none' };
const ALG = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;

/** Relaxed header canonicalisation (§3.4.2): lower-case name, unfolded value, runs of spaces as one, ends trimmed. */
export const canonHeader = (h: Pick<Header, 'name' | 'value'>) =>
  `${h.name.trim().toLowerCase()}:${h.value
    .replace(/\r\n(?=[ \t])/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()}`;

/** Relaxed body canonicalisation (§3.4.4): runs of spaces as one, none at line ends, no empty lines at the end. */
export function canonBody(body: string): string {
  const lines = body.split('\r\n').map(l => l.replace(/[ \t]+/g, ' ').replace(/ $/, ''));
  while (lines.length && lines.at(-1) === '') lines.pop();
  return lines.length ? `${lines.join('\r\n')}\r\n` : '';
}

const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const utf8 = (s: string) => new TextEncoder().encode(s);

export const bodyHash = async (body: string) => b64(await crypto.subtle.digest('SHA-256', utf8(canonBody(body))));

/** A tag list (`a=b; c=d`) as an object, whitespace removed from values. */
export const tagsOf = (v: string) =>
  Object.fromEntries(
    v
      .split(';')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => [t.slice(0, t.indexOf('=')).trim(), t.slice(t.indexOf('=') + 1).replace(/\s+/g, '')]),
  ) as Record<string, string>;

/** What the signature covers: each signed header (bottom-most instance), then the signature header with b= empty. */
export function signedData(m: Message, sig: Header): string {
  const names = tagsOf(sig.value).h.split(':');
  let out = '';
  for (const n of names) {
    const h = m.headers.findLast(x => x.name.toLowerCase() === n.toLowerCase());
    if (h) out += `${canonHeader(h)}\r\n`;
  }
  return out + canonHeader({ name: sig.name, value: sig.value.replace(/(^|;)(\s*b=)[^;]*/, '$1$2') });
}

/** Checks the message's DKIM signature, if it has one. */
export async function verify(m: Message, rec: Records): Promise<DkimResult> {
  const sig = m.headers.find(h => h.name.toLowerCase() === 'dkim-signature');
  if (!sig || !header(m, 'dkim-signature')) return { result: 'none' };
  const t = tagsOf(sig.value),
    domain = t.d,
    fail = { result: 'fail' as const, domain };
  const p = txt(`${t.s}._domainkey.${domain}`, rec)?.match(/p=([^;\s]+)/)?.[1];
  if (!p || t.a !== 'rsa-sha256') return fail;
  if ((await bodyHash(m.body)) !== t.bh) return fail;
  try {
    const key = await crypto.subtle.importKey('spki', unb64(p), ALG, false, ['verify']);
    const ok = await crypto.subtle.verify(ALG, key, unb64(t.b), utf8(signedData(m, sig)));
    return ok ? { result: 'pass', domain } : fail;
  } catch {
    return fail;
  }
}
