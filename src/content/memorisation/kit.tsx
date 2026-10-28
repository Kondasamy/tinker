// Pieces the What a model remembers chapters share (KTD13): the canary model (loaded once per page, a waiting card and
// Retry), the stage (the support desk, or the Ledger tab: the planted lines and their offline ranks as a table, read
// off the same runs) with one polite status read-out under it, the repeats radio that drives the ranking column, the
// prefix picker, and cited facts. The column is ranked live a few candidates per frame; with reduced motion the true
// ball is drawn where it ends. Every string is React text here; the desk escapes its pills (esc).
import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { modelLoader } from '../../lib/lm/load';
import type { Model } from '../../lib/lm/model';
import { columnPins, exposure, idsOf, rankIn, scorer } from '../../lib/memorisation/rank';
import {
  CANARIES,
  REPEATS,
  RUNS,
  bits,
  canaryOf,
  firstName,
  lineOf,
  scoreOf,
  type RunId,
} from '../../lib/memorisation/story';
import { fact } from '../../lib/memorisation/facts';
import SAMPLE from '../../../data/memorisation/candidates.json' with { type: 'json' };
import { RECITAL_BOARD, recitalLabel, recitalScene, type RecitalOpts } from '../../components/scenes/recitalScene';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './memorisation.css';

// ---- the canary model: one loader, shared by the stage and every control ----

let loader = modelLoader(undefined, 'canary');
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
/** Where the weights come from (the dev page may pass a disk loader); drops the loaded model. */
export function setLoader(l: ReturnType<typeof modelLoader>) {
  loader = l;
  emit();
}
function load() {
  const p = loader.load();
  emit();
  p.then(emit, emit);
  return p;
}
/** The model for a component: its status, the model once ready, and `retry` after a failure. */
export function useModel() {
  const snap = () => loader.status();
  const status = useSyncExternalStore(
    f => {
      subs.add(f);
      return () => subs.delete(f);
    },
    snap,
    snap,
  );
  useEffect(() => {
    if (loader.status() === 'idle') load().catch(() => {});
  }, []);
  return { status, model: status === 'ready' ? loader.get() : undefined, retry: () => load().catch(() => {}) };
}

/** What stands in the frame until the weights are in: a loading pill, or an error card with Retry. */
export function Waiting({ failed, retry }: { failed: boolean; retry: () => void }) {
  return (
    <div className="mem-wait" data-state={failed ? 'failed' : 'loading'}>
      {failed ? (
        <div className="mem-error">
          <p>Couldn’t load the canary model.</p>
          <button type="button" className="chip" onClick={retry}>
            Retry
          </button>
        </div>
      ) : (
        <span className="mem-pill">Loading the canary model</span>
      )}
    </div>
  );
}
/** The line under a control while the model loads (the control is disabled meanwhile). */
export const LoadLine = ({ status }: { status: string }) =>
  status === 'ready' ? null : (
    <p className="mem-note">
      {status === 'error' ? 'The canary model didn’t load: press Retry on the picture.' : 'Loading the canary model…'}
    </p>
  );

// ---- the ranking column, live ----

export const SAMPLE_PINS: string[] = SAMPLE.pins;
export const COLUMN_SIZE = SAMPLE_PINS.length + 1;
const columns = new Map<number, number[]>();
/** Each candidate's log-probability for the canary at `repeats` (its true PIN first), a few per animation frame so
 * the page keeps answering; a column ranked before comes back at once. Null while it ranks. */
