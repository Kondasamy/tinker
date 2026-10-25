// Pieces the Calibration chapters share. Larkspur mini's weights come through Fine-tuning's loaders (one per set,
// shared by the page); its held-out guesses are measured a window per animation frame, so the page keeps answering, and
// kept once per loaded model. The stage is the forecaster's booth or the Diagram tab (the reliability diagram), one at a
// time. The temperature is a native range in the story column; the booth's dial only mirrors it (KTD15). Every string
// is React text here; the drawings escape theirs (esc, flatPill), and the diagram's art goes in as an image (a data
// URL), so no markup is injected.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import type { Weights } from '../../lib/lm/load';
import type { Model } from '../../lib/lm/model';
import { JAR_BOARD, jarLabel, jarScene, pct, type JarOpts } from '../../components/scenes/jarScene';
import { binWords, reliabilityChart, reliabilityLabel } from '../../components/scenes/reliabilityChart';
import { TEMPERATURES, measureWindow, measured, remember, windows, type Guess } from '../../lib/calibration/measure';
import { THRESHOLDS, type Threshold } from '../../lib/calibration/answers';
import type { Bin } from '../../lib/calibration/score';
import { fact } from '../../lib/calibration/facts';
import { useNarrow } from '../tool-calling/kit';
import { loadModel, modelNow, useModel } from '../fine-tuning/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './calibration.css';

export { pct, loadModel, modelNow };
export const two = (x: number) => x.toFixed(2);
export const three = (x: number) => x.toFixed(3);
/** The two sets of weights the chapters compare: the base and the style fine-tune. */
export const NAMES: Record<'base' | 'finetuned', string> = { base: 'Larkspur mini', finetuned: 'the style fine-tune' };

// ---- the measurement: a window per frame ----

const BUDGET_MS = 8;
/** Larkspur mini's held-out guesses for a set of weights: loads them, then measures a few windows per animation frame
 * (within BUDGET_MS) so the page keeps answering. Kept per loaded model, so a second use is instant. */
