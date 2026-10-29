// Writing a prompt's picture: the docket board (U4). Larkspur's support desk (Office's counter, `counterAt`) with Rosa
// behind it; beside her a work-order docket on a clipboard stands on an easel, its face turned the way the model
// machine's screen faces, and the machine past it reads it. The docket holds the prompt's parts as coloured strips in
// the order the model reads them (partsOf), at most six. The machine's screen follows the reply's grade, and the reply
// comes out onto a tray as a slip: ruled lines for its length and a stamp, a tick or a cross for the key fact (never
// colour alone). Words only in pills; esc() on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  METAL,
  PALS,
  WOOD,
  box,
  castShadow,
  cyl,
  line,
  matOf,
  rod,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { drawPieces, mini, modelMachine, person, tight, type Item, type ModelState } from '../../lib/iso/figures';
import { compact } from '../../lib/iso/compact';
import { partsOf } from '../../lib/prompts/assemble';
import { TICKETS, type Docket, type Slot } from '../../lib/prompts/cards';
import type { Say } from '../story/steps';
import { counterAt } from './officeScene';

export type CardSlot = Slot | 'ticket';
export interface DocketCard {
  slot: CardSlot;
  /** the strip's pill, a few words */
  label: string;
}
/** KTD10's cap: strips drawn on the docket. */
export const MAX_CARDS = 6;
/** The parts a step's callout may name: the place, then each card's slot (drawn while that card is clipped). */
export const DOCKET_PARTS = [
  'docket',
  'machine',
  'rosa',
  'slip',
  'role',
  'task',
  'examples',
  'format',
  'rules',
  'ticket',
] as const;

/** Each slot's colour on the docket, and its swatch in the tray. */
export const SLOT_HEX: Record<CardSlot, string> = {
  rules: PALS.tomato.l,
  role: PALS.cobalt.l,
  task: PALS.mustard.l,
  examples: PALS.mint.l,
  format: '#b39ddb',
  ticket: CERAMIC.l,
};
/** A strip's pill: the clipped card's short name. */
export function shortOf(d: Docket, slot: CardSlot): string {
  if (slot === 'role') return 'WHO YOU ARE';
  if (slot === 'task') return d.task === 'clear' ? 'CLEAR TASK' : 'VAGUE TASK';
  if (slot === 'examples')
    return d.examples === '2q' ? '2 QUIRKY EXAMPLES' : `${d.examples} EXAMPLE${d.examples === 1 ? '' : 'S'}`;
  if (slot === 'format') return d.format === 'json' ? 'JSON' : 'LIST';
  if (slot === 'rules') return 'HOUSE RULE';
  return 'TICKET';
}
/** The docket's strips, in the order the model reads the prompt (partsOf; the ticket is always the customer's). */
export const cardsOf = (d: Docket): DocketCard[] =>
  partsOf({ ...d, ticket: TICKETS[0].id }).map(p => ({ slot: p.slot, label: shortOf(d, p.slot) }));

export interface DocketOpts {
  cards: DocketCard[];
  /** the machine's screen; none: idle, no reply yet */
  state?: ModelState;
  /** the reply slip on the tray; null: nothing out yet */
  slip?: {
    /** ruled lines, for its length (capped) */
    lines: number;
    /** the stamp: tick when the key fact is in, cross when not; none: no stamp (chapter 1) */
    facts?: boolean;
    /** the slip's pill */
    text: string;
  } | null;
  /** the card the last action clipped: it slides down onto the docket (left out with reduced motion) */
  fresh?: CardSlot | null;
  /** pill size; phones pass more */
  scale?: number;
  say?: Say;
}

// ---- layout ----
const Z0 = BH + 12,
  Z1 = BH + 60,
  /** the clipboard's half width, and a strip's */
  HW = 15,
  SW = 12.5,
  CH = 5.4,
  PITCH = 6.6,
  /** the docket's face (x) */
  FX = 0;
const MACHINE = [26, -38],
  COUNTER = [6, 38],
  ROSA = [-22, 36],
  TRAY = [48, -44, 62, -30];
export const DOCKET_BOARD: Board = [-30, -60, 68, 54];

const stripZ = (i: number) => Z1 - 7 - i * PITCH;

