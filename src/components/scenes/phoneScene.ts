// Module 17's picture: the phone desk (KTD16). A telephone (the caller's line) in front, an ear (speech-to-text) behind it,
// the model (RAG's LLM block, composed) at the back, and a mouth (text-to-speech) in front of the model, joined in a loop
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
} from '../../lib/iso/core.js';
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

/** The caller's line: a desk telephone, its handset on the cradle. */
function phone(lit: boolean): Part {
  const [x, y] = AT.phone,
    z1 = BH + 8;
  let s = box(x - 13, y - 10, BH, x + 13, y + 10, z1, PALS.tomato, toneI, 1);
  s += box(x - 6, y - 7, z1, x + 8, y + 7, z1 + 3, DARK, toneI, 0.8); // the dial plate
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI;
    s += `<path d="${pd(on(PZ(z1 + 3.05), ellUV(x + 1 + Math.cos(a) * 4, y + Math.sin(a) * 4, 0.9, 0.9, 8)))}" fill="${CERAMIC.l}" stroke="${INK}" stroke-width=".5"/>`;
  }
  s +=
    rod([x - 9, y - 9, z1 + 5], [x - 9, y + 9, z1 + 5], 2.4, PALS.tomato) +
    box(x - 11, y - 11, z1, x - 7, y - 7, z1 + 5, PALS.tomato, toneI, 0.7) +
    box(x - 11, y + 7, z1, x - 7, y + 11, z1 + 5, PALS.tomato, toneI, 0.7);
  if (lit) s += lamp(x + 10, y + 7, z1);
  return {
    at: [x, y, 0],
    svg: `<g class="phone">${s}${hullInk(boxCorners(x - 13, y - 11, BH, x + 13, y + 11, z1 + 6), 2)}</g>`,
  };
}

/** Speech-to-text: a mint drum with an ear trumpet turned to the phone. */
function ear(lit: boolean): Part {
  const [x, y] = AT.ear,
    z1 = BH + 12;
  let s = cyl(x, y, BH, z1, 11, PALS.mint, toneI, 1.4);
  s +=
    rod([x, y + 2, z1 + 3], [x, y + 16, z1 + 7], 2, METAL, toneI, 1, 6.5) + cyl(x, y, z1, z1 + 3, 4, METAL, toneI, 0.9);
  if (lit) s += lamp(x - 5, y - 5, z1);
  return { at: [x, y, 0], svg: `<g class="ear">${s}</g>` };
}

/** Text-to-speech: a cobalt cabinet with a speaker cone turned to the phone. */
function mouth(lit: boolean, stopped: boolean): Part {
  const [x, y] = AT.mouth,
    z1 = BH + 16;
  let s = box(x - 11, y - 11, BH, x + 11, y + 11, z1, PALS.cobalt, toneI, 1);
  s += rod([x - 6, y, BH + 9], [x - 17, y, BH + 9], 2.5, METAL, toneI, 1, 6.5);
  // a stopped mouth: a red bar across the top
  s += stopped ? box(x - 9, y - 3, z1, x + 9, y + 3, z1 + 2, PALS.tomato, toneI, 0.8) : '';
  if (lit) s += lamp(x + 5, y + 5, z1);
  return {
    at: [x, y, 0],
    svg: `<g class="mouth"${stopped ? ' data-stopped="1"' : ''}>${s}${hullInk(boxCorners(x - 11, y - 11, BH, x + 11, y + 11, z1), 2)}</g>`,
  };
}

function model(lit: boolean): Part {
  const [x, y] = AT.model;
  return { at: [x, y, 0], svg: `<g class="model">${renderers.llm({ x, y, state: lit ? 'ok' : undefined })}</g>` };
}

/** The stopwatch: a mustard drum with a face, a hand and a button on top; the hand turns with the wait (a turn per 3 s). */
function watch(wait: number | null | undefined): Part {
  const [x, y] = WATCH,
    z = BH + 6,
    r = 9;
  let s = cyl(x, y, BH, z, r, PALS.mustard, toneI, 1.4) + cyl(x - 6, y - 6, z - 2, z + 2, 1.8, METAL, toneI, 0.8);
  s += `<path d="${pd(on(PZ(z + 0.1), ellUV(x, y, r - 2, r - 2, 24)))}" fill="${CERAMIC.l}" stroke="${INK}" stroke-width=".8"/>`;
  const a = -Math.PI / 2 + (((wait ?? 0) % 3000) / 3000) * 2 * Math.PI;
  s += line(
    [
      [x, y, z + 0.3],
      [x + Math.cos(a) * (r - 3.5), y + Math.sin(a) * (r - 3.5), z + 0.3],
    ],
    1.6,
  );
  return { at: [x, y, 0], svg: `<g class="watch">${s}</g>` };
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
    let s = sh(AT.phone, 12, 12) + sh(AT.model, 17, 32) + sh(WATCH, 8, 6);
    if (!st.s2s) s += sh(AT.ear, 10, 12) + sh(AT.mouth, 11, 16);
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

/** The home hero's plot (heroScene): a small phone desk at (x, y). A squat telephone, a mint ear drum and a short belt. */
export function phonePlot(x: number, y: number, top: SceneCtx['top']): string {
  const t =
    box(x - 2, y - 2, BH, x + 16, y + 12, BH + 6, PALS.tomato, toneI, 1) +
    rod([x, y - 1, BH + 9], [x, y + 11, BH + 9], 1.8, PALS.tomato) +
    hullInk(boxCorners(x - 2, y - 2, BH, x + 16, y + 12, BH + 10), 1.6);
  const e =
    cyl(x - 12, y - 10, BH, BH + 9, 7, PALS.mint, toneI, 1.2) +
    rod([x - 12, y - 8, BH + 11], [x - 12, y + 2, BH + 13], 1.4, METAL, toneI, 0.9, 4.5);
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
