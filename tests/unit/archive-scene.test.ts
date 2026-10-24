// Databases' stage (U22): the filing room's parts, lit drawers and pills, the tree view's layout and words, and the
// stage's two tabs.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  ARCHIVE_BOARD,
  ARCHIVE_PARTS,
  IDLE,
  archiveAt,
  archiveLabel,
  archiveReadouts,
  archiveScene,
  type ArchiveOpts,
} from '../../src/components/scenes/archiveScene';
import { keyName, treeView } from '../../src/components/scenes/treeView';
import { DbStage, TreeView } from '../../src/content/databases/kit';
import { execute, treeOf, type Query } from '../../src/lib/databases/planner';
import { MONTH, REGULAR, TABLE_PAGES } from '../../src/lib/databases/table';

const draw = (o: ArchiveOpts) =>
  renderToString(createElement(IsoStage, { board: ARCHIVE_BOARD, scene: archiveScene(o), label: archiveLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const ONE: Query = { where: { id: 1042 } },
  MINE: Query = { where: { customer: REGULAR, day: MONTH } };
const scan = execute(ONE, 'scan'),
  look = execute(ONE, 'id'),
  mine = execute(MINE, 'customer_date');

describe('the filing room', () => {
  it('draws every part a callout may name, and each callout', () => {
    const svg = draw({ ...IDLE });
    for (const p of ARCHIVE_PARTS) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of ARCHIVE_PARTS) expect(draw({ ...IDLE, say: { block: p, text: 'Here' } })).toContain('Here');
  });

  it('a drawer per page; the lit drawers are the pages read', () => {
    for (const [ex, q] of [
      [scan, ONE],
      [look, ONE],
      [mine, MINE],
    ] as const) {
      const svg = draw(archiveAt(ex, q));
      expect(count(svg, 'class="drawer')).toBe(TABLE_PAGES + 20);
      expect(count(svg, 'class="drawer read"')).toBe(ex.pagesSeen.length);
    }
    expect(count(draw(archiveAt(scan, ONE)), 'class="drawer read"')).toBe(TABLE_PAGES);
    expect(count(draw(archiveAt(look, ONE)), 'class="drawer read"')).toBe(1);
  });

  it('the card index lights one box per level on the path, and writes go tomato', () => {
    const o = archiveAt(look, ONE),
      svg = draw(o);
    expect(svg).toContain(`data-levels="${treeOf('id').height()}"`);
    expect(count(svg, 'class="card-box read"')).toBe(treeOf('id').height());
    const w = draw({ ...o, index: { ...o.index!, write: true }, written: [199], others: 2 });
    expect(count(w, 'class="drawer write"')).toBe(1);
    expect(count(w, 'class="card-box other write"')).toBe(2);
    expect(draw({ ...IDLE })).toContain('NO INDEX');
  });

  it('on phones the pills keep just the names, and the caption carries the numbers', () => {
    const o = archiveAt(scan, ONE),
      wide = draw({ ...o, scale: 1.2 }),
      phone = draw({ ...o, scale: 2 });
    expect(wide).toContain('ORDERS · 200 PAGES READ');
    expect(wide).toContain('ROWS READ · 10,000');
    expect(phone).toContain('>ORDERS<');
    expect(phone).not.toContain('PAGES READ');
    expect(phone).not.toContain('ROWS READ ·');
    expect(archiveReadouts(o)).toEqual(['200 pages read', '10,000 rows read']);
  });

  it('reads the room in words', () => {
    expect(archiveLabel(archiveAt(look, ONE))).toMatch(/^The filing room: .*1 of 200 drawers opened/);
  });
});

describe('the tree view', () => {
  it('a row per level, then the table; the lit box is on the path', () => {
    const t = treeView('id', ONE, look);
    expect(t.rows).toHaveLength(treeOf('id').height() + 1);
    for (const r of t.rows.slice(0, -1)) expect(r.boxes.filter(b => b.lit)).toHaveLength(1);
    expect(t.rows.at(-1)!.words).toMatch(/^The table: 1 page fetched for 1 row/);
    for (const r of t.rows) for (const b of r.boxes) expect(b.x + b.w).toBeLessThanOrEqual(t.w);
    expect(t.rows[0].words).toMatch(/^Level 1 of 3, the root: page 1 of 1, keys #1 to #10,000/);
  });

  it('names composite keys by their columns', () => {
    expect(keyName('customer_date', [REGULAR, MONTH[1]])).toBe(`cust ${REGULAR} · 24 Oct`);
    expect(treeView('customer_date', MINE, mine).rows.at(-1)!.words).toMatch(/match the request\.$/);
  });

  it('draws as a list of focusable rows, one in the tab order', () => {
    const html = renderToString(createElement(TreeView, { how: 'id', query: ONE, exec: look }));
    expect(count(html, 'role="listitem"')).toBe(treeOf('id').height() + 1);
    expect(count(html, 'tabindex="0"')).toBe(1);
  });
});

describe('the stage', () => {
  it('opens on the picture, with the tree tab off when no index ran', () => {
    const html = renderToString(createElement(DbStage, { show: { scene: archiveAt(scan, ONE), caption: 'Scan' } }));
    expect(html).toContain('data-prop="cabinet"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Tree/);
  });

  it('shows the tree when asked, and escapes the caption', () => {
    const html = renderToString(
      createElement(DbStage, {
        view: 'tree',
        show: { scene: archiveAt(look, ONE), tree: { how: 'id', query: ONE, exec: look }, caption: '<b>x</b>' },
      }),
    );
    expect(html).toContain('role="list"');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
