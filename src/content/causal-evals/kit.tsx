// Why did it fail? kit: the stage every chapter shares (the marble run, or the replay table, one tab apart), its twin
// control and status line, the run's steps in words, the cited Fact and the toy note. A living scene (KTD2, KTD4,
// KTD6): the run moves between states through useLivingStage, a piece is tapped (or dragged out to the floor pile) in
// the picture through HitLayer, and reveal steps close in. Every string is React text, or escaped (esc) by the scene
// before it becomes SVG.
import { useState, type ReactNode } from 'react';
import Cite from '../../components/story/Cite';
import Select from '../../components/story/Select';
import type { Say } from '../../components/story/steps';
import IsoStage, { PillLayer } from '../../lib/iso/IsoStage';
import HitLayer, { type Hit } from '../../lib/iso/hits';
import { useLivingStage, type SceneView } from '../../lib/iso/motion';
import {
  MARBLE_BOARD,
  PIECES,
  marbleLabel,
  marbleLifted,
  marbleMoves,
  marblePills,
  marbleScene,
  partBox,
  pieceBox,
  piecePiece,
  pileBox,
  type Marble,
  type MarblePart,
  type PieceMode,
} from '../../components/scenes/marbleScene';
import { fact } from '../../lib/causal-evals/facts';
import { replay, tally, touched, type Change, type Outcome, type Run } from '../../lib/causal-evals/runs';
import { useNarrow } from '../tool-calling/kit';
import '../tool-calling/tools.css';
import './causal-evals.css';

/** The module is a living scene: every step carries an end-state line (tests/unit/say-targets.test.ts). */
export const LIVING = true;
/** How long one change of the picture takes (R9). */
export const MOTION_MS = 1200;

const list = (c: Change | Change[]) => (Array.isArray(c) ? c : [c]).filter(x => x !== null);
const modesOf = (c: Change | Change[]): PieceMode[] => {
  const m: PieceMode[] = Array(PIECES).fill('as');
  for (const x of list(c))
    m[x.step] =
      x.kind === 'swap' ? 'swap' : x.kind === 'remove' ? 'gone' : x.kind === 'timeout' && x.retry ? 'retry' : 'fault';
  return m;
};

/**
 * The picture of a run with these changes: after `roll` replays (0: the marble still waits at the top), the last of
 * one marble on the given dice, or (seeds) one marble per seed.
 */
export function marbleOf(
  run: Run,
  change: Change | Change[],
  roll: number,
  o: { lit?: number | null; seeds?: number[]; seed?: number } = {},
): Marble {
  const base: Marble = {
    modes: modesOf(change),
    names: run.steps.map(s => s.name),
    roll,
    rolled: [],
    trays: { right: 0, wrong: 0, none: 0 },
    lit: o.lit ?? null,
  };
  if (!roll) return base;
  if (o.seeds) {
    const t = tally(run, change, o.seeds);
    return {
      ...base,
      rolled: o.seeds.map(sd => replay(run, change, sd).outcome),
      trays: { right: t.right, wrong: t.wrong, none: t.none },
      counts: true,
    };
  }
  const r = replay(run, change, o.seed);
  return {
    ...base,
    rolled: [r.outcome],
    halt: r.halt,
    drop: r.outcome === 'none' ? r.slots.indexOf(null) : null,
    touched: touched(run, r),
    trays: { right: +(r.outcome === 'right'), wrong: +(r.outcome === 'wrong'), none: +(r.outcome === 'none') },
  };
}

/** The end state in one sentence: the visible status line, unless the last action was refused. */
export function statusOf(m: Marble, run: Run): string {
  const out = m.rolled.at(-1);
  if (!out) return 'The marble waits in the start cup.';
  if (out === 'stuck' && m.halt != null)
    return `The marble stopped at piece ${m.halt + 1}, ${run.steps[m.halt].name}: it timed out with no retry.`;
  if (m.counts)
    return `${m.trays.right} of ${m.rolled.length} marbles landed right, ${m.trays.wrong} wrong, ${m.trays.none} in the gutter.`;
  if (out === 'none')
    return `The marble fell out at piece ${(m.drop ?? 0) + 1} into the gutter: ${run.outcomes.none.toLowerCase()}.`;
  return `The marble landed in the ${out} tray: ${out === 'right' ? run.outcomes.right : run.outcomes.wrong}.`;
}

