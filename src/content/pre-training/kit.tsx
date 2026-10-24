// Pieces the pre-training chapters share: the base run's checkpoints (each fetched on demand from
// /data/pre-training/, loaded once per page, with a gate that holds the stage's frame while loading), the stage (the
// foundry, or a chart: Fine-tuning's loss chart, or the scaling fits beside Larkspur mini's own runs) and the story
// column's pieces. Every string is React text here; the drawings escape theirs (esc).
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { fetchLoader, type Loader } from '../../lib/rag/load';
import { modelLoader } from '../../lib/lm/load';
import type { Model } from '../../lib/lm/model';
import type { Candidate } from '../../lib/transformers/trace';
import { CKPT, PROMPTS, runOf, weightsAt, type CkptWeights, type RunId } from '../../lib/pre-training/engine';
import { FIT_IDS, FITS, grow } from '../../lib/pre-training/scaling';
import { fact } from '../../lib/pre-training/facts';
import { FORGE_BOARD, forgeLabel, forgeScene, type ForgeOpts } from '../../components/scenes/forgeScene';
import { loss, type Series } from '../../components/scenes/lossChart';
import { LossChart } from '../fine-tuning/kit';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './pre-training.css';

// ---- the checkpoints: one loader per step, shared by the stage and every control ----

let files: Loader = fetchLoader('/data/pre-training/');
let loaders: Partial<Record<CkptWeights, ReturnType<typeof modelLoader>>> = {};
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const loaderOf = (w: CkptWeights) => (loaders[w] ??= modelLoader(files, w));
/** Where the checkpoints come from (tests and the dev page pass a disk or failing loader); drops every loaded one. */
export function setCkptFiles(l: Loader) {
  files = l;
  loaders = {};
  emit();
}
/** The loaded checkpoint, or undefined: step predicates read this, so no step advances before the weights are in. */
export const ckptNow = (step: number): Model | undefined => loaderOf(weightsAt(step)).get();
/** Start (or, after a failure, retry) loading a checkpoint; every subscriber re-renders when it settles. */
export function loadCkpt(step: number) {
  const p = loaderOf(weightsAt(step)).load();
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
/** A checkpoint for a component (none: nothing to load): status, the model once ready, and `retry` after a failure. */
export function useCkpt(step?: number | null) {
  const w = step === undefined || step === null ? undefined : weightsAt(step);
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
    if (w && loaderOf(w).status() === 'idle') loaderOf(w).load().then(emit, emit);
  }, [w]);
  return {
    status,
    model: w && status === 'ready' ? loaderOf(w).get() : undefined,
    retry: () => {
      if (w) loadCkpt(Number(w.slice(5))).catch(() => {});
    },
  };
}

/** What stands in the frame until the weights are in: a loading pill, or an error card with Retry. */
function Waiting({ step, failed, retry }: { step: number; failed: boolean; retry: () => void }) {
  return (
    <div className="ft-wait" role="status" data-state={failed ? 'failed' : 'loading'}>
      {failed ? (
        <div className="ft-error">
          <p>{`Couldn’t load the checkpoint at step ${step}.`}</p>
          <button type="button" className="chip" onClick={retry}>
            Retry
          </button>
        </div>
      ) : (
        <span className="ft-pill">{`Loading step ${step}`}</span>
      )}
    </div>
  );
}

/** A story-column control that needs a checkpoint: the waiting card until it is in, then the control. */
export function CkptGate({ step, children }: { step: number; children: (model: Model) => ReactNode }) {
  const { status, model, retry } = useCkpt(step);
  return model ? <>{children(model)}</> : <Waiting step={step} failed={status === 'error'} retry={retry} />;
}

// ---- the charts ----

/** The base run's checkpoints as two curves: training and held-out loss at each saved step (train.py, eval mode). */
export const CKPT_SERIES: Series[] = [
  { id: 'train', label: 'Training', points: CKPT.checkpoints.map(c => ({ step: c.step, loss: c.train.loss })) },
  { id: 'heldout', label: 'Held-out', points: CKPT.checkpoints.map(c => ({ step: c.step, loss: c.heldout.loss })) },
];
/** A recorded run's curves, every 50 steps: training loss as it ran, and held-out loss. */
export const runSeries = (id: RunId): Series[] => [
  { id: 'train', label: 'Training', points: runOf(id).lossCurve.map(p => ({ step: p.step, loss: p.train })) },
  { id: 'heldout', label: 'Held-out', points: runOf(id).lossCurve.map(p => ({ step: p.step, loss: p.heldout })) },
];

const times = (x: number) => `${x < 10 ? x.toFixed(1) : Math.round(x).toLocaleString('en-US')}×`;
/** Chapter 6's precise view: what each published fit says to do with k times the compute (bars on a log scale), and,
 * apart and in its own units, Larkspur mini's own full and half runs. */
