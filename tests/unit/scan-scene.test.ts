// The scanning table and the patch grid (U28): the grid has ⌈w/28⌉ × ⌈h/28⌉ cells, vision drops tiles and OCR a strip,
// the size range steps over the finite list and announces the count, and the text alternative names the size, the count
// and the recorded reading.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  MAX_LINES,
  SCAN_BOARD,
  scanLabel,
  scanScene,
  scanState,
  type ScanOpts,
} from '../../src/components/scenes/scanScene';
import { gridSvg, patchGrid } from '../../src/components/scenes/patchGrid';
import { MultimodalStage, PatchView, SizeRange, patchLabel } from '../../src/content/multimodal/kit';
import { SIZES, reading, sent } from '../../src/lib/multimodal/readings';
import { HIGH } from '../../src/lib/multimodal/patches';

const draw = (o: ScanOpts) =>
  renderToString(createElement(IsoStage, { board: SCAN_BOARD, scene: scanScene(o), label: scanLabel(o) }));

describe('the patch grid', () => {
  it('has ⌈w/28⌉ × ⌈h/28⌉ cells, padded to whole patches', () => {
    for (const [w, h] of [
      [1131, 1600],
      [309, 400],
      [200, 200],
      [1000, 1000],
    ]) {
      const g = patchGrid(w, h);
      expect([g.cols, g.rows]).toEqual([Math.ceil(w / 28), Math.ceil(h / 28)]);
      expect([g.xs.length + 1, g.ys.length + 1]).toEqual([g.cols, g.rows]);
      expect(g.pw).toBeGreaterThanOrEqual(w);
      expect(g.pw - w).toBeLessThan(28);
    }
  });

  it('a size past the cap is scaled down before it is cut', () => {
    const s = sent('invoice', 3200),
      g = patchGrid(s.w, s.h);
    expect(g.h).toBeLessThan(3200);
    expect(g.cols * g.rows).toBeLessThanOrEqual(HIGH.maxTokens);
    expect(gridSvg(g)).toContain(`width="${g.pw}"`);
  });
});

describe('the scanning table', () => {
  it('before a reading: the belt is empty, the camera idle', () => {
    const svg = draw({ image: 'invoice', size: 1600, method: null });
    expect(svg).toContain('data-tiles="0"');
    expect(svg).not.toContain('data-prop="strip"');
    expect(svg).toContain('NOT READ YET');
    expect(scanLabel({ image: 'invoice', size: 1600, method: null })).toContain('not been read yet');
  });

  it('vision drops tiles and names the image tokens; OCR sends a strip of text', () => {
    const v = draw({ image: 'invoice', size: 1600, method: 'vision' });
    expect(v).toContain('data-tiles="9"');
    expect(v).toContain(`${sent('invoice', 1600).count.tokens.toLocaleString('en-US')} IMAGE TOKENS`);
    const o = draw({ image: 'invoice', size: 1600, method: 'ocr' });
    expect(o).toContain('data-prop="strip"');
    expect(o).toContain('TEXT TOKENS');
  });

  it('the sheet’s grid is capped for the picture; the state keeps the real count', () => {
    const st = scanState({ image: 'invoice', size: 3200, method: 'vision' });
    expect(st.lines.cols).toBeLessThanOrEqual(MAX_LINES);
    expect(st.read.downscaled).toBe(true);
    expect(scanLabel({ image: 'invoice', size: 3200, method: 'vision' })).toContain('scaled down');
  });

  it('phones keep short pills', () => {
    const svg = draw({ image: 'invoice', size: 800, method: 'vision', scale: 2 });
    expect(svg).toContain('>INVOICE<');
    expect(svg).toContain('>TOKENS<');
  });
});

describe('the kit', () => {
  it('the size range steps over the finite list and announces the count', () => {
    const html = renderToString(createElement(SizeRange, { image: 'invoice', value: 1600, onChange: () => {} }));
    expect(html).toContain(`max="${SIZES.length - 1}"`);
    expect(html).toContain('value="3"');
    expect(html).toContain(
      `aria-valuetext="1,600 px, ${sent('invoice', 1600).count.tokens.toLocaleString('en-US')} image tokens"`,
    );
  });

  it('the Patches view’s text alternative names the size, the count and the recorded reading', () => {
    const t = patchLabel('invoice', 800, 'vision');
    expect(t).toContain('sent at 618 × 800 px');
    expect(t).toContain('image tokens');
    expect(t).toContain(reading('invoice', 800, 'vision').note);
    const html = renderToString(createElement(PatchView, { image: 'invoice', size: 800, method: 'vision' }));
    expect(html).toContain('role="img"');
    expect(html).toContain(`data-cells="${Math.ceil(618 / 28) * Math.ceil(800 / 28)}"`);
  });

  it('the stage escapes its caption', () => {
    const html = renderToString(
      createElement(MultimodalStage, { shown: { image: 'note', size: 1600, method: 'ocr', caption: '<b>x</b>' } }),
    );
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
