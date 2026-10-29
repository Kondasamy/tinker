// Who labels the data's picture: the sorting room (U8). The hero is the pigeonhole sorting rack, one low row of five
// deep holes on legs against the back wall, one per intent in rack order (INTENTS, keys 1–5). In front of it a long
// table; behind the table the three CAST labellers stand facing the reader (Rosa still, Mira, Tom mid-stride), told
// apart by silhouette as well as colour. One ticket lies on the table's near edge; the gold-star tray holds the gold
// tickets at the left end; from chapter 6 the model machine labels at the right end. A pick is a slip in its
// labeller's colour lying in its hole, and each hole's pill carries its tally, so no count rests on colour. Words only
// in pills; esc() on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  METAL,
  PALS,
  PX,
  PY,
  PZ,
  WOOD,
  box,
  castShadow,
  hullInk,
  line,
  matOf,
  on,
  pd,
  rectUV,
  rod,
  shape,
  tag,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { CAST, drawPieces, type Item, modelMachine, person, tight } from '../../lib/iso/figures';
import { INTENTS, type Intent, type LabellerId, labellerOf } from '../../lib/labelling/story';
import type { Say } from '../story/steps';

export type Picker = LabellerId | 'model';
export interface RackOpts {
  /** the ticket on the table: one at a time */
  ticket?: { id: string; gold?: boolean } | null;
  /** who stands at the table (default all three) */
  labellers?: LabellerId[];
  /** each labeller's pick for this ticket, once shown: a slip in that hole */
  picks?: Partial<Record<Picker, Intent>>;
  /** the reader's own pick: its hole ringed, its pill lit */
  mine?: Intent | null;
  /** earlier tickets' slips per hole, drawn plain under this ticket's picks */
  tally?: Partial<Record<Intent, number>> | null;
  /** light the hole the vote chose */
  vote?: Intent | null;
  /** gold tickets in the tray */
  gold?: number;
  /** a labeller the gold check flagged */
  flag?: LabellerId | null;
  /** the model machine labels at the table's end */
  model?: boolean;
  /** the guideline card pinned on the rack */
  guide?: boolean;
  /** the slips just filed fall into their holes (off with reduced motion) */
  drop?: boolean;
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name: the rack, the ticket, the gold tray, the guideline, each person, each hole. */
export const LABEL_PARTS = [
  'rack',
  'ticket',
  'gold',
  'guide',
  'rosa',
  'mira',
  'tom',
  'model',
  ...INTENTS.map(i => i.id),
] as const;

export const RACK_BOARD: Board = [4, 0, 180, 80];
/** The holes, in rack order: each spans x0..x0 + HOLE along the back wall. */
const HOLE = 26,
  RX0 = 16,
  RY0 = 6,
  RY1 = 22,
  ZB = BH + 40, // the holes' floor
  ZT = ZB + 17, // the rack's top
  TABLE = { x0: 12, x1: 150, y0: 36, y1: 54, z: BH + 14 },
  STAND: Record<LabellerId, { x: number; pose: 'stand' | 'walk' }> = {
    rosa: { x: 46, pose: 'stand' },
    mira: { x: 86, pose: 'stand' },
    tom: { x: 126, pose: 'walk' },
  },
  PEOPLE_Y = 66,
  TRAY = { x0: 17, x1: 37, y0: 40, y1: 51 },
  CARD = { x: 66, y: 47, dx: 9, dy: 5 },
  MODEL = { x: 166, y: 44, size: 0.55 },
  MAX_SLIPS = 6;
export const RACK_X1 = RX0 + INTENTS.length * HOLE;
const holeX = (i: number) => RX0 + i * HOLE;

/** Each slip's colour: the labeller's shirt, the model's blush cabinet. */
export const SLIP: Record<Picker, string> = {
  rosa: CAST.rosa.top,
  mira: CAST.mira.top,
  tom: CAST.tom.top,
  model: PALS.blush.l,
};
const PICKERS: Picker[] = ['rosa', 'mira', 'tom', 'model'];

/** How many slips each hole holds: earlier tickets' tally plus this ticket's picks. */
export function tallyIn(o: Pick<RackOpts, 'picks' | 'tally'>): Record<Intent, number> {
  const out = Object.fromEntries(INTENTS.map(i => [i.id, o.tally?.[i.id] ?? 0])) as Record<Intent, number>;
  for (const p of PICKERS) {
    const i = o.picks?.[p];
    if (i) out[i]++;
  }
  return out;
}

/** A slip lying flat in a hole: a thin card, its colour the labeller's. */
const slip = (x: number, y: number, z: number, c: string, k: number) =>
  box(x - 8 + (k % 2) * 1.2, y - 5, z, x + 8 + (k % 2) * 1.2, y + 5, z + 1.6, matOf(c), toneI, 0.6);

/** The rack: legs, the back, the holes' floor, then each hole's slips and the divider in front of it, the top last.
 * The holes open toward +y; the dividers' +x faces show inside the hole to their right, so each hole's slips are
 * drawn after the divider on its left and before the one on its right. */
function rack(o: RackOpts, n: Record<Intent, number>): string {
  const x1 = RACK_X1;
  let s = '';
  for (const [lx, ly] of [
    [RX0 + 2, RY0 + 2],
    [x1 - 2, RY0 + 2],
    [RX0 + 2, RY1 - 2],
    [x1 - 2, RY1 - 2],
  ])
    s += box(lx - 1.4, ly - 1.4, BH, lx + 1.4, ly + 1.4, ZB - 1.5, WOOD, toneI, 0.8);
  s += box(RX0, RY0 - 2, ZB - 1.5, x1, RY0, ZT, WOOD, toneI, 1);
  s += box(RX0, RY0, ZB - 1.5, x1, RY1, ZB, WOOD, toneI, 1);
  const divider = (x: number) => box(x - 0.9, RY0, ZB, x + 0.9, RY1, ZT - 1.5, WOOD, toneI, 0.8);
  INTENTS.forEach((it, i) => {
    const x = holeX(i),
      cx = x + HOLE / 2,
      cy = (RY0 + RY1) / 2;
    s += divider(x);
    let h = '';
    // earlier tickets' slips plain, then this ticket's picks on top in their labellers' colours
    const mine = PICKERS.filter(p => o.picks?.[p] === it.id).map(p => SLIP[p]),
      plain = Math.min(o.tally?.[it.id] ?? 0, MAX_SLIPS - mine.length);
    for (let k = 0; k < plain; k++) h += slip(cx, cy, ZB + 0.05 + k * 1.65, CERAMIC.l, k);
    mine.forEach((c, j) => {
      const k = plain + j,
        one = slip(cx, cy, ZB + 0.05 + k * 1.65, c, k);
      h += o.drop ? `<g class="slip drop" style="animation-delay:${j * 0.12}s">${one}</g>` : one;
    });
    // a coloured lip along the hole's front edge, and the reader's ring round the opening
    h += box(x + 1, RY1 - 1, ZB, x + HOLE - 1, RY1 + 0.6, ZB + 2.4, PALS.cobalt, toneI, 0.7);
    if (o.mine === it.id)
      h += `<path class="mine" d="${pd(on(PY(RY1 + 0.7), rectUV(x + 1.5, ZB + 0.5, x + HOLE - 1.5, ZT - 2)))}" fill="none" stroke="${ACC}" stroke-width="2.6"/>`;
    s += `<g data-part="hole" data-intent="${it.id}" data-n="${n[it.id]}">${h}</g>`;
  });
  s += divider(x1);
  s += box(RX0 - 1, RY0 - 2, ZT - 1.5, x1 + 1, RY1 + 1, ZT, WOOD, toneI, 1);
  if (o.guide) {
    // the guideline: a card pinned on the rack's end, lines for its rules, a red pin
    const X = vis([1, 0, 0]) ? x1 + 1.05 : RX0 - 1.05;
    s += `<g data-part="guide">${shape(on(PX(X), rectUV(RY0, ZB, RY1 - 1, ZT - 2.5)), CERAMIC.l, 0.8)}`;
    for (let k = 0; k < 4; k++)
      s += line(
        on(PX(X + 0.05), [
          [RY0 + 2, ZT - 6 - k * 3],
          [RY1 - 3, ZT - 6 - k * 3],
        ]),
        0.5,
      );
    s += `${rod([X, RY1 - 3, ZT - 3.5], [X + 1.4, RY1 - 3, ZT - 3.5], 0.9, PALS.tomato)}</g>`;
  }
  return `<g data-part="rack">${s}${hullInk(boxCorners(RX0 - 1, RY0 - 2, BH, x1 + 1, RY1 + 1, ZT), 2)}</g>`;
}

/** A five-point star lying on z at (x, y). */
const star = (x: number, y: number, z: number, r: number) =>
  shape(
    on(
      PZ(z),
      Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5 - Math.PI / 2,
          rr = i % 2 ? r * 0.45 : r;
        return [x + rr * Math.cos(a), y + rr * Math.sin(a)];
      }),
    ),
    PALS.mustard.l,
    0.6,
  );