/** One strip: a thin card proud of the clipboard, with a line or two of writing (never words). */
function strip(c: DocketCard, i: number, fresh: boolean) {
  const z1 = stripZ(i),
    z0 = z1 - CH,
    m = matOf(SLOT_HEX[c.slot]);
  let s = box(FX, -SW, z0, FX + 0.5, SW, z1, m, toneI, 0.8);
  const n = c.label.startsWith('CLEAR') || c.slot === 'ticket' ? 2 : 1;
  for (let k = 0; k < n; k++) {
    const z = z1 - 1.8 - k * 1.8;
    s += line(
      [
        [FX + 0.55, SW - 2, z],
        [FX + 0.55, k ? -2 : -SW + 3, z],
      ],
      0.7,
    );
  }
  return `<g class="dk-card${fresh ? ' dk-slide' : ''}" data-part="${c.slot}" data-slot="${c.slot}">${s}</g>`;
}

/** The easel: two legs behind the clipboard and a third reaching back, a ledge the board rests on, the hardboard,
 * its steel clamp, and the strips in reading order. */
function easel(cards: DocketCard[], fresh?: CardSlot | null): Item {
  let s = '';
  s += rod([-18, 0, BH], [-2, 0, Z1 - 6], 0.9, WOOD, toneI, 1);
  for (const y of [-HW + 3, HW - 3]) s += rod([-4, y, BH], [-1.8, y, Z1 - 2], 1, WOOD, toneI, 1);
  s += box(-2, -HW - 1, Z0 - 2.2, 3.5, HW + 1, Z0, WOOD, toneI, 1);
  s += box(-1.4, -HW, Z0, FX, HW, Z1, matOf('#b98c5a'), toneI, 1.1);
  s += cards
    .slice(0, MAX_CARDS)
    .map((c, i) => strip(c, i, c.slot === fresh))
    .join('');
  s += box(-1.8, -6, Z1 - 3, 1.4, 6, Z1 + 1.6, METAL, toneI, 0.9);
  s += cyl(-0.2, 0, Z1 + 1.6, Z1 + 2.4, 2.2, METAL, toneI, 0.8, 12);
  return {
    box: [
      [-18, -HW - 1, BH],
      [3.5, HW + 1, Z1 + 2.4],
    ],
    svg: `<g data-part="docket" data-cards="${cards
      .slice(0, MAX_CARDS)
      .map(c => c.slot)
      .join(' ')}">${s}</g>`,
  };
}

