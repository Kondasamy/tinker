// The home hero: a fixed board where every live module after RAG and tool calling takes a turn on the stand.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  HERO_BOARD,
  HERO_TURNS,
  HOME_HERO,
  HOME_HERO_LABEL,
  heroScene,
  undrawn,
} from '../../src/components/scenes/heroScene';
import { MODULES } from '../../src/lib/modules';

const LIVE = MODULES.filter(m => m.status === 'live');
const draw = (scene = HOME_HERO) => renderToString(createElement(IsoStage, { board: HERO_BOARD, scene, label: '' }));
const upper = (s: string) => s.toUpperCase().replace(/&/g, '&amp;');
/** each turn on the stand: its link and whether a still picture hides it */
const turnsOf = (svg: string) =>
  [...svg.matchAll(/<g data-href="([^"]+)" class="hero-turn" style="--i:(\d+)"( visibility="hidden")?>/g)].map(
    ([, href, i, hidden]) => ({ href, i: +i, hidden: !!hidden }),
  );

describe('home hero', () => {
  it('has a name pill and a link for every live module, and no NaN coordinates', () => {
    const svg = draw();
    for (const m of LIVE) {
      expect(svg).toContain(upper(m.id.replace(/-/g, ' ')));
      expect(svg).toContain(`data-href="/${m.id}/"`);
    }
    expect(svg).toContain('data-href="#request"');
    expect(svg).not.toMatch(/NaN/);
  });

  it('puts every module after the first two on the stand, newest first, and a still picture shows only the newest', () => {
    const turns = turnsOf(draw());
    expect(turns).toHaveLength(HERO_TURNS);
    expect(turns.map(t => t.href)).toEqual(
      LIVE.slice(2)
        .reverse()
        .map(m => `/${m.id}/`),
    );
    expect(turns.map(t => t.hidden)).toEqual(turns.map((_, i) => i > 0));
  });

  // the point of the stand: adding modules never grows the board, only the queue for the stand
  it('stands any number of modules in turn on the same board', () => {
    const live = Array.from({ length: 60 }, (_, i) => ({ id: `module-${i}` }));
    const turns = turnsOf(draw(heroScene({ live, ride: [] })));
    expect(turns).toHaveLength(58);
    expect(turns.filter(t => !t.hidden)).toHaveLength(1);
  });

  // every module's pill takes the same spot on the stand: none may cover RAG's, tool calling's or the building site's
  it('no stand pill covers another pill, for every live module', () => {
    for (const m of LIVE.slice(2))
      expect(pillHits(draw(heroScene({ live: [LIVE[0], LIVE[1], m], ride: [] })), 4), m.id).toEqual([]);
  });

  // a live module with no drawing would stand an empty mat on the stand
  it('draws a plot for every live module, and names any that lacks one', () => {
    const live = LIVE.map(m => m.id);
    expect(undrawn(live)).toEqual([]);
    expect(undrawn([...live, 'fixture'])).toEqual(['fixture']);
  });

  it('the label names every live module', () => {
    for (const m of LIVE) expect(HOME_HERO_LABEL).toContain(m.title);
  });
});

/** the overlapping pairs among an SVG's pills, which should number `count` */
function pillHits(svg: string, count: number) {
  const boxes = [
    ...svg.matchAll(
      /<g class="block-tag"[^>]*><g class="tag[^"]*">.*?<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)".*?>([^<]+)<\/text>/g,
    ),
  ].map(([, x, y, w, h, name]) => ({ name, x0: +x, y0: +y, x1: +x + +w, y1: +y + +h }));
  expect(boxes).toHaveLength(count);
  return boxes.flatMap((a, i) =>
    boxes
      .slice(i + 1)
      .filter(b => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1)
      .map(b => `${a.name} × ${b.name}`),
  );
}
