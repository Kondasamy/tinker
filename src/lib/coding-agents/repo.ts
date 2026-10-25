// Larkspur's fixture repository and every version of it the agent can make (KTD8). The repo's files are the base text
// (data/coding-agents/repo/); each version is a real module in ./versions/, imported twice: as code the tests run, and
// as raw text the reader is shown. A patch's hunks are the runs of changed lines in the line diff (git/merge.ts), and
// any subset of them can be applied; tests/unit/coding-agents-versions.test.ts proves every subset equals its file.
import PATCHES from '../../../data/coding-agents/patches.json' with { type: 'json' };
import * as BASE_CODE from '../../../data/coding-agents/repo/src/discount';
import * as BASE_TESTS from '../../../data/coding-agents/repo/tests/discount.test';
import { diff, type DiffLine } from '../git/merge';

const RAW = import.meta.glob<string>('/data/coding-agents/repo/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
});
/** The repo's files at the base, sorted by path, e.g. `src/discount.ts`. */
export const FILES = Object.entries(RAW)
  .map(([p, text]) => ({ path: p.slice('/data/coding-agents/repo/'.length), text }))
  .sort((a, b) => a.path.localeCompare(b.path));
export const textOf = (path: string) => FILES.find(f => f.path === path)!.text;

export const CODE = 'src/discount.ts',
  TESTS = 'tests/discount.test.ts';
export type Changing = typeof CODE | typeof TESTS;
/** The base version's id per file the agent changes. */
export const BASE: Record<Changing, string> = { [CODE]: '000', [TESTS]: 'base' };

export type DiscountModule = typeof BASE_CODE;
export type Check = (typeof BASE_TESTS.TESTS)[number];
export interface Version {
  path: Changing;
  vid: string;
  text: string;
  mod: Record<string, unknown>;
}

const NAME: Record<string, Changing> = { discount: CODE, 'discount-test': TESTS };
const VRAW = import.meta.glob<string>('./versions/*.ts', { query: '?raw', import: 'default', eager: true });
const VMOD = import.meta.glob<Record<string, unknown>>('./versions/*.ts', { eager: true });
/** Every version, the base included: `src/discount.ts@110`, `tests/discount.test.ts@loose`. */
export const VERSIONS: Version[] = [
  { path: CODE, vid: BASE[CODE], text: textOf(CODE), mod: BASE_CODE },
  { path: TESTS, vid: BASE[TESTS], text: textOf(TESTS), mod: BASE_TESTS },
  ...Object.keys(VRAW).map(file => {
    const stem = file.slice(file.lastIndexOf('/') + 1, -'.ts'.length),
      cut = stem.lastIndexOf('-');
    return { path: NAME[stem.slice(0, cut)], vid: stem.slice(cut + 1), text: VRAW[file], mod: VMOD[file] };
  }),
];
export function version(path: Changing, vid: string): Version {
  const v = VERSIONS.find(x => x.path === path && x.vid === vid);
  if (!v) throw new Error(`no version ${path}@${vid}`);
  return v;
}

export interface Patch {
  id: string;
  path: Changing;
  from: string;
  /** the version each subset of hunks makes, by bit mask */
  subsets: string[];
}
export const PATCH_LIST = PATCHES.patches as Patch[];
export const patchOf = (id: string) => {
  const p = PATCH_LIST.find(x => x.id === id);
  if (!p) throw new Error(`unknown patch ${id}`);
  return p;
};
/** The patch in full: every hunk applied. */
export const fullOf = (p: Patch) => p.subsets.at(-1)!;

/** A diff line with the hunk it belongs to (-1 for unchanged lines): a hunk is a run of changed lines. */
export type HunkLine = DiffLine & { hunk: number };
export function hunked(a: string, b: string): HunkLine[] {
  let h = -1,
    prev = 'same';
  return diff(a, b).map(l => {
    if (l.op !== 'same' && prev === 'same') h++;
    prev = l.op;
    return { ...l, hunk: l.op === 'same' ? -1 : h };
  });
}
export const hunkCount = (a: string, b: string) => Math.max(-1, ...hunked(a, b).map(l => l.hunk)) + 1;
/** a with only the hunks in mask (bit i: hunk i) of the change to b applied. */
export const applyHunks = (a: string, b: string, mask: number) =>
  hunked(a, b)
    .filter(l => l.op === 'same' || (l.op === 'del') !== Boolean((mask >> l.hunk) & 1))
    .map(l => l.line)
    .join('');
/** A patch's lines, from the version it applies to, to the version it makes in full. */
export const patchLines = (p: Patch) => hunked(version(p.path, p.from).text, version(p.path, fullOf(p)).text);
