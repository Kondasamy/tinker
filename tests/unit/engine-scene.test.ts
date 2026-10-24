// Transformers' picture and precise view (U9): the engine room's threads, the heatmap and bar, escaping, the stage's
// loading and error states, and the prompt box's count.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { PROMPTS, trace } from '../../src/lib/transformers/trace';
import {
  ENGINE_BOARD,
  ENGINE_PARTS,
  THREAD_FLOOR,
  engineLabel,
  engineScene,
  engineState,
  type EngineOpts,
} from '../../src/components/scenes/engineScene';
import { attentionMap, probBar } from '../../src/components/scenes/attentionMap';
import { CTX, PromptInput, TransformersStage, modelStore, whenLoaded } from '../../src/content/transformers/kit';

const bin = readFileSync('public/data/lm/model.bin'),
  metaText = readFileSync('public/data/lm/meta.json');
const meta = JSON.parse(metaText.toString('utf8')) as Meta;
const model = parseModel(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer);
const buf = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const files: Record<string, ArrayBuffer> = { 'meta.json': buf(metaText), 'model.bin': buf(bin) };

const draw = (o: EngineOpts) =>
  renderToString(createElement(IsoStage, { board: ENGINE_BOARD, scene: engineScene(o), label: engineLabel(o) }));
const optsOf = (prompt: string, layer = 0, head = 0): EngineOpts => {
  const t = trace(model, prompt);
  return { tokens: t.tokens.map(x => x.text), attention: t.attention, layer, head };
};
const threads = (svg: string) =>
  [...svg.matchAll(/class="thread"[^>]*data-w="([\d.]+)"[^>]*stroke-opacity="([\d.]+)"/g)].map(m => ({
    w: +m[1],
    opacity: +m[2],
  }));
const LONG = PROMPTS.find(p => p.id === 'long')!.text;

describe('the heatmap', () => {
  it('has n × n cells, zero above the diagonal', () => {
    const t = trace(model, LONG),
      n = t.tokens.length;
    const { svg } = attentionMap({ tokens: t.tokens.map(x => x.text), weights: t.attention[0][0] });
    const cells = [...svg.matchAll(/role="gridcell"[^>]*data-q="(\d+)" data-k="(\d+)" data-w="([\d.]+)"/g)];
    expect(cells).toHaveLength(n * n);
    for (const [, q, k, w] of cells) if (+k > +q) expect(+w).toBe(0);
    // one cell takes Tab, and each is named as the stage reads it out
    expect(svg.split('tabindex="0"').length - 1).toBe(1);
    expect(svg).toMatch(/aria-label="token \d+ looks at token \d+: \d\.\d\d"/);
  });
  it('phones show token numbers and keep cells big enough to read, so a long prompt scrolls', () => {
    const t = trace(model, LONG),
      tokens = t.tokens.map(x => x.text);
    const wide = attentionMap({ tokens, weights: t.attention[0][0] }),
      phone = attentionMap({ tokens, weights: t.attention[0][0], phone: true });
    expect(phone.w).toBeGreaterThan(300);
    expect(wide.svg).toContain('␣'); // wide labels print the pieces
    expect(phone.svg).not.toContain('␣');
  });
});

describe('the threads', () => {
  it('opacity follows the attention weight', () => {
    for (const p of PROMPTS)
      for (const [l, h] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ]) {
        const drawn = threads(draw(optsOf(p.text, l, h))).sort((a, b) => a.w - b.w);
        expect(drawn.length).toBeGreaterThan(0);
        for (let i = 1; i < drawn.length; i++) expect(drawn[i].opacity).toBeGreaterThanOrEqual(drawn[i - 1].opacity);
      }
  });
  it('weights below the floor draw no thread', () => {
    const row = [0.01, THREAD_FLOOR - 0.001, THREAD_FLOOR, 1 - 0.011 - THREAD_FLOOR];
    const attention = [[[[1, 0, 0, 0], [0.5, 0.5, 0, 0], [0.2, 0.3, 0.5, 0], row]]];
    const o: EngineOpts = { tokens: ['a', 'b', 'c', 'd'], attention };
    expect(engineState(o).threads.map(t => t.to)).toEqual([3, 2]);
    const svg = draw(o);
    expect(threads(svg)).toHaveLength(2);
    expect(svg).toContain('data-from="3" data-to="2"');
    expect(svg).not.toContain('data-to="0"');
  });
  it('the lit desk is the head shown, and the threads are its own', () => {
    const svg = draw(optsOf(LONG, 1, 1));
    expect(svg.split('data-lit="1"').length - 1).toBe(1);
    expect(svg).toContain('data-desk="1-1" data-lit="1"');
    expect(svg).toContain('data-head="1-1"');
  });
});

