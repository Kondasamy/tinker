// Pieces the Synthetic data chapters share (KTD15): Larkspur mini (the base weights, loaded once per page with a
// waiting card and Retry), a batch of replies written a reply per animation frame, the stage (the copier room, or the
// Numbers tab: every generation's measures in a table, read off the same runs), the generation range and the
// replace / accumulate radio, and cited facts. With reduced motion the copy stack shows without the flip. Every
// string is React text here; the room escapes its pills (esc).
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { modelLoader } from '../../lib/lm/load';
import type { Model } from '../../lib/lm/model';
import { ListRange } from '../../components/story/ListRange';
import { BATCH, writeOne } from '../../lib/synthetic-data/generate';
import { ARMS, GENS, RUNS, loss, pct, type Arm } from '../../lib/synthetic-data/runs';
import { fact } from '../../lib/synthetic-data/facts';
import {
  COPIER_BOARD,
  copierLabel,
  copierReadouts,
  copierScene,
  type CopierOpts,
} from '../../components/scenes/copierScene';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './synthetic-data.css';

// ---- Larkspur mini: one loader, shared by the stage and every control ----

let loader = modelLoader(undefined, 'base');
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
/** Where the weights come from (the dev page passes a disk loader); drops the loaded model. */
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
    <div className="sd-wait" role="status" data-state={failed ? 'failed' : 'loading'}>
      {failed ? (
        <div className="sd-error">
          <p>Couldn’t load Larkspur mini.</p>
          <button type="button" className="chip" onClick={retry}>
            Retry
          </button>
        </div>
      ) : (
        <span className="sd-pill">Loading Larkspur mini</span>
      )}
    </div>
  );
}
/** The status line under a control while the model loads (the control is disabled meanwhile). */
export const LoadLine = ({ status }: { status: string }) =>
  status === 'ready' ? null : (
    <p className="sd-note" role="status">
      {status === 'error' ? 'Larkspur mini didn’t load: press Retry on the picture.' : 'Loading Larkspur mini…'}
    </p>
  );

// ---- a batch of replies, a reply per frame ----

const batches = new Map<string, number[][]>();
/** A batch already written on this page, if any. */
export const batchNow = (prompt: string, t: number) => batches.get(`${t}|${prompt}`);
/** Larkspur mini writes BATCH replies to `prompt` at temperature t, one per animation frame so the page keeps
 * answering; a batch written before comes back at once. `onDone` fires with the whole batch. */
