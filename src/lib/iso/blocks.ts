// Block renderers for the RAG canvas, ported from the canvas prototype's drawNode (001-canvas-shapes.html).
// Pure functions returning SVG strings; call them inside an IsoStage scene (or withFrame) so they use its framing.
import {
  PALS, METAL, CLEAR, CERAMIC, DARK, WOOD, INK, matOf,
  box, cyl, cylX, rod, shape, fill, line, hullInk, castShadow, tx, txY, pd, on, PX, PZ, rectUV, rrUV, ellUV, tone, toneI,
} from './core.js';

export const BH = 4;      // board thickness: blocks stand at z = BH
export const HALF = 17;   // half a block's footprint
export const CELL = 56;   // grid pitch on the workbench
export const ACC = '#ffb627';

export type BlockType =
  | 'docs' | 'chunker' | 'embedder' | 'index' | 'retriever' | 'rewrite'
  | 'reranker' | 'assembler' | 'llm' | 'agent' | 'graph' | 'grader';

export interface BlockOpts {
  x: number;
  y: number;
  stat?: string;                    // live text on the side face, e.g. "42 CHUNKS"
  selected?: boolean;               // accent ring on the floor
  lit?: boolean;                    // retriever lens glows when it found something
  state?: 'ok' | 'warn' | 'bad';    // LLM screen / grader needle
}

type Mat = { l: string; m: string; d: string };
interface Ctx { x: number; y: number; x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; m: Mat; o: BlockOpts }
interface Spec { name: string; label: string; pal: Mat; ht: number; labelZ?: number; draw?: (c: Ctx) => string }

const LILAC = matOf('#b39ddb');
const STATE_COL = { ok: '#8af0ae', warn: '#ffd27a', bad: '#ff9b8a' };
const STATE_TXT = { ok: 'OK', warn: '???', bad: '!!' };
const body = ({ x0, y0, z0, x1, y1, z1, m }: Ctx) => box(x0, y0, z0, x1, y1, z1, m, tone, 1);

