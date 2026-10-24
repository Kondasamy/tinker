import { afterAll, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  TRAIN_BOARD,
  TRAIN_PARTS,
  trainLabel,
  trainScene,
  trainState,
  type TrainOpts,
} from '../../src/components/scenes/trainScene';
import { chartLabel, lossChart, runSeries, stepWords } from '../../src/components/scenes/lossChart';
import { evalGrid } from '../../src/components/scenes/evalGrid';
import {
  FineTuneStage,
  LossChart,
  loadModel,
  META,
  modelNow,
  questionText,
  setModelFiles,
  versionCols,
  type Shown,
} from '../../src/content/fine-tuning/kit';
import { ALL_QUESTIONS, VERSION_IDS } from '../../src/lib/fine-tuning/engine';
import { fetchLoader } from '../../src/lib/rag/load';
import type { Meta } from '../../src/lib/lm/load';

const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const disk = async (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const draw = (o: TrainOpts) =>
  renderToString(createElement(IsoStage, { board: TRAIN_BOARD, scene: trainScene(o), label: trainLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
afterAll(() => setModelFiles(fetchLoader('/data/lm/')));

describe('the training bench', () => {
  it('the chosen lever is pulled and lit; the others stay at rest', () => {
    for (const lit of ['prompt', 'documents', 'weights'] as const) {
      const svg = draw({ lit });
      expect(svg).toContain(`data-lever="${lit}" data-on="1"`);
      expect(count(svg, 'data-on="1"')).toBe(1);
      expect(count(svg, 'data-on="0"')).toBe(2);
    }
    expect(count(draw({}), 'data-on="0"')).toBe(3);
    expect(trainLabel({})).toContain('No lever is pulled');
  });
  it('the adapter clips on for LoRA only', () => {
    expect(draw({ weights: 'lora' })).toContain('class="adapter"');
    expect(draw({ weights: 'lora' })).toContain('LORA ADAPTER');
    expect(draw({ weights: 'finetuned' })).not.toContain('class="adapter"');
    expect(trainState({ weights: 'lora' })).toMatchObject({ adapter: true, model: 'BASE + ADAPTER' });
  });
  it('phones keep only the lit lever’s pill', () => {
    const svg = draw({ lit: 'documents', scale: 2.2 });
    expect(svg).toContain('DOCUMENTS');
    expect(svg).not.toContain('>PROMPT<');
    expect(svg).not.toMatch(/NaN|Infinity/);
  });
});

describe('the loss chart', () => {
  it('its points equal meta.json’s curve, with axis pills', () => {
    for (const run of [meta.finetune!, meta.lora!]) {
      const { svg, steps } = lossChart({ series: runSeries(run) });
      for (const p of run.lossCurve) {
        expect(svg).toContain(`data-step="${p.step}" data-loss="${p.train}"`);
        expect(svg).toContain(`data-step="${p.step}" data-loss="${p.heldout}"`);
      }
      expect(count(svg, 'class="pt"')).toBe(run.lossCurve.length * 2);
      expect(steps.map(s => s.step)).toEqual(run.lossCurve.map(p => p.step));
      for (const x of ['>LOSS<', '>STEP<', '>0<', `>${run.lossCurve[0].step}<`, `>${run.lossCurve.at(-1)!.step}<`])
        expect(svg).toContain(x);
    }
    expect(META.finetune!.lossCurve).toEqual(meta.finetune!.lossCurve); // the kit's build-time copy is the file
  });
  it('a step reads out every series’ loss there', () => {
    const p = meta.finetune!.lossCurve[2],
      { steps } = lossChart({ series: runSeries(meta.finetune!) });
    expect(stepWords(steps[2])).toBe(
      `Step ${p.step}: training loss ${p.train.toFixed(2)}, held-out loss ${p.heldout.toFixed(2)}`,
    );
  });
  it('an empty curve draws the axes only, no NaN', () => {
    for (const series of [[], [{ id: 'train', label: 'Training', points: [] }]]) {
      const { svg, steps } = lossChart({ series });
      expect(svg).toContain('class="axes"');
      expect(svg).toContain('>LOSS<');
      expect(svg).not.toContain('class="pt"');
      expect(svg).not.toMatch(/NaN|Infinity|undefined/);
      expect(steps).toEqual([]);
    }
    expect(chartLabel([])).toBe('Loss chart: no steps recorded yet.');
    expect(renderToString(createElement(LossChart, { series: [] }))).toContain('No steps recorded yet.');
    expect(lossChart({ series: [{ id: 'a', label: 'A', points: [{ step: 5, loss: 2 }] }] }).svg).not.toMatch(
      /NaN|Infinity/,
    );
  });
  it('the stage’s chart has a focusable marker per step and a read-out line', () => {
    const html = renderToString(createElement(LossChart, { series: runSeries(meta.lora!) }));
    expect(count(html, 'class="ft-mark"')).toBe(meta.lora!.lossCurve.length);
    expect(count(html, 'tabindex="0"')).toBe(1); // one tab stop; arrow keys move along
    expect(html).toContain('aria-live="polite"');
  });
});

describe('the Results grid', () => {
  it('one cell per version × question', () => {
    const cols = versionCols(VERSION_IDS, ALL_QUESTIONS),
      { svg } = evalGrid({ questions: ALL_QUESTIONS.map(questionText), cols });
    expect(count(svg, 'class="cell"')).toBe(VERSION_IDS.length * ALL_QUESTIONS.length);
  });
});

describe('escaping', () => {
  const evil = '<script>alert(1)</script>';
  it('series names and captions never become markup', () => {
    expect(
      lossChart({
        series: [
          {
            id: evil,
            label: evil,
            points: [
              { step: 0, loss: 1 },
              { step: 1, loss: 0.5 },
            ],
          },
        ],
      }).svg,
    ).not.toContain('<script');
    const show = (): Shown => ({
      scene: { lit: 'prompt' },
      caption: evil,
      results: { series: [{ id: 'x', label: evil, points: [{ step: 0, loss: 1 }] }] },
    });
    const html = renderToString(createElement(FineTuneStage, { show }));
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
    const chart = renderToString(
      createElement(LossChart, { series: [{ id: 'x', label: evil, points: [{ step: 0, loss: 1 }] }] }),
    );
    expect(chart).not.toContain('<script');
    expect(draw({ lit: 'prompt' })).not.toContain('<script');
  });
});

describe('a stage that needs the model', () => {
  const show = (): Shown => ({ scene: { lit: 'weights', weights: 'lora' }, caption: 'tuned' });
  it('holds its frame with a loading pill until the weights are in; predicates see no model', () => {
    setModelFiles(disk);
    expect(modelNow('lora')).toBeUndefined();
    const html = renderToString(createElement(FineTuneStage, { show, weights: 'lora' }));
    expect(html).toContain('Loading Larkspur mini');
    expect(html).toContain('class="tc-frame"');
    expect(html).not.toContain('tuned');
  });
  it('a failed load shows an error card with Retry; Retry loads it', async () => {
    let fail = true;
    setModelFiles(async f => {
      if (fail) throw new Error('offline');
      return disk(f);
    });
    await expect(loadModel('lora')).rejects.toThrow('offline');
    const html = renderToString(createElement(FineTuneStage, { show, weights: 'lora' }));
    expect(html).toContain('Couldn’t load Larkspur mini');
    expect(html).toContain('Retry');
    fail = false;
    await loadModel('lora');
    expect(modelNow('lora')?.adapter).toBeTruthy();
    expect(renderToString(createElement(FineTuneStage, { show, weights: 'lora' }))).toContain('tuned');
  });
});

describe('a step callout on the training bench', () => {
  const BASE: TrainOpts = { lit: 'weights', weights: 'lora' };
  const calls = (svg: string) => count(svg, 'class="callout"');
  it('draws one lit pill over each named part', () => {
    for (const block of TRAIN_PARTS) {
      const svg = draw({ ...BASE, say: { block, text: 'LOOK HERE' } });
      expect(calls(svg)).toBe(1);
      expect(svg).toContain('LOOK HERE');
    }
  });
  it('draws none for an unknown part, and nothing changes without one', () => {
    expect(calls(draw({ ...BASE, say: { block: 'nowhere', text: 'LOOK HERE' } }))).toBe(0);
    expect(draw({ ...BASE, say: undefined })).toBe(draw(BASE));
  });
  it('on phones drops a callout over 16 characters', () => {
    const block = TRAIN_PARTS[0];
    expect(calls(draw({ ...BASE, scale: 2, say: { block, text: 'SIXTEEN CHARS OK' } }))).toBe(1);
    expect(calls(draw({ ...BASE, scale: 2, say: { block, text: 'SEVENTEEN CHARS X' } }))).toBe(0);
  });
});
