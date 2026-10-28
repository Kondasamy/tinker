// The made-up DNS the checks read (data/email/dns.json): nothing resolves for real. Larkspur's own SPF and DMARC
// records are the reader's settings (Records), so a chapter or the workbench passes them in; everything else is fixed.
import dns from '../../../data/email/dns.json' with { type: 'json' };
import story from '../../../data/email/story.json' with { type: 'json' };

export type Policy = 'none' | 'quarantine' | 'reject';
/** What Larkspur publishes and does: its SPF record, whether it signs with DKIM, and its DMARC policy. */
export interface Records {
  spf: string | null;
  dkim: boolean;
  dmarc: Policy | null;
}
export const NO_RECORDS: Records = { spf: null, dkim: false, dmarc: null };

const FIXED = dns.txt as Record<string, string>;

/** The TXT record at a name, or null. */
export function txt(name: string, rec: Records): string | null {
  const n = name.toLowerCase();
  if (n === story.domain) return rec.spf;
  if (n === `_dmarc.${story.domain}`) return rec.dmarc ? `v=DMARC1; p=${rec.dmarc}` : null;
  return FIXED[n] || null;
}

/** The server that accepts mail for a domain (its MX record). */
export const mxOf = (domain: string): string | null => (dns.mx as Record<string, string>)[domain.toLowerCase()] ?? null;
