// Pieces the Compression chapters share: the stage (the sorting table, or a precise view one tab away: the pointer
// strip, the code tree or the pixels), the merge bench (KTD15: the piles as a listbox, pick two, then Merge; any two of
// the lowest weights are accepted, a wrong pick says why), the coder sizes, real gzip measured here, and cited facts.
// Every string is React text here; the table escapes its pills (esc).
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK, PALS } from '../../lib/iso/core.js';
import {
  PILE_BOARD,
  forestPiles,
  pileLabel,
  pileReadouts,
  pileScene,
  symbolsOf,
  type PileOpts,
} from '../../components/scenes/pileScene';
import { pointerStrip, stripLabel } from '../../components/scenes/pointerStrip';
import { codesOf, join, leavesOf, countOf, type Node } from '../../lib/compression/huffman';
import { gzipSize } from '../../lib/compression/gzip';
import { byteName, type Picture } from '../../lib/compression/files';
import { fact } from '../../lib/compression/facts';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './compression.css';

export const bytes = (n: number) => `${n} byte${n === 1 ? '' : 's'}`;
export const enc = (s: string) => new TextEncoder().encode(s);

// ---- the merge rule ----

/** The puzzle's starting piles: one leaf per symbol of the text, smallest symbol first. */
export const forestOf = (text: string): Node[] => leavesOf(countOf(enc(text)));
/** A pile's name: its symbols, a space drawn as ␣. */
export const pileName = (n: Node) => symbolsOf(n).map(byteName).join('');

/** Huffman's rule, as the bench checks it: the two picked must be the two lowest weights (either of any tie). */
export function mergeCheck(forest: Node[], i: number, j: number): { ok: true } | { ok: false; why: string } {
  const [a, b] = [forest[i], forest[j]].sort((x, y) => x.w - y.w);
  const lightest = [...forest].sort((x, y) => x.w - y.w);
  if (a.w === lightest[0].w && b.w === lightest[1].w) return { ok: true };
  const heavy = a.w !== lightest[0].w ? a : b,
    lighter = lightest.find(x => x !== a && x !== b && x.w < heavy.w)!;
  return {
    ok: false,
    why: `${pileName(heavy)} weighs ${heavy.w}, but ${pileName(lighter)} weighs only ${lighter.w}: merge the two lightest piles.`,
  };
}
/** The forest after a merge: the two piles leave, their merged pile joins at the end. */
export const merged = (forest: Node[], i: number, j: number) => [
  ...forest.filter((_, k) => k !== i && k !== j),
  join(forest[i], forest[j]),
];
/** Huffman's merges from here on, for "Show me": always the two lightest. */
export function finish(forest: Node[]): Node[] {
  let f = forest;
  while (f.length > 1) {
    const order = f.map((n, k) => [n, k] as const).sort((x, y) => x[0].w - y[0].w || x[0].min - y[0].min);
    f = merged(f, order[0][1], order[1][1]);
  }
  return f;
}

// ---- the merge bench ----

/** The piles as a listbox (arrow keys move, Enter or Space picks, at most two) and a Merge button. A wrong pair is
 * refused with the rule; a right one merges. */
export function MergeBench({
  forest,
  onMerge,
  onMiss,
}: {
  forest: Node[];
  onMerge: (next: Node[]) => void;
  /** a refused pair: the chapter counts it as a miss */
  onMiss: () => void;
}) {
  const [picked, setPicked] = useState<number[]>([]),
    [active, setActive] = useState(0),
    [said, setSaid] = useState('');
  const a = Math.min(active, forest.length - 1);
  const toggle = (i: number) => setPicked(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i].slice(-2)));
  const key = (e: KeyboardEvent) => {
    const to = {
      ArrowDown: a + 1,
      ArrowRight: a + 1,
      ArrowUp: a - 1,
      ArrowLeft: a - 1,
      Home: 0,
      End: forest.length - 1,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      setActive(Math.max(0, Math.min(forest.length - 1, to)));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(a);
    }
  };
  const merge = () => {
    if (picked.length !== 2) return;
    const [i, j] = picked,
      r = mergeCheck(forest, i, j);
    setPicked([]);
    if (!r.ok) {
      setSaid(r.why);
      onMiss();
      return;
    }
    setSaid(`Merged ${pileName(forest[i])} and ${pileName(forest[j])}: ${forest[i].w + forest[j].w}.`);
    setActive(forest.length - 2);
    onMerge(merged(forest, i, j));
  };
  if (forest.length <= 1) return <p className="tc-status">One pile left: the code tree is built.</p>;
  return (
    <div className="cz-bench">
      <div
        id="cz-piles"
        role="listbox"
        aria-label="Piles: pick two"
        aria-multiselectable="true"
        tabIndex={0}
        aria-activedescendant={`cz-piles-${a}`}
        className="cz-list"
        onKeyDown={key}
      >
        {forest.map((n, i) => (
          // biome-ignore lint/a11y/useFocusableInteractive: the listbox holds focus and points at its active option (aria-activedescendant)
          <div
            key={`${n.min}-${n.w}-${i}`}
            id={`cz-piles-${i}`}
            role="option"
            aria-selected={picked.includes(i)}
            className={`cz-opt${i === a ? ' active' : ''}${n.kids ? ' merged' : ''}`}
            onClick={() => {
              setActive(i);
              toggle(i);
            }}
          >
            <span className="sym">{pileName(n)}</span>
            <span className="w">{`weighs ${n.w}`}</span>
          </div>
        ))}
      </div>
      <button type="button" className="big" disabled={picked.length !== 2} onClick={merge}>
        Merge
      </button>
      <p className="cz-said" role="status">
        {said}
      </p>
    </div>
  );
}

