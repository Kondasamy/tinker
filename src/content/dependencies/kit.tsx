// Pieces the Dependencies chapters share: the stage (the crate tower, or the same install as a tree, one at a time),
// the pull-a-crate bar (KTD13: a button per crate in a grid beside the picture, the arrow keys move between them; a
// drop-down forces a version on the chosen crate, Pull takes it out, Put back undoes; the resolver reruns and
// whatever stands on it turns tomato, and topples where motion is allowed), one polite role="status" read-out outside
// the drawing, the day slider, cited facts and the registry note. Every string is React text here; the tower escapes
// its pills (esc).
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { APP, MONTH, nodeAt, versionsOf, type Tree } from '../../lib/dependencies/resolve';
import { fact } from '../../lib/dependencies/facts';
import {
  TOWER_BOARD,
  towerLabel,
  towerReadouts,
  towerScene,
  towerState,
  type TowerOpts,
} from '../../components/scenes/towerScene';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import Select from '../../components/story/Select';
import type { Say } from '../../components/story/steps';
import './dependencies.css';

/** A crate's name as the reader reads it: the app's name for "", "(nested)" for a second copy. */
export const placeName = (path: string) =>
  path === '' ? APP.name : path.includes('/') ? `${path.split('/').pop()} (nested in ${path.split('/')[0]})` : path;

// ---- the Tree tab ----

