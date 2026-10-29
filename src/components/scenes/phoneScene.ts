// Module 17's picture: the phone desk (KTD16). A desk telephone with a curly cord (the caller's line) in front, the ear
// (speech-to-text) behind it as a gramophone whose horn listens, the model machine at the back, and the mouth
// (text-to-speech) in front of the model as a horn loudspeaker on an amplifier, joined in a loop
// by Tool calling's belts (officeScene's beltAt). What is said rides the belts: the caller's voice as a sound bubble from
// the phone to the ear, the transcript as a paper card to the model, the reply as a card to the mouth, and the spoken
// reply as a bubble back to the phone. A stopwatch in the middle shows the wait. Speech-to-speech folds the ear and the
// mouth into the model: one belt, sound both ways. Words only in pills.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, renderers, sayAt } from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  CERAMIC,
  DARK,
  METAL,
  box,
  cyl,
  rod,
  line,
  pd,
  on,
  PZ,
  ellUV,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  shape,
  WOOD,
  P,
  sp,
  hull,
  ink,
  loft,
  norm,
  cross,
  sub,
  vis,
} from '../../lib/iso/core.js';
import { hexa } from '../../lib/iso/figures';
import { beltAt, type Part } from './officeScene';
import type { Say } from '../story/steps';

export const PHONE_BOARD: Board = [0, 0, 200, 164];
type Station = 'phone' | 'ear' | 'model' | 'mouth';
const AT: Record<Station, number[]> = { phone: [52, 132], ear: [52, 36], model: [148, 36], mouth: [148, 132] };
const EDGE: Record<Station, number> = { phone: 17, ear: 15, model: 20, mouth: 15 };
const HT: Record<Station, number> = { phone: 14, ear: 22, model: 32, mouth: 20 };
const WATCH = [100, 84];
const LIT = { l: '#ffb627', m: '#ffb627', d: PALS.mustard.m };

export type Stage = 'idle' | 'caller' | 'stt' | 'model' | 'tts' | 'reply';
export type BeltId = 'phone-ear' | 'ear-model' | 'model-mouth' | 'mouth-phone' | 'phone-model' | 'model-phone';
export interface Bubble {
  belt: BeltId;
  kind: 'audio' | 'text';
  who: 'caller' | 'assistant';
}