export function useBatch(prompt: string, t: number | null, onDone?: (b: number[][]) => void) {
  const { model, status, retry } = useModel();
  const key = `${t}|${prompt}`;
  const [made, setMade] = useState<number[][]>(() => batches.get(key) ?? []);
  // the latest onDone, read when the batch ends (it closes over the chapter's current state)
  const finish = useRef(onDone);
  finish.current = onDone;
  useEffect(() => {
    if (t === null || !model) return;
    const hit = batches.get(key);
    if (hit) {
      setMade(hit);
      finish.current?.(hit);
      return;
    }
    const out: number[][] = [];
    let raf = 0;
    setMade([]);
    const tick = () => {
      out.push(writeOne(model as Model, prompt, t, out.length));
      setMade([...out]);
      if (out.length < BATCH) raf = requestAnimationFrame(tick);
      else {
        batches.set(key, out);
        finish.current?.(out);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, model]);
  return { batch: t === null ? [] : made, done: made.length === BATCH, status, retry };
}

// ---- the stage ----

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export type View = 'room' | 'numbers';

/** The Numbers tab: every generation of both arms, as recorded. */
export function Numbers({ arm, gen }: { arm?: Arm; gen?: number }) {
  return (
    <div className="sd-scroll" role="region" aria-label="Every generation, recorded" tabIndex={0}>
      <table className="tc-ledger sd-numbers">
        <caption>Larkspur’s toy generations, recorded</caption>
        <thead>
          <tr>
            <th scope="col">Gen</th>
            {ARMS.map(a => (
              <th key={a} scope="col" colSpan={2}>
                {a === 'replace' ? 'Replace' : 'Accumulate'}: loss · rare guessed
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GENS.map(g => (
            <tr key={g} data-gen={g} data-lit={g === gen ? '1' : undefined}>
              <th scope="row">{g}</th>
              {ARMS.flatMap(a => [
                <td key={`${a}l`} data-arm={a} className={a === arm && g === gen ? 'lit' : undefined}>
                  {loss(RUNS.arms[a][g].heldout)}
                </td>,
                <td key={`${a}r`} className={a === arm && g === gen ? 'lit' : undefined}>
                  {pct(RUNS.arms[a][g].rareTop5)}
                </td>,
              ])}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The chapters' stage: the copier room (default) or the Numbers tab, one at a time; a read-out of the shown
 * generation's measures under it as text. */
export function CopierStage({
  room,
  caption,
  wait,
  say,
  readout,
}: {
  room: Omit<CopierOpts, 'scale' | 'say' | 'flip'>;
  caption: string;
  /** stands in the frame instead of the picture (the loading card) */
  wait?: ReactNode;
  say?: Say;
  /** the shown generation's measures as text: true reads the arm's run (chapters 5, 6), or the lines to show */
  readout?: boolean | string[];
}) {
  const [view, setView] = useState<View>('room');
  // motion is read after hydration: the server draws no flip, and hydration never patches the drawn markup
  const [motion, setMotion] = useState(false);
  useEffect(() => setMotion(!reduced()), []);
  const o: CopierOpts = { ...room, scale: useNarrow() ? 2 : 1.2, say, flip: motion };
  const lines = Array.isArray(readout)
    ? readout
    : readout && room.gen !== null
      ? copierReadouts(room.arm, room.gen)
      : [];
  return (
    <div className="tc-stage sd-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'room'} onClick={() => setView('room')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'numbers'} onClick={() => setView('numbers')}>
          Numbers
        </button>
      </div>
      <div className="tc-frame">
        {wait ??
          (view === 'numbers' ? (
            <Numbers arm={room.arm} gen={room.gen ?? undefined} />
          ) : (
            <IsoStage
              key={`${room.arm}${room.gen}`}
              className="copier-room"
              board={COPIER_BOARD}
              style={{ height: '100%' }}
              scene={copierScene(o)}
              label={copierLabel(o)}
            />
          ))}
      </div>
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
      {lines.length > 0 && (
        <p className="sd-readout" aria-live="polite" data-gen={room.gen} data-arm={room.arm}>
          {lines.join(' · ')}
        </p>
      )}
    </div>
  );
}

// ---- controls ----

export const genWords = (g: number) => `Generation ${g}${g === 0 ? ' (trained on real text)' : ''}`;
/** A native range over generations 0–5. */
export const GenRange = ({ value, onChange }: { value: number; onChange: (g: number) => void }) => (
  <ListRange className="sd-range" label="Generation" list={GENS} value={value} words={genWords} onChange={onChange} />
);

export const ARM_WORDS: Record<Arm, string> = {
  replace: 'Replace: each generation trains only on the last one’s text',
  accumulate: 'Accumulate: keep the real text and every generation’s text',
};
/** The replace / accumulate radio: native radios in one fieldset. */
export function ArmRadio({
  value,
  onChange,
  legend = 'Training data',
}: {
  value: Arm | null;
  onChange: (a: Arm) => void;
  legend?: string;
}) {
  const name = 'arm' + useId().replace(/[^\w-]/g, '');
  return (
    <fieldset className="sd-arms">
      <legend>{legend}</legend>
      {ARMS.map(a => (
        <label key={a}>
          <input type="radio" name={name} checked={value === a} onChange={() => onChange(a)} /> {ARM_WORDS[a]}
        </label>
      ))}
    </fieldset>
  );
}

/** A cited fact from data/synthetic-data/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the toy's replies or numbers show (R6). */
export const ToyNote = () => (
  <p className="sd-note">
    Larkspur’s toy: Larkspur mini and copies of it, trained ahead of time on Larkspur’s documents. It shows the
    mechanism, not a production model’s numbers.
  </p>
);
export { pct, loss };