export function ScalingView({ budget }: { budget: number }) {
  const top = Math.log10(1000);
  const bar = (x: number) => `${Math.max(2, (Math.log10(x) / top) * 100)}%`;
  return (
    <div className="pt-scaling">
      <section aria-labelledby="pt-fits">
        <h3 id="pt-fits">The published fits, with {times(budget)} the compute</h3>
        <table className="pt-bars">
          <thead>
            <tr>
              <th scope="col">Fit</th>
              <th scope="col">Model size</th>
              <th scope="col">Training tokens</th>
            </tr>
          </thead>
          <tbody>
            {FIT_IDS.map(id => {
              const g = grow(FITS[id], budget);
              return (
                <tr key={id} data-fit={id}>
                  <th scope="row">{FITS[id].label}</th>
                  {[g.params, g.tokens].map((x, i) => (
                    <td key={i}>
                      <span className="pt-bar" data-kind={i ? 'tokens' : 'params'} style={{ width: bar(x) }} />
                      <span className="pt-num">{times(x)}</span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="pt-small">
          Exponents from Hoffmann et al. (2022), Table 2: their fits on their data, in their units.
        </p>
      </section>
      <section aria-labelledby="pt-mini" className="pt-mini">
        <h3 id="pt-mini">Larkspur mini’s own runs (not on the chart above)</h3>
        <table className="tc-ledger">
          <thead>
            <tr>
              <th scope="col">Run, 3,000 steps</th>
              <th scope="col">Documents</th>
              <th scope="col">Held-out loss</th>
            </tr>
          </thead>
          <tbody>
            {(['clean', 'half'] as RunId[]).map(id => (
              <tr key={id} data-run={id}>
                <th scope="row">{id === 'clean' ? 'All the documents' : 'Half the documents'}</th>
                <td>{runOf(id).docs}</td>
                <td>{loss(runOf(id).heldout.loss)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ---- the stage ----

/** What a chapter puts on the stage: the foundry's settings, a chart, and the caption. */
export interface Shown {
  scene: Omit<ForgeOpts, 'scale' | 'say' | 'steps'>;
  chart?: { series: Series[] } | { budget: number };
  caption: string;
}
export type View = 'scene' | 'chart';

const FILL = { height: '100%' };
/** The chapters' stage: the foundry (default) or the chart tab, one at a time. With `step` the stage needs that
 * checkpoint: it holds its frame with a loading pill (or an error card with Retry) until it is in, then `show` gets the
 * model. The tab is the reader's view, kept out of saved progress unless the chapter passes `view` and `onView`. */
export function PreTrainingStage({
  show,
  step,
  view: kept,
  onView,
  say,
}: {
  show: (model?: Model) => Shown;
  step?: number | null;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn over a part of the foundry (FORGE_PARTS); the chart ignores it */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2.2 : 1.3;
  const { status, model, retry } = useCkpt(step);
  const s = step === undefined || step === null || model ? show(model) : null,
    c = s?.chart,
    o: ForgeOpts = { steps: CKPT.steps, step: null, ...s?.scene, scale, say };
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
          aria-pressed={view === 'chart'}
          disabled={!c}
          onClick={() => setView('chart')}
        >
          {c && 'budget' in c ? 'Scaling' : 'Loss'}
        </button>
      </div>
      <div className="tc-frame">
        {!s ? (
          <Waiting step={step!} failed={status === 'error'} retry={retry} />
        ) : view === 'chart' && c ? (
          <div className="ft-scroll">
            {'series' in c ? (
              <LossChart key={c.series[0].points.length} series={c.series} />
            ) : (
              <ScalingView budget={c.budget} />
            )}
          </div>
        ) : (
          <IsoStage className="forge" board={FORGE_BOARD} style={FILL} scene={forgeScene(o)} label={forgeLabel(o)} />
        )}
      </div>
      <p className="tc-caption">{s && <span className="txt">{s.caption}</span>}</p>
    </div>
  );
}

/** A cited fact from data/pre-training/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** What a model wrote after a prompt: the prompt, then the continuation, labelled live or recorded. */
export const Says = ({ who, prompt, text, live }: { who: string; prompt: number; text: string; live: boolean }) => (
  <div className="tc-def ft-answer pt-says" data-who={who}>
    <p className="lbl">
      {who} <span className="ft-tag">{live ? 'live, in your browser' : 'recorded run'}</span>
    </p>
    <p>
      <span className="ft-prompt">{PROMPTS[prompt].text}</span> <strong>{text.trim() || '(nothing)'}</strong>
    </p>
  </div>
);

/** A model's five likeliest next pieces, each with a bar for its probability (scaled to the likeliest). */
export function Top5({ cands, caption }: { cands: Candidate[]; caption: string }) {
  const max = Math.max(...cands.map(c => c.p));
  return (
    <figure className="tc-def" style={{ margin: 0 }}>
      <figcaption className="lbl">{caption}</figcaption>
      <ul className="pt-top">
        {cands.map(c => (
          <li key={c.id}>
            <code>{JSON.stringify(c.text).slice(1, -1)}</code>
            <span className="fill" style={{ width: `${(c.p / max) * 100}%` }} aria-hidden="true" />
            <span className="p">{(c.p * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** A native range over the checkpoint steps (or any finite list of steps). */
export function StepRange({
  id,
  steps,
  value,
  label,
  valueText,
  onChange,
}: {
  id: string;
  steps: number[];
  value: number;
  label: string;
  valueText: (step: number) => string;
  onChange: (step: number) => void;
}) {
  const i = Math.max(0, steps.indexOf(value));
  return (
    <div className="pt-range">
      <label htmlFor={id}>
        <strong>
          {label}: step {steps[i]}
        </strong>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={i}
        aria-valuetext={valueText(steps[i])}
        onChange={e => onChange(steps[Number(e.target.value)])}
      />
    </div>
  );
}
