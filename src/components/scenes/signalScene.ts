// The Releases module's picture: the signal box (U17). Larkspur's checkout traffic runs in from the left through the
// pipeline's gates (a gantry per gate, a lamp each: mint passed, tomato stopped), then a junction splits it onto two
// tracks: the old version at the back, the new one in front. Twenty shoppers stand along them, each one twentieth of
// the minute's checkouts: the share on the new track is lit mustard, and a shopper whose checkout failed this minute is
// tomato. The signal box behind the tracks holds the rollback lever (tomato and pulled while the way back is under
// way) and the check's lamp (tomato once the alarm rang). A semaphore by the junction is the feature flag: arm raised,
// on; level, off. Words only in pills; on phones (scale > 1.5) pills keep just the names and the caption carries the
// counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  CLEAR,
  METAL,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  hullInk,
  line,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { pct, tickOf, type Run } from '../../lib/releases/sim';
import type { Pipeline } from '../../lib/releases/pipeline';
import type { Say } from '../story/steps';

export const SIGNAL_BOARD: Board = [0, 6, 196, 92];
/** Shoppers drawn along the tracks; each is a twentieth of the minute's checkouts. */
export const SLOTS = 20;
/** The parts a step's callout may name. */
export const SIGNAL_PARTS = ['gates', 'old', 'new', 'box', 'flag'] as const;

export interface SignalOpts {
  /** the share of checkouts on the new track this minute */
  share: number;
  newN: number;
  newErr: number;
  oldN: number;
  oldErr: number;
  /** the way back is under way */
  backing: boolean;
  /** the check's alarm has rung */
  alarm: boolean;
  /** the lever was refused */
  refused?: boolean;
  /** the change's short name, for the new track's pill */
  name: string;
  /** chapter 2: the change on the entry track and how the gates judged it */
  pipeline?: Pipeline;
  /** the flag, when the change sits behind one: on while any share is released */
  flag?: boolean;
  say?: Say;
  scale?: number;
}

/** The picture as of minute t of a run. */
export function signalAt(r: Run, t: number): Omit<SignalOpts, 'say' | 'scale'> {
  const k = tickOf(r, t);
  return {
    share: k.share,
    newN: k.newN,
    newErr: k.newErr,
    oldN: k.oldN,
    oldErr: k.oldErr,
    backing: k.backing,
    alarm: r.alarmAt !== null && r.alarmAt <= k.t,
    ...(r.refusedAt !== null && r.refusedAt <= k.t ? { refused: true } : {}),
    name: r.change.short,
    ...(r.policy.flag ? { flag: k.share > 0 && !k.backing } : {}),
  };
}

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function signalState(o: SignalOpts) {
  const lit = Math.round(o.share * SLOTS),
    rest = SLOTS - lit;
  const failed = (err: number, n: number, of: number) =>
    err > 0 && of > 0 ? Math.min(of, Math.max(1, Math.round((err / n) * of))) : 0;
  return { lit, rest, newFailed: failed(o.newErr, o.newN, lit), oldFailed: failed(o.oldErr, o.oldN, rest) };
}

const OLD_Y = 40,
  NEW_Y = 70,
  ENTRY_Y = 55,
  X0 = 64,
  X1 = 192;
const GATE_X = [14, 28, 42];
const JUNCTION = 52;
const BOX = { x0: 96, x1: 118, y0: 10, y1: 22 };
const FLAG = [84, 80];
const slotX = (i: number) => X0 + 4 + i * ((X1 - X0 - 8) / (SLOTS - 1));
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
const OVER = '#f6c2b4';

/** A straight run of track along x at y: sleepers and two rails. */
function track(x0: number, x1: number, y: number) {
  let s = box(x0, y - 3, BH, x1, y + 3, BH + 0.6, WOOD, toneI, 0.6);
  for (const dy of [-1.8, 1.8])
    s += line(
      [
        [x0, y + dy, BH + 1],
        [x1, y + dy, BH + 1],
      ],
      0.7,
    );
  return s;
}
/** A track bent from the junction onto y, as a short diagonal. */
function bend(y: number) {
  return line(
    [
      [JUNCTION, ENTRY_Y, BH + 1],
      [X0, y, BH + 1],
    ],
    1.4,
  );
}