// ---- the precise views ----

/** The pointer strip: each byte a cell, copies in tomato, an arc from each pointer back to its source. */
export function StripView({ text, pointers }: { text: string; pointers: boolean }) {
  const narrow = useNarrow();
  const s = pointerStrip(enc(text), { perRow: narrow ? 14 : 28, size: 18, pointers });
  const at = (i: number) => s.cells[i];
  return (
    <figure className="cz-strip">
      <svg viewBox={`0 0 ${s.w} ${s.h}`} role="img" aria-label={stripLabel(s)}>
        {s.cells.map(c => (
          <g key={c.i} data-kind={c.kind}>
            <rect
              x={c.x}
              y={c.y}
              width={s.size}
              height={s.size}
              rx={3}
              fill={c.kind === 'copy' ? PALS.tomato.l : '#fbfaf3'}
              stroke={INK}
              strokeWidth={1.2}
            />
            <text x={c.x + s.size / 2} y={c.y + s.size / 2 + 4} fontSize={11} textAnchor="middle">
              {c.ch}
            </text>
          </g>
        ))}
        {s.arcs.map(a => {
          const f = at(a.from),
            t = at(a.to),
            x1 = f.x + s.size / 2,
            x2 = t.x + s.size / 2,
            lift = 22;
          return (
            <g key={a.from} className="cz-arc" data-dist={a.dist} data-len={a.len}>
              <path
                d={`M${x1} ${f.y}C${x1} ${f.y - lift} ${x2} ${t.y - lift} ${x2} ${t.y}`}
                fill="none"
                stroke={INK}
                strokeWidth={1.6}
                markerEnd="url(#cz-head)"
              />
              <text x={x1 + 4} y={f.y - 6} fontSize={10} fontWeight={800}>{`↶${a.dist} ×${a.len}`}</text>
            </g>
          );
        })}
        <defs>
          <marker id="cz-head" viewBox="0 0 6 6" refX={3} refY={3} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M0 0L6 3L0 6Z" fill={INK} />
          </marker>
        </defs>
      </svg>
    </figure>
  );
}

