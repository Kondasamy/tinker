// Helpers for the scenes that compose Tool calling's office (agents, guardrails, sandboxing): officeScene returns one
// string, so a composer that adds props reads it in layers. The office paints its shadows first (the floor layer), so a
// composer's own shadows go straight after them, under every body, never over a crate or desk (KTD3).
import { SHADOW } from '../../lib/iso/core.js';
import { splitOffice } from './officeScene';

// one cast shadow, bare or clipped to the board (castShadow's two forms)
const SHADE = `(?:<clipPath id="[^"]*"><path d="[^"]*"/></clipPath><g clip-path="url\\(#[^)]*\\)"><path d="[^"]*" fill="${SHADOW}" /></g>|<path d="[^"]*" fill="${SHADOW}" />)`;
const FLOOR = new RegExp(`^${SHADE}*`);

/** Where officeScene stands its employee, and the pose (AT.emp plus [27, 3], facing 200). A composer that cuts the
 * employee out with withoutPerson stands someone here, or the employee again, so the office's shadow still fits. */
export const EMPLOYEE = { x: 169, y: 239, facing: 200 };

/** The office's SVG in layers: its shadows (floor), its art (belts and bodies), its name pills, its step callout. */
export function officeLayers(svg: string) {
  const { art, names, callout } = splitOffice(svg),
    floor = FLOOR.exec(art)?.[0] ?? '';
  return { floor, art: art.slice(floor.length), names, callout };
}

/** The office's SVG without the person of one look (a composer stands its own character on that spot, so the
 * office's shadow for them still fits). Unchanged when no such person is drawn. */
export function withoutPerson(svg: string, look: string) {
  const i = svg.indexOf(`<g class="person" data-look="${look}"`);
  if (i < 0) return svg;
  const tags = /<g[\s>]|<\/g>/g;
  tags.lastIndex = i;
  let depth = 0;
  for (let m = tags.exec(svg); m; m = tags.exec(svg)) {
    depth += m[0] === '</g>' ? -1 : 1;
    if (!depth) return svg.slice(0, i) + svg.slice(tags.lastIndex);
  }
  return svg;
}
