// Pieces the Recommendations chapters share: the stage (the shop aisle, or the ranking table, one at a time) with the
// move-a-shopper mechanic (KTD13: in the map view the shopper is a focusable marker over the taste map, moved by the
// arrow keys while it has focus, or dragged; the shelf re-ranks at once; a native select beside it picks a shopper by
// name instead), one polite role="status" read-out outside the drawing that names the shelf after each action, cited
// facts and the orders note. Every string is React text here; the aisle escapes its pills (esc).
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import IsoStage, { stageFrame } from '../../lib/iso/IsoStage';
import { BH } from '../../lib/iso/blocks';
import { C, P, S, withFrame } from '../../lib/iso/core.js';
import { BASE, type Vec } from '../../lib/recommendations/factorise';
import { fact } from '../../lib/recommendations/facts';
import { AISLES, ORDERS_NOTE, PRODUCTS, listOf, productOf, type Aisle } from '../../lib/recommendations/story';
import {
  SHELF_BOARD,
  fromFloor,
  shelfLabel,
  shelfReadouts,
  shelfScene,
  shelfState,
  toFloor,
  type ShelfOpts,
} from '../../components/scenes/shelfScene';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './recommendations.css';

/** How far one arrow press moves the marker, in floor units. */
export const STEP = 6;
/** Arrow key → a move across the screen, in floor units (x runs down-right, y down-left). */
export const KEYS: Record<string, [number, number]> = {
  ArrowRight: [STEP, -STEP],
  ArrowLeft: [-STEP, STEP],
  ArrowUp: [-STEP, -STEP],
  ArrowDown: [STEP, STEP],
};
/** The taste one arrow press away. */
export const nudge = (v: Vec, key: string): Vec => {
  const d = KEYS[key],
    [x, y] = toFloor(v);
  return d ? fromFloor(x + d[0], y + d[1]) : v;
};

// each aisle's direction on the map: the mean of its products' pinned tastes
const AISLE_DIR = Object.fromEntries(
  (Object.keys(AISLES) as Aisle[]).map(a => {
    const vs = PRODUCTS.filter(p => p.aisle === a && BASE.items[p.id]).map(p => BASE.items[p.id]!);
    return [a, [vs.reduce((t, v) => t + v[0], 0) / vs.length, vs.reduce((t, v) => t + v[1], 0) / vs.length]];
  }),
) as Record<Aisle, Vec>;
/** The aisle a taste points at most nearly (by angle): the shelf ranks by direction, not distance. */
export function nearestAisle(v: Vec): Aisle {
  const cos = (a: Vec) => (a[0] * v[0] + a[1] * v[1]) / (Math.hypot(...a) * Math.hypot(...v) || 1);
  return (Object.keys(AISLE_DIR) as Aisle[]).reduce((b, a) => (cos(AISLE_DIR[a]) > cos(AISLE_DIR[b]) ? a : b));
}

/** The read-out's words for a shelf: "Ash Joinery’s shelf: Wood glue, … and Clamp set." */
export const shelfText = (who: string, shelf: string[]) =>
  `${who}’s shelf: ${listOf(shelf.map(id => productOf(id).name)) || 'empty'}.`;

/** Whether the reader asked for less motion, kept live. */
export function useReduced() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)'),
      f = () => setReduced(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return reduced;
}

// ---- the marker ----

const FRAME = stageFrame(SHELF_BOARD);
const screenOf = (v: Vec) => withFrame(FRAME, () => P(...toFloor(v), BH + 7)) as [number, number];