/** What the twin beside the stage offers: a piece to pick, its buttons, and the shared handlers. */
export interface Twin {
  /** the pieces that may be picked (default: all eight) */
  pieces?: number[];
  /** the pieces with a target in the picture (default: `pieces`; 'chosen': only the one picked). Neighbouring
   * pieces sit closer than a 44 px target, so a step offers only the pieces it is about */
  taps?: number[] | 'chosen';
  /** the buttons beside the piece Select; the first is also what a tap on a piece does. Each applies the next state,
   * or returns why it can't */
  buttons: { label: string; act: (piece: number) => string | undefined }[];
  /** a piece dragged onto the floor pile: take it out */
  drop?: (piece: number) => string | undefined;
  /** the start cup (tap it, or the Roll button): roll the marble */
  roll?: { label: string; act: () => string | undefined };
}
/** A row of the Replays tab: what was changed, where the marble landed, over how many replays. */
export interface LogRow {
  change: string;
  outcome: Outcome | string;
  runs: string;
}
/** A change in words, for the Replays tab. */
export function changeLabel(run: Run, c: Change | Change[]): string {
  const xs = list(c);
  if (!xs.length) return 'Nothing changed';
  return xs
    .map(x => {
      const n = `piece ${x.step + 1} (${run.steps[x.step].name})`;
      return x.kind === 'swap'
        ? `Swapped ${n}`
        : x.kind === 'remove'
          ? `Took out ${n}`
          : `Timed out ${n}${x.kind === 'timeout' && x.retry ? ', retry' : ''}`;
    })
    .join('; ');
}
/** One replay, as a Replays-tab row. */
export const logOf = (run: Run, c: Change | Change[], seed?: number): LogRow => ({
  change: changeLabel(run, c),
  outcome: replay(run, c, seed).outcome,
  runs: '1',
});
/** Many replays (fresh dice each), as a Replays-tab row. */
export const logMany = (run: Run, c: Change | Change[], seeds: number[]): LogRow => {
  const t = tally(run, c, seeds);
  return { change: changeLabel(run, c), outcome: `${t.right} right, ${t.wrong} wrong`, runs: String(seeds.length) };
};

type View = 'scene' | 'log';

function LogView({ run, rows }: { run: Run; rows: LogRow[] }) {
  return (
    <figure className="ce-log">
      <table>
        <caption>Replays of “{run.name}”</caption>
        <thead>
          <tr>
            <th scope="col">Change</th>
            <th scope="col">Outcome</th>
            <th scope="col">Replays</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i}>
                <td>{r.change}</td>
                <td className={r.outcome === 'right' ? 'ok' : r.outcome === 'wrong' ? 'bad' : undefined}>
                  {r.outcome}
                </td>
                <td>{r.runs}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>No replays yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </figure>
  );
}

