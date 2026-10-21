// The sandboxing picture: Larkspur's back office (officeScene, composed) as a glass room. The agent's desk (the model)
// and the file store (the order system) sit inside a walled yard; the operator (the front desk) stays outside. A file
// door stands on the belt to the store, a network door with a proxy gate on an outbound belt to the world, and the
// secret sits in a safe inside the yard or outside with the proxy. Each is a prop turned on by a policy flag, read off
// one run up to the current step. Words go only in pills; on phones (scale > 1) the caption carries the readouts.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc } from '../../lib/iso/blocks';
import { PALS, DARK, METAL, WOOD, box, cyl, shape, on, PX, castShadow, toneI, tag, byDepth } from '../../lib/iso/core.js';
import { archAt, beltAt, envelope, officeScene, type OfficeOpts, type Part } from './officeScene';
import { sandboxMessages } from './sandboxSequence';
import type { Files, Run } from '../../lib/sandboxing/loop';
import type { Msg } from '../../lib/iso/flat';

/** The office board, widened on the left for the network belt and the outside world. */
export const SANDBOX_BOARD: Board = [40, 0, 286, 258];

export interface SandboxOpts extends Omit<OfficeOpts, 'msgs' | 'upTo' | 'tools' | 'emp'> {
  run: Run;
  /** run steps shown so far (default all); the last one is the current step */
  upTo?: number;
  /** draw the wall of the glass room (the sandbox is on); off = it runs on the host, no wall */
  wall?: boolean;
  /** the file store door: which filesystem is mounted */
  files?: Files;
  /** the network door on the outbound belt */
  egress?: 'off' | 'allowlist' | 'open';
  /** the secret is behind the proxy (outside the yard) rather than in a safe inside it */
  proxy?: boolean;
}

// the outbound network belt runs from the sandbox host's left edge out past the wall to the world
const NET = { a: [128, 134], b: [60, 134], n: [0, 1] };
const DOOR_T = 0.42, GATE_T = 0.68, WORLD = [52, 134], SAFE_IN = [168, 70], SAFE_OUT = [48, 158];
// the file door sits on the belt from the host up to the order system (the file store)
const FILE_DOOR = [142, 96], FILE_N = [1, 0];
const at = (belt: typeof NET, t: number) => [belt.a[0] + (belt.b[0] - belt.a[0]) * t, belt.a[1] + (belt.b[1] - belt.a[1]) * t];

/** Where the current envelope rides, and the door lamps, read off the run up to `upTo`. Pure, for the tests. */
export function sandboxState({ run, upTo = run.steps.length }: Pick<SandboxOpts, 'run' | 'upTo'>) {
  const shown = run.steps.slice(0, upTo), last = shown.at(-1);
  let where: 'to-files' | 'from-files' | 'file-blocked' | 'to-net' | 'net-blocked' | null = null;
  let lamp: 'ok' | 'bad' | null = null, netLamp: 'ok' | 'bad' | null = null;
  if (last?.kind === 'call' && (last.call.name === 'read_file' || last.call.name === 'write_file')) { where = 'to-files'; lamp = 'ok'; }
  else if (last?.kind === 'result' && (last.call.name === 'read_file' || last.call.name === 'write_file')) { where = 'from-files'; lamp = last.outcome === 'ok' ? 'ok' : 'bad'; }
  else if (last?.kind === 'blocked' && last.by === 'filesystem') { where = 'file-blocked'; lamp = 'bad'; }
  else if (last?.kind === 'call' && last.call.name === 'fetch') { where = 'to-net'; netLamp = 'ok'; }
  else if (last?.kind === 'blocked' && last.by === 'network') { where = 'net-blocked'; netLamp = 'bad'; }
  return { where, lamp, netLamp };
}

/** The readouts in words, for the caption and the label. */
export function sandboxReadouts(o: SandboxOpts): string[] {
  const out: string[] = [];
  out.push(o.wall ? 'the code runs in the sandbox' : 'the code runs on the host, with full access');
  if (o.wall) {
    out.push(`files: ${o.files === 'open' ? 'everything read and write' : o.files === 'nodata' ? 'working copy writable, data not mounted, keys hidden' : 'working copy writable, data read-only, keys hidden'}`);
    out.push(`network: ${o.egress === 'off' ? 'no egress' : o.egress === 'open' ? 'open' : 'allow-list through the proxy'}`);
    out.push(`secret: ${o.proxy ? 'held by the proxy, outside the sandbox' : 'in the sandbox'}`);
  }
  return out;
}