/** The table: four legs and a top, the gold-star tray and the ticket on it. */
function table(o: RackOpts): Item {
  const { x0, x1, y0, y1, z } = TABLE;
  let s = '';
  for (const [lx, ly] of [
    [x0 + 3, y0 + 3],
    [x1 - 3, y0 + 3],
    [x0 + 3, y1 - 3],
    [x1 - 3, y1 - 3],
  ])
    s += box(lx - 1.3, ly - 1.3, BH, lx + 1.3, ly + 1.3, z - 2, WOOD, toneI, 0.8);
  s += box(x0, y0, z - 2, x1, y1, z, WOOD, toneI, 1) + hullInk(boxCorners(x0, y0, BH, x1, y1, z), 2);
  // the gold-star tray: a low open tray, a star on its front, its gold tickets stacked inside
  const t = TRAY,
    g = Math.max(0, o.gold ?? 0);
  let tray = box(t.x0, t.y0, z, t.x1, t.y1, z + 0.8, METAL, toneI, 0.8);
  for (let k = 0; k < Math.min(g, MAX_SLIPS); k++)
    tray += box(t.x0 + 3, t.y0 + 2, z + 0.8 + k, t.x1 - 3, t.y1 - 2, z + 1.8 + k, CERAMIC, toneI, 0.5);
  if (g) tray += star((t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2, z + 1.85 + Math.min(g, MAX_SLIPS) - 1, 3.5);
  tray += box(t.x0, t.y1 - 0.8, z, t.x1, t.y1, z + 4, METAL, toneI, 0.8);
  tray += box(t.x1 - 0.8, t.y0, z, t.x1, t.y1, z + 4, METAL, toneI, 0.8);
  // the star painted on the tray's front
  tray += shape(
    on(
      PY(t.y1 + 0.05),
      Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5 - Math.PI / 2,
          r = i % 2 ? 0.8 : 1.8;
        return [(t.x0 + t.x1) / 2 + r * Math.cos(a), z + 2 - r * Math.sin(a)];
      }),
    ),
    PALS.mustard.l,
    0.5,
  );
  s += `<g data-part="gold" data-n="${g}">${tray}</g>`;
  if (o.ticket) {
    const { x, y, dx, dy } = CARD;
    let c = box(x - dx, y - dy, z, x + dx, y + dy, z + 0.9, CERAMIC, toneI, 0.8);
    for (let k = 0; k < 3; k++)
      c += line(
        on(PZ(z + 0.95), [
          [x - dx + 2, y - 2.5 + k * 2],
          [x + dx - (k === 2 ? 7 : 2), y - 2.5 + k * 2],
        ]),
        0.4,
      );
    if (o.ticket.gold) c += star(x + dx - 3, y + dy - 2.6, z + 1, 2);
    s += `<g data-part="ticket" data-ticket="${esc(o.ticket.id)}"${o.ticket.gold ? ' data-gold="1"' : ''}>${c}</g>`;
  }
  return {
    box: [
      [x0, y0, BH],
      [x1, y1, z + 6],
    ],
    svg: tight(s),
  };
}

