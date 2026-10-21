// Pieces the multimodal chapters share: the stage (the scanning table, or the Patches tab: the image rasterised at the
// chosen size with its patch grid), the size range, a recorded reading graded field by field, and a cited fact. The
// drawings are this module's own SVG (every string escaped in images.ts); the canvas gets them as an image, so no markup
// is injected into the page. Every other string is React text.
import { useEffect, useId, useRef, useState } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import { image, svgOf, type ImageId } from '../../lib/multimodal/images';
import { thousands } from '../../lib/multimodal/patches';
import { METHOD_NAME, SIZES, costOf, grade, reading, sent, type Method, type Size } from '../../lib/multimodal/readings';
import { fact } from '../../lib/multimodal/facts';
import { SCAN_BOARD, scanLabel, scanScene } from '../../components/scenes/scanScene';
import { patchGrid } from '../../components/scenes/patchGrid';
import { useNarrow } from '../tool-calling/kit';
import './multimodal.css';

export const px = (n: number) => `${thousands(n)} px`;

/** The Patches view in words: the size, the token count, what the image shows, and (once read) the recorded reading at
 * this size and what it lost. */
export function patchLabel(id: ImageId, size: number, method: Method | null = null): string {
  const im = image(id), s = sent(id, size), c = s.count;
  let t = `${im.title}, sent at ${s.w} × ${s.h} px${c.downscaled ? `, scaled down to ${c.w} × ${c.h} to fit the model’s limits` : ''}: `
    + `${c.cols} × ${c.rows} patches, ${thousands(c.tokens)} image tokens. ${im.alt}`;
  if (method) { const r = reading(id, size, method); t += ` Recorded ${METHOD_NAME[method]} reading at this size: “${r.text.replace(/\n/g, ' / ')}” ${r.note}`; }
  return t;
}

const INTRINSIC = 960;   // the canvas's long side in device pixels; CSS fits it to the frame
/** The precise view: the image rasterised at the size the model reads it (after any downscale), drawn back up with no
 * smoothing so lost detail shows as blocks, the 28 px patch grid over it (padding shaded), and a close-up of its finest
 * detail. The cells are not controls: the size range in the story column is the one control. */
export function PatchView({ image: id, size, method = null, grid = true }: { image: ImageId; size: number; method?: Method | null; grid?: boolean }) {
  const im = image(id), s = sent(id, size), g = patchGrid(s.w, s.h), d = im.detail;
  const main = useRef<HTMLCanvasElement>(null), zoom = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading'), [attempt, setAttempt] = useState(0);
  const k = INTRINSIC / Math.max(g.pw, g.ph), W = Math.round(g.pw * k), H = Math.round(g.ph * k);
  const zw = 480, zh = Math.round(zw * d.h / d.w);
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (!live || !main.current || !zoom.current) return;
      // the image as the model gets it: g.w × g.h pixels
      const off = document.createElement('canvas');
      off.width = g.w; off.height = g.h;
      off.getContext('2d')!.drawImage(img, 0, 0, g.w, g.h);
      const c = main.current.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      c.fillStyle = 'rgba(65,83,143,.25)';
      c.fillRect(0, 0, W, H);
      c.drawImage(off, 0, 0, g.w * k, g.h * k);
      if (grid) {
        c.strokeStyle = 'rgba(35,30,22,.5)';
        c.lineWidth = 1;
        c.beginPath();
        for (const x of g.xs) { c.moveTo(Math.round(x * k) + .5, 0); c.lineTo(Math.round(x * k) + .5, H); }
        for (const y of g.ys) { c.moveTo(0, Math.round(y * k) + .5); c.lineTo(W, Math.round(y * k) + .5); }
        c.stroke();
      }
      const r = g.w / im.w, z = zoom.current.getContext('2d')!;
      z.imageSmoothingEnabled = false;
      z.drawImage(off, d.x * r, d.y * r, d.w * r, d.h * r, 0, 0, zw, zh);
      setState('ready');
    };
    img.onerror = () => { if (live) setState('failed'); };
    setState('loading');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgOf(id));
    return () => { live = false; };
  }, [id, g.w, g.h, grid, attempt, W, H, k, zw, zh, d.x, d.y, d.w, d.h, im.w]);
  return (
    <figure className="mm-patches" data-image={id} data-size={size} data-state={state} data-cells={g.cols * g.rows}>
      <div className="mm-canvas-box">
        <canvas ref={main} width={W} height={H} role="img" aria-label={patchLabel(id, size, method)} className="mm-canvas" />
        {state === 'loading' && <span className="mm-pill">Drawing…</span>}
        {state === 'failed' && (
          <p className="mm-failed">The image could not be drawn. <button type="button" className="chip" onClick={() => setAttempt(a => a + 1)}>Retry</button></p>
        )}
      </div>
      <figcaption>
        <canvas ref={zoom} width={zw} height={zh} className="mm-zoom" role="img" aria-label={`Close-up of ${d.what} at this size`} />
        <span className="mm-zoom-cap">Close-up: {d.what}</span>
        <span className="mm-readout" data-testid="patch-count">{s.w} × {s.h} px · {g.cols} × {g.rows} patches · {thousands(g.cols * g.rows)} tokens{s.count.downscaled ? ` · scaled down to ${g.w} × ${g.h}` : ''}</span>
      </figcaption>
    </figure>
  );
}

