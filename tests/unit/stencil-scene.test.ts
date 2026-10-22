import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  STENCIL_BOARD,
  stencilLabel,
  stencilScene,
  stencilState,
  type StencilOpts,
} from '../../src/components/scenes/stencilScene';
import { maskGrid } from '../../src/components/scenes/maskGrid';
import { MaskView, StructuredStage, stencilAt } from '../../src/content/structured-outputs/kit';
import { modelStore } from '../../src/content/transformers/kit';
import { play, run } from '../../src/lib/structured-outputs/prompts';
import { VOCAB_SIZE } from '../../src/lib/lm/bpe';
import { diskModel } from '../../src/lib/transformers/diskModel';

const draw = (o: StencilOpts) =>
  renderToString(createElement(IsoStage, { board: STENCIL_BOARD, scene: stencilScene(o), label: stencilLabel(o) }));
const count = (html: string, s: string) => html.split(s).length - 1;
const model = diskModel();

describe('the stencil press', () => {
  it('escapes every string: a token piece or a prompt with < renders as text', () => {
    const o: StencilOpts = { prompt: '<script>x</script>', written: ['{', '<b>'], allowed: 3, blocked: '<i>' };
    for (const html of [draw(o), draw({ ...o, scale: 1.8 })]) expect(html).not.toMatch(/<script|<b>|<i>/);
    expect(draw(o)).toContain('&lt;b&gt;');
    expect(draw(o)).toContain('BLOCKED · &lt;i&gt;');
  });

  it('has a plate only with a schema, and a stopped tile only when the model’s choice is blocked', () => {
    const base: StencilOpts = { prompt: 'Where is order 1042?', written: ['{'], allowed: 1 };
    expect(draw({ ...base, allowed: null })).not.toContain('data-prop="plate"');
    expect(draw(base)).toContain('data-prop="plate"');
    expect(draw(base)).toContain('SCHEMA · 1 OF 768 PASS');
    expect(count(draw(base), 'class="tile blocked"')).toBe(0);
    expect(count(draw({ ...base, blocked: 's' }), 'class="tile blocked"')).toBe(1);
    expect(stencilState({ ...base, blocked: 's', done: true }).blocked).toBe(false);
  });

  it('draws at most nine written tiles and no NaN', () => {
    const many = Array.from({ length: 14 }, () => 'a');
    expect(count(draw({ prompt: 'p', written: many, allowed: 2 }), 'class="tile"')).toBe(9);
    expect(draw({ prompt: '', written: [], allowed: null })).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('follows a pinned run: the model’s blocked first choice shows at the step it was blocked', () => {
    const { decoded } = play(model, run('mask'));
    const i = decoded.steps.findIndex(s => !s.allowed.includes(s.free.id));
    expect(i).toBeGreaterThanOrEqual(0);
    const o = stencilAt('Where is order 1042?', decoded, i, true);
    expect(o.blocked).toBe(decoded.steps[i].free.text);
    expect(o.allowed).toBe(decoded.steps[i].allowed.length);
    expect(stencilAt('x', decoded, 99, true).done).toBe(true);
  });
});

describe('the mask grid', () => {
  it('draws one tile per token, the allowed ones lit', () => {
    const svg = maskGrid({ vocab: VOCAB_SIZE, allowed: [1, 2, 3], pick: 2, free: 9 }).svg;
    expect(count(svg, 'data-id=')).toBe(VOCAB_SIZE);
    expect(count(svg, 'data-allowed="1"')).toBe(3);
    expect(svg).toContain('data-free="9"');
    expect(maskGrid({ vocab: VOCAB_SIZE, allowed: [9], free: 9 }).svg).not.toContain('data-free');
  });

  it('lists the likeliest allowed tokens, one focusable at a time, with a read-out naming token and probability', () => {
    const { decoded } = play(model, run('note'));
    const at = decoded.steps.findIndex(s => s.allowed.length > 100);
    const html = renderToString(createElement(MaskView, { d: decoded, at }));
    expect(count(html, '<li')).toBe(decoded.steps[at].top.length);
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(html).toMatch(/aria-live="polite">“[^”]*”: (\d+%|&gt;99%|&lt;1%)/);
  });
});

describe('the stage', () => {
  it('while Larkspur mini loads: a loading pill, the Mask tab off', () => {
    const loading = modelStore(() => new Promise<ArrayBuffer>(() => {}));
    loading.start();
    const html = renderToString(
      createElement(StructuredStage, { prompt: 'Where is order 1042?', d: null, at: 0, store: loading }),
    );
    expect(html).toContain('Loading Larkspur mini');
    expect(html).toContain('data-model="loading"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Mask<\/button>/);
  });

  it('after a failed load: Retry', async () => {
    const failed = modelStore(async () => {
      throw new Error('offline');
    });
    failed.start();
    await new Promise(r => setTimeout(r, 0));
    const html = renderToString(
      createElement(StructuredStage, { prompt: 'Where is order 1042?', d: null, at: 0, store: failed }),
    );
    expect(html).toContain('Retry');
    expect(html).toContain('data-model="failed"');
  });
});