/** A shopper standing on a track: mustard on the new one, tomato when this minute's checkout failed. */
function shopper(x: number, y: number, isNew: boolean, failed: boolean, i: number) {
  const m = failed ? PALS.tomato : isNew ? PALS.mustard : PALS.cobalt;
  return {
    at: [x, y, 0],
    svg: `<g class="shopper${failed ? ' failed' : ''}" data-track="${isNew ? 'new' : 'old'}" data-slot="${i}">${cyl(x, y, BH + 1, BH + 9, 1.9, m, toneI, 0.9, 12)}${cyl(x, y, BH + 9, BH + 12, 1.4, CERAMIC, toneI, 0.8, 10)}</g>`,
  };
}

/** The pipeline: a gantry per gate over the entry track, each with its lamp, and the change's wagon where it stands. */
function gates(o: SignalOpts) {
  const p = o.pipeline;
  let s = '';
  GATE_X.forEach((x, i) => {
    const g = p?.gates[i],
      lamp = !g ? METAL : g.pass ? PALS.mint : PALS.tomato;
    s += `<g class="gate" data-gate="${i}" data-pass="${g ? (g.pass ? 1 : 0) : ''}">${box(x - 1, ENTRY_Y - 7, BH, x + 1, ENTRY_Y - 5, BH + 16, METAL, toneI, 0.8)}${box(x - 1, ENTRY_Y + 5, BH, x + 1, ENTRY_Y + 7, BH + 16, METAL, toneI, 0.8)}${box(x - 1.2, ENTRY_Y - 7, BH + 16, x + 1.2, ENTRY_Y + 7, BH + 18, METAL, toneI, 0.8)}${cyl(x, ENTRY_Y, BH + 18, BH + 21, 1.8, lamp, toneI, 0.8, 12)}</g>`;
  });
  if (p) {
    const at = p.stoppedAt ? GATE_X[p.gates.length - 1] - 6 : JUNCTION - 4;
    s += `<g class="wagon" data-ships="${p.ships ? 1 : 0}">${box(at - 4, ENTRY_Y - 3, BH + 1, at + 4, ENTRY_Y + 3, BH + 7, p.ships ? PALS.mustard : PALS.tomato, toneI, 0.9)}</g>`;
  }
  return { at: [28, ENTRY_Y, 0], svg: `<g data-prop="gates">${track(2, JUNCTION, ENTRY_Y)}${s}</g>` };
}

/** The signal box: a cabin with windows, the check's lamp on the roof, the lever in front. */
function signalBox(o: SignalOpts) {
  const { x0, x1, y0, y1 } = BOX,
    pulled = o.backing;
  let s = box(x0, y0, BH, x1, y1, BH + 12, WOOD, toneI, 1);
  s += box(x0, y0, BH + 12, x1, y1, BH + 22, CLEAR, toneI, 0.9);
  s += box(x0 - 1, y0 - 1, BH + 22, x1 + 1, y1 + 1, BH + 25, PALS.cobalt, toneI, 0.9);
  s += hullInk(boxCorners(x0 - 1, y0 - 1, BH, x1 + 1, y1 + 1, BH + 25), 2);
  s += `<g class="lamp${o.alarm ? ' alarm' : ''}">${cyl((x0 + x1) / 2, (y0 + y1) / 2, BH + 25, BH + 29, 2.2, o.alarm ? PALS.tomato : PALS.mint, toneI, 0.9, 14)}</g>`;
  const lx = x1 - 5,
    ly = y1 + 3;
  s += box(lx - 3, ly - 1.5, BH, lx + 3, ly + 1.5, BH + 2, METAL, toneI, 0.8);
  s += `<g class="lever${pulled ? ' pulled' : ''}">${line(
    [[lx, ly, BH + 2], pulled ? [lx + 7, ly, BH + 9] : [lx - 2, ly, BH + 12]],
    2.2,
  )}${cyl(pulled ? lx + 7 : lx - 2, ly, pulled ? BH + 8 : BH + 11, pulled ? BH + 10 : BH + 13, 1.4, pulled ? PALS.tomato : PALS.mustard, toneI, 0.8, 10)}</g>`;
  return {
    at: [(x0 + x1) / 2, y1, 0],
    svg: `<g data-prop="box" data-alarm="${o.alarm ? 1 : 0}" data-backing="${pulled ? 1 : 0}">${s}</g>`,
  };
}

