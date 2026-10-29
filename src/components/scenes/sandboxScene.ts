// The sandboxing picture: Larkspur's back office (officeScene, composed) as a glass room. The agent's desk (the model)
// and the file store (the order system) sit inside a walled yard; the operator (the front desk) stays outside. A file
// door stands on the belt to the store, a network door with a proxy gate on an outbound belt to the world, and the
// secret sits in a safe inside the yard or outside with the proxy. Each is a prop turned on by a policy flag, read off
// one run up to the current step. Words go only in pills; on phones (scale > 1) the caption carries the readouts.
// The hero is the glass room itself, a greenhouse frame; the operator in a hard hat stands at the counter outside it.
import type { SceneCtx, Board } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CLEAR,
  DARK,
  METAL,
  WOOD,
  box,
  cyl,
  rod,
  shape,
  fill,
  pd,
  on,
  PX,
  PY,
  rectUV,
  ellUV,
  vis,
  castShadow,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import { hexa, person } from '../../lib/iso/figures';
import { OFFICE_PARTS, archAt, beltAt, envelope, officeScene, type OfficeOpts, type Part } from './officeScene';
import { EMPLOYEE, officeLayers, withoutPerson } from './officeLayers';
import { sandboxMessages } from './sandboxSequence';
import type { Files, Run } from '../../lib/sandboxing/loop';
import type { Msg } from '../../lib/iso/flat';

/** The office board, widened on the left for the network belt and the outside world. */
export const SANDBOX_BOARD: Board = [40, 0, 286, 258];

/** The parts a step's callout may name: the office's (it has no ownership check or approval here), then the doors, the
 * proxy, the secret's safe and the world. */
export const SANDBOX_PARTS = [
  ...OFFICE_PARTS.filter(p => p !== 'owner' && p !== 'gate'),
  'files',
  'network',
  'proxy',
  'secret',
  'world',
] as const;

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
const DOOR_T = 0.42,
  GATE_T = 0.68,
  WORLD = [52, 134],
  SAFE_IN = [168, 70],
  SAFE_OUT = [48, 158];
// the file door sits on the belt from the host up to the order system (the file store)
const FILE_DOOR = [142, 96],
  FILE_N = [1, 0];
const at = (belt: typeof NET, t: number) => [
  belt.a[0] + (belt.b[0] - belt.a[0]) * t,
  belt.a[1] + (belt.b[1] - belt.a[1]) * t,
];

/** Where the current envelope rides, and the door lamps, read off the run up to `upTo`. Pure, for the tests. */
export function sandboxState({ run, upTo = run.steps.length }: Pick<SandboxOpts, 'run' | 'upTo'>) {
  const shown = run.steps.slice(0, upTo),
    last = shown.at(-1);
  let where: 'to-files' | 'from-files' | 'file-blocked' | 'to-net' | 'net-blocked' | null = null;
  let lamp: 'ok' | 'bad' | null = null,
    netLamp: 'ok' | 'bad' | null = null;
  if (last?.kind === 'call' && (last.call.name === 'read_file' || last.call.name === 'write_file')) {
    where = 'to-files';
    lamp = 'ok';
  } else if (last?.kind === 'result' && (last.call.name === 'read_file' || last.call.name === 'write_file')) {
    where = 'from-files';
    lamp = last.outcome === 'ok' ? 'ok' : 'bad';
  } else if (last?.kind === 'blocked' && last.by === 'filesystem') {
    where = 'file-blocked';
    lamp = 'bad';
  } else if (last?.kind === 'call' && last.call.name === 'fetch') {
    where = 'to-net';
    netLamp = 'ok';
  } else if (last?.kind === 'blocked' && last.by === 'network') {
    where = 'net-blocked';
    netLamp = 'bad';
  }
  return { where, lamp, netLamp };
}

