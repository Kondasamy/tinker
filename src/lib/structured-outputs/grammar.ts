// Structured outputs' grammar (KTD4): Tool calling's schema subset compiled to a state machine over bytes.
// An object with every property required, keys in their declared order and no whitespace, so the document is
// a fixed run of literals (`{"status":`, `,"days":`, `}`) and values: an enum, a boolean, an integer, or a
// string capped at maxLength (printable ASCII, no escapes). Once a string is at its cap only the closing
// quote is allowed, so it always closes.
import { validate, type Schema } from '../tools/schema';

/** Tool calling's Schema plus maxLength, which the grammar needs to close every free string. */
export type FieldSchema = Schema & { maxLength?: number };
export interface ObjectSchema { type: 'object'; properties: Record<string, FieldSchema>; required: string[]; additionalProperties: false }

/** A string with no maxLength gets this cap. */
export const DEFAULT_MAX_LENGTH = 12;
/** An integer has at most this many digits (Larkspur mini's window is 32 tokens). */
export const MAX_DIGITS = 6;

type Part =
  | { kind: 'lit'; text: string }
  | { kind: 'alts'; alts: string[] }
  | { kind: 'int' }
  | { kind: 'string'; max: number };

export interface Grammar { schema: ObjectSchema; parts: Part[] }
/** Where the machine is: the part it is in and the bytes of that part read so far (all ASCII). */
export interface State { part: number; buf: string }

export function compile(schema: ObjectSchema): Grammar {
  const keys = Object.keys(schema.properties);
  if (!keys.length) throw new Error('a schema needs at least one property');
  for (const k of keys) if (!schema.required.includes(k)) throw new Error(`${k} must be required`);
  const parts: Part[] = [];
  keys.forEach((k, i) => {
    parts.push({ kind: 'lit', text: `${i ? ',' : '{'}${JSON.stringify(k)}:` });
    const f = schema.properties[k];
    if (f.enum) parts.push({ kind: 'alts', alts: f.enum.map((v) => JSON.stringify(v)) });
    else if (f.type === 'boolean') parts.push({ kind: 'alts', alts: ['true', 'false'] });
    else if (f.type === 'integer') parts.push({ kind: 'int' });
    else if (f.type === 'string') parts.push({ kind: 'string', max: f.maxLength ?? DEFAULT_MAX_LENGTH });
    else throw new Error(`${k}: type ${f.type} is outside the subset`);
  });
  parts.push({ kind: 'lit', text: '}' });
  return { schema, parts };
}

export const START: State = { part: 0, buf: '' };
export const accepts = (g: Grammar, s: State) => s.part === g.parts.length;

const INT = new RegExp(`^-?(0|[1-9][0-9]{0,${MAX_DIGITS - 1}})?$`);
const strChar = (c: string) => c >= ' ' && c <= '~' && c !== '"' && c !== '\\';

/** Could `buf` still become (or already be) this part? */
function prefixOk(p: Part, buf: string): boolean {
  switch (p.kind) {
    case 'lit': return p.text.startsWith(buf);
    case 'alts': return p.alts.some((a) => a.startsWith(buf));
    case 'int': return INT.test(buf);
    case 'string': {
      if (buf[0] !== '"') return buf === '';
      const body = buf.endsWith('"') && buf.length > 1 ? buf.slice(1, -1) : buf.slice(1);
      return body.length <= p.max && [...body].every(strChar);
    }
  }
}

/** Is `buf` a whole value for this part? */
function complete(p: Part, buf: string): boolean {
  switch (p.kind) {
    case 'lit': return buf === p.text;
    case 'alts': return p.alts.includes(buf);
    case 'int': return /[0-9]$/.test(buf);
    case 'string': return buf.length > 1 && buf.endsWith('"');
  }
}

/** Complete and nothing longer could follow: move to the next part now. */
function closed(p: Part, buf: string): boolean {
  if (!complete(p, buf)) return false;
  switch (p.kind) {
    case 'alts': return !p.alts.some((a) => a.length > buf.length && a.startsWith(buf));
    case 'int': return /^-?0$/.test(buf) || buf.replace('-', '').length >= MAX_DIGITS;
    default: return true;
  }
}

const settle = (g: Grammar, s: State): State => (closed(g.parts[s.part], s.buf) ? { part: s.part + 1, buf: '' } : s);

/** The state after one more byte, or null when the byte breaks the schema. */
export function step(g: Grammar, s: State, byte: number): State | null {
  const p = g.parts[s.part];
  if (!p || byte > 0x7e) return null;
  const buf = s.buf + String.fromCharCode(byte);
  if (prefixOk(p, buf)) return settle(g, { part: s.part, buf });
  // An integer or an enum value that could have gone on ends where the next part starts.
  if (complete(p, s.buf)) return step(g, { part: s.part + 1, buf: '' }, byte);
  return null;
}

/** Runs bytes from a state; null as soon as one breaks the schema. */
export function run(g: Grammar, s: State | null, bytes: ArrayLike<number>): State | null {
  for (let i = 0; i < bytes.length && s; i++) s = step(g, s, bytes[i]);
  return s;
}

/** The state after the whole text has been read, or null. The closing `}` is a part, so a whole document ends accepted. */
export const read = (g: Grammar, text: string) => run(g, START, new TextEncoder().encode(text));

/** Does the text match the schema byte for byte? */
export const matches = (g: Grammar, text: string) => { const s = read(g, text); return !!s && accepts(g, s); };

/** Tool calling's check, plus the length cap its subset does not know. Empty means valid. */
export function check(schema: ObjectSchema, value: unknown): string[] {
  const errors = validate(schema, value);
  if (typeof value === 'object' && value) for (const [k, f] of Object.entries(schema.properties)) {
    const v = (value as Record<string, unknown>)[k];
    if (f.type === 'string' && typeof v === 'string' && v.length > (f.maxLength ?? DEFAULT_MAX_LENGTH)) errors.push(`${k} must be at most ${f.maxLength ?? DEFAULT_MAX_LENGTH} characters`);
  }
  return errors;
}

/** Parses and checks a whole answer, as a host does after the fact. */
export function checkText(schema: ObjectSchema, text: string): { ok: boolean; errors: string[]; value?: unknown } {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { ok: false, errors: ['the answer is not JSON'] }; }
  const errors = check(schema, value);
  return { ok: !errors.length, errors, value };
}