export function useColumn(repeats: number | null) {
  const { model, status, retry } = useModel();
  const [lps, setLps] = useState<number[] | null>(() => (repeats === null ? null : (columns.get(repeats) ?? null)));
  useEffect(() => {
    if (repeats === null || !model) return setLps(null);
    const hit = columns.get(repeats);
    if (hit) return setLps(hit);
    setLps(null);
    const c = canaryOf(repeats),
      pins = columnPins(c, SAMPLE_PINS),
      score = scorer(model as Model, c.prefix.ids),
      out: number[] = [];
    let raf = 0;
    const tick = () => {
      for (let k = 0; k < 12 && out.length < pins.length; k++) out.push(score(idsOf(pins[out.length])));
      if (out.length < pins.length) raf = requestAnimationFrame(tick);
      else {
        columns.set(repeats, out);
        setLps(out);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [repeats, model]);
  const rank = lps ? rankIn(lps, 0) : null;
  return { lps, rank, exposure: rank ? exposure(COLUMN_SIZE, rank) : null, status, retry };
}

// ---- building the desk ----

/** The ledger for a canary under a data policy: its first name and copies; scrubbed lines go mint. */
export function ledgerOf(repeats: number | null, o: { dedup?: boolean; scrub?: boolean } = {}): RecitalOpts['ledger'] {
  if (repeats === null) return { label: 'TRAINING TEXT', lit: 0, scrub: o.scrub };
  const n = o.dedup ? 1 : repeats;
  return { label: `${firstName(canaryOf(repeats)).toUpperCase()} ×${n}`, lit: n, scrub: o.scrub };
}
/** The column's pill for a rank among the sample. */
export const columnLabel = (rank: number) => `RANK ${rank} OF ${COLUMN_SIZE}`;

// ---- the stage ----

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export type View = 'desk' | 'ledger';

/** The Ledger tab: the planted lines, their copies, and their offline rank over all 10,000 PINs in a run. */
export function LedgerTable({ run, scrub, repeats }: { run: RunId; scrub?: boolean; repeats?: number | null }) {
  return (
    <div className="mem-scroll" role="region" aria-label="The planted lines" tabIndex={0}>
      <table className="tc-ledger">
        <caption>Fake PINs planted in training, ranked offline</caption>
        <thead>
          <tr>
            <th scope="col">Line in training</th>
            <th scope="col">Copies</th>
            <th scope="col">Rank of 10,000</th>
          </tr>
        </thead>
        <tbody>
          {CANARIES.map(c => {
            const s = scoreOf(run, c.repeats);
            return (
              <tr key={c.repeats} data-repeats={c.repeats} className={c.repeats === repeats ? 'lit' : undefined}>
                <td>{scrub ? lineOf(c).replace(c.pin, '[PIN]') : lineOf(c)}</td>
                <td>{run.startsWith('dedup') ? 1 : c.repeats}</td>
                <td>{s.rank}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The chapters' stage: the desk (default) or the Ledger tab, one at a time, and one polite read-out under it. */
export function RecitalStage({
  desk,
  caption,
  wait,
  say,
  readout,
  run = 'canary',
  repeats,
}: {
  desk: Omit<RecitalOpts, 'scale' | 'say' | 'rise'>;
  caption: string;
  /** stands in the frame instead of the picture (the loading card) */
  wait?: ReactNode;
  say?: Say;
  /** the read-out's lines, joined; updated on each reader action */
  readout?: string[];
  /** the run the Ledger tab reads */
  run?: RunId;
  repeats?: number | null;
}) {
  const [view, setView] = useState<View>('desk');
  // motion is read after hydration: the server draws no rise, and hydration never patches the drawn markup
  const [motion, setMotion] = useState(false);
  useEffect(() => setMotion(!reduced()), []);
  const o: RecitalOpts = { ...desk, scale: useNarrow() ? 2 : 1.2, say, rise: motion };
  return (
    <div className="tc-stage mem-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'desk'} onClick={() => setView('desk')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'ledger'} onClick={() => setView('ledger')}>
          Ledger
        </button>
      </div>
      <div className="tc-frame">
        {wait ??
          (view === 'ledger' ? (
            <LedgerTable run={run} scrub={desk.ledger.scrub} repeats={repeats} />
          ) : (
            <IsoStage
              key={desk.column?.label ?? 'desk'}
              className="recital-desk"
              board={RECITAL_BOARD}
              style={{ height: '100%' }}
              scene={recitalScene(o)}
              label={recitalLabel(o)}
            />
          ))}
      </div>
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
      <p className="mem-readout" role="status" aria-live="polite">
        {(readout ?? []).join(' · ')}
      </p>
    </div>
  );
}

/** The ranking read-out: the sample's rank and exposure, then the offline rank and exposure over all 10,000. */
export function rankReadout(repeats: number, rank: number | null) {
  const s = scoreOf('canary', repeats);
  return [
    `${firstName(canaryOf(repeats))}, ${repeats} ${repeats === 1 ? 'copy' : 'copies'}`,
    rank === null
      ? 'ranking…'
      : `rank ${rank} of ${COLUMN_SIZE} in the sample, exposure ${bits(exposure(COLUMN_SIZE, rank))} bits`,
    `all ${RUNS.candidates.toLocaleString('en')}: rank ${s.rank}, exposure ${bits(s.exposure)} bits`,
  ];
}

// ---- controls ----

export const repeatWords = (r: number) => `${r} ${r === 1 ? 'copy' : 'copies'} (${firstName(canaryOf(r))})`;
/** The repeats radio: native radios in one fieldset, the ranking column's keyboard path. */
export function RepeatsRadio({
  value,
  onChange,
  disabled,
  legend = 'Copies in training',
}: {
  value: number | null;
  onChange: (r: number) => void;
  disabled?: boolean;
  legend?: string;
}) {
  const name = 'rep' + useId().replace(/[^\w-]/g, '');
  return (
    <fieldset className="mem-radios" disabled={disabled}>
      <legend>{legend}</legend>
      {[...REPEATS].reverse().map(r => (
        <label key={r}>
          <input type="radio" name={name} checked={value === r} onChange={() => onChange(r)} /> {repeatWords(r)}
        </label>
      ))}
    </fieldset>
  );
}

/** The four canary prefixes, to ask the model to finish (no free text). */
export function PrefixPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (r: number) => void;
  disabled?: boolean;
}) {
  const name = 'pre' + useId().replace(/[^\w-]/g, '');
  return (
    <fieldset className="mem-radios" disabled={disabled}>
      <legend>Ask it to finish</legend>
      {CANARIES.map(c => (
        <label key={c.repeats}>
          <input type="radio" name={name} checked={value === c.repeats} onChange={() => onChange(c.repeats)} /> “
          {c.prefix.text} …”
        </label>
      ))}
    </fieldset>
  );
}

/** A cited fact from data/memorisation/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the toy's PINs or numbers show (R6). */
export const ToyNote = () => (
  <p className="mem-note">
    Larkspur’s toy: a tiny model trained offline with four fake PINs planted in its text. It shows the mechanism, not a
    production model’s numbers.
  </p>
);
