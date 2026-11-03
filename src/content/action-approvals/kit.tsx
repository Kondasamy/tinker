// Approvals and permissions kit: the stage every chapter shares (the refund office's toll booth, or the table of what
// each slip read and where it went, one tab apart), its twin controls and status line, the cited Fact and the toy
// note. A living scene (KTD2, KTD4, KTD6): the office moves between states through useLivingStage, a letter drags from
// the crate into the in-tray and the waiting hourglass flips in the picture (HitLayer), and reveal steps close in.
// Every string is React text, or escaped (esc) by the scene before it becomes SVG.
import { useState, type ReactNode } from 'react';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import IsoStage, { PillLayer } from '../../lib/iso/IsoStage';
import HitLayer, { type Hit } from '../../lib/iso/hits';
import { useLivingStage, type SceneView } from '../../lib/iso/motion';
import {
  TOLL_BOARD,
  partBox,
  tollLabel,
  tollLifted,
  tollMoves,
  tollPills,
  tollScene,
  topLetter,
  type Toll,
  type TollPart,
  type TollSlip,
} from '../../components/scenes/tollScene';
import { fact } from '../../lib/action-approvals/facts';
import {
  EMPTY,
  FATIGUE,
  PASS_HOURS,
  arrive,
  decide,
  dyedLetter,
  letterOf,
  wait,
  type Desk,
  type Policy,
  type Slip,
} from '../../lib/action-approvals/gate';
import { useNarrow } from '../tool-calling/kit';
import '../tool-calling/tools.css';
import './approvals.css';

/** The module is a living scene: every step carries an end-state line (tests/unit/say-targets.test.ts). */
export const LIVING = true;
/** How long one change of the picture takes (R9). */
export const MOTION_MS = 1000;

/** One thing that happened at the office, in order: a letter delivered, a yes or a no, time passing. */
export type Ev = { l: string } | { yes: boolean } | { wait: number };
/** The office after these events: letters reach the booth at the chapter's clock (the first letter's hour, then
 * whatever waiting added, plus `gap` hours before each later letter). */
export function replay(p: Policy, log: Ev[], gap = 0): Desk {
  let d = EMPTY;
  for (const e of log) {
    if ('l' in e) {
      const l = letterOf(e.l);
      d = arrive(d, l, p, d.slips.length ? d.now + gap : l.hour);
    } else if ('yes' in e) d = decide(d, e.yes);
    else d = wait(d, e.wait);
  }
  return d;
}
export const delivered = (log: Ev[]) => log.flatMap(e => ('l' in e ? [e.l] : []));
export const decided = (log: Ev[]) => log.filter(e => 'yes' in e).length;

const zoneOf = (s: Slip): TollSlip['at'] => (s.fate === 'gate' ? 'gate' : s.fate);
/** The picture of an office: the dye on or off, the letters still in the crate (next first), any slips revealed as
 * harm, and whether the hourglass passes show. The coins show the busiest day's total. */
export function tollOf(
  d: Desk,
  o: {
    p: Policy;
    dye: boolean;
    next: string[];
    bad?: string[];
    lit?: string | null;
    litZoom?: boolean;
    passes?: boolean;
  },
): Toll {
  const last = d.slips.at(-1);
  return {
    dye: o.dye,
    mail: o.next.length,
    mailDyed: o.next.map(id => dyedLetter(letterOf(id))),
    tray: d.slips.map(s => o.dye && s.dyed),
    slips: d.slips.map(s => ({ id: s.id, dyed: o.dye && s.dyed, at: zoneOf(s), bad: o.bad?.includes(s.id) })),
    passes:
      o.passes === false
        ? []
        : d.passes.map(p => ({
            order: p.order,
            sand: o.p.expiry === 'forever' ? 1 : Math.max(0, 1 - (d.now - p.at) / PASS_HOURS),
          })),
    spent: Math.max(0, ...Object.values(d.spent)),
    budget: o.p.budget,
    lit: o.lit,
    litZoom: o.litZoom,
    up: last?.fate === 'paid',
  };
}

/** The end state in one sentence: the visible status line, unless the last action was refused. */
export function statusOf(s: Toll): string {
  const n = (z: TollSlip['at']) => s.slips.filter(x => x.at === z && (x.kind ?? 'refund') === 'refund').length;
  if (s.two) {
    const sum = s.slips.find(x => x.kind === 'summary');
    return sum
      ? 'The reader read the email behind glass; only its violet summary reached Rosa, and no refund was written.'
      : 'The planner holds Rosa’s request; the reader waits behind glass with the mail.';
  }
  if (!s.slips.length) return `${s.mail} letters wait in the crate; nothing has reached the barrier yet.`;
  if (s.slips.some(x => x.at === 'desk'))
    return `${s.slips.filter(x => x.at === 'desk' && x.dyed).length} of the ${s.slips.filter(x => x.at === 'desk').length} things the assistant wrote are violet.`;
  const wait = s.slips.find(x => x.at === 'gate');
  const head = wait
    ? `A ${wait.dyed ? 'violet ' : ''}refund waits at the barrier for Rosa to flip the hourglass`
    : `${n('paid')} paid, ${n('stopped')} stopped`;
  const out = s.passes.filter(p => p.sand <= 0.01).length;
  const passes = s.passes.length ? `, ${s.passes.length} passes on the counter${out ? `, ${out} run out` : ''}` : '';
  const money = s.budget !== null ? `, £${s.spent} of £${s.budget} spent today` : '';
  return `${head}${passes}${money}.`;
}

