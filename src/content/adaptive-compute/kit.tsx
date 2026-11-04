// Where the effort goes kit: the stage every chapter shares (the mill yard, or the effort table, one tab apart), its twin
// controls and status line, the cited Fact and the toy note. A living scene (KTD2, KTD4, KTD6): the yard moves between
// states through useLivingStage; in the picture a tap turns a valve wheel one notch and a valve's hose drags onto a
// mill (HitLayer); beside it, one range per valve is the twin. Reveal steps close in. Every string is React text, or
// escaped (esc) by the scene.
import { useState, type ReactNode } from 'react';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import IsoStage, { PillLayer } from '../../lib/iso/IsoStage';
import HitLayer, { type Hit } from '../../lib/iso/hits';
import { type SceneView, useLivingStage } from '../../lib/iso/motion';
import {
  MILL_BOARD,
  type MillYard,
  millLabel,
  millLift,
  millMoves,
  millPills,
  millScene,
  partBox,
} from '../../components/scenes/millScene';
import { fact } from '../../lib/adaptive-compute/facts';
import {
  BUDGET,
  COSTS,
  KINDS,
  KIND_IDS,
  MILLS,
  type Kind,
  type MillId,
  OPTS,
  OPT_NAME,
  type Opt,
  REQUESTS,
  RUN_LABEL,
  type Rules,
  kindOf,
  runDay,
} from '../../lib/adaptive-compute/effort';
import { useNarrow } from '../tool-calling/kit';
import '../tool-calling/tools.css';
import './adaptive-compute.css';

/** The module is a living scene: every step carries an end-state line (tests/unit/say-targets.test.ts). */
export const LIVING = true;
/** How long one change of the picture takes (R9). */
export const MOTION_MS = 1100;

export type Lit = MillYard['lit'];
/** The yard for a day run under these rules (engine → picture). */
export function yardOf(rules: Rules, o: { lit?: Lit; budget?: number; idle?: boolean } = {}): MillYard {
  const budget = o.budget ?? BUDGET,
    // idle: the day hasn't run yet (nothing spent, nothing answered)
    d = runDay(rules, o.idle ? 0 : budget);
  return {
    valves: KINDS.map(k => {
      const b = d.by[k.id];
      return {
        id: k.id,
        short: k.short,
        count: `${b.right}/${b.asked}`,
        to: rules[k.id],
        mark: o.idle ? 'none' : b.answered < b.asked ? 'dry' : b.right === b.asked ? 'right' : 'wrong',
      };
    }),
    spent: d.spent,
    budget,
    dry: !o.idle && d.dry,
    right: d.right,
    total: REQUESTS.length,
    lit: o.lit,
  };
}

/** The end state in one sentence: the visible status line, unless the last action was refused. */
export function statusOf(s: MillYard): string {
  return `${s.right} of ${s.total} answers right; ${s.spent} of ${s.budget} spent${s.dry ? ': the tower ran dry' : ''}.`;
}