/** The reply tray at the machine's foot and the slip on it: ruled lines and the stamp. */
function tray(slip: DocketOpts['slip']): Item {
  const [x0, y0, x1, y1] = TRAY,
    zt = BH + 2.4;
  let s = box(x0, y0, BH, x1, y1, zt, DARK, toneI, 1);
  if (slip) {
    const zp = zt + 0.3;
    let p = box(x0 + 2, y0 + 2, zt, x1 - 2, y1 - 2, zp, CERAMIC, toneI, 0.7);
    const n = Math.max(1, Math.min(6, slip.lines));
    for (let k = 0; k < n; k++) {
      const x = x0 + 4 + k * 1.6;
      p += line(
        [
          [x, y1 - 4, zp + 0.02],
          [x, y0 + (k === n - 1 ? 9 : 4), zp + 0.02],
        ],
        0.6,
      );
    }
    if (slip.facts !== undefined) {
      const cx = x1 - 5,
        cy = y0 + 5,
        ok = slip.facts;
      p += cyl(cx, cy, zp, zp + 0.3, 2.6, ok ? PALS.mint : PALS.tomato, toneI, 0.8, 16);
      const z = zp + 0.35;
      p += ok
        ? line(
            [
              [cx - 0.4, cy + 1.4, z],
              [cx + 0.9, cy + 0.2, z],
              [cx - 1.1, cy - 1.5, z],
            ],
            0.9,
          )
        : line(
            [
              [cx - 1.2, cy - 1.2, z],
              [cx + 1.2, cy + 1.2, z],
            ],
            0.9,
          ) +
          line(
            [
              [cx - 1.2, cy + 1.2, z],
              [cx + 1.2, cy - 1.2, z],
            ],
            0.9,
          );
    }
    s += `<g data-part="slip" data-facts="${slip.facts === undefined ? 'none' : slip.facts ? 1 : 0}">${p}</g>`;
  }
  return {
    box: [
      [x0, y0, BH],
      [x1, y1, zt + 0.7],
    ],
    svg: s,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The docket board. Every shadow, one depth sort over the counter, Rosa, the easel, the machine and the tray, then
 * pills. */
export const docketScene = (o: DocketOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    cards = o.cards.slice(0, MAX_CARDS);
  const counter = counterAt(COUNTER, false),
    rosa = person({ x: ROSA[0], y: ROSA[1], facing: 0, look: 'rosa', holding: null }),
    machine = modelMachine(MACHINE[0], MACHINE[1], 1, o.state);
  const shadow =
    castShadow(
      boxCorners(COUNTER[0] - 18, COUNTER[1] - 12, BH, COUNTER[0] + 18, COUNTER[1] + 12, BH + 14),
      BH,
      ctx.top,
    ) +
    castShadow(boxCorners(-2, -HW, BH, 0, HW, Z1), BH, ctx.top) +
    castShadow(boxCorners(TRAY[0], TRAY[1], BH, TRAY[2], TRAY[3], BH + 2.4), BH, ctx.top);
  const items: Item[] = [
    { box: counter.box!, svg: `<g data-part="desk">${counter.svg}</g>` },
    easel(cards, o.fresh),
    tray(o.slip),
  ];
  const s = compact(
    tight(
      drawPieces([
        { shadow, items },
        { shadow: rosa.shadow, items: rosa.items.map(i => ({ ...i, svg: `<g data-part="rosa">${i.svg}</g>` })) },
        {
          shadow: machine.shadow,
          items: machine.items.map(i => ({ ...i, svg: `<g data-part="machine">${i.svg}</g>` })),
        },
      ]),
    ),
  );
  const pills: string[] = [];
  if (!narrow)
    cards.forEach((c, i) =>
      pills.push(pill([FX + 0.5, SW, stripZ(i) - CH / 2], -54, -6 + i * 2, c.label, c.slot === o.fresh, scale)),
    );
  if (o.slip)
    pills.push(pill([(TRAY[0] + TRAY[2]) / 2, (TRAY[1] + TRAY[3]) / 2, BH + 3], 18, 26, o.slip.text, false, scale));
  pills.push(
    sayAt(o.say, 'docket', [FX, 0, Z1 + 2.4], -10, scale, narrow),
    sayAt(o.say, 'machine', [MACHINE[0], MACHINE[1], BH + 36], -10, scale, narrow),
    sayAt(o.say, 'rosa', [ROSA[0], ROSA[1], BH + 36], -34, scale, narrow),
    o.slip ? sayAt(o.say, 'slip', [(TRAY[0] + TRAY[2]) / 2, (TRAY[1] + TRAY[3]) / 2, BH + 3], -6, scale, narrow) : '',
    ...cards.map((c, i) => sayAt(o.say, c.slot, [FX + 0.5, -SW + 3, stripZ(i)], 4, scale, narrow)),
  );
  return s + calloutsLast(pills);
};

const NAME: Record<CardSlot, string> = {
  rules: 'the house rule',
  role: 'who you are',
  task: 'the task',
  examples: 'examples',
  format: 'the format',
  ticket: 'the customer’s ticket',
};
const SCREEN: Record<ModelState, string> = { ok: 'OK', warn: 'a question mark', bad: 'a warning' };

/** The picture in words, for its aria-label. */
export function docketLabel(o: DocketOpts): string {
  const cards = o.cards.slice(0, MAX_CARDS).map(c => NAME[c.slot]);
  const docket = `Rosa at Larkspur's support desk beside a docket on a clipboard holding ${cards.length} card${cards.length === 1 ? '' : 's'}, top to bottom: ${cards.join(', ')}.`;
  const machine = o.state
    ? `The model machine reads it; its screen shows ${SCREEN[o.state]}.`
    : 'The model machine reads it.';
  const slip = !o.slip
    ? ''
    : ` A reply slip is on the tray${o.slip.facts === undefined ? '' : o.slip.facts ? ', stamped with a tick' : ', stamped with a cross'}.`;
  return `${docket} ${machine}${slip}`;
}

/** The home hero's stand plot: the docket on its easel, set down small. */
export function docketPlot(x: number, y: number, top: SceneCtx['top']): string {
  const cards: DocketCard[] = (['rules', 'role', 'task', 'ticket'] as const).map(slot => ({ slot, label: '' }));
  const p = mini(
    { shadow: castShadow(boxCorners(-2, -HW, BH, 0, HW, Z1), BH, top), items: [easel(cards)] },
    [0, 0, BH],
    [x, y, BH],
    0.3,
  );
  return drawPieces([p]);
}
