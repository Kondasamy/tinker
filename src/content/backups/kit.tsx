// Pieces the backups chapters share: the stage (the server room, or the week's timeline, one at a time) with the strike
// bar under it (KTD8's "drop the disaster": a Select picks the disaster, a range the hour, Strike hits), one polite
// read-out of what the strike left, cited facts and the simulator note. Every string is React text here; the picture
// escapes its pills (esc), and the timeline draws its words as SVG text nodes.
import { useId, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import Select from '../../components/story/Select';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import { useNarrow } from '../tool-calling/kit';
import { fact } from '../../lib/backups/facts';
import {
  DAYS,
  KIND,
  TICKS,
  WRITES,
  clock,
  plural,
  restore,
  type Kind,
  type Strike,
  type Week,
} from '../../lib/backups/sim';
import { SAFE_BOARD, safeAt, safeLabel, safeReadouts, safeScene } from '../../components/scenes/safeScene';
import './backups.css';

/** What every chapter's state carries for the stage. */
export interface Struck {
  hour: number;
  kind: Kind;
  struck: boolean;
  view: View;
}
export const strikeOf = (s: Struck): Strike | null => (s.struck ? { kind: s.kind, hour: s.hour } : null);

// ---- the Week tab ----

const W = 600,
  H = 210,
  X0 = 84,
  X1 = W - 10,
  CW = (X1 - X0) / TICKS;
const LANES = ['Orders', 'Server room', 'Warehouse', 'Lockbox'] as const;
const LANE_Y = [20, 92, 128, 164];
const xAt = (t: number) => X0 + t * CW;
const MAX_W = Math.max(...WRITES);

/** The week as a timeline: orders an hour, the copies in each place (tall: full, short: incremental, tomato: never
 * reads back), the disaster and the restore point, the lost hours shaded. */
export function WeekView({ week, hour, strike }: { week: Week; hour: number; strike: Strike | null }) {
  const at = strike ? strike.hour : hour,
    r = strike ? restore(week, strike) : null;
  const lane = { cabinet: 1, warehouse: 2, lockbox: 3 } as const;
  const label =
    `The week to ${clock(at)}: ${plural(week.copies.filter(c => c.place === 'cabinet' && c.t <= at).length, 'tape')} in the server room. ` +
    (r
      ? r.from === null
        ? `${KIND[r.strike.kind].name} at ${clock(at)}: nothing restores.`
        : `${KIND[r.strike.kind].name} at ${clock(at)}: restored to ${clock(r.point!)}, ${plural(r.lost, 'order')} lost.`
      : '');
  return (
    <figure className="bk-week">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {DAYS.map((d, i) => (
          <g key={d}>
            <line x1={xAt(i * 24)} x2={xAt(i * 24)} y1={8} y2={H - 18} className="bk-day" />
            <text x={xAt(i * 24 + 12)} y={H - 4} textAnchor="middle">
              {d}
            </text>
          </g>
        ))}
        {LANES.map((n, i) => (
          <text key={n} x={4} y={(i === 0 ? 50 : LANE_Y[i]) + 4}>
            {n}
          </text>
        ))}
        {r && (
          <rect
            className="bk-lost"
            x={xAt(r.point ?? 0)}
            y={8}
            width={Math.max(CW, xAt(at + 1) - xAt(r.point ?? 0))}
            height={66}
          />
        )}
        {WRITES.slice(0, at + 1).map((n, t) => (
          <rect
            key={t}
            className="bk-orders"
            x={xAt(t)}
            y={74 - (n / MAX_W) * 56}
            width={CW}
            height={(n / MAX_W) * 56}
          />
        ))}
        {week.copies
          .filter(c => c.t <= at)
          .map(c => {
            const y = LANE_Y[lane[c.place]],
              h = c.full ? 12 : 7,
              lost = r?.hit.includes(c.place);
            return (
              <rect
                key={`${c.place}${c.t}`}
                className={`bk-copy${c.full ? ' full' : ''}${c.bad && r ? ' bad' : ''}${lost ? ' lost' : ''}${r?.from === c.place && r.point === c.t ? ' used' : ''}`}
                x={xAt(c.t) - 1}
                y={y - h}
                width={Math.max(2, CW)}
                height={h * 2}
              />
            );
          })}
        {r && <line className="bk-strike" x1={xAt(at + 1)} x2={xAt(at + 1)} y1={6} y2={H - 18} />}
        {r?.point != null && <line className="bk-point" x1={xAt(r.point)} x2={xAt(r.point)} y1={6} y2={H - 18} />}
      </svg>
    </figure>
  );
}

// ---- the strike bar ----

/** Pick a disaster and an hour, then Strike. `hours` false holds the hour where the chapter set it; `presets` gives
 * each disaster its own fixed hour (the workbench's week). */
export function StrikeBar({
  s,
  kinds,
  hours = true,
  presets,
  onChange,
}: {
  s: Struck;
  kinds: readonly Kind[];
  hours?: boolean;
  presets?: Partial<Record<Kind, number>>;
  onChange: (s: Struck, strike?: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="bk-bar">
      <label className="bk-field">
        <span>Disaster</span>
        <Select
          value={s.kind}
          onChange={e => {
            const kind = e.target.value as Kind;
            onChange({ ...s, kind, hour: presets?.[kind] ?? s.hour, struck: false });
          }}
        >
          {kinds.map(k => (
            <option key={k} value={k}>
              {presets?.[k] !== undefined ? `${KIND[k].name}, ${clock(presets[k]!)}` : KIND[k].name}
            </option>
          ))}
        </Select>
      </label>
      {hours && !presets && (
        <div className="bk-field bk-hour">
          <label htmlFor={id}>{`Hour: ${clock(s.hour)}`}</label>
          <input
            id={id}
            type="range"
            min={0}
            max={TICKS - 1}
            step={1}
            value={s.hour}
            aria-valuetext={clock(s.hour)}
            onChange={e => onChange({ ...s, hour: Number(e.target.value), struck: false })}
          />
        </div>
      )}
      {(!hours || presets) && <span className="bk-clock">{clock(s.hour)}</span>}
      <button type="button" className="chip bk-strike-btn" onClick={() => onChange({ ...s, struck: true }, true)}>
        Strike
      </button>
    </div>
  );
}

/** The one polite read-out: what the last strike left, said once per change. */
export function strikeWords(week: Week, s: Struck): string {
  if (!s.struck) return 'No disaster yet.';
  const r = restore(week, { kind: s.kind, hour: s.hour });
  return r.from === null
    ? `${KIND[s.kind].name} at ${clock(s.hour)}: no copy survived. Every order is gone.`
    : `${KIND[s.kind].name} at ${clock(s.hour)}: restored from the ${r.from} copy of ${clock(r.point!)}. ${plural(r.lost, 'order')} lost, ${r.down} hours down.`;
}

// ---- the stage ----

export type View = 'scene' | 'week';
const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape

/** The chapters' stage: the server room (default) or the week, one at a time, with the strike bar under it. */
export function BackupsStage({
  week,
  s,
  say,
  caption,
  bar,
  onView,
}: {
  week: Week;
  s: Struck;
  /** the step's callout, drawn on the picture (SAFE_PARTS) */
  say?: Say;
  caption?: ReactNode;
  bar?: ReactNode;
  onView: (v: View) => void;
}) {
  const scale = useNarrow() ? 2 : 1.2;
  const o = { ...safeAt(week, s.hour, strikeOf(s)), say, scale };
  return (
    <div className="tc-stage bk-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={s.view === 'scene'} onClick={() => onView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={s.view === 'week'} onClick={() => onView('week')}>
          Week
        </button>
      </div>
      <div className="tc-frame">
        {s.view === 'week' ? (
          <WeekView week={week} hour={s.hour} strike={strikeOf(s)} />
        ) : (
          <IsoStage className="safe" board={SAFE_BOARD} style={FILL} scene={safeScene(o)} label={safeLabel(o)} />
        )}
      </div>
      {bar}
      <p className="bk-status" role="status">
        {strikeWords(week, s)}
      </p>
      <p className="tc-caption">
        {caption && <span className="txt">{caption}</span>}
        <span className="lbl">{safeReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** A labelled checkbox that changes the copy plan. */
export const Toggle = ({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) => (
  <label className="bk-row">
    <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} /> {label}
  </label>
);

/** A cited fact from data/backups/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the simulator's counts appear (R6). */
export const SimNote = () => (
  <p className="note bk-note">
    A simulated week: Larkspur’s hand-made order log, disasters and planning-number restore times and costs.
  </p>
);
