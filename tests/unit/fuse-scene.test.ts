// The fuse box, the lens grid and the Interpretability stage (U14).
import { afterAll, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  FUSE_BOARD,
  FUSE_PARTS,
  fuseLabel,
  fuseScene,
  fuseState,
  type FuseOpts,
} from '../../src/components/scenes/fuseScene';
import { lensCellName, lensGrid } from '../../src/components/scenes/lensGrid';
import { forward } from '../../src/lib/lm/model';
import { decode, encode } from '../../src/lib/lm/bpe';
import { diskModel } from '../../src/lib/transformers/diskModel';
import { STAGES } from '../../src/lib/interpretability/probe';
import { InterpStage, LensView } from '../../src/content/interpretability/kit';
import { loadModel, setModelFiles } from '../../src/content/fine-tuning/kit';
import { fetchLoader } from '../../src/lib/rag/load';

const disk = async (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const m = diskModel();
const TEXT = 'Candidates receive an answer within ten';
const out = forward(m, encode(TEXT));
const BASE: FuseOpts = { tokens: out.ids.map(i => decode([i])), attention: out.attention, threads: true };
const draw = (o: FuseOpts) =>
  renderToString(createElement(IsoStage, { board: FUSE_BOARD, scene: fuseScene(o), label: fuseLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
afterAll(() => setModelFiles(fetchLoader('/data/lm/')));

describe('the fuse box', () => {
  it('draws six fuses, all in, and the engine room’s lit desk and threads', () => {
    const svg = draw(BASE);
    expect(count(svg, 'data-fuse="')).toBe(6);
    expect(svg).not.toContain('data-pulled');
    expect(svg).toContain('data-desk="0-0" data-lit="1"');
    expect(count(svg, 'class="thread"')).toBeGreaterThan(0);
    expect(svg).toContain('FUSES · 6 IN');
  });

  it('a pulled fuse renders dark and out of its slot, and its head’s desk is unlit with no threads', () => {
    const o = { ...BASE, pulled: ['h0-0' as const] };
    expect(fuseState(o)).toEqual({ pulled: ['h0-0'], shownPulled: true });
    const svg = draw(o);
    expect(svg).toContain('data-fuse="h0-0" data-pulled="1"');
    expect(svg).not.toContain('data-lit="1"');
    expect(count(svg, 'class="thread"')).toBe(0);
    expect(svg).toContain('OUT: LAYER 1, HEAD 1');
    expect(fuseLabel(o)).toContain('Layer 1, head 1 is pulled out and dark');
    expect(fuseLabel(o)).toContain('no desk is lit');
  });

  it('pulling an MLP leaves the lit desk alone', () => {
    const svg = draw({ ...BASE, pulled: ['mlp1'] });
    expect(svg).toContain('data-fuse="mlp1" data-pulled="1"');
    expect(svg).toContain('data-lit="1"');
  });

  it('on phones the readout pills shorten to names', () => {
    const svg = draw({ ...BASE, pulled: ['h0-0'], scale: 1.8 });
    expect(svg).toContain('>FUSES<');
    expect(svg).not.toContain('OUT:');
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('draws one callout over every part it names, engine parts included', () => {
    for (const block of FUSE_PARTS) {
      const svg = draw({ ...BASE, layer: 1, head: 1, pulled: ['h0-1'], say: { block, text: 'LOOK HERE' } });
      expect(count(svg, 'class="callout"'), block).toBe(1);
    }
    expect(count(draw({ ...BASE, say: { block: 'nowhere', text: 'LOOK HERE' } }), 'class="callout"')).toBe(0);
  });

  it('escapes the pieces it names', () => {
    const svg = draw({ tokens: ['<b>', 'x'], pulled: [] });
    expect(svg).not.toContain('<b>');
  });
});

describe('the lens grid', () => {
  const guesses = [
    [
      { text: ' ten', p: 0.3 },
      { text: ' days', p: 0.1 },
    ],
    [{ text: ' business', p: 0.5 }],
    [{ text: ' business', p: 0.6 }],
  ];
  it('one row per stage, one tab stop, the watched token marked', () => {
    const { svg } = lensGrid({ stages: STAGES, guesses, watch: ' business' });
    expect(count(svg, 'role="row"')).toBe(3);
    expect(count(svg, 'role="gridcell"')).toBe(4);
    expect(count(svg, 'tabindex="0"')).toBe(1);
    expect(count(svg, 'data-watch="1"')).toBe(2);
    expect(svg).toContain(lensCellName('Output', 0, guesses[2][0]));
  });
  it('the tab stop follows the active cell (the stage moves it with the arrow keys)', () => {
    const { svg } = lensGrid({ stages: STAGES, guesses, active: [0, 1] });
    expect(svg).toMatch(/tabindex="0" aria-label="After the embedding, guess 2/);
    expect(lensGrid({ stages: STAGES, guesses: [[], [], []] }).svg).toContain('NOTHING TO READ YET');
  });
  it('escapes pieces', () => {
    expect(lensGrid({ stages: STAGES, guesses: [[{ text: '<i>', p: 1 }], [], []] }).svg).not.toContain('<i>');
  });
  it('the Lens view reads the live model: a range over positions, one tab stop, a read-out', () => {
    const html = renderToString(createElement(LensView, { model: m, prompt: TEXT }));
    expect(html).toContain('type="range"');
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Output, guess 1');
  });
});

describe('the stage', () => {
  it('holds its frame with a loading pill and the Lens tab off while the model loads; a failed load shows Retry', async () => {
    setModelFiles(async () => {
      throw new Error('offline');
    });
    const html = renderToString(createElement(InterpStage, { prompt: TEXT }));
    expect(html).toContain('Loading Larkspur mini');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Lens<\/button>/);
    await expect(loadModel('base')).rejects.toThrow('offline');
    expect(renderToString(createElement(InterpStage, { prompt: TEXT }))).toContain('Retry');
  });
  it('once loaded draws the fuse box and turns the Lens tab on', async () => {
    setModelFiles(disk);
    await loadModel('base');
    const html = renderToString(createElement(InterpStage, { prompt: TEXT, pulled: ['h0-0'] }));
    expect(html).toContain('data-pulled="1"');
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Lens<\/button>/);
  });
});