/** The readouts in words, for the caption and the label. */
export function sandboxReadouts(o: SandboxOpts): string[] {
  const out: string[] = [];
  out.push(o.wall ? 'the code runs in the sandbox' : 'the code runs on the host, with full access');
  if (o.wall) {
    out.push(
      `files: ${o.files === 'open' ? 'everything read and write' : o.files === 'nodata' ? 'working copy writable, data not mounted, keys hidden' : 'working copy writable, data read-only, keys hidden'}`,
    );
    out.push(
      `network: ${o.egress === 'off' ? 'no egress' : o.egress === 'open' ? 'open' : 'allow-list through the proxy'}`,
    );
    out.push(`secret: ${o.proxy ? 'held by the proxy, outside the sandbox' : 'in the sandbox'}`);
  }
  return out;
}

/* The glass room (the hero): a greenhouse frame round the yard. Its outline leaves a notch at the front left for the
 * operator's counter, wide enough that the operator is seen in the open, not through glass; the belts pass through gaps.
 * Each side is a low brick wall, slim green posts, a top rail and tinted panes. */
const ROOM = { x0: 118, x1: 286, y0: 2, y1: 250, nx: 188, ny: 218 };
const WALL_H = BH + 28;
const FRAME = PALS.mint,
  BRICK = { l: '#d98a6c', m: '#b8664b', d: '#6e3b2b' };
type Side = { a: number[]; b: number[]; gap?: number[]; near?: boolean };
// near: drawn over the office (nothing of the office stands in front of it on screen); the rest go under it. The notch's
// side along x stays under, so the counter outside it draws over its glass. This module shows the front view only.
const SIDES: Side[] = [
  { a: [ROOM.x0, ROOM.y0], b: [ROOM.x1, ROOM.y0] },
  { a: [ROOM.x0, ROOM.y0], b: [ROOM.x0, ROOM.ny], gap: [125, 143] }, // the network belt goes out here
  { a: [ROOM.x0, ROOM.ny], b: [ROOM.nx, ROOM.ny], gap: [133, 151] }, // the operator's belt comes in here
  { a: [ROOM.nx, ROOM.ny], b: [ROOM.nx, ROOM.y1], near: true },
  { a: [ROOM.nx, ROOM.y1], b: [ROOM.x1, ROOM.y1], near: true },
  { a: [ROOM.x1, ROOM.y0], b: [ROOM.x1, ROOM.y1], near: true },
];
/** One side of the frame along x or y, skipping its gap. */
function glassSide({ a, b, gap }: Side): string {
  const alongX = a[1] === b[1],
    k = alongX ? 0 : 1,
    fixed = a[1 - k],
    t = 0.7; // half the frame's thickness
  const spans = gap
    ? [
        [a[k], gap[0]],
        [gap[1], b[k]],
      ]
    : [[a[k], b[k]]];
  const bar = (u0: number, u1: number, z0: number, z1: number, h = t, m = FRAME) =>
    alongX
      ? box(u0, fixed - h, z0, u1, fixed + h, z1, m, toneI, 0.6)
      : box(fixed - h, u0, z0, fixed + h, u1, z1, m, toneI, 0.6);
  let s = '';
  for (const [u0, u1] of spans) {
    const n = Math.max(1, Math.round((u1 - u0) / 24)),
      step = (u1 - u0) / n;
    const pane = on(alongX ? PY(fixed) : PX(fixed), rectUV(u0, BH + 4, u1, WALL_H - 1));
    s += bar(u0, u1, BH, BH + 4, 1.4, BRICK) + fill(pd(pane), CLEAR.l, 'fill-opacity=".38"');
    for (let i = 0; i <= n; i++) s += bar(u0 + i * step - t, u0 + i * step + t, BH + 4, WALL_H);
    s += bar(u0, u1, WALL_H - 1, WALL_H + 0.4, 1);
  }
  return s;
}
/** The frame's sides drawn under the office (far) and over it (near). */
const glassRoom = () => ({
  far: `<g data-prop="wall">${SIDES.filter(s => !s.near)
    .map(glassSide)
    .join('')}</g>`,
  near: `<g data-prop="wall" data-near="1">${SIDES.filter(s => s.near)
    .map(glassSide)
    .join('')}</g>`,
});

/** A safe holding the secret. Real-object notes: a squat dark steel body on a plinth, a door panel with a round
 * combination dial and a lever handle on the side toward the viewer. `outside`: it sits by the proxy, out of the yard. */
