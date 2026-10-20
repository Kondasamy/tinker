// Flat sequence figures (lanes, message cards, arrows, stamps) in the Colorfigures ink and palette.
// Plain SVG strings, no projection, so the share-image template can draw them too. core.js stays untouched.
import { PALS, METAL, INK, SHADOW, ink, f } from './core.js';
import { esc } from './blocks';

type Mat = { l: string; m: string; d: string };
export type Kind = 'request' | 'result' | 'error' | 'blocked';
export type Stamp = 'APPROVED' | 'DENIED' | 'INVALID';
export interface Lane { id: string; name: string; pal?: Mat }
export interface Msg { from: string; to: string; kind: Kind; text: string; stamp?: Stamp }
/** upTo: messages shown so far (default all); phone: stacked lanes, one message (focus, default the latest) */
export interface FlatOpts { upTo?: number; phone?: boolean; focus?: number }
export interface FlatScene { svg: string; w: number; h: number }

const LANE_PALS = [PALS.mustard, PALS.cobalt, PALS.mint, PALS.blush, PALS.tomato];
const KIND: Record<Kind, Mat> = { request: PALS.cobalt, result: PALS.mint, error: PALS.tomato, blocked: METAL };
const MARK: Record<Kind, string> = { request: '', result: '', error: '! ', blocked: '× ' };   // kind not by colour alone
const STAMP: Record<Stamp, string> = { APPROVED: '#2a744b', DENIED: '#b5361f', INVALID: '#826309' };   // --ok, --bad, --warn
const FONT = 'font-family="ui-monospace,Menlo,monospace" font-weight="800"';
const PAD = 14;
const DESK = { w: 600, head: 30, row: 58, fs: 9.5, chars: 34 };
const PHONE = { w: 300, band: 34, gap: 64, fs: 11.5 };

const fit = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const textW = (s: string, fs: number) => s.length * fs * .62 + fs * 1.5;
const rect = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke = INK, sw = 1.2, extra = '') =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`;
const text = (x: number, y: number, s: string, fs: number, fill = INK, extra = '') =>
  `<text x="${f(x)}" y="${f(y + fs * .36)}" font-size="${f(fs)}" text-anchor="middle" ${FONT} fill="${fill}"${extra}>${esc(s)}</text>`;

/** A flat label pill (the tag() look without the leader line), centred on (x, y). Clicks pass through. */
export function flatPill(x: number, y: number, label: string, fs = DESK.fs, on = false): string {
  const w = textW(label, fs), h = fs * 1.8;
  return `<g class="pill${on ? ' on' : ''}" aria-hidden="true" pointer-events="none">`
    + rect(x - w / 2, y - h / 2, w, h, h / 2, on ? 'var(--accent,#f4b829)' : '#fff4d6') + text(x, y, label, fs, INK, ' letter-spacing=".04em"') + '</g>';
}

/** A lane: a pale column (or, stacked, a band) with a three-tone header and its name in a pill. */
export function lane(id: string, name: string, pal: Mat, x: number, y: number, w: number, h: number, fs: number, stacked: boolean): string {
  const at = stacked ? `data-y="${f(y + h / 2)}"` : `data-x="${f(x + w / 2)}"`;
  const head = stacked ? h : DESK.head;
  let s = `<g class="lane" data-lane="${esc(id)}" ${at}>`;
  if (!stacked) {
    s += rect(x, y, w, h, 8, pal.l, INK, .9, ' fill-opacity=".16"');
    s += ink(`M${f(x + w / 2)} ${f(y + head)}L${f(x + w / 2)} ${f(y + h - 6)}`, .8).replace('/>', ' stroke-dasharray="3 4"/>');
  }
  s += rect(x, y, w, head, 8, pal.l) + `<path d="M${f(x + 4)} ${f(y + head - 3)}L${f(x + w - 4)} ${f(y + head - 3)}" stroke="${pal.m}" stroke-width="3" stroke-linecap="round"/>`;
  return s + flatPill(x + w / 2, y + head / 2, name, fs) + '</g>';
}

/** An arrow from (x1, y1) to (x2, y2), axis-aligned; dashed when the call was blocked. */
export function arrow(from: string, to: string, x1: number, y1: number, x2: number, y2: number, dashed = false): string {
  const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1), a = 6, b = 3.5;
  const head = `M${f(x2)} ${f(y2)}L${f(x2 - dx * a - dy * b)} ${f(y2 - dy * a + dx * b)}L${f(x2 - dx * a + dy * b)} ${f(y2 - dy * a - dx * b)}Z`;
  return `<g class="arrow" data-from="${esc(from)}" data-to="${esc(to)}"><path d="M${f(x1)} ${f(y1)}L${f(x2 - dx * a)} ${f(y2 - dy * a)}" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"${dashed ? ' stroke-dasharray="4 3"' : ''}/>`
    + `<path d="${head}" fill="${INK}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/></g>`;
}

/** A stamp across a card's corner. Clicks pass through. */
export function stamp(word: Stamp, x: number, y: number, fs: number): string {
  const c = STAMP[word], w = textW(word, fs) + fs, h = fs * 1.9;
  return `<g class="stamp" aria-hidden="true" pointer-events="none" transform="rotate(-9 ${f(x)} ${f(y)})">`
    + rect(x - w / 2, y - h / 2, w, h, 3, '#fbf8f0', c, 2, ' fill-opacity=".92"') + text(x, y, word, fs, c, ' letter-spacing=".14em"') + '</g>';
}

