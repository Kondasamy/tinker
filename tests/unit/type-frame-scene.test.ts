// The type frame and the fill strip (U29): every named part is drawn and takes a callout, the lit slugs are the pass's
// stamped slots, glows grow with probability, pieces are escaped, phones keep only slot numbers, the dial follows k,
// and the strip has a cell per slot per pass.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  FRAME_BOARD,
  FRAME_PARTS,
  dialAngle,
  frameLabel,
  glowOf,
  surest,
  typeFrameScene,
  type FrameOpts,
} from '../../src/components/scenes/typeFrameScene';
import { cellsOf, fillStrip } from '../../src/components/scenes/fillStrip';
import { KS, decode, show } from '../../src/lib/diffusion-llms/decode';
import { encode } from '../../src/lib/lm/bpe';
import { diskMlm } from '../../src/lib/diffusion-llms/diskModel';
import { PHRASES } from '../../src/lib/diffusion-llms/workbench';
import { frameOf } from '../../src/content/diffusion-llms/kit';

const draw = (o: FrameOpts) =>
  renderToString(createElement(IsoStage, { board: FRAME_BOARD, scene: typeFrameScene(o), label: frameLabel(o) }));
const p = PHRASES[5],
  f = decode(diskMlm(), p.ids, 4, 'confidence', p.seed);
const at = (n: number): FrameOpts => ({ given: p.ids.length, ...frameOf(f, n), typed: 3, typeOf: 16 });
const calls = (svg: string) => svg.match(/class="callout"/g)?.length ?? 0;

describe('the type frame', () => {
  it('draws every part it names, and takes one callout over each', () => {
    const svg = draw(at(2));
    for (const part of FRAME_PARTS) expect(svg).toContain(`data-part="${part}"`);
    for (const block of FRAME_PARTS) expect(calls(draw({ ...at(2), say: { block, text: 'Look here' } })), block).toBe(1);
    expect(calls(draw({ ...at(2), say: { block: 'nowhere', text: 'x' } }))).toBe(0);
  });

  it('lights the slots stamped on the pass shown, and keeps earlier ones set', () => {
    for (let n = 1; n <= f.passes.length; n++) {
      const o = at(n),
        lit = o.slots.flatMap((s, i) => (s.state === 'new' ? [i] : []));
      expect(lit.sort((a, b) => a - b)).toEqual([...f.passes[n - 1].stamped].sort((a, b) => a - b));
      expect(o.slots.filter(s => s.state !== 'mask')).toHaveLength(4 * n);
      expect(draw(o)).toContain(`data-new="${lit.length}"`);
    }
    expect(at(0).slots.every(s => s.state === 'mask' && s.p === 0)).toBe(true);
  });

  it('sizes each glow by its probability, and points the press at the surest new slot', () => {
    for (let i = 1; i <= 10; i++) expect(glowOf(i / 10)).toBeGreaterThan(glowOf((i - 1) / 10));
    const o = at(1),
      svg = draw(o),
      glows = [...svg.matchAll(/data-glow="([\d.]+)" data-slot="(\d+)"/g)].map(m => [Number(m[1]), Number(m[2])]);
    expect(glows.length).toBe(o.slots.filter(s => s.p > 0).length);
    for (const [g, slot] of glows) expect(g).toBeCloseTo(o.slots[slot].p, 3);
    const best = surest(o)!;
    expect(o.slots[best].p).toBe(Math.max(...f.passes[0].stamped.map(i => f.passes[0].guesses[i]!.p)));
  });

  it('escapes pieces in pills, and on phones keeps only slot numbers', () => {
    const o = at(1),
      best = surest(o)!,
      evil = encode('<b>'),
      slots = o.slots.map((s, i) => (i === best ? { ...s, tok: evil[0] } : s));
    const svg = draw({ ...o, slots });
    expect(svg).not.toContain('<b>');
    const phone = draw({ ...o, scale: 2 });
    expect(phone).toContain(`#${best + 1}<`);
    expect(phone).not.toContain(show(o.slots[best].tok).trim() + '”');
    expect(phone).not.toContain('PASS 1 OF');
  });

  it('turns the dial’s pointer with k', () => {
    const angles = KS.map(dialAngle);
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1]);
    expect(draw(at(1))).toContain(`data-angle="${dialAngle(4)}"`);
  });

  it('grows the typewriter’s paper with what it has typed', () => {
    expect(draw({ ...at(0), typed: 9 })).toContain('data-typed="9"');
    expect(frameLabel({ given: 16, slots: [], typed: 9 })).toContain('typed 9 tokens');
  });
});

describe('the fill strip', () => {
  it('has a cell per slot per pass, stamped cells in the pass they were stamped', () => {
    const s = fillStrip(f.passes, 16);
    expect(s.cells).toHaveLength(16 * f.passes.length);
    const rows = cellsOf(f.passes, 16);
    f.passes.forEach((pass, n) => {
      for (const i of pass.stamped) expect(rows[n][i].state).toBe('new');
    });
    expect(rows.at(-1)!.every(c => c.state !== 'mask')).toBe(true);
  });
});
