// Pieces the Finding the way chapters share: the stage (the tabletop town, or the Frontier view, one at a time) with
// Step / Play when a chapter passes `onTick`; the road list (KTD8: a listbox of roads, arrow keys move the selection,
// Enter closes or reopens the selected road, a tap on a road in the picture selects the same road); the one polite
// read-out; cited facts and the hand-made-town note. Every string is React text here; the town escapes its pills.
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { TABLE_BOARD, tableLabel, tabletopScene, type TableOpts } from '../../components/scenes/tabletopScene';
import { CUSTOMER, ROADS, isRoad, nameOf, road, roadName, type Edits } from '../../lib/routes/graph';
import type { Search } from '../../lib/routes/astar';
import { fact } from '../../lib/routes/facts';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './routes.css';

/** The barrier's shape as a glyph: two posts and a striped bar, beside a closed road's name. */
export const BarrierGlyph = () => (
  <svg className="rt-glyph" viewBox="0 0 20 12" width="20" height="12" aria-hidden="true">
    <path d="M3 3V12M17 3V12" stroke="var(--ink)" strokeWidth="1.6" />
    <rect x="1" y="2" width="18" height="4" fill="#fff" stroke="var(--ink)" strokeWidth="1.2" />
    <path d="M4 2l-3 4M9 2l-3 4M14 2l-3 4M19 2l-3 4" stroke="#ef6a4c" strokeWidth="2" />
  </svg>
);

// ---- the Frontier view ----

