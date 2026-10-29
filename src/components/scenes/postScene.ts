// How email arrives' picture: the post room (U9). Along the back wall stand the servers that handed the message on,
// one cabinet per hop (at most six), lit mint once the reader has peeled its postmark. On the sorting desk lies the
// envelope with its postmarks (cobalt stamps; a peeled one leaves a pale ring). Behind the desk stand the checks:
// SPF's list board, DKIM's seal and DMARC's sign, each with a lamp (mint pass, tomato fail, metal none or not yet run),
// and the spam filter's gauge, filled to the message's score. In front sit three trays, inbox, junk and bounced; the
// letter lies in the one it ended in. Words only in pills; on phones (scale > 1.5) pills keep just the names and the
// caption carries the results.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  CLEAR,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  hullInk,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import type { Say } from '../story/steps';

export const POST_BOARD: Board = [0, 0, 190, 100];
/** Hops drawn at most (KTD13). */
export const MAX_HOPS = 6;
/** The parts a step's callout may name. */
export const POST_PARTS = [
  'hops',
  'envelope',
  'postmarks',
  'spf',
  'dkim',
  'dmarc',
  'spam',
  'inbox',
  'junk',
  'bounce',
] as const;

/** A check's lamp: pass, fail, or off (no record, or not run yet). */
export type Lamp = 'pass' | 'fail' | 'off';
export type Tray = 'inbox' | 'junk' | 'bounced';
export interface PostOpts {
  /** the From line's domain, for the envelope's pill */
  from: string;
  hops: number;
  /** postmarks peeled, from the bottom */
  peeled: number;
  /** each check's lamp and its word for the pill; absent: the check isn't in this picture */
  spf?: [Lamp, string];
  dkim?: [Lamp, string];
  dmarc?: [Lamp, string];
  /** the spam filter's score, 0 to 1, and its words */
  spam?: [number, string];
  /** where the letter ended; absent: still on the desk */
  fate?: Tray;
  say?: Say;
  scale?: number;
}

const HOP_X = (i: number) => 18 + i * 27,
  HOP_Y = 10;
const DESK = { x0: 14, x1: 86, y0: 40, y1: 72 },
  ENV = { x0: 24, x1: 76, y0: 46, y1: 66 };
const CHECK_Y = 38,
  CHECK_X = { spf: 100, dkim: 128, dmarc: 156 },
  GAUGE = [182, 38];
const TRAY_Y = 86,
  TRAY_X: Record<Tray, number> = { inbox: 108, junk: 136, bounced: 164 };
const TRAY_PAL: Record<Tray, { l: string; m: string; d: string }> = {
  inbox: PALS.mint,
  junk: PALS.mustard,
  bounced: PALS.tomato,
};
const LAMP = { pass: PALS.mint, fail: PALS.tomato, off: METAL };
const OVER = '#f6c2b4';
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
/** the stamps across the envelope's top edge, first hop at the left */
export const stampX = (i: number, n: number) => ENV.x0 + 6 + i * ((ENV.x1 - ENV.x0 - 12) / Math.max(1, n - 1));

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function postState(o: PostOpts) {
  const hops = Math.min(MAX_HOPS, o.hops);
  return { hops, peeled: Math.min(hops, o.peeled), more: o.hops - hops };
}

function cabinet(i: number, lit: boolean) {
  const x = HOP_X(i);
  return {
    at: [x, HOP_Y, 0],
    svg: `<g class="hop${lit ? ' lit' : ''}" data-hop="${i}" data-lit="${lit ? 1 : 0}">${box(x - 6, HOP_Y - 5, BH, x + 6, HOP_Y + 5, BH + 18, lit ? PALS.mint : METAL, toneI, 0.9)}${box(x - 4, HOP_Y + 5, BH + 12, x + 4, HOP_Y + 5.4, BH + 15, lit ? PALS.mustard : CLEAR, toneI, 0.6)}</g>`,
  };
}

function desk(o: PostOpts) {
  const st = postState(o),
    top = BH + 10;
  let s = box(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, top, WOOD, toneI, 1);
  const onDesk = !o.fate;
  if (onDesk)
    s += `<g data-prop="envelope">${box(ENV.x0, ENV.y0, top, ENV.x1, ENV.y1, top + 1.2, CERAMIC, toneI, 0.9)}</g>`;
  else s += '<g data-prop="envelope"></g>';
  let stamps = '';
  for (let i = 0; i < st.hops; i++) {
    const peeled = i < st.peeled,
      x = stampX(i, st.hops),
      y = ENV.y0 + 5,
      z = top + 1.2;
    stamps += `<g class="postmark${peeled ? ' peeled' : ''}" data-postmark="${i}" data-peeled="${peeled ? 1 : 0}">${
      onDesk ? cyl(x, y, z, z + (peeled ? 0.3 : 1.6), 3.2, peeled ? CLEAR : PALS.cobalt, toneI, 0.8, 16) : ''
    }</g>`;
  }
  return {
    at: [(DESK.x0 + DESK.x1) / 2, DESK.y1, 0],
    svg: `<g data-prop="desk">${s}<g data-prop="postmarks">${stamps}</g></g>`,
  };
}

