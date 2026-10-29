// The scene compactor is lossless: relative paths land on exactly the points the absolute ones named.
import { describe, expect, it } from 'vitest';
import { compact, relPath } from '../../src/lib/iso/compact';

/** Read a path back to absolute points (M, l with implicit repeats, Z). */
function points(d: string): number[][] {
  const out: number[][] = [];
  let cx = 0,
    cy = 0,
    sx = 0,
    sy = 0;
  for (const seg of d.match(/[MLlZ][^MLlZ]*/g) ?? []) {
    const c = seg[0],
      n = (seg.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (c === 'Z') {
      [cx, cy] = [sx, sy];
      out.push([NaN, NaN]);
      continue;
    }
    for (let i = 0; i + 1 < n.length; i += 2) {
      if (c === 'M' && i === 0) [cx, cy, sx, sy] = [n[0], n[1], n[0], n[1]];
      else if (c === 'l') [cx, cy] = [cx + n[i], cy + n[i + 1]];
      else [cx, cy] = [n[i], n[i + 1]];
      out.push([Math.round(cx * 10), Math.round(cy * 10)]);
    }
  }
  return out;
}

describe('compact', () => {
  const ds = [
    'M12.3 45.6L13.4 46.7L-2.0 0.5Z',
    'M0.0 0.0L10.0 0.0L10.0 10.0ZM20.5 -3.1L21.0 -4.0L19.9 -2.2Z',
    'M5.5 5.5L5.5 5.5L-100.4 7.3',
  ];
  it.each(ds)('keeps every point of %s', d => {
    expect(points(relPath(d))).toEqual(points(d));
    expect(relPath(d).length).toBeLessThanOrEqual(d.length);
  });
  it('rewrites only pd-style paths and hoists the line join', () => {
    const svg = `<path d="M1.0 2.0L3.0 4.0Z" stroke-linejoin="round"/><path d="M0 0Q1 1 2 2"/>`;
    const out = compact(svg);
    expect(out.startsWith('<g stroke-linejoin="round" stroke-linecap="round" stroke-width=".7">')).toBe(true);
    expect(out).toContain('d="M0 0Q1 1 2 2"');
    expect(out).toContain('d="M1 2l2 2Z"');
    expect(out.match(/stroke-linejoin/g)).toHaveLength(1);
  });
});
