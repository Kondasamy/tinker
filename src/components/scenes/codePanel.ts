// Coding agents' precise view, as data: the rows the Code tab shows for a beat of a run. A read shows the file as the
// agent read it; an edit shows its patch line by line, each changed line tagged with its hunk, so the kit can put a
// checkbox on each hunk (KTD15); a search shows the lines it found. Style-free, and never HTML: the kit renders every
// row as React text, so code with `<` in it stays text.
import { linesOf } from '../../lib/git/merge';
import { CODE, patchLines, patchOf, textOf, version, type Changing } from '../../lib/coding-agents/repo';
import type { Hit } from '../../lib/coding-agents/search';

export interface Row {
  op: 'same' | 'del' | 'add';
  text: string;
  /** the hunk a changed line belongs to; -1 for unchanged lines */
  hunk: number;
  /** the line's number in the file before the change (none for added lines) */
  n?: number;
}
export interface Panel {
  title: string;
  rows: Row[];
  hunks: number;
}

const strip = (l: string) => l.replace(/\n$/, '');
/** A file as the agent reads it. */
export const fileRows = (text: string): Row[] =>
  linesOf(text).map((l, i) => ({ op: 'same', text: strip(l), hunk: -1, n: i + 1 }));

/** A file at a version: the base for files the agent never changes. */
export const fileText = (path: string, vid?: string) =>
  vid && (path === CODE || path.startsWith('tests/')) ? version(path as Changing, vid).text : textOf(path);

/** A patch, line by line, every hunk in it. */
export function patchPanel(id: string): Panel {
  const p = patchOf(id);
  let n = 0;
  const rows = patchLines(p).map(l => ({
    op: l.op,
    text: strip(l.line),
    hunk: l.hunk,
    n: l.op === 'add' ? undefined : ++n,
  }));
  return { title: p.path, rows, hunks: Math.max(0, ...rows.map(r => r.hunk + 1)) };
}

/** A search's hits as rows: `path:line` and the line. */
export const searchRows = (hits: Hit[]): Row[] =>
  hits.flatMap(h => h.lines.map(l => ({ op: 'same' as const, text: `${h.path}:${l.n}  ${l.text.trim()}`, hunk: -1 })));
