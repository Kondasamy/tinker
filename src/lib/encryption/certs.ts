// Chapter 6's certificate checks, computed (KTD10). The fixture certificates (data/encryption/certs.json, .example
// names) are signed with toy-size RSA keys over the SHA-256 of their fields, the same signature chapter 4 teaches, so
// each check runs here, synchronously: the issuer is a root Larkspur already trusts, its signature verifies, the name
// is the one Larkspur asked for, and today falls inside the dates. shortcut: one link (root to supplier), no
// intermediates or revocation; real chains are X.509 with real-size keys.
import data from '../../../data/encryption/certs.json' with { type: 'json' };
import { SUPPLIER, TODAY } from './story';
import { verify } from './toy';

export type Cert = (typeof data.certs)[number];
export type CertId = 'genuine' | 'wrong-name' | 'expired' | 'unknown-root';
export const CERTS = data.certs as Cert[];
export const STORE = data.store;
export const certOf = (id: CertId) => CERTS.find(c => c.id === id)!;
export const ROOT = STORE[0].name;

/** The fields the issuer signed, in order. */
export const bodyOf = (c: Cert) => [c.subject, c.issuer, c.from, c.to, c.key.n, c.key.e].join('|');

export type CheckId = 'root' | 'signature' | 'name' | 'date';
export interface Check {
  id: CheckId;
  ok: boolean;
  /** what was checked, in words */
  said: string;
}

const big = (k: { n: number; e: number }) => ({ n: BigInt(k.n), e: BigInt(k.e) });

/** Every check on a certificate, for a name Larkspur asked for on a day. */
export function checkCert(c: Cert, name = SUPPLIER.domain, today = TODAY): Check[] {
  const trusted = STORE.find(r => r.name === c.issuer);
  return [
    {
      id: 'root',
      ok: !!trusted,
      said: trusted ? `Issued by ${c.issuer}, a trusted root` : `${c.issuer} is not a root Larkspur trusts`,
    },
    {
      id: 'signature',
      ok: !!trusted && verify(bodyOf(c), c.signature, big(trusted.key)),
      said: trusted ? 'The issuer’s signature checks' : 'No trusted key to check the signature with',
    },
    { id: 'name', ok: c.subject === name, said: `Made out to ${c.subject}` },
    { id: 'date', ok: c.from <= today && today <= c.to, said: `Valid ${c.from} to ${c.to}` },
  ];
}
/** Whether every check passes. */
export const trusts = (c: Cert) => checkCert(c).every(x => x.ok);
/** The first failing check, if any. */
export const failOf = (c: Cert) => checkCert(c).find(x => !x.ok);
