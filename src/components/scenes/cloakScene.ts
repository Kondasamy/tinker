// The Logins and passwords picture: Larkspur's cloakroom (KTD13). At the back stands the key cabinet, one drawer per
// trade account, holding what the site keeps of each password: a sticky note (as written) or a fingerprint card, its
// colour the stored form. A cracked drawer turns tomato and pops open. In front is the desk, where a signed-in browser
// gets its ticket (the session cookie). A thief in a dark coat stands to the right with whatever she took; for signing
// in with another site, the Guild's booth stands at the right end of a belt (officeScene's, composed) that carries the
// code and the signed ID token. The cabinet draws at most 12 drawers and a count pill for the rest. Words only in pills;
// on phones (scale > 1.5) pills keep short names and the caption carries the numbers. Every string is escaped (esc).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  hullInk,
  matOf,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { beltAt } from './officeScene';
import type { Say } from '../story/steps';

export const CLOAK_BOARD: Board = [0, 4, 180, 100];
export const CLOAK_CAP = 12;

/** What a drawer holds: a password as written, a fingerprint, a salted one, a slow one; or cracked. */
export type DrawerState = 'plain' | 'hashed' | 'salted' | 'slow' | 'cracked';
export interface Drawer {
  /** the account's id */
  id: string;
  state: DrawerState;
  /** what the table keeps, for the accounts view (React text there) */
  stored?: string;
  /** a pill on this drawer (at most two drawers carry one) */
  label?: string;
  short?: string;
  lit?: boolean;
  /** just cracked: it pops (no motion with reduced motion) */
  fresh?: boolean;
}
export interface Card {
  label: string;
  short?: string;
  /** where it is: on the Guild's booth, on the belt, or on Larkspur's desk */
  at: 'guild' | 'belt' | 'desk';
  sealed?: boolean;
  broken?: boolean;
  lit?: boolean;
}
export interface CloakOpts {
  drawers: Drawer[];
  /** the cabinet's pill: what the table holds, or the race's count */
  table?: string;
  tableShort?: string;
  /** the desk's pill */
  desk?: string;
  /** the session cookie on the desk; copied: the thief holds one too; void: the site forgot it */
  ticket?: { label: string; copied?: boolean; void?: boolean; lit?: boolean };
  /** the thief and her pill; holds: what she carries */
  thief?: { label: string; short?: string; holds?: 'table' | 'ticket' | 'code' };
  /** the Guild's booth, its pill, and the card crossing the belt */
  guild?: { label: string; card?: Card };
  scale?: number;
  say?: Say;
}
/** The parts a callout may name. */
export const CLOAK_PARTS = ['cabinet', 'desk', 'thief', 'guild'] as const;

const CAB = [12, 14, 108, 26] as const, // x0, y0, x1, y1
  CAB_TOP = BH + 38,
  DESK = [20, 60, 104, 80] as const,
  DESK_TOP = BH + 14,
  THIEF = [150, 38] as const,
  BOOTH = [146, 64, 172, 90] as const,
  BOOTH_TOP = BH + 22,
  COLS = 6;

const FILL: Record<DrawerState, { l: string; m: string; d: string }> = {
  plain: PALS.mustard,
  hashed: PALS.cobalt,
  salted: PALS.blush,
  slow: PALS.mint,
  cracked: PALS.tomato,
};

/** A drawer's slot on the cabinet's front face (y = CAB y1): column and row, and its corners. */
function slot(i: number) {
  const c = i % COLS,
    r = Math.floor(i / COLS),
    w = (CAB[2] - CAB[0] - 8) / COLS,
    x0 = CAB[0] + 4 + c * w,
    z0 = BH + 22 - r * 16;
  return { x0: x0 + 1, x1: x0 + w - 1, z0, z1: z0 + 13 };
}

function drawerAt(d: Drawer, i: number) {
  const { x0, x1, z0, z1 } = slot(i),
    y = CAB[3],
    out = d.state === 'cracked' ? 4 : 1.2;
  let s = box(x0, y, z0, x1, y + out, z1, FILL[d.state], toneI, 0.8);
  // a handle, and what it holds showing over the lip: a sticky note or a fingerprint card
  s += box((x0 + x1) / 2 - 2, y + out, z0 + 5, (x0 + x1) / 2 + 2, y + out + 0.8, z0 + 7, METAL, toneI, 0.5);
  const paper = d.state === 'plain' ? PALS.mustard : CERAMIC;
  s += box(
    x0 + 2,
    y + 0.4,
    z1,
    x1 - 2,
    y + out - 0.2,
    z1 + (d.state === 'cracked' || d.state === 'plain' ? 4 : 1.5),
    paper,
    toneI,
    0.6,
  );
  return `<g data-drawer="${esc(d.id)}" data-state="${d.state}"${d.fresh ? ' data-fresh="1"' : ''}${d.lit ? ' data-lit="1"' : ''}>${s}</g>`;
}