export interface PhoneOpts {
  /** where the call is: the caller speaking, the ear writing it down, the model, the mouth, the reply on the line */
  stage: Stage;
  /** chained (ear, model, mouth) or one speech-to-speech model */
  mode?: 'chained' | 's2s';
  /** the stopwatch: ms from the caller's last word to the first sound (null or unset: at rest) */
  wait?: number | null;
  /** the caller talks over the reply */
  interrupt?: boolean;
  /** the host stopped speaking when the caller cut in (barge-in) */
  stopped?: boolean;
  /** speech-to-text was unsure of what it wrote (a flag on the transcript card) */
  unsure?: boolean;
  /** the step's callout, over one of PHONE_PARTS */
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name: the four stations (ear and mouth only when chained) and the stopwatch. */
export const PHONE_PARTS = ['phone', 'ear', 'model', 'mouth', 'watch'] as const;

export const secs = (v: number) => `${(v / 1000).toFixed(2)} s`;

/** What the desk shows. Pure, so the tests can check it without drawing. */
export function phoneState({ stage, mode = 'chained', interrupt }: PhoneOpts) {
  const s2s = mode === 's2s';
  const bubbles: Bubble[] = [];
  if (stage === 'caller') bubbles.push({ belt: s2s ? 'phone-model' : 'phone-ear', kind: 'audio', who: 'caller' });
  if (stage === 'stt')
    bubbles.push(
      s2s ? { belt: 'phone-model', kind: 'audio', who: 'caller' } : { belt: 'ear-model', kind: 'text', who: 'caller' },
    );
  if (stage === 'tts' && !s2s) bubbles.push({ belt: 'model-mouth', kind: 'text', who: 'assistant' });
  if (stage === 'reply' || (stage === 'tts' && s2s))
    bubbles.push({ belt: s2s ? 'model-phone' : 'mouth-phone', kind: 'audio', who: 'assistant' });
  if (interrupt) bubbles.push({ belt: s2s ? 'phone-model' : 'phone-ear', kind: 'audio', who: 'caller' });
  const busy: Station | undefined =
    stage === 'caller'
      ? 'phone'
      : stage === 'stt'
        ? s2s
          ? 'model'
          : 'ear'
        : stage === 'model'
          ? 'model'
          : stage === 'tts'
            ? s2s
              ? 'model'
              : 'mouth'
            : stage === 'reply'
              ? 'phone'
              : undefined;
  return { s2s, bubbles, busy };
}

// a belt between two stations: from a's edge to b's edge
const ends = (a: Station, b: Station) => {
  const [ax, ay] = AT[a],
    [bx, by] = AT[b],
    L = Math.hypot(bx - ax, by - ay),
    d = [(bx - ax) / L, (by - ay) / L];
  return {
    a: [ax + d[0] * EDGE[a], ay + d[1] * EDGE[a]],
    b: [bx - d[0] * EDGE[b], by - d[1] * EDGE[b]],
    n: [-d[1], d[0]],
  };
};
const BELTS: Record<BeltId, [Station, Station]> = {
  'phone-ear': ['phone', 'ear'],
  'ear-model': ['ear', 'model'],
  'model-mouth': ['model', 'mouth'],
  'mouth-phone': ['mouth', 'phone'],
  'phone-model': ['phone', 'model'],
  'model-phone': ['model', 'phone'],
};
const along = (id: BeltId, t: number, side = 0) => {
  const { a, b, n } = ends(...BELTS[id]);
  return [a[0] + (b[0] - a[0]) * t + n[0] * side, a[1] + (b[1] - a[1]) * t + n[1] * side];
};

const lamp = (x: number, y: number, z: number) => cyl(x, y, z, z + 2.2, 2.6, LIT, toneI, 0.8, 14);

type V = number[];
type Mat = { l: string; m: string; d: string };
/** A ring of radius r about centre c, square to direction d (no twist while d bends in a vertical plane). */
const ringAt = (c: V, d: V, r: number, n = 16) => {
  const u = norm(cross(d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])),
    v = cross(d, u);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI,
      a = Math.cos(t) * r,
      b = Math.sin(t) * r;
    return [c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, c[2] + u[2] * a + v[2] * b];
  });
};
/** A horn: a tube through pts flaring through radii rs. Each stretch's silhouette is inked wide first and the faces
 * paint over its inner half, so a bent horn keeps one clean outline; the bell shows its dark throat when it faces the
 * viewer. rim: the bell's lip colour. */
function horn(pts: V[], rs: number[], m: Mat, rim = m.m) {
  const dir = (i: number) => norm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
  const R = pts.map((p, i) => ringAt(p, dir(i), rs[i]));
  let edge = '',
    body = '';
  for (let i = 0; i + 1 < R.length; i++) {
    edge += ink(sp(hull([...R[i], ...R[i + 1]].map(q => P(q[0], q[1], q[2])))), 2.6);
    body += loft(R[i], R[i + 1], (n: V) => toneI(n, m));
  }
  const last = R[R.length - 1],
    d: V = dir(R.length - 1),
    c = pts[pts.length - 1],
    rb = rs[rs.length - 1];
  const bell = vis(d)
    ? shape(last, rim, 1.3) +
      shape(
        ringAt(
          sub(
            c,
            d.map((v: number) => v * 0.6),
          ),
          d,
          rb * 0.8,
        ),
        m.d,
        0,
      ) +
      shape(
        ringAt(
          sub(
            c,
            d.map((v: number) => v * 2),
          ),
          d,
          rb * 0.3,
        ),
        DARK.d,
        0,
      )
    : ink(pd(last), 1.1);
  return edge + body + bell;
}

/** The caller's line: a desk telephone. Real-object notes: a tomato body whose top slopes down to the front, a dial
 * plate on the slope with a ring of finger holes, the handset across two cradle forks at the back (an ear cup and a
 * mouth cup at its ends), and a curly cord from the handset down onto the desk and back into the body's side. */
