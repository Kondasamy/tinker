// Pieces the labelling chapters share: the stage (the sorting room, or the Matrix tab: the agreement matrix between two
// labellers with agreement, luck and kappa), the sort-the-ticket control (KTD10: five pigeonhole buttons, number keys
// 1–5 while it has focus, one polite read-out), the labellers' picks and tallies read off the frozen labels, and cited
// facts. Every string is React text here; the drawing escapes its pills (esc).
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import Cite from '../../components/story/Cite';
import { RACK_BOARD, rackLabel, rackScene, type RackOpts } from '../../components/scenes/pigeonholeScene';
import { agreement, chance, kappa, matrix } from '../../lib/labelling/agree';
import { fact } from '../../lib/labelling/facts';
import {
  INTENT_IDS,
  INTENTS,
  type Intent,
  type LabellerId,
  LABELLERS,
  labellerOf,
  labelsOf,
  type Ticket,
  indexOf,
  nameOf,
  POOL,
} from '../../lib/labelling/story';
import { useNarrow } from '../tool-calling/kit';
import './labelling.css';

const PEOPLE = LABELLERS.map(l => l.id);
/** Each labeller's pick for one ticket, before chapter 3's guideline or after it. */
export const picksOf = (id: string, guided = true, who: readonly LabellerId[] = PEOPLE) =>
  Object.fromEntries(who.map(l => [l, labelsOf(l, guided)[indexOf(id)]])) as Record<LabellerId, Intent>;
/** The slips in each hole after the labellers have sorted these tickets. */
export function tallyOf(ids: readonly string[], guided = true, who: readonly LabellerId[] = PEOPLE) {
  const out = Object.fromEntries(INTENT_IDS.map(i => [i, 0])) as Record<Intent, number>;
  for (const id of ids) for (const p of Object.values(picksOf(id, guided, who))) out[p]++;
  return out;
}

/** With reduced motion, slips appear in their holes without the drop. */
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

// ---- the Matrix tab ----

export type Pair = [LabellerId, LabellerId];
export const PAIRS: Pair[] = [
  ['rosa', 'mira'],
  ['rosa', 'tom'],
  ['mira', 'tom'],
];
const same = (a: Pair, b: Pair) => a[0] === b[0] && a[1] === b[1];
const two = (x: number) => x.toFixed(2);
export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The agreement matrix between two labellers over the tickets: rows one, columns the other, the diagonal outlined
 * (where they agree), then agreement, chance agreement and Cohen's kappa. */
