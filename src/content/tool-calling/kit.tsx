// Pieces the tool-calling chapters share: the message-by-message player, the drawer panels (full messages, the tool definition)
// and a cited fact. Every string here is rendered as React text (KTD12): tool results and model turns never become markup.
import { useEffect, useRef, useState } from 'react';
import { STAMP_CLASS, type Lane } from '../../lib/iso/flat';
import type { Shown } from '../../components/scenes/toolSequence';
import { ORDERS, TOOLS, describe, type Order, type Tool } from '../../lib/tools/server';
import type { Desc } from '../../lib/tools/turns';
import { fact } from '../../lib/tools/facts';
import { DOMAINS } from '../../lib/tools/host';
import { money } from '../../lib/format';
import { Reveal } from '../../components/quiz/Predict';
import IsoStage from '../../lib/iso/IsoStage';
import FlatStage from '../../components/scenes/FlatStage';
import {
  OFFICE_BOARD,
  officeScene,
  officeLabel,
  officeState,
  type OfficeOpts,
} from '../../components/scenes/officeScene';
import './tools.css';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';

export { money };

export const GET_ORDER = TOOLS.find(t => t.name === 'get_order')!;
/** get_order as the host lists it with this description wording */
export const getOrder = (desc: Desc): Tool => describe(GET_ORDER, desc);

/** Runs the loop one message at a time: each press asks `onStep` for one more message; gone once all `total` are shown. */
export function Play({ shown, total, onStep }: { shown: number; total: number; onStep: (n: number) => void }) {
  if (shown >= total) return null;
  return (
    <button type="button" className="big" onClick={() => onStep(shown + 1)}>
      {shown === 0 ? 'Run the request' : `Next message (${shown + 1} of ${total}) →`}
    </button>
  );
}

/** The comparison after a prediction, once the outcome is on screen. */
export const Outcome = ({
  options,
  prediction,
  outcome,
}: {
  options: string[];
  prediction: number | null;
  outcome: number;
}) => (
  <Reveal
    prediction={prediction === null ? null : options[prediction]}
    outcome={options[outcome]}
    revealed
    onReveal={() => {}}
  />
);

// the card last pressed in the picture; the drawer scrolls to it and marks it
let picked: number | null = null;
/** The stage's onPick: a pressed card opens the messages drawer on that message, as a sheet on phones (R21). */
export const openMessage = (inspect: (panel: string, sheet?: boolean) => void) => (i: number) => {
  picked = i;
  inspect('messages', true);
};

/** Every message shown so far, in full: the drawer holds the JSON the drawing leaves out (R21). */
export function Messages({ lanes, msgs, upTo }: { lanes: Lane[]; msgs: Shown[]; upTo: number }) {
  const list = useRef<HTMLOListElement>(null);
  const at = picked !== null && picked < upTo ? picked : null;
  useEffect(() => {
    if (at !== null) list.current?.children[at]?.scrollIntoView({ block: 'nearest' });
  });
  const name = (id: string) => lanes.find(l => l.id === id)?.name ?? id;
  if (upTo <= 0) return <p className="note">No messages yet.</p>;
  return (
    <ol className="tc-msgs" ref={list}>
      {msgs.slice(0, upTo).map((m, i) => (
        <li key={i} data-kind={m.kind} data-picked={i === at || undefined}>
          <p className="lbl">
            {i + 1}. {name(m.from)} → {name(m.to)}
            {m.kind === 'error' ? ' · error' : ''}
          </p>
          {m.stamp && <span className={`stamp ${STAMP_CLASS[m.stamp]}`}>{m.stamp}</span>}
          {m.batch !== undefined && <span className="stamp neutral">AT ONCE</span>}
          <pre>{m.detail}</pre>
        </li>
      ))}
    </ol>
  );
}

export const ToolDef = ({ tool }: { tool: Tool }) => (
  <div className="tc-def">
    <p className="lbl">Name</p>
    <p>
      <code>{tool.name}</code>
    </p>
    <p className="lbl">Description</p>
    <p>“{tool.description}”</p>
    <p className="lbl">Input schema (JSON Schema)</p>
    <pre>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
  </div>
);

