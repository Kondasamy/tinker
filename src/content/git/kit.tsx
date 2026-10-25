// Pieces the Git chapters share: the stage (the crate yard, or the commit graph, one at a time), the editor panel under
// it whose typing re-stamps a crate with its real blob id, the price page with its conflict hunks, cited facts and the
// fold-away commands. Every string is React text here; the yard escapes its pills (esc), and the graph is drawn as
// React SVG, so it has no markup to escape.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import { FILE, type Repo } from '../../lib/git/graph';
import { blobId, short } from '../../lib/git/objects';
import { diff, isConflict, type Merged } from '../../lib/git/merge';
import { fact } from '../../lib/git/facts';
import {
  boardOf,
  crateLabel,
  crateReadouts,
  crateScene,
  type yardOf,
  type CrateOpts,
  type Packing,
} from '../../components/scenes/crateScene';
import { commitGraph, graphLabel } from '../../components/scenes/commitGraph';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './git.css';

/** The editor's cap: the price page stays a page. */
export const MAX_TEXT = 400;

/** Chapter 1's packing view for a typed text against the saved one. */
export const packingOf = (saved: string, now: string): Packing => ({
  file: FILE,
  saved: blobId(saved),
  now: blobId(now.slice(0, MAX_TEXT)),
});

// ---- the Graph tab ----

const DOT = 9;
/** The commit graph: one commit in the tab order at a time; the arrow keys (Home, End) move between them, and the line
 * under the drawing reads out the one in focus. */
export function GraphView({ repo, opts }: { repo: Repo; opts?: Parameters<typeof yardOf>[1] }) {
  const g = commitGraph(repo, opts),
    n = g.nodes.length;
  const [cur, setCur] = useState(n - 1),
    [said, setSaid] = useState<number | null>(null),
    list = useRef<SVGSVGElement>(null);
  const i = Math.max(0, Math.min(cur, n - 1));
  const go = (to: number) => {
    setCur(to);
    setSaid(to);
    list.current?.querySelector<SVGGElement>(`[data-node="${to}"]`)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(Math.max(0, Math.min(n - 1, to)));
  };
  const at = Object.fromEntries(g.nodes.map(x => [x.id, x]));
  return (
    <figure className="gt-graph">
      <svg viewBox={`0 0 ${g.w} ${g.h}`} role="list" aria-label={graphLabel(repo)} ref={list} onKeyDown={key}>
        {g.edges.map(e => {
          const a = at[e.from],
            b = at[e.to];
          const d =
            a.y === b.y
              ? `M${a.x} ${a.y}H${b.x}`
              : `M${a.x} ${a.y}C${a.x - 30} ${a.y} ${b.x + 30} ${b.y} ${b.x} ${b.y}`;
          return (
            <path
              key={`${e.from}${e.to}`}
              d={d}
              fill="none"
              stroke={INK}
              strokeWidth={1.6}
              strokeDasharray={a.state === 'ghost' ? '3 3' : undefined}
              aria-hidden="true"
            />
          );
        })}
        {g.hidden > 0 && (
          <text x={4} y={g.nodes.find(x => x.y === 30)?.y ?? 30} dy={-14} fontSize={10} aria-hidden="true">
            {`+${g.hidden} older`}
          </text>
        )}
        {g.nodes.map((x, k) => (
          <g
            key={x.id}
            role="listitem"
            tabIndex={k === i ? 0 : -1}
            aria-label={x.name}
            data-node={k}
            data-id={x.id}
            className={`gt-node${x.state ? ` ${x.state}` : ''}`}
            onFocus={() => {
              setCur(k);
              setSaid(k);
            }}
            onClick={() => go(k)}
          >
            {k === i && <circle cx={x.x} cy={x.y} r={DOT + 5} className="ring" aria-hidden="true" />}
            <circle cx={x.x} cy={x.y} r={x.parents.length > 1 ? DOT + 1.5 : DOT} className="dot" aria-hidden="true" />
            <text x={x.x} y={x.y + DOT + 12} fontSize={10} textAnchor="middle" aria-hidden="true">
              {short(x.id)}
            </text>
            {x.branches.length > 0 && (
              <text x={x.x} y={x.y - DOT - 6} fontSize={10.5} fontWeight={800} textAnchor="middle" aria-hidden="true">
                {x.branches.join(' · ') + (x.head ? ' ◂ HEAD' : '')}
              </text>
            )}
          </g>
        ))}
      </svg>
      <p className="gt-readout" aria-live="polite">
        {said === null ? 'Tab to the graph, then use the arrow keys to read each commit.' : g.nodes[i]?.name}
      </p>
    </figure>
  );
}

