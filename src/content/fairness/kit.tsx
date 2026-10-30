// Pieces the fairness chapters share: the stage (the sorting gate, or the Bars tab: each region's error rates and
// precision side by side), slide-the-bar (KTD10: one native range per lane, linked until chapter 5, with one polite
// read-out of the new split), cited facts and the made-up-applicants note. Every string is React text here; the
// drawing escapes its pills (esc).
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import { GATE_BOARD, gateLabel, gateScene, type GateOpts } from '../../components/scenes/gateScene';
import { FEATURE_SETS, ITERS, type Features, type Fix } from '../../lib/fairness/fit';
import type { Bars, Measured, Rates } from '../../lib/fairness/metrics';
import type { Region } from '../../lib/fairness/population';
import { APPLICANTS, APPLICANTS_NOTE, BARS, REGION_NAMES, runOf, SHARED } from '../../lib/fairness/story';
import { fact } from '../../lib/fairness/facts';
import { useNarrow } from '../tool-calling/kit';
import { useReduced } from '../releases/kit';
import './fairness.css';

export const REGIONS: Region[] = ['A', 'B'];
/** Each region's marker on its post, also used wherever the region is named beside a bar: never colour alone. */
export const MARK: Record<Region, string> = { A: '●', B: '■' };
export const START_BARS: Bars = { A: SHARED, B: SHARED };

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const bar2 = (b: number) => b.toFixed(2);

/** The gate's lanes for a run. */
export const lanesOf = (m: Measured, bars: Bars): GateOpts['lanes'] => ({
  A: { counts: m.A, bar: bars.A },
  B: { counts: m.B, bar: bars.B },
});

/** One region's split in words: approved, and the share of those who repaid that were turned down. */
const laneText = (r: Region, x: Rates, bar: number) =>
  `${REGION_NAMES[r]} at ${bar2(bar)}: ${x.tp + x.fp} of ${x.n} approved, ${x.fn} wrongly turned down (${pct(x.falseDecline)})`;
/** The read-out: both lanes' split. */
export const splitText = (m: Measured, bars: Bars) => `${laneText('A', m.A, bars.A)}. ${laneText('B', m.B, bars.B)}.`;

// ---- the Bars tab ----

const METRICS: { key: 'falseDecline' | 'falseApprove' | 'error' | 'precision'; name: string }[] = [
  { key: 'falseDecline', name: 'Turned down, would have repaid' },
  { key: 'falseApprove', name: 'Approved, didn’t repay' },
  { key: 'error', name: 'Wrong decisions' },
  { key: 'precision', name: 'Approved who repaid' },
];
/** Each measure as a pair of bars, one per region, its marker and name beside it and its value written out. */
function GroupBars({ m }: { m: Measured }) {
  return (
    // it scrolls on short frames, so it takes focus for keyboard scrolling (axe: scrollable-region-focusable)
    <div className="fr-bars" role="group" aria-label="Error rates by region" tabIndex={0}>
      {METRICS.map(({ key, name }) => (
        <figure key={key} className="fr-metric" data-metric={key}>
          <figcaption>{name}</figcaption>
          {REGIONS.map(r => {
            const v = m[r][key];
            return (
              <div key={r} className={`fr-row fr-${r.toLowerCase()}`} data-region={r}>
                <span className="fr-who">
                  <span aria-hidden="true">{MARK[r]}</span> {REGION_NAMES[r]}
                </span>
                <span className="fr-track">
                  <span className="fr-fill" style={{ width: `${(v ?? 0) * 100}%` }} />
                </span>
                <span className="fr-val">{v === null ? 'none approved' : pct(v)}</span>
              </div>
            );
          })}
        </figure>
      ))}
    </div>
  );
}

// ---- slide the bar ----

/** One native range per lane over `list`. Linked, moving either moves both. Each move's new split goes to the one
 * read-out (the parent's). */