export function AgreementMatrix({
  pair,
  onPair,
  guided = true,
  tickets = POOL,
}: {
  pair: Pair;
  onPair?: (p: Pair) => void;
  guided?: boolean;
  tickets?: readonly Ticket[];
}) {
  const [a, b] = pair.map(l => {
    const all = labelsOf(l, guided);
    return tickets.map(t => all[indexOf(t.id)]);
  });
  const m = matrix(a, b, INTENT_IDS),
    [na, nb] = pair.map(l => labellerOf(l).name);
  return (
    <div className="lb-matrix">
      {onPair && (
        <div className="lb-pairs" role="group" aria-label="Which two labellers">
          {PAIRS.map(p => (
            <button
              key={p.join()}
              type="button"
              className="chip"
              aria-pressed={same(p, pair)}
              onClick={() => onPair(p)}
            >
              {`${labellerOf(p[0]).name} · ${labellerOf(p[1]).name}`}
            </button>
          ))}
        </div>
      )}
      <table>
        <caption>{`${na} down, ${nb} across, ${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr">{`${na} \\ ${nb}`}</span>
            </th>
            {INTENTS.map(i => (
              <th key={i.id} scope="col">
                {i.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INTENTS.map((r, i) => (
            <tr key={r.id}>
              <th scope="row">{r.name}</th>
              {m[i].map((c, j) => (
                <td key={INTENTS[j].id} className={i === j ? 'agree' : c ? 'off' : 'zero'}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="lb-stats">
        <div>
          <dt>Agree</dt>
          <dd>{pct(agreement(a, b))}</dd>
        </div>
        <div>
          <dt>By luck</dt>
          <dd>{pct(chance(a, b))}</dd>
        </div>
        <div>
          <dt>Kappa</dt>
          <dd data-kappa={kappa(a, b)}>{two(kappa(a, b))}</dd>
        </div>
      </dl>
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'matrix';
const FILL = { height: '100%' };
/** The chapters' stage: the sorting room (default) or the Matrix tab, one at a time. `children` go under the frame
 * (the sort control). */
export function RackStage({
  rack,
  caption,
  pair: keptPair,
  onPair,
  guided = true,
  tickets,
  view: kept,
  onView,
  children,
}: {
  rack: Omit<RackOpts, 'scale' | 'drop'> & { drop?: boolean };
  caption: ReactNode;
  pair?: Pair;
  onPair?: (p: Pair) => void;
  guided?: boolean;
  tickets?: readonly Ticket[];
  view?: View;
  onView?: (v: View) => void;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const [ownPair, setOwnPair] = useState<Pair>(PAIRS[0]);
  const narrow = useNarrow(),
    reduced = useReduced();
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const o: RackOpts = { ...rack, drop: !!rack.drop && !reduced, scale: narrow ? 2 : 1.2 };
  return (
    <div className="tc-stage lb-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'matrix'} onClick={() => setView('matrix')}>
          Matrix
        </button>
      </div>
      <div className="tc-frame">
        {view === 'matrix' ? (
          <AgreementMatrix pair={keptPair ?? ownPair} onPair={onPair ?? setOwnPair} guided={guided} tickets={tickets} />
        ) : (
          <IsoStage className="lb-room" board={RACK_BOARD} style={FILL} scene={rackScene(o)} label={rackLabel(o)} />
        )}
      </div>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
    </div>
  );
}

// ---- sort the ticket ----

/** What the read-out says once a ticket is filed: the reader's hole, then each labeller's. */
export const filedLine = (mine: Intent, picks: Partial<Record<LabellerId, Intent>>) =>
  [
    `You filed it under ${nameOf(mine)}.`,
    ...Object.entries(picks).map(([l, p]) => `${labellerOf(l as LabellerId).name}: ${nameOf(p)}.`),
  ].join(' ');

/** The ticket and the five pigeonhole buttons. A click, or a number key 1–5 while the control has focus, files it;
 * the one polite read-out says where it went and each labeller's pick, and clears when the ticket changes. */
export function SortTicket({
  ticket,
  filed,
  picks = {},
  onFile,
  locked = !!filed,
}: {
  ticket: Ticket;
  /** the reader's pick for this ticket, once filed */
  filed?: Intent | null;
  /** the labellers' picks, shown once the reader has filed */
  picks?: Partial<Record<LabellerId, Intent>>;
  onFile: (i: Intent) => void;
  /** a filed ticket can't be refiled (predict, then reveal) */
  locked?: boolean;
}) {
  const file = (i: Intent) => {
    if (!locked) onFile(i);
  };
  const key = (e: KeyboardEvent) => {
    const k = Number(e.key);
    if (!Number.isInteger(k) || k < 1 || k > INTENTS.length || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    file(INTENTS[k - 1].id);
  };
  return (
    <div className="lb-sort" role="group" aria-label="Sort the ticket" tabIndex={-1} onKeyDown={key}>
      <blockquote className="lb-ticket" data-gold={ticket.gold ? '1' : undefined}>
        {ticket.gold && <span className="lb-star">Gold ticket</span>}
        {ticket.text}
      </blockquote>
      <div className="lb-holes">
        {INTENTS.map((i, k) => (
          <button
            key={i.id}
            type="button"
            className="chip"
            aria-pressed={filed === i.id}
            aria-keyshortcuts={String(k + 1)}
            disabled={locked && filed !== i.id}
            onClick={() => file(i.id)}
          >
            <kbd>{k + 1}</kbd> {i.name}
          </button>
        ))}
      </div>
      <p className="lb-said" role="status" aria-live="polite">
        {filed ? filedLine(filed, picks) : ''}
      </p>
    </div>
  );
}

/** The room and the sort control wired together over a run of tickets: file one, see the three picks drop, then Next
 * ticket; the holes keep the tally of every ticket filed so far. */
export function SortRoom({
  tickets,
  guided = true,
  caption,
  onFile,
}: {
  tickets: readonly Ticket[];
  guided?: boolean;
  caption: ReactNode;
  onFile?: (id: string, i: Intent) => void;
}) {
  const [at, setAt] = useState(0);
  const [filed, setFiled] = useState<Intent | null>(null);
  const t = tickets[Math.min(at, tickets.length - 1)];
  const picks = filed ? picksOf(t.id, guided) : undefined,
    before = tickets.slice(0, at).map(x => x.id),
    done = filed ? [...before, t.id] : before;
  return (
    <RackStage
      rack={{
        ticket: t,
        picks,
        mine: filed,
        tally: tallyOf(before, guided),
        gold: tickets.filter((x, k) => x.gold && k > at).length,
        drop: !!filed,
      }}
      caption={caption}
      guided={guided}
      tickets={tickets.slice(0, Math.max(1, done.length))}
    >
      <SortTicket
        ticket={t}
        filed={filed}
        picks={picks}
        onFile={i => {
          setFiled(i);
          onFile?.(t.id, i);
        }}
      />
      {filed && at < tickets.length - 1 && (
        <button
          type="button"
          className="chip lb-next"
          onClick={() => {
            setAt(at + 1);
            setFiled(null);
          }}
        >
          Next ticket
        </button>
      )}
    </RackStage>
  );
}

// ---- what the chapters share ----

const NAMES = LABELLERS.map(l => l.name);
/** Shown wherever the labels show (R6): the tickets and the people's labels are stand-ins. */
export const StandInNote = () => (
  <p className="note lb-note">
    {`Hand-written stand-in tickets, not real customers. ${NAMES.slice(0, -1).join(', ')} and ${NAMES.at(-1)}’s labels are simulated from each one’s set habits; they are not real people.`}
  </p>
);

/** The optional maths, folded away: no formula ever sits in the narration. */
export const Maths = ({ children }: { children: ReactNode }) => (
  <details className="lb-maths">
    <summary>The maths</summary>
    {children}
  </details>
);

/** A run of tickets sorted one at a time, kept in a chapter's state: where the reader is, what they filed, how many. */
export interface Run {
  at: number;
  filed: Intent | null;
  count: number;
}
export const RUN0: Run = { at: 0, filed: null, count: 0 };

/** The room for a run: this ticket on the table, its picks once filed, earlier tickets' slips in the tally. */
export function runRack(tickets: readonly Ticket[], r: Run, guided = true): Parameters<typeof RackStage>[0]['rack'] {
  const t = tickets[Math.min(r.at, tickets.length - 1)];
  return {
    ticket: t,
    picks: r.filed ? picksOf(t.id, guided) : undefined,
    mine: r.filed,
    tally: tallyOf(
      tickets.slice(0, r.at).map(x => x.id),
      guided,
    ),
    drop: !!r.filed,
  };
}

/** The sort control over a run: file this ticket, then Next ticket. Filing counts; moving on doesn't. */
export function SortRun({
  tickets,
  run,
  guided = true,
  onFile,
  onNext,
}: {
  tickets: readonly Ticket[];
  run: Run;
  guided?: boolean;
  onFile: (r: Run) => void;
  onNext: (r: Run) => void;
}) {
  const t = tickets[Math.min(run.at, tickets.length - 1)];
  return (
    <>
      <SortTicket
        ticket={t}
        filed={run.filed}
        picks={run.filed ? picksOf(t.id, guided) : undefined}
        onFile={i => onFile({ ...run, filed: i, count: run.count + 1 })}
      />
      {run.filed && run.at < tickets.length - 1 && (
        <button type="button" className="chip lb-next" onClick={() => onNext({ ...run, at: run.at + 1, filed: null })}>
          Next ticket
        </button>
      )}
    </>
  );
}

/** A cited fact from data/labelling/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}
