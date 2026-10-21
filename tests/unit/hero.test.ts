// U2: the home hero draws a plot for every module in the registry, at any count (R2).
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { HERO_BOARD, HOME_HERO, HOME_HERO_LABEL, heroBoard, heroCaption, heroLabel, heroScene, plotAt, undrawn } from '../../src/components/scenes/heroScene';
import { MODULES } from '../../src/lib/modules';
import { PALS, WOOD } from '../../src/lib/iso/core.js';

const draw = (board = HERO_BOARD, scene = HOME_HERO) => renderToString(createElement(IsoStage, { board, scene, label: '' }));
const upper = (s: string) => s.toUpperCase().replace(/&/g, '&amp;');
/** the SVG before the planned pills, then each planned pill's group (they are drawn last) */
const soonSplit = (svg: string) => { const [rest, ...soon] = svg.split('<g class="hero-soon">'); return { rest, soon }; };

describe('home hero', () => {
  it('has one name pill per module, each from the registry, and no NaN coordinates', () => {
    const svg = draw();
    for (const m of MODULES) expect(svg).toContain(upper(m.id.replace(/-/g, ' ')));
    expect(soonSplit(svg).soon).toHaveLength(MODULES.filter(m => m.status === 'planned').length);
    expect(svg).not.toMatch(/NaN/);
  });

  // 17 live modules (the roadmap all live) leave 15 slots after RAG's and tool calling's plots
  it('plots never overlap and stay on the board, for 1 slot up to the registry’s count (at least 15)', () => {
    const slots = MODULES.filter(m => m.status === 'live').length - 2 + MODULES.filter(m => m.status === 'planned').length;
    for (let n = 1; n <= Math.max(15, slots); n++) {
      const rects = Array.from({ length: n }, (_, i) => plotAt(i)), [, , bx1, by1] = heroBoard(n);
      rects.forEach(([x0, y0, x1, y1], i) => {
        expect(x1 <= bx1 && y1 <= by1 && x0 >= 0 && y0 >= 0).toBe(true);
        rects.slice(i + 1).forEach(([a0, b0, a1, b1]) => expect(x1 <= a0 || a1 <= x0 || y1 <= b0 || b1 <= y0).toBe(true));
      });
    }
  });

  it('fits nine slots, and a third live module draws as live (its pill in the wave, not a building site)', () => {
    const planned = Array.from({ length: 6 }, (_, i) => ({ name: `Planned ${i}` }));
    const scene = heroScene({ live: [{ name: 'One' }, { name: 'Two' }, { name: 'Three', draw: () => '<g class="third"/>' }], planned, ride: [] });
    const svg = draw(heroBoard(7), scene);
    expect(svg).toContain('class="third"');
    const { rest, soon } = soonSplit(svg);
    expect(rest).toContain('THREE');
    expect(soon.map(g => /PLANNED \d/.exec(g)?.[0])).toEqual(planned.map(p => p.name.toUpperCase()));
    expect(svg).not.toMatch(/NaN/);
  });

  // a live module with no drawing would leave an empty mint plot in the wave
  it('draws a plot for every live module, and names any that lacks one', () => {
    const live = MODULES.filter(m => m.status === 'live').map(m => m.id);
    expect(undrawn(live)).toEqual([]);
    const seventeen = [...live, ...Array.from({ length: 17 - live.length }, (_, i) => `fixture-${i}`)];
    expect(undrawn(seventeen)).toEqual(seventeen.slice(live.length));
  });

  it('the caption invites a build while plots are open, and a proposal once none are', () => {
    expect(heroCaption(true)).toEqual({ text: 'The empty plots are open:', link: 'build one' });
    expect(heroCaption(false)).toEqual({ text: 'Room for more:', link: 'propose one' });
  });

  it('the label names every module', () => {
    for (const m of MODULES) expect(HOME_HERO_LABEL).toContain(m.title);
  });

  it('names building sites only while some module is planned', () => {
    expect(HOME_HERO_LABEL.includes('building sites')).toBe(MODULES.some(m => m.status === 'planned'));
    expect(heroLabel(['RAG', 'Tool calling'], [])).toBe('Tinker as one workshop with a plot per module: RAG and Tool calling, live.');
  });

  // a planned fixture keeps the building-site path tested whatever the registry holds (KTD14)
  it('a planned fixture still draws a building site (crate and cones) and the label names it', () => {
    const count = (svg: string, colour: string) => svg.split(colour).length - 1;
    const site = draw(heroBoard(1), heroScene({ live: [{ name: 'One' }, { name: 'Two' }], planned: [{ name: 'demo' }], ride: [] }));
    const live = draw(heroBoard(1), heroScene({ live: [{ name: 'One' }, { name: 'Two' }, { name: 'Three' }], planned: [], ride: [] }));
    expect(site).toContain('DEMO');
    expect(count(site, WOOD.l)).toBeGreaterThan(count(live, WOOD.l));
    expect(count(site, PALS.tomato.l)).toBeGreaterThan(count(live, PALS.tomato.l));
    expect(heroLabel(['RAG'], ['Demo'])).toBe('Tinker as one workshop with a plot per module: RAG, live, and building sites for Demo.');
  });

  // the wave's timing is per live plot, so planned pills sit out of it in their own group, which the animated home hides
  it('keeps every planned pill out of the hop wave, in a hero-soon group', () => {
    const svg = draw(heroBoard(2), heroScene({ live: [{ name: 'One' }, { name: 'Two' }], planned: [{ name: 'a' }, { name: 'b' }], ride: [] }));
    const { rest, soon } = soonSplit(svg);
    expect(soon.map(g => />([AB])</.exec(g)?.[1])).toEqual(['A', 'B']);
    expect(rest).not.toMatch(/>[AB]</);
    expect(rest).toContain('class="hero-hop"');
  });

  // reduced motion and the share image show every pill at once: none may cover another
  it('no two pills overlap with every pill shown, for the real registry', () => {
    const boxes = [...draw().matchAll(/<g class="block-tag"[^>]*><g class="tag[^"]*">.*?<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)".*?>([^<]+)<\/text>/g)]
      .map(([, x, y, w, h, name]) => ({ name, x0: +x, y0: +y, x1: +x + +w, y1: +y + +h }));
    expect(boxes).toHaveLength(MODULES.length);
    const hits = boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).map(b => `${a.name} × ${b.name}`));
    expect(hits).toEqual([]);
  });
});