describe('escaping', () => {
  const bad = '<script>alert(1)</script>';
  it('holds for prompt text in the picture, the heatmap and the bar', () => {
    const tokens = [bad, '"><img src=x onerror=alert(1)>', ' ok'];
    const attention = [
      [
        [
          [1, 0, 0],
          [0.5, 0.5, 0],
          [0.4, 0.3, 0.3],
        ],
      ],
    ];
    const out = [
      draw({ tokens, attention, query: 0 }),
      draw({ tokens, attention }),
      draw({ tokens, attention, scale: 1.8 }),
      attentionMap({ tokens, weights: attention[0][0] }).svg,
      probBar(tokens.map(text => ({ text, p: 0.3 }))).svg,
    ];
    for (const s of out) {
      expect(s).not.toContain('<script');
      expect(s).not.toContain('<img');
    }
    expect(out[0]).toContain('&lt;script&gt;');
    expect(out[4]).toContain('&lt;script&gt;');
  });
  it('holds for a typed prompt run through the model and the stage', async () => {
    const store = modelStore(async f => files[f]);
    store.start();
    await new Promise(r => setTimeout(r, 0));
    const html = renderToString(createElement(TransformersStage, { prompt: `Hello ${bad}`, store }));
    expect(html).not.toContain('<script');
    expect(draw(optsOf(`Hello ${bad}`))).not.toContain('<script');
    expect(renderToString(createElement(PromptInput, { value: bad, onChange: () => {} }))).not.toContain('<script');
  });
});

describe('the stage while Larkspur mini loads', () => {
  const pass = () => true;
  it('loading: a pill, the frame kept, and no step advances', () => {
    const store = modelStore(() => new Promise<ArrayBuffer>(() => {}));
    store.start();
    expect(whenLoaded(pass, store)({})).toBe(false);
    const html = renderToString(createElement(TransformersStage, { prompt: PROMPTS[0].text, store }));
    expect(html).toContain('Loading Larkspur mini');
    expect(html).toContain('data-model="loading"');
    expect(html).toContain('data-tile="0"'); // the drawing keeps the frame, with the prompt's tiles
  });
  it('error: Retry, still no step advance; a retry that loads lets it advance', async () => {
    let fail = true;
    const store = modelStore(async f => {
      if (fail) throw new Error('offline');
      return files[f];
    });
    store.start();
    await new Promise(r => setTimeout(r, 0));
    expect(store.snapshot().failed).toBe(true);
    expect(whenLoaded(pass, store)({})).toBe(false);
    const html = renderToString(createElement(TransformersStage, { prompt: PROMPTS[0].text, store }));
    expect(html).toContain('Retry');
    expect(html).toContain('data-model="failed"');
    fail = false;
    store.retry();
    await new Promise(r => setTimeout(r, 0));
    expect(whenLoaded(pass, store)({})).toBe(true);
    expect(renderToString(createElement(TransformersStage, { prompt: PROMPTS[0].text, store }))).not.toContain(
      'Loading Larkspur mini',
    );
  });
});

describe('an empty prompt', () => {
  it('draws no NaN anywhere', async () => {
    const o = optsOf('');
    expect(o.tokens).toEqual([]);
    for (const s of [
      draw(o),
      draw({ tokens: [] }),
      draw({ ...o, scale: 1.8 }),
      attentionMap({ tokens: [], weights: [] }).svg,
      probBar([]).svg,
    ])
      expect(s).not.toContain('NaN');
    expect(engineLabel(o)).toContain('No tokens yet');
    const store = modelStore(async f => files[f]);
    store.start();
    await new Promise(r => setTimeout(r, 0));
    expect(renderToString(createElement(TransformersStage, { prompt: '', store }))).not.toContain('NaN');
  });
});

describe('the prompt box', () => {
  it('counts N of 32 tokens and strikes the pieces past the context', () => {
    expect(CTX).toBe(meta.model.ctx);
    const text = `${LONG} ${LONG}`,
      t = trace(model, text);
    expect(t.truncated).toBe(true);
    expect(t.tokens).toHaveLength(CTX);
    const html = renderToString(createElement(PromptInput, { value: text, onChange: () => {} }));
    const struck = html.split('<s>').length - 1;
    expect(html).toContain(`${CTX + struck} of ${CTX} tokens`);
    expect(struck).toBeGreaterThan(0);
  });
});

describe('engine room callouts', () => {
  const base: EngineOpts = optsOf(LONG);
  const calls = (svg: string) => svg.match(/class="callout"/g)?.length ?? 0;
  it('draws one callout over each named part, with its text', () => {
    for (const block of ENGINE_PARTS) {
      const svg = draw({ ...base, say: { block, text: 'Look here' } });
      expect(calls(svg), block).toBe(1);
      expect(svg).toMatch(/class="callout"[\s\S]*Look here/);
    }
  });
  it('draws none for a part it does not have, and nothing changes without one', () => {
    expect(calls(draw({ ...base, say: { block: 'nowhere', text: 'Look here' } }))).toBe(0);
    expect(draw({ ...base, say: undefined })).toBe(draw(base));
    expect(calls(draw(base))).toBe(0);
  });
  it('on phones drops a callout over 16 characters and keeps a shorter one', () => {
    const phone = (text: string) => calls(draw({ ...base, scale: 1.8, say: { block: ENGINE_PARTS[0], text } }));
    expect(phone('x'.repeat(17))).toBe(0);
    expect(phone('x'.repeat(16))).toBe(1);
  });
});
