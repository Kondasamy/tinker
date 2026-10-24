// Pieces the guardrails chapters share: the stage (the back office with its mail room and defences, or the run as lanes)
// and its caption. Emails carry attacker text, so every string from a run is React text here; the drawings escape
// theirs (esc) before they become SVG.
import { useMemo, useState } from 'react';
import { STAMP_CLASS } from '../../lib/iso/flat';
import IsoStage from '../../lib/iso/IsoStage';
import FlatStage from '../../components/scenes/FlatStage';
import {
  GUARD_BOARD,
  guardLabel,
  guardReadouts,
  guardScene,
  guardState,
  type GuardOpts,
} from '../../components/scenes/guardScene';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import {
  ATTACKS,
  CUSTOMER_RECORDS,
  INBOX,
  isAttack,
  run,
  type CaseId,
  type Run,
  type Setup,
} from '../../lib/guardrails/loop';
import { RECORDING } from '../../lib/guardrails/turns';
import { fact } from '../../lib/guardrails/facts';
import { openMessage, useNarrow } from '../tool-calling/kit';
import './guardrails.css';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';

export { Chips, Group } from '../agents/kit';

/** The props a chapter turns on: everything in GuardOpts but the run, the step and the drawing's own settings. */
export type GuardProps = Omit<GuardOpts, 'run' | 'upTo' | 'host' | 'scale'>;

/** The defences a setup turns on, as props. `legs` (chapter 4) is the chapter's choice, not a setting. */
export const guardProps = (s: Partial<Setup>, legs = false): GuardProps => ({
  screen: (s.threshold ?? null) !== null || !!s.inputPolicy || s.remove === 'untrusted',
  allow: !!s.allow,
  taint: !!s.taint,
  remove: s.remove ?? 'none',
  legs,
});

export type View = 'scene' | 'seq';
const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the mail room (default) or the same run as lanes, one at a time. `upTo` is the number of run
 * steps shown; the last one is the current step. The tab is the reader's view, kept out of saved progress unless the
 * chapter passes `view` and `onView` to keep it in its step state. */
export function GuardStage({
  run,
  upTo,
  props = {},
  host = 'Host app',
  inspect,
  view: kept,
  onView,
  say: callout,
}: {
  run: Run;
  upTo: number;
  props?: GuardProps;
  host?: string;
  inspect: (panel: string, sheet?: boolean) => void;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn over a part of the picture (GUARD_PARTS) */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 1.8 : 1;
  const msgs = useMemo(() => guardMessages(run), [run]),
    lanes = useMemo(() => guardLanes(host), [host]);
  const shown = Math.min(upTo, msgs.length),
    opts: GuardOpts = { ...props, run, upTo: shown, host, scale, say: callout };
  const m = msgs[shown - 1],
    name = (id: string) => lanes.find(l => l.id === id)?.name ?? id;
  return (
    <div className="tc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'seq'} onClick={() => setView('seq')}>
          Steps ({shown})
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            className="office"
            board={GUARD_BOARD}
            style={FILL}
            scene={guardScene(opts)}
            label={guardLabel(opts)}
          />
        ) : (
          <FlatStage lanes={lanes} msgs={msgs} upTo={shown} onPick={openMessage(inspect)} />
        )}
      </div>
      {view === 'scene' && (
        <p className="tc-caption">
          <span className="lbl">
            {m
              ? `Step ${shown} of ${msgs.length} · ${name(m.from)}${m.to === m.from ? '' : ` → ${name(m.to)}`}`
              : 'Nothing sent yet.'}
          </span>
          {m?.stamp && <span className={`stamp ${STAMP_CLASS[m.stamp]}`}>{m.stamp}</span>}
          {guardState(opts).tag && <span className="gr-taint">From outside</span>}
          {m && <span className="txt">{m.text}</span>}
          <span className="lbl">{guardReadouts(opts).join(' · ')}</span>
        </p>
      )}
    </div>
  );
}