function phone(lit: boolean): Part {
  const [x, y] = AT.phone,
    T = PALS.tomato,
    zf = BH + 5,
    zb = BH + 9.5,
    xb = x - 12,
    xf = x + 12,
    zAt = (xx: number) => zb + ((zf - zb) * (xx - xb)) / (xf - xb);
  let s = hexa(
    [
      [x - 13, y - 10, BH],
      [x + 13, y - 10, BH],
      [x + 13, y + 10, BH],
      [x - 13, y + 10, BH],
      [xb, y - 9, zb],
      [xf, y - 9, zf],
      [xf, y + 9, zf],
      [xb, y + 9, zb],
    ],
    T,
    1,
  );
  // the dial: a cream plate on the slope, a ring of finger holes, a metal hub (seen only from the slope's side)
  const sl = norm([xf - xb, 0, zf - zb]),
    dc = [x + 3, y, zAt(x + 3) + 0.15],
    disc = (c: V, r: number, n = 18) =>
      Array.from({ length: n }, (_, i) => {
        const t = (i / n) * 2 * Math.PI;
        return [c[0] + sl[0] * r * Math.cos(t), c[1] + r * Math.sin(t), c[2] + sl[2] * r * Math.cos(t)];
      });
  if (vis([-sl[2], 0, sl[0]])) {
    s += shape(disc(dc, 6.2), CERAMIC.l, 0.9);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 2 * Math.PI - 0.4;
      s += shape(
        disc(
          [dc[0] + sl[0] * 4.2 * Math.cos(a), dc[1] + 4.2 * Math.sin(a), dc[2] + sl[2] * 4.2 * Math.cos(a) + 0.05],
          0.9,
          8,
        ),
        DARK.d,
        0.3,
      );
    }
    s += shape(disc([dc[0], dc[1], dc[2] + 0.1], 1.8, 12), METAL.l, 0.6);
  }
  // cradle forks, then the handset: a grip across them and a cup at each end
  const hx = xb + 3,
    hz = zb + 4.5;
  for (const sy of [-1, 1])
    s += box(hx - 1.2, y + sy * 6 - 1, zb - 0.5, hx + 1.2, y + sy * 6 + 1, hz - 1.2, T, toneI, 0.7);
  s += rod([hx, y - 9, hz], [hx, y + 9, hz], 1.7, T, toneI, 1.1);
  for (const sy of [-1, 1])
    s += rod([hx, y + sy * 9, hz + 0.6], [hx + 1, y + sy * 9, hz - 3], 2.1, T, toneI, 1, 2.9, 14);
  // the curly cord: coils along a curve from the handset's mouth cup, down onto the desk, back into the body's side
  const a = [hx + 1, y + 10.5, hz - 3.5],
    b = [x + 4, y + 17, BH + 0.9],
    c = [x + 7, y + 10.2, BH + 2.5],
    q = (t: number) => [0, 1, 2].map(k => (1 - t) * (1 - t) * a[k] + 2 * (1 - t) * t * b[k] + t * t * c[k]);
  const coil = Array.from({ length: 73 }, (_, i) => {
    const t = i / 72,
      w = t * 2 * Math.PI * 9,
      p = q(t);
    return [p[0] + Math.cos(w) * 0.9, p[1] + Math.sin(w) * 0.5, p[2] + Math.sin(w) * 0.9];
  });
  const cd = pd(coil, false);
  const cord = `<path d="${cd}" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linejoin="round"/><path d="${cd}" fill="none" stroke="${T.d}" stroke-width=".8" stroke-linejoin="round"/>`;
  if (lit) s += lamp(xf - 3, y + 6.5, zAt(xf - 3));
  // the cord trails on +y: drawn over the body when that side faces the viewer, else hidden behind it
  const near = vis([0, 1, 0]);
  return {
    at: [x, y, 0],
    box: [
      [x - 13, y - 11, BH],
      [x + 13, y + 18, BH + 14],
    ],
    svg: `<g class="phone">${near ? '' : cord}${s}${hullInk(boxCorners(x - 13, y - 10, BH, x + 13, y + 10, BH + 7), 2)}${near ? cord : ''}</g>`,
  };
}

/** Speech-to-text: a gramophone. Real-object notes: a wooden cabinet with a winding crank on its side, a brass neck
 * rising from the top and bending into a big flared horn whose bell turns to the phone, to listen. */