export const BLOCKS: Record<BlockType, Spec> = {
  docs: { name: 'Docs', label: 'DOCS', pal: CERAMIC, ht: 18, draw: ({ x0, y0, z0, x1, y1, z1, m }) => {
    let s = box(x0+1, y0+2, z0, x1-1, y1-2, z0+6, m, tone) + box(x0, y0, z0+6, x1-2, y1-1, z0+12, m, tone) + box(x0+2, y0+1, z0+12, x1, y1, z1, m, tone);
    for (let i = 0; i < 4; i++) s += line([[x0+7+i*5, y0+6, z1+.1], [x0+7+i*5, y1-6 - (i % 2) * 6, z1+.1]], .7);
    return s;
  } },
  chunker: { name: 'Chunker', label: 'CHUNKER', pal: PALS.tomato, ht: 26, draw: c => {
    const { x, y0, y1, z1 } = c;
    return body(c) + shape(on(PZ(z1+.1), rectUV(x-2.5, y0+6, x+2.5, y1-6)), DARK.d, .8)
      + box(x-1, y0+9, z1, x+1, y0+19, z1+9, CERAMIC, toneI, .6) + box(x-1, y0+20, z1, x+1, y1-9, z1+6, CERAMIC, toneI, .6);
  } },
  embedder: { name: 'Embedder', label: 'EMBEDDER', pal: LILAC, ht: 20, draw: c => {
    // a 3×3 grid of coloured studs: the vector each chunk becomes
    const cols = [PALS.mustard, PALS.mint, PALS.cobalt, PALS.tomato, PALS.blush];
    let s = body(c);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      s += cyl(c.x - 9 + i*9, c.y - 9 + j*9, c.z1, c.z1 + 2 + ((i + j) % 3) * 1.5, 2.6, cols[(i*3 + j) % cols.length], toneI, .7, 14);
    return s;
  } },
  index: { name: 'Index', label: 'INDEX', pal: PALS.cobalt, ht: 40, draw: c => {
    const { y, x1, y0, y1, z0 } = c;
    let s = body(c);
    for (let i = 1; i < 3; i++) s += line([[x1+.1, y0+3, z0 + 40*i/3], [x1+.1, y1-3, z0 + 40*i/3]], .8);
    for (let i = 0; i < 3; i++) s += cylX(x1, x1+2.2, y-11, z0 + 40*(i + .5)/3, 1.6, METAL, toneI, .7);
    return s;
  } },
  retriever: { name: 'Retriever', label: 'RETRIEVER', pal: PALS.mint, ht: 24, draw: c =>
    body(c) + cyl(c.x, c.y, c.z1, c.z1+5, 9, METAL, toneI, 1) + fill(pd(on(PZ(c.z1+5.1), ellUV(c.x, c.y, 6.5, 6.5))), c.o.lit ? ACC : CLEAR.m) },
  rewrite: { name: 'Query rewrite', label: 'REWRITE', pal: CLEAR, ht: 22, draw: c => {
    // a drum that turns the question over
    const { x, y0, y1, z1 } = c, r = 4.5;
    return body(c) + rod([x, y0+5, z1+r], [x, y1-5, z1+r], r, PALS.mustard, toneI, 1)
      + line([[x+r*.7, y0+12, z1+r+r*.7], [x+r*.7, y1-12, z1+r+r*.7]], .6);
  } },
  reranker: { name: 'Reranker', label: 'RERANKER', pal: PALS.mint, ht: 12, labelZ: 3.2, draw: c => {
    // a podium: three steps, tallest first
    const { x0, x1, y0, z1 } = c, w = 34/3;
    return body(c) + [14, 9, 5].map((h, i) =>
      box(x0+5, y0 + i*w + .5, z1, x1-5, y0 + (i+1)*w - .5, z1+h, [PALS.mustard, METAL, WOOD][i], toneI, .8)).join('');
  } },
  assembler: { name: 'Context assembler', label: 'CONTEXT', pal: WOOD, ht: 12, labelZ: 3.2, draw: c => {
    // a tray of slips stacked into one prompt, held by a clip
    const { x, y, z1 } = c;
    let s = body(c);
    for (let i = 0; i < 3; i++) s += box(x-10+i*1.5, y-11+i*1.5, z1 + i*2.4, x+10+i*1.5, y+11+i*1.5, z1 + i*2.4 + 2.4, CERAMIC, toneI, .6);
    return s + rod([x+5, y-6, z1+8.4], [x+5, y+9, z1+8.4], 1.3, METAL, toneI, .8);
  } },
  llm: { name: 'LLM', label: 'LLM', pal: PALS.blush, ht: 32, labelZ: 3.5, draw: c => {
    const { y, x1, y0, y1, z0, z1, o } = c, st = o.state;
    return body(c) + shape(on(PX(x1+.1), rectUV(y0+5, z0+10, y1-5, z1-4)), '#1d2a26', .9)
      + tx(x1+.2, y, z0 + 15.5, st ? STATE_TXT[st] : '...', 6, st ? STATE_COL[st] : '#8a948f');
  } },
  agent: { name: 'Agent', label: 'AGENT', pal: PALS.mustard, ht: 22, labelZ: 3, draw: c => {
    const { x, y, x1, z0, z1 } = c;
    let s = body(c) + rod([x, y, z1], [x, y, z1+12], 1, METAL) + cyl(x, y, z1+11, z1+15, 3, PALS.tomato, toneI, .8);
    for (const dy of [-6, 6]) s += shape(on(PX(x1+.1), rectUV(y+dy-2.5, z0+12, y+dy+2.5, z0+17)), DARK.d, .6);
    return s;
  } },
  graph: { name: 'Graph', label: 'GRAPH', pal: DARK, ht: 12, labelZ: 3.2, draw: c => {
    // entities on pegs, joined by relations
    const { x, y, z1 } = c, Z = z1 + .1;
    const nodes: [number, number, number, Mat][] = [[x-9, y-8, 7, PALS.mustard], [x+8, y-10, 4, PALS.mint], [x-6, y+9, 5, PALS.tomato], [x+9, y+7, 9, PALS.cobalt]];
    const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3]];
    let s = body(c);
    for (const [a, b] of edges) s += `<path d="${pd([[nodes[a][0], nodes[a][1], Z], [nodes[b][0], nodes[b][1], Z]], false)}" fill="none" stroke="#fff4d6" stroke-width="1.2" stroke-linecap="round"/>`;
    for (const [nx, ny, h, m] of nodes) s += rod([nx, ny, z1], [nx, ny, z1 + h], .7, METAL, toneI, .6) + cyl(nx, ny, z1 + h, z1 + h + 2.5, 3, m, toneI, .8, 14);
    return s;
  } },
  grader: { name: 'Evaluator', label: 'EVALUATOR', pal: METAL, ht: 26, labelZ: 2.5, draw: c => {
    // a gauge: the needle swings to pass (right) or fail (left)
    const { y, x1, z0, o } = c, X = x1 + .1, cz = z0 + 14, a = o.state === 'ok' ? 40 : o.state === 'bad' ? 140 : 90;
    const dial = shape(on(PX(X), ellUV(y, cz, 8, 8)), CERAMIC.l, .9)
      + shape(on(PX(X+.05), [[y, cz], ...ellUV(y, cz, 7, 7, 24).slice(7, 12)]), PALS.mint.l, 0)
      + shape(on(PX(X+.05), [[y, cz], ...ellUV(y, cz, 7, 7, 24).slice(1, 6)]), PALS.tomato.l, 0);
    const r = a * Math.PI / 180, tip = [y - Math.cos(r) * 6.5, cz + Math.sin(r) * 6.5];
    return body(c) + dial + line([[X+.1, y, cz], [X+.1, tip[0], tip[1]]], 1.2);
  } },
};

