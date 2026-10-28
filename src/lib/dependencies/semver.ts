// Semantic versions and ranges for the Dependencies module (KTD7): parse, compare and match, after semver.org 2.0.0
// and node-semver's documented range table (the one npm's docs point to). Only what the chapters use: exact versions,
// ^, ~, x-ranges and *, plus plain comparators (>=, >, <=, <, =). tests/unit/dependencies-semver.test.ts holds it to
// the cited tables.

export interface Version {
  major: number;
  minor: number;
  patch: number;
  /** pre-release identifiers: numbers where all digits, else strings */
  pre: (string | number)[];
}

const NUM = '0|[1-9]\\d*';
const PRE_ID = `(?:${NUM}|\\d*[a-zA-Z-][0-9a-zA-Z-]*)`;
const VERSION = new RegExp(
  `^(${NUM})\\.(${NUM})\\.(${NUM})(?:-(${PRE_ID}(?:\\.${PRE_ID})*))?(?:\\+[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*)?$`,
);

/** A version from its text; anything that is not major.minor.patch throws. */
export function parse(s: string): Version {
  const m = VERSION.exec(s);
  if (!m) throw new Error(`invalid version: "${s}"`);
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] ? m[4].split('.').map(x => (/^\d+$/.test(x) ? Number(x) : x)) : [],
  };
}
export const format = (v: Version) => `${v.major}.${v.minor}.${v.patch}${v.pre.length ? `-${v.pre.join('.')}` : ''}`;

const sign = (n: number) => (n < 0 ? -1 : n > 0 ? 1 : 0);
function cmpPre(a: Version['pre'], b: Version['pre']) {
  // a release outranks its pre-releases; then field by field, numbers below words, a longer list above its prefix
  if (!a.length || !b.length) return sign(b.length - a.length);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i],
      y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return sign(x - y);
    if (typeof x === 'number') return -1;
    if (typeof y === 'number') return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}
const cmp = (a: Version, b: Version) =>
  sign(a.major - b.major) || sign(a.minor - b.minor) || sign(a.patch - b.patch) || cmpPre(a.pre, b.pre);
/** -1, 0 or 1, by semver precedence. */
export const compare = (a: string, b: string) => cmp(parse(a), parse(b));

type Op = '>=' | '>' | '<=' | '<' | '=';
interface Comparator {
  op: Op;
  v: Version;
}
const v = (major: number, minor: number, patch: number, pre: Version['pre'] = []): Version => ({
  major,
  minor,
  patch,
  pre,
});
// the "-0" on an upper bound keeps the next major's pre-releases out, as node-semver writes it
const below = (major: number, minor: number, patch: number): Comparator => ({
  op: '<',
  v: v(major, minor, patch, [0]),
});
const X = /^[xX*]$/;

/** A range as comparators that must all hold. */
function comparators(range: string): Comparator[] {
  const r = range.trim();
  const bad = () => new Error(`invalid range: "${range}"`);
  if (r === '' || X.test(r)) return [{ op: '>=', v: v(0, 0, 0) }];
  const op = /^(>=|<=|>|<|=)\s*(.+)$/.exec(r);
  if (op) {
    try {
      return [{ op: op[1] as Op, v: parse(op[2]) }];
    } catch {
      throw bad();
    }
  }
  const m = /^([~^]?)(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*])(-[0-9A-Za-z.-]+)?)?$/.exec(r);
  if (!m) throw bad();
  const [, kind, a, b, c, pre] = m;
  const M = Number(a),
    hasMinor = b !== undefined && !X.test(b),
    hasPatch = c !== undefined && !X.test(c);
  if (X.test(a)) return [{ op: '>=', v: v(0, 0, 0) }];
  const mi = hasMinor ? Number(b) : 0,
    pa = hasPatch ? Number(c) : 0;
  const low: Comparator = { op: '>=', v: pre ? parse(`${M}.${mi}.${pa}${pre}`) : v(M, mi, pa) };
  if (kind === '^') {
    if (M > 0 || !hasMinor) return [low, below(M + 1, 0, 0)];
    if (mi > 0 || !hasPatch) return [low, below(0, mi + 1, 0)];
    return [low, below(0, 0, pa + 1)];
  }
  if (kind === '~' || !hasPatch) return hasMinor ? [low, below(M, mi + 1, 0)] : [low, below(M + 1, 0, 0)];
  // an exact version
  return [{ op: '=', v: low.v }];
}

const holds = (c: Comparator, x: Version) => {
  const d = cmp(x, c.v);
  return c.op === '=' ? d === 0 : c.op === '>=' ? d >= 0 : c.op === '>' ? d > 0 : c.op === '<=' ? d <= 0 : d < 0;
};

/** Whether a version is in a range. A pre-release is in only if the range names a pre-release of the same
 * major.minor.patch (npm's rule), so ranges never pick up someone's beta by accident. */
export function satisfies(version: string, range: string): boolean {
  const x = parse(version),
    cs = comparators(range);
  if (!cs.every(c => holds(c, x))) return false;
  if (!x.pre.length) return true;
  return cs.some(
    c => c.v.pre.length && c.v.pre[0] !== 0 && c.v.major === x.major && c.v.minor === x.minor && c.v.patch === x.patch,
  );
}

/** The highest version a range allows, or null. */
export function maxSatisfying(versions: string[], range: string): string | null {
  return versions
    .filter(x => satisfies(x, range))
    .reduce<string | null>((a, x) => (!a || compare(x, a) > 0 ? x : a), null);
}
