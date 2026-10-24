// The foundry and the pre-training stage (U6): every callout part drawn, the lit shelf slot follows the checkpoint,
// pills escaped, phones keep only the lit checkpoint's pill, and the stage holds its frame while a checkpoint loads
// (a failed one shows Retry).
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  FORGE_BOARD,
  FORGE_PARTS,
  forgeLabel,
  forgePlot,
  forgeScene,
  forgeState,
  type ForgeOpts,
} from '../../src/components/scenes/forgeScene';
import { STEPS } from '../../src/lib/pre-training/engine';
import { PreTrainingStage, ScalingView, loadCkpt, setCkptFiles } from '../../src/content/pre-training/kit';

const draw = (o: ForgeOpts) =>
  renderToString(createElement(IsoStage, { board: FORGE_BOARD, scene: forgeScene(o), label: forgeLabel(o) }));
const at = (step: number | null, more: Partial<ForgeOpts> = {}): ForgeOpts => ({ steps: STEPS, step, ...more });

describe('the foundry', () => {
  it('draws every part a callout may name', () => {
    for (const p of FORGE_PARTS) {
      const svg = draw(at(1000, { say: { block: p, text: `On ${p}` } }));
      expect(svg).toContain(`On ${p}`);
    }
    const svg = draw(at(1000));
    for (const c of ['class="crate"', 'class="furnace"', 'class="model"', 'class="shelf"']) expect(svg).toContain(c);
  });

  it('lights the shelf slot of the chosen checkpoint, with the ones before it saved', () => {
    const st = forgeState(at(500));
    expect(st.slots.filter(s => s.lit).map(s => s.step)).toEqual([500]);
    expect(st.slots.filter(s => s.saved).map(s => s.step)).toEqual(STEPS.filter(s => s <= 500));
    const svg = draw(at(500));
    expect(svg).toContain('data-step="500" data-lit="1"');
    expect(svg).toContain('STEP 500');
    expect(forgeLabel(at(500))).toContain('step 500 lit');
  });

  it('is cold with nothing saved before training, and grows to full at the last step', () => {
    expect(forgeState(at(null)).burning).toBe(false);
    expect(forgeState(at(0)).burning).toBe(false);
    expect(forgeState(at(3000)).grown).toBe(1);
    expect(draw(at(null))).toContain('NO CHECKPOINT');
  });

  it('shows the data mix in its crates', () => {
    expect(forgeState(at(3000, { mix: 'half' })).crates).toBe(2);
    expect(draw(at(3000, { mix: 'duplicated' }))).toContain('ONE DOC ×10');
    expect(forgeLabel(at(3000, { mix: 'leaked' }))).toContain('test questions');
  });

  it('escapes callout text', () => {
    expect(draw(at(100, { say: { block: 'model', text: '<b>x' } }))).toContain('&lt;b&gt;x');
  });

  it('on phones only the lit checkpoint keeps its pill', () => {
    const svg = draw(at(1000, { scale: 2.2 }));
    expect(svg).toContain('STEP 1000');
    for (const t of ['ALL DOCUMENTS', 'TRAINING', 'LARKSPUR MINI']) expect(svg).not.toContain(t);
  });

  it('draws a hero plot', () => {
    expect(forgePlot(40, 40, null as never)).toContain('<path');
  });
});

describe('the stage', () => {
  const show = () => ({ scene: { step: 100 }, caption: 'Step 100' });

  it('holds its frame with a loading pill until the checkpoint is in', () => {
    setCkptFiles(() => new Promise(() => {}));
    const html = renderToString(createElement(PreTrainingStage, { show, step: 100 }));
    expect(html).toContain('Loading step 100');
    expect(html).toContain('class="tc-frame"');
  });

  it('a failed fetch shows Retry; a loaded checkpoint shows the foundry', async () => {
    setCkptFiles(async f => {
      throw new Error(`404 ${f}`);
    });
    await loadCkpt(100).catch(() => {});
    expect(renderToString(createElement(PreTrainingStage, { show, step: 100 }))).toContain('Retry');
    setCkptFiles(async f => {
      const b = readFileSync(`public/data/pre-training/${f}`);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    });
    await loadCkpt(100);
    const html = renderToString(createElement(PreTrainingStage, { show, step: 100 }));
    expect(html).toContain('STEP 100');
    expect(html).not.toContain('Retry');
  });

  it('the scaling view sets the fits apart from Larkspur mini’s own runs', () => {
    const html = renderToString(createElement(ScalingView, { budget: 10 }));
    expect(html).toContain('Kaplan et al. (2020)');
    expect(html).toContain('not on the chart above');
    expect(html).toContain('data-run="half"');
  });
});
