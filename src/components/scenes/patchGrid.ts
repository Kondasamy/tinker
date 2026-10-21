// Multimodal's precise view, the geometry half (KTD16): the image as the model gets it, cut into 28 px patches. The image
// is drawn at its sent size from the top-left; the last column and row are padded out to a whole patch, as the docs
// describe. Pure, so the tests can count cells; the kit's canvas strokes these lines, and gridSvg draws them for still
// pictures (share images, the dev page).
import { PATCH, imageTokens, thousands } from '../../lib/multimodal/patches';
import { esc } from '../../lib/iso/blocks';
import { svgOf, type ImageId } from '../../lib/multimodal/images';
import { sent } from '../../lib/multimodal/readings';

export interface Grid {
  /** the image's size as read (after any downscale) */
  w: number; h: number;
  /** the padded size: whole patches */
  pw: number; ph: number;
  cols: number; rows: number;
  /** inner grid lines, in the read image's pixels */
  xs: number[]; ys: number[];
}

/** The patch grid over an image sent at w × h (scaled down to the model's limits first). */
export function patchGrid(w: number, h: number): Grid {
  const c = imageTokens(w, h);
  return {
    w: c.w, h: c.h, cols: c.cols, rows: c.rows, pw: c.cols * PATCH, ph: c.rows * PATCH,
    xs: Array.from({ length: c.cols - 1 }, (_, i) => (i + 1) * PATCH),
    ys: Array.from({ length: c.rows - 1 }, (_, i) => (i + 1) * PATCH),
  };
}

export const gridWords = (g: Grid) => `${g.cols} × ${g.rows} patches, ${thousands(g.cols * g.rows)} tokens`;

/** The grid as an SVG overlay in the padded image's pixels: the padding shaded, every patch line drawn. */
export function gridSvg(g: Grid, stroke = '#231e16'): string {
  const sw = Math.max(1, g.pw / 600);
  let s = `<rect x="${g.w}" y="0" width="${g.pw - g.w}" height="${g.ph}" fill="#41538f" fill-opacity=".25"/>`
    + `<rect x="0" y="${g.h}" width="${g.w}" height="${g.ph - g.h}" fill="#41538f" fill-opacity=".25"/>`;
  s += `<path d="${g.xs.map(x => `M${x} 0V${g.ph}`).join('')}${g.ys.map(y => `M0 ${y}H${g.pw}`).join('')}" stroke="${esc(stroke)}" stroke-opacity=".45" stroke-width="${sw.toFixed(2)}" fill="none"/>`;
  return s + `<rect x="0" y="0" width="${g.pw}" height="${g.ph}" fill="none" stroke="${esc(stroke)}" stroke-width="${(sw * 2).toFixed(2)}"/>`;
}

const dataUri = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
/** A still for build-time pages (the intro, share images): the drawn image at its sent size under its patch grid, as a
 * data URI for an <img>, so no markup is injected. */
export function patchStill(id: ImageId, size: number): { src: string; grid: Grid } {
  const z = sent(id, size), g = patchGrid(z.w, z.h);
  return { grid: g, src: dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.pw} ${g.ph}"><image href="${dataUri(svgOf(id))}" width="${g.w}" height="${g.h}" preserveAspectRatio="none"/>${gridSvg(g)}</svg>`) };
}
