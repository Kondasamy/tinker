// U2: the home hero draws a plot for every module in the registry, at any count (R2).
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { HERO_BOARD, HOME_HERO, HOME_HERO_LABEL, heroBoard, heroLabel, heroScene, plotAt } from '../../src/components/scenes/heroScene';
import { MODULES } from '../../src/lib/modules';
import { PALS, WOOD } from '../../src/lib/iso/core.js';

const draw = (board = HERO_BOARD, scene = HOME_HERO) => renderToString(createElement(IsoStage, { board, scene, label: '' }));
const upper = (s: string) => s.toUpperCase().replace(/&/g, '&amp;');

describe('home hero', () => {
  it('has one name pill per module, each from the registry, and no NaN coordinates', () => {
    const svg = draw();
    for (const m of MODULES.filter(m => m.status === 'live')) expect(svg).toContain(upper(m.id.replace(/-/g, ' ')));
    for (const m of MODULES.filter(m => m.status === 'planned')) expect(svg).toContain(upper(m.id.replace(/-/g, ' ')));
    expect(svg.match(/class="hero-soon"/g) ?? []).toHaveLength(MODULES.filter(m => m.status === 'planned').length);
    expect(svg).not.toMatch(/NaN/);
  });

  it('plots never overlap and stay on the board, for 1 slot up to the registry’s count (at least 12)', () => {
    const slots = MODULES.filter(m => m.status === 'live').length - 2 + MODULES.filter(m => m.status === 'planned').length;
    for (let n = 1; n <= Math.max(12, slots); n++) {
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
    expect(svg).toContain('THREE');
    expect(svg).not.toMatch(/hero-soon">(?:(?!<g class="hero).)*THREE/s);
    expect(svg.match(/PLANNED \d/g)).toHaveLength(6);
    expect(svg).not.toMatch(/NaN/);
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
    expect(svg.match(/<g class="hero-soon"><g class="block-tag"[^>]*>(?:(?!<g class="hero).)*?>[AB]</gs)).toHaveLength(2);
    expect(svg.replace(/<g class="hero-soon">.*?>[AB]<.*?<\/g><\/g>/gs, '')).not.toMatch(/>[AB]</);
  });
});