/** A low wall (the glass room) around the yard: a fence outline on the board. */
function wallProp(): Part {
  const corners = [[118, 8], [286, 8], [286, 250], [118, 250]];
  let s = '';
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i + 1) % corners.length];
    s += box(Math.min(a[0], b[0]) - 1.2, Math.min(a[1], b[1]) - 1.2, BH, Math.max(a[0], b[0]) + 1.2, Math.max(a[1], b[1]) + 1.2, BH + 10, METAL, toneI, .5);
  }
  return { at: [202, 129, 0], svg: `<g data-prop="wall">${s}</g>` };
}

/** A safe holding the secret: a dark box with a dial. `outside`: it sits by the proxy, out of the yard. */
function safeProp(x: number, y: number, outside: boolean): Part {
  const s = box(x - 7, y - 6, BH, x + 7, y + 6, BH + 12, DARK, toneI, 1)
    + cyl(x + 2, y, BH + 12, BH + 13, 2.2, PALS.mustard, toneI, .9, 12)
    + shape(on(PX(x + 7.1), [[y - 3, BH + 4], [y + 3, BH + 4], [y + 3, BH + 9], [y - 3, BH + 9]]), PALS.mustard.m, .8);
  return { at: [x, y, 0], svg: `<g data-prop="safe" data-where="${outside ? 'proxy' : 'env'}">${s}</g>` };
}

