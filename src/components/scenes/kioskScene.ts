// Before GenAI's picture: Larkspur's help counter (U3), three stations in one fixed frame, each a bot on the same
// customer message. At the left the hero, the scripted help kiosk: a cobalt pedestal with a button panel on top and,
// behind the buttons, a rack of fixed reply cards (one per rule, the tomato "sorry" card last); the card the kiosk
// answers with stands raised. In the middle the sorting rack: a pallet of five bins, one per Labelling intent, and a
// tomato reject tub; the message's card lies in the bin the intent bot chose, or in the reject tub when it fell back.
// At the right the model machine, the GenAI bot. A customer holds a blank message card in front. The stations that
// answered stand on lit mats. One run (bots.ts) feeds this and the flat view, so they never disagree. Words only in
// pills (bot names, intents, answered / fell back); the sentences live in the story column (R17). esc() on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import { CERAMIC, DARK, PALS, WOOD, box, castShadow, cyl, matOf, tag, toneI } from '../../lib/iso/core.js';
import { bin, drawPieces, type Item, mini, modelMachine, type Piece, person, tight } from '../../lib/iso/figures';
import { card, flatPill, lane, type Msg } from '../../lib/iso/flat';
import { RULES, type Run } from '../../lib/before-genai/bots';
import { INTENTS } from '../../lib/labelling/story';
import { gauge, tray } from './postScene';
import { shelfPiece } from './shelfScene';
import type { Say } from '../story/steps';

export const KIOSK_BOARD: Board = [2, 6, 200, 90];
/** The three bots, in the order the picture and the flat view show them. */
export const STATIONS = [
  { id: 'script', name: 'Script' },
  { id: 'sorter', name: 'Sorter' },
  { id: 'genai', name: 'GenAI' },
] as const;
export type Station = (typeof STATIONS)[number]['id'];
export type Outcome = 'answered' | 'fell back' | 'not recorded';
/** The parts a step's callout may name. */
export const KIOSK_PARTS = ['kiosk', 'cards', 'sorter', 'model', 'customer'] as const;

