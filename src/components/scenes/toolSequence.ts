// Module 2's picture in one sequence: an employee asks, the model proposes a tool call, the host app runs it.
// Built from the recorded order-status turns and the order data, so the picture and the chapters never disagree.
import type { Lane, Msg } from '../../lib/iso/flat';
import { RECORDINGS, type Call, type Recording } from '../../lib/tools/turns';
import { ORDERS, type ToolResult } from '../../lib/tools/server';
import type { Run } from '../../lib/tools/host';

const REC = RECORDINGS['order-status'];
const turns = Object.entries(REC.turns);
/** the turn that proposes the call, and the answer written once its result came back ok */
export const CALL = turns.find(([, t]) => t.calls?.length)![1].calls![0];
export const ANSWER = turns.find(([sig]) => sig.includes(`last=${CALL.name}:${CALL.arguments.order_id}:ok`))![1].text;
const ORDER = ORDERS.find(o => o.id === CALL.arguments.order_id)!;
const args = Object.entries(CALL.arguments).map(([k, v]) => `${k}: ${v}`).join(', ');
const question = REC.ask.slice(REC.ask.indexOf(':') + 2);

export const SEQ_LANES: Lane[] = [{ id: 'emp', name: 'Employee' }, { id: 'host', name: 'Host app' }, { id: 'model', name: 'Model' }];
export const SEQ_MSGS: Msg[] = [
  { from: 'emp', to: 'host', kind: 'request', text: question[0].toUpperCase() + question.slice(1) },
  { from: 'host', to: 'model', kind: 'request', text: `question + ${REC.tools.length} tools` },
  { from: 'model', to: 'host', kind: 'request', text: `${CALL.name}(${args})` },
  { from: 'host', to: 'model', kind: 'result', text: `order ${ORDER.id}: ${ORDER.status}` },
  { from: 'model', to: 'host', kind: 'result', text: ANSWER },
  { from: 'host', to: 'emp', kind: 'result', text: ANSWER },
];

/** A message as the chapters show it: the card, plus the full text the drawer shows (JSON stays out of the drawing, R21). */
export interface Shown extends Msg { detail: string }

/** The four lanes chapters 1–3 use; the order system sits outside the loop until a tool reaches it. */
export const toolLanes = (host = 'Host app'): Lane[] =>
  [{ id: 'emp', name: 'Employee' }, { id: 'host', name: host }, { id: 'model', name: 'Model' }, { id: 'orders', name: 'Order system' }];

const json = (v: unknown) => JSON.stringify(v, null, 2);
/** `get_order(order_id: "1042")`: values as JSON, so text and numbers look different */
export const callText = (c: Call) => `${c.name}(${Object.entries(c.arguments).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})`;
const summary = (r: ToolResult) => {
  const o = r.structuredContent;
  return !r.isError && o && 'status' in o ? `order ${o.id}: ${o.status}` : r.content[0].text;
};

/** One host run as message cards, in order: the employee's question, what the host sends, each proposal (stamped
 * INVALID when the schema rejects it), each call to the order system and its result, and the answer. */
export function transcript(rec: Recording, r: Run): Shown[] {
  const q = rec.ask.slice(rec.ask.indexOf(':') + 2);
  const out: Shown[] = [{ from: 'emp', to: 'host', kind: 'request', text: q[0].toUpperCase() + q.slice(1), detail: rec.ask }];
  let ran = false;
  for (const s of r.steps) {
    switch (s.kind) {
      case 'send':
        out.push({
          from: 'host', to: 'model', kind: 'request',
          text: s.tools.length ? `question + ${s.tools.length} tool${s.tools.length === 1 ? '' : 's'}` : 'question, no tools',
          detail: s.tools.length ? `The question, and these tools:\n${json(s.tools)}` : 'The question, and no tools.',
        });
        break;
      case 'proposal':
        out.push({ from: 'model', to: 'host', kind: 'request', text: callText(s.call), detail: `${s.text}\n\n${json({ name: s.call.name, arguments: s.call.arguments })}` });
        ran = false;
        break;
      case 'validation': {
        const last = out[out.length - 1];
        if (s.errors.length) { last.stamp = 'INVALID'; last.detail += `\n\nSchema check failed: ${s.errors.join('. ')}`; }
        break;
      }
      case 'call':
        out.push({ from: 'host', to: 'orders', kind: 'request', text: callText(s.call), detail: `The host runs the call:\n${json({ name: s.call.name, arguments: s.call.arguments })}` });
        ran = true;
        break;
      case 'result': {
        const kind = s.result.isError ? 'error' : 'result', text = summary(s.result);
        const detail = `${s.result.isError ? 'isError: true\n' : ''}${s.result.content[0].text}`;
        if (ran) out.push({ from: 'orders', to: 'host', kind, text, detail });
        out.push({ from: 'host', to: 'model', kind, text: ran ? `result: ${text}` : text, detail });
        break;
      }
      case 'answer':
        out.push({ from: 'model', to: 'host', kind: 'result', text: s.text, detail: s.text }, { from: 'host', to: 'emp', kind: 'result', text: s.text, detail: s.text });
        break;
      case 'norecord':
        out.push({ from: 'host', to: 'emp', kind: 'error', text: s.text, detail: `${s.text}\n${s.signature}` });
        break;
      // shortcut: gate and cap steps are not drawn; the chapters that use those scenarios add them
    }
  }
  return out;
}
