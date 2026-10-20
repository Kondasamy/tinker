// Small text formatters shared by pages, chapters and the tool engine. Dependency-free: Node-run specs import it too.

/** A count with thousands separators, e.g. 1,234. */
export const num = (n: number) => n.toLocaleString('en-US');

/** A dollar amount with cents, e.g. $1,234.50. */
export const money = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** An ISO date as a long British date in UTC, e.g. 3 March 2026. */
export const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