function ear(lit: boolean): Part {
  const [x, y] = AT.ear,
    z1 = BH + 8;
  let s =
    box(x - 9, y - 9, BH, x + 9, y + 9, z1 - 1, WOOD, toneI, 1) +
    box(x - 9.6, y - 9.6, z1 - 1, x + 9.6, y + 9.6, z1, WOOD, toneI, 1);
  // the crank on whichever x side faces the viewer: a spindle, an arm, a knob
  const sx = vis([1, 0, 0]) ? 1 : -1,
    cx = x + sx * 9;
  s +=
    rod([cx, y - 2, BH + 4.5], [cx + sx * 2, y - 2, BH + 4.5], 0.6, METAL, toneI, 0.7) +
    rod([cx + sx * 2, y - 2, BH + 4.5], [cx + sx * 2, y - 2, BH + 9], 0.6, METAL, toneI, 0.7) +
    rod([cx + sx * 2, y - 2, BH + 9], [cx + sx * 3.6, y - 2, BH + 9], 0.9, DARK, toneI, 0.7);
  s += cyl(x, y - 4, z1, z1 + 1.4, 2.4, METAL, toneI, 0.8, 12);
  s += horn(
    [
      [x, y - 4, z1 + 1],
      [x, y - 4, z1 + 7],
      [x, y - 1.5, z1 + 11],
      [x, y + 2.5, z1 + 13.5],
      [x, y + 8, z1 + 15],
    ],
    [1.2, 1.6, 2.8, 5.6, 11],
    PALS.mustard,
  );
  if (lit) s += lamp(x - 5, y - 6, z1);
  return {
    at: [x, y, 0],
    box: [
      [x - 10, y - 10, BH],
      [x + 12, y + 18, BH + 35],
    ],
    svg: `<g class="ear">${s}</g>`,
  };
}

/** Text-to-speech: a loudspeaker. Real-object notes: a cobalt amplifier cabinet with a grille of slats, a bracket on
 * top holding a horn loudspeaker (a round driver at the back, a straight flared trumpet) aimed at the phone. Stopped:
 * the trumpet's lip turns tomato. */
function mouth(lit: boolean, stopped: boolean): Part {
  const [x, y] = AT.mouth,
    z1 = BH + 12,
    C = PALS.cobalt;
  let s = box(x - 11, y - 11, BH, x + 11, y + 11, z1, C, toneI, 1);
  // grille slats on whichever sides face the viewer
  for (const [n, k] of [
    [[1, 0, 0], x + 11.05],
    [[-1, 0, 0], x - 11.05],
    [[0, 1, 0], y + 11.05],
    [[0, -1, 0], y - 11.05],
  ] as [V, number][])
    if (vis(n))
      for (let i = 0; i < 4; i++) {
        const zz = BH + 3 + i * 2;
        s += line(
          n[0]
            ? [
                [k, y - 7, zz],
                [k, y + 7, zz],
              ]
            : [
                [x - 7, k, zz],
                [x + 7, k, zz],
              ],
          0.9,
        );
      }
  const d = norm([-0.45, 1, 0.12]),
    p0 = [x + 1, y - 6, z1 + 7],
    at = (t: number) => p0.map((v, k) => v + d[k] * t);
  s +=
    box(x - 0.5, y - 7.5, z1, x + 2.5, y - 4.5, z1 + 4.5, METAL, toneI, 0.8) +
    rod(at(-3), at(0.5), 3, DARK, toneI, 1, 3, 14) +
    horn([at(0), at(6), at(12), at(17)], [1.6, 2.8, 5, 8.6], METAL, stopped ? PALS.tomato.l : METAL.m);
  if (lit) s += lamp(x + 6, y + 6, z1);
  return {
    at: [x, y, 0],
    box: [
      [x - 20, y - 11, BH],
      [x + 11, y + 18, BH + 29],
    ],
    svg: `<g class="mouth"${stopped ? ' data-stopped="1"' : ''}>${s}${hullInk(boxCorners(x - 11, y - 11, BH, x + 11, y + 11, z1), 2)}</g>`,
  };
}

