// Pieces the fine-tuning chapters share: Larkspur mini's three sets of weights (each loaded once per page, with a gate
// that holds the stage's frame while loading), and the stage (the training bench, or the Results tab: the loss chart or
// Evals' grid). Every string is React text here; the drawings escape theirs (esc), and the loss chart's art goes in as
// an image (a data URL), so no markup is injected.
import { useEffect, useId, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import { fetchLoader, type Loader } from '../../lib/rag/load';
import { modelLoader, type Meta, type Weights } from '../../lib/lm/load';
import type { Model } from '../../lib/lm/model';
import { QUESTIONS } from '../../lib/evals/suite';
import { gradeVersion, PRICE_CHANGE, QUESTION_IDS, VERSIONS, type VersionId } from '../../lib/fine-tuning/engine';
import { fact } from '../../lib/fine-tuning/facts';
import { TRAIN_BOARD, trainLabel, trainScene, type TrainOpts } from '../../components/scenes/trainScene';
import { chartLabel, lossChart, runSeries, stepWords, type Series } from '../../components/scenes/lossChart';
import type { GridCol } from '../../components/scenes/evalGrid';
import { Grid } from '../evals/kit';
import { useNarrow } from '../tool-calling/kit';
import metaJson from '../../../public/data/lm/meta.json';
import './fine-tuning.css';

/** Larkspur mini's layout and recorded runs (the loss curves), read at build time: the chart needs no download. */
export const META = metaJson as unknown as Meta;
/** The full fine-tune's and the LoRA run's curves, training and held-out. */
export const FINETUNE_SERIES = runSeries(META.finetune!),
  LORA_SERIES = runSeries(META.lora!);

// ---- the models: one loader per set of weights, shared by the stage and every control ----

let files: Loader = fetchLoader('/data/lm/');
let loaders: Partial<Record<Weights, ReturnType<typeof modelLoader>>> = {};
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const loaderOf = (w: Weights) => (loaders[w] ??= modelLoader(files, w));
/** Where the weights come from (tests and the dev page pass a disk or failing loader); drops every loaded model. */
export function setModelFiles(l: Loader) {
  files = l;
  loaders = {};
  emit();
}
/** The loaded model, or undefined: step predicates read this, so no step advances before the weights are in. */
export const modelNow = (w: Weights): Model | undefined => loaderOf(w).get();
/** Start (or, after a failure, retry) loading; every subscriber re-renders when it settles. */
export function loadModel(w: Weights) {
  const p = loaderOf(w).load();
  emit();
  return p.then(
    m => {
      emit();
      return m;
    },
    e => {
      emit();
      throw e;
    },
  );
}
/** The model for a component (none: nothing to load): status, the model once ready, and `retry` after a failure. */
export function useModel(w?: Weights) {
  // the server reads the same store: a page drawn at build time (the dev page) can show a loaded or failed model
  const snap = () => (w ? loaderOf(w).status() : 'ready');
  const status = useSyncExternalStore(
    f => {
      subs.add(f);
      return () => subs.delete(f);
    },
    snap,
    snap,
  );
  useEffect(() => {
    if (w && loaderOf(w).status() === 'idle') loadModel(w).catch(() => {});
  }, [w]);
  return {
    status,
    model: w && status === 'ready' ? loaderOf(w).get() : undefined,
    retry: () => {
      if (w) loadModel(w).catch(() => {});
    },
  };
}

/** What stands in the frame until the weights are in: a "Loading Larkspur mini" pill, or an error card with Retry. */
function Waiting({ failed, retry }: { failed: boolean; retry: () => void }) {
  return (
    <div className="ft-wait" role="status" data-state={failed ? 'failed' : 'loading'}>
      {failed ? (
        <div className="ft-error">
          <p>Couldn’t load Larkspur mini.</p>
          <button type="button" className="chip" onClick={retry}>
            Retry
          </button>
        </div>
      ) : (
        <span className="ft-pill">Loading Larkspur mini</span>
      )}
    </div>
  );
}

/** A story-column control that needs a model: the waiting card until it is in, then the control. */
export function ModelGate({ weights, children }: { weights: Weights; children: (model: Model) => ReactNode }) {
  const { status, model, retry } = useModel(weights);
  return model ? <>{children(model)}</> : <Waiting failed={status === 'error'} retry={retry} />;
}

// ---- the Results tab ----

/** Every question's words by id: Evals' twelve, then the changed price. */
export const questionText = (id: string) =>
  id === PRICE_CHANGE.question.id ? PRICE_CHANGE.question.query : (QUESTIONS.find(q => q.id === id)?.query ?? id);
/** A grid column per version: pass when the recorded answer carries the key fact (Evals' grader). */
export const versionCols = (vs: VersionId[], questions: string[] = QUESTION_IDS): GridCol[] =>
  vs.map(v => ({
    id: v,
    label: VERSIONS.find(x => x.id === v)!.label,
    results: gradeVersion(v, questions).map(g => g.fact),
  }));

/** The loss chart: the drawing as an image, with a focusable marker per recorded step over it (arrow keys, Home, End)
 * and a read-out line under it. */
export function LossChart({ series }: { series: Series[] }) {
  const phone = useNarrow(),
    id = 'loss' + useId().replace(/[^\w-]/g, '');
  const c = lossChart({ series, phone }),
    [cur, setCur] = useState(Math.max(0, c.steps.length - 1));
  const at = Math.min(cur, c.steps.length - 1),
    m = c.steps[at];
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.w} ${c.h}"><defs>${filterFor(1, 'hand')}</defs><g filter="url(#hand)">${c.svg}</g></svg>`;
  const go = (i: number) => {
    const n = Math.max(0, Math.min(c.steps.length - 1, i));
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
      End: c.steps.length - 1,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      go(to);
    }
  };
  return (
    <figure className="ft-chart">
      <svg viewBox={`0 0 ${c.w} ${c.h}`} role="group" aria-label={chartLabel(series)} onKeyDown={key}>
        <image href={`data:image/svg+xml,${encodeURIComponent(doc)}`} width={c.w} height={c.h} aria-hidden="true" />
        {c.steps.map((s, i) => (
          <g
            key={s.step}
            id={`${id}-${i}`}
            className="ft-mark"
            role="button"
            tabIndex={i === at ? 0 : -1}
            aria-pressed={i === at}
            aria-label={stepWords(s)}
            onClick={() => go(i)}
            onFocus={() => setCur(i)}
            data-step={s.step}
          >
            <rect x={s.x - 8} y={0} width={16} height={c.h} fill="transparent" />
            {i === at && <line x1={s.x} x2={s.x} y1={14} y2={c.h - 44} className="ft-rule" />}
            {i === at &&
              s.values.map(v => v.y !== null && <circle key={v.id} cx={s.x} cy={v.y} r={6} className="ft-ring" />)}
          </g>
        ))}
      </svg>
      <p className="ft-readout" aria-live="polite">
        {m ? stepWords(m) : 'No steps recorded yet.'}
      </p>
      <ul className="ft-key">
        {series.map((s, i) => (
          <li key={s.id}>
            <span className="ft-swatch" data-style={i % 3} aria-hidden="true" />
            {s.label} loss
          </li>
        ))}
      </ul>
    </figure>
  );
}