/** The semaphore: a post with an arm, raised while the flag is on. */
function semaphore(on: boolean) {
  const [x, y] = FLAG;
  const arm = on
    ? box(x - 0.8, y - 0.6, BH + 24, x + 0.8, y + 0.6, BH + 34, PALS.mint, toneI, 0.8)
    : box(x, y - 0.6, BH + 24, x + 10, y + 0.6, BH + 26, PALS.tomato, toneI, 0.8);
  return {
    at: [x, y, 0],
    svg: `<g data-prop="flag" data-on="${on ? 1 : 0}">${box(x - 1, y - 1, BH, x + 1, y + 1, BH + 26, METAL, toneI, 0.9)}${arm}</g>`,
  };
}

/** The scene: shadows, then the parts back to front, then the pills. */
export const signalScene = (o: SignalOpts) => (ctx: SceneCtx) => {
  const st = signalState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = castShadow(boxCorners(BOX.x0 - 1, BOX.y0 - 1, BH, BOX.x1 + 1, BOX.y1 + 1, BH + 25), BH, ctx.top);
  const parts = [
    gates(o),
    signalBox(o),
    {
      at: [X0, OLD_Y - 4, 0],
      svg: `<g data-prop="old" data-shoppers="${st.rest}">${bend(OLD_Y)}${track(X0, X1, OLD_Y)}</g>`,
    },
    {
      at: [X0, NEW_Y - 4, 0],
      svg: `<g data-prop="new" data-shoppers="${st.lit}" data-share="${o.share}">${bend(NEW_Y)}${track(X0, X1, NEW_Y)}</g>`,
    },
    ...Array.from({ length: SLOTS }, (_, i) => {
      const isNew = i < st.lit,
        failed = isNew ? i < st.newFailed : i - st.lit < st.oldFailed;
      return shopper(slotX(i), isNew ? NEW_Y : OLD_Y, isNew, failed, i);
    }),
    ...(o.flag !== undefined ? [semaphore(o.flag)] : []),
  ];
  s += byDepth(parts);
  const oldEnd = [X1, OLD_Y, BH + 1],
    newEnd = [X1, NEW_Y, BH + 1],
    gateTop = [GATE_X[1], ENTRY_Y, BH + 21],
    roof = [(BOX.x0 + BOX.x1) / 2, (BOX.y0 + BOX.y1) / 2, BH + 29],
    flagTop = [FLAG[0], FLAG[1], BH + 26];
  const p = o.pipeline;
  let pills = pill(
    gateTop,
    0,
    -14,
    narrow || !p ? 'PIPELINE' : p.ships ? 'PIPELINE · PASSED' : 'PIPELINE · STOPPED',
    !!p,
    scale,
    p && !p.ships ? OVER : undefined,
  );
  pills += pill(oldEnd, -6, -16, narrow ? 'OLD' : `OLD · ${pct(1 - o.share)}`, false, scale);
  pills += pill(newEnd, -6, 18, narrow ? 'NEW' : `NEW · ${o.name.toUpperCase()} · ${pct(o.share)}`, o.share > 0, scale);
  pills += pill(
    roof,
    0,
    -14,
    narrow
      ? 'BOX'
      : o.refused && !o.backing
        ? 'BOX · CAN’T GO BACK'
        : o.backing
          ? 'BOX · ROLLING BACK'
          : o.alarm
            ? 'BOX · ALARM'
            : 'SIGNAL BOX',
    o.backing,
    scale,
    o.alarm || o.refused ? OVER : undefined,
  );
  if (o.flag !== undefined)
    pills += pill(flagTop, -8, -12, narrow ? 'FLAG' : `FLAG · ${o.flag ? 'ON' : 'OFF'}`, o.flag, scale);
  // the callout stands over its part, a row above the part's pill
  pills +=
    sayAt(o.say, 'gates', gateTop, -14, scale) +
    sayAt(o.say, 'old', oldEnd, -16, scale) +
    sayAt(o.say, 'new', [X1 - 30, NEW_Y, BH + 12], -12, scale) +
    sayAt(o.say, 'box', roof, -14, scale) +
    sayAt(o.say, 'flag', flagTop, -12, scale);
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function signalLabel(o: SignalOpts): string {
  const p = o.pipeline;
  return (
    `Larkspur’s checkout tracks. ${pct(o.share)} of checkouts on the new track (${o.name}), the rest on the old one. ` +
    `This minute ${o.newErr} of ${o.newN} new-track checkouts failed, and ${o.oldErr} of ${o.oldN} on the old track.` +
    (p ? ` The pipeline ${p.ships ? 'passed the change' : `stopped the change at ${p.gates.at(-1)!.name}`}.` : '') +
    (o.flag !== undefined ? ` The flag is ${o.flag ? 'on' : 'off'}.` : '') +
    (o.backing ? ' Rolling back.' : o.refused ? ' The lever was refused.' : o.alarm ? ' The alarm rang.' : '')
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function signalReadouts(o: SignalOpts): string[] {
  return [
    `${pct(o.share)} on new`,
    `new ${o.newErr}/${o.newN} failed`,
    `old ${o.oldErr}/${o.oldN} failed`,
    ...(o.backing ? ['rolling back'] : []),
  ];
}

/** The home card's picture (and the intro's hero): a canary on the new track, the rest on the old. */
export const signalCard = (r: Run, t: number, scale = 1.7): SignalOpts => ({ ...signalAt(r, t), scale });

/** The home hero's plot: a small signal box behind two short tracks, two lit shoppers on the new one, three on the
 * old. */
export function signalPlot(x: number, y: number, top: SceneCtx['top']): string {
  const rails = (ty: number) => box(x - 18, ty - 2, BH, x + 18, ty + 2, BH + 0.5, WOOD, toneI, 0.5);
  const who = (sx: number, sy: number, m: { l: string; m: string; d: string }) =>
    cyl(sx, sy, BH + 0.5, BH + 6.5, 1.5, m, toneI, 0.8, 10) +
    cyl(sx, sy, BH + 6.5, BH + 9, 1.1, CERAMIC, toneI, 0.7, 8);
  const cabin =
    box(x - 7, y - 16, BH, x + 7, y - 9, BH + 8, WOOD, toneI, 0.9) +
    box(x - 7, y - 16, BH + 8, x + 7, y - 9, BH + 13, CLEAR, toneI, 0.8) +
    box(x - 8, y - 17, BH + 13, x + 8, y - 8, BH + 15, PALS.cobalt, toneI, 0.8);
  return (
    castShadow(boxCorners(x - 8, y - 17, BH, x + 8, y - 8, BH + 15), BH, top) +
    byDepth([
      { at: [x, y - 12, 0], svg: cabin },
      { at: [x - 18, y - 2, 0], svg: rails(y - 2) },
      { at: [x - 18, y + 8, 0], svg: rails(y + 8) },
      ...[-12, -2, 8].map(dx => ({ at: [x + dx, y - 2, 1], svg: who(x + dx, y - 2, PALS.cobalt) })),
      ...[-12, -2].map(dx => ({ at: [x + dx, y + 8, 1], svg: who(x + dx, y + 8, PALS.mustard) })),
    ])
  );
}
