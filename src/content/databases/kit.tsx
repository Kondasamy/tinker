// Pieces the databases chapters share: the stage (the filing room, or the tree view, one at a time), cited facts, the
// teaching-database note and the SQL fold-away. Every string is React text here; the room escapes its pills (esc), and
// the tree is drawn as React SVG, so it has no markup to escape.
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK, PALS } from '../../lib/iso/core.js';
import { fact } from '../../lib/databases/facts';
import type { Exec, IndexName, Query } from '../../lib/databases/planner';
import {
  ARCHIVE_BOARD,
  archiveLabel,
  archiveReadouts,
  archiveScene,
  type ArchiveOpts,
} from '../../components/scenes/archiveScene';
import { treeView } from '../../components/scenes/treeView';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './databases.css';

// ---- the Tree tab ----

/** The lookup's path as rows, root to table: one in the tab order at a time; the arrow keys (Home, End) move between
 * them, and the line under the drawing reads out the one in focus. */
export function TreeView({ how, query, exec }: { how: IndexName; query: Query; exec: Exec }) {
  const phone = useNarrow(),
    t = treeView(how, query, exec, { phone }),
    n = t.rows.length;
  const [cur, setCur] = useState(0),
    [said, setSaid] = useState<number | null>(null),
    list = useRef<SVGSVGElement>(null);
  const i = Math.min(cur, n - 1);
  const go = (to: number) => {
    setCur(to);
    setSaid(to);
    list.current?.querySelector<SVGGElement>(`[data-row="${to}"]`)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(Math.max(0, Math.min(n - 1, to)));
  };
  const fs = t.fs;
  return (
    <figure className="db-tree">
      <svg viewBox={`0 0 ${t.w} ${t.h}`} role="list" aria-label={t.label} ref={list} onKeyDown={key}>
        {t.rows.map((r, k) => (
          <g
            key={r.title}
            role="listitem"
            tabIndex={k === i ? 0 : -1}
            aria-label={r.words}
            data-row={k}
            className="db-row"
            onFocus={() => {
              setCur(k);
              setSaid(k);
            }}
            onClick={() => go(k)}
          >
            {k === i && (
              <rect
                x={2}
                y={r.y - 4}
                width={t.w - 4}
                height={t.row + 8}
                rx={6}
                fill="var(--acc, #f4b829)"
                opacity={0.25}
                aria-hidden="true"
              />
            )}
            <text x={t.x0 - 8} y={r.y + t.row / 2 + fs * 0.36} fontSize={fs} textAnchor="end" aria-hidden="true">
              {r.title}
            </text>
            {r.left > 0 && (
              <text x={t.x0 - 2} y={r.y + t.row + fs} fontSize={fs * 0.85} aria-hidden="true">
                {`+${r.left.toLocaleString('en-US')}`}
              </text>
            )}
            {r.right > 0 && (
              <text x={t.w - 4} y={r.y + t.row + fs} fontSize={fs * 0.85} textAnchor="end" aria-hidden="true">
                {`+${r.right.toLocaleString('en-US')}`}
              </text>
            )}
            {r.boxes.map(b => (
              <g key={b.x} aria-hidden="true">
                <rect
                  x={b.x}
                  y={r.y}
                  width={b.w}
                  height={t.row}
                  rx={4}
                  fill={b.lit ? PALS.mustard.l : '#fbfaf3'}
                  stroke={INK}
                  strokeWidth={b.lit ? 1.6 : 0.8}
                />
                <text x={b.x + b.w / 2} y={r.y + t.row / 2 + fs * 0.36} fontSize={fs} textAnchor="middle">
                  {b.text}
                </text>
              </g>
            ))}
          </g>
        ))}
      </svg>
      <p className="db-readout" aria-live="polite">
        {said === null ? 'Tab to the tree, then use the arrow keys to walk down its path.' : t.rows[i].words}
      </p>
    </figure>
  );
}

// ---- the stage ----

export type View = 'scene' | 'tree';
/** What a chapter puts on the stage: the room's state, the request behind the Tree tab (none turns it off), and the
 * caption. */
export interface Shown {
  scene: Omit<ArchiveOpts, 'scale' | 'say'>;
  tree?: { how: IndexName; query: Query; exec: Exec };
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the filing room (default) or the tree, one at a time. The tab is the reader's view, kept out
 * of saved progress unless the chapter passes `view` and `onView`. */
export function DbStage({
  show,
  view: kept,
  onView,
  say,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the room (ARCHIVE_PARTS) */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: ArchiveOpts = { ...show.scene, say, scale };
  return (
    <div className="tc-stage db-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'tree'}
          disabled={!show.tree}
          onClick={() => setView('tree')}
        >
          Tree
        </button>
      </div>
      <div className="tc-frame">
        {view === 'tree' && show.tree ? (
          <TreeView {...show.tree} />
        ) : (
          <IsoStage
            className="archive"
            board={ARCHIVE_BOARD}
            style={FILL}
            scene={archiveScene(o)}
            label={archiveLabel(o)}
          />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{archiveReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** A cited fact from data/databases/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the page counts appear (R6). */
export const SimNote = () => (
  <p className="note db-note">
    A teaching database: Larkspur’s generated orders in a real B-tree, pages counted as it runs. Not any real database’s
    numbers.
  </p>
);

/** The request as SQL, folded away: the chapters show plain requests (Scope: no SQL tutorial). */
export const Sql = ({ code }: { code: string }) => (
  <details className="db-sql">
    <summary>The SQL</summary>
    <pre>
      <code>{code}</code>
    </pre>
  </details>
);