function cabinet(o: CloakOpts) {
  const [x0, y0, x1, y1] = CAB;
  let s = box(x0, y0, BH, x1, y1, CAB_TOP, WOOD, toneI, 1.2);
  o.drawers.slice(0, CLOAK_CAP).forEach((d, i) => {
    s += drawerAt(d, i);
  });
  s += hullInk(boxCorners(x0, y0, BH, x1, y1, CAB_TOP), 2);
  return s;
}

function desk(o: CloakOpts) {
  const [x0, y0, x1, y1] = DESK;
  let s = box(x0, y0, BH, x1, y1, DESK_TOP, WOOD, toneI, 1.1);
  s += box(x0, y0, DESK_TOP, x1, y0 + 4, DESK_TOP + 6, PALS.cobalt, toneI, 0.9); // the desk's back rail
  // a bell, for the cloakroom
  s += cyl(x0 + 10, y1 - 6, DESK_TOP, DESK_TOP + 1, 3.6, METAL, toneI, 0.7, 16);
  s += cyl(x0 + 10, y1 - 6, DESK_TOP + 1, DESK_TOP + 4, 2.2, matOf('#f4b829'), toneI, 0.8, 16);
  if (o.ticket)
    s += `<g data-ticket="${o.ticket.void ? 'void' : 'live'}">${ticket(60, 72, DESK_TOP, !!o.ticket.void)}</g>`;
  if (o.guild?.card?.at === 'desk') s += card(84, 70, DESK_TOP, o.guild.card);
  s += hullInk(boxCorners(x0, y0, BH, x1, y1, DESK_TOP), 2);
  return s;
}

const ticket = (x: number, y: number, z: number, dead: boolean) =>
  box(x - 6, y - 4, z, x + 6, y + 4, z + 1, dead ? METAL : PALS.mustard, toneI, 0.8) +
  cyl(x - 3, y, z + 1, z + 1.3, 1.4, dead ? METAL : CERAMIC, toneI, 0.5, 12);

function card(x: number, y: number, z: number, c: Card) {
  let s = box(x - 7, y - 5, z, x + 7, y + 5, z + 1, CERAMIC, toneI, 0.9);
  if (c.sealed || c.broken)
    s += cyl(
      x + 3,
      y + 2,
      z + 1,
      z + 2.2,
      3,
      c.broken ? { l: '#c9c2b4', m: '#aaa293', d: '#6f675a' } : PALS.tomato,
      toneI,
      0.8,
      16,
    );
  return `<g data-card="${c.at}"${c.broken ? ' data-broken="1"' : ''}>${s}</g>`;
}

/** The thief: a dark coat and a hat, holding what she took. */
function thief(o: CloakOpts) {
  const [x, y] = THIEF,
    holds = o.thief?.holds;
  let s =
    cyl(x, y, BH, BH + 28, 8, DARK, toneI, 1.4) +
    cyl(x, y, BH + 28, BH + 37, 5.5, matOf('#e9c9a8'), toneI, 1.2) +
    cyl(x, y, BH + 37, BH + 38, 9, DARK, toneI, 1) +
    cyl(x, y, BH + 38, BH + 43, 5.5, DARK, toneI, 1.1);
  if (holds === 'table') s += box(x + 4, y + 4, BH + 14, x + 14, y + 12, BH + 22, PALS.tomato, toneI, 0.9);
  if (holds === 'ticket') s += ticket(x + 9, y + 8, BH + 18, false);
  if (holds === 'code') s += box(x + 4, y + 5, BH + 18, x + 14, y + 11, BH + 19, CERAMIC, toneI, 0.8);
  return s;
}

function booth(o: CloakOpts) {
  const [x0, y0, x1, y1] = BOOTH;
  let s = box(x0, y0, BH, x1, y1, BOOTH_TOP, PALS.mustard, toneI, 1.1);
  s += box(x0 - 2, y0 - 2, BOOTH_TOP, x1 + 2, y1 + 2, BOOTH_TOP + 3, PALS.cobalt, toneI, 1);
  if (o.guild?.card?.at === 'guild') s += card((x0 + x1) / 2, (y0 + y1) / 2, BOOTH_TOP + 3, o.guild.card);
  s += hullInk(boxCorners(x0, y0, BH, x1, y1, BOOTH_TOP + 3), 2);
  return s;
}