/** The shopper on the map as a control: arrow keys move it while it has focus, a drag moves it, Tab leaves it. */
function Marker({ you, name, onMove }: { you: Vec; name: string; onMove: (v: Vec) => void }) {
  const drag = useRef(false);
  const [x, y] = screenOf(you);
  const key = (e: KeyboardEvent) => {
    if (!KEYS[e.key]) return;
    e.preventDefault();
    onMove(nudge(you, e.key));
  };
  const move = (e: PointerEvent<SVGGElement>) => {
    if (!drag.current) return;
    const cam = (e.currentTarget.ownerSVGElement?.querySelector('.iso-cam') as SVGGElement | null)?.getScreenCTM();
    if (!cam) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(cam.inverse());
    // the inverse of the projection on the floor (z = BH), at the front view
    const a = (p.x - FRAME.ox) / C,
      b = (p.y - FRAME.oy + BH) / S;
    onMove(fromFloor((a + b) / 2, (b - a) / 2));
  };
  return (
    <g
      className="rc-marker"
      role="button"
      tabIndex={0}
      aria-roledescription="movable shopper"
      aria-label={`${name} on the taste map, nearest ${AISLES[nearestAisle(you)]}. Arrow keys move them.`}
      transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
      onKeyDown={key}
      onPointerDown={e => {
        drag.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={move}
      onPointerUp={() => {
        drag.current = false;
      }}
      onPointerCancel={() => {
        drag.current = false;
      }}
    >
      <circle className="rc-hit" r={16} />
      <circle className="rc-ring" r={11} />
    </g>
  );
}

// ---- the Ranking tab ----

export interface Ranked {
  id: string;
  score: number;
}
/** The ranking behind the shelf: the top products with their scores, the shelf's marked. */
export function RankingView({ rows, scoreName, shelf }: { rows: Ranked[]; scoreName: string; shelf: string[] }) {
  return (
    <div className="rc-rank" tabIndex={0} role="region" aria-label="Ranking">
      <table className="tc-ledger">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Product</th>
            <th scope="col">{scoreName}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} data-product={r.id} data-shelf={shelf.includes(r.id) ? 1 : undefined}>
              <td>{i + 1}</td>
              <th scope="row">
                {productOf(r.id).name}
                {shelf.includes(r.id) && <span className="rc-tag"> on the shelf</span>}
              </th>
              <td>{Number.isInteger(r.score) ? r.score : r.score.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'rank';
const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape

/** A list of shoppers to pick from by name: the list alternative to moving the marker. */
export interface Pick {
  value: string;
  options: { id: string; name: string }[];
  onPick: (id: string) => void;
  label?: string;
}

/** The chapters' stage: the aisle (default) or the ranking, one at a time; the marker over the map when the chapter
 * passes `onMove`; a shopper select when it passes `pick`; and one read-out. */
export function RecsStage({
  shelf,
  rows,
  scoreName,
  caption,
  status,
  view: kept,
  onView,
  say,
  onMove,
  pick,
  children,
}: {
  shelf: Omit<ShelfOpts, 'say' | 'scale'>;
  rows: Ranked[];
  scoreName: string;
  caption: ReactNode;
  /** the read-out; by default it names the shelf */
  status?: string;
  view?: View;
  onView?: (v: View) => void;
  say?: Say;
  onMove?: (v: Vec) => void;
  pick?: Pick;
  /** controls under the picture (a round stepper) */
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: ShelfOpts = { ...shelf, say, scale };
  const st = shelfState(o);
  const [moved, setMoved] = useState(false);
  const said =
    status ??
    `${moved && shelf.you ? `Nearest ${AISLES[nearestAisle(shelf.you)]}. ` : ''}${shelfText(shelf.shopper, st.shelf)}`;
  const marker = onMove && shelf.view === 'map' && shelf.you;
  return (
    <div className="tc-stage rc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'rank'} onClick={() => setView('rank')}>
          Ranking
        </button>
      </div>
      <div className="tc-frame">
        {view === 'rank' ? (
          <RankingView rows={rows} scoreName={scoreName} shelf={st.shelf} />
        ) : (
          <IsoStage
            className="aisle"
            board={SHELF_BOARD}
            style={FILL}
            role={marker ? 'group' : 'img'}
            scene={shelfScene(o)}
            label={shelfLabel(o)}
          >
            {marker && (
              <Marker
                you={shelf.you!}
                name={shelf.shopper}
                onMove={v => {
                  setMoved(true);
                  onMove(v);
                }}
              />
            )}
          </IsoStage>
        )}
      </div>
      {pick && (
        <label className="rc-pick">
          {pick.label ?? 'Shopper'}{' '}
          <select
            value={pick.value}
            onChange={e => {
              setMoved(false);
              pick.onPick(e.target.value);
            }}
          >
            {pick.options.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {children}
      <p className="rc-readout" role="status" aria-live="polite">
        {said}
      </p>
      <p className="tc-caption">
        <span className="txt">{caption}</span>
        <span className="lbl">{shelfReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** A cited fact from data/recommendations/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the orders' counts appear (R6). */
export const OrdersNote = () => <p className="note rc-note">{ORDERS_NOTE}</p>;
