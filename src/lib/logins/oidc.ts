// Sign in with another site (KTD3): OAuth's authorization code flow with PKCE and state, and OpenID Connect's signed ID
// token. The token is a compact JWT (ES256) signed once with Locks and keys' demo ECDSA key (data/encryption/
// demo-keys.json, labelled demo) and committed in data/logins/pinned.json; the page verifies it live with Web Crypto.
// Every check is computed: the code challenge is the base64url SHA-256 of the verifier (RFC 7636's S256), a code
// redeemed with the wrong verifier fails, and a changed token or another site's token fails its own check.
import pinned from '../../../data/logins/pinned.json' with { type: 'json' };
import { bytesOf, sha256 } from '../encryption/sha256';
import { ecdsaSign, ecdsaVerify } from '../encryption/real';
import { unhex } from './store';
import { CLIENT, GUILD, NOW, SIGNER, STATE, VERIFIER } from './story';

export const b64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const hexOf = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');

/** RFC 7636 S256: the code challenge is BASE64URL(SHA-256(verifier)). */
export const challengeOf = (verifier: string) => b64url(unhex(sha256(bytesOf(verifier))));
/** The challenge Larkspur sends at the start; only the verifier it kept hashes to it. */
export const CHALLENGE = challengeOf(VERIFIER);

/** The Guild's ID token for Larkspur, and one it issued to another app (wrong audience). Both genuinely signed. */
export const TOKEN = pinned.token;
export const OTHER_TOKEN = pinned.otherToken;

export interface Claims {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
}
export function decode(token: string): { header: Record<string, string>; payload: Claims } {
  const [h, p] = token.split('.');
  const json = (s: string) => JSON.parse(new TextDecoder().decode(unb64url(s)));
  return { header: json(h), payload: json(p) };
}

/** The token with one letter of who it names changed, and its signature left as it was. */
export function tamper(token: string): string {
  const [h, p, s] = token.split('.');
  const json = new TextDecoder().decode(unb64url(p)).replace(`"sub":"${SIGNER}"`, `"sub":"${SIGNER.slice(0, -1)}x"`);
  return [h, b64url(bytesOf(json)), s].join('.');
}

/** Sign claims for an audience with the demo key (once, to make the committed tokens; tests only). */
export async function makeToken(aud: string): Promise<string> {
  const iat = Date.parse(NOW) / 1000;
  const head = b64url(bytesOf(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'demo' }))),
    body = b64url(bytesOf(JSON.stringify({ iss: GUILD.issuer, sub: SIGNER, aud, iat, exp: iat + 3600 })));
  return `${head}.${body}.${b64url(unhex(await ecdsaSign(`${head}.${body}`)))}`;
}

export type CheckId = 'state' | 'pkce' | 'signature' | 'audience';
export interface Check {
  id: CheckId;
  ok: boolean;
  said: string;
}

/** What Larkspur checks when the browser comes back: the state it sent, the verifier behind the challenge, the
 * Guild's signature on the token, and that the token names Larkspur as its audience. */
export async function checkSignIn(x: { state: string; verifier: string; token: string }): Promise<Check[]> {
  const [h, p, s] = x.token.split('.');
  let signed = false;
  try {
    signed = await ecdsaVerify(`${h}.${p}`, hexOf(unb64url(s)));
  } catch {
    signed = false;
  }
  const aud = decode(x.token).payload.aud;
  return [
    {
      id: 'state',
      ok: x.state === STATE,
      said: x.state === STATE ? 'State matches the one sent' : 'State is not the one sent',
    },
    {
      id: 'pkce',
      ok: challengeOf(x.verifier) === CHALLENGE,
      said:
        challengeOf(x.verifier) === CHALLENGE ? 'Verifier hashes to the challenge' : 'Verifier misses the challenge',
    },
    { id: 'signature', ok: signed, said: signed ? 'Guild’s signature holds' : 'Signature fails' },
    { id: 'audience', ok: aud === CLIENT, said: aud === CLIENT ? 'Made for Larkspur' : `Made for ${aud}` },
  ];
}
