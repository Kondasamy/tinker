import { describe, expect, it } from 'vitest';
import { VOCAB_SIZE, pieceBytes } from '../../src/lib/lm/bpe';
import { START, accepts, check, checkText, compile, matches, read, run, type ObjectSchema } from '../../src/lib/structured-outputs/grammar';
import { after, allowed } from '../../src/lib/structured-outputs/mask';
import { SCHEMAS } from '../../src/lib/structured-outputs/prompts';

const enc = (s: string) => new TextEncoder().encode(s);
const order: ObjectSchema = {
  type: 'object', required: ['status', 'days'], additionalProperties: false,
  properties: { status: { type: 'string', enum: ['on time', 'delayed'] }, days: { type: 'integer' } },
};
const g = compile(order);

/** The byte offset where the machine first rejects, or -1. */
function failsAt(text: string): number {
  let s = read(g, '');
  const b = enc(text);
  for (let i = 0; i < b.length; i++) { s = run(g, s, [b[i]]); if (!s) return i; }
  return -1;
}

describe('grammar', () => {
  it('accepts valid documents byte by byte', () => {
    for (const t of ['{"status":"on time","days":2}', '{"status":"delayed","days":0}', '{"status":"delayed","days":-15}']) {
      expect(matches(g, t), t).toBe(true);
      expect(checkText(order, t).ok).toBe(true);
    }
  });

  it('rejects each invalid byte at its position', () => {
    expect(failsAt('{"status":"late","days":2}')).toBe(11); // "l" is no enum value's next byte
    expect(failsAt('{"status":"on time", "days":2}')).toBe(20); // no whitespace
    expect(failsAt('{"status":"delayed","days":02}')).toBe(28); // no leading zero
    expect(failsAt('{"status":"delayed","days":"2"}')).toBe(27); // an integer, not a string
    expect(failsAt('{"days":2,"status":"delayed"}')).toBe(2); // keys in their declared order
    expect(failsAt('{"status":"delayed","days":2}}')).toBe(29); // nothing after the end
  });

  it('lets an integer end only where the next part starts', () => {
    expect(read(g, '{"status":"delayed","days":12')).not.toBeNull();
    expect(accepts(g, read(g, '{"status":"delayed","days":12')!)).toBe(false);
    expect(matches(g, '{"status":"delayed","days":1234567}')).toBe(false); // over MAX_DIGITS
  });

  it('allows only the closing quote once a string is at its maximum length', () => {
    const n = compile(SCHEMAS.note);
    const s = read(n, '{"note":"abcdefgh')!;
    expect(s).not.toBeNull();
    expect(after(n, s, enc('"'))).not.toBeNull();
    expect(after(n, s, enc('i'))).toBeNull();
    expect(allowed(n, s).every((id) => pieceBytes(id)[0] === 0x22)).toBe(true);
  });

  it('allows a quote-and-brace token only where both bytes are legal', () => {
    const qb = enc('"}');
    const n = compile(SCHEMAS.note);
    expect(after(n, read(n, '{"note":"ab')!, qb)).not.toBeNull(); // closes the string, then the object
    expect(after(g, read(g, '{"status":"delayed')!, qb)).toBeNull(); // the quote is legal, the brace is not: days is next
    expect(after(g, read(g, '{"status":"on')!, qb)).toBeNull(); // the quote would end "on", which is no enum value
    const s = compile(SCHEMAS.status);
    expect(after(s, read(s, '{"status":"delayed')!, qb)).not.toBeNull();
  });

  it('has no dead end: some token is allowed at every non-accepting state of every chapter schema', () => {
    for (const [name, schema] of Object.entries(SCHEMAS)) {
      const c = compile(schema);
      // Walk every state a single-byte path can reach, breadth first, a byte at a time.
      const seen = new Set<string>(), queue = [START];
      while (queue.length) {
        const s = queue.shift()!, key = `${s.part}|${s.buf}`;
        if (seen.has(key) || accepts(c, s)) continue;
        seen.add(key);
        expect(allowed(c, s).length, `${name} at ${key}`).toBeGreaterThan(0);
        // Inside a string body every character acts alike, and so does every nonzero digit in an integer:
        // branch on one of each, so the walk stays small.
        const kind = c.parts[s.part].kind;
        const bytes = kind === 'string' && s.buf ? 'a"' : kind === 'int' ? '-01,}' : '{}":,-01adeilmnorstuyz ';
        for (const b of enc(bytes)) { const x = run(c, s, [b]); if (x) queue.push(x); }
      }
      expect(seen.size).toBeGreaterThan(5);
    }
  });

  it('checks the length cap that Tool calling\'s subset does not know', () => {
    expect(check(SCHEMAS.note, { note: 'abcdefghi' })).toEqual(['note must be at most 8 characters']);
    expect(checkText(SCHEMAS.note, 'Order 1042 shipped').errors).toEqual(['the answer is not JSON']);
  });

  it('allows tokens over the whole vocabulary', () => {
    expect(allowed(g, START)).toEqual(Array.from({ length: VOCAB_SIZE }, (_, i) => i).filter((i) => pieceBytes(i).length === 1 && pieceBytes(i)[0] === 0x7b));
  });
});
