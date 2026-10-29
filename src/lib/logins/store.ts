// How Larkspur keeps its trade accounts' passwords (KTD3): as written, as a SHA-256 fingerprint, salted, or through
// PBKDF2 at a work factor. Accounts and the leaked list are hand-written demo data (data/logins/), never real
// credentials. SHA-256 is Locks and keys' own (sha256.ts, sync, so every picture stays pure); PBKDF2 runs in Web
// Crypto, so it is async, and its outputs are pinned in data/logins/pinned.json.
import data from '../../../data/logins/accounts.json' with { type: 'json' };
import leaked from '../../../data/logins/leaked.json' with { type: 'json' };
import { bytesOf, hashText } from '../encryption/sha256';

export type TypeId = 'builder' | 'staff';
export interface Account {
  id: string;
  name: string;
  type: TypeId;
  password: string;
  /** hex, fixed per demo account */
  salt: string;
}
export const ACCOUNTS = data.accounts as Account[];
export const TYPES = data.types as { id: TypeId; name: string; short: string }[];
export const LEAKED: string[] = leaked.passwords;

export function accountOf(id: string): Account {
  const a = ACCOUNTS.find(x => x.id === id);
  if (!a) throw new Error(`unknown account: ${id}`);
  return a;
}
export const firstName = (a: Account) => a.name.split(' ')[0];

/** What the table keeps for an account: the password itself, its SHA-256, or the SHA-256 of salt then password. */
export function fingerprint(a: Account, form: 'plain' | 'sha256' | 'salted'): string {
  return form === 'plain' ? a.password : hashText(form === 'salted' ? a.salt + a.password : a.password);
}

export const unhex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], b => Number.parseInt(b, 16));

/** PBKDF2-HMAC-SHA256 of a password with a hex salt, 32 bytes as hex, by the browser's Web Crypto. */
export async function pbkdf2(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', bytesOf(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations },
    key,
    256,
  );
  return [...new Uint8Array(bits)].map(x => x.toString(16).padStart(2, '0')).join('');
}