/** A fact from data/tool-calling/facts.json, with its source and the day it was checked (R22). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** A setting with a few fixed values (a finite domain, KTD10), stepped down and up. `values` run from first to last. */
export function Stepper<T>({
  label,
  values,
  value,
  show,
  onChange,
  down,
  up,
}: {
  label: string;
  values: T[];
  value: T;
  show: (v: T) => string;
  onChange: (v: T) => void;
  down: string;
  up: string;
}) {
  const i = values.indexOf(value);
  return (
    <div className="tc-stepper" role="group" aria-label={label}>
      <span className="lbl">{label}</span>
      <button type="button" className="chip" disabled={i >= values.length - 1} onClick={() => onChange(values[i + 1])}>
        {down}
      </button>
      <output aria-live="polite">{show(value)}</output>
      <button type="button" className="chip" disabled={i <= 0} onClick={() => onChange(values[i - 1])}>
        {up}
      </button>
    </div>
  );
}

/** chapter 6's refund limits: none, one that fits a normal refund, one below it */
export const LIMITS = DOMAINS['refund-gate'].limit as (number | null)[];
export const LIMIT_OF = (l: number | null) => (l === null ? 'No limit' : `Up to ${money(l)}`);

const refunded = (o: Order) => o.refunds.reduce((s, r) => s + r.amount, 0);

/** The order system's refunds before and after a run: what the run actually changed. */
export function Ledger({ after, ids }: { after: Order[]; ids: number[] }) {
  return (
    <table className="tc-ledger">
      <caption>Ledger: money refunded per order</caption>
      <thead>
        <tr>
          <th scope="col">Order</th>
          <th scope="col">Total</th>
          <th scope="col">Before</th>
          <th scope="col">After</th>
        </tr>
      </thead>
      <tbody>
        {ids.map(id => {
          const was = refunded(ORDERS.find(o => o.id === id)!),
            now = refunded(after.find(o => o.id === id)!);
          return (
            <tr key={id} data-order={id} data-changed={now !== was || undefined}>
              <th scope="row">{id}</th>
              <td>{money(ORDERS.find(o => o.id === id)!.total)}</td>
              <td>{money(was)}</td>
              <td>
                {money(now)}
                {now !== was && <span className="sr"> (changed)</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Below 600px wide: pills grow (`scale`) so they stay readable on a phone. */
export function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = matchMedia('(max-width: 600px)'),
      f = () => setNarrow(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return narrow;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the back-office picture (default) or the same run as a message sequence, one at a time (R28).
 * The tab is the reader's view, not story state, so it stays out of saved progress. */
export function ToolStage({
  lanes,
  msgs,
  upTo,
  office,
  inspect,
  say,
}: {
  lanes: Lane[];
  msgs: Shown[];
  upTo: number;
  office: Omit<OfficeOpts, 'msgs' | 'upTo' | 'host' | 'scale'>;
  inspect: (panel: string, sheet?: boolean) => void;
  /** the step's callout, drawn over a part of the picture (OFFICE_PARTS) */
  say?: Say;
}) {
  const [view, setView] = useState<'scene' | 'seq'>('scene');
  const scale = useNarrow() ? 1.8 : 1;
  const opts = { ...office, msgs, upTo, host: lanes[1].name, scale, say };
  return (
    <div className="tc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'seq'} onClick={() => setView('seq')}>
          Messages ({Math.min(upTo, msgs.length)})
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            className="office"
            board={OFFICE_BOARD}
            style={FILL}
            scene={officeScene(opts)}
            label={officeLabel(opts)}
          />
        ) : (
          <FlatStage lanes={lanes} msgs={msgs} upTo={upTo} onPick={openMessage(inspect)} />
        )}
      </div>
      {view === 'scene' && <Caption lanes={lanes} msgs={msgs} upTo={upTo} />}
    </div>
  );
}

/** Under the picture: the message on the belt in words (the drawing carries only its stamp). Plain React text (KTD12). */
function Caption({ lanes, msgs, upTo }: { lanes: Lane[]; msgs: Shown[]; upTo: number }) {
  const { flying } = officeState({ msgs, upTo, tools: 1 });
  const name = (id: string) => lanes.find(l => l.id === id)?.name ?? id;
  if (!flying.length) return <p className="tc-caption">Nothing sent yet.</p>;
  const { m } = flying[0];
  return (
    <p className="tc-caption">
      <span className="lbl">
        Message {Math.min(upTo, msgs.length)} of {msgs.length} · {name(m.from)} → {name(m.to)}
      </span>
      {m.stamp && <span className={`stamp ${STAMP_CLASS[m.stamp]}`}>{m.stamp}</span>}
      {flying.length > 1 && <span className="stamp neutral">AT ONCE</span>}
      <span className="txt">{flying.map(f => f.m.text).join(' · ')}</span>
    </p>
  );
}