function model(lit: boolean): Part {
  const [x, y] = AT.model;
  return { at: [x, y, 0], svg: renderers.llm({ x, y, state: lit ? 'ok' : undefined }) };
}

/** The stopwatch, lying on the desk. Real-object notes: a metal case with a mustard bezel and a cream face with hour
 * pips (no numerals); at twelve o'clock a stem, a knurled crown and a hanging bow; a pusher button at two. The hand
 * turns with the wait (a turn per 3 s). */
function watch(wait: number | null | undefined): Part {
  const [x, y] = WATCH,
    z = BH + 5,
    r = 9,
    zc = BH + 2.6;
  // twelve o'clock is -y (the hand at zero points there)
  const bow = pd(
    Array.from({ length: 15 }, (_, i) => {
      const t = (i / 14) * Math.PI;
      return [x + Math.cos(t) * 3.2, y - r - 4.4 - Math.sin(t) * 3, zc];
    }),
    false,
  );
  const crown =
    rod([x, y - r + 0.5, zc], [x, y - r - 2, zc], 0.9, METAL, toneI, 0.8) +
    rod([x, y - r - 2, zc], [x, y - r - 4, zc], 2, PALS.mustard, toneI, 0.9, 2, 12) +
    `<path d="${bow}" fill="none" stroke="${INK}" stroke-width="2.2"/><path d="${bow}" fill="none" stroke="${METAL.l}" stroke-width="1"/>`;
  const pa = -Math.PI / 2 + Math.PI / 3,
    pusher = rod(
      [x + Math.cos(pa) * (r - 0.5), y + Math.sin(pa) * (r - 0.5), zc],
      [x + Math.cos(pa) * (r + 2.2), y + Math.sin(pa) * (r + 2.2), zc],
      1.1,
      PALS.mustard,
      toneI,
      0.8,
    );
  let s = cyl(x, y, BH, z - 1, r, METAL, toneI, 1.4, 28) + cyl(x, y, z - 1, z, r, PALS.mustard, toneI, 1.2, 28);
  s += `<path d="${pd(on(PZ(z + 0.1), ellUV(x, y, r - 1.6, r - 1.6, 28)))}" fill="${CERAMIC.l}" stroke="${INK}" stroke-width=".8"/>`;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI,
      r0 = i % 3 ? r - 3 : r - 3.8;
    s += line(
      [
        [x + Math.cos(a) * r0, y + Math.sin(a) * r0, z + 0.2],
        [x + Math.cos(a) * (r - 2.2), y + Math.sin(a) * (r - 2.2), z + 0.2],
      ],
      i % 3 ? 0.5 : 0.9,
    );
  }
  const a = -Math.PI / 2 + (((wait ?? 0) % 3000) / 3000) * 2 * Math.PI;
  s += line(
    [
      [x, y, z + 0.3],
      [x + Math.cos(a) * (r - 3.5), y + Math.sin(a) * (r - 3.5), z + 0.3],
    ],
    1.6,
  );
  s += `<path d="${pd(on(PZ(z + 0.35), ellUV(x, y, 0.9, 0.9, 10)))}" fill="${INK}"/>`;
  // the crown and pusher draw before the case on the far side, after it on the near side
  s = vis([0, -1, 0]) ? s + crown + pusher : crown + pusher + s;
  return {
    at: [x, y, 0],
    box: [
      [x - r, y - r - 8, BH],
      [x + r + 2, y + r, z + 1],
    ],
    svg: `<g class="watch">${s}</g>`,
  };
}

