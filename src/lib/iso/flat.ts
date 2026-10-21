// Flat sequence figures (lanes, message cards, arrows, stamps) in the Colorfigures ink and palette.
// Plain SVG strings, no projection, so the share-image template can draw them too. core.js stays untouched.
import { PALS, METAL, INK, SHADOW, ink, f } from './core.js';
import { esc } from './blocks';

type Mat = { l: string; m: string; d: string };
export type Kind = 'request' | 'result' | 'error' | 'blocked';
export type Stamp = 'APPROVED' | 'DENIED' | 'INVALID' | 'WAITING' | 'STOPPED' | 'REFUSED' | 'PASS' | 'FAIL';
/** the class a stamp wears in HTML (.stamp.correct and friends) */
export const STAMP_CLASS: Record<Stamp, string> = { APPROVED: 'correct', WAITING: 'neutral', INVALID: 'warn', DENIED: 'wrong', STOPPED: 'wrong', REFUSED: 'wrong', PASS: 'correct', FAIL: 'wrong' };
export interface Lane { id: string; name: string; pal?: Mat }
/** batch: messages with the same batch number went out together (parallel calls); the wide view brackets them */
export interface Msg { from: string; to: string; kind: Kind; text: string; stamp?: Stamp; batch?: number }
/** upTo: messages shown so far (default all); phone: stacked lanes, one message (focus, default the latest);
 * win: most rows the wide view draws, the latest ones (a pill counts the earlier ones); pick: cards are buttons */
export interface FlatOpts { upTo?: number; phone?: boolean; focus?: number; win?: number; pick?: boolean }
export interface FlatScene { svg: string; w: number; h: number }

const LANE_PALS = [PALS.mustard, PALS.cobalt, PALS.mint, PALS.blush, PALS.tomato];
const KIND: Record<Kind, Mat> = { request: PALS.cobalt, result: PALS.mint, error: PALS.tomato, blocked: METAL };
const MARK: Record<Kind, string> = { request: '', result: '', error: '! ', blocked: '× ' };   // kind not by colour alone
// --ok, --bad, --warn; waiting is plain ink
const STAMP: Record<Stamp, string> = { APPROVED: '#2a744b', DENIED: '#b5361f', INVALID: '#826309', WAITING: INK, STOPPED: '#b5361f', REFUSED: '#b5361f', PASS: '#2a744b', FAIL: '#b5361f' };
const FONT = 'font-family="ui-monospace,Menlo,monospace" font-weight="800"';
const PAD = 14;
// win: 7 rows keep card text at about 13px on a 1440×900 screen (12 rows shrank it to 8px)
export const DESK = { w: 600, head: 30, row: 58, fs: 9.5, chars: 34, win: 7, hint: 22 };
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

/** A message card centred on (cx, cy), flat shaded by kind, with a flat blue shadow. (dx, dy): where it travels from.
 * name: the card is a button with this accessible name (it opens the message in the drawer). */
export function card(m: Msg, i: number, cx: number, cy: number, fs: number, chars: number, dx: number, dy: number, name?: string): string {
  const label = MARK[m.kind] + fit(m.text, chars - MARK[m.kind].length), pal = KIND[m.kind];
  const w = textW(label, fs), h = fs * 2.4, x = cx - w / 2, y = cy - h / 2;
  const dash = m.kind === 'blocked' ? ' stroke-dasharray="4 3"' : '';
  const btn = name ? ` role="button" tabindex="0" aria-label="${esc(name)}"` : '';
  return `<g class="card ${m.kind}" data-msg="${i}"${btn} style="--dx:${f(dx)}px;--dy:${f(dy)}px">`
    + `<rect x="${f(x + 3)}" y="${f(y + 3)}" width="${f(w)}" height="${f(h)}" rx="6" fill="${SHADOW}" fill-opacity=".85"/>`
    + rect(x, y, w, h, 6, pal.l, INK, 1.4) + `<path d="M${f(x + 3)} ${f(y + h - 2.5)}L${f(x + w - 3)} ${f(y + h - 2.5)}" stroke="${pal.m}" stroke-width="3" stroke-linecap="round"/>`
    + (dash ? rect(x, y, w, h, 6, 'none', INK, 1.4, dash) : '')
    // the space between the words and the stamp draws nothing; it keeps them two words in the accessible text
    + text(cx, cy - 1, label, fs) + (m.stamp ? ' ' + stamp(m.stamp, x + w - textW(m.stamp, fs * .8) / 2, y - fs * .75, fs * .8) : '')   // sits on the top edge, clear of the text
    + '</g>';
}

const nameOf = (lanes: Lane[], id: string) => lanes.find(l => l.id === id)?.name ?? id;
/** A card's accessible name: what the card shows (cut text, then its stamp, so the visible words sit in the name in
 * order, for voice control), the full text when it was cut, then what pressing it does. chars: as given to card(). */
