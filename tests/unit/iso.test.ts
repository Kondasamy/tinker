import { describe, it, expect } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToString } from 'react-dom/server';
import { P, P0, withFrame, ink, inkScale, clipTo, unrotXY } from '../../src/lib/iso/core.js';
import { BLOCKS, BLOCK_TYPES, renderers, blockShadow, blockTag, type BlockType } from '../../src/lib/iso/blocks';
import IsoStage, { frameFor, stageFrame, type Board, type SceneCtx } from '../../src/lib/iso/IsoStage';

const restScene = (types: BlockType[]) => ({ top }: SceneCtx) =>
  types.map((t, i) => blockShadow(t, 28 + i * 56, 28, top)).join('') +
  types.map((t, i) => renderers[t]({ x: 28 + i * 56, y: 28, stat: '3 THINGS' })).join('');

describe('projection and framing', () => {
  it('maps the board corners into the viewBox with padding', () => {
    const b: Board = [-14, 0, 378, 128];
    const fr = frameFor(b);
    const pts = withFrame(fr, () => [b[0], b[2]].flatMap(x => [b[1], b[3]].map(y => P0(x, y, 0))));
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(14 - 1e-9);
      expect(x).toBeLessThanOrEqual(fr.w - 14 + 1e-9);
      expect(y).toBeGreaterThanOrEqual(14);
      expect(y).toBeLessThanOrEqual(fr.h - 14);
    }
    // the outermost corners touch the padding exactly
    expect(Math.min(...pts.map(p => p[0]))).toBeCloseTo(14);
    expect(Math.max(...pts.map(p => p[0]))).toBeCloseTo(fr.w - 14);
    expect(fr.inkK).toBeCloseTo(fr.w / 585);
  });

  it('restores the previous frame after withFrame', () => {
    const before = P0(1, 2, 3);
    withFrame({ ox: 100, oy: 50 }, () => expect(P0(0, 0, 0)).toEqual([100, 50]));
    expect(P0(1, 2, 3)).toEqual(before);
  });
});

describe('ink scaling', () => {
  it('rescales every stroke width by the frame factor', () => {
    const svg = ink('M0 0L1 1', 1.5) + ink('M0 0L2 2', 0.8);
    const out = withFrame({ inkK: 2 }, () => inkScale(svg));
    expect([...out.matchAll(/stroke-width="([\d.]+)"/g)].map(m => +m[1])).toEqual([3, 1.6]);
    expect(withFrame({ inkK: 1 }, () => inkScale(svg))).toBe(svg);
  });
});

describe('block renderers', () => {
  it('covers all twelve block types', () => {
    expect(BLOCK_TYPES).toHaveLength(12);
  });

  it.each(BLOCK_TYPES)('%s shows its label and stat in a pill, and in its aria label', type => {
    const svg = withFrame({}, () => renderers[type]({ x: 30, y: 30, stat: '7 <ITEMS>' }));
    const pill = withFrame({}, () => blockTag(type, { x: 30, y: 30, stat: '7 <ITEMS>' }));
    expect(pill).toContain(`>${BLOCKS[type].label} · 7 &lt;ITEMS&gt;</text>`);
    expect(pill).toContain(`data-pick="${type}"`);
    // the name starts with the words shown for the block (WCAG 2.5.3), then what the block is
    expect(svg).toMatch(new RegExp(`^<g class="block" role="button" tabindex="0" aria-label="[^"]*${BLOCKS[type].label.toLowerCase()} 7 &lt;items&gt;: ${BLOCKS[type].name} block" data-block="${type}">`));
  });

  it('draws the selected ring only when selected', () => {
    const plain = withFrame({}, () => renderers.index({ x: 0, y: 0 }));
    const sel = withFrame({}, () => renderers.index({ x: 0, y: 0, selected: true }));
    expect(plain).not.toContain('class="sel"');
    expect(sel).toContain('class="sel"');
    expect(sel).toContain('aria-label="index: Index block, selected"');
  });
});

