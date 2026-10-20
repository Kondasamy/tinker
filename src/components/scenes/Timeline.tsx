// History scene: each era is an object on a long board. Its glass column shows the largest context window
// cited for that era (log scale). The learner clicks (or Enter/Space on) the next era to open it.
import type { KeyboardEvent, MouseEvent } from 'react';
import IsoStage, { type SceneCtx } from '../../lib/iso/IsoStage';
import { BH, ACC, boxCorners, glassCase } from '../../lib/iso/blocks';
import { PALS, METAL, CLEAR, CERAMIC, INK, box, pd, on, PZ, rrUV, castShadow, byDepth, hullInk, toneI, tag } from '../../lib/iso/core.js';
import { formatTokens, type TimelineEntry } from '../../lib/scale';

export interface Era { id: string; label: string; title: string; pal: { l: string; m: string; d: string } }

export const ERAS: Era[] = [
  { id: 'origins', label: '2020', title: 'RAG is named', pal: PALS.mint },
  { id: 'small-windows', label: '2023', title: 'Small windows', pal: PALS.mustard },
  { id: 'retrieval-matures', label: '2024', title: 'Retrieval matures', pal: PALS.cobalt },
  { id: 'agents', label: 'Late 2024–26', title: 'RAG becomes a tool', pal: PALS.tomato },
];

const GAP = 74, Y = 30, H = 17, PED = 9, COL = 40;
const X = (i: number) => 34 + i * GAP;
const LOG_MIN = 3, LOG_MAX = 7;   // 1K … 10M tokens
const colHeight = (t: number) => COL * Math.min(1, Math.max(0.08, (Math.log10(t) - LOG_MIN) / (LOG_MAX - LOG_MIN)));

/** Largest context window cited for an era, if any entry cites one. */
export const eraWindow = (entries: TimelineEntry[], era: string) =>
  Math.max(0, ...entries.filter(e => e.era === era && e.contextTokens).map(e => e.contextTokens!));

/** pills: label size (1 = page size; the share images pass more) */
interface Props { entries: TimelineEntry[]; visited: number; active: number | null; onPick: (i: number) => void; pills?: number }

export default function Timeline({ entries, visited, active, onPick, pills = 1 }: Props) {
  const scene = ({ top }: SceneCtx) => {
    const items = ERAS.map((era, i) => {
      const x = X(i), open = i < visited, next = i === visited, win = eraWindow(entries, era.id);
      const pal = open ? era.pal : METAL;
      const z1 = BH + PED;
      let s = '';
      if (next || i === active) s += `<path class="${next ? 'pulse' : ''}" d="${pd(on(PZ(BH + .3), rrUV(x - H - 4, Y - H - 4, x + H + 4, Y + H + 4, 5)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>`;
      s += box(x - H, Y - H, BH, x + H, Y + H, z1, pal, toneI, 1);
      if (win && open) {
        const h = colHeight(win);
        s += glassCase(x - 10, Y - 10, z1, x + 10, Y + 10, z1 + h, CLEAR, box(x - 8, Y - 8, z1, x + 8, Y + 8, z1 + h - 1.5, era.pal, toneI, .5));
      } else if (open) {
        // before chat models: a stack of paper, the documents RAG fetches from
        for (let k = 0; k < 3; k++) s += box(x - 9 + k, Y - 11 + k, z1 + k * 3, x + 9 + k, Y + 11 + k, z1 + k * 3 + 3, CERAMIC, toneI, .6);
      }
      s += hullInk(boxCorners(x - H, Y - H, BH, x + H, Y + H, z1), 2.2);
      const what = open ? `${era.label}, ${era.title}${win ? `, context window up to ${formatTokens(win)} tokens` : ''}` : `${era.label}, not opened yet`;
      return { at: [x, Y, 0], svg: `<g class="era" role="button" tabindex="0" data-era="${i}" aria-label="${what}">${s}</g>` };
    });
    const shadows = ERAS.map((_, i) => castShadow(boxCorners(X(i) - H, Y - H, BH, X(i) + H, Y + H, BH + PED + 20), BH, top)).join('');
    // the rail joining the eras
    const rail = `<path d="${pd([[X(0), Y + H + 6, BH + .2], [X(ERAS.length - 1), Y + H + 6, BH + .2]], false)}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    // readable label pills over every era, drawn last; clicks pass through to the era objects
    const tags = ERAS.map((era, i) => {
      const open = i < visited, win = eraWindow(entries, era.id), top = BH + PED + (win && open ? colHeight(win) : open ? 9 : 0);
      return `<g aria-hidden="true" pointer-events="none">${tag([X(i), Y, top], 0, -14, open && win ? `${era.label} · ${formatTokens(win)}` : era.label, i === active, pills)}</g>`;
    }).join('');
    return rail + shadows + byDepth(items) + tags;
  };

  const pick = (e: MouseEvent | KeyboardEvent) => {
    const g = (e.target as Element).closest('[data-era]');
    if (!g) return;
    if ('key' in e) { if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); }
    onPick(Number(g.getAttribute('data-era')));
  };

  return (
    <figure>
      {/* clicks and keys bubble up from the era objects drawn inside the SVG */}
      <div className="timeline" onClick={pick} onKeyDown={pick} role="presentation">
        <IsoStage board={[0, 0, X(ERAS.length - 1) + 34, 60]} scene={scene} role="group"
          label={`Timeline of ${ERAS.length} eras from 2020 to 2026; ${visited} opened. Glass columns show the largest context window of each era.`} />
      </div>
      <figcaption>
        {active === null ? 'Click the glowing era to open it.' : `${ERAS[active].label}: ${ERAS[active].title}. Columns: largest context window of each era (log scale).`}
      </figcaption>
    </figure>
  );
}