/** What rides a belt: a round sound bubble with waves over it, or a paper card with lines on it. */
function bubble(b: Bubble, p: number[], unsure: boolean): Part {
  const [x, y] = p,
    z = BH + 0.3,
    pal = b.who === 'caller' ? PALS.cobalt : PALS.mint;
  let s = castShadow(boxCorners(x - 5, y - 5, z, x + 5, y + 5, z + 4), z);
  if (b.kind === 'audio') {
    s += cyl(x, y, z, z + 5, 7, pal, toneI, 1, 18);
    for (const k of [2.5, 5])
      s += `<path d="${pd(on(PZ(z + 4.6), ellUV(x, y, k, k, 16)))}" fill="none" stroke="${INK}" stroke-width=".7"/>`;
  } else {
    s +=
      box(x - 8, y - 6, z, x + 8, y + 6, z + 1.8, CERAMIC, toneI, 0.9) +
      box(x - 8, y - 6, z + 1.8, x - 4.5, y + 6, z + 2.1, pal, toneI, 0.5);
    for (const v of [-3, 0, 3])
      s += line(
        [
          [x - 2.5, y + v, z + 1.9],
          [x + 6, y + v, z + 1.9],
        ],
        0.6,
      );
    if (unsure)
      s +=
        rod([x + 4, y - 3, z + 1.6], [x + 4, y - 3, z + 11], 0.5, DARK) +
        shape(
          [
            [x + 4, y - 3, z + 11],
            [x + 4, y - 3, z + 7],
            [x + 4, y + 3, z + 9],
          ],
          PALS.tomato.l,
          0.8,
        );
  }
  return {
    at: [x, y, 1],
    svg: `<g class="bubble" data-belt="${b.belt}" data-kind="${b.kind}" data-who="${b.who}"${unsure && b.kind === 'text' ? ' data-unsure="1"' : ''}>${s}</g>`,
  };
}

const pill = (p: number[], dy: number, text: string, lit: boolean, scale: number, cls = 'block-tag') =>
  `<g class="${cls}" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text), lit, scale)}</g>`;

/** The desk. Shadows and belts, then the parts back to front, then every pill on top. */
export const phoneScene =
  (o: PhoneOpts) =>
  ({ top }: SceneCtx) => {
    const st = phoneState(o),
      scale = o.scale ?? 1,
      narrow = scale > 1.5;
    const sh = (c: number[], r: number, h: number) =>
      castShadow(boxCorners(c[0] - r, c[1] - r, BH, c[0] + r, c[1] + r, BH + h), BH, top);
    let s = sh(AT.phone, 12, 10) + sh(AT.model, 17, 32) + sh(WATCH, 8, 5);
    if (!st.s2s)
      s +=
        sh(AT.ear, 9, 8) +
        castShadow(boxCorners(AT.ear[0] - 9, AT.ear[1] - 2, BH + 14, AT.ear[0] + 9, AT.ear[1] + 12, BH + 32), BH, top) +
        sh(AT.mouth, 11, 12) +
        castShadow(
          boxCorners(AT.mouth[0] - 16, AT.mouth[1] - 4, BH + 14, AT.mouth[0] + 3, AT.mouth[1] + 10, BH + 27),
          BH,
          top,
        );
    const belts: BeltId[] = st.s2s ? ['phone-model'] : ['phone-ear', 'ear-model', 'model-mouth', 'mouth-phone'];
    for (const id of belts) {
      const e = ends(...BELTS[id]);
      s += beltAt(e.a, e.b, e.n, false);
    }
    const parts: Part[] = [phone(st.busy === 'phone'), model(st.busy === 'model'), watch(o.wait)];
    if (!st.s2s) parts.push(ear(st.busy === 'ear'), mouth(st.busy === 'mouth', !!o.stopped));
    // bubbles ride most of the way to the receiving end; on the one speech-to-speech belt, the caller's and the reply's
    // bubbles ride side by side; a caller cutting in rides beside the reply
    st.bubbles.forEach((b, i) => {
      const back = b.belt === 'model-phone',
        t = back ? 0.4 : b.belt === 'phone-model' ? 0.55 : 0.5;
      const side = st.s2s ? (b.who === 'caller' ? -4 : 4) : i > 0 ? 7 : 0;
      parts.push(bubble(b, along(back ? 'phone-model' : b.belt, back ? 1 - t : t, side), !!o.unsure));
    });
    s += byDepth(parts);
    // callouts go on last, so no other pill hides one
    let callouts = sayAt(o.say, 'watch', [WATCH[0], WATCH[1], BH + 8], -12, scale);
    const name = (k: Station, text: string) => {
      const p = [AT[k][0], AT[k][1], BH + HT[k]],
        dy = -14 - (32 - HT[k]) * 0.4;
      callouts += sayAt(o.say, k, p, dy, scale);
      return pill(p, dy, text, st.busy === k, scale);
    };
    const pills = [
      name('phone', 'PHONE'),
      name('model', st.s2s ? (narrow ? 'S2S MODEL' : 'SPEECH-TO-SPEECH MODEL') : 'MODEL'),
      pill(
        [WATCH[0], WATCH[1], BH + 8],
        -12,
        o.wait == null ? (narrow ? '–' : 'WAIT –') : `${narrow ? '' : 'WAIT '}${secs(o.wait)}`,
        false,
        scale,
        'watch-tag',
      ),
    ];
    if (!st.s2s)
      pills.push(
        name('ear', narrow ? 'EAR' : 'EAR · SPEECH-TO-TEXT'),
        name(
          'mouth',
          narrow ? (o.stopped ? 'STOPPED' : 'MOUTH') : `MOUTH · ${o.stopped ? 'STOPPED' : 'TEXT-TO-SPEECH'}`,
        ),
      );
    else if (o.stopped) pills.push(pill([AT.model[0], AT.model[1], BH], 16, 'STOPPED', false, scale));
    if (o.interrupt && !o.stopped) {
      const p = along(st.s2s ? 'phone-model' : 'phone-ear', 0.3);
      pills.push(pill([p[0], p[1], BH + 5], 16, 'TALKING OVER', true, scale, 'msg-tag'));
    }
    return s + pills.join('') + callouts;
  };