function check(name: 'spf' | 'dkim' | 'dmarc', lamp: Lamp | undefined) {
  const x = CHECK_X[name],
    y = CHECK_Y,
    on = lamp ?? 'off';
  let s = '';
  if (name === 'spf') {
    s += box(x - 7, y - 1, BH, x + 7, y + 1, BH + 22, WOOD, toneI, 0.9);
    for (const dz of [6, 10, 14]) s += box(x - 5, y + 1, BH + dz, x + 5, y + 1.3, BH + dz + 1.6, CERAMIC, toneI, 0.4);
  } else if (name === 'dkim') {
    s += cyl(x, y, BH, BH + 12, 5, PALS.blush, toneI, 0.9, 18);
    s += cyl(x, y, BH + 12, BH + 16, 2, WOOD, toneI, 0.8, 12);
  } else {
    s += box(x - 1, y - 1, BH, x + 1, y + 1, BH + 16, METAL, toneI, 0.8);
    s += box(x - 7, y - 1.2, BH + 16, x + 7, y + 1.2, BH + 24, PALS.cobalt, toneI, 0.9);
  }
  const lz = name === 'dkim' ? BH + 16 : BH + (name === 'spf' ? 22 : 24);
  s += cyl(x + (name === 'dkim' ? 0 : 5), y, lz, lz + 3, 1.8, LAMP[on], toneI, 0.8, 12);
  return { at: [x, y, 0], svg: `<g data-prop="${name}" data-lamp="${lamp ?? ''}">${s}</g>` };
}

function gauge(score: number | undefined) {
  const [x, y] = GAUGE,
    h = 22,
    level = score === undefined ? 0 : Math.max(0.6, score * h);
  let s = cyl(x, y, BH, BH + h, 4.5, CLEAR, toneI, 0.9, 18);
  if (score !== undefined) s += cyl(x, y, BH, BH + level, 3.6, score >= 0.5 ? PALS.tomato : PALS.mint, toneI, 0.6, 16);
  return { at: [x, y, 0], svg: `<g data-prop="spam" data-score="${score ?? ''}">${s}</g>` };
}

function tray(t: Tray, holds: boolean) {
  const x = TRAY_X[t],
    y = TRAY_Y,
    part = t === 'bounced' ? 'bounce' : t;
  let s = box(x - 10, y - 7, BH, x + 10, y + 7, BH + 2, TRAY_PAL[t], toneI, 0.9);
  for (const [a, b, c, d] of [
    [x - 10, y - 7, x + 10, y - 6],
    [x - 10, y + 6, x + 10, y + 7],
    [x - 10, y - 7, x - 9, y + 7],
    [x + 9, y - 7, x + 10, y + 7],
  ])
    s += box(a, b, BH + 2, c, d, BH + 5, TRAY_PAL[t], toneI, 0.7);
  if (holds) s += `<g class="letter">${box(x - 7, y - 4.5, BH + 2, x + 7, y + 4.5, BH + 3.4, CERAMIC, toneI, 0.8)}</g>`;
  return { at: [x, y, 0], svg: `<g data-prop="${part}" data-holds="${holds ? 1 : 0}">${s}</g>` };
}

const WORD: Record<Lamp, string> = { pass: 'PASS', fail: 'FAIL', off: 'NONE' };

