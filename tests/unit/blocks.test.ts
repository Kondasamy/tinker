// RAG blocks with their own silhouettes (U4): every block draws from all four turns, keeps the height and pill anchor it
// had as a box, and every model in every scene is the one model machine (data-kit="model").
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { withFrame } from '../../src/lib/iso/core.js';
import IsoStage from '../../src/lib/iso/IsoStage';
import { BLOCKS, BLOCK_TYPES, STATE_COL, blockTag, renderers, type BlockType } from '../../src/lib/iso/blocks';
import { FORGE_BOARD, forgeScene } from '../../src/components/scenes/forgeScene';
import { SERVE_BOARD, serveScene } from '../../src/components/scenes/serveScene';
import { ROUTER_BOARD, routerScene } from '../../src/components/scenes/routerScene';
import { helperDesk } from '../../src/components/scenes/agentScene';
import { HERO_BOARD, HOME_HERO } from '../../src/components/scenes/heroScene';
import { STEPS } from '../../src/lib/pre-training/engine';

// captured from the box blocks before the rework: [ht, labelZ, per view 0–3 the pill's anchor dot (cx, cy) and its
// text (x, y)] for a block at (30, 10)
const BEFORE: Record<BlockType, [number, number | null, number[][]]> = {
  docs: [
    18,
    null,
    [
      [17.3, -2, 17.3, -36.9],
      [34.6, -32, 34.6, -66.9],
      [-17.3, -42, -17.3, -76.9],
      [-34.6, -12, -34.6, -46.9],
    ],
  ],
  chunker: [
    26,
    null,
    [
      [17.3, -10, 17.3, -36.9],
      [34.6, -40, 34.6, -66.9],
      [-17.3, -50, -17.3, -76.9],
      [-34.6, -20, -34.6, -46.9],
    ],
  ],
  embedder: [
    20,
    null,
    [
      [17.3, -4, 17.3, -36.9],
      [34.6, -34, 34.6, -66.9],
      [-17.3, -44, -17.3, -76.9],
      [-34.6, -14, -34.6, -46.9],
    ],
  ],
  index: [
    40,
    null,
    [
      [17.3, -24, 17.3, -36.9],
      [34.6, -54, 34.6, -66.9],
      [-17.3, -64, -17.3, -76.9],
      [-34.6, -34, -34.6, -46.9],
    ],
  ],
  retriever: [
    24,
    null,
    [
      [17.3, -8, 17.3, -36.9],
      [34.6, -38, 34.6, -66.9],
      [-17.3, -48, -17.3, -76.9],
      [-34.6, -18, -34.6, -46.9],
    ],
  ],
  rewrite: [
    22,
    null,
    [
      [17.3, -6, 17.3, -36.9],
      [34.6, -36, 34.6, -66.9],
      [-17.3, -46, -17.3, -76.9],
      [-34.6, -16, -34.6, -46.9],
    ],
  ],
  reranker: [
    12,
    3.2,
    [
      [17.3, 4, 17.3, -36.9],
      [34.6, -26, 34.6, -66.9],
      [-17.3, -36, -17.3, -76.9],
      [-34.6, -6, -34.6, -46.9],
    ],
  ],
  assembler: [
    12,
    3.2,
    [
      [17.3, 4, 17.3, -36.9],
      [34.6, -26, 34.6, -66.9],
      [-17.3, -36, -17.3, -76.9],
      [-34.6, -6, -34.6, -46.9],
    ],
  ],
  llm: [
    32,
    3.5,
    [
      [17.3, -16, 17.3, -36.9],
      [34.6, -46, 34.6, -66.9],
      [-17.3, -56, -17.3, -76.9],
      [-34.6, -26, -34.6, -46.9],
    ],
  ],
  agent: [
    22,
    3,
    [
      [17.3, -6, 17.3, -36.9],
      [34.6, -36, 34.6, -66.9],
      [-17.3, -46, -17.3, -76.9],
      [-34.6, -16, -34.6, -46.9],
    ],
  ],
  graph: [
    12,
    3.2,
    [
      [17.3, 4, 17.3, -36.9],
      [34.6, -26, 34.6, -66.9],
      [-17.3, -36, -17.3, -76.9],
      [-34.6, -6, -34.6, -46.9],
    ],
  ],
  grader: [
    26,
    2.5,
    [
      [17.3, -10, 17.3, -36.9],
      [34.6, -40, 34.6, -66.9],
      [-17.3, -50, -17.3, -76.9],
      [-34.6, -20, -34.6, -46.9],
    ],
  ],
};
const VIEWS = [0, 1, 2, 3];

