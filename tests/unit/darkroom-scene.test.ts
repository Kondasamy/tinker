// The darkroom and the denoise strip (U34): every named part is drawn and takes a callout, the dial's pointer follows
// the step count, phones keep pills to names, the strip has a frame per chosen step with its words, and the kit's
// ranges step over the finite lists.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  DARK_BOARD,
  DARKROOM_PARTS,
  darkroomLabel,
  darkroomScene,
  dialAngle,
  type DarkroomOpts,
} from '../../src/components/scenes/darkroomScene';
import { denoiseStrip, frameSteps } from '../../src/components/scenes/denoiseStrip';
import { DRAWINGS } from '../../src/lib/diffusion/drawings';
import { trajectory } from '../../src/lib/diffusion/ideal';
import { STEPS } from '../../src/lib/diffusion/schedule';
import { DiffusionStage, StepsRange } from '../../src/content/diffusion/kit';

const draw = (o: DarkroomOpts) =>
  renderToString(createElement(IsoStage, { board: DARK_BOARD, scene: darkroomScene(o), label: darkroomLabel(o) }));
const hinge = DRAWINGS[0].pixels;
const base: DarkroomOpts = {
  print: { kind: 'pixels', px: hinge, name: 'HINGE' },
  steps: 50,
  label: 'hinge',
  guidance: 2,
};
const calls = (svg: string) => svg.match(/class="callout"/g)?.length ?? 0;

describe('the darkroom', () => {
  it('draws every part it names, and takes one callout over each', () => {
    const svg = draw(base);
    for (const p of DARKROOM_PARTS) expect(svg).toContain(`data-part="${p}"`);
    for (const block of DARKROOM_PARTS) {
      const s = draw({ ...base, say: { block, text: 'Look here' } });
      expect(calls(s), block).toBe(1);
    }
    expect(calls(draw({ ...base, say: { block: 'nowhere', text: 'x' } }))).toBe(0);
  });

  it('the dial’s pointer follows the step count', () => {
    const angles = STEPS.map(dialAngle);
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1]);
    for (const s of STEPS) {
      const svg = draw({ ...base, steps: s });
      expect(svg).toContain(`data-steps="${s}"`);
      expect(svg).toContain(`data-angle="${dialAngle(s)}"`);
    }
  });

  it('prints pixels on the tray, or dots and training rings', () => {
    expect(draw(base)).toContain('data-print="pixels"');
    const svg = draw({
      ...base,
      print: {
        kind: 'points',
        pts: [
          [0, 0],
          [0.5, 0.5],
        ],
        train: [[0.2, 0.2]],
        name: 'DOTS',
      },
    });
    expect(svg).toContain('data-print="points"');
    expect(svg).toContain('data-dots="2"');
    expect(svg).toContain('data-rings="1"');
    expect(draw({ ...base, print: undefined })).toContain('data-print="none"');
  });

  it('on phones the pills keep names only; the words carry the numbers', () => {
    const pills = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]).join(' ');
    const phone = pills(draw({ ...base, scale: 2, done: 12 }));
    expect(phone).not.toMatch(/\d/);
    expect(pills(draw({ ...base, done: 12 }))).toMatch(/12/);
    expect(darkroomLabel({ ...base, done: 12 })).toMatch(/12 of 50/);
  });

  it('escapes the names it is given', () => {
    expect(draw({ ...base, print: { kind: 'pixels', px: hinge, name: '<b>' } })).not.toContain('<b>');
  });
});

describe('the denoise strip', () => {
  it('picks at most six frames, from the noise to the last step', () => {
    expect(frameSteps(50)).toEqual([0, 10, 20, 30, 40, 50]);
    expect(frameSteps(2)).toEqual([0, 1, 2]);
    expect(frameSteps(1)).toEqual([0, 1]);
  });

  it('has a frame per chosen step, each with its words', () => {
    const t = trajectory(10, 1);
    const s = denoiseStrip(
      frameSteps(10).map(i => ({
        print: { kind: 'pixels' as const, px: t[i], name: '' },
        pill: `STEP ${i}`,
        words: `w${i}`,
      })),
    );
    expect(s.frames).toHaveLength(frameSteps(10).length);
    expect(s.frames.map(f => f.words)).toEqual(frameSteps(10).map(i => `w${i}`));
    expect(s.svg).toContain('STEP 10');
    const phone = denoiseStrip(
      [0, 1, 2, 3].map(i => ({ print: { kind: 'pixels' as const, px: t[i], name: '' }, pill: `${i}`, words: '' })),
      true,
    );
    expect(phone.w).toBeLessThan(s.w);
  });
});

describe('the kit', () => {
  it('the steps range steps over the finite list and names the count', () => {
    const html = renderToString(createElement(StepsRange, { value: 10, onChange: () => {} }));
    expect(html).toContain(`max="${STEPS.length - 1}"`);
    expect(html).toContain(`value="${STEPS.indexOf(10)}"`);
    expect(html).toContain('aria-valuetext="10 steps"');
  });

  it('the stage escapes its caption', () => {
    const html = renderToString(createElement(DiffusionStage, { shown: { ...base, caption: '<b>x</b>' } }));
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