/** The install as a nested list, like a package manager's tree listing, in a focusable region. */
export function TreeView({ tree, broken }: { tree: Tree; broken: Set<string> }) {
  const item = (path: string, seen: Set<string>): ReactNode => {
    const n = nodeAt(tree, path)!;
    const under = tree.nodes.filter(m => m.by.includes(path)),
      again = seen.has(path);
    const next = new Set([...seen, path]);
    return (
      <li key={path} data-path={path} data-broken={broken.has(path) ? 1 : undefined}>
        <code>{`${n.name}@${n.version}`}</code>
        {path.includes('/') && <span className="dp-tag"> nested</span>}
        {broken.has(path) && <span className="dp-tag bad"> broken</span>}
        {!again && under.length > 0 && <ul>{under.map(m => item(m.path, next))}</ul>}
      </li>
    );
  };
  return (
    <div className="dp-tree" tabIndex={0} role="region" aria-label="Tree">
      <p>
        <code>{APP.name}</code>
        {broken.has('') && <span className="dp-tag bad"> broken</span>}
      </p>
      <ul>{tree.nodes.filter(n => n.by.includes('')).map(n => item(n.path, new Set()))}</ul>
      {tree.unmet.length > 0 && (
        <ul className="dp-unmet">
          {tree.unmet.map(u => (
            <li
              key={`${u.from}>${u.name}`}
            >{`${placeName(u.from)} needs ${u.name} ${u.range}: ${u.got ? `has ${u.got}` : 'missing'}`}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- pull a crate ----

export type Overrides = Record<string, string | null>;
/** The crates the reader pulled, named as they stood in the tree before. */
export const pulledOf = (base: Tree, o: Overrides) =>
  Object.keys(o)
    .filter(p => o[p] === null)
    .map(p => ({ path: p, name: nodeAt(base, p)?.name ?? p, version: nodeAt(base, p)?.version ?? '' }));
/** The reader's last move on the tower: what they did, and what was broken just before it. */
interface Move {
  path: string;
  to: string | null | undefined;
  before: string[];
}

/** A button per crate the tower shows; a select and Pull for the chosen one. Arrow keys move between crates. */
export function PullBar({
  tower,
  overrides,
  onChange,
  only,
}: {
  tower: Omit<TowerOpts, 'say' | 'scale'>;
  overrides: Overrides;
  onChange: (o: Overrides, move: Move) => void;
  /** the crates a chapter offers; every package by default */
  only?: string[];
}) {
  const st = towerState(tower);
  const shown = st.shown.filter(p => p !== '' && (!only || only.includes(p)));
  const pulled = Object.keys(overrides).filter(p => overrides[p] === null);
  const all = [...shown, ...pulled.filter(p => !shown.includes(p))];
  // the chosen crate is kept by its place, so a pull (which moves it off the tower) keeps it chosen
  const [cur, setCur] = useState<string | null>(null),
    at = Math.max(0, all.indexOf(cur ?? ''));
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const path = all[at];
  const crate = tower.crates.find(c => c.path === path);
  const name = path?.split('/').pop() ?? '';
  const before = tower.crates.filter(c => c.broken).map(c => c.path);
  const set = (to: string | null | undefined) => {
    const next = { ...overrides };
    if (to === undefined) delete next[path];
    else next[path] = to;
    onChange(next, { path, to, before });
  };
  const key = (e: KeyboardEvent) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const j = (at + d + all.length) % all.length;
    setCur(all[j]);
    refs.current[j]?.focus();
  };
  if (!path) return null;
  return (
    <div className="dp-pull">
      <div role="toolbar" aria-label="Crates" onKeyDown={key}>
        {all.map((p, i) => (
          <button
            key={p}
            ref={b => {
              refs.current[i] = b;
            }}
            type="button"
            className="chip"
            data-crate={p}
            aria-pressed={i === at}
            tabIndex={i === at ? 0 : -1}
            onClick={() => setCur(p)}
          >
            {p.includes('/') ? `${p.split('/').pop()} (nested)` : p}
          </button>
        ))}
      </div>
      <div className="dp-pick">
        <label>
          {`${placeName(path)} version `}
          <Select
            value={overrides[path] ?? crate?.version ?? ''}
            disabled={overrides[path] === null}
            onChange={e => set(e.target.value)}
          >
            {versionsOf(name).map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </label>
        {overrides[path] === null ? (
          <button type="button" className="chip" onClick={() => set(undefined)}>
            Put back
          </button>
        ) : (
          <button type="button" className="chip" onClick={() => set(null)}>
            {`Pull ${name}`}
          </button>
        )}
      </div>
    </div>
  );
}

/** The read-out after a move: what changed, and what now stands broken. */
function moveText(m: Move, tower: Omit<TowerOpts, 'say' | 'scale'>) {
  const broken = tower.crates.filter(c => c.broken).map(c => (c.path === '' ? APP.name : c.name));
  const what =
    m.to === null
      ? `Pulled ${placeName(m.path)}.`
      : m.to === undefined
        ? `Put back ${placeName(m.path)}.`
        : `${placeName(m.path)} set to ${m.to}.`;
  return `${what} ${broken.length ? `Broken: ${broken.join(', ')}.` : 'Nothing is broken.'}`;
}

// ---- the stage ----

export type View = 'scene' | 'tree';
/** What a chapter puts on the stage: the tower's state, the install for the Tree tab, the caption and the read-out
 * for anything that is not a pull (a new day, the lockfile). */
export interface Shown {
  tower: Omit<TowerOpts, 'say' | 'scale' | 'fell'>;
  tree: Tree;
  caption: ReactNode;
  status?: string;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the tower (default) or the tree, one at a time, with the pull bar beside the picture when the
 * chapter passes `onPull`, and the day slider under it when it passes `onDay`. */
export function DepsStage({
  show,
  view: kept,
  onView,
  say,
  overrides,
  onPull,
  only,
  day,
  onDay,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the tower (TOWER_PARTS) */
  say?: Say;
  overrides?: Overrides;
  onPull?: (o: Overrides) => void;
  only?: string[];
  day?: number;
  onDay?: (d: number) => void;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const [move, setMove] = useState<Move | null>(null);
  const scale = useNarrow() ? 2 : 1.2;
  // a move's topple shows on the crates it broke; the next render without a move draws them still
  const fell = move ? show.tower.crates.filter(c => c.broken && !move.before.includes(c.path)).map(c => c.path) : [];
  const o: TowerOpts = { ...show.tower, say, scale, fell };
  const broken = new Set(show.tower.crates.filter(c => c.broken).map(c => c.path));
  const status = move ? moveText(move, show.tower) : (show.status ?? '');
  return (
    <div className="tc-stage dp-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'tree'} onClick={() => setView('tree')}>
          Tree
        </button>
      </div>
      <div className="tc-frame">
        {view === 'tree' ? (
          <TreeView tree={show.tree} broken={broken} />
        ) : (
          <div className="dp-pic">
            <IsoStage className="tower" board={TOWER_BOARD} style={FILL} scene={towerScene(o)} label={towerLabel(o)} />
          </div>
        )}
      </div>
      {onPull && overrides && (
        <PullBar
          tower={show.tower}
          overrides={overrides}
          only={only}
          onChange={(next, m) => {
            setMove(m);
            onPull(next);
          }}
        />
      )}
      {onDay && day !== undefined && (
        <div className="dp-day">
          <label htmlFor="dp-day">{`Day ${day}`}</label>
          <input
            id="dp-day"
            type="range"
            min={1}
            max={MONTH}
            step={1}
            value={day}
            aria-valuetext={`Day ${day}`}
            onChange={e => {
              setMove(null);
              onDay(Number(e.target.value));
            }}
          />
        </div>
      )}
      <p className="dp-status" role="status" aria-live="polite">
        {status}
      </p>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{towerReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** A cited fact from data/dependencies/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the registry's packages appear (R6). */
export const RegistryNote = () => (
  <p className="note dp-note">Fictional packages in a made-up registry: every name, version and date is invented.</p>
);

/** A labelled on/off switch for the story column. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="dp-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