// ---- the editor ----

/** The price page as a text box under the stage. Typing re-stamps the crate at once; the new name is read out to a
 * screen reader only once typing pauses, so it never talks over each key. */
export function Editor({
  text,
  onText,
  saved,
  locked = false,
}: {
  text: string;
  onText: (t: string) => void;
  saved: string;
  /** read only, e.g. until the reader has predicted */
  locked?: boolean;
}) {
  const id = blobId(text),
    same = id === blobId(saved);
  const [spoken, setSpoken] = useState(''),
    opened = useRef(id),
    changed = useRef(false);
  useEffect(() => {
    if (id !== opened.current) changed.current = true;
    if (!changed.current) return; // nothing to say until the text changes
    const t = setTimeout(
      () => setSpoken(same ? `Same name as the saved crate: ${short(id)}.` : `New name: ${short(id)}.`),
      700,
    );
    return () => clearTimeout(t);
  }, [id, same]);
  return (
    <section className="gt-editor" aria-label="The price page">
      <label htmlFor="gt-text" className="lbl">
        {FILE}
      </label>
      <textarea
        id="gt-text"
        value={text}
        maxLength={MAX_TEXT}
        rows={6}
        spellCheck={false}
        readOnly={locked}
        aria-describedby="gt-id"
        onChange={e => onText(e.target.value)}
      />
      <p id="gt-id" className="gt-id">
        {'Blob id: '}
        <code>{id}</code>
        {same ? ' (same as saved)' : ''}
      </p>
      <p className="gt-sr" aria-live="polite">
        {spoken}
      </p>
    </section>
  );
}

// ---- the stage ----

export type View = 'scene' | 'graph';
/** What a chapter puts on the stage: the yard, the repo for the Graph tab, and the caption. */
export interface Shown {
  yard: Omit<CrateOpts, 'scale' | 'say'>;
  repo?: Repo;
  graph?: Parameters<typeof yardOf>[1];
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the crate yard (default) or the commit graph, one at a time, with the editor panel under it
 * when a chapter types. The tab is the reader's view, kept out of saved progress unless the chapter passes `view`. */
export function GitStage({
  show,
  view: kept,
  onView,
  say,
  editor,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the yard (CRATE_PARTS) */
  say?: Say;
  editor?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: CrateOpts = { ...show.yard, say, scale };
  return (
    <div className="tc-stage gt-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'graph'}
          disabled={!show.repo}
          onClick={() => setView('graph')}
        >
          Graph
        </button>
      </div>
      <div className="tc-frame">
        {view === 'graph' && show.repo ? (
          <GraphView repo={show.repo} opts={show.graph} />
        ) : (
          <IsoStage className="crates" board={boardOf(o)} style={FILL} scene={crateScene(o)} label={crateLabel(o)} />
        )}
      </div>
      {editor}
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{crateReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

// ---- the story column ----

/** The price page as lines, a conflict hunk shown as its two sides and the base. */
export function PageText({ merged, text, names }: { merged?: Merged; text?: string; names?: [string, string] }) {
  if (!merged) return <pre className="gt-page">{text}</pre>;
  return (
    <pre className="gt-page">
      {merged.pieces.map((p, k) =>
        !isConflict(p) ? (
          <span key={k}>{p}</span>
        ) : (
          <span key={k} className="gt-hunk">
            <span className="ours">{`${names?.[0] ?? 'ours'}: ${p.ours.join('')}`}</span>
            <span className="base">{`base: ${p.base.join('')}`}</span>
            <span className="theirs">{`${names?.[1] ?? 'theirs'}: ${p.theirs.join('')}`}</span>
          </span>
        ),
      )}
    </pre>
  );
}

/** What changed from one version of the page to the next: the old line struck out, the new one added. */
export function DiffText({ from, to }: { from: string; to: string }) {
  return (
    <pre className="gt-page">
      {diff(from, to)
        .filter(x => x.op !== 'same')
        .map((x, k) => (
          <span key={k} className={x.op}>{`${x.op === 'del' ? '− ' : '+ '}${x.line}`}</span>
        ))}
    </pre>
  );
}

/** A cited fact from data/git/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** The Git commands for what a step did, folded away: the lesson is the objects, not the commands. */
export const Commands = ({ lines }: { lines: string[] }) => (
  <details className="gt-cmds">
    <summary>The commands</summary>
    <pre>{lines.join('\n')}</pre>
  </details>
);

/** Shown wherever the fixture repo's people and times appear (R6). */
export const RepoNote = () => (
  <p className="note gt-note">
    Larkspur’s repo is written for this site, with fixed people and times; every hash is the one real Git gives it.
  </p>
);
