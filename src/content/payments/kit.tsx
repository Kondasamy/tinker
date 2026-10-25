// Pieces the payments chapters share: the stage (the tube exchange, or the ledger, one at a time), the clock that runs
// through Larkspur's days and nights, the checkout switches (3-D Secure, capture, idempotency key), cited facts and the
// simulator note. Every string is React text here; the exchange escapes its pills (esc), and the ledger is a table.
import { useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import {
  ASSUMPTIONS,
  CAPTURES,
  CAPTURE_NAME,
  PARTIES,
  PARTY_NAME,
  SCAS,
  SCA_NAME,
  TICKS,
  clock,
  eur,
  type Capture,
  type Run,
  type Sca,
} from '../../lib/payments/sim';
import { fact } from '../../lib/payments/facts';
import { TUBE_BOARD, tubeLabel, tubeReadouts, tubeScene, type TubeOpts } from '../../components/scenes/tubeScene';
import { ledgerAt } from '../../components/scenes/ledgerView';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './payments.css';

// ---- the Ledger tab ----

/** Each order's money by party at tick t, as a table: a row per order, every row summing to zero. */
export function LedgerView({ result, t, ids }: { result: Run; t: number; ids?: string[] }) {
  const l = ledgerAt(result, t, ids);
  return (
    // a focusable region, so the keyboard can scroll a wide table
    <div className="pm-ledger" tabIndex={0} role="region" aria-label={`Ledger, ${clock(t)}`}>
      <table className="tc-ledger">
        <caption>{`Who has paid whom, ${clock(t)}`}</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            {PARTIES.map(p => (
              <th key={p} scope="col">
                {PARTY_NAME[p]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {l.rows.length ? (
            l.rows.map(r => (
              <tr key={r.id} data-order={r.id}>
                <th scope="row">{`${r.who}, ${r.item}`}</th>
                {PARTIES.map(p => (
                  <td key={p} className={r.cells[p] < 0 ? 'out' : r.cells[p] > 0 ? 'in' : ''}>
                    {r.cells[p] ? eur(r.cells[p]) : '·'}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={PARTIES.length + 1}>No money has moved yet: holds and requests aren’t payments.</td>
            </tr>
          )}
        </tbody>
        {l.rows.length > 1 && (
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {PARTIES.map(p => (
                <td key={p}>{eur(l.totals[p])}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'ledger';
/** What a chapter puts on the stage: the exchange's state, the run for the Ledger tab (the tick and orders shown),
 * and the caption. */
export interface Shown {
  scene: Omit<TubeOpts, 'scale' | 'say'>;
  result?: Run;
  tick?: number;
  ids?: string[];
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the exchange (default) or the ledger, one at a time. The frame darkens at night with the
 * picture; the tab is the reader's view, kept out of saved progress unless the chapter passes `view` and `onView`. */
export function PaymentsStage({
  show,
  view: kept,
  onView,
  say,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the exchange (TUBE_PARTS) */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: TubeOpts = { ...show.scene, say, scale };
  const ledger = view === 'ledger' && show.result;
  return (
    <div className="tc-stage pm-stage" data-night={!ledger && o.night ? '1' : undefined}>
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'ledger'}
          disabled={!show.result}
          onClick={() => setView('ledger')}
        >
          Ledger
        </button>
      </div>
      <div className="tc-frame">
        {ledger ? (
          <LedgerView result={show.result!} t={show.tick ?? TICKS - 1} ids={show.ids} />
        ) : (
          <IsoStage className="tubes" board={TUBE_BOARD} style={FILL} scene={tubeScene(o)} label={tubeLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{tubeReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

/** The clock: a range over the days and nights. */
export function Clock({
  t,
  onTick,
  id,
  max = TICKS - 1,
}: {
  t: number;
  onTick: (t: number) => void;
  id: string;
  max?: number;
}) {
  return (
    <div className="pm-range">
      <label htmlFor={id}>{`Time: ${clock(t)}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={1}
        value={t}
        aria-valuetext={clock(t)}
        onChange={e => onTick(Number(e.target.value))}
      />
    </div>
  );
}

/** A range over one authorisation's hops. */
export function HopSlider({
  i,
  n,
  onHop,
  id,
  label,
}: {
  i: number;
  n: number;
  onHop: (i: number) => void;
  id: string;
  label: string;
}) {
  return (
    <div className="pm-range">
      <label htmlFor={id}>{`Message ${i + 1} of ${n}: ${label}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={n - 1}
        step={1}
        value={i}
        aria-valuetext={`${i + 1} of ${n}: ${label}`}
        onChange={e => onHop(Number(e.target.value))}
      />
    </div>
  );
}

/** A row of chips, one pressed. */
function Chips<T extends string>({
  label,
  values,
  names,
  value,
  onChange,
}: {
  label: string;
  values: readonly T[];
  names: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="pm-row" role="group" aria-label={label}>
      {values.map(v => (
        <button key={v} type="button" className="chip" aria-pressed={value === v} onClick={() => onChange(v)}>
          {names[v]}
        </button>
      ))}
    </div>
  );
}
export const ScaSwitch = (p: { label: string; value: Sca; onChange: (v: Sca) => void }) => (
  <Chips {...p} values={SCAS} names={SCA_NAME} />
);
export const CaptureSwitch = (p: { label: string; value: Capture; onChange: (v: Capture) => void }) => (
  <Chips {...p} values={CAPTURES} names={CAPTURE_NAME} />
);
/** The idempotency key: a native checkbox. */
export function KeySwitch({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="pm-check" htmlFor={id}>
      <input id={id} type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** A cited fact from data/payments/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** One of Larkspur's labelled planning assumptions (R6), in words. */
export const Assumed = ({ k }: { k: keyof typeof ASSUMPTIONS.words }) => (
  <p className="note pm-note">{`Assumed: ${ASSUMPTIONS.words[k]}.`}</p>
);

/** Shown wherever the simulator's money appears (R6). */
export const SimNote = () => (
  <p className="note pm-note">
    A simulated day: Larkspur’s own orders, masked made-up cards and planning-number fees, not anyone’s real prices.
  </p>
);