const pill = (p: number[], dy: number, text: string, lit: boolean, scale: number, dx = 0, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

export const cloakScene = (o: CloakOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    name = (long: string, short?: string) => (narrow ? (short ?? long) : long);
  let s =
    castShadow(boxCorners(CAB[0], CAB[1], BH, CAB[2], CAB[3], CAB_TOP), BH, ctx.top) +
    castShadow(boxCorners(DESK[0], DESK[1], BH, DESK[2], DESK[3], DESK_TOP), BH, ctx.top);
  const parts: { at: number[]; svg: string }[] = [
    { at: [CAB[0], CAB[1], 0], svg: `<g data-prop="cabinet">${cabinet(o)}</g>` },
    { at: [DESK[0], DESK[1], 0], svg: `<g data-prop="desk">${desk(o)}</g>` },
  ];
  if (o.thief) {
    s += castShadow(boxCorners(THIEF[0] - 7, THIEF[1] - 7, BH, THIEF[0] + 7, THIEF[1] + 7, BH + 40), BH, ctx.top);
    parts.push({ at: [THIEF[0], THIEF[1], 0], svg: `<g data-prop="thief">${thief(o)}</g>` });
  }
  if (o.guild) {
    s += castShadow(boxCorners(BOOTH[0], BOOTH[1], BH, BOOTH[2], BOOTH[3], BOOTH_TOP), BH, ctx.top);
    // the belt from the desk to the booth, with the card riding it
    s += `<g data-prop="belt">${beltAt([DESK[2], 72], [BOOTH[0], 74], [0, 1], false)}${
      o.guild.card?.at === 'belt' ? card(125, 73, BH + 0.5, o.guild.card) : ''
    }</g>`;
    parts.push({ at: [BOOTH[0], BOOTH[1], 0], svg: `<g data-prop="guild">${booth(o)}</g>` });
  }
  s += byDepth(parts);

  const pills: string[] = [];
  const cab = [(CAB[0] + CAB[2]) / 2, CAB[1], CAB_TOP],
    dsk = [(DESK[0] + DESK[2]) / 2, (DESK[1] + DESK[3]) / 2, DESK_TOP + 6],
    thf = [THIEF[0], THIEF[1], BH + 43],
    bth = [(BOOTH[0] + BOOTH[2]) / 2, (BOOTH[1] + BOOTH[3]) / 2, BOOTH_TOP + 3];
  if (o.table) pills.push(pill(cab, -16, name(o.table, o.tableShort), false, scale, 0, '#ffffff'));
  if (o.drawers.length > CLOAK_CAP)
    pills.push(pill([CAB[2], CAB[3], BH + 10], 16, `+${o.drawers.length - CLOAK_CAP} MORE`, false, scale, 18));
  // at most two drawers carry a pill: one off to the left, one off to the right, each its own row
  o.drawers
    .slice(0, CLOAK_CAP)
    .map((d, i) => ({ d, i }))
    .filter(x => x.d.label)
    .slice(0, 2)
    .forEach(({ d, i }, k) => {
      const { x0, x1, z1 } = slot(i);
      pills.push(
        pill([(x0 + x1) / 2, CAB[3] + 2, z1], k ? 22 : 40, name(d.label!, d.short), !!d.lit, scale, k ? 36 : -36),
      );
    });
  if (o.desk) pills.push(pill(dsk, 22, o.desk, false, scale, 0, '#ffffff'));
  if (o.ticket) pills.push(pill([60, 72, DESK_TOP + 1], -18, o.ticket.label, !!o.ticket.lit, scale, 10));
  if (o.thief) pills.push(pill(thf, -10, name(o.thief.label, o.thief.short), false, scale, 0, '#ffffff'));
  if (o.guild) {
    pills.push(pill(bth, -14, o.guild.label, false, scale, 0, '#ffffff'));
    const c = o.guild.card;
    if (c) {
      const at =
        c.at === 'belt' ? [125, 73, BH + 1.5] : c.at === 'desk' ? [84, 70, DESK_TOP + 1] : [bth[0], bth[1], bth[2] + 1];
      pills.push(pill(at, c.at === 'desk' ? 34 : 26, name(c.label, c.short), !!c.lit, scale));
    }
  }
  const says =
    sayAt(o.say, 'cabinet', cab, -16, scale) +
    sayAt(o.say, 'desk', dsk, o.ticket ? -18 : 0, scale) +
    (o.thief ? sayAt(o.say, 'thief', thf, -10, scale) : '') +
    (o.guild ? sayAt(o.say, 'guild', bth, -14, scale) : '');
  return s + pills.join('') + says;
};

/** The picture in words, for its aria-label. */
export function cloakLabel(o: CloakOpts): string {
  const cracked = o.drawers.filter(d => d.state === 'cracked').length;
  return [
    `Larkspur’s cloakroom: a key cabinet with ${o.drawers.length} drawers, one per account${cracked ? `, ${cracked} cracked` : ''}.`,
    o.table ? `The cabinet: ${o.table}.` : '',
    o.ticket ? `On the desk, a ticket: ${o.ticket.label}${o.ticket.void ? ', no longer honoured' : ''}.` : '',
    o.thief ? `A thief: ${o.thief.label}.` : '',
    o.guild
      ? `The Guild’s booth: ${o.guild.label}${o.guild.card ? `; a card, ${o.guild.card.label}, at the ${o.guild.card.at}` : ''}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** The home hero's plot: a short cabinet of drawers, one cracked, and a ticket on a desk. */
export function cloakPlot(x: number, y: number, top: SceneCtx['top']): string {
  let s = castShadow(boxCorners(x - 16, y - 6, BH, x + 16, y + 6, BH + 16), BH, top);
  const z = BH + 16;
  s += box(x - 16, y - 6, BH, x + 16, y + 6, z, WOOD, toneI, 0.9);
  for (let i = 0; i < 4; i++)
    s += box(
      x - 14 + i * 7.5,
      y + 6,
      BH + 4,
      x - 8.5 + i * 7.5,
      y + 7.5,
      BH + 12,
      i === 2 ? PALS.tomato : PALS.cobalt,
      toneI,
      0.7,
    );
  return s;
}