/** A proxy gate: a small box on the network belt that the secret passes through. */
function proxyProp(x: number, y: number): Part {
  const s = box(x - 6, y - 7, BH, x + 6, y + 7, BH + 14, PALS.cobalt, toneI, 1);
  return { at: [x, y, 0], svg: `<g data-prop="proxy">${s}</g>` };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, cls = 'block-tag') =>
  `<g class="${cls}" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;
const PILLS = /<g class="(block|check|msg)-tag"/;

/** The office drawn as a glass room with the doors that are on. */
export const sandboxScene = (o: SandboxOpts) => (ctx: SceneCtx) => {
  const { run, upTo = run.steps.length, scale = 1, wall, egress = 'open', files = 'open', proxy } = o, narrow = scale > 1;
  const st = sandboxState(o), msgs = sandboxMessages(run);
  const office = officeScene({ ...o, msgs, upTo, tools: 4, emp: 'OPERATOR', host: 'SANDBOX', owner: false, gate: false })(ctx);
  const cut = office.search(PILLS), art = cut < 0 ? office : office.slice(0, cut), names = cut < 0 ? '' : office.slice(cut);
  const parts: Part[] = [], pills: string[] = [], shadows: string[] = [];
  const netBelt = `<g data-prop="net-belt">${beltAt(NET.a, NET.b, NET.n, egress === 'off')}</g>`;

  if (wall) { parts.push(wallProp()); }
  // the file door on the belt to the store
  if (wall) {
    const fa = archAt(FILE_DOOR, FILE_N, st.where === 'file-blocked' ? 'bad' : st.where === 'from-files' ? st.lamp : null);
    parts.push({ at: fa.at, svg: `<g data-prop="file-door" data-mode="${files}">${fa.svg}</g>` });
    if (!narrow) pills.push(pill([FILE_DOOR[0], FILE_DOOR[1], BH + 20], -10, 2, `FILES · ${files === 'open' ? 'ALL' : files === 'nodata' ? 'NO DATA' : 'SCOPED'}`, st.where === 'file-blocked', scale, 'check-tag'));
  }
  // the network door and proxy on the outbound belt, the world beyond
  const na = archAt(at(NET, DOOR_T), NET.n, st.where === 'net-blocked' ? 'bad' : st.where === 'to-net' ? 'ok' : null);
  parts.push({ at: na.at, svg: `<g data-prop="net-door" data-egress="${wall ? egress : 'open'}">${na.svg}</g>` });
  if (!narrow) pills.push(pill([at(NET, DOOR_T)[0], at(NET, DOOR_T)[1], BH + 20], -14, 2, `NETWORK · ${!wall || egress === 'open' ? 'OPEN' : egress === 'off' ? 'OFF' : 'ALLOW-LIST'}`, st.where === 'net-blocked', scale, 'check-tag'));
  if (wall && proxy) {
    parts.push(proxyProp(...at(NET, GATE_T) as [number, number]));
    if (!narrow) pills.push(pill([at(NET, GATE_T)[0], at(NET, GATE_T)[1], BH + 14], -8, -12, 'PROXY · ADDS SECRET', false, scale, 'check-tag'));
  }
  // the safe with the secret: inside the yard (env) or outside by the proxy
  if (wall) {
    const [sx, sy] = proxy ? SAFE_OUT : SAFE_IN;
    parts.push(safeProp(sx, sy, !!proxy));
    shadows.push(castShadow(boxCorners(sx - 7, sy - 6, BH, sx + 7, sy + 6, BH + 12), BH, ctx.top));
    if (!narrow) pills.push(pill([sx, sy, BH + 12], 0, -14, proxy ? 'SECRET · WITH PROXY' : 'SECRET · IN SANDBOX', false, scale));
  }
  // the world beyond the network door
  parts.push({ at: [WORLD[0], WORLD[1], 0], svg: `<g data-prop="world">${cyl(WORLD[0], WORLD[1], BH, BH + 8, 7, PALS.mint, toneI, 1, 18)}</g>` });
  if (!narrow) pills.push(pill([WORLD[0], WORLD[1], BH + 8], 0, -12, 'THE WORLD', false, scale));

  // the current step's envelope on its belt
  if (st.where) {
    const onNet = st.where === 'to-net' || st.where === 'net-blocked';
    const t = st.where === 'net-blocked' ? DOOR_T + .12 : st.where === 'to-net' ? DOOR_T - .18 : st.where === 'file-blocked' ? .6 : .4;
    const p = onNet ? at(NET, t) : [FILE_DOOR[0], FILE_DOOR[1] + (st.where === 'file-blocked' ? 18 : -18)];
    const m: Msg = (st.where === 'file-blocked' || st.where === 'net-blocked') ? { from: 'host', to: 'host', kind: 'blocked', text: '' } : msgs[upTo - 1];
    const env = envelope(m, p, onNet ? at(NET, 0) : [FILE_DOOR[0], FILE_DOOR[1] + 40], false);
    parts.push({ at: env.at, svg: `<g data-env="${st.where}">${env.svg}</g>` });
    if ((st.where === 'file-blocked' || st.where === 'net-blocked') && !narrow) pills.push(pill([p[0], p[1], BH + 6], -22, -16, 'REFUSED', true, scale, 'msg-tag'));
  }
  return netBelt + art + shadows.join('') + byDepth(parts) + names + pills.join('');
};

/** The picture in words, for its aria-label. */
export function sandboxLabel(o: SandboxOpts): string {
  const msgs = sandboxMessages(o.run), upTo = o.upTo ?? msgs.length, m = msgs[upTo - 1];
  return [
    `Larkspur's back office as a glass room: the operator outside, the agent and the file store ${o.wall ? 'inside a walled sandbox' : 'on the open host'}, a file door, a network door to the world, and the secret ${o.proxy ? 'in a safe outside with the proxy' : 'in a safe inside'}.`,
    m ? `Step ${upTo} of ${msgs.length}: ${m.text}${m.stamp ? `, stamped ${m.stamp.toLowerCase()}` : ''}.` : 'Nothing run yet.',
    sandboxReadouts(o).join('; ') + '.',
  ].filter(Boolean).join(' ');
}

/** The home hero's sandboxing plot: a small walled yard with the agent's desk inside and a gated door in its front wall, its lamp lit. */
export function glassRoomPlot(x: number, y: number, top: SceneCtx['top']): string {
  const r = 16, z = BH + 8, gap = 9;
  const wall = (x0: number, y0: number, x1: number, y1: number): Part => ({ at: [(x0 + x1) / 2, (y0 + y1) / 2, 0], svg: box(x0, y0, BH, x1, y1, z, METAL, toneI, .6) });
  return castShadow(boxCorners(x - 6, y - 10, BH, x + 6, y - 2, BH + 7), BH, top) + byDepth([
    wall(x - r, y - r - 1.2, x + r, y - r), wall(x - r - 1.2, y - r, x - r, y + r), wall(x + r, y - r, x + r + 1.2, y + r),
    wall(x - r, y + r, x - gap - 1.6, y + r + 1.2), wall(x + gap + 1.6, y + r, x + r, y + r + 1.2),
    { at: [x, y - 6, 0], svg: box(x - 6, y - 10, BH, x + 6, y - 2, BH + 7, WOOD, toneI, .9) + box(x - 3, y - 8, BH + 7, x + 3, y - 6, BH + 13, DARK, toneI, .8) },
    archAt([x, y + r + .6], [1, 0], 'ok'),
  ]);
}
