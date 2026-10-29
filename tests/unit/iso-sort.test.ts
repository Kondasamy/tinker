import { describe, it, expect } from 'vitest';
import { byDepth, depthOf, withFrame, openShell, on, PZ, ellUV } from '../../src/lib/iso/core.js';

type Item = { at?: number[]; box?: number[][]; svg: string };
const sorted = (items: Item[], view = 0) => withFrame({ view, center: [50, 50] }, () => byDepth(items));
const oldSort = (items: Item[]) =>
  withFrame({ view: 0, center: [50, 50] }, () =>
    [...items]
      .sort((p, q) => depthOf(p.at as number[]) - depthOf(q.at as number[]))
      .map(p => p.svg)
      .join(''),
  );

describe('box-aware depth sorting', () => {
  const far: Item = {
    box: [
      [0, 0, 0],
      [10, 10, 10],
    ],
    svg: 'F',
  };
  const near: Item = {
    box: [
      [20, 0, 0],
      [30, 10, 10],
    ],
    svg: 'N',
  };

  it('draws the box on the viewer side last, and flips when turned round', () => {
    expect(sorted([near, far], 0)).toBe('FN');
    expect(sorted([far, near], 2)).toBe('NF');
  });

  it('orders separated boxes correctly in every quarter turn and between them', () => {
    const left: Item = {
      box: [
        [0, 0, 0],
        [10, 10, 10],
      ],
      svg: 'L',
    };
    const right: Item = {
      box: [
        [0, 20, 0],
        [10, 30, 10],
      ],
      svg: 'R',
    };
    // +y is toward the viewer at view 0 and 1, away at 2 and 3
    expect(sorted([right, left], 0)).toBe('LR');
    expect(sorted([right, left], 1)).toBe('LR');
    expect(sorted([left, right], 2)).toBe('RL');
    expect(sorted([left, right], 3)).toBe('RL');
    expect(sorted([right, left], 0.5)).toBe('LR');
    expect(sorted([left, right], 2.5)).toBe('RL');
  });

  it('uses separation, not centre depth, for a long thin part beside a short tall one', () => {
    // a long low rail runs along x in front (+y) of a tall post whose centre sits higher
    const post: Item = {
      box: [
        [40, 0, 0],
        [44, 4, 80],
      ],
      svg: 'P',
    };
    const rail: Item = {
      box: [
        [0, 10, 0],
        [100, 14, 4],
      ],
      svg: 'R',
    };
    expect(sorted([rail, post])).toBe('PR');
  });

  it('gives one order for a dense set whatever the input order', () => {
    const set: Item[] = Array.from({ length: 10 }, (_, i) => {
      const x = (i % 4) * 14;
      const y = Math.floor(i / 4) * 14;
      return {
        box: [
          [x, y, 0],
          [x + 12, y + 12, 6 + i * 3],
        ],
        svg: String(i),
      };
    });
    const first = sorted(set);
    let seed = 7;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let n = 0; n < 6; n++) {
      const shuffled = [...set].sort(() => rand() - 0.5);
      expect(sorted(shuffled)).toBe(first);
    }
  });

  it('sorts at-only items exactly as before', () => {
    const items: Item[] = [
      { at: [30, 5, 0], svg: 'a' },
      { at: [0, 40, 10], svg: 'b' },
      { at: [12, 12, 30], svg: 'c' },
      { at: [50, 50, 0], svg: 'd' },
      { at: [-5, 2, 4], svg: 'e' },
    ];
    expect(sorted(items)).toBe(oldSort(items));
  });
});

describe('openShell', () => {
  it('draws the far wall, then the contents, then the near wall', () => {
    const A = on(PZ(0), ellUV(0, 0, 10, 10));
    const B = on(PZ(12), ellUV(0, 0, 12, 12));
    const out = withFrame({}, () => openShell(A, B, () => '#abcdef', '<g id="inside"/>'));
    const at = out.indexOf('<g id="inside"/>');
    expect(at).toBeGreaterThan(0);
    expect(out.slice(0, at)).toContain('#abcdef');
    expect(out.slice(at)).toContain('#abcdef');
  });
});
