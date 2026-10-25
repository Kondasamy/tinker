// The Git module's precise view: the commit graph, flat. A dot per commit in the same columns and lanes as the crate
// yard (main on top here), a line to each parent, branch names beside the commit they point to. Pure layout and words;
// the kit draws it as React SVG with each commit focusable, so it has no markup to escape.
import type { Repo } from '../../lib/git/graph';
import { short } from '../../lib/git/objects';
import { NAME } from '../../lib/git/graph';
import { LANES, crateState, yardOf } from './crateScene';

export interface Node {
  id: string;
  x: number;
  y: number;
  parents: string[];
  branches: string[];
  head: boolean;
  state?: 'lit' | 'ghost' | 'conflict';
  name: string;
}

const PX = 64,
  PY = 40,
  X0 = 34,
  Y0 = 30;

/** Every commit in view, oldest first, with its place and its words. */
export function commitGraph(r: Repo, o: Parameters<typeof yardOf>[1] = {}) {
  const y = yardOf(r, o),
    st = crateState({ ...y });
  const first = Math.min(...st.shown.map(c => c.col));
  const nodes: Node[] = st.shown.map(c => {
    const k = r.commits[c.id],
      branches = y.flags.filter(f => f.at === c.id).map(f => f.name),
      head = y.flags.some(f => f.at === c.id && f.head);
    const parents = k.parents.length ? `parent ${k.parents.map(short).join(' and ')}` : 'no parent';
    return {
      id: c.id,
      x: X0 + (c.col - first) * PX,
      y: Y0 + c.lane * PY,
      parents: k.parents,
      branches,
      head,
      ...(c.state ? { state: c.state } : {}),
      name:
        `${short(c.id)}: “${k.message}”, by ${NAME[k.by]}; ${parents}` +
        `${branches.length ? `; ${branches.join(' and ')} ${branches.length > 1 ? 'point' : 'points'} here` : ''}` +
        `${head ? ', HEAD' : ''}${c.state === 'ghost' ? '; no branch reaches it' : ''}${c.state === 'conflict' ? '; met a conflict' : ''}.`,
    };
  });
  const at = Object.fromEntries(nodes.map(n => [n.id, n]));
  const edges = nodes.flatMap(n => n.parents.filter(p => at[p]).map(p => ({ from: n.id, to: p })));
  const lanes = Math.min(LANES, Math.max(...nodes.map(n => (n.y - Y0) / PY)) + 1);
  return {
    nodes,
    edges,
    hidden: st.hidden,
    w: X0 * 2 + Math.max(0, ...nodes.map(n => n.x - X0)) + 60,
    h: Y0 + lanes * PY,
  };
}

/** The graph in words, for its list's label. */
export const graphLabel = (r: Repo) =>
  `Commit graph: ${Object.keys(r.refs).length} ${Object.keys(r.refs).length === 1 ? 'branch' : 'branches'}, HEAD on ${r.head}`;