function safeProp(x: number, y: number, outside: boolean): Part {
  const sx = vis([1, 0, 0]) ? 1 : -1,
    F = x + sx * 7;
  const s =
    box(x - 7.5, y - 6.5, BH, x + 7.5, y + 6.5, BH + 1.5, DARK, toneI, 1) +
    box(x - 7, y - 6, BH + 1.5, x + 7, y + 6, BH + 13, DARK, toneI, 1) +
    shape(on(PX(F + sx * 0.05), rectUV(y - 4.6, BH + 3, y + 4.6, BH + 11.5)), DARK.l, 0.8) +
    rod([F, y - 1, BH + 7.5], [F + sx * 1.2, y - 1, BH + 7.5], 2.4, METAL, toneI, 0.8, 2.4, 14) +
    fill(pd(on(PX(F + sx * 1.25), ellUV(y - 1, BH + 7.5, 0.7, 0.7, 8))), DARK.d) +
    rod([F, y + 3, BH + 7.5], [F + sx * 1.6, y + 3, BH + 7.5], 0.5, METAL) +
    rod([F + sx * 1.6, y + 3, BH + 7.5], [F + sx * 1.6, y + 3, BH + 4.2], 0.6, PALS.mustard);
  return { at: [x, y, 0], svg: `<g data-prop="safe" data-where="${outside ? 'proxy' : 'env'}">${s}</g>` };
}

/** The proxy on the network belt: a turnstile across it, and its booth on the belt's far side with a window and a
 * pitched cap, where the secret is added. */
function proxyProp(x: number, y: number): Part {
  const yb = y - 11.5,
    zt = BH + 15;
  const s =
    box(x - 5, yb - 4, BH, x + 5, yb + 4, zt, PALS.cobalt, toneI, 1) +
    shape(on(PY(yb + 4.05), rectUV(x - 3, BH + 7, x + 3, BH + 12)), CLEAR.m, 0.7) +
    hexa(
      [
        [x - 6, yb - 5, zt],
        [x + 6, yb - 5, zt],
        [x + 6, yb + 5, zt],
        [x - 6, yb + 5, zt],
        [x - 6, yb, zt + 3.5],
        [x + 6, yb, zt + 3.5],
        [x + 6, yb, zt + 3.5],
        [x - 6, yb, zt + 3.5],
      ],
      DARK,
      0.9,
    ) +
    rod([x, y - 7.5, BH], [x, y - 7.5, BH + 10], 1.1, METAL) +
    cyl(x, y - 7.5, BH + 10, BH + 11.5, 1.6, DARK, toneI, 0.8, 10) +
    rod([x, y - 7.5, BH + 10.7], [x, y + 6, BH + 10.7], 0.6, METAL) +
    rod([x, y - 7.5, BH + 10.7], [x, y - 10, BH + 15], 0.6, METAL) +
    rod([x, y - 7.5, BH + 10.7], [x, y - 10, BH + 6.4], 0.6, METAL);
  return { at: [x, y, 0], svg: `<g data-prop="proxy">${s}</g>` };
}