/** The home hero's plot (heroScene): a small phone desk at (x, y). A squat telephone, a little gramophone ear and a
 * short belt. */
export function phonePlot(x: number, y: number, top: SceneCtx['top']): string {
  const t =
    box(x - 2, y - 2, BH, x + 16, y + 12, BH + 6, PALS.tomato, toneI, 1) +
    rod([x, y - 1, BH + 9], [x, y + 11, BH + 9], 1.8, PALS.tomato) +
    hullInk(boxCorners(x - 2, y - 2, BH, x + 16, y + 12, BH + 10), 1.6);
  const e =
    box(x - 18, y - 16, BH, x - 6, y - 4, BH + 5, WOOD, toneI, 1) +
    horn(
      [
        [x - 12, y - 12, BH + 5],
        [x - 12, y - 12, BH + 9],
        [x - 12, y - 9, BH + 12],
        [x - 12, y - 5, BH + 13],
      ],
      [0.8, 1.2, 2.6, 6],
      PALS.mustard,
    );
  return (
    castShadow(boxCorners(x - 2, y - 2, BH, x + 16, y + 12, BH + 8), BH, top) +
    castShadow(boxCorners(x - 19, y - 17, BH, x - 5, y - 3, BH + 9), BH, top) +
    beltAt([x - 12, y - 2], [x - 12, y + 8], [1, 0], false) +
    byDepth([
      { at: [x - 12, y - 10, 0], svg: e },
      { at: [x + 7, y + 5, 0], svg: t },
    ])
  );
}

/** The picture in words, for its aria-label. */
export function phoneLabel(o: PhoneOpts): string {
  const st = phoneState(o);
  const head = st.s2s
    ? 'Larkspur’s phone desk, speech to speech: the phone joined by one belt to a single model that hears and speaks'
    : 'Larkspur’s phone desk: the phone, an ear that turns speech into text, the model, and a mouth that turns text into speech, joined in a loop by belts';
  const words: Record<Stage, string> = {
    idle: 'Nothing on the line yet.',
    caller: 'The caller is speaking: their voice rides to the ' + (st.s2s ? 'model.' : 'ear.'),
    stt: st.s2s
      ? 'The model is listening to the caller’s voice.'
      : `The ear has written down what it heard and sends the transcript to the model${o.unsure ? ', flagged as unsure' : ''}.`,
    model: 'The model is writing its reply.',
    tts: st.s2s ? 'The model is speaking its reply.' : 'The reply’s text goes to the mouth to be spoken.',
    reply: 'The spoken reply rides back to the phone.',
  };
  return (
    `${head}. ${words[o.stage]}${o.interrupt ? (o.stopped ? ' The caller cut in, and the assistant stopped speaking.' : ' The caller is talking over the reply.') : ''}` +
    (o.wait == null ? '' : ` The stopwatch shows a wait of ${secs(o.wait)}.`)
  );
}