export const BLOCK_TYPES = Object.keys(BLOCKS) as BlockType[];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderBlock(type: BlockType, o: BlockOpts): string {
  const spec = BLOCKS[type], m = spec.pal, x0 = o.x - HALF, x1 = o.x + HALF, y0 = o.y - HALF, y1 = o.y + HALF, z0 = BH, z1 = BH + spec.ht;
  const c: Ctx = { x: o.x, y: o.y, x0, x1, y0, y1, z0, z1, m, o };
  let s = o.selected ? `<path class="sel" d="${pd(on(PZ(BH+.3), rrUV(x0-4, y0-4, x1+4, y1+4, 5)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>` : '';
  s += (spec.draw ?? body)(c);
  s += tx(x1+.2, o.y, z0 + (spec.labelZ ?? spec.ht/2 - 2), spec.label, 5.6, m === DARK ? '#fff4d6' : INK);
  // dark side faces get cream text; pale materials keep ink
  if (o.stat) s += txY(o.x, y1+.2, z0 + spec.ht/2 - 2, esc(o.stat), 4.6, [CERAMIC, METAL, CLEAR].includes(m) ? INK : '#fff4d6');
  s += hullInk([[x0,y0,z0],[x1,y0,z0],[x0,y1,z0],[x1,y1,z0],[x0,y0,z1],[x1,y0,z1],[x0,y1,z1],[x1,y1,z1]], 2.4);
  const aria = `${spec.name} block${o.stat ? ', ' + o.stat : ''}${o.selected ? ', selected' : ''}`;
  return `<g class="block" role="button" tabindex="0" aria-label="${esc(aria)}" data-block="${type}">${s}</g>`;
}

export const renderers = Object.fromEntries(
  BLOCK_TYPES.map(t => [t, (o: BlockOpts) => renderBlock(t, o)]),
) as Record<BlockType, (o: BlockOpts) => string>;

// Shadow of a block on the board; draw all shadows before the blocks. clip = boardTop(...) so it stops at the edge.
export function blockShadow(type: BlockType, x: number, y: number, clip?: number[][]): string {
  const ht = BLOCKS[type].ht, x0 = x - HALF, x1 = x + HALF, y0 = y - HALF, y1 = y + HALF;
  return castShadow([[x0,y0,BH],[x1,y0,BH],[x0,y1,BH],[x1,y1,BH],[x0,y0,BH+ht],[x1,y0,BH+ht],[x0,y1,BH+ht],[x1,y1,BH+ht]], BH, clip);
}