// The pills float in two even rows (dx, dy in ink units, 0.79 px each on desktop): a back row above the left board edge
// (the secret by the proxy, the world, the proxy) and a low row under the doors (network, refused, files), as the
// office's check pills sit low. The secret in the sandbox and the file door's refusal sit by themselves, clear of both.
// Phones drop these pills; tests/unit/sandbox-scene.test.ts checks no two overlap.
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, cls = 'block-tag') =>
  `<g class="${cls}" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The office drawn as a glass room with the doors that are on. */
export const sandboxScene = (o: SandboxOpts) => (ctx: SceneCtx) => {
  const { run, upTo = run.steps.length, scale = 1, wall, egress = 'open', files = 'open', proxy } = o,
    narrow = scale > 1;
  const st = sandboxState(o),
    msgs = sandboxMessages(run);
  const office = officeScene({
    ...o,
    msgs,
    upTo,
    tools: 4,
    emp: 'OPERATOR',
    host: wall ? 'SANDBOX' : 'HOST', // no wall: the agent runs on the host itself
    owner: false,
    gate: false,
  })(ctx);
  // the operator takes the employee's place and pose at the counter (the office's shadow for them still fits); the
  // props' shadows join the office's floor layer, and the glass room's far sides go under the office, its near ones over
  const { floor, art, names, callout } = officeLayers(withoutPerson(office, 'employee'));
  const parts: Part[] = [],
    pills: string[] = [],
    calls: string[] = [],
    shadows: string[] = [];
  const netBelt = `<g data-prop="net-belt">${beltAt(NET.a, NET.b, NET.n, egress === 'off')}</g>`;
  const room = wall ? glassRoom() : { far: '', near: '' },
    operator = byDepth(person({ ...EMPLOYEE, look: 'operator' }).items);
  // the file door on the belt to the store
  if (wall) {
    const fa = archAt(
      FILE_DOOR,
      FILE_N,
      st.where === 'file-blocked' ? 'bad' : st.where === 'from-files' ? st.lamp : null,
    );
    parts.push({ at: fa.at, svg: `<g data-prop="file-door" data-mode="${files}">${fa.svg}</g>` });
    calls.push(sayAt(o.say, 'files', [FILE_DOOR[0], FILE_DOOR[1], BH + 20], 27, scale));
    if (!narrow)
      pills.push(
        pill(
          [FILE_DOOR[0], FILE_DOOR[1], BH + 20],
          28,
          27,
          `FILES · ${files === 'open' ? 'ALL' : files === 'nodata' ? 'NO DATA' : 'SCOPED'}`,
          st.where === 'file-blocked',
          scale,
          'check-tag',
        ),
      );
  }
  // the network door and proxy on the outbound belt, the world beyond
  const na = archAt(at(NET, DOOR_T), NET.n, st.where === 'net-blocked' ? 'bad' : st.where === 'to-net' ? 'ok' : null);
  parts.push({ at: na.at, svg: `<g data-prop="net-door" data-egress="${wall ? egress : 'open'}">${na.svg}</g>` });
  calls.push(sayAt(o.say, 'network', [at(NET, DOOR_T)[0], at(NET, DOOR_T)[1], BH + 20], 29, scale));
  if (!narrow)
    pills.push(
      pill(
        [at(NET, DOOR_T)[0], at(NET, DOOR_T)[1], BH + 20],
        -80,
        29,
        `NETWORK · ${!wall || egress === 'open' ? 'OPEN' : egress === 'off' ? 'OFF' : 'ALLOW-LIST'}`,
        st.where === 'net-blocked',
        scale,
        'check-tag',
      ),
    );
  if (wall && proxy) {
    const [gx, gy] = at(NET, GATE_T);
    parts.push(proxyProp(gx, gy));
    shadows.push(castShadow(boxCorners(gx - 5, gy - 15.5, BH, gx + 5, gy - 7.5, BH + 18), BH, ctx.top));
    calls.push(sayAt(o.say, 'proxy', [at(NET, GATE_T)[0], at(NET, GATE_T)[1], BH + 14], -49, scale));
    if (!narrow)
      pills.push(
        pill(
          [at(NET, GATE_T)[0], at(NET, GATE_T)[1], BH + 14],
          64,
          -49,
          'PROXY · ADDS SECRET',
          false,
          scale,
          'check-tag',
        ),
      );
  }
  // the safe with the secret: inside the yard (env) or outside by the proxy
  if (wall) {
    const [sx, sy] = proxy ? SAFE_OUT : SAFE_IN;
    parts.push(safeProp(sx, sy, !!proxy));
    calls.push(sayAt(o.say, 'secret', [sx, sy, BH + 12], proxy ? -46 : -14, scale));
    shadows.push(castShadow(boxCorners(sx - 7, sy - 6, BH, sx + 7, sy + 6, BH + 12), BH, ctx.top));
    if (!narrow)
      pills.push(
        pill(
          [sx, sy, BH + 12],
          proxy ? -58 : 0,
          proxy ? -46 : -14,
          proxy ? 'SECRET · WITH PROXY' : 'SECRET · IN SANDBOX',
          false,
          scale,
        ),
      );
  }
  // the world beyond the network door
  parts.push({
    at: [WORLD[0], WORLD[1], 0],
    svg: `<g data-prop="world">${cyl(WORLD[0], WORLD[1], BH, BH + 8, 7, PALS.mint, toneI, 1, 18)}</g>`,
  });
  if (!narrow) pills.push(pill([WORLD[0], WORLD[1], BH + 8], 4, -38, 'THE WORLD', false, scale));
  calls.push(sayAt(o.say, 'world', [WORLD[0], WORLD[1], BH + 8], -38, scale));

  // the current step's envelope on its belt
  if (st.where) {
    const onNet = st.where === 'to-net' || st.where === 'net-blocked';
    const t =
      st.where === 'net-blocked'
        ? DOOR_T + 0.12
        : st.where === 'to-net'
          ? DOOR_T - 0.18
          : st.where === 'file-blocked'
            ? 0.6
            : 0.4;
    const p = onNet ? at(NET, t) : [FILE_DOOR[0], FILE_DOOR[1] + (st.where === 'file-blocked' ? 18 : -18)];
    const m: Msg =
      st.where === 'file-blocked' || st.where === 'net-blocked'
        ? { from: 'host', to: 'host', kind: 'blocked', text: '' }
        : msgs[upTo - 1];
    const env = envelope(m, p, onNet ? at(NET, 0) : [FILE_DOOR[0], FILE_DOOR[1] + 40], false);
    parts.push({ at: env.at, svg: `<g data-env="${st.where}">${env.svg}</g>` });
    if ((st.where === 'file-blocked' || st.where === 'net-blocked') && !narrow)
      pills.push(pill([p[0], p[1], BH + 6], onNet ? 30 : 0, 16, 'REFUSED', true, scale, 'msg-tag'));
  }
  return (
    floor +
    shadows.join('') +
    netBelt +
    room.far +
    art +
    byDepth(parts) +
    operator +
    room.near +
    names +
    pills.join('') +
    callout +
    calls.join('')
  );
};

/** The picture in words, for its aria-label. */
export function sandboxLabel(o: SandboxOpts): string {
  const msgs = sandboxMessages(o.run),
    upTo = o.upTo ?? msgs.length,
    m = msgs[upTo - 1];
  return [
    `Larkspur's back office as a glass room: the operator outside, the agent and the file store ${o.wall ? 'inside a walled sandbox' : 'on the open host'}, a file door, a network door to the world, and the secret ${o.proxy ? 'in a safe outside with the proxy' : 'in a safe inside'}.`,
    m
      ? `Step ${upTo} of ${msgs.length}: ${m.text}${m.stamp ? `, stamped ${m.stamp.toLowerCase()}` : ''}.`
      : 'Nothing run yet.',
    sandboxReadouts(o).join('; ') + '.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** The home hero's sandboxing plot: a small walled yard with the agent's desk inside and a gated door in its front wall, its lamp lit. */