/** The code tree: the merges as a tree, 0 to the left and 1 to the right, each letter with its code under it. */
export function TreeView({ root }: { root: Node }) {
  const codes = codesOf(root),
    leaves: Node[] = [];
  const walk = (n: Node) => (n.kids ? n.kids.forEach(walk) : leaves.push(n));
  walk(root);
  const depth = Math.max(...[...codes.values()].map(c => c.length)),
    DX = 46,
    DY = 44,
    w = leaves.length * DX + 20,
    h = depth * DY + 74;
  const pos = new Map<Node, [number, number]>();
  const place = (n: Node, d: number): [number, number] => {
    const p: [number, number] = n.kids
      ? [(place(n.kids[0], d + 1)[0] + place(n.kids[1], d + 1)[0]) / 2, 22 + d * DY]
      : [10 + DX / 2 + leaves.indexOf(n) * DX, 22 + d * DY];
    pos.set(n, p);
    return p;
  };
  place(root, 0);
  const edges: [Node, Node, string][] = [];
  const collect = (n: Node) =>
    n.kids?.forEach((k, i) => {
      edges.push([n, k, String(i)]);
      collect(k);
    });
  collect(root);
  const label = `Code tree: ${leaves.map(l => `${byteName(l.sym!)} ${codes.get(l.sym!)}`).join(', ')}.`;
  return (
    <figure className="cz-tree">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        {edges.map(([a, b, bit]) => {
          const [x1, y1] = pos.get(a)!,
            [x2, y2] = pos.get(b)!;
          return (
            <g key={`${x2}-${y2}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={1.6} />
              <text
                x={(x1 + x2) / 2 + (bit === '0' ? -8 : 8)}
                y={(y1 + y2) / 2}
                fontSize={11}
                fontWeight={800}
                textAnchor="middle"
              >
                {bit}
              </text>
            </g>
          );
        })}
        {[...pos].map(([n, [x, y]]) => (
          <g key={`${x}-${y}`} data-leaf={n.kids ? undefined : byteName(n.sym!)}>
            <circle
              cx={x}
              cy={y}
              r={n.kids ? 9 : 13}
              fill={n.kids ? PALS.cobalt.l : PALS.mustard.l}
              stroke={INK}
              strokeWidth={1.5}
            />
            <text x={x} y={y + 4} fontSize={n.kids ? 9 : 12} fontWeight={800} textAnchor="middle">
              {n.kids ? n.w : byteName(n.sym!)}
            </text>
            {!n.kids && (
              <text x={x} y={y + 30} fontSize={11} textAnchor="middle" className="code">
                {codes.get(n.sym!)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </figure>
  );
}

/** Two pictures side by side, the original and after the loss, a rect per pixel. */
export function PixelView({ before, after }: { before: Picture; after: Picture }) {
  const pic = (p: Picture, x0: number) =>
    Array.from({ length: p.w * p.h }, (_, i) => {
      const k = i * 3;
      return (
        <rect
          key={i}
          x={x0 + (i % p.w)}
          y={Math.floor(i / p.w)}
          width={1.04}
          height={1.04}
          fill={`rgb(${p.rgb[k]},${p.rgb[k + 1]},${p.rgb[k + 2]})`}
        />
      );
    });
  const gap = 4;
  return (
    <figure className="cz-pixels">
      <svg
        viewBox={`0 0 ${before.w * 2 + gap} ${before.h}`}
        role="img"
        aria-label="The scanner picture before (left) and after throwing detail away (right)."
        shapeRendering="crispEdges"
      >
        {pic(before, 0)}
        {pic(after, before.w + gap)}
      </svg>
      <figcaption>
        <span>Original</span>
        <span>Sent</span>
      </figcaption>
    </figure>
  );
}

// ---- the stage ----

export type View = 'scene' | 'detail';
/** What a chapter puts on the stage: the table, the precise view (if any) with its tab name, and the caption. */
export interface Shown {
  table: Omit<PileOpts, 'scale' | 'say'>;
  detail?: { name: string; view: ReactNode };
  caption: ReactNode;
}

/** The chapters' stage: the sorting table (default) or the chapter's precise view, one at a time. The tab is the
 * reader's view, kept out of saved progress unless the chapter passes `view`. */
export function CompressionStage({
  show,
  view: kept,
  onView,
  say,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the table (PILE_PARTS) */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: PileOpts = { ...show.table, say, scale };
  return (
    <div className="tc-stage cz-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        {show.detail && (
          <button type="button" className="chip" aria-pressed={view === 'detail'} onClick={() => setView('detail')}>
            {show.detail.name}
          </button>
        )}
      </div>
      <div className="tc-frame">
        {view === 'detail' && show.detail ? (
          show.detail.view
        ) : (
          <IsoStage
            className="piles"
            board={PILE_BOARD}
            style={{ height: '100%' }}
            scene={pileScene(o)}
            label={pileLabel(o)}
          />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{pileReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** The forest's piles on the table, the newest merge lit. */
export const forestTable = (forest: Node[], lastMerged: boolean): Omit<PileOpts, 'scale' | 'say'> => ({
  piles: forestPiles(forest, lastMerged ? forest.at(-1) : undefined),
});

// ---- the story column ----

/** Real gzip on the same bytes, measured in this browser (KTD6); reports its size once known (-1 if it can't run). */
export function GzipLine({ data, onSize }: { data: Uint8Array; onSize?: (n: number) => void }) {
  const [n, setN] = useState<number | null>(null),
    report = useRef(onSize);
  report.current = onSize;
  useEffect(() => {
    let live = true;
    const done = (x: number) => {
      if (!live) return;
      setN(x);
      report.current?.(x);
    };
    gzipSize(data).then(done, () => done(-1));
    return () => {
      live = false;
    };
  }, [data]);
  return (
    <p className="cz-gzip" role="status" data-gzip={n ?? ''}>
      {n === null
        ? 'Measuring real gzip…'
        : n < 0
          ? 'This browser can’t run gzip here.'
          : `Real gzip, measured here: ${bytes(n)}.`}
    </p>
  );
}

/** A cited fact from data/compression/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the picture or the random file appear (R6). */
export const FilesNote = () => (
  <p className="note cz-note">
    The texts are Larkspur’s own pages; the random file is seeded noise and the picture is drawn for this site.
  </p>
);