/** The flag the gold check raises at a labeller's place: a pole on the table and a tomato pennant. */
const flagAt = (x: number): Item => {
  const z = TABLE.z,
    y = TABLE.y1 - 3,
    top = z + 30;
  const svg =
    rod([x + 8, y, z], [x + 8, y, top], 0.6, DARK) +
    shape(
      [
        [x + 8, y, top],
        [x + 8, y, top - 7],
        [x + 18, y, top - 3.5],
      ],
      PALS.tomato.l,
      0.8,
    );
  return {
    box: [
      [x + 7, y - 1, z],
      [x + 19, y + 1, top],
    ],
    svg: `<g data-part="flag">${svg}</g>`,
  };
};

const name = (id: LabellerId) => labellerOf(id).name.toUpperCase();
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The sorting room. Shadows, then the rack, the people, the table and the model in depth order, then the pills
 * (callouts last). */
export const rackScene = (o: RackOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    n = tallyIn(o),
    who = o.labellers ?? (['rosa', 'mira', 'tom'] as LabellerId[]);
  const people = who.map(id =>
    person({ x: STAND[id].x, y: PEOPLE_Y, facing: '-y', pose: STAND[id].pose, look: id, holding: null }),
  );
  const machine = o.model ? modelMachine(MODEL.x, MODEL.y, MODEL.size, 'ok') : null;
  const sh = (x0: number, y0: number, x1: number, y1: number, z1: number) =>
    castShadow(boxCorners(x0, y0, BH, x1, y1, z1), BH, ctx.top);
  const items: Item[] = [
    {
      box: [
        [RX0 - 1, RY0 - 2, BH],
        [RACK_X1 + 1, RY1 + 1, ZT],
      ],
      svg: tight(rack(o, n)),
    },
    table(o),
    ...(o.flag && who.includes(o.flag) ? [flagAt(STAND[o.flag].x)] : []),
  ];
  const s =
    sh(RX0, RY0 - 2, RACK_X1, RY1, ZT) +
    sh(TABLE.x0, TABLE.y0, TABLE.x1, TABLE.y1, TABLE.z) +
    drawPieces([...people, ...(machine ? [machine] : []), { shadow: '', items }], ctx.top);
  // pills: each hole's name and tally. The rack runs down the screen to the right, so pills at one height would
  // collide: even holes' pills stand over the rack's top, odd holes' hang under its front lip.
  const pills: string[] = [];
  INTENTS.forEach((it, i) => {
    const up = i % 2 === 0,
      at = [holeX(i) + HOLE / 2, RY1, up ? ZT : ZB],
      dy = up ? -16 : 18,
      text = narrow ? String(i + 1) : `${i + 1} ${it.name.toUpperCase()} · ${n[it.id]}`;
    pills.push(pill(at, 0, dy, text, o.mine === it.id || o.vote === it.id, scale));
    // a callout always goes above the rack, clear of the lower row
    pills.push(sayAt(o.say, it.id, [at[0], at[1], ZT], -16, scale, narrow));
  });
  const feet = (id: LabellerId) => [STAND[id].x, PEOPLE_Y + 5, BH];
  for (const id of who) {
    const flagged = o.flag === id;
    pills.push(pill(feet(id), 0, 16, flagged && !narrow ? `${name(id)} · CHECK` : name(id), false, scale));
    pills.push(sayAt(o.say, id, feet(id), 64, scale, narrow)); // under the name, clear of the table
  }
  const ticketAt = [CARD.x + CARD.dx, CARD.y + CARD.dy, TABLE.z + 1],
    goldAt = [TRAY.x1, TRAY.y1, TABLE.z + 4],
    modelAt = [MODEL.x, MODEL.y, BH + 32 * MODEL.size],
    rackAt = [RACK_X1, RY0, ZT],
    guideAt = [RACK_X1 + 1, (RY0 + RY1) / 2, ZT - 2];
  if (o.ticket)
    pills.push(
      pill(
        ticketAt,
        narrow ? 0 : -26,
        narrow ? 22 : 30,
        narrow ? 'TICKET' : `TICKET ${o.ticket.id.toUpperCase()}${o.ticket.gold ? ' · GOLD' : ''}`,
        false,
        scale,
      ),
    );
  pills.push(pill(goldAt, -34, 20, narrow ? 'GOLD' : `GOLD · ${Math.max(0, o.gold ?? 0)}`, false, scale));
  if (machine) pills.push(pill(modelAt, 0, -14, 'MODEL', false, scale));
  pills.push(
    sayAt(o.say, 'ticket', ticketAt, narrow ? 22 : 30, scale, narrow),
    sayAt(o.say, 'gold', [TRAY.x0, TRAY.y0, TABLE.z + 4], -12, scale, narrow),
    sayAt(o.say, 'rack', rackAt, -34, scale, narrow),
    o.guide ? sayAt(o.say, 'guide', guideAt, -14, scale, narrow) : '',
    machine ? sayAt(o.say, 'model', modelAt, -14, scale, narrow) : '',
  );
  return `<g class="lb-rack">${s}</g>${calloutsLast(pills)}`;
};

