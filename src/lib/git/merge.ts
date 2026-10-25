// The line diff and the three-way merge (KTD10). The diff is a longest common subsequence over lines; the merge is
// diff3-style against the merge base: where only one side changed a stretch, take that side; where both changed it
// the same way, take it once; where both changed it differently, it is a conflict hunk holding both sides and the base.
// shortcut: no rename detection and no recursive merge base; Larkspur's repo has one file and one base per merge.

/** A file's lines, each with its newline; "" has none. */
export const linesOf = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];

/** For each line of a, the index of the line of b it is matched to in a longest common subsequence, or -1. */
export function matchLines(a: string[], b: string[]): number[] {
  const n = a.length,
    m = b.length,
    L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = new Array<number>(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m; )
    if (a[i] === b[j]) out[i++] = j++;
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  return out;
}

export type DiffLine = { op: 'same' | 'del' | 'add'; line: string };
/** What changed from a to b, line by line. */
export function diff(a: string, b: string): DiffLine[] {
  const A = linesOf(a),
    B = linesOf(b),
    mt = matchLines(A, B),
    out: DiffLine[] = [];
  let j = 0;
  for (let i = 0; i < A.length; i++) {
    if (mt[i] < 0) {
      out.push({ op: 'del', line: A[i] });
      continue;
    }
    while (j < mt[i]) out.push({ op: 'add', line: B[j++] });
    out.push({ op: 'same', line: A[i] });
    j++;
  }
  while (j < B.length) out.push({ op: 'add', line: B[j++] });
  return out;
}

export interface Conflict {
  ours: string[];
  base: string[];
  theirs: string[];
}
export type Piece = string | Conflict;
export interface Merged {
  pieces: Piece[];
  conflicts: Conflict[];
}
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
export const isConflict = (p: Piece): p is Conflict => typeof p !== 'string';

/** The three-way merge of ours and theirs against their base. */
export function merge3(base: string, ours: string, theirs: string): Merged {
  const B = linesOf(base),
    O = linesOf(ours),
    T = linesOf(theirs),
    mo = matchLines(B, O),
    mt = matchLines(B, T);
  const pieces: Piece[] = [],
    conflicts: Conflict[] = [];
  let i = 0,
    j = 0,
    k = 0;
  for (;;) {
    // a stable run: base lines both sides kept, in place
    while (i < B.length && mo[i] === j && mt[i] === k) {
      pieces.push(B[i]);
      i++;
      j++;
      k++;
    }
    if (i >= B.length && j >= O.length && k >= T.length) break;
    // the next base line both sides kept marks the end of the changed stretch
    let s = i;
    while (s < B.length && (mo[s] < 0 || mt[s] < 0)) s++;
    const [j2, k2] = s < B.length ? [mo[s], mt[s]] : [O.length, T.length];
    const b = B.slice(i, s),
      o = O.slice(j, j2),
      t = T.slice(k, k2);
    if (same(o, b)) pieces.push(...t);
    else if (same(t, b) || same(o, t)) pieces.push(...o);
    else {
      const c = { ours: o, base: b, theirs: t };
      pieces.push(c);
      conflicts.push(c);
    }
    [i, j, k] = [s, j2, k2];
  }
  return { pieces, conflicts };
}

export type Side = 'ours' | 'theirs' | 'both';
/** The merged text with every conflict resolved one way: one side, or both sides' lines (ours first). */
export const resolve = (m: Merged, side: Side) =>
  m.pieces
    .map(p => (!isConflict(p) ? p : side === 'both' ? [...p.ours, ...p.theirs].join('') : p[side].join('')))
    .join('');

/** The merged text with Git's diff3-style conflict markers, as `git merge-file --diff3` writes them. */
export const withMarkers = (m: Merged, names: [string, string, string]) =>
  m.pieces
    .map(p =>
      !isConflict(p)
        ? p
        : `<<<<<<< ${names[0]}\n${p.ours.join('')}||||||| ${names[1]}\n${p.base.join('')}=======\n${p.theirs.join('')}>>>>>>> ${names[2]}\n`,
    )
    .join('');
