// Pieces chapters 1–3 share: the message-by-message player, the drawer panels (full messages, the tool definition)
// and a cited fact. Every string here is rendered as React text (KTD12): tool results and model turns never become markup.
import type { Lane } from '../../lib/iso/flat';
import type { Shown } from '../../components/scenes/toolSequence';
import { TOOLS, type Tool } from '../../lib/tools/server';
import type { Desc } from '../../lib/tools/turns';
import { fact } from '../../lib/tools/facts';
import { Reveal } from '../../components/quiz/Predict';
import './tools.css';

export const GET_ORDER = TOOLS.find(t => t.name === 'get_order')!;
/** get_order as the host lists it with this description wording */
export const getOrder = (desc: Desc): Tool => ({ ...GET_ORDER, description: desc === 'vague' ? GET_ORDER.vague! : GET_ORDER.description });

/** Runs the loop one message at a time. `sync`: a press that is not the last is never a missed try. */
export function Play({ shown, total, onStep }: { shown: number; total: number; onStep: (n: number) => void }) {
  if (shown >= total) return null;
  return (
    <button type="button" className="big" onClick={() => onStep(shown + 1)}>
      {shown === 0 ? 'Run the request' : `Next message (${shown + 1} of ${total}) →`}
    </button>
  );
}

/** The comparison after a prediction, once the outcome is on screen. */
export const Outcome = ({ options, prediction, outcome }: { options: string[]; prediction: number | null; outcome: number }) => (
  <Reveal prediction={prediction === null ? null : options[prediction]} outcome={options[outcome]} revealed onReveal={() => {}} />
);

/** Every message shown so far, in full: the drawer holds the JSON the drawing leaves out (R21). */
export function Messages({ lanes, msgs, upTo }: { lanes: Lane[]; msgs: Shown[]; upTo: number }) {
  const name = (id: string) => lanes.find(l => l.id === id)?.name ?? id;
  if (upTo <= 0) return <p className="note">No messages yet.</p>;
  return (
    <ol className="tc-msgs">
      {msgs.slice(0, upTo).map((m, i) => (
        <li key={i} data-kind={m.kind}>
          <p className="lbl">{i + 1}. {name(m.from)} → {name(m.to)}{m.kind === 'error' ? ' · error' : ''}</p>
          {m.stamp && <span className="stamp warn">{m.stamp}</span>}
          <pre>{m.detail}</pre>
        </li>
      ))}
    </ol>
  );
}

export const ToolDef = ({ tool }: { tool: Tool }) => (
  <div className="tc-def">
    <p className="lbl">Name</p><p><code>{tool.name}</code></p>
    <p className="lbl">Description</p><p>“{tool.description}”</p>
    <p className="lbl">Input schema (JSON Schema)</p>
    <pre>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
  </div>
);

/** A fact from data/tool-calling/facts.json, with its source and the day it was checked (R22). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <a className="source" href={f.source} target="_blank" rel="noreferrer">Source: {new URL(f.source).hostname}</a> (checked {f.accessed})
    </p>
  );
}
