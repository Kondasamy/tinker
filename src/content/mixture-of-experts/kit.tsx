// Pieces the Mixture of experts chapters share: Larkspur's toy experts model (loaded once per page, a status line while
// it loads, Retry after a failure), the stage (the sorting office, or the Router tab: each room's router share per
// floor) with the token strip under it and the override (KTD15: for the selected token, eight checkboxes in one
// fieldset, at most two checked, a third pick unchecks the oldest and says so; "Use router" clears it; the guess reruns
// live), cited facts and the toy note. Every string is React text here; the drawing escapes its pills (esc).
import { useEffect, useId, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { modelLoader } from '../../lib/lm/load';
import type { Loader } from '../../lib/rag/load';
import type { Model } from '../../lib/lm/model';
import {
  ALL,
  EXPERTS,
  LAYERS,
  ROOMS,
  pct,
  quote,
  roomName,
  run,
  showPiece,
  shownPositions,
  type Override,
  type Pass,
} from '../../lib/mixture-of-experts/routes';
import { capped, type Capped, type Factor } from '../../lib/mixture-of-experts/capacity';
import { fact } from '../../lib/mixture-of-experts/facts';
import { ROOMS_BOARD, roomsLabel, roomsScene, type RoomsOpts } from '../../components/scenes/officeRoomsScene';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './mixture-of-experts.css';

// ---- the model: one loader, shared by the stage and every control ----

let files: Loader | undefined;
let loader: ReturnType<typeof modelLoader> | undefined;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const loaderOf = () => (loader ??= modelLoader(files, 'moe'));
/** Where the weights come from (tests and the dev page pass a disk or failing loader); drops the loaded model. */
export function setModelFiles(l: Loader) {
  files = l;
  loader = undefined;
  emit();
}
/** The loaded model, or undefined (step predicates and the e2e helpers never need it: results go into state). */
export const modelNow = (): Model | undefined => loaderOf().get();
function loadModel() {
  const p = loaderOf().load();
  emit();
  p.then(emit, emit);
  return p;
}
/** The model for a component: its status, the model once ready, and `retry` after a failure. */
export function useModel() {
  const snap = () => loaderOf().status();
  const status = useSyncExternalStore(
    f => {
      subs.add(f);
      return () => subs.delete(f);
    },
    snap,
    snap,
  );
  useEffect(() => {
    if (loaderOf().status() === 'idle') loadModel().catch(() => {});
  }, []);
  return {
    status,
    model: status === 'ready' ? loaderOf().get() : undefined,
    retry: () => loadModel().catch(() => {}),
  };
}
/** While the weights load, a status line; after a failure, the line and Retry. */
export function ModelStatus({ status, retry }: { status: string; retry: () => void }) {
  if (status === 'ready') return null;
  const failed = status === 'error';
  return (
    <p className="me-status" role="status" data-state={failed ? 'failed' : 'loading'}>
      {failed ? 'Couldn’t load Larkspur’s toy experts model.' : 'Loading Larkspur’s toy experts model…'}
      {failed && (
        <button type="button" className="chip" onClick={retry}>
          Retry
        </button>
      )}
    </p>
  );
}

// ---- the controls ----

/** The prompt's shown tokens as one radio group: picking one selects it in the picture. */
export function TokenStrip({
  ids,
  sel,
  onPick,
  disabled,
}: {
  ids: number[];
  sel: number | null;
  onPick: (i: number) => void;
  disabled: boolean;
}) {
  const name = 'tok' + useId().replace(/[^\w-]/g, '');
  const shown = shownPositions(ids);
  return (
    <fieldset className="me-strip" disabled={disabled}>
      <legend>Pick a token</legend>
      {shown.map((pos, i) => (
        <label key={pos} className={i === sel ? 'on' : undefined}>
          <input type="radio" name={name} checked={i === sel} onChange={() => onPick(i)} />
          <span>{quote(ids[pos])}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** The next override after the reader toggles room e for one token: at most two, a third unchecks the oldest. */
export function toggle(current: number[] | undefined, e: number): { rooms: number[]; said: string } {
  const now = current ?? [];
  if (now.includes(e)) {
    const rooms = now.filter(x => x !== e);
    return {
      rooms,
      said: rooms.length ? `${roomName(e)} unchecked.` : 'No rooms checked: the doorman decides again.',
    };
  }
  if (now.length < 2) return { rooms: [...now, e], said: `${roomName(e)} checked.` };
  return { rooms: [now[1], e], said: `${roomName(e)} checked; ${roomName(now[0])} unchecked, two rooms at most.` };
}

/** Eight checkboxes for the selected token, in one fieldset, and "Use router". */
export function OverrideRooms({
  ids,
  pos,
  override,
  onOverride,
  disabled,
}: {
  ids: number[];
  pos: number;
  override: Override;
  onOverride: (o: Override) => void;
  disabled: boolean;
}) {
  const [said, setSaid] = useState('');
  const chosen = override[pos] ?? [];
  const set = (rooms: number[]) => {
    const { [pos]: _, ...rest } = override;
    onOverride(rooms.length ? { ...rest, [pos]: rooms } : rest);
  };
  return (
    <div className="me-override">
      <fieldset disabled={disabled}>
        <legend>{`Send ${quote(ids[pos])} to (every floor)`}</legend>
        <div className="me-rooms">
          {Array.from({ length: EXPERTS }, (_, e) => (
            <label key={e}>
              <input
                type="checkbox"
                checked={chosen.includes(e)}
                onChange={() => {
                  const t = toggle(chosen, e);
                  setSaid(t.said);
                  set(t.rooms);
                }}
              />
              <span>{roomName(e)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="chip"
        disabled={disabled || !chosen.length}
        onClick={() => {
          setSaid('Back to the doorman’s rooms.');
          set([]);
        }}
      >
        Use router
      </button>
      <p className="me-said" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'router';
/** What the stage computed, for the chapter's caption. */
export interface Live {
  pass: Pass;
  capped?: Capped;
  /** the selected token's position in the prompt */
  pos: number | null;
}

/** The selected token's position, from its index among the shown tokens. */
export const posOf = (ids: number[], sel: number | null) => (sel === null ? null : shownPositions(ids)[sel]);

/** One pass for the stage: with the override, every room for every token (dense), or capped at a factor. */
export function passFor(model: Model, ids: number[], override: Override, factor?: Factor, dense?: boolean) {
  if (dense) return { pass: run(model, ids, Object.fromEntries(ids.map((_, p) => [p, ALL]))) };
  if (factor !== undefined) {
    const c = capped(model, ids, factor);
    return { pass: c.pass, capped: c };
  }
  return { pass: run(model, ids, override) };
}

/** The Router tab: for the selected token, each room's router share on each floor, the two that run marked. */
function RouterTable({ live, ids }: { live: Live; ids: number[] }) {
  const pos = live.pos;
  if (pos === null) return <p className="me-empty">Pick a token first.</p>;
  const r = live.pass.routes;
  return (
    <div className="me-table" tabIndex={0} role="region" aria-label={`The doormen’s scores for ${quote(ids[pos])}`}>
      <table className="tc-ledger">
        <caption>{`The doormen’s scores for ${quote(ids[pos])}`}</caption>
        <thead>
          <tr>
            <th scope="col">Room</th>
            {r.map((_, l) => (
              <th key={l} scope="col">{`Floor ${l + 1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: EXPERTS }, (_, e) => (
            <tr key={e}>
              <th scope="row">{roomName(e)}</th>
              {r.map((layer, l) => {
                const route = layer[pos],
                  runs = route.experts.includes(e);
                return (
                  <td key={l} data-runs={runs ? 1 : 0} className={runs ? 'runs' : undefined}>
                    {`${pct(route.probs[e])}${runs ? ' · runs' : ''}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FILL = { height: '100%' };
/** The chapters' stage: the sorting office (default) or the Router tab, with the token strip and, when the chapter
 * passes `onOverride`, the override under it. */
export function RoomsStage({
  ids,
  sel,
  onPick,
  override = {},
  onOverride,
  dense,
  factor,
  caption,
  view: kept,
  onView,
  say,
}: {
  ids: number[];
  sel: number | null;
  onPick?: (i: number) => void;
  override?: Override;
  onOverride?: (o: Override, guess: number) => void;
  dense?: boolean;
  /** chapter 5: cap the rooms (undefined: no capacity view) */
  factor?: Factor;
  caption: (live: Live | null) => ReactNode;
  view?: View;
  onView?: (v: View) => void;
  say?: Say;
}) {
  const { model, status, retry } = useModel();
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const narrow = useNarrow();
  const pos = posOf(ids, sel);
  const key = JSON.stringify(override);
  // the override is keyed by its JSON, not its identity
  const live = useMemo<Live | null>(
    () => (model ? { ...passFor(model, ids, override, factor, dense), pos } : null),
    [model, ids, key, factor, pos, dense],
  );
  const shown = shownPositions(ids);
  const o: RoomsOpts = {
    tokens: shown.map(p => ids[p]),
    sel,
    lit: live && pos !== null ? live.pass.routes.map(l => l[pos].experts) : undefined,
    dense,
    forced: pos !== null && !!override[pos],
    guess: live ? live.pass.top[0].tok : null,
    load: live?.capped ? { asked: live.capped.asked, capacity: live.capped.capacity } : undefined,
    dropped: live?.capped ? live.capped.dropped.flatMap(p => (shown.includes(p) ? [shown.indexOf(p)] : [])) : undefined,
    say,
    scale: narrow ? 2 : 1.2,
  };
  const ready = !!model;
  return (
    <div className="tc-stage me-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'router'}
          disabled={!ready || pos === null || dense}
          onClick={() => setView('router')}
        >
          Router
        </button>
      </div>
      <div className="tc-frame">
        {view === 'router' && live && !dense ? (
          <RouterTable live={live} ids={ids} />
        ) : (
          <IsoStage className="rooms" board={ROOMS_BOARD} style={FILL} scene={roomsScene(o)} label={roomsLabel(o)} />
        )}
      </div>
      <ModelStatus status={status} retry={retry} />
      {onPick && <TokenStrip ids={ids} sel={sel} onPick={onPick} disabled={!ready} />}
      {onOverride && pos !== null && (
        <OverrideRooms
          ids={ids}
          pos={pos}
          override={override}
          disabled={!ready}
          onOverride={next => model && onOverride(next, run(model, ids, next).top[0].tok)}
        />
      )}
      <p className="tc-caption">
        <span className="txt">{caption(live)}</span>
      </p>
    </div>
  );
}

/** What each room took most often in training, per floor (meta.json's top tokens): chapter 3's measured split. */
export function LearnedTable() {
  return (
    <table className="tc-ledger me-learned">
      <caption>Each room’s three most-sent tokens in training</caption>
      <thead>
        <tr>
          <th scope="col">Room</th>
          {Array.from({ length: LAYERS }, (_, l) => (
            <th key={l} scope="col">{`Floor ${l + 1}`}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: EXPERTS }, (_, e) => (
          <tr key={e}>
            <th scope="row">{roomName(e)}</th>
            {ROOMS.tops.map((floor, l) => (
              <td key={l}>
                {floor[e]
                  .slice(0, 3)
                  .map(t => `“${showPiece(t)}”`)
                  .join(' ')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A cited fact from data/mixture-of-experts/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the toy's routes or numbers show (R6, the plan's scope boundary). */
export const ToyNote = () => (
  <p className="note me-note">
    Larkspur’s toy experts model: {ROOMS.params.toLocaleString('en-US')} weights, trained once on Larkspur’s documents
    and run live in your browser. Its rooms show the mechanism, not how a production model’s experts behave.
  </p>
);

/** A number for copy: 68,672. */
export const n = (x: number) => x.toLocaleString('en-US');
export { LAYERS };