/** A cited fact from data/guardrails/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Wraps f so each argument (keyed by its JSON) is computed once and kept. */
export function memo<A, R>(f: (a: A) => R): (a: A) => R {
  const m = new Map<string, R>();
  return a => {
    const k = JSON.stringify(a);
    if (!m.has(k)) m.set(k, f(a));
    return m.get(k)!;
  };
}
/** One run against the merged recording, run once per setup and kept. */
export const runCached = memo((setup: Partial<Setup> & { case: CaseId }) => run(RECORDING, setup));

export const email = (id: CaseId) => INBOX.find(e => e.id === id)!;
/** What an attack does when it works, in words; undefined for a customer case. */
export const says = (id: CaseId) => ATTACKS.find(a => a.email === id)?.says;
/** The customer's name for an address, or the address when it is not on file. */
export const nameOf = (address: string) => CUSTOMER_RECORDS.find(c => c.email === address)?.name ?? address;
/** An email's sender (the customer's name) and subject. */
export const sender = (id: CaseId) => nameOf(email(id).from);
export const longName = (id: CaseId) => `${sender(id)}: “${email(id).subject}”`;

/** One email as the assistant receives it. Attacker text: React text only. */
export function Email({ c }: { c: CaseId }) {
  const e = email(c);
  return (
    <div className="tc-def">
      <p className="lbl">From</p>
      <p>
        {e.from} ({sender(c)})
      </p>
      <p className="lbl">Subject</p>
      <p>{e.subject}</p>
      <p className="lbl">Text</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{e.text}</p>
    </div>
  );
}
/** A case's column name: its id, capitalised; the key under the matrix gives the email it stands for. */
export const shortName = (id: CaseId) => id[0].toUpperCase() + id.slice(1);
/** One cell, in words: an attack worked or was stopped; a customer was served or blocked (a false block). */
export const cellWord = (r: Run) =>
  isAttack(r.case) ? (r.attackMet ? 'Worked' : 'Stopped') : r.caseDone ? 'Served' : 'Blocked';
const bad = (r: Run) => (isAttack(r.case) ? r.attackMet : !r.caseDone);

/** Defence sets × cases, each cell from a run. Columns are short names (the key below names each email), so it fits a
 * phone; each cell's accessible name says the whole thing. Attacker text never reaches here, only names and subjects. */
export function Matrix({
  caption,
  rows,
  cases,
}: {
  caption: string;
  rows: { name: string; runs: Run[] }[];
  cases: CaseId[];
}) {
  // phones: A1… for attacks and C1… for customers in the header, a mark in each cell; the key and each cell's name say it all
  const code = (c: CaseId) =>
    `${isAttack(c) ? 'A' : 'C'}${cases.filter(x => isAttack(x) === isAttack(c)).indexOf(c) + 1}`;
  return (
    <div className="gr-matrix">
      <table className="tc-ledger">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Defences</th>
            {cases.map(c => (
              <th key={c} scope="col">
                <span className="gr-long">{shortName(c)}</span>
                <span className="gr-short">{code(c)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ name, runs }) => (
            <tr key={name} data-row={name}>
              <th scope="row">{name}</th>
              {runs.map(r => (
                <td
                  key={r.case}
                  data-case={r.case}
                  data-bad={bad(r) ? '1' : '0'}
                  aria-label={`${name}, ${isAttack(r.case) ? 'attack' : 'customer'} ${longName(r.case)}: ${cellWord(r)}`}
                >
                  <span className="gr-long">{cellWord(r)}</span>
                  <span className="gr-short">{bad(r) ? '✗' : '✓'}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="gr-key">
        {cases.map(c => (
          <li key={c}>
            <strong>
              <span className="gr-short">{code(c)} · </span>
              {shortName(c)}
            </strong>
            : {isAttack(c) ? 'attack' : 'customer'}, {longName(c)}
          </li>
        ))}
      </ul>
      <p className="gr-key gr-short">✗: an attack worked or a customer was blocked. ✓: stopped or served.</p>
    </div>
  );
}