/** The search so far as lists: settled junctions in order, the frontier, the route, and the closed roads. */
export function FrontierView({
  search,
  upTo = search.settles.length,
  closed = [],
  unit = 'min',
}: {
  search: Search;
  upTo?: number;
  closed?: readonly string[];
  /** what g counts: minutes, or roads for breadth-first */
  unit?: 'min' | 'roads';
}) {
  const n = Math.max(0, Math.min(upTo, search.settles.length)),
    settled = search.settles.slice(0, n),
    open = n ? settled[n - 1].frontier : [],
    done = n === search.settles.length;
  const so = (g: number) => `${+g.toFixed(1)} ${unit === 'min' ? 'min' : g === 1 ? 'road' : 'roads'}`;
  return (
    <div className="rt-frontier" tabIndex={0} role="region" aria-label="Frontier, scrolls">
      <p className="rt-route">
        {!done
          ? `Searching: ${n} junction${n === 1 ? '' : 's'} settled.`
          : search.found
            ? `Route: ${search.minutes} min by ${search.roads.length} roads, ${search.looked} junctions looked at.`
            : `No route: ${search.looked} junctions reached, none of them the customer.`}
      </p>
      <div className="rt-cols">
        <table className="tc-ledger">
          <caption>Settled, in order</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Junction</th>
              <th scope="col">From depot</th>
            </tr>
          </thead>
          <tbody>
            {settled.map((s, i) => (
              <tr key={s.id} data-settled={s.id}>
                <td>{i + 1}</td>
                <th scope="row">{nameOf(s.id)}</th>
                <td>{so(s.g)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="tc-ledger">
          <caption>Frontier</caption>
          <thead>
            <tr>
              <th scope="col">Junction</th>
              <th scope="col">So far</th>
            </tr>
          </thead>
          <tbody>
            {open.length ? (
              open.map(o => (
                <tr key={o.id} data-open={o.id}>
                  <th scope="row">{nameOf(o.id)}</th>
                  <td>{so(o.g)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2}>{n ? 'Empty.' : 'Press Step.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {closed.length > 0 && (
        <ul className="rt-closed" aria-label="Closed roads">
          {closed.map(id => (
            <li key={id}>
              <BarrierGlyph /> {`${nameOf(road(id).a)} to ${nameOf(road(id).b)}: closed`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Step and Play ----

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Play settles a junction every beat until the search ends; Pause stops; Step settles one. */
export function Transport({ t, until, onTick }: { t: number; until: number; onTick: (t: number) => void }) {
  const [playing, setPlaying] = useState(false);
  const live = useRef({ t, onTick, until });
  live.current = { t, onTick, until };
  useEffect(() => {
    if (!playing) return;
    // with reduced motion the search still advances, a little slower, and no flag pops
    const id = setInterval(
      () => {
        const c = live.current;
        if (c.t >= c.until) return setPlaying(false);
        c.onTick(c.t + 1);
      },
      reduced() ? 700 : 420,
    );
    return () => clearInterval(id);
  }, [playing]);
  const end = t >= until;
  return (
    <div className="rt-transport">
      <button
        type="button"
        className="chip"
        aria-pressed={playing}
        disabled={end && !playing}
        onClick={() => setPlaying(p => !p)}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        className="chip"
        disabled={end}
        onClick={() => {
          setPlaying(false);
          onTick(t + 1);
        }}
      >
        Step
      </button>
      <span className="rt-count" aria-live="off">{`${t} settled`}</span>
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'frontier';
/** What a chapter puts on the stage: the town's state, the search for the Frontier view, and the caption. */
export interface Shown {
  scene: Omit<TableOpts, 'scale' | 'say'>;
  search?: Search;
  /** settled junctions shown so far (the whole search when left out) */
  upTo?: number;
  unit?: 'min' | 'roads';
  caption: ReactNode;
}

/** The town part-way through a search: flags at the first t settled junctions, the frontier lit, and the route and
 * the parked van (or NO ROUTE) once the search is done. */
export function searchScene(s: Search, t: number, extra: Omit<TableOpts, 'scale' | 'say'> = {}): Shown['scene'] {
  const n = Math.max(0, Math.min(t, s.settles.length)),
    done = n === s.settles.length;
  return {
    ...extra,
    settled: s.settles.slice(0, n).map(x => x.id),
    frontier: n ? s.settles[n - 1].frontier.map(o => o.id) : [],
    route: done ? s.roads : [],
    arrived: done && s.found,
    noRoute: done && !s.found,
  };
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the town (default) or the Frontier view, with Step / Play under it when the chapter passes
 * `onTick`. A tap on a road calls `onPick` with its id (the road list is the keyboard path). */
export function TableStage({
  show,
  view: kept,
  onView,
  say,
  onTick,
  onPick,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  say?: Say;
  onTick?: (t: number) => void;
  onPick?: (road: string) => void;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: TableOpts = { ...show.scene, say, scale };
  const pick = (e: MouseEvent) => {
    const id = (e.target as Element).closest('[data-road]')?.getAttribute('data-road');
    if (onPick && isRoad(id)) onPick(id);
  };
  const s = show.search;
  return (
    <div className="tc-stage rt-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'frontier'}
          disabled={!s}
          onClick={() => setView('frontier')}
        >
          Frontier
        </button>
      </div>
      <div className="tc-frame">
        {view === 'frontier' && s ? (
          <FrontierView search={s} upTo={show.upTo} closed={show.scene.closed} unit={show.unit} />
        ) : (
          <IsoStage
            className={`table${onPick ? ' rt-pickable' : ''}`}
            board={TABLE_BOARD}
            style={FILL}
            scene={tabletopScene(o)}
            label={tableLabel(o)}
            onClick={pick}
          />
        )}
      </div>
      {onTick && s && <Transport t={show.upTo ?? s.settles.length} until={s.settles.length} onTick={onTick} />}
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
      </p>
    </div>
  );
}

// ---- the road list ----

/** Every road, A to Z by name, so a road is easy to find in the list. */
export const BY_NAME = ROADS.map(r => r.id).sort((a, b) => roadName(a).localeCompare(roadName(b)));

/** The roads as a listbox: the arrow keys move the selection, Enter or Space closes or reopens the selected road; a
 * tap picks one. Close / Reopen acts on the selection; Reopen all clears every closure. */
export function RoadList({
  closed,
  selected,
  edits = {},
  onSelect,
  onClosed,
  roads = BY_NAME,
}: {
  closed: readonly string[];
  selected: string | null;
  edits?: Edits;
  onSelect: (road: string) => void;
  onClosed: (closed: string[]) => void;
  /** the roads offered, in list order */
  roads?: readonly string[];
}) {
  const list = useRef<HTMLDivElement>(null);
  const at = selected ? roads.indexOf(selected) : -1;
  const toggle = (id: string) => onClosed(closed.includes(id) ? closed.filter(c => c !== id) : [...closed, id]);
  // keep the selected road in view, whether the list or the map picked it
  useEffect(() => {
    if (at >= 0) list.current?.querySelector(`[data-option="${roads[at]}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [at, roads]);
  const key = (e: KeyboardEvent) => {
    const a = Math.max(0, at);
    const to = {
      ArrowDown: a + 1,
      ArrowRight: a + 1,
      ArrowUp: a - 1,
      ArrowLeft: a - 1,
      Home: 0,
      End: roads.length - 1,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      onSelect(roads[Math.max(0, Math.min(roads.length - 1, at < 0 ? 0 : to))]);
    } else if ((e.key === 'Enter' || e.key === ' ') && selected) {
      e.preventDefault();
      toggle(selected);
    }
  };
  const isClosed = selected ? closed.includes(selected) : false;
  return (
    <div className="rt-roads">
      <div
        ref={list}
        role="listbox"
        aria-label="Roads: Enter closes or reopens"
        tabIndex={0}
        aria-activedescendant={at >= 0 ? `rt-road-${roads[at]}` : undefined}
        className="rt-list"
        onKeyDown={key}
      >
        {roads.map(id => (
          // biome-ignore lint/a11y/useFocusableInteractive: the listbox holds focus and points at its active option (aria-activedescendant)
          <div
            key={id}
            id={`rt-road-${id}`}
            data-option={id}
            role="option"
            aria-selected={id === selected}
            className={`rt-opt${closed.includes(id) ? ' closed' : ''}`}
            onClick={() => onSelect(id)}
          >
            {closed.includes(id) && <BarrierGlyph />}
            {roadName(id, edits)}
            {closed.includes(id) && <span className="rt-tagword"> · closed</span>}
          </div>
        ))}
      </div>
      <div className="rt-row">
        <button type="button" className="chip" disabled={!selected} onClick={() => selected && toggle(selected)}>
          {!selected ? 'Pick a road' : isClosed ? 'Reopen this road' : 'Close this road'}
        </button>
        {closed.length > 0 && (
          <button type="button" className="chip" onClick={() => onClosed([])}>
            Reopen all
          </button>
        )}
      </div>
    </div>
  );
}

/** The one polite read-out a mechanic updates: what changed, on actions and milestones only. */
export const Status = ({ children }: { children: ReactNode }) => (
  <p className="tc-status rt-status" role="status">
    {children}
  </p>
);
/** The read-out for a route: found, with its minutes, or none. */
export const routeText = (s: Search, goal = nameOf(CUSTOMER)) =>
  s.found
    ? `Route found: ${s.minutes} min by ${s.roads.length} roads.`
    : `No route: the closed roads cut the depot off from ${goal}. The van stays at the depot.`;

/** Radio-like chips: one picked of a few (the search to run). */
export function Chips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="rt-row" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className="chip" aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** A labelled range over a few values. */
export function Pick({
  id,
  name,
  value,
  values,
  text,
  disabled,
  onChange,
}: {
  id: string;
  name: string;
  value: number;
  values: number[];
  text: (v: number) => string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const i = Math.max(0, values.indexOf(value));
  return (
    <div className="rt-range">
      <label htmlFor={id}>{`${name}: ${text(value)}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={i}
        disabled={disabled}
        aria-valuetext={text(value)}
        onChange={e => onChange(values[Number(e.target.value)])}
      />
    </div>
  );
}

/** A cited fact from data/routes/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the town's minutes appear (R6). */
export const TownNote = () => (
  <p className="note rt-note">
    A hand-made town: the junctions, roads and minutes are Larkspur’s stand-ins, not a map.
  </p>
);