// ---- the stage ----

/** What a chapter puts on the stage: the bench's settings, the Results tab (a loss chart or a version grid), and the
 * caption. */
export interface Shown {
  scene: Omit<TrainOpts, 'scale'>;
  results?: { series: Series[] } | { cols: GridCol[]; questions?: string[] };
  caption: string;
  stamp?: Stamp;
}
export type View = 'scene' | 'results';

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the training bench (default) or the Results tab, one at a time. With `weights` the stage needs
 * that model: it holds its frame with a loading pill (or an error card with Retry) until the weights are in, then
 * `show` gets the model. The tab is the reader's view, kept out of saved progress unless the chapter passes `view` and
 * `onView` to keep it in its step state. */
export function FineTuneStage({
  show,
  weights,
  view: kept,
  onView,
}: {
  show: (model?: Model) => Shown;
  weights?: Weights;
  view?: View;
  onView?: (v: View) => void;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2.2 : 1.3;
  const { status, model, retry } = useModel(weights);
  // while the weights load, the tabs and the frame keep their places, so the stage never changes size
  const s = !weights || model ? show(model) : null,
    r = s?.results,
    o: TrainOpts = { ...s?.scene, scale };
  return (
    <div className="tc-stage ft-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'scene'}
          disabled={!s}
          onClick={() => setView('scene')}
        >
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'results'}
          disabled={!r}
          onClick={() => setView('results')}
        >
          Results
        </button>
      </div>
      <div className="tc-frame">
        {!s ? (
          <Waiting failed={status === 'error'} retry={retry} />
        ) : view === 'results' && r ? (
          'series' in r ? (
            <div className="ft-scroll">
              <LossChart series={r.series} />
            </div>
          ) : (
            <Grid cols={r.cols} questions={(r.questions ?? QUESTION_IDS).map(questionText)} />
          )
        ) : (
          <IsoStage className="bench" board={TRAIN_BOARD} style={FILL} scene={trainScene(o)} label={trainLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        {s?.stamp && <span className={`stamp ${STAMP_CLASS[s.stamp]}`}>{s.stamp}</span>}
        {s && <span className="txt">{s.caption}</span>}
      </p>
    </div>
  );
}

/** A cited fact from data/fine-tuning/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim}{' '}
      <a className="source" href={f.source} target="_blank" rel="noreferrer">
        Source: {new URL(f.source).hostname}
      </a>{' '}
      (checked {f.accessed})
    </p>
  );
}

// ---- the story column's answers ----

const Mark = ({ ok, yes = 'PASS', no = 'FAIL' }: { ok: boolean; yes?: string; no?: string }) => (
  <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? yes : no}</span>
);

/** One version's recorded answer to one question, labelled as recorded (the grading under it runs live). */
export function Answer({ version, question }: { version: VersionId; question: string }) {
  const g = gradeVersion(version, [question])[0],
    v = VERSIONS.find(x => x.id === version)!;
  return (
    <div className="tc-def ft-answer" data-version={version}>
      <p className="lbl">
        {v.label} <span className="ft-tag">recorded answer</span>
      </p>
      <p>“{g.answer.text}”</p>
      <p className="ft-marks">
        <Mark ok={g.fact} /> key fact <Mark ok={g.signed} yes="YES" no="NO" /> signs off
      </p>
      {g.answer.citation && <p className="note">Cites: “{g.answer.citation}”</p>}
      {!g.fact && g.answer.note && <p className="note">{g.answer.note}</p>}
    </div>
  );
}

/** A live reply from Larkspur mini: the prompt, then what this set of weights wrote. */
export const Reply = ({ who, prompt, text }: { who: string; prompt: string; text: string }) => (
  <div className="tc-def ft-answer">
    <p className="lbl">
      {who} <span className="ft-tag">live, in your browser</span>
    </p>
    <p>
      <span className="ft-prompt">{prompt}</span> {text}
    </p>
  </div>
);
