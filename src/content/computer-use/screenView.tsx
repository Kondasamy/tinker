// The Screen view (KTD15): the screenshot the agent gets, rasterised at its own size and drawn back up with no
// smoothing, so a small screenshot looks as coarse as it is. Marks show where the agent aimed (in the screenshot's own
// pixels) and where the host clicked. In a prediction step, focusable targets sit over every clickable thing: arrow keys
// move between them, Enter or a tap picks one, and the pick locks like Predict. On phones a target is at least 44 px;
// small neighbours (the order list's Reorder links) merge into one. The drawing is this module's own escaped SVG,
// handed to the canvas as an image, so no markup is injected into the page.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { SCREEN, screenWords, shotOf, svgOf, type El, type Size, type View } from '../../lib/computer-use/screens';
import { useNarrow } from '../tool-calling/kit';

export interface Target {
  id: string;
  label: string;
  /** [x, y, w, h] on the real screen */
  box: [number, number, number, number];
  /** the elements it stands for */
  ids: string[];
}
/** A phone's stage is about this wide, in CSS pixels; a target must be 44 of them. */
const PHONE_W = 358,
  MIN = 44;
/** The view's clickable things as prediction targets; on phones, small neighbours that would overlap at 44 px merge. */
export function targetsOf(v: View, phone: boolean): Target[] {
  const one = (e: El): Target => ({ id: e.id, label: e.label, box: e.box, ids: [e.id] });
  if (!phone) return v.els.map(one);
  const min = (MIN * SCREEN.w) / PHONE_W;
  const grown = (t: Target): [number, number, number, number] => {
    const [x, y, w, h] = t.box,
      gw = Math.max(w, min),
      gh = Math.max(h, min);
    return [x + w / 2 - gw / 2, y + h / 2 - gh / 2, gw, gh];
  };
  const meet = (a: Target, b: Target) => {
    const [ax, ay, aw, ah] = grown(a),
      [bx, by, bw, bh] = grown(b);
    return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
  };
  const out: Target[] = [];
  for (const t of v.els.map(one)) {
    const m = out.find(o => meet(o, t));
    if (!m) {
      out.push(t);
      continue;
    }
    const [x0, y0] = [Math.min(m.box[0], t.box[0]), Math.min(m.box[1], t.box[1])],
      x1 = Math.max(m.box[0] + m.box[2], t.box[0] + t.box[2]),
      y1 = Math.max(m.box[1] + m.box[3], t.box[1] + t.box[3]);
    m.box = [x0, y0, x1 - x0, y1 - y0];
    m.ids.push(t.id);
    m.id = m.ids.join('+');
  }
  for (const t of out) {
    const labels = [...new Set(t.ids.map(id => v.els.find(e => e.id === id)!.label))];
    if (t.ids.length > 1) t.label = labels.length === 1 ? `one of the ${labels[0]} links` : labels.join(' or ');
  }
  return out;
}

const pct = (n: number, of: number) => `${(100 * n) / of}%`;

export interface ScreenViewProps {
  view: View;
  size: Size;
  /** where the agent aimed, in the screenshot's pixels */
  aim?: [number, number];
  /** where the host clicked on the real screen, and whether it went well */
  hit?: { real: [number, number]; ok: boolean };
  stale?: boolean;
  predict?: { pick: string | null; onPick: (id: string) => void };
}

export default function ScreenView({ view, size, aim, hit, stale, predict }: ScreenViewProps) {
  const s = shotOf(size),
    phone = useNarrow();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const svg = svgOf(view);
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (!live || !canvas.current) return;
      canvas.current.getContext('2d')!.drawImage(img, 0, 0, s.w, s.h);
      setState('ready');
    };
    img.onerror = () => live && setState('failed');
    setState('loading');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return () => {
      live = false;
    };
  }, [svg, s.w, s.h]);

  const targets = predict ? targetsOf(view, phone) : [];
  const [cur, setCur] = useState(0);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const go = (i: number) => {
    const n = (i + targets.length) % targets.length;
    setCur(n);
    btns.current[n]?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowRight: cur + 1, ArrowDown: cur + 1, ArrowLeft: cur - 1, ArrowUp: cur - 1, Home: 0, End: -1 }[
      e.key
    ];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };
  const locked = predict?.pick != null;
  const aimReal = aim && ([aim[0] / s.scale, aim[1] / s.scale] as [number, number]);
  return (
    <figure className="cu-shot" data-size={size} data-state={state} data-screen={view.screen}>
      <div className="cu-shot-box">
        <canvas
          ref={canvas}
          width={s.w}
          height={s.h}
          role="img"
          aria-label={`The screenshot the agent gets, ${s.w} × ${s.h} px. ${screenWords(view)}`}
        />
        {stale && <span className="cu-stale">Not yet updated</span>}
        {aimReal && (
          <span
            className="cu-mark cu-aim"
            style={{ left: pct(aimReal[0], SCREEN.w), top: pct(aimReal[1], SCREEN.h) }}
            title="Where the agent aimed"
          />
        )}
        {hit && (
          <span
            className={`cu-mark cu-hit${hit.ok ? '' : ' bad'}`}
            data-hit={hit.real.join(',')}
            style={{ left: pct(hit.real[0], SCREEN.w), top: pct(hit.real[1], SCREEN.h) }}
            title="Where the host clicked"
          />
        )}
        {predict && (
          <div className="cu-targets" role="group" aria-label="Where will the agent click?" onKeyDown={key}>
            {targets.map((t, i) => (
              <button
                key={t.id}
                ref={b => {
                  btns.current[i] = b;
                }}
                type="button"
                className="cu-target"
                data-target={t.id}
                tabIndex={i === cur ? 0 : -1}
                aria-pressed={predict.pick === t.id}
                aria-label={`Predict a click on ${t.label}`}
                disabled={locked && predict.pick !== t.id}
                onFocus={() => setCur(i)}
                onClick={() => !locked && predict.onPick(t.id)}
                style={{
                  left: pct(t.box[0] + t.box[2] / 2, SCREEN.w),
                  top: pct(t.box[1] + t.box[3] / 2, SCREEN.h),
                  width: `max(${MIN}px, ${pct(t.box[2], SCREEN.w)})`,
                  height: phone ? `max(${MIN}px, ${pct(t.box[3], SCREEN.h)})` : pct(t.box[3], SCREEN.h),
                }}
              />
            ))}
          </div>
        )}
        {state === 'failed' && <p className="cu-failed">The screenshot could not be drawn.</p>}
      </div>
      <figcaption className="cu-readout">
        Screenshot {s.w} × {s.h} px{size !== SCREEN.w ? `, real screen ${SCREEN.w} × ${SCREEN.h}` : ''}
        {aim ? ` · agent aimed at ${aim[0]}, ${aim[1]}` : ''}
        {hit && aim && (hit.real[0] !== aim[0] || hit.real[1] !== aim[1])
          ? ` · host clicked ${hit.real[0]}, ${hit.real[1]}`
          : ''}
      </figcaption>
    </figure>
  );
}
