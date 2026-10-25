// Git's objects, hashed for real (KTD10): a blob, a tree and a commit are each "<type> <length>\0<content>" put through
// SHA-1, so every id here is the one the real `git` would give (tests/unit/git-objects.test.ts pins them against ids the
// real CLI produced). SHA-1 is computed here, synchronously, rather than through Web Crypto's async digest: the crate
// yard is drawn at build time and on every keystroke, and a sync hash keeps every picture a pure function. The test
// checks it against Web Crypto.

const enc = new TextEncoder();
export const bytesOf = (s: string) => enc.encode(s);

/** SHA-1 of some bytes, as 40 hex characters (FIPS 180-4). */
export function sha1(msg: Uint8Array): string {
  const n = msg.length,
    words = (((n + 8) >> 6) + 1) * 16,
    w = new Uint32Array(words);
  for (let i = 0; i < n; i++) w[i >> 2] |= msg[i] << (24 - (i % 4) * 8);
  w[n >> 2] |= 0x80 << (24 - (n % 4) * 8);
  w[words - 1] = n * 8; // shortcut: the length's high word is left 0, so inputs stay under 512 MB
  let [a0, b0, c0, d0, e0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const x = new Uint32Array(80);
  const rol = (v: number, s: number) => (v << s) | (v >>> (32 - s));
  for (let o = 0; o < words; o += 16) {
    for (let t = 0; t < 16; t++) x[t] = w[o + t];
    for (let t = 16; t < 80; t++) x[t] = rol(x[t - 3] ^ x[t - 8] ^ x[t - 14] ^ x[t - 16], 1);
    let [a, b, c, d, e] = [a0, b0, c0, d0, e0];
    for (let t = 0; t < 80; t++) {
      const f =
        t < 20
          ? ((b & c) | (~b & d)) + 0x5a827999
          : t < 40
            ? (b ^ c ^ d) + 0x6ed9eba1
            : t < 60
              ? ((b & c) | (b & d) | (c & d)) + 0x8f1bbcdc
              : (b ^ c ^ d) + 0xca62c1d6;
      const tmp = (rol(a, 5) + f + e + x[t]) >>> 0;
      e = d;
      d = c;
      c = rol(b, 30) >>> 0;
      b = a;
      a = tmp;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
    e0 = (e0 + e) >>> 0;
  }
  return [a0, b0, c0, d0, e0].map(v => v.toString(16).padStart(8, '0')).join('');
}

export type Kind = 'blob' | 'tree' | 'commit';

/** An object's id: SHA-1 over its header ("blob 16\0") and its content. */
export function hashObject(kind: Kind, body: Uint8Array): string {
  const head = bytesOf(`${kind} ${body.length}\0`),
    all = new Uint8Array(head.length + body.length);
  all.set(head);
  all.set(body, head.length);
  return sha1(all);
}

/** A file's content as a blob id. */
export const blobId = (text: string) => hashObject('blob', bytesOf(text));

/** A flat folder: file name to content. shortcut: no subfolders, which Larkspur's one-file repo never needs. */
export type Files = Record<string, string>;

/** A tree's bytes: one "100644 <name>\0<20-byte id>" entry per file, sorted by name. */
export function treeBody(files: Files): Uint8Array {
  const parts: number[] = [];
  for (const name of Object.keys(files).sort()) {
    parts.push(...bytesOf(`100644 ${name}\0`));
    const id = blobId(files[name]);
    for (let i = 0; i < 40; i += 2) parts.push(Number.parseInt(id.slice(i, i + 2), 16));
  }
  return Uint8Array.from(parts);
}
export const treeId = (files: Files) => hashObject('tree', treeBody(files));

export interface Person {
  name: string;
  email: string;
}
export interface CommitFields {
  tree: string;
  parents: string[];
  author: Person;
  /** seconds since 1970 */
  time: number;
  committer: Person;
  ctime: number;
  /** "+0100" */
  tz: string;
  message: string;
}

/** A commit's text, exactly as Git stores it. */
export function commitText(c: CommitFields): string {
  const who = (p: Person, t: number) => `${p.name} <${p.email}> ${t} ${c.tz}`;
  return (
    `tree ${c.tree}\n` +
    c.parents.map(p => `parent ${p}\n`).join('') +
    `author ${who(c.author, c.time)}\ncommitter ${who(c.committer, c.ctime)}\n\n${c.message}\n`
  );
}
export const commitId = (c: CommitFields) => hashObject('commit', bytesOf(commitText(c)));

/** The seven characters a crate is stamped with. */
export const short = (id: string) => id.slice(0, 7);
