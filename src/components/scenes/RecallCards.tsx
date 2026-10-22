// A stack of recall cards in the Colorfigures look (flat three-tone fills, heavy ink, flat blue shadow, wobble):
// the recap page's picture and its share image. Text only in pills and the stamp.
import { useId } from 'react';
import { PALS, INK, SHADOW, filterFor, f } from '../../lib/iso/core.js';
import { flatPill } from '../../lib/iso/flat';

const W = 360, H = 270, CW = 210, CH = 150;
type Mat = { l: string; m: string; d: string };

function card(pal: Mat, cx: number, cy: number, deg: number, face = '') {
  const x = cx - CW / 2, y = cy - CH / 2;
  return `<g transform="rotate(${deg} ${f(cx)} ${f(cy)})">`
    + `<rect x="${f(x + 7)}" y="${f(y + 7)}" width="${CW}" height="${CH}" rx="12" fill="${SHADOW}" fill-opacity=".85"/>`
    + `<rect x="${f(x)}" y="${f(y)}" width="${CW}" height="${CH}" rx="12" fill="${pal.l}" stroke="${INK}" stroke-width="2.4"/>`
    + `<path d="M${f(x + 8)} ${f(y + CH - 5)}L${f(x + CW - 8)} ${f(y + CH - 5)}" stroke="${pal.m}" stroke-width="5" stroke-linecap="round"/>`
    + `<path d="M${f(x + CW - 6)} ${f(y + 12)}L${f(x + CW - 6)} ${f(y + CH - 14)}" stroke="${pal.d}" stroke-width="2" stroke-opacity=".35" stroke-linecap="round"/>`
    + face + '</g>';
}

// the front card: a question pill, three options (the middle one picked) and a RIGHT stamp
function front(cx: number, cy: number) {
  const x = cx - CW / 2, y = cy - CH / 2;
  const opt = (i: number) => {
    const oy = y + 52 + i * 26, on = i === 1;
    return `<rect x="${f(x + 18)}" y="${f(oy)}" width="${CW - 44}" height="18" rx="5" fill="${on ? INK : '#fff4d6'}" stroke="${INK}" stroke-width="1.6"/>`
      + `<rect x="${f(x + 28)}" y="${f(oy + 7)}" width="${[80, 104, 64][i]}" height="4" rx="2" fill="${on ? '#fff4d6' : PALS.mustard.m}"/>`;
  };
  const sx = x + CW - 38, sy = y + 30;
  const stamp = `<g transform="rotate(-10 ${f(sx)} ${f(sy)})"><rect x="${f(sx - 34)}" y="${f(sy - 12)}" width="68" height="24" rx="4" fill="#fbf8f0" fill-opacity=".92" stroke="#2a744b" stroke-width="2.4"/>`
    + `<text x="${f(sx)}" y="${f(sy + 5)}" font-size="13" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" letter-spacing=".14em" fill="#2a744b">RIGHT</text></g>`;
  return flatPill(x + 52, y + 26, 'RECALL', 11) + [0, 1, 2].map(opt).join('') + stamp;
}

export default function RecallCards({ label = 'A stack of recall cards; the top one has a question, three options and a RIGHT stamp' }: { label?: string }) {
  const id = 'rc' + useId().replace(/[^\w-]/g, '');
  const svg = card(PALS.blush, 150, 118, -9) + card(PALS.cobalt, 205, 130, 6) + card(PALS.mint, 178, 148, -2, front(178, 148));
  return (
    <svg className="recall-cards" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the ink filter, built from numbers */}
      <defs dangerouslySetInnerHTML={{ __html: filterFor(1, id) }} />
      {/* fixed strings only: nothing from readers reaches this markup */}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup the kit built, every string escaped (esc) */}
      <g filter={`url(#${id})`} dangerouslySetInnerHTML={{ __html: svg }} />
    </svg>
  );
}