export function useGuesses(weights: Weights | undefined, go = true) {
  const { status, model, retry } = useModel(weights);
  // kept with the model they belong to, so a switch of weights never shows the last model's guesses
  const [got, setGot] = useState<{ model: Model; guesses: Guess[] } | undefined>();
  const guesses = model ? (got?.model === model ? got.guesses : measured(model)) : undefined;
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (!model || !go) return;
    if (measured(model)) return;
    const ws = windows(model.config.ctx),
      out: Guess[] = [];
    let i = 0,
      raf = 0;
    const tick = () => {
      const end = performance.now() + BUDGET_MS;
      do out.push(...measureWindow(model, ws[i++]));
      while (i < ws.length && performance.now() < end);
      setDone(i / ws.length);
      if (i < ws.length) raf = requestAnimationFrame(tick);
      else {
        remember(model, out);
        setGot({ model, guesses: out });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [model, go]);
  return { status, model, guesses, done, retry };
}
/** Guesses already measured for a set of weights (a predicate reads this), or undefined. */
export const guessesNow = (w: Weights) => {
  const m = modelNow(w);
  return m ? measured(m) : undefined;
};
/** Start loading the weights a chapter needs (on load, so it plays on offline). */
export const loadAll = (ws: Weights[]) => Promise.all(ws.map(loadModel));

/** What stands in the frame until the weights are in and measured. */
export function Waiting({ failed, retry, done }: { failed: boolean; retry: () => void; done?: number }) {
  return (
    <div className="cb-wait" role="status" data-state={failed ? 'failed' : 'loading'}>
      {failed ? (
        <div className="cb-error">
          <p>Couldn’t load Larkspur mini.</p>
          <button type="button" className="chip" onClick={retry}>
            Retry
          </button>
        </div>
      ) : (
        <span className="cb-pill">
          {done === undefined || done === 0 ? 'Loading Larkspur mini' : `Reading held-out text: ${pct(done)}`}
        </span>
      )}
    </div>
  );
}

// ---- the Diagram tab ----

/** The reliability diagram: the drawing as an image, a focusable marker per jar over it (arrow keys, Home, End) and a
 * read-out line under it. */
export function Reliability({ bins }: { bins: Bin[] }) {
  const phone = useNarrow(),
    id = 'rl' + useId().replace(/[^\w-]/g, '');
  const c = reliabilityChart(bins, phone);
  const [cur, setCur] = useState(c.points.length - 1);
  const at = Math.max(0, Math.min(cur, c.points.length - 1)),
    m = c.points[at];
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.w} ${c.h}"><defs>${filterFor(1, 'hand')}</defs><g filter="url(#hand)">${c.svg}</g></svg>`;
  const go = (i: number) => {
    const n = Math.max(0, Math.min(c.points.length - 1, i));
    setCur(n);
    (document.getElementById(`${id}-${n}`) as SVGElement | null)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = {
      ArrowRight: at + 1,
      ArrowUp: at + 1,
      ArrowLeft: at - 1,
      ArrowDown: at - 1,
      Home: 0,
      End: c.points.length - 1,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      go(to);
    }
  };
  return (
    <figure className="cb-chart">
      <svg viewBox={`0 0 ${c.w} ${c.h}`} role="group" aria-label={reliabilityLabel(bins)} onKeyDown={key}>
        <image href={`data:image/svg+xml,${encodeURIComponent(doc)}`} width={c.w} height={c.h} aria-hidden="true" />
        {c.points.map((p, i) => (
          <g
            key={`${p.bin.lo}-${p.bin.hi}`}
            id={`${id}-${i}`}
            className="cb-mark"
            role="button"
            tabIndex={i === at ? 0 : -1}
            aria-pressed={i === at}
            aria-label={binWords(p.bin)}
            onClick={() => go(i)}
            onFocus={() => setCur(i)}
            data-bin={i}
          >
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
            {i === at && <circle cx={p.x} cy={p.y} r={8} className="cb-ring" />}
          </g>
        ))}
      </svg>
      <p className="cb-readout" aria-live="polite">
        {m ? binWords(m.bin) : 'Nothing measured yet.'}
      </p>
    </figure>
  );
}

// ---- the stage ----

/** What a chapter puts on the stage: the booth's settings, the caption, and what stands in the frame while waiting. */
export interface Shown {
  booth: Omit<JarOpts, 'scale' | 'say' | 'drop'>;
  caption: string;
  stamp?: Stamp;
  /** stands in the frame instead of the picture (the loading pill) */
  wait?: ReactNode;
}
export type View = 'scene' | 'diagram';

const FILL = { height: '100%' };
/** The chapters' stage: the booth (default) or the Diagram tab, one at a time. The tab is the reader's view, kept out of
 * saved progress unless the chapter passes `view` and `onView`. */
export function CalibrationStage({
  shown: s,
  view: keep,
  onView,
  say,
}: {
  shown: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn over a part of the booth (JAR_PARTS); the diagram ignores it */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = keep ?? own,
    setView = onView ?? setOwn;
  // marbles drop in when the jars' contents change (sorted, or re-sorted by the dial), not on every re-render
  // (for the drop's length, so the step change that follows a sort doesn't cut it short)
  const key = s.booth.jars.map(b => `${b.lo}:${b.n}:${b.right}`).join('|'),
    last = useRef(key),
    [falling, setFalling] = useState(false),
    drop = (falling || last.current !== key) && s.booth.jars.length > 0;
  useEffect(() => {
    if (last.current === key) return;
    last.current = key;
    setFalling(true);
    const t = setTimeout(() => setFalling(false), 1100);
    return () => clearTimeout(t);
  }, [key]);
  const o: JarOpts = { ...s.booth, drop, scale: useNarrow() ? 2 : 1.25, say };
  const can = !s.wait && s.booth.jars.length > 0;
  return (
    <div className="tc-stage cb-stage" data-model={s.wait ? 'waiting' : 'ready'}>
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'diagram'}
          disabled={!can}
          onClick={() => setView('diagram')}
        >
          Diagram
        </button>
      </div>
      <div className="tc-frame">
        {s.wait ??
          (view === 'diagram' && can ? (
            <div className="cb-scroll">
              <Reliability bins={s.booth.jars} />
            </div>
          ) : (
            <IsoStage className="booth" board={JAR_BOARD} style={FILL} scene={jarScene(o)} label={jarLabel(o)} />
          ))}
      </div>
      <p className="tc-caption">
        {s.stamp && <span className={`stamp ${STAMP_CLASS[s.stamp]}`}>{s.stamp}</span>}
        <span className="txt">{s.caption}</span>
      </p>
    </div>
  );
}

// ---- controls ----

/** A native range over a finite list, its value named beside it. */
function ListRange<T>({
  label,
  list,
  value,
  words,
  onChange,
}: {
  label: string;
  list: readonly T[];
  value: T;
  words: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const id = 'rng' + useId().replace(/[^\w-]/g, ''),
    i = Math.max(0, list.indexOf(value));
  return (
    <div className="cb-range">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={list.length - 1}
        step={1}
        value={i}
        aria-valuetext={words(value)}
        onChange={e => onChange(list[Number(e.currentTarget.value)])}
      />
      <output htmlFor={id} aria-live="polite">
        {words(value)}
      </output>
    </div>
  );
}
export const tWords = (T: number) => (T === 1 ? 'T 1: as trained' : T > 1 ? `T ${T}: softer` : `T ${T}: sharper`);
/** The temperature: the reader's control; the booth's dial mirrors it. */
export const TemperatureRange = ({
  value,
  onChange,
  temps = TEMPERATURES,
}: {
  value: number;
  onChange: (T: number) => void;
  temps?: readonly number[];
}) => <ListRange label="Temperature" list={temps} value={value} words={tWords} onChange={onChange} />;
export const thresholdWords = (t: number) => (t === 0 ? 'hand over none' : `hand over below ${pct(t)}`);
export const ThresholdRange = ({ value, onChange }: { value: Threshold; onChange: (t: Threshold) => void }) => (
  <ListRange label="Hand-over line" list={THRESHOLDS} value={value} words={thresholdWords} onChange={onChange} />
);

/** A cited fact from data/calibration/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the assistant's answer set shows (R6). */
export const StandIn = () => (
  <p className="cb-note">
    A stand-in: sixty answers and their confidences were written for this site to show a pattern published research
    reports. They are not a real model’s.
  </p>
);
/** Said wherever Larkspur mini's measured numbers show. */
export const MiniNote = () => (
  <p className="cb-note">
    Measured live in your browser on Larkspur mini, this site’s tiny model, over held-out text it never trained on. Its
    own numbers, not a large model’s.
  </p>
);
