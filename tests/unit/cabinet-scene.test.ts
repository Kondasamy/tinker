// Search's stage (U5): the index cabinet's parts, drawers and podium, escaping, the postings view, the filing bench's
// rule and its keyboard path, and the stage's two tabs.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  CABINET_BOARD,
  CABINET_PARTS,
  CARDS_DRAWN,
  IDLE,
  MAX_DRAWERS,
  cabinetAt,
  cabinetLabel,
  cabinetReadouts,
  cabinetScene,
  cabinetState,
  type CabinetOpts,
} from '../../src/components/scenes/cabinetScene';
import { postingsView } from '../../src/components/scenes/postingsView';
import { FilingBench, PostingsTable, SearchStage, belongs, place } from '../../src/content/search/kit';
import { DEFAULT, N, pageName, pageOf, search } from '../../src/lib/search/engine';

const draw = (o: CabinetOpts) =>
  renderToString(createElement(IsoStage, { board: CABINET_BOARD, scene: cabinetScene(o), label: cabinetLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;

describe('the index cabinet', () => {
  it('draws every part a callout may name, and each callout', () => {
    const svg = draw({ ...IDLE, words: 10 });
    for (const p of CABINET_PARTS) expect(svg).toContain(`data-prop="${p}"`);
    for (const p of CABINET_PARTS)
      expect(draw({ ...IDLE, words: 10, say: { block: p, text: 'Here' } })).toContain('Here');
  });

  it("opens the query's drawers, caps them, and caps the cards drawn", () => {
    const o = cabinetAt('Larkspur forklift', DEFAULT),
      svg = draw(o);
    expect(count(svg, 'class="drawer out lit"')).toBe(2);
    expect(svg).toContain('data-word="larkspur" data-cards="41"');
    expect(count(svg, 'class="card')).toBe(CARDS_DRAWN + Math.min(CARDS_DRAWN, 6));
    const many = cabinetAt('who pays to send back a faulty item when the label printer jams near the dock', DEFAULT);
    expect(cabinetState(many).drawers.length).toBeLessThanOrEqual(MAX_DRAWERS);
  });

  it('the podium follows the engine’s ranking, its steps as tall as the scores', () => {
    for (const q of ['forklift', 'price', 'Larkspur forklift']) {
      const st = cabinetState(cabinetAt(q, DEFAULT)).steps;
      expect(st.map(s => s.name)).toEqual(
        search(q)
          .slice(0, 3)
          .map(h => pageName(h.id)),
      );
      for (let i = 1; i < st.length; i++) expect(st[i].h).toBeLessThanOrEqual(st[i - 1].h);
    }
    expect(draw(cabinetAt('zzzz', DEFAULT))).toContain('NO RESULTS');
  });

  it('lights the stack when the clerk reads every page', () => {
    const o = { ...IDLE, words: 0, query: 'forklift', read: N };
    expect(draw(o)).toContain('class="reading"');
    expect(cabinetReadouts(o)).toEqual([`${N} pages read`]);
  });

  it('escapes every label', () => {
    const svg = draw({ ...IDLE, words: 1, query: '<b>&', drawers: [{ word: '<i>', cards: 1, lit: true }] });
    expect(svg).not.toContain('<b>');
    expect(svg).not.toContain('<i>');
    expect(svg).toContain('&lt;b&gt;');
  });

  it('a fresh card is marked for its drop, which only plays without reduced motion', () => {
    const svg = draw({ ...IDLE, words: 1, drawers: [{ word: 'refund', cards: 1, fresh: true }] });
    expect(count(svg, 'class="card fresh"')).toBe(1);
    const css = readFileSync('src/content/search/search.css', 'utf8');
    expect(css.indexOf('sx-drop')).toBeGreaterThan(css.indexOf('prefers-reduced-motion: no-preference'));
  });

  it('on phones the pills keep just the names', () => {
    const o = cabinetAt('forklift', DEFAULT);
    expect(draw({ ...o, scale: 1.2 })).toContain('forklift · 6 PAGES');
    expect(draw({ ...o, scale: 2 })).not.toContain('6 PAGES');
  });
});

describe('the postings view', () => {
  it('a row per query word: its pages, rarity, and best pages first', () => {
    const rows = postingsView('Larkspur forklift', DEFAULT);
    expect(rows.map(r => r.word)).toEqual(['larkspur', 'forklift']);
    expect(rows[0].rarity).toBeLessThan(rows[1].rarity);
    for (const r of rows)
      for (let i = 1; i < r.list.length; i++) expect(r.list[i].adds).toBeLessThanOrEqual(r.list[i - 1].adds);
    const html = renderToString(createElement(PostingsTable, { query: 'forklift', settings: DEFAULT }));
    expect(html).toContain('<th scope="row">forklift</th>');
  });
});

describe('the filing bench', () => {
  const SAFETY = pageOf('warehouse-safety-handbook-2023#2');
  it('keeps a card only in a drawer of a word on it, and hints after three refusals', () => {
    expect(belongs(SAFETY, 'forklift', DEFAULT.clean)).toBe(true);
    let r = place(0, SAFETY, 'refund', DEFAULT.clean);
    expect(r).toEqual({ ok: false, misses: 1, hint: false });
    r = place(r.misses, SAFETY, 'printer', DEFAULT.clean);
    r = place(r.misses, SAFETY, 'invoice', DEFAULT.clean);
    expect(r).toEqual({ ok: false, misses: 3, hint: true });
    expect(place(r.misses, SAFETY, 'forklift', DEFAULT.clean).ok).toBe(true);
  });

  it('draws the cards and drawers as two listboxes, one active option each', () => {
    const html = renderToString(
      createElement(FilingBench, {
        cards: [SAFETY],
        drawers: ['forklift', 'refund'],
        filed: {},
        clean: DEFAULT.clean,
        onFile: () => {},
      }),
    );
    expect(count(html, 'role="listbox"')).toBe(2);
    expect(count(html, 'role="option"')).toBe(3);
    expect(html).toContain('aria-activedescendant="sx-cards-0"');
  });
});

describe('the stage', () => {
  it('opens on the picture, with the postings tab off when nothing was searched', () => {
    const html = renderToString(createElement(SearchStage, { show: { scene: { ...IDLE, words: 1 }, caption: 'x' } }));
    expect(html).toContain('data-prop="cabinet"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Postings/);
  });

  it('shows the postings when asked, and escapes the caption', () => {
    const html = renderToString(
      createElement(SearchStage, {
        view: 'postings',
        show: {
          scene: cabinetAt('forklift', DEFAULT),
          postings: { query: 'forklift', settings: DEFAULT },
          caption: '<b>x</b>',
        },
      }),
    );
    expect(html).toContain('<table');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