export interface KioskOpts {
  run: Run;
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** What each bot did with the run's message: the one reading both views share. */
export function outcomes(r: Run): Record<Station, Outcome> {
  return {
    script: r.scripted.answered ? 'answered' : 'fell back',
    sorter: r.intent.answered ? 'answered' : 'fell back',
    genai: r.genai.recorded ? 'answered' : 'not recorded',
  };
}

// the kiosk at the back left, the sorting rack mid-back, the model machine back right, the customer in front
const K = { x: 28, y: 32 },
  KZ = BH + 24, // the button panel's top
  CARD_W = 3,
  RACK = { x0: 64, x1: 155, y0: 26, y1: 42 },
  BIN_X = (i: number) => 72 + i * 15,
  BIN_Y = 34,
  MODEL = { x: 180, y: 32, size: 0.62 },
  WHO = { x: 50, y: 66 };
const OVER = '#f6c2b4';
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** The scripted kiosk: plinth, cobalt pedestal, buttons on its top, and the card rack behind them. `raised`: the rule
 * id whose card stands up, or 'sorry'. Its reply cards are the rules in order, then the sorry card. */
function kiosk(raised: string | null): Item {
  const { x, y } = K,
    ids = [...RULES.map(r => r.id), 'sorry'];
  let s = box(x - 13, y - 9, BH, x + 13, y + 9, BH + 2, DARK, toneI, 0.9);
  s += box(x - 11, y - 8, BH + 2, x + 11, y + 8, KZ, PALS.cobalt, toneI, 1.1);
  // the card ledge along the back of the top, then the cards standing in it, then the buttons in front of it
  s += box(x - 11, y - 8, KZ, x + 11, y - 4, KZ + 3, WOOD, toneI, 0.9);
  const x0 = x - ((ids.length - 1) * (CARD_W + 0.6)) / 2;
  let cards = '';
  ids.forEach((id, i) => {
    const cx = x0 + i * (CARD_W + 0.6),
      up = id === raised,
      sorry = id === 'sorry',
      z0 = KZ + 2 + (up ? 6 : 0),
      m = up && !sorry ? matOf(ACC) : sorry ? PALS.tomato : CERAMIC;
    cards += `<g data-card="${esc(id)}"${up ? ' data-up="1"' : ''}>${box(cx - CARD_W / 2, y - 6.6, z0, cx + CARD_W / 2, y - 5.6, z0 + 9, m, toneI, 0.7)}</g>`;
  });
  s += `<g data-part="cards" data-raised="${esc(raised ?? '')}">${cards}</g>`;
  const tones = [PALS.mustard, PALS.mint, PALS.tomato, PALS.blush, PALS.mint, PALS.mustard];
  tones.forEach((m, i) => {
    const bx = x - 6 + (i % 3) * 6,
      by = y + (i < 3 ? -0.5 : 4.5);
    s += cyl(bx, by, KZ, KZ + 1.2, 1.7, m, toneI, 0.7, 12);
  });
  return {
    box: [
      [x - 13, y - 9, BH],
      [x + 13, y + 9, KZ + 17],
    ],
    svg: `<g data-part="kiosk">${tight(s)}</g>`,
  };
}

/** A blank message card: a white slip with a mustard edge, lying in a bin (z its floor) or held. */
const slip = (x: number, y: number, z: number) =>
  box(x - 2.6, y - 1.8, z, x + 2.6, y + 1.8, z + 0.8, CERAMIC, toneI, 0.6);

/** The sorting rack: a pallet, one bin per intent and the tomato reject tub at the end; `holds`: the intent whose bin
 * holds the card, or 'reject'. */
function sorter(holds: string): Piece {
  const { x0, x1, y0, y1 } = RACK,
    pallet: Item = {
      box: [
        [x0, y0, BH],
        [x1, y1, BH + 2],
      ],
      // the rack's state, for the tests and the label
      svg: `<g data-part="sorter" data-bin="${esc(holds)}">${box(x0, y0, BH, x1, y1, BH + 2, WOOD, toneI, 0.9)}</g>`,
    };
  const tubs = [...INTENTS.map(i => i.id), 'reject'].map((id, i) =>
    bin({
      x: BIN_X(i),
      y: BIN_Y,
      z: BH + 2,
      r: id === 'reject' ? 4.6 : 5,
      h: id === 'reject' ? 6 : 9,
      pal: id === 'reject' ? PALS.tomato : id === holds ? matOf(ACC) : undefined,
      contents: id === holds ? slip(BIN_X(i), BIN_Y, BH + 2.5) : '',
    }),
  );
  return {
    shadow: castShadow(boxCorners(x0, y0, BH, x1, y1, BH + 2), BH) + tubs.map(t => t.shadow).join(''),
    items: [pallet, ...tubs.flatMap(t => t.items)],
    box: [
      [x0, y0, BH],
      [x1, y1, BH + 11],
    ],
  };
}

/** The customer, holding a blank card in both hands. */
function customer(): Piece {
  const p = person({ x: WHO.x, y: WHO.y, facing: 300, pose: 'carry', look: 'shopper2', holding: null });
  const cx = WHO.x + 3,
    cy = WHO.y - 5,
    z = BH + 17;
  const held: Item = {
    box: [
      [cx - 3, cy - 0.5, z],
      [cx + 3, cy + 0.5, z + 7],
    ],
    svg: `<g data-part="message">${box(cx - 3, cy - 0.4, z, cx + 3, cy + 0.4, z + 7, CERAMIC, toneI, 0.8)}</g>`,
  };
  return { ...p, items: [...p.items, held] };
}

/** A floor mat under a station: accent when it answered. */
const mat = (id: Station, lit: boolean, x0: number, y0: number, x1: number, y1: number) =>
  `<g data-station="${id}" data-lit="${lit ? 1 : 0}">${box(x0, y0, BH, x1, y1, BH + 0.3, lit ? matOf(ACC) : matOf('#e9e2d0'), toneI, 0.6)}</g>`;

const WORD: Record<Outcome, string> = {
  answered: 'ANSWERED',
  'fell back': 'FELL BACK',
  'not recorded': 'NOT RECORDED',
};

/** The help counter. Mats, shadows, then every piece in one depth sort, then the pills (callouts last). */
export const kioskScene = (o: KioskOpts) => (ctx: SceneCtx) => {
  const r = o.run,
    out = outcomes(r),
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    holds = r.intent.answered ? r.intent.intent : 'reject',
    raised = r.scripted.answered ? r.scripted.rule! : 'sorry';
  const machine = modelMachine(MODEL.x, MODEL.y, MODEL.size, r.genai.recorded ? 'ok' : undefined);
  const k = kiosk(raised);
  const mats =
    mat('script', out.script === 'answered', K.x - 17, K.y - 13, K.x + 17, K.y + 13) +
    mat('sorter', out.sorter === 'answered', RACK.x0 - 4, RACK.y0 - 4, RACK.x1 + 4, RACK.y1 + 4) +
    mat('genai', out.genai === 'answered', MODEL.x - 15, MODEL.y - 15, MODEL.x + 15, MODEL.y + 15);
  const s =
    mats +
    drawPieces(
      [
        { shadow: castShadow(boxCorners(K.x - 13, K.y - 9, BH, K.x + 13, K.y + 9, KZ + 3), BH), items: [k] },
        sorter(holds),
        machine,
        customer(),
      ],
      ctx.top,
    );
  // pills: each station's name and outcome, over its top; the bins' intents alternate above and below the rack
  const pills: string[] = [];
  const named = (id: Station) => {
    const st = STATIONS.find(x => x.id === id)!.name.toUpperCase();
    return narrow ? st : `${st} · ${WORD[out[id]]}`;
  };
  const fill = (id: Station) => (out[id] === 'fell back' ? OVER : undefined);
  const kioskTop = [K.x, K.y, KZ + 17],
    rackTop = [(RACK.x0 + RACK.x1) / 2, RACK.y1, BH + 2],
    modelTop = [MODEL.x, MODEL.y, BH + 34 * MODEL.size],
    cardsAt = [K.x, K.y - 6, KZ + 11],
    whoTop = [WHO.x, WHO.y, BH + 36];
  pills.push(pill(kioskTop, 0, -16, named('script'), out.script === 'answered', scale, fill('script')));
  pills.push(pill(rackTop, 0, 64, named('sorter'), out.sorter === 'answered', scale, fill('sorter')));
  pills.push(pill(modelTop, 0, -16, named('genai'), out.genai === 'answered', scale));
  INTENTS.forEach((it, i) => {
    if (narrow && it.id !== holds) return;
    // the row runs down the screen to the right, so one height would collide: even bins' pills stand over their rims,
    // odd bins' hang under the pallet's front edge
    const up = narrow || i % 2 === 0,
      at = up ? [BIN_X(i), BIN_Y, BH + 11] : [BIN_X(i), RACK.y1, BH];
    pills.push(pill(at, 0, up ? -16 : 16, it.id.toUpperCase(), it.id === holds, scale));
  });
  pills.push(
    sayAt(o.say, 'kiosk', kioskTop, -16, scale),
    sayAt(o.say, 'cards', cardsAt, -40, scale),
    sayAt(o.say, 'sorter', [RACK.x0, BIN_Y, BH + 11], -40, scale),
    sayAt(o.say, 'model', modelTop, -16, scale),
    sayAt(o.say, 'customer', whoTop, -8, scale),
  );
  return `<g class="bg-counter">${s}</g>${calloutsLast(pills)}`;
};

/** The picture in words, for its aria-label. */
export function kioskLabel(o: KioskOpts): string {
  const r = o.run,
    out = outcomes(r);
  const intent = INTENTS.find(i => i.id === r.intent.intent)!.name;
  return [
    'Larkspur’s help counter: a customer holds a message card before three bots.',
    out.script === 'answered'
      ? `The scripted kiosk raises its ${r.scripted.rule} card and answers.`
      : 'The scripted kiosk raises its sorry card: it fell back.',
    out.sorter === 'answered'
      ? `The sorter drops the card in the ${intent} bin and answers.`
      : 'The sorter drops the card in the reject tub: it fell back.',
    out.genai === 'answered' ? 'The GenAI model answers.' : 'The GenAI model’s reply is not recorded.',
  ].join(' ');
}

// ---- the flat view: the three bots side by side on the same message, pills and outcomes only ----

const KIND: Record<Outcome, Msg['kind']> = { answered: 'result', 'fell back': 'error', 'not recorded': 'blocked' };
const FS = 10;
/** Three lanes, one per bot, each with one card naming its outcome (and the sorter's intent when it answered).
 * Wide: side by side; phone: stacked bands. Never a sentence (R17). */
export function kioskFlat(r: Run, phone = false): { svg: string; w: number; h: number } {
  const out = outcomes(r),
    pals = [PALS.cobalt, PALS.mustard, PALS.blush];
  const body = (id: Station, i: number, cx: number, cy: number) => {
    const o = out[id],
      m: Msg = { from: id, to: id, kind: KIND[o], text: WORD[o] };
    const extra =
      id === 'sorter' && o === 'answered' ? flatPill(cx, cy + 26, r.intent.intent.toUpperCase(), FS * 0.9) : '';
    return `<g data-lane-state="${id}" data-outcome="${o}">${card(m, i, cx, cy, FS, 20, 0, 0)}${extra}</g>`;
  };
  if (phone) {
    const w = 300,
      band = 30,
      gap = 62,
      pad = 12,
      h = pad * 2 + STATIONS.length * (band + gap) - 8;
    let s = '';
    STATIONS.forEach((st, i) => {
      const y = pad + i * (band + gap);
      s += lane(st.id, st.name.toUpperCase(), pals[i], pad, y, w - pad * 2, band, FS, true);
      s += body(st.id, i, w / 2, y + band + 18);
    });
    return { svg: s, w, h };
  }
  const w = 600,
    pad = 14,
    h = 150,
    lw = (w - pad * 2) / 3;
  let s = '';
  STATIONS.forEach((st, i) => {
    const x = pad + i * lw;
    s += lane(st.id, st.name.toUpperCase(), pals[i], x + 5, pad, lw - 10, h - pad * 2, FS, false);
    s += body(st.id, i, x + lw / 2, pad + 64);
  });
  return { svg: s, w, h };
}

/** The flat view in words. */
export function kioskFlatLabel(r: Run): string {
  const out = outcomes(r);
  return `Three bots on the same message: ${STATIONS.map(s => `${s.name} ${out[s.id]}`).join(', ')}.`;
}

// ---- chapter 3's predictive AI: the Email module's spam dial and trays, Recommendations' shelf, set down small ----

export const PREDICT_BOARD: Board = [0, 0, 150, 80];
export const PREDICT_PARTS = ['spam', 'junk', 'shelf'] as const;
export interface PredictOpts {
  /** the spam filter's score, 0 to 1; the letter lands in junk at 0.5 or more. Undefined: not filtered yet, the dial
   * blank and both trays empty, so the picture never hints the answer before the reveal. */
  spam?: number;
  say?: Say;
  scale?: number;
}
// postScene's own spots for the dial and the trays, and where they stand here
const DIAL = [182, 38, BH],
  INBOX = [108, 86, BH],
  JUNK = [136, 86, BH];
export const predictScene = (o: PredictOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    sorted = o.spam !== undefined,
    junk = sorted && o.spam! >= 0.5,
    dialAt = [24, 22, BH],
    inboxAt = [18, 50, BH],
    junkAt = [44, 50, BH],
    shelfAt = [112, 40, BH];
  const pieces = [
    // unsorted: the needle upright, leaning to neither side
    mini(gauge(o.spam ?? 0.5), DIAL, dialAt, 1.4),
    mini(tray('inbox', sorted && !junk), INBOX, inboxAt, 1),
    mini(tray('junk', junk), JUNK, junkAt, 1),
    mini(shelfPiece(0, 0), [0, -9, BH], shelfAt, 1.3),
  ];
  const s = drawPieces(pieces, ctx.top);
  const dialTop = [dialAt[0], dialAt[1], BH + 31],
    shelfTop = [shelfAt[0], shelfAt[1], BH + 18],
    junkTop = [junkAt[0], junkAt[1], BH + 6];
  const pills = [
    pill(dialTop, 0, -14, 'SPAM FILTER', false, scale, junk ? OVER : undefined),
    pill([inboxAt[0], inboxAt[1], BH + 6], 0, 16, 'INBOX', sorted && !junk, scale),
    pill(junkTop, 0, 16, 'JUNK', junk, scale),
    pill(shelfTop, 0, -16, 'SHELF', false, scale),
    sayAt(o.say, 'spam', dialTop, -14, scale),
    sayAt(o.say, 'junk', junkTop, -6, scale),
    sayAt(o.say, 'shelf', shelfTop, -16, scale),
  ];
  return `<g class="bg-predict" data-junk="${sorted ? (junk ? 1 : 0) : ''}">${s}</g>${calloutsLast(pills)}`;
};

/** The predictive picture in words. */
export const predictLabel = (o: PredictOpts) =>
  `A spam filter’s dial ${o.spam === undefined ? 'still blank: the letter is not sorted yet' : o.spam >= 0.5 ? 'past halfway: the letter lies in the junk tray' : 'under halfway: the letter lies in the inbox'}; beside it a shop shelf of recommended products.`;

/** The home hero's plot: the kiosk, set down small. */
export function kioskPlot(x: number, y: number, top: SceneCtx['top']): string {
  const k = kiosk(RULES[0].id),
    p = mini(
      { shadow: castShadow(boxCorners(K.x - 13, K.y - 9, BH, K.x + 13, K.y + 9, KZ + 3), BH, top), items: [k] },
      [K.x, K.y, BH],
      [x, y, BH],
      0.5,
    );
  return drawPieces([p]);
}