/** The scene: shadows, then the parts back to front, then the pills. */
export const postScene = (o: PostOpts) => (ctx: SceneCtx) => {
  const st = postState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = castShadow(boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, BH + 10), BH, ctx.top);
  s += hullInk(boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, BH + 10), 2);
  const parts = [
    {
      at: [HOP_X(0), HOP_Y - 6, 0],
      svg: `<g data-prop="hops" data-hops="${st.hops}" data-lit="${st.peeled}"></g>`,
    },
    ...Array.from({ length: st.hops }, (_, i) => cabinet(i, i < st.peeled)),
    desk(o),
    ...(o.spf ? [check('spf', o.spf[0])] : []),
    ...(o.dkim ? [check('dkim', o.dkim[0])] : []),
    ...(o.dmarc ? [check('dmarc', o.dmarc[0])] : []),
    ...(o.spam ? [gauge(o.spam[0])] : []),
    ...(['inbox', 'junk', 'bounced'] as Tray[]).map(t => tray(t, o.fate === t)),
  ];
  s += byDepth(parts);
  const top = BH + 10;
  const hopTop = [HOP_X(Math.max(0, st.hops - 1) / 2), HOP_Y, BH + 18],
    envTop = [(ENV.x0 + ENV.x1) / 2, (ENV.y0 + ENV.y1) / 2, top + 1.2],
    stampTop = [stampX(0, st.hops), ENV.y0 + 5, top + 2];
  const lampTop = (name: 'spf' | 'dkim' | 'dmarc') => [CHECK_X[name], CHECK_Y, BH + 26];
  const gaugeTop = [GAUGE[0], GAUGE[1], BH + 22],
    trayTop = (t: Tray) => [TRAY_X[t], TRAY_Y, BH + 5];
  const hopText = narrow ? 'HOPS' : `HOPS · ${st.peeled} OF ${st.hops}${st.more ? ` · +${st.more}` : ''}`;
  let pills = pill(hopTop, 0, -14, hopText, st.peeled > 0 && st.peeled === st.hops, scale);
  if (!o.fate) pills += pill(envTop, -10, 22, narrow ? 'FROM' : `FROM · ${o.from.toUpperCase()}`, false, scale);
  for (const name of ['spf', 'dkim', 'dmarc'] as const) {
    const c = o[name];
    if (!c) continue;
    const [lamp, word] = c;
    pills += pill(
      lampTop(name),
      0,
      name === 'dkim' ? 22 : -14,
      narrow ? name.toUpperCase() : `${name.toUpperCase()} · ${word || WORD[lamp]}`,
      lamp === 'pass',
      scale,
      lamp === 'fail' ? OVER : undefined,
    );
  }
  if (o.spam)
    pills += pill(
      gaugeTop,
      6,
      26,
      narrow ? 'SPAM' : `SPAM · ${o.spam[1]}`,
      false,
      scale,
      o.spam[0] >= 0.5 ? OVER : undefined,
    );
  for (const t of ['inbox', 'junk', 'bounced'] as Tray[])
    pills += pill(trayTop(t), 0, 14, t.toUpperCase(), o.fate === t, scale);
  // the callout stands over its part, a row above the part's pill
  pills +=
    sayAt(o.say, 'hops', hopTop, -14, scale) +
    sayAt(o.say, 'envelope', envTop, -2, scale) +
    sayAt(o.say, 'postmarks', stampTop, -6, scale) +
    sayAt(o.say, 'spf', lampTop('spf'), -14, scale) +
    sayAt(o.say, 'dkim', lampTop('dkim'), -14, scale) +
    sayAt(o.say, 'dmarc', lampTop('dmarc'), -14, scale) +
    sayAt(o.say, 'spam', gaugeTop, -14, scale) +
    sayAt(o.say, 'inbox', trayTop('inbox'), -6, scale) +
    sayAt(o.say, 'junk', trayTop('junk'), -6, scale) +
    sayAt(o.say, 'bounce', trayTop('bounced'), -6, scale);
  return s + pills;
};

const LAMP_WORD: Record<Lamp, string> = { pass: 'passed', fail: 'failed', off: 'has nothing to check' };

/** The picture in words, for its aria-label. */
export function postLabel(o: PostOpts): string {
  const st = postState(o);
  const checks = (['spf', 'dkim', 'dmarc'] as const)
    .filter(n => o[n])
    .map(n => `${n.toUpperCase()} ${LAMP_WORD[o[n]![0]]}.`);
  return [
    `Hollis’s post room. A message from ${o.from}, ${st.hops} hops, ${st.peeled} postmarks peeled.`,
    ...checks,
    ...(o.spam ? [`Spam score ${o.spam[1]}.`] : []),
    o.fate ? `It ended in ${o.fate === 'bounced' ? 'the bounced tray' : o.fate}.` : 'It is on the sorting desk.',
  ].join(' ');
}

/** The results the caption carries (phones show only the names in the pills). */
export function postReadouts(o: PostOpts): string[] {
  return [
    `${o.peeled} of ${o.hops} postmarks`,
    ...(['spf', 'dkim', 'dmarc'] as const)
      .filter(n => o[n])
      .map(n => `${n.toUpperCase()} ${(o[n]![1] || WORD[o[n]![0]]).toLowerCase()}`),
    ...(o.spam ? [`spam ${o.spam[1]}`] : []),
    ...(o.fate ? [o.fate] : []),
  ];
}

/** The home hero's plot: a small sorting desk with an envelope and two stamps, and an inbox tray beside it. */
export function postPlot(x: number, y: number, top: SceneCtx['top']): string {
  const deskTop = BH + 7;
  return (
    castShadow(boxCorners(x - 16, y - 10, BH, x + 4, y + 8, deskTop), BH, top) +
    byDepth([
      {
        at: [x - 6, y + 8, 0],
        svg:
          box(x - 16, y - 10, BH, x + 4, y + 8, deskTop, WOOD, toneI, 0.9) +
          box(x - 13, y - 6, deskTop, x + 1, y + 4, deskTop + 0.8, CERAMIC, toneI, 0.8) +
          cyl(x - 9, y - 3, deskTop + 0.8, deskTop + 2, 1.8, PALS.cobalt, toneI, 0.7, 12) +
          cyl(x - 4, y - 3, deskTop + 0.8, deskTop + 2, 1.8, PALS.cobalt, toneI, 0.7, 12),
      },
      {
        at: [x + 14, y, 0],
        svg:
          box(x + 8, y - 6, BH, x + 20, y + 6, BH + 2, PALS.mint, toneI, 0.8) +
          box(x + 10, y - 4, BH + 2, x + 18, y + 4, BH + 3, CERAMIC, toneI, 0.7),
      },
    ])
  );
}
