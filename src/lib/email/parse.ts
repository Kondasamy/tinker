// RFC 5322 messages as the fixtures hold them (data/email/messages/): header lines, unfolded, then a blank line and the
// body. Line ends become CRLF, as on the wire. Each mail server that takes a message adds a Received header on top
// (RFC 5321 §4.4), so read bottom-up they give the route in time order: the postmarks.

export interface Header {
  name: string;
  /** the value, folds kept, without the trailing CRLF */
  value: string;
  /** the whole field as written, folds kept */
  raw: string;
}
export interface Message {
  headers: Header[];
  /** everything after the blank line, CRLF line ends */
  body: string;
}
/** One handover: `by` took the message from `from` (at `ip`) at `at`. */
export interface Hop {
  from: string;
  ip: string;
  by: string;
  /** ISO time */
  at: string;
  /** HH:MM:SS, UTC */
  time: string;
}

export const crlf = (s: string) => s.replace(/\r?\n/g, '\r\n');

export function parse(text: string): Message {
  const t = crlf(text),
    split = t.indexOf('\r\n\r\n');
  const head = split < 0 ? t : t.slice(0, split),
    body = split < 0 ? '' : t.slice(split + 4);
  const headers: Header[] = [];
  for (const line of head.split('\r\n')) {
    const last = headers.at(-1);
    if (/^[ \t]/.test(line) && last) {
      last.raw += `\r\n${line}`;
      last.value += `\r\n${line}`;
      continue;
    }
    const at = line.indexOf(':');
    headers.push({ name: line.slice(0, at), value: line.slice(at + 1), raw: line });
  }
  return { headers, body };
}

export const serialize = (m: Message) => `${m.headers.map(h => h.raw).join('\r\n')}\r\n\r\n${m.body}`;

/** The value of the first (topmost) header with this name, unfolded and trimmed. */
export function header(m: Message, name: string): string | undefined {
  const h = m.headers.find(x => x.name.toLowerCase() === name.toLowerCase());
  return h?.value.replace(/\r\n[ \t]/g, ' ').trim();
}

/** The address in a field like `Name <a@b>`, or the field itself. */
export const addressOf = (v: string) => (v.match(/<([^>]*)>/)?.[1] ?? v).trim().toLowerCase();
export const domainOf = (address: string) => address.slice(address.lastIndexOf('@') + 1).toLowerCase();

/** The From line the reader sees: whatever the sender wrote. */
export const fromOf = (m: Message) => addressOf(header(m, 'from') ?? '');
/** The envelope sender (MAIL FROM), as the final server recorded it in Return-Path. */
export const envelopeOf = (m: Message) => addressOf(header(m, 'return-path') ?? '');

/** The Received headers as hops, bottom (first) to top (last). */
export function hops(m: Message): Hop[] {
  return m.headers
    .filter(h => h.name.toLowerCase() === 'received')
    .map(h => {
      const v = h.value.replace(/\r\n[ \t]/g, ' ');
      const [, from, ip, by] = v.match(/from\s+(\S+)\s+\([^[]*\[([^\]]+)\]\)\s+by\s+(\S+)/) ?? [];
      const at = new Date(v.slice(v.lastIndexOf(';') + 1).trim());
      return { from, ip, by, at: at.toISOString(), time: at.toISOString().slice(11, 19) };
    })
    .reverse();
}