/** The effort table (the second view): each kind's valve, its answers right and its share of the bill. */
function TableView({ s }: { s: MillYard }) {
  return (
    <figure className="ac-table">
      <table>
        <caption>Where the effort went</caption>
        <thead>
          <tr>
            <th scope="col">Kind</th>
            <th scope="col">Valve</th>
            <th scope="col">Right</th>
            <th scope="col">Spent</th>
          </tr>
        </thead>
        <tbody>
          {s.valves.map(v => {
            const k = kindOf(v.id as Kind),
              by = runDay({ ...Object.fromEntries(s.valves.map(x => [x.id, x.to])) } as Rules, s.budget).by[k.id];
            return (
              <tr key={v.id} data-lit={s.lit?.valve === v.id ? '1' : undefined}>
                <th scope="row">{k.name}</th>
                <td>{OPT_NAME[v.to]}</td>
                <td>{`${by.right} of ${by.asked}`}</td>
                <td>{by.spent}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">All</th>
            <td>{s.dry ? 'Ran dry' : ''}</td>
            <td>{`${s.right} of ${s.total}`}</td>
            <td>{`${s.spent} of ${s.budget}`}</td>
          </tr>
        </tfoot>
      </table>
    </figure>
  );
}

type View = 'scene' | 'table';
const nextOpt = (o: Opt) => OPTS[(OPTS.indexOf(o) + 1) % OPTS.length];

/**
 * The chapters' stage. `yard` is the picture's state; `turn` (a valve tapped or its hose dropped on a mill, or a
 * range moved) is the handler the picture and the twin share: it applies the chapter's next state, or returns why it
 * can't. `kinds` are the valves the twin offers in this step (default: none). `children` are other twin buttons.
 */
export function EffortStage({
  yard,
  turn,
  kinds = [],
  say,
  closeUp,
  children,
}: {
  yard: MillYard;
  turn?: (kind: Kind, to: Opt) => string | undefined;
  kinds?: Kind[];
  say?: Say;
  closeUp?: string[];
  children?: ReactNode;
}) {
  const phone = useNarrow();
  const [view, setView] = useState<View>('scene');
  const [refused, setRefused] = useState<{ why: string; on: MillYard } | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);
  const stage = useLivingStage({
    scene: millScene,
    state: { ...yard, say },
    moves: millMoves,
    ms: MOTION_MS,
    board: MILL_BOARD,
    closeUp: view === 'scene' ? closeUp : undefined,
    partBox: (p, s) => partBox(p, s),
    phone,
    lift: (s, v) => millLift(s, v, lifted ?? ''),
  });
  const s = stage.state;
  const hits: Hit[] = [
    ...KIND_IDS.map(k => ({ part: `valve:${k}`, at: partBox(`valve:${k}`, s), kind: 'drag' as const })),
    ...MILLS.map(m => ({ part: `mill:${m}`, at: partBox(m), kind: 'drop' as const })),
  ];
  const say1 = (why: string | undefined) => {
    setRefused(why ? { why, on: s } : null);
    return why;
  };
  const act = (part: string, to?: string | null) => {
    if (!part.startsWith('valve:')) return;
    const k = part.slice(6) as Kind,
      now = s.valves.find(v => v.id === k)?.to ?? 'straight';
    if (!turn) return say1('Nothing to turn in this step; use the buttons in the story.');
    if (to === null) return say1(`Drop the ${kindOf(k).name.toLowerCase()} hose on a mill; it went back to its valve.`);
    const o = to === undefined ? nextOpt(now) : (to.replace(/^mill:/, '') as Opt);
    return say1(turn(k, o));
  };
  const status = refused && refused.on === s ? refused.why : statusOf(s);
  const shown = kinds.length > 0 && !!turn;

  return (
    <div className="tc-stage ac-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'table'} onClick={() => setView('table')}>
          Table
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            board={MILL_BOARD}
            scene={stage.still}
            moving={stage.moving}
            zoom={stage.zoom}
            label={millLabel(s)}
            style={{ height: '100%' }}
          >
            <PillLayer
              board={MILL_BOARD}
              art={() => millPills(s, stage.view as SceneView, stage.t < 1 && millMoves(stage.prev, s))}
              prefix="ac-pill-"
            />
            {turn && (
              <HitLayer
                board={MILL_BOARD}
                hits={hits}
                busy={stage.busy}
                act={act}
                legal={(_, to) => to.startsWith('mill:')}
                onDrag={d => {
                  setLifted(d ? d.part.slice(6) : null);
                  stage.onDrag(d);
                }}
                pulse={kinds.join()}
              />
            )}
          </IsoStage>
        ) : (
          <TableView s={s} />
        )}
      </div>
      {/* the twin row keeps its height when a step has nothing to turn, so the picture is the same size everywhere */}
      {!(shown || children) && <div className="ac-twin" aria-hidden="true" />}
      {(shown || children) && (
        <div className="ac-twin" data-many={kinds.length > 1 ? '' : undefined}>
          {shown &&
            kinds.map(k => {
              const now = s.valves.find(v => v.id === k)?.to ?? 'straight',
                id = `ac-valve-${k}`;
              return (
                <div className="ac-valve" key={k}>
                  <label htmlFor={id}>{kinds.length > 1 ? kindOf(k).name : `${kindOf(k).name} valve`}</label>
                  <input
                    id={id}
                    type="range"
                    min={0}
                    max={OPTS.length - 1}
                    step={1}
                    value={OPTS.indexOf(now)}
                    aria-label={`${kindOf(k).name} valve`}
                    aria-valuetext={OPT_NAME[now]}
                    onChange={e => act(`valve:${k}`, `mill:${OPTS[+e.target.value]}`)}
                  />
                  <output htmlFor={id}>{OPT_NAME[now]}</output>
                </div>
              );
            })}
          {children}
        </div>
      )}
      <p className="tc-caption ac-status" role="status">
        {status}
      </p>
    </div>
  );
}

/** The one turn handler most steps use: only the named valve, to a goal or anywhere. */
export const turnOnly =
  (kind: Kind, set: (k: Kind, o: Opt) => void) =>
  (k: Kind, o: Opt): string | undefined => {
    if (k !== kind) return `This step turns the ${kindOf(kind).name.toLowerCase()} valve.`;
    set(k, o);
    return undefined;
  };

/** A cited fact from data/adaptive-compute/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside the toy yard: a hand-written day, hand-set outcomes, toy units of effort. */
export const ToyNote = ({ children }: { children?: ReactNode }) => (
  <p className="note">
    {RUN_LABEL} Costs are toy units: a straight answer costs {COSTS.straight}, thinking longer {COSTS.think}, the big
    model {COSTS.big}.{children && <> {children}</>}
  </p>
);

export const MILL_NAMES: Record<MillId, string> = {
  think: 'thinking wheel',
  lookup: 'library wheel',
  check: 'checking sieve',
  big: 'big model',
};
