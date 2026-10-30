// Pieces the Choosing a model chapters share: the stage (the market hall's steelyard, or the Scores tab: one row per
// machine, read off the same weighing), slide the poise weights (KTD8: one native range per criterion, one polite
// read-out of where the beam now tips), cited facts and the hand-set note. Every string is React text here; the
// drawing escapes its pills (esc).
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import type { ModelState } from '../../lib/iso/figures';
import {
  STEELYARD_BOARD,
  POISE,
  aimOf,
  steelyardLabel,
  steelyardScene,
  type SteelyardOpts,
} from '../../components/scenes/steelyardScene';
import { IDS, NOTE, type MachineId, type Source } from '../../lib/choosing-models/machines';
import { qualityText } from '../../lib/choosing-models/story';
import { money, secs } from '../../lib/choosing-models/price';
import {
  CRITERIA,
  MAX_WEIGHT,
  rowsOf,
  tiltOf,
  weigh,
  type Criterion,
  type Row,
  type Weights,
} from '../../lib/choosing-models/score';
import { fact } from '../../lib/choosing-models/facts';
import { useNarrow } from '../tool-calling/kit';
import { useReduced } from '../releases/kit';
import './choosing-models.css';

export const NAMES: Record<Criterion, string> = { quality: 'Quality', cost: 'Cost', wait: 'Wait' };
export const NONE: Weights = { quality: 0, cost: 0, wait: 0 };

/** A still of the hall: `source`'s machines weighed at `w` with those under the bar left out (home, share images). */
export function hallOf(source: Source, w: Weights, rest: Partial<SteelyardOpts> = {}): Omit<SteelyardOpts, 'scale'> {
  const { winner, lead } = weigh(inPlay(rowsOf(source), rest.out), w);
  return {
    aim: aimOf(winner),
    tilt: tiltOf(lead, winner),
    winner,
    weights: w,
    pills: qualityText(source).pills,
    states: winner ? { [winner]: 'ok' } : {},
    ...rest,
  };
}

/** The rows the steelyard weighs: every machine not under the bar. */
export const inPlay = (rows: Row[], out?: MachineId[]) => rows.filter(r => !out?.includes(r.id));

/** Where the beam tips, in words: the read-out. */
export function tipText(rows: Row[], w: Weights) {
  const { winner } = weigh(rows, w),
    set = CRITERIA.map(k => `${NAMES[k].toLowerCase()} ${w[k]}`).join(', ');
  return winner ? `Tips to Machine ${winner} (${set}).` : `Level: a tie (${set}).`;
}

// ---- slide the poise weights ----