export function BarRanges({
  bars,
  list = BARS,
  linked,
  onBars,
}: {
  bars: Bars;
  list?: readonly number[];
  linked: boolean;
  onBars: (b: Bars) => void;
}) {
  const id = `fr${useId().replace(/[^\w-]/g, '')}`;
  const set = (r: Region, v: number) => onBars(linked ? { A: v, B: v } : { ...bars, [r]: v });
  return (
    <div className="fr-ranges" data-linked={linked ? 1 : 0}>
      {REGIONS.map(r => {
        const i = Math.max(0, list.indexOf(bars[r]));
        return (
          <div key={r} className={`fr-range fr-${r.toLowerCase()}`}>
            <label htmlFor={`${id}${r}`}>
              <span aria-hidden="true">{MARK[r]}</span> {REGION_NAMES[r]} bar
            </label>
            <input
              id={`${id}${r}`}
              type="range"
              min={0}
              max={list.length - 1}
              step={1}
              value={i}
              aria-valuetext={`approve at ${bar2(bars[r])} or more${linked ? ', both lanes' : ''}`}
              onChange={e => set(r, list[Number(e.currentTarget.value)])}
            />
            <span className="fr-num" aria-hidden="true">
              {bar2(bars[r])}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'bars';
const FILL = { height: '100%' };
/** How long the applicants take to walk through the gate when the stage opens, and its ticks. */
const WALK_MS = 1200,
  WALK_TICKS = 12;

/** The chapters' stage: the sorting gate (default) or the Bars tab, one at a time, both read off the same run; the
 * bar ranges under the frame, and one polite read-out of each new split. `step` clears the read-out when it changes. */
export function GateStage({
  features = 'all',
  fix = 'none',
  bars,
  onBars,
  linked,
  list,
  say,
  caption,
  view: kept,
  onView,
  step,
  children,
}: {
  features?: Features;
  fix?: Fix;
  bars: Bars;
  /** none: the ranges are hidden (a step that only reads the picture) */
  onBars?: (b: Bars) => void;
  linked: boolean;
  list?: readonly number[];
  say?: Say;
  caption: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  step?: string | number;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const narrow = useNarrow(),
    reduced = useReduced();
  const m = runOf(features, fix, bars);
  const [said, setSaid] = useState('');
  // the walk-through: from the queue to the final split once when the stage opens; at once with reduced motion
  const [through, setThrough] = useState(0);
  const latest = useRef({ m, bars });
  latest.current = { m, bars };
  useEffect(() => {
    if (reduced) {
      setThrough(1);
      return;
    }
    let k = 0;
    const t = setInterval(() => {
      k++;
      setThrough(k / WALK_TICKS);
      if (k >= WALK_TICKS) {
        clearInterval(t);
        setSaid(splitText(latest.current.m, latest.current.bars));
      }
    }, WALK_MS / WALK_TICKS);
    return () => clearInterval(t);
  }, [reduced]);
  useEffect(() => setSaid(''), [step]);
  const move = (b: Bars) => {
    onBars?.(b);
    setSaid(splitText(runOf(features, fix, b), b));
  };
  const o: GateOpts = {
    lanes: lanesOf(m, bars),
    names: REGION_NAMES,
    through: reduced ? 1 : through,
    scale: narrow ? 2 : 1.2,
    say,
  };
  return (
    <div className="tc-stage fr-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'bars'} onClick={() => setView('bars')}>
          Bars
        </button>
      </div>
      <div className="tc-frame">
        {view === 'bars' ? (
          <GroupBars m={m} />
        ) : (
          <IsoStage className="fr-gate" board={GATE_BOARD} style={FILL} scene={gateScene(o)} label={gateLabel(o)} />
        )}
      </div>
      {onBars && <BarRanges bars={bars} list={list} linked={linked} onBars={move} />}
      <p className="fr-said" role="status" aria-live="polite">
        {said}
      </p>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
        {narrow && (
          <span className="fr-counts">
            {REGIONS.map(r => `${REGION_NAMES[r]} ${m[r].tp + m[r].fp} in · ${m[r].fn} wrongly out`).join('; ')}
          </span>
        )}
      </p>
    </div>
  );
}

/** A cited fact from data/fairness/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the applicants show (R6, R13). */
export const ApplicantsNote = () => <p className="note fr-note">{APPLICANTS_NOTE}</p>;

/** The fields the check may read, in words. */
export const FIELD_NAMES: Record<Features, string> = {
  all: 'Every field',
  'no-region': 'No region',
  neither: 'No region or postcode',
};
/** One radio per field set (chapter 4 and the workbench). */
export function FieldPick({ value, onPick }: { value: Features; onPick: (f: Features) => void }) {
  return (
    <fieldset className="fr-pick">
      <legend>Fields the check reads</legend>
      {FEATURE_SETS.map(f => (
        <label key={f}>
          <input type="radio" name="fr-fields" checked={value === f} onChange={() => onPick(f)} />
          {FIELD_NAMES[f]}
        </label>
      ))}
    </fieldset>
  );
}

/** The fold-away note on how the numbers were made: no applicants kept aside for testing. */
export const Caveat = () => (
  <details className="fr-maths">
    <summary>How these numbers were made</summary>
    <p>
      {`The check is a simple scoring formula (a logistic regression) that learned in ${ITERS.toLocaleString('en-US')} rounds from the ${APPLICANTS.length} hand-made applicants. Every rate here is measured on those same ${APPLICANTS.length}: none were kept aside for testing, so rates on new applicants could differ.`}
    </p>
  </details>
);