export const cardName = (lanes: Lane[], m: Msg, i: number, chars = Infinity) => {
  const shown = fit(m.text, chars - MARK[m.kind].length);
  return `Message ${i + 1}, ${nameOf(lanes, m.from)} to ${nameOf(lanes, m.to)}: ${shown}${m.stamp ? `, ${m.stamp.toLowerCase()}` : ''}`
    + `${shown === m.text ? '' : `. In full: ${m.text}`}. Show it in full`;
};

/** The whole sequence. The frame is sized for every row it can show, so it never resizes as more messages arrive. */
export function flatScene(lanes: Lane[], msgs: Msg[], { upTo = msgs.length, phone = false, focus, win = DESK.win, pick = false }: FlatOpts = {}): FlatScene {
  const pal = (i: number) => lanes[i].pal ?? LANE_PALS[i % LANE_PALS.length];
  const idx = (id: string) => lanes.findIndex(l => l.id === id);
  const wrap = (i: number, body: string) => `<g class="msg${i === upTo - 1 ? ' new' : ''}">${body}</g>`;
  const name = (m: Msg, i: number, chars: number) => pick ? cardName(lanes, m, i, chars) : undefined;
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
      // shortcut: the phone view shows one message, so a parallel batch is named in the label only, not bracketed
      s += wrap(i, arrow(m.from, m.to, ax, y1 + (down ? 4 : -4), ax, y2, m.kind === 'blocked') + card(m, i, cx, cy, fs, chars, 0, top(a) + band / 2 - cy, name(m, i, chars)));
    }
    return { svg: s, w, h };
  }
  const { w, head, row, fs, chars, hint } = DESK, lw = (w - PAD * 2) / lanes.length;
  // a long run shows its latest `win` rows; the band above them says how many came earlier (the drawer has them all)
  const more = msgs.length > win, rows = Math.min(msgs.length, win), first = PAD + head + 34 + (more ? hint : 0);
  const h = first + rows * row + PAD, cx = (i: number) => PAD + lw * (i + .5);
  const start = Math.max(0, upTo - win), rowY = (i: number) => first + (i - start) * row;
  let s = lanes.map((l, i) => lane(l.id, l.name, pal(i), PAD + lw * i + 5, PAD, lw - 10, h - PAD * 2, fs, false)).join('');
  if (start > 0) s += `<g class="earlier">${flatPill(w / 2, PAD + head + 18, `↑ ${start} earlier message${start === 1 ? '' : 's'}`, fs)}</g>`;
  msgs.slice(start, upTo).forEach((m, j) => {
    const i = start + j, x1 = cx(idx(m.from)), x2 = cx(idx(m.to)), y = rowY(i), sx = Math.sign(x2 - x1);
    const half = Math.min(textW(MARK[m.kind] + fit(m.text, chars - MARK[m.kind].length), fs), w - PAD * 2 - 8) / 2;
    const mid = Math.max(PAD + 4 + half, Math.min(w - PAD - 4 - half, (x1 + x2) / 2));
    s += wrap(i, card(m, i, mid, y, fs, chars, x1 - mid, 0, name(m, i, chars)) + arrow(m.from, m.to, x1 + sx * 4, y + fs * 1.2 + 9, x2 - sx * 3, y + fs * 1.2 + 9, m.kind === 'blocked'));
  });
  // parallel batches: a bracket down the left edge, with a pill, over the rows that went out together
  for (let i = start; i < upTo; i++) {
    const b = msgs[i].batch;
    if (b === undefined || msgs[i - 1]?.batch === b && i > start) continue;
    let j = i;
    while (j + 1 < upTo && msgs[j + 1].batch === b) j++;
    if (j === i) continue;
    const y0 = rowY(i) - 13, y1 = rowY(j) + 22, x = PAD + 10;
    s += `<g class="batch" data-batch="${b}" data-n="${j - i + 1}">${ink(`M${f(x + 6)} ${f(y0)}L${f(x)} ${f(y0)}L${f(x)} ${f(y1)}L${f(x + 6)} ${f(y1)}`, 1.6)}`
      + flatPill(x + 26, (y0 + y1) / 2, 'AT ONCE', fs * .85) + '</g>';
  }
  return { svg: s, w, h };
}

/** The figure in words, for its aria-label: the lanes, then every message shown so far. */
export function flatLabel(lanes: Lane[], msgs: Msg[], upTo = msgs.length): string {
  const head = `Sequence across ${lanes.length} lanes: ${lanes.map(l => l.name).join(', ')}.`;
  if (upTo <= 0) return `${head} No messages yet.`;
  const said = msgs.slice(0, upTo).map((m, i) =>
    `${i + 1}: ${nameOf(lanes, m.from)} to ${nameOf(lanes, m.to)}, ${m.kind}, "${m.text}"${m.stamp ? `, stamped ${m.stamp.toLowerCase()}` : ''}${m.batch !== undefined ? ', sent at once with the others in its batch' : ''}.`);
  return `${head} ${Math.min(upTo, msgs.length)} of ${msgs.length} messages so far. ${said.join(' ')}`;
}
