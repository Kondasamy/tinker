import { describe, it, expect } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToString } from 'react-dom/server';
import { P0, withFrame, ink, inkScale, clipTo } from '../../src/lib/iso/core.js';
import { BLOCKS, BLOCK_TYPES, renderers, blockShadow, type BlockType } from '../../src/lib/iso/blocks';
import IsoStage, { frameFor, type Board, type SceneCtx } from '../../src/lib/iso/IsoStage';

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

  it.each(BLOCK_TYPES)('%s renders its label, aria label and stat', type => {
    const svg = withFrame({}, () => renderers[type]({ x: 30, y: 30, stat: '7 <ITEMS>' }));
    expect(svg).toContain(`>${BLOCKS[type].label}</text>`);
    // the name starts with the words drawn on the block (WCAG 2.5.3), then what the block is
    expect(svg).toMatch(new RegExp(`^<g class="block" role="button" tabindex="0" aria-label="[^"]*${BLOCKS[type].label.toLowerCase()} 7 &lt;items&gt;: ${BLOCKS[type].name} block" data-block="${type}">`));
    expect(svg).toContain('>7 &lt;ITEMS&gt;</text>');
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
