// Chapter 5's isometric scenes, from the RAG canvas blocks: AI apps (agent blocks) and the systems they reach
// (index blocks, read as server cabinets). `count`: every app wired to every system, each pair its own colour
// (custom integrations), or with MCP one plug on each block. `connect`: one host app and Larkspur's MCP servers,
// a lit cable and plugs for each server the host has connected to.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, ACC, HALF, BLOCKS, renderers, blockShadow, esc } from '../../lib/iso/blocks';
import { INK, PALS, METAL, pd, byDepth, box, cyl, toneI, tag, inkK } from '../../lib/iso/core.js';

export const MCP_BOARD: Board = [0, 0, 260, 210];
const AX = 50, SX = 210, MID = 105, GAP = 50;
// two blocks get more room, so their name pills never touch
const rows = (n: number) => Array.from({ length: n }, (_, i) => MID + (i - (n - 1) / 2) * (n <= 2 ? 90 : GAP));
const WIRE_PALS = [PALS.cobalt, PALS.tomato, PALS.mint, PALS.blush, PALS.mustard];
const TALLEST = Math.max(BLOCKS.agent.ht, BLOCKS.index.ht);

const wire = (a: number[], b: number[], col: string, w = 2.2) => {
  const d = pd([[a[0], a[1], BH + .3], [b[0], b[1], BH + .3]], false);
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
};
/** a plug: a small metal body with an accent band, standing on the board where a cable meets a block */
const plug = (x: number, y: number, z = BH) => box(x - 4.5, y - 4.5, z, x + 4.5, y + 4.5, z + 7, METAL, toneI, .9) + cyl(x, y, z + 7, z + 9, 3, PALS.mustard, toneI, .8, 14);
// where cables meet a block: an app's face toward the systems (in view); a system's back face (hidden), so its plug
// stands on its top edge, where the viewer can see it
const appEnd = (y: number) => [AX + HALF + 6, y];
const sysEnd = (y: number) => [SX - HALF - 2, y];
const SYS_TOP = BH + BLOCKS.index.ht;
/** a name pill over a block (label-pill rule); every pill floats at one height so neighbours form a row */
const pill = (x: number, y: number, ht: number, text: string, on: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag([x, y, BH + ht], 0, -16 - (TALLEST - ht) / (inkK() * scale), esc(text), on, scale)}</g>`;

type Part = { at: number[]; svg: string };
const appPlug = (y: number): Part => ({ at: [AX + HALF + 6, y, 0], svg: plug(AX + HALF + 6, y) });
const sysPlug = (y: number): Part => ({ at: [SX - HALF + 6, y, SYS_TOP], svg: plug(SX - HALF + 6, y, SYS_TOP) });
/** shadows, then blocks and plugs back to front */
const blocks = (apps: number[], systems: number[], top: number[][], plugs: Part[] = []) =>
  apps.map(y => blockShadow('agent', AX, y, top)).join('') + systems.map(y => blockShadow('index', SX, y, top)).join('')
  + byDepth([
    ...apps.map(y => ({ at: [AX, y, 0], svg: renderers.agent({ x: AX, y }) })),
    ...systems.map(y => ({ at: [SX, y, 0], svg: renderers.index({ x: SX, y }) })),
    ...plugs,
  ]);

export interface CountOpts { apps: number; systems: number; mcp: boolean; scale?: number }
/** Every app joined to every system: apps × systems custom wires, or with MCP one plug per block (apps + systems). */
export const countScene = ({ apps, systems, mcp, scale = 1 }: CountOpts) => ({ top }: SceneCtx) => {
  const A = rows(apps), Sy = rows(systems);
  let s = '';
  A.forEach((ya, i) => Sy.forEach((ys, j) => { s += wire(appEnd(ya), sysEnd(ys), mcp ? ACC : WIRE_PALS[(i * systems + j) % WIRE_PALS.length].m, mcp ? 2.2 : 1.6); }));
  // without MCP each wire is its own custom job; with it, one standard plug per block
  s += blocks(A, Sy, top, mcp ? [...A.map(appPlug), ...Sy.map(sysPlug)] : []);
  return s + A.map((y, i) => pill(AX, y, BLOCKS.agent.ht, `APP ${i + 1}`, false, scale)).join('')
    + Sy.map((y, i) => pill(SX, y, BLOCKS.index.ht, `SYSTEM ${i + 1}`, false, scale)).join('');
};

export interface ConnectOpts { servers: { name: string; connected: boolean }[]; host?: string; scale?: number }
/** One host app and its servers; a connected server gets a lit cable with a plug at each end. */
export const connectScene = ({ servers, host = 'HOST APP', scale = 1 }: ConnectOpts) => ({ top }: SceneCtx) => {
  const Sy = rows(servers.length);
  let s = '';
  const on = Sy.filter((_, i) => servers[i].connected);
  for (const y of on) s += wire(appEnd(MID), sysEnd(y), ACC);
  s += blocks([MID], Sy, top, on.length ? [appPlug(MID), ...on.map(sysPlug)] : []);
  return s + pill(AX, MID, BLOCKS.agent.ht, host, false, scale)
    + servers.map((sv, i) => pill(SX, Sy[i], BLOCKS.index.ht, sv.name, sv.connected, scale)).join('');
};