describe('IsoStage', () => {
  it('renders two stages on one page with unique ids and their own framing', () => {
    const a: Board = [0, 0, 120, 60], b: Board = [0, 0, 400, 240];
    const html = renderToString(createElement(Fragment, null,
      createElement(IsoStage, { board: a, label: 'Stage A', scene: restScene(['docs', 'chunker']) }),
      createElement(IsoStage, { board: b, label: 'Stage B', scene: restScene(['index', 'retriever', 'llm']) }),
    ));
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(2 + 5);   // two filters + one clip per shadow
    expect(new Set(ids).size).toBe(ids.length);
    // every url(#…) reference points at an id in the same page
    for (const [, ref] of html.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref);

    const boxes = [...html.matchAll(/viewBox="0 0 ([\d.]+) ([\d.]+)"/g)].map(m => [+m[1], +m[2]]);
    for (const [i, bd] of [a, b].entries()) {
      const fr = frameFor(bd);
      expect(boxes[i]).toEqual([+fr.w.toFixed(1), +fr.h.toFixed(1)]);
    }
    expect(html).toContain('aria-label="Stage A"');
    expect(html).toContain('role="img"');
  });

  it('clip ids carry the frame prefix and restart per frame', () => {
    const one = withFrame({ prefix: 'p1-' }, () => clipTo([[0, 0, 0], [1, 0, 0], [0, 1, 0]], ''));
    const two = withFrame({ prefix: 'p2-' }, () => clipTo([[0, 0, 0], [1, 0, 0], [0, 1, 0]], ''));
    expect(one).toContain('id="p1-k1"');
    expect(two).toContain('id="p2-k1"');
  });
});

describe('turning and zoom', () => {
  const b: Board = [0, 0, 300, 120];
  it('every whole turn frames the board the same; part turns pull back', () => {
    const f0 = frameFor(b);
    for (const v of [1, 2, 3, -1]) {
      const f = frameFor(b, v);
      expect(f.w).toBeCloseTo(f0.w, 6);
      expect(f.h).toBeCloseTo(f0.h, 6);
    }
    expect(frameFor(b, .5).w).toBeGreaterThan(f0.w);
    expect(stageFrame(b, .5).inkK).toBe(f0.inkK);   // ink weight stays put while turning
  });
  it('unrotXY undoes the turn at any angle', () => {
    // the model point under turned floor point (40, 90) projects to where (40, 90) would without a turn
    for (const view of [0, .3, 1, 2.7]) withFrame({ view, center: [150, 60] }, () => {
      const [ux, uy] = unrotXY(40, 90);
      expect(P(ux, uy, 0)[0]).toBeCloseTo(P0(40, 90, 0)[0], 6);
      expect(P(ux, uy, 0)[1]).toBeCloseTo(P0(40, 90, 0)[1], 6);
    });
  });
  it('turned round, labels move to the faces now toward the viewer', () => {
    const front = withFrame({}, () => renderers.llm({ x: 0, y: 0, stat: 'X' }));
    const back = withFrame({ view: 2 }, () => renderers.llm({ x: 0, y: 0, stat: 'X' }));
    expect(front).not.toBe(back);
    // same words drawn, so the accessible name is unchanged
    expect(back.match(/aria-label="[^"]*"/)![0]).toBe(front.match(/aria-label="[^"]*"/)![0]);
  });
  it('zoom crops the viewBox about its point and hides overflow', () => {
    const html = renderToString(createElement(IsoStage, { board: b, label: 'Z', scene: '', zoom: { k: 2, u: 0, v: 1 } }));
    const f = frameFor(b), [x, y, w, h] = html.match(/viewBox="([^"]+)"/)![1].split(' ').map(Number);
    expect([x, w]).toEqual([0, +(f.w / 2).toFixed(1)]);
    expect(y).toBeCloseTo(f.h / 2, 1);
    expect(h).toBeCloseTo(f.h / 2, 1);
    expect(html).toContain('overflow:hidden');
  });
});