describe('RAG blocks', () => {
  it.each(BLOCK_TYPES)('%s draws from every turn without NaN', type => {
    for (const view of VIEWS)
      for (const o of [{}, { lit: true, state: 'ok' as const, selected: true, stat: 'X' }]) {
        const svg = withFrame({ view, center: [30, 10] }, () => renderers[type]({ x: 30, y: 10, ...o }));
        expect(svg, `view ${view}`).not.toContain('NaN');
        expect(svg.length, `view ${view}`).toBeGreaterThan(400);
      }
  });

  it.each(BLOCK_TYPES)('%s keeps its height and pill anchor', type => {
    const [ht, labelZ, anchors] = BEFORE[type];
    expect([BLOCKS[type].ht, BLOCKS[type].labelZ ?? null]).toEqual([ht, labelZ]);
    VIEWS.forEach(view => {
      const m = withFrame({ view }, () => blockTag(type, { x: 30, y: 10 })).match(
        /<circle cx="([^"]*)" cy="([^"]*)"[\s\S]*?<text x="([^"]*)" y="([^"]*)"/,
      )!;
      expect(m.slice(1).map(Number), `view ${view}`).toEqual(anchors[view]);
    });
  });

  it('draws no words on any block but the model screen', () => {
    for (const t of BLOCK_TYPES.filter(t => t !== 'llm' && t !== 'agent'))
      expect(withFrame({}, () => renderers[t]({ x: 0, y: 0 }))).not.toContain('<text');
  });

  it('the llm is the model machine, its screen in the state colour', () => {
    for (const st of ['ok', 'warn', 'bad'] as const) {
      const svg = withFrame({}, () => renderers.llm({ x: 0, y: 0, state: st }));
      expect(svg).toContain('data-kit="model"');
      expect(svg).toContain(`fill="${STATE_COL[st]}"`);
    }
    const idle = withFrame({}, () => renderers.llm({ x: 0, y: 0 }));
    expect(idle).toContain('data-state="idle"');
    expect(idle).toContain('>...</text>');
  });
});

/** every model group is the kit's model machine */
const models = (svg: string) => {
  expect(svg.match(/<g class="model"(?![^>]*data-kit="model")/g)).toBeNull();
  return (svg.match(/data-kit="model"/g) ?? []).length;
};
const stage = (board: [number, number, number, number], scene: Parameters<typeof IsoStage>[0]['scene']) =>
  renderToString(createElement(IsoStage, { board, scene, label: '' }));

describe('every model is the model machine', () => {
  it('pre-training: the growing model', () => {
    expect(models(stage(FORGE_BOARD, forgeScene({ steps: STEPS, step: null })))).toBe(1);
    expect(models(stage(FORGE_BOARD, forgeScene({ steps: STEPS, step: STEPS.at(-1)! })))).toBe(1);
  });
  it('inference: the draft runner', () => {
    const o = { seats: ['decode' as const], queued: 0, kv: 0 };
    expect(models(stage(SERVE_BOARD, serveScene(o)))).toBe(0);
    expect(models(stage(SERVE_BOARD, serveScene({ ...o, draft: { drafted: 3, accepted: 1 } })))).toBe(1);
  });
  it('small models: the teacher and the student', () => {
    expect(models(stage(ROUTER_BOARD, routerScene({ mode: 'distill' })))).toBe(2);
  });
  it('agents: a helper desk has its own little model', () => {
    expect(models(withFrame({}, () => helperDesk(40, 40, true, false).svg))).toBe(1);
  });
  it('home hero: the RAG model and every plot that has one', () => {
    expect(models(stage(HERO_BOARD, HOME_HERO))).toBeGreaterThan(5);
  });
});