export function glassRoomPlot(x: number, y: number, top: SceneCtx['top']): string {
  const r = 16,
    z = BH + 8,
    gap = 9;
  const wall = (x0: number, y0: number, x1: number, y1: number): Part => ({
    at: [(x0 + x1) / 2, (y0 + y1) / 2, 0],
    svg: box(x0, y0, BH, x1, y1, z, METAL, toneI, 0.6),
  });
  return (
    castShadow(boxCorners(x - 6, y - 10, BH, x + 6, y - 2, BH + 7), BH, top) +
    byDepth([
      wall(x - r, y - r - 1.2, x + r, y - r),
      wall(x - r - 1.2, y - r, x - r, y + r),
      wall(x + r, y - r, x + r + 1.2, y + r),
      wall(x - r, y + r, x - gap - 1.6, y + r + 1.2),
      wall(x + gap + 1.6, y + r, x + r, y + r + 1.2),
      {
        at: [x, y - 6, 0],
        svg:
          box(x - 6, y - 10, BH, x + 6, y - 2, BH + 7, WOOD, toneI, 0.9) +
          box(x - 3, y - 8, BH + 7, x + 3, y - 6, BH + 13, DARK, toneI, 0.8),
      },
      archAt([x, y + r + 0.6], [1, 0], 'ok'),
    ])
  );
}
