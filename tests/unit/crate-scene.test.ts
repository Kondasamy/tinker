// Git's stage (U17): the crate yard's parts, stamps, rails and pills, the packing view's live blob ids, the commit
// graph's edges and words, the editor, and the stage's two tabs.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  PACKING_PARTS,
  YARD_PARTS,
  boardOf,
  crateLabel,
  crateReadouts,
  crateScene,
  crateState,
  yardOf,
  type CrateOpts,
} from '../../src/components/scenes/crateScene';
import { commitGraph } from '../../src/components/scenes/commitGraph';
import { Editor, GitStage, GraphView, packingOf } from '../../src/content/git/kit';
import { REPO, ancestors } from '../../src/lib/git/graph';
import { blobId, short } from '../../src/lib/git/objects';
import { BASE, CLEAN, REBASED, SALE, conflictMerge } from '../../src/lib/git/story';
import { WAITING } from '../../src/lib/git/workbench';

const draw = (o: CrateOpts) =>
  renderToString(createElement(IsoStage, { board: boardOf(o), scene: crateScene(o), label: crateLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const SAVED = REPO.history.at(-1)!.text;

describe('the crate yard', () => {
  it('draws every part a callout may name', () => {
    const yard = yardOf(CLEAN.repo, { base: CLEAN.base });
    for (const p of YARD_PARTS) {
      expect(draw(yard)).toContain(`data-prop="${p}"`);
      expect(draw({ ...yard, say: { block: p, text: 'Here' } })).toContain('Here');
    }
    const pack = { crates: [], flags: [], packing: packingOf(SAVED, SAVED) };
    for (const p of PACKING_PARTS) {
      expect(draw(pack)).toContain(`data-prop="${p}"`);
      expect(draw({ ...pack, say: { block: p, text: 'Here' } })).toContain('Here');
    }
  });

  it('stamps every crate with the first seven characters of its real id, and a rail to each parent', () => {
    const svg = draw(yardOf(CLEAN.repo));
    for (const id of CLEAN.repo.order) {
      expect(svg).toContain(`data-crate="${id}"`);
      expect(svg).toContain(`>${short(id)}<`);
      for (const p of CLEAN.repo.commits[id].parents) expect(svg).toContain(`data-from="${id}" data-to="${p}"`);
    }
    expect(count(svg, 'data-kind="merge"')).toBe(1);
  });

  it('a branch is a flag on its crate, and HEAD a lantern on its pole', () => {
    const svg = draw(yardOf(SALE));
    expect(svg).toContain('data-flag="sale" data-head="1"');
    expect(count(svg, 'class="lantern"')).toBe(1);
    expect(svg).toContain('sale · HEAD');
  });

  it('a conflict crate is marked, and a rebase leaves the old crates pale', () => {
    const m = conflictMerge('theirs');
    expect(draw(yardOf(m.repo, { conflict: m.repo.refs.main }))).toContain('data-state="conflict"');
    const o = yardOf(REBASED.repo);
    const ghosts = o.crates.filter(c => c.state === 'ghost').map(c => c.id);
    expect(ghosts).toEqual(REBASED.rewritten.map(([old]) => old));
    expect(yardOf(REBASED.repo, { ghosts: false }).crates.some(c => c.state === 'ghost')).toBe(false);
  });

  it('a new branch claims a lane only once it has a commit of its own', () => {
    const lanes = (o: ReturnType<typeof yardOf>) => new Set(o.crates.map(c => c.lane)).size;
    expect(lanes(yardOf({ ...BASE, refs: { ...BASE.refs, sale: BASE.refs.main } }))).toBe(1);
    expect(lanes(yardOf(SALE))).toBe(2);
    expect(lanes(yardOf(WAITING))).toBe(4);
  });

  it('folds older crates into a count past the columns it holds', () => {
    const big = yardOf(WAITING);
    const many = { ...big, crates: big.crates.map(c => ({ ...c, col: c.col * 3 })) };
    const st = crateState(many);
    expect(st.hidden).toBeGreaterThan(0);
    expect(draw(many)).toContain(`+${st.hidden} OLDER`);
  });

  it('on phones the pills keep only hashes and branch names', () => {
    const o = yardOf(SALE),
      wide = draw({ ...o, scale: 1.2 }),
      phone = draw({ ...o, scale: 2 });
    expect(wide).toContain('sale · HEAD');
    expect(phone).not.toContain('· HEAD');
    expect(phone).toContain('>sale<');
    expect(phone).toContain(`>${short(SALE.refs.sale)}<`);
    const p = { crates: [], flags: [], packing: packingOf(SAVED, `${SAVED}x`) };
    expect(draw({ ...p, scale: 2 })).not.toContain('SAVED');
    expect(draw({ ...p, scale: 1.2 })).toContain('SAVED');
  });

  it('escapes branch names', () => {
    const svg = draw(yardOf({ ...BASE, refs: { ...BASE.refs, '<b>x</b>': BASE.order[0] } }));
    expect(svg).not.toContain('<b>x</b>');
    expect(svg).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('reads the yard in words', () => {
    expect(crateLabel(yardOf(SALE))).toMatch(/^A yard of 4 crates.*HEAD is on sale\.$/);
    expect(crateReadouts(yardOf(SALE))).toEqual(['4 commits', 'on sale']);
  });
});

describe('the packing view', () => {
  it('the stamp equals the real blob id of the typed text, and returns when the edit is undone', () => {
    const edited = SAVED.replace('189.00', '179.00');
    const svg = draw({ crates: [], flags: [], packing: packingOf(SAVED, edited) });
    expect(svg).toContain(`data-prop="blob" data-id="${blobId(edited)}"`);
    expect(svg).toContain(`YOURS · ${short(blobId(edited))}`);
    const back = draw({ crates: [], flags: [], packing: packingOf(SAVED, SAVED) });
    expect(back).toContain(`YOURS · ${short(blobId(SAVED))}`);
    expect(crateLabel({ crates: [], flags: [], packing: packingOf(SAVED, SAVED) })).toContain('the same name');
  });
});

describe('the editor', () => {
  it('renders typed text as text, never markup', () => {
    const html = renderToString(
      createElement(Editor, { text: '<script>alert(1)</script>', onText: () => {}, saved: SAVED }),
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain(blobId('<script>alert(1)</script>'));
  });
});

describe('the commit graph', () => {
  it('its parent edges match the engine’s', () => {
    for (const r of [CLEAN.repo, REBASED.repo, WAITING]) {
      const g = commitGraph(r);
      const want = r.order.flatMap(id => r.commits[id].parents.map(p => `${id}>${p}`)).sort();
      expect(g.edges.map(e => `${e.from}>${e.to}`).sort()).toEqual(want);
    }
  });

  it('reads each commit in words, and draws as a list with one commit in the tab order', () => {
    const g = commitGraph(SALE);
    expect(g.nodes.at(-1)!.name).toMatch(
      /^07bb1f2: “Drill press sale”, by Mira; parent 6866bb3; sale points here, HEAD\.$/,
    );
    const html = renderToString(createElement(GraphView, { repo: SALE }));
    expect(count(html, 'role="listitem"')).toBe(SALE.order.length);
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(ancestors(SALE, SALE.refs.sale).size).toBe(4);
  });
});

describe('the stage', () => {
  it('opens on the picture, with the graph tab off when there is no repo', () => {
    const html = renderToString(createElement(GitStage, { show: { yard: yardOf(BASE), caption: 'x' } }));
    expect(html).toContain('data-crate=');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Graph/);
  });

  it('shows the graph when asked, and escapes the caption', () => {
    const html = renderToString(
      createElement(GitStage, { view: 'graph', show: { yard: yardOf(SALE), repo: SALE, caption: '<b>x</b>' } }),
    );
    expect(html).toContain('role="list"');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
