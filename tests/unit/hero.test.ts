// U2: the home hero draws a plot for every module in the registry, at any count (R2).
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { HERO_BOARD, HOME_HERO, HOME_HERO_LABEL, heroBoard, heroScene, plotAt } from '../../src/components/scenes/heroScene';
import { MODULES } from '../../src/lib/modules';

const draw = (board = HERO_BOARD, scene = HOME_HERO) => renderToString(createElement(IsoStage, { board, scene, label: '' }));
const upper = (s: string) => s.toUpperCase().replace(/&/g, '&amp;');

describe('home hero', () => {
  it('has one name pill per module, each from the registry, and no NaN coordinates', () => {
    const svg = draw();
    for (const m of MODULES.filter(m => m.status === 'live')) expect(svg).toContain(upper(m.title));
    for (const m of MODULES.filter(m => m.status === 'planned')) expect(svg).toContain(`SOON: ${m.id.replace(/-/g, ' ').toUpperCase()}`);
    expect(svg).not.toMatch(/NaN/);
  });

  it('plots never overlap and stay on the board, for 1 to 12 slots', () => {
    for (let n = 1; n <= 12; n++) {
      const rects = Array.from({ length: n }, (_, i) => plotAt(i)), [, , bx1, by1] = heroBoard(n);
      rects.forEach(([x0, y0, x1, y1], i) => {
        expect(x1 <= bx1 && y1 <= by1 && x0 >= 0 && y0 >= 0).toBe(true);
        rects.slice(i + 1).forEach(([a0, b0, a1, b1]) => expect(x1 <= a0 || a1 <= x0 || y1 <= b0 || b1 <= y0).toBe(true));
      });
    }
  });

  it('fits nine slots, and a third live module draws as live (no "Soon" pill)', () => {
    const planned = Array.from({ length: 6 }, (_, i) => ({ name: `Planned ${i}` }));
    const scene = heroScene({ live: [{ name: 'One' }, { name: 'Two' }, { name: 'Three', draw: () => '<g class="third"/>' }], planned, ride: [] });
    const svg = draw(heroBoard(7), scene);
    expect(svg).toContain('class="third"');
    expect(svg).toContain('THREE');
    expect(svg).not.toContain('SOON: THREE');
    expect(svg.match(/SOON: PLANNED/g)).toHaveLength(6);
    expect(svg).not.toMatch(/NaN/);
  });

  it('the label names every module', () => {
    for (const m of MODULES) expect(HOME_HERO_LABEL).toContain(m.title);
  });
});
