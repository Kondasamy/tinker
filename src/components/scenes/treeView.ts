// The Databases module's precise view (the Tree tab): the lookup's path through one index, a row per level from the root
// down to the leaves, then the table. Each level shows a few of its pages round the one on the path (lit), with the
// keys each holds; the table row counts the pages fetched for the rows the index pointed to. Each row is one focusable
// item. Pure layout, so the tests check it without drawing; the kit draws it as React SVG (text nodes only).
import { span, type Key } from '../../lib/databases/btree';
import {
  INDEX_COLS,
  INDEX_NAME,
  bounds,
  treeOf,
  type Exec,
  type IndexName,
  type Query,
} from '../../lib/databases/planner';
import { STATUSES, dayName, fmt } from '../../lib/databases/table';

const DESK = { w: 600, pad: 10, label: 70, row: 26, gap: 14, fs: 10, shown: 5 },
  PHONE = { w: 340, pad: 6, label: 54, row: 26, gap: 14, fs: 10, shown: 3 };

/** A key in words, by the index's columns: "#1,042", "customer 57 · 24 Oct". */
export function keyName(how: IndexName, k: Key, cols = INDEX_COLS[how].length) {
  return INDEX_COLS[how]
    .slice(0, cols)
    .map((c, i) =>
      c === 'id'
        ? `#${fmt(k[i])}`
        : c === 'customer'
          ? `cust ${k[i]}`
          : c === 'day'
            ? dayName(k[i])
            : (STATUSES[k[i]] ?? String(k[i])),
    )
    .join(' · ');
}

export interface TreeBox {
  x: number;
  w: number;
  text: string;
  lit: boolean;
}
export interface TreeRow {
  kind: 'level' | 'table';
  y: number;
  title: string;
  boxes: TreeBox[];
  /** pages on this level left and right of those shown */
  left: number;
  right: number;
  /** the row in words, for the read-out line */
  words: string;
}

/** The view's layout for a request run through an index. */
export function treeView(how: IndexName, q: Query, exec: Exec, { phone = false }: { phone?: boolean } = {}) {
  const L = phone ? PHONE : DESK,
    t = treeOf(how),
    b = bounds(how, q);
  if (!b) throw new Error(`index ${how} can't serve this request`);
  const levels = t.levels(),
    path = t.pathTo(b[0]),
    H = levels.length,
    x0 = L.pad + L.label,
    span0 = L.w - L.pad - x0,
    leavesWalked = Math.max(1, exec.indexPages - (H - 1));
  const rows: TreeRow[] = path.map((p, d) => {
    const n = Math.min(L.shown, p.pages),
      from = Math.max(0, Math.min(p.at - Math.floor(n / 2), p.pages - n)),
      w = span0 / L.shown - 6,
      start = x0 + (span0 - n * (w + 6)) / 2;
    const boxes = Array.from({ length: n }, (_, i) => {
      const [lo, hi] = span(levels[d][from + i]);
      return {
        x: start + i * (w + 6),
        w,
        // boxes name the first column only, so composite keys fit
        text: phone ? keyName(how, lo, 1) : `${keyName(how, lo, 1)} – ${keyName(how, hi, 1)}`,
        lit: from + i === p.at,
      };
    });
    const [lo, hi] = span(p.node),
      leaf = d === H - 1,
      read = leaf ? leavesWalked : 1;
    return {
      kind: 'level' as const,
      y: L.pad + d * (L.row + L.gap),
      title: d === 0 ? 'Root' : leaf ? 'Leaves' : `Level ${d + 1}`,
      boxes,
      left: from,
      right: p.pages - from - n,
      words:
        `Level ${d + 1} of ${H}${d === 0 ? ', the root' : leaf ? ', the leaves' : ''}: page ${p.at + 1} of ${fmt(p.pages)}, ` +
        `keys ${keyName(how, lo)} to ${keyName(how, hi)}. ${read} page${read === 1 ? '' : 's'} read here.`,
    };
  });
  rows.push({
    kind: 'table',
    y: L.pad + H * (L.row + L.gap),
    title: 'Table',
    boxes: [
      {
        x: x0,
        w: span0,
        text: `${fmt(exec.tablePages)} page${exec.tablePages === 1 ? '' : 's'} fetched · ${fmt(exec.rows.length)} match`,
        lit: exec.tablePages > 0,
      },
    ],
    left: 0,
    right: 0,
    words: `The table: ${fmt(exec.tablePages)} page${exec.tablePages === 1 ? '' : 's'} fetched for ${fmt(exec.rowsRead)} row${exec.rowsRead === 1 ? '' : 's'} the index pointed to; ${fmt(exec.rows.length)} match the request.`,
  });
  return {
    rows,
    w: L.w,
    h: L.pad * 2 + (H + 1) * (L.row + L.gap) - L.gap,
    x0,
    fs: L.fs,
    row: L.row,
    label: `The index on ${INDEX_NAME[how]}, ${H} levels, then the table: ${fmt(exec.pages)} pages read in all.`,
  };
}
export type TreeLayout = ReturnType<typeof treeView>;
