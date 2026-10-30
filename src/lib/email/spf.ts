// SPF (RFC 7208), cut to what the module needs: `ip4`, `include` and `all`, each with its qualifier. The receiver asks
// the envelope sender's domain for its list and checks the IP that handed it the message. An include that reaches more
// than ten lookups is a permerror (RFC 7208 §4.6.4), which also ends a loop.
import { txt, type Records } from './dns';
import { fact } from './facts';

export type SpfResult = 'pass' | 'fail' | 'softfail' | 'neutral' | 'none' | 'permerror';
const QUALIFIER: Record<string, SpfResult> = { '+': 'pass', '-': 'fail', '~': 'softfail', '?': 'neutral' };
export const LOOKUP_LIMIT = Number(fact('spf').value);

const num = (ip: string) => ip.split('.').reduce((a, o) => a * 256 + Number(o), 0);
/** Whether an IPv4 address falls in `a.b.c.d/n` (or equals `a.b.c.d`). */
export function inCidr(ip: string, cidr: string): boolean {
  const [base, bits = '32'] = cidr.split('/');
  const size = 2 ** (32 - Number(bits));
  return Math.floor(num(ip) / size) === Math.floor(num(base) / size);
}

export function spf(domain: string, ip: string, rec: Records, lookups = { n: 0 }): SpfResult {
  const record = txt(domain, rec);
  if (!record?.startsWith('v=spf1')) return 'none';
  for (const term of record.split(/\s+/).slice(1)) {
    const q = '+-~?'.includes(term[0]) ? term[0] : '+',
      mech = q === term[0] ? term.slice(1) : term;
    if (mech === 'all') return QUALIFIER[q];
    if (mech.startsWith('ip4:')) {
      if (inCidr(ip, mech.slice(4))) return QUALIFIER[q];
    } else if (mech.startsWith('include:')) {
      if (++lookups.n > LOOKUP_LIMIT) return 'permerror';
      const r = spf(mech.slice(8), ip, rec, lookups);
      if (r === 'pass') return QUALIFIER[q];
      if (r === 'permerror' || r === 'none') return 'permerror';
    } else return 'permerror';
  }
  return 'neutral';
}