/** One native range per criterion, 0 to 4 notches; `only` limits which the chapter opens. */
export function PoiseRanges({
  weights,
  only = CRITERIA,
  onWeights,
}: {
  weights: Weights;
  only?: readonly Criterion[];
  onWeights: (w: Weights) => void;
}) {
  const id = `cm${useId().replace(/[^\w-]/g, '')}`;
  return (
    <div className="cm-ranges">
      {only.map(k => (
        <div key={k} className={`cm-range cm-${k}`}>
          <label htmlFor={`${id}${k}`}>
            <span className="cm-swatch" aria-hidden="true" style={{ background: POISE[k].l }} /> {NAMES[k]}
          </label>
          <input
            id={`${id}${k}`}
            type="range"
            min={0}
            max={MAX_WEIGHT}
            step={1}
            value={weights[k]}
            aria-valuetext={`${NAMES[k]} weight ${weights[k]} of ${MAX_WEIGHT}`}
            onChange={e => onWeights({ ...weights, [k]: Number(e.currentTarget.value) })}
          />
          <span className="cm-num" aria-hidden="true">
            {weights[k]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---- the Scores tab ----

function Scores({
  rows,
  w,
  quality,
  out,
}: {
  rows: Row[];
  w: Weights;
  quality: { name: string; text: Record<MachineId, string> };
  out?: MachineId[];
}) {
  const { scores, winner } = weigh(inPlay(rows, out), w);
  return (
    // it scrolls on short frames, so it takes focus for keyboard scrolling (axe: scrollable-region-focusable)
    <div className="cm-scores" role="group" aria-label="Scores per machine" tabIndex={0}>
      <table className="tc-ledger">
        <caption>Hand-set numbers, per machine</caption>
        <thead>
          <tr>
            <th scope="col">Machine</th>
            <th scope="col">{quality.name}</th>
            <th scope="col">Per 1,000 answers</th>
            <th scope="col">First word</th>
            <th scope="col">Whole reply</th>
            <th scope="col">Weighed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} data-machine={r.id} data-win={r.id === winner ? 1 : 0}>
              <th scope="row">
                {`Machine ${r.id}`}
                {r.id === winner && <span className="stamp correct">PICK</span>}
                {out?.includes(r.id) && <span className="stamp wrong">UNDER BAR</span>}
              </th>
              <td>{quality.text[r.id]}</td>
              <td>{money(r.price)}</td>
              <td>{secs(r.first)}</td>
              <td>{secs(r.wait)}</td>
              <td>{r.id in scores ? scores[r.id].toFixed(1) : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'scores';
const FILL = { height: '100%' };
const SWING_MS = 500,
  SWING_TICKS = 10;

/** The chapters' stage: the steelyard (default) or the Scores tab, both read off the same weighing; the poise ranges
 * under the frame when the chapter opens them, and one polite read-out of where the beam tips after each move. */
export function SteelyardStage({
  rows,
  weights,
  onWeights,
  only,
  quality,
  pills,
  states,
  out,
  say,
  caption,
  view: kept,
  onView,
  step,
  children,
}: {
  rows: Row[];
  weights: Weights;
  /** none: the ranges are hidden (a step that only reads the picture) */
  onWeights?: (w: Weights) => void;
  only?: readonly Criterion[];
  /** the quality column's name and each machine's quality in the chapter's terms */
  quality: { name: string; text: Record<MachineId, string> };
  /** each machine's pill on desktop; phones show its letter */
  pills?: Record<MachineId, string>;
  states?: Partial<Record<MachineId, ModelState>>;
  out?: MachineId[];
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
  const live = inPlay(rows, out),
    { winner, lead } = weigh(live, weights);
  const aim = aimOf(winner),
    tilt = tiltOf(lead, winner);
  // the swing: from where the beam hung to where it now tips, in a few ticks; at once with reduced motion
  const [shown, setShown] = useState({ aim, tilt });
  const from = useRef(shown);
  from.current = shown;
  useEffect(() => {
    if (reduced) {
      setShown({ aim, tilt });
      return;
    }
    const a = from.current;
    let k = 0;
    const t = setInterval(() => {
      k++;
      const f = k / SWING_TICKS;
      setShown({ aim: a.aim + (aim - a.aim) * f, tilt: a.tilt + (tilt - a.tilt) * f });
      if (k >= SWING_TICKS) clearInterval(t);
    }, SWING_MS / SWING_TICKS);
    return () => clearInterval(t);
  }, [aim, tilt, reduced]);
  const [said, setSaid] = useState('');
  useEffect(() => setSaid(''), [step]);
  const move = (w: Weights) => {
    onWeights?.(w);
    setSaid(tipText(live, w));
  };
  const o: SteelyardOpts = {
    aim: reduced ? aim : shown.aim,
    tilt: reduced ? tilt : shown.tilt,
    winner,
    weights,
    pills: narrow || !pills ? { A: 'A', B: 'B', C: 'C' } : pills,
    states: states ?? (winner ? { [winner]: 'ok' } : {}),
    out,
    scale: narrow ? 2 : 1.2,
    say,
  };
  return (
    <div className="tc-stage cm-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'scores'} onClick={() => setView('scores')}>
          Scores
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scores' ? (
          <Scores rows={rows} w={weights} quality={quality} out={out} />
        ) : (
          <IsoStage
            className="cm-hall"
            board={STEELYARD_BOARD}
            style={FILL}
            scene={steelyardScene(o)}
            label={steelyardLabel(o)}
          />
        )}
      </div>
      {onWeights && <PoiseRanges weights={weights} only={only} onWeights={move} />}
      <p className="cm-said" role="status" aria-live="polite">
        {said}
      </p>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
        {narrow && <span className="cm-counts">{IDS.map(id => `${id} ${quality.text[id]}`).join(' · ')}</span>}
      </p>
    </div>
  );
}

/** A cited fact from data/choosing-models/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the machines show (R6, R13). */
export const MachinesNote = () => <p className="note cm-note">{NOTE}</p>;