/** What a chapter puts on the stage: the image, its size, how it is read (null before a reading), the caption. */
export interface Shown { image: ImageId; size: number; method: Method | null; caption: string; stamp?: Stamp }
export type View = 'scene' | 'patches';

const FILL = { height: '100%' };
/** The chapters' stage: the scanning table (default) or the Patches tab, one at a time. The tab is the reader's view,
 * kept out of saved progress unless the chapter passes `view` and `onView`. */
export function MultimodalStage({ shown: s, view: kept, onView }: { shown: Shown; view?: View; onView?: (v: View) => void }) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own, setView = onView ?? setOwn;
  const o = { image: s.image, size: s.size, method: s.method, scale: useNarrow() ? 2 : 1.2 };
  return (
    <div className="tc-stage mm-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>Picture</button>
        <button type="button" className="chip" aria-pressed={view === 'patches'} onClick={() => setView('patches')}>Patches</button>
      </div>
      <div className="tc-frame">
        {view === 'patches'
          ? <PatchView image={s.image} size={s.size} method={s.method} />
          : <IsoStage className="scan" board={SCAN_BOARD} style={FILL} scene={scanScene(o)} label={scanLabel(o)} />}
      </div>
      <p className="tc-caption">
        {s.stamp && <span className={`stamp ${STAMP_CLASS[s.stamp]}`}>{s.stamp}</span>}
        <span className="txt">{s.caption}</span>
      </p>
    </div>
  );
}

/** The size control: a native range over a finite list of sizes (long edge), announcing the size and its token count. */
export function SizeRange({ image: id, value, sizes = SIZES, onChange }: { image: ImageId; value: Size; sizes?: readonly Size[]; onChange: (s: Size) => void }) {
  const rid = 'sz' + useId().replace(/[^\w-]/g, ''), i = Math.max(0, sizes.indexOf(value));
  const words = (s: Size) => `${px(s)}, ${thousands(sent(id, s).count.tokens)} image tokens`;
  return (
    <div className="mm-range">
      <label htmlFor={rid}>Size</label>
      <input id={rid} type="range" min={0} max={sizes.length - 1} step={1} value={i} aria-valuetext={words(value)}
        onChange={e => onChange(sizes[Number(e.currentTarget.value)])} />
      <output htmlFor={rid} aria-live="polite">{words(value)}</output>
    </div>
  );
}

const Mark = ({ ok }: { ok: boolean }) => <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'RIGHT' : 'WRONG'}</span>;

/** One recorded reading, labelled as recorded: its text, then every field graded live, its cost and its note. */
export function ReadingCard({ image: id, size, method, fields = true }: { image: ImageId; size: number; method: Method; fields?: boolean }) {
  const g = grade(id, size, method), cost = costOf(id, size, method);
  return (
    <div className="tc-def mm-reading" data-image={id} data-size={size} data-method={method} data-right={g.right}>
      <p className="lbl">{METHOD_NAME[method]} · {image(id).title.toLowerCase()} at {px(size)} <span className="mm-tag">recorded reading</span></p>
      <p className="mm-text">{g.reading.text}</p>
      {fields && g.of > 0 && (
        <table className="tc-ledger" style={{ marginTop: 8 }}>
          <caption>Fields, graded: {g.right} of {g.of} right</caption>
          <tbody>
            {g.fields.map(f => (
              <tr key={f.id} data-field={f.id}>
                <th scope="row">{f.label}</th>
                <td>{f.value ?? <em>not read</em>}</td>
                <td><Mark ok={f.right} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="note">{g.reading.note}</p>
      <p className="note">The model read {thousands(cost)} {method === 'ocr' ? 'text tokens (the OCR text)' : 'image tokens'}.</p>
    </div>
  );
}

/** A cited fact from data/multimodal/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <a className="source" href={f.source} target="_blank" rel="noreferrer">Source: {new URL(f.source).hostname}</a> (checked {f.accessed})
    </p>
  );
}

/** Said wherever readings are shown (R6). */
export const RecordedNote = () => (
  <p className="mm-note">The readings were written for this site to illustrate the cited findings; they were not measured on a real model. Image token counts follow Anthropic’s published rule, computed live; OCR text is counted with this site’s tokenizer.</p>
);