/** A message card centred on (cx, cy), flat shaded by kind, with a flat blue shadow. (dx, dy): where it travels from. */
export function card(m: Msg, i: number, cx: number, cy: number, fs: number, chars: number, dx: number, dy: number): string {
  const label = MARK[m.kind] + fit(m.text, chars - MARK[m.kind].length), pal = KIND[m.kind];
  const w = textW(label, fs), h = fs * 2.4, x = cx - w / 2, y = cy - h / 2;
  const dash = m.kind === 'blocked' ? ' stroke-dasharray="4 3"' : '';
  return `<g class="card ${m.kind}" data-msg="${i}" style="--dx:${f(dx)}px;--dy:${f(dy)}px">`
    + `<rect x="${f(x + 3)}" y="${f(y + 3)}" width="${f(w)}" height="${f(h)}" rx="6" fill="${SHADOW}" fill-opacity=".85"/>`
    + rect(x, y, w, h, 6, pal.l, INK, 1.4) + `<path d="M${f(x + 3)} ${f(y + h - 2.5)}L${f(x + w - 3)} ${f(y + h - 2.5)}" stroke="${pal.m}" stroke-width="3" stroke-linecap="round"/>`
    + (dash ? rect(x, y, w, h, 6, 'none', INK, 1.4, dash) : '')
    + text(cx, cy - 1, label, fs) + (m.stamp ? stamp(m.stamp, x + w - textW(m.stamp, fs * .8) / 2, y - fs * .75, fs * .8) : '')   // sits on the top edge, clear of the text + '</g>';
}

/** The whole sequence. The frame is sized for every message, so it never resizes as more are shown. */
export function flatScene(lanes: Lane[], msgs: Msg[], { upTo = msgs.length, phone = false, focus }: FlatOpts = {}): FlatScene {
  const pal = (i: number) => lanes[i].pal ?? LANE_PALS[i % LANE_PALS.length];
  const idx = (id: string) => lanes.findIndex(l => l.id === id);
  const wrap = (i: number, body: string) => `<g class="msg${i === upTo - 1 ? ' new' : ''}">${body}</g>`;
  if (phone) {
    const { w, band, gap, fs } = PHONE, h = PAD * 2 + lanes.length * band + (lanes.length - 1) * gap;
    const top = (i: number) => PAD + i * (band + gap);
    let s = lanes.map((l, i) => lane(l.id, l.name, pal(i), PAD, top(i), w - PAD * 2, band, fs, true)).join('');
    const i = Math.min(focus ?? upTo - 1, upTo - 1), m = msgs[i];
    if (m) {
      const a = idx(m.from), b = idx(m.to), down = b > a;
      const y1 = down ? top(a) + band : top(a), y2 = down ? top(b) : top(b) + band, ax = PAD + 26;
      // in the gap next to the sender, so it never covers a lane it passes
      const cy = down ? y1 + gap / 2 : y1 - gap / 2, chars = Math.floor((w - PAD - (ax + 18) - fs * 1.5) / (fs * .62));
      const cx = (ax + 18 + w - PAD) / 2;
      s += wrap(i, arrow(m.from, m.to, ax, y1 + (down ? 4 : -4), ax, y2, m.kind === 'blocked') + card(m, i, cx, cy, fs, chars, 0, top(a) + band / 2 - cy));
    }
    return { svg: s, w, h };
  }
  const { w, head, row, fs, chars } = DESK, lw = (w - PAD * 2) / lanes.length;
  const h = PAD + head + 34 + msgs.length * row + PAD, cx = (i: number) => PAD + lw * (i + .5);
  let s = lanes.map((l, i) => lane(l.id, l.name, pal(i), PAD + lw * i + 5, PAD, lw - 10, h - PAD * 2, fs, false)).join('');
  msgs.slice(0, upTo).forEach((m, i) => {
    const x1 = cx(idx(m.from)), x2 = cx(idx(m.to)), y = PAD + head + 34 + i * row, sx = Math.sign(x2 - x1);
    const half = Math.min(textW(MARK[m.kind] + fit(m.text, chars - MARK[m.kind].length), fs), w - PAD * 2 - 8) / 2;
    const mid = Math.max(PAD + 4 + half, Math.min(w - PAD - 4 - half, (x1 + x2) / 2));
    s += wrap(i, card(m, i, mid, y, fs, chars, x1 - mid, 0) + arrow(m.from, m.to, x1 + sx * 4, y + fs * 1.2 + 9, x2 - sx * 3, y + fs * 1.2 + 9, m.kind === 'blocked'));
  });
  return { svg: s, w, h };
}

/** The figure in words, for its aria-label: the lanes, then every message shown so far. */
export function flatLabel(lanes: Lane[], msgs: Msg[], upTo = msgs.length): string {
  const name = (id: string) => lanes.find(l => l.id === id)?.name ?? id;
  const head = `Sequence across ${lanes.length} lanes: ${lanes.map(l => l.name).join(', ')}.`;
  if (upTo <= 0) return `${head} No messages yet.`;
  const said = msgs.slice(0, upTo).map((m, i) =>
    `${i + 1}: ${name(m.from)} to ${name(m.to)}, ${m.kind}, "${m.text}"${m.stamp ? `, stamped ${m.stamp.toLowerCase()}` : ''}.`);
  return `${head} ${Math.min(upTo, msgs.length)} of ${msgs.length} messages so far. ${said.join(' ')}`;
}
