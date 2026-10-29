// Module 5's picture: the back office from module 2 (officeScene, composed, not forked) with a mail room. Email waits in
// an inbox tray by the front desk and rides the desk's belt in to the host; an outbound chute behind the host leads to a
// post box, the way out. Each defence is a prop turned on by a flag: a screening arch on the inbound belt (the input
// checks), a barrier on the chute (the allow-list), the chute shut once untrusted text is in (the taint rule), and the
// trifecta's three legs named, a removed leg drawn shut or dashed. Everything is read off one run, up to the current step.
import type { SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  box,
  cyl,
  shape,
  line,
  ink,
  pd,
  on,
  PX,
  rectUV,
  vis,
  castShadow,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import { person, type Look } from '../../lib/iso/figures';
import { OFFICE_PARTS, barrierAt, beltAt, envelope, officeScene, type OfficeOpts, type Part } from './officeScene';
import { EMPLOYEE, officeLayers, withoutPerson } from './officeLayers';
import { guardMessages } from './guardSequence';
import type { Leg, Run } from '../../lib/guardrails/loop';
import type { Board } from '../../lib/iso/IsoStage';
import type { Msg } from '../../lib/iso/flat';

/** The office's board, widened on the left for the inbox tray. */
export const GUARD_BOARD: Board = [60, 0, 286, 258];

/** The parts a step's callout may name: the office's, then the mail room's (in-tray, post box, records) and its checks. */
export const GUARD_PARTS = [...OFFICE_PARTS, 'inbox', 'post', 'records', 'screen', 'allow'] as const;

export interface GuardOpts extends Omit<OfficeOpts, 'msgs' | 'upTo' | 'tools' | 'emp'> {
  run: Run;
  /** run steps shown so far (default all); the last one is the current step */
  upTo?: number;
  /** the screening arch on the inbound belt: the input checks (classifier, input policy) */
  screen?: boolean;
  /** the barrier on the outbound chute: the allow-list of customer addresses */
  allow?: boolean;
  /** the taint rule: the chute shuts once untrusted text has been read */
  taint?: boolean;
  /** name the lethal trifecta's three legs (private data, untrusted text, the way out) */
  legs?: boolean;
  /** a removed leg: drawn shut (inbox), dashed (chute) or gone (records) */
  remove?: Leg;
}

// the inbound belt is the office's front-desk belt (host edge to desk edge); the chute runs from the host's back, beside
// the order system's belt, to a post box
const IN = { a: [142, 156], b: [142, 222], n: [-1, 0] },
  OUT = { a: [160, 114], b: [160, 62], n: [1, 0] };
const ARCH_T = 0.5,
  BAR_T = 0.45,
  POST = [160, 54],
  TRAY = [76, 140],
  RECORDS = [196, 22];
const at = (belt: typeof IN, t: number) => [
  belt.a[0] + (belt.b[0] - belt.a[0]) * t,
  belt.a[1] + (belt.b[1] - belt.a[1]) * t,
];
/** Where a mail envelope rides: its belt, how far along (0 = host end), and which end it set off from. */
const ENV_AT = {
  'to-mail': [IN, 0.78, 0], // read_inbox asked for, or a reply going back to the sender
  'from-mail': [IN, 0.22, 1], // the email, past the screening arch, on its way to the host
  held: [IN, ARCH_T + 0.18, 1], // the email, stopped on the mail-room side of the arch
  out: [OUT, 0.82, 0], // send_email, past the barrier, about to drop in the post box
  blocked: [OUT, BAR_T - 0.2, 0], // send_email, stopped on the host's side of the barrier
} as const;
type Where = keyof typeof ENV_AT;

/** What the props show after `upTo` steps. Pure, so the tests can check it without drawing. */
export function guardState({
  run,
  upTo = run.steps.length,
  taint,
  remove = 'none',
}: Pick<GuardOpts, 'run' | 'upTo' | 'taint' | 'remove'>) {
  const shown = run.steps.slice(0, upTo),
    last = shown.at(-1);
  const read = shown.some(s => s.kind === 'result' && s.call.name === 'read_inbox' && !s.result.isError);
  const tainted = !!taint && read;
  let where: Where | null = null;
  if (last?.kind === 'call' && (last.call.name === 'read_inbox' || last.call.name === 'reply')) where = 'to-mail';
  else if (last?.kind === 'result' && last.call.name === 'read_inbox')
    where = last.result.isError ? 'held' : 'from-mail';
  else if (last?.kind === 'call' && last.call.name === 'send_email') where = 'out';
  else if (last?.kind === 'blocked' && last.by === 'allow-list') where = 'blocked';
  // the input checks run before the model's first turn: a held email waits at the arch until something else rides
  else if (run.mail !== 'full') where = 'held';
  const send = run.steps.find(s => s.kind === 'send');
  const tools =
    send?.kind === 'send' ? send.tools.length - (tainted && send.tools.some(t => t.name === 'send_email') ? 1 : 0) : 0;
  return {
    where,
    tainted,
    tools,
    /** the envelope came from read_inbox: untrusted text, tagged */
    tag: where === 'from-mail' || where === 'held',
    sent: shown.filter(s => s.kind === 'call' && s.call.name === 'send_email').length,
    blocked: shown.filter(s => s.kind === 'blocked' && s.by === 'allow-list').length,
    chute: remove === 'out' ? ('removed' as const) : tainted ? ('closed' as const) : ('open' as const),
  };
}

/** The defences' readouts in words, for the caption and the label (on phones the drawing drops these pills). */
export function guardReadouts(o: GuardOpts): string[] {
  const st = guardState(o),
    out: string[] = [],
    { remove = 'none' } = o;
  if (o.screen)
    out.push(
      `input checks: ${o.run.mail === 'quarantined' ? 'email held (quarantined)' : o.run.mail === 'refused' ? 'email turned away' : 'email let through'}`,
    );
  if (o.allow) out.push(`allow-list: ${st.blocked} blocked`);
  if (o.taint)
    out.push(
      st.tainted
        ? 'taint rule: untrusted text read, send_email withdrawn'
        : 'taint rule: send_email offered until untrusted text is read',
    );
  if (o.legs) out.push(remove === 'none' ? 'all three legs in place' : `leg removed: ${LEG[remove]}`);
  out.push(st.chute === 'removed' ? 'no way out' : `${st.sent} sent by send_email`);
  return out;
}
const LEG: Record<Exclude<Leg, 'none'>, string> = {
  private: 'private data',
  untrusted: 'untrusted text',
  out: 'the way out',
};

/** A wooden in-tray of letters (a base and low walls, the near walls drawn over the letters); with a lid on when
 * untrusted text is removed (nothing is read). */
export function trayProp(x: number, y: number, lid: boolean): Part {
  const nx = vis([1, 0, 0]) ? x + 12 : x - 12,
    ny = vis([0, 1, 0]) ? y + 9 : y - 9;
  const wallX = (X: number) => box(X - 0.7, y - 9, BH + 1, X + 0.7, y + 9, BH + 5.5, WOOD, toneI, 0.7),
    wallY = (Y: number) => box(x - 12, Y - 0.7, BH + 1, x + 12, Y + 0.7, BH + 5.5, WOOD, toneI, 0.7);
  let s = box(x - 12, y - 9, BH, x + 12, y + 9, BH + 1, WOOD, toneI, 1) + wallX(2 * x - nx) + wallY(2 * y - ny);
  const z = BH + 1;
  for (let i = 0; i < 3; i++)
    s += box(x - 9 + i, y - 6 - i * 0.6, z + i, x + 9 + i, y + 6 - i * 0.6, z + i + 1, CERAMIC, toneI, 0.5);
  s += wallX(nx) + wallY(ny);
  if (lid) s += `<g class="lid">${box(x - 12.5, y - 9.5, BH + 6, x + 12.5, y + 9.5, BH + 8, WOOD, toneI, 1)}</g>`;
  return { at: [x, y, 0], svg: `<g data-prop="tray"${lid ? ' data-lid="1"' : ''}>${s}</g>` };
}

/** A card file of customer records; removed: only its dashed outline is left. */
function recordsProp(x: number, y: number, removed: boolean): Part {
  const foot = [
    [x - 9, y - 7, BH],
    [x + 9, y - 7, BH],
    [x + 9, y + 7, BH],
    [x - 9, y + 7, BH],
  ];
  if (removed)
    return {
      at: [x, y, 0],
      svg: `<g data-prop="records" data-removed="1">${ink(pd(foot), 1.1).replace('/>', ' stroke-dasharray="3 3"/>')}</g>`,
    };
  let s = box(x - 9, y - 7, BH, x + 9, y + 7, BH + 8, PALS.mint, toneI, 1);
  for (let i = 0; i < 4; i++)
    s += box(x - 6 + i * 3.6, y - 5, BH + 8, x - 5 + i * 3.6, y + 5, BH + 12 - (i % 2) * 1.5, CERAMIC, toneI, 0.5);
  return { at: [x, y, 0], svg: `<g data-prop="records">${s}</g>` };
}

/** A red pillar box at the chute's end: mail that drops in has left Larkspur. Real-object notes: a round body on a
 * wider plinth, a cap with a lip and a domed top with a knob, a dark letter slot under the cap and a door below it, on
 * the side toward the viewer. */
export function postBox(x: number, y: number): Part {
  const face = PX(x + (vis([1, 0, 0]) ? 6.05 : -6.05));
  const s =
    cyl(x, y, BH, BH + 2, 7, DARK, toneI, 1, 18) +
    cyl(x, y, BH + 2, BH + 18, 6, PALS.tomato, toneI, 1, 18) +
    cyl(x, y, BH + 18, BH + 20, 7, PALS.tomato, toneI, 1, 18) +
    cyl(x, y, BH + 20, BH + 21.6, 5.4, PALS.tomato, toneI, 0.9, 16) +
    cyl(x, y, BH + 21.6, BH + 23, 3.4, PALS.tomato, toneI, 0.9, 14) +
    cyl(x, y, BH + 23, BH + 24, 1, DARK, toneI, 0.7, 8) +
    shape(on(face, rectUV(y - 3, BH + 14, y + 3, BH + 15.6)), DARK.d, 0.6) +
    shape(on(face, rectUV(y - 2.6, BH + 5, y + 2.6, BH + 11.5)), PALS.tomato.m, 0.7);
  return { at: [x, y, 0], svg: `<g data-prop="postbox">${s}</g>` };
}

/** The hero: the screening arch across the inbound belt at p (n: the belt's sideways direction), a walk-through
 * scanner. Real-object notes: two tall grey panels on dark feet, joined by a cobalt header; a lamp on top (green:
 * passed, red: held). The far panel goes first, then the header, then the near panel. */
function screeningArch([px, py]: number[], n: number[], lamp: 'ok' | 'bad' | null): Part {
  const w = 10.5,
    d = 5,
    zt = BH + 27,
    across = n[0] !== 0; // the panels stand apart along x
  const slab = (k0: number, k1: number, l0: number, l1: number, z0: number, z1: number, m: typeof METAL) =>
    across
      ? box(px + k0, py + l0, z0, px + k1, py + l1, z1, m, toneI, 1)
      : box(px + l0, py + k0, z0, px + l1, py + k1, z1, m, toneI, 1);
  const panel = (k: number) =>
    slab(k - 2.2, k + 2.2, -d - 1, d + 1, BH, BH + 1.6, DARK) + slab(k - 1.6, k + 1.6, -d, d, BH + 1.6, zt, METAL);
  const near = vis(across ? [1, 0, 0] : [0, 1, 0]) ? w : -w,
    col = lamp === 'ok' ? PALS.mint : lamp === 'bad' ? PALS.tomato : DARK;
  return {
    at: [px, py, 0],
    svg:
      panel(-near) +
      slab(-w - 1.6, w + 1.6, -d, d, zt, zt + 4, PALS.cobalt) +
      cyl(px, py, zt + 4, zt + 6.5, 2.4, col, toneI, 0.8, 14) +
      panel(near),
  };
}

/** The security guard who minds the arch: a navy uniform and a peaked cap, standing on the host side of it. */
const GUARD: Look = {
  skin: '#8d5838',
  top: '#3b4566',
  legs: '#272421',
  hair: '#2b231c',
  cut: 'short',
  hat: 'cap',
  hatCol: '#1c2948',
};
const GUARD_AT = { x: 126, y: 166, facing: 45 };

/** The taint tag: a red label tied to an envelope's front corner (it came from outside). */
function taintTag(x: number, y: number) {
  const z = BH + 0.3,
    Y = y + 4.1;
  return `<g class="taint">${
    line(
      [
        [x - 2, y, z + 5],
        [x + 2, Y, z + 8],
      ],
      0.7,
    ) +
    shape(
      [
        [x + 1, Y, z + 6],
        [x + 7, Y, z + 6],
        [x + 7, Y, z + 11],
        [x + 1, Y, z + 11],
      ],
      PALS.tomato.m,
      0.8,
    )
  }</g>`;
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, cls = 'block-tag') =>
  `<g class="${cls}" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

/** The office with the mail room and the defences that are on. Words go only in pills; on phones (scale > 1) the props
 * keep short names and the caption carries their readouts. */
export const guardScene = (o: GuardOpts) => (ctx: SceneCtx) => {
  const { run, upTo = run.steps.length, scale = 1, remove = 'none' } = o,
    narrow = scale > 1;
  const st = guardState(o),
    msgs = guardMessages(run);
  const office = officeScene({ ...o, msgs, upTo, tools: st.tools, emp: 'MAIL ROOM' })(ctx);
  // the props' shadows join the office's floor layer, the chute lies on the floor like the office's belts, and the props
  // go over the office's art but under its name pills. The mail-room clerk (the office's employee) is drawn again among
  // the props, so an envelope riding up to the counter goes behind them, not over their head.
  const { floor, art, names, callout } = officeLayers(withoutPerson(office, 'employee'));
  const guard = person({ ...GUARD_AT, look: GUARD });
  const parts: { at?: number[]; box?: number[][]; svg: string }[] = [
      ...guard.items,
      ...person({ ...EMPLOYEE, look: 'employee' }).items,
    ],
    pills: string[] = [],
    calls: string[] = [],
    shadows: string[] = [guard.shadow];
  const shade = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    shadows.push(castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top));
  const chute = `<g data-prop="chute" data-state="${st.chute}">${beltAt(OUT.a, OUT.b, OUT.n, st.chute !== 'open')}</g>`;

  parts.push(trayProp(TRAY[0], TRAY[1], remove === 'untrusted'));
  shade(TRAY[0] - 12, TRAY[1] - 9, TRAY[0] + 12, TRAY[1] + 9, remove === 'untrusted' ? 8 : 6);
  calls.push(sayAt(o.say, 'inbox', [TRAY[0], TRAY[1], BH + 8], -10, scale));
  pills.push(
    pill(
      [TRAY[0], TRAY[1], BH + 8],
      -30,
      -10,
      o.legs && !narrow ? `UNTRUSTED TEXT${remove === 'untrusted' ? ' · REMOVED' : ''}` : 'INBOX',
      false,
      scale,
    ),
  );
  parts.push(postBox(POST[0], POST[1]));
  shade(POST[0] - 6, POST[1] - 6, POST[0] + 6, POST[1] + 6, 23);
  calls.push(sayAt(o.say, 'post', [POST[0], POST[1], BH + 23], -14, scale));
  const outWords = o.legs ? 'WAY OUT' : 'OUTBOUND';
  pills.push(
    pill(
      [POST[0], POST[1], BH + 23],
      0,
      -14,
      narrow
        ? 'OUT'
        : `${outWords}${st.chute === 'removed' ? ' · REMOVED' : st.chute === 'closed' ? ' · SHUT' : st.sent ? ` · ${st.sent} SENT` : ''}`,
      st.where === 'out',
      scale,
    ),
  );
  if (o.legs) {
    parts.push(recordsProp(RECORDS[0], RECORDS[1], remove === 'private'));
    if (remove !== 'private') shade(RECORDS[0] - 9, RECORDS[1] - 7, RECORDS[0] + 9, RECORDS[1] + 7, 12);
    calls.push(sayAt(o.say, 'records', [RECORDS[0], RECORDS[1], BH + 12], -14, scale));
    pills.push(
      pill(
        [RECORDS[0], RECORDS[1], BH + 12],
        10,
        -14,
        narrow ? 'DATA' : `PRIVATE DATA${remove === 'private' ? ' · REMOVED' : ''}`,
        false,
        scale,
      ),
    );
  }
  if (o.screen) {
    const p = at(IN, ARCH_T),
      lamp = st.where === 'held' ? 'bad' : st.where === 'from-mail' ? 'ok' : null;
    const a = screeningArch(p, IN.n, lamp);
    parts.push({ at: a.at, svg: `<g data-prop="arch"${lamp ? ` data-lamp="${lamp}"` : ''}>${a.svg}</g>` });
    calls.push(sayAt(o.say, 'screen', [p[0] + 9, p[1], BH + 20], 2, scale));
    if (!narrow)
      pills.push(
        pill(
          [p[0] + 9, p[1], BH + 20],
          30,
          2,
          `INPUT CHECK${lamp === 'bad' ? ' · HELD' : lamp === 'ok' ? ' · PASSED' : ''}`,
          lamp === 'bad',
          scale,
          'check-tag',
        ),
      );
  }
  if (o.allow && st.chute !== 'removed') {
    const p = at(OUT, BAR_T),
      up = st.where === 'out';
    const b = barrierAt(p, OUT.n, up, false);
    parts.push({ at: b.at, svg: `<g data-prop="barrier" data-up="${up ? 1 : 0}">${b.svg}</g>` });
    calls.push(sayAt(o.say, 'allow', [p[0] + 10, p[1], BH + 14], 22, scale));
    if (!narrow)
      pills.push(
        pill(
          [p[0] + 10, p[1], BH + 14],
          44,
          22,
          `ALLOW-LIST${st.where === 'blocked' ? ' · BLOCKED' : up ? ' · ON FILE' : ''}`,
          st.where === 'blocked',
          scale,
          'check-tag',
        ),
      );
  }
  if (st.where) {
    // a held email is drawn as the error it became, whatever step is current
    const [belt, t, end] = ENV_AT[st.where],
      p = at(belt, t),
      m: Msg = st.where === 'held' ? { from: 'mail', to: 'host', kind: 'error', text: '' } : msgs[upTo - 1];
    const env = envelope(m, p, at(belt, end), false);
    const svg = st.tag ? env.svg.slice(0, -'</g>'.length) + taintTag(p[0], p[1]) + '</g>' : env.svg;
    parts.push({ at: env.at, svg: `<g data-env="${st.where}"${st.tag ? ' data-taint="1"' : ''}>${svg}</g>` });
    // on phones the caption carries the stamp: there is no room for it beside the host's pill
    if (st.where === 'blocked' && !narrow)
      pills.push(pill([p[0], p[1], BH + 6], -26, -18, 'REFUSED', true, scale, 'msg-tag'));
  }
  return floor + shadows.join('') + chute + art + byDepth(parts) + names + pills.join('') + callout + calls.join('');
};

/** The picture in words, for its aria-label: the office and mail room, the current step, then each defence that is on. */
export function guardLabel(o: GuardOpts): string {
  const st = guardState(o),
    msgs = guardMessages(o.run),
    host = o.host ?? 'Host app',
    upTo = o.upTo ?? msgs.length,
    m = msgs[upTo - 1];
  const checks = [
    o.screen && 'a screening arch on the inbound belt',
    o.allow && st.chute !== 'removed' && 'an allow-list barrier on the outbound chute',
  ].filter(Boolean);
  const where: Record<Where, string> = {
    'to-mail': 'An envelope rides to the mail room.',
    'from-mail': 'An email from outside, tagged as untrusted, rides in to the host.',
    held: 'An email from outside, tagged as untrusted, is held at the screening arch.',
    out: 'An email rides down the chute to the post box.',
    blocked: 'An email is stopped at the allow-list barrier.',
  };
  return [
    `Larkspur's back office with a mail room: email waits in an inbox tray by the front desk and rides a belt to ${host}; the model holds ${st.tools} tool definitions; the order system stands behind; an outbound chute leads from ${host} to a post box${st.chute === 'removed' ? ', removed' : st.chute === 'closed' ? ', shut by the taint rule' : ''}.`,
    checks.length ? `On the belts: ${checks.join('; ')}.` : '',
    m
      ? `Step ${upTo} of ${msgs.length}: ${m.text}${m.stamp ? `, stamped ${m.stamp.toLowerCase()}` : ''}.`
      : 'Nothing sent yet.',
    st.where ? where[st.where] : '',
    guardReadouts(o).join('; ') + '.',
  ]
    .filter(Boolean)
    .join(' ');
}