/** The run's steps in words: the request, then what each piece did (or does, swapped). */
export function StepsList({ run, change, lit }: { run: Run; change?: Change | Change[]; lit?: number | null }) {
  const modes = modesOf(change ?? null);
  return (
    <div className="ce-steps">
      <p className="ce-ask">“{run.ask}”</p>
      <ol>
        {run.steps.map((s, i) => (
          <li key={s.id} className={i === lit ? 'lit' : modes[i] !== 'as' ? modes[i] : undefined}>
            <b>{s.name}:</b> {modes[i] === 'swap' ? s.swap : modes[i] === 'gone' ? 'Taken out.' : s.did}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The chapters' stage. `scene` is the picture's state (only fields that change what it draws); `twin` is the control
 * beside the picture, whose handlers the in-picture tap and drag share.
 */
export function MarbleStage({
  run,
  scene,
  twin,
  log = [],
  say,
  closeUp,
}: {
  run: Run;
  scene: Marble;
  twin?: Twin;
  log?: LogRow[];
  say?: Say;
  closeUp?: string[];
}) {
  const phone = useNarrow();
  const [view, setView] = useState<View>('scene');
  const pieces = twin?.pieces ?? [...Array(PIECES).keys()];
  const [pickd, setPick] = useState(pieces[0] ?? 0);
  const [refused, setRefused] = useState<{ why: string; on: Marble } | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const chosen = pieces.includes(pickd) ? pickd : pieces[0];
  const stage = useLivingStage({
    scene: marbleScene,
    state: { ...scene, say, bare: true },
    moves: marbleMoves,
    ms: MOTION_MS,
    board: MARBLE_BOARD,
    closeUp: view === 'scene' ? closeUp : undefined,
    partBox: p => partBox(p as MarblePart),
    phone,
    lift: (s, v) => ({ still: marbleLifted(s, dragged ?? 0, v), piece: () => piecePiece(s, dragged ?? 0) }),
  });
  const s = stage.state;
  const pills = () => marblePills(s, stage.view as SceneView, stage.t < 1 && marbleMoves(stage.prev, s));
  const hits: Hit[] = twin
    ? [
        ...(twin.buttons.length
          ? (twin.taps === 'chosen' ? [chosen] : (twin.taps ?? pieces)).map(i => ({
              part: `p${i + 1}`,
              at: pieceBox(i),
              kind: twin.drop ? ('drag' as const) : ('tap' as const),
            }))
          : []),
        ...(twin.roll ? [{ part: 'start', at: partBox('start'), kind: 'tap' as const }] : []),
        ...(twin.drop ? [{ part: 'pile', at: pileBox(), kind: 'drop' as const }] : []),
      ]
    : [];

  const act = (part: string, to?: string | null) => {
    if (!twin) return;
    let why: string | undefined;
    if (part === 'start' || part === 'roll') why = twin.roll?.act();
    else {
      const i = part.startsWith('p') ? Number(part.slice(1)) - 1 : chosen;
      if (part.startsWith('p')) setPick(i);
      const b = part.startsWith('btn:') ? twin.buttons[Number(part.slice(4))] : twin.buttons[0];
      if (to === null) why = 'Drop the piece on the floor pile to take it out; it went back in its slot.';
      else if (to === 'pile') why = twin.drop?.(i);
      else why = b?.act(i);
    }
    setRefused(why ? { why, on: s } : null);
    return why;
  };
  const status = refused && refused.on === s ? refused.why : statusOf(s, run);

  return (
    <div className="tc-stage ce-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'log'} onClick={() => setView('log')}>
          Replays
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            board={MARBLE_BOARD}
            scene={stage.still}
            moving={stage.moving}
            zoom={stage.zoom}
            label={marbleLabel(s)}
            style={{ height: '100%' }}
          >
            <PillLayer board={MARBLE_BOARD} art={pills} prefix="ce-pill-" />
            {hits.length > 0 && (
              <HitLayer
                board={MARBLE_BOARD}
                hits={hits}
                busy={stage.busy}
                act={act}
                legal={(_, to) => to === 'pile'}
                onDrag={d => {
                  setDragged(d ? Number(d.part.slice(1)) - 1 : null);
                  stage.onDrag(d);
                }}
                pulse={closeUp?.join() ?? `${pieces.join()} ${twin?.buttons.map(b => b.label).join()}`}
              />
            )}
          </IsoStage>
        ) : (
          <LogView run={run} rows={log} />
        )}
      </div>
      {twin && (
        <div className="ce-twin">
          {twin.buttons.length > 0 && (
            <Select value={String(chosen)} onChange={e => setPick(Number(e.target.value))} aria-label="Piece">
              {pieces.map(i => (
                <option key={i} value={String(i)}>
                  {`${i + 1}. ${run.steps[i].name}`}
                </option>
              ))}
            </Select>
          )}
          {twin.buttons.map((b, k) => (
            <button key={b.label} type="button" className="big" onClick={() => act(`btn:${k}`)}>
              {b.label}
            </button>
          ))}
          {twin.roll && (
            <button type="button" className="big" onClick={() => act('roll')}>
              {twin.roll.label}
            </button>
          )}
        </div>
      )}
      {s.lit != null && (
        <p className="ce-did">
          <b>
            Piece {s.lit + 1}, {run.steps[s.lit].name}:
          </b>{' '}
          {s.modes[s.lit] === 'swap' ? run.steps[s.lit].swap : run.steps[s.lit].did}
        </p>
      )}
      <p className="tc-caption ce-status" role="status">
        {status}
      </p>
    </div>
  );
}

/** A cited fact from data/causal-evals/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside the toy's numbers: hand-written runs, made-up parts, a weighted dice roll for the model's pick. */
export const ToyNote = ({ children }: { children?: ReactNode }) => (
  <p className="note">
    A toy run: the steps are hand-written, the parts made up, and a weighted dice roll stands in for the model’s pick.
    {children && <> {children}</>}
  </p>
);