/** The picture in words, for its aria-label. */
export function rackLabel(o: RackOpts): string {
  const n = tallyIn(o),
    who = o.labellers ?? (['rosa', 'mira', 'tom'] as LabellerId[]);
  const holes = INTENTS.filter(i => n[i.id])
    .map(i => `${n[i.id]} in ${i.name}`)
    .join(', ');
  const parts = [
    `A sorting rack of ${INTENTS.length} pigeonholes over a long table; ${who.length} labeller${who.length === 1 ? '' : 's'} at it${o.model ? ', and the model machine at its end' : ''}.`,
    o.ticket
      ? `Ticket ${o.ticket.id}${o.ticket.gold ? ', a gold ticket,' : ''} is on the table.`
      : 'No ticket on the table.',
    holes ? `Slips: ${holes}.` : 'The holes are empty.',
  ];
  if (o.mine) parts.push(`You filed it under ${INTENTS.find(i => i.id === o.mine)!.name}.`);
  if (o.vote) parts.push(`The vote chose ${INTENTS.find(i => i.id === o.vote)!.name}.`);
  if (o.gold) parts.push(`${o.gold} gold ticket${o.gold === 1 ? '' : 's'} in the tray.`);
  if (o.flag) parts.push(`A flag is up at ${labellerOf(o.flag).name}'s place.`);
  if (o.guide) parts.push('The guideline is pinned on the rack.');
  return parts.join(' ');
}