export interface Row {
  id: string;
  action: string;
  read: string;
  dyed: boolean;
  outcome: string;
}
/** The table's rows for an office: each refund, what the assistant read to write it, dye and what happened. */
export const rowsOf = (d: Desk, dye: boolean): Row[] =>
  d.slips.map(s => {
    const l = letterOf(s.id);
    return {
      id: s.id,
      action: `Refund order ${s.order}, £${s.amount}`,
      read: l.from,
      dyed: dye && s.dyed,
      outcome:
        s.fate === 'gate'
          ? 'Waiting for a yes'
          : s.fate === 'paid'
            ? s.byPass
              ? 'Paid on an earlier yes'
              : s.asked
                ? 'Paid after a yes'
                : 'Paid, nobody asked'
            : s.why === 'budget'
              ? 'Stopped: over the day’s budget'
              : 'Stopped: refused',
    };
  });

/** The second view: the taint table of action, what it read, dye and outcome. */
function TableView({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p className="ap-none">Nothing written yet.</p>;
  return (
    <table className="tc-ledger ap-table">
      <caption>What each action read, and where it went</caption>
      <thead>
        <tr>
          <th scope="col">Action</th>
          <th scope="col">Read</th>
          <th scope="col">Dye</th>
          <th scope="col">Outcome</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} data-row={r.id} data-dyed={r.dyed ? '1' : '0'}>
            <th scope="row">{r.action}</th>
            <td>{r.read}</td>
            <td>{r.dyed ? 'Violet' : 'None'}</td>
            <td>{r.outcome}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const HITS: Hit[] = [
  { part: 'letter', at: partBox('mail'), kind: 'drag' },
  { part: 'tray', at: partBox('tray'), kind: 'drop' },
  { part: 'hourglass', at: partBox('hourglass'), kind: 'tap' },
];
type View = 'scene' | 'table';

/**
 * The chapters' stage. `scene` is the picture's state; `deliver`, `approve` and `refuse` are the handlers the picture
 * and the buttons share: each applies the chapter's next state, or returns why it can't.
 */
export function ApprovalsStage({
  scene,
  rows,
  deliver,
  approve,
  refuse,
  say,
  closeUp,
}: {
  scene: Toll;
  rows: Row[];
  deliver?: () => string | undefined;
  approve?: () => string | undefined;
  refuse?: () => string | undefined;
  say?: Say;
  closeUp?: string[];
}) {
  const phone = useNarrow();
  const [view, setView] = useState<View>('scene');
  const [refused, setRefused] = useState<{ why: string; on: Toll } | null>(null);
  const stage = useLivingStage({
    scene: tollScene,
    state: { ...scene, say },
    moves: tollMoves,
    ms: MOTION_MS,
    board: TOLL_BOARD,
    closeUp: view === 'scene' ? closeUp : undefined,
    partBox: (p, s) => partBox(p as TollPart, s),
    phone,
    lift: s => ({ still: tollLifted(s), piece: topLetter(s) }),
  });
  const s = stage.state;
  // until the motion lands the pills read the state it is moving from (with this step's callout)
  const pills = () =>
    tollPills(stage.t < 1 && tollMoves(stage.prev, s) ? { ...stage.prev, say: s.say } : s, stage.view as SceneView);

  const act = (part: string, to?: string | null) => {
    let why: string | undefined;
    if (part === 'letter') {
      if (to !== undefined && to !== 'tray') why = 'Drop the letter in the in-tray to deliver it.';
      else why = deliver ? deliver() : 'No letter to deliver in this step.';
    } else if (part === 'hourglass') why = approve ? approve() : 'Nothing waits for a yes in this step.';
    else if (part === 'refuse') why = refuse ? refuse() : 'Nothing waits for a no in this step.';
    setRefused(why ? { why, on: s } : null);
    return why;
  };
  const status = refused && refused.on === s ? refused.why : statusOf(s);
  const hits = HITS.filter(h => (h.part === 'hourglass' ? !!approve : !!deliver));

  return (
    <div className="tc-stage ap-stage">
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
            board={TOLL_BOARD}
            scene={stage.still}
            moving={stage.moving}
            zoom={stage.zoom}
            label={tollLabel(s)}
            style={{ height: '100%' }}
          >
            <PillLayer board={TOLL_BOARD} art={pills} prefix="ap-pill-" />
            {hits.length > 0 && (
              <HitLayer
                board={TOLL_BOARD}
                hits={hits}
                busy={stage.busy}
                act={act}
                legal={(_, to) => to === 'tray'}
                onDrag={stage.onDrag}
                pulse={closeUp?.join() ?? `${!!deliver}${!!approve}`}
              />
            )}
          </IsoStage>
        ) : (
          <TableView rows={rows} />
        )}
      </div>
      {(deliver || approve || refuse) && (
        <div className="ap-twin">
          {deliver && (
            <button type="button" className="big" onClick={() => act('letter', 'tray')}>
              Deliver the next letter
            </button>
          )}
          {approve && (
            <button type="button" className="big" onClick={() => act('hourglass')}>
              Approve
            </button>
          )}
          {refuse && (
            <button type="button" className="chip" onClick={() => act('refuse')}>
              Refuse
            </button>
          )}
        </div>
      )}
      <p className="tc-caption ap-status" role="status">
        {status}
      </p>
    </div>
  );
}

/** A cited fact from data/action-approvals/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside the toy's numbers: a hand-written week, hand-set amounts and a hand-set approver. */
export const ToyNote = ({ children }: { children?: ReactNode }) => (
  <p className="note">
    A hand-written example week: the letters, amounts and budget are hand-set, and the approver who reads only {FATIGUE}{' '}
    prompts a day closely is a toy rule.{children && <> {children}</>}
  </p>
);

/** The letter ids of a chapter not yet delivered. */
export const left = (queue: string[], log: Ev[]) => queue.filter(id => !delivered(log).includes(id));
