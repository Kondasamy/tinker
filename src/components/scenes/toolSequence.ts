// Module 2's picture in one sequence: an employee asks, the model proposes a tool call, the host app runs it.
// Built from the recorded order-status turns and the order data, so the picture and the chapters never disagree.
import type { Lane, Msg } from '../../lib/iso/flat';
import { RECORDINGS, type Call, type Recording } from '../../lib/tools/turns';
import { ORDERS, type LogEntry, type ToolResult } from '../../lib/tools/server';
import type { Run } from '../../lib/tools/host';

const REC = RECORDINGS['order-status'];
const turns = Object.entries(REC.turns);
/** the turn that proposes the call, and the answer written once its result came back ok */
export const CALL = turns.find(([, t]) => t.calls?.length)![1].calls![0];
export const ANSWER = turns.find(([sig]) => sig.includes(`last=${CALL.name}:${CALL.arguments.order_id}:ok`))![1].text;
const ORDER = ORDERS.find(o => o.id === CALL.arguments.order_id)!;
const args = Object.entries(CALL.arguments)
  .map(([k, v]) => `${k}: ${v}`)
  .join(', ');
const question = REC.ask.slice(REC.ask.indexOf(':') + 2);

export const SEQ_LANES: Lane[] = [
  { id: 'emp', name: 'Employee' },
  { id: 'host', name: 'Host app' },
  { id: 'model', name: 'Model' },
];
export const SEQ_MSGS: Msg[] = [
  { from: 'emp', to: 'host', kind: 'request', text: question[0].toUpperCase() + question.slice(1) },
  { from: 'host', to: 'model', kind: 'request', text: `question + ${REC.tools.length} tools` },
  { from: 'model', to: 'host', kind: 'request', text: `${CALL.name}(${args})` },
  { from: 'host', to: 'model', kind: 'result', text: `order ${ORDER.id}: ${ORDER.status}` },
  { from: 'model', to: 'host', kind: 'result', text: ANSWER },
  { from: 'host', to: 'emp', kind: 'result', text: ANSWER },
];

/** A message as the chapters show it: the card, plus the full text the drawer shows (JSON stays out of the drawing, R21). */
export interface Shown extends Msg {
  detail: string;
}

/** The four lanes chapters 1–4 and 6 use; the order system sits outside the loop until a tool reaches it. */
export const toolLanes = (host = 'Host app'): Lane[] => [
  { id: 'emp', name: 'Employee' },
  { id: 'host', name: host },
  { id: 'model', name: 'Model' },
  { id: 'orders', name: 'Order system' },
];

export const json = (v: unknown) => JSON.stringify(v, null, 2);
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** `get_order:1042:ok` → `get_order 1042 → ok` */
export const outcome = (key: string) => {
  const k = key.split(':');
  return `${k.slice(0, -1).join(' ')} → ${k.at(-1)}`;
};
/** `get_order(order_id: "1042")`: values as JSON, so text and numbers look different */
export const callText = (c: Call) =>
  `${c.name}(${Object.entries(c.arguments)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ')})`;
const summary = (r: ToolResult) => {
  const o = r.structuredContent;
  if (!r.isError && o && 'status' in o) return `order ${o.id}: ${o.status}`;
  if (!r.isError && o && 'amount' in o)
    return `refunded $${(o.amount as number).toLocaleString('en-US')} on order ${o.order_id}`;
  return r.content[0].text;
};

// Where a message sits within its model turn: proposal, approval, call, result back, result on to the model, stop.
const PROPOSE = 0,
  GATE = 1,
  CALLED = 2,
  BACK = 3,
  ON = 4,
  STOP = 5;
type Tagged = Shown & { turn?: number; phase?: number };

/** One host run as message cards, in order: the employee's question, what the host sends, each proposal (stamped
 * INVALID when the schema rejects it), the approval gate (APPROVED, DENIED or WAITING), each call to the order system
 * and its result (REFUSED when the tool says no), a STOPPED proposal when the call cap is reached, and the answer.
 * A turn that proposes several calls at once is shown phase by phase, each phase one batch (parallel calls). */
export function transcript(rec: Recording, r: Run): Shown[] {
  const q = rec.ask.slice(rec.ask.indexOf(':') + 2);
  const out: Tagged[] = [
    { from: 'emp', to: 'host', kind: 'request', text: q[0].toUpperCase() + q.slice(1), detail: rec.ask },
  ];
  let ran = false,
    turn = -1,
    proposal: Tagged | undefined;
  const push = (m: Shown, phase?: number) => {
    const t: Tagged = { ...m, turn: phase === undefined ? undefined : turn, phase };
    out.push(t);
    return t;
  };
  for (const s of r.steps) {
    switch (s.kind) {
      case 'send':
        push({
          from: 'host',
          to: 'model',
          kind: 'request',
          text: s.tools.length
            ? `question + ${s.tools.length} tool${s.tools.length === 1 ? '' : 's'}`
            : 'question, no tools',
          detail: s.tools.length ? `The question, and these tools:\n${json(s.tools)}` : 'The question, and no tools.',
        });
        break;
      case 'proposal':
        turn = s.turn;
        proposal = push(
          {
            from: 'model',
            to: 'host',
            kind: 'request',
            text: callText(s.call),
            detail: `${s.text}\n\n${json({ name: s.call.name, arguments: s.call.arguments })}`,
          },
          PROPOSE,
        );
        ran = false;
        break;
      case 'validation':
        if (s.errors.length && proposal) {
          proposal.stamp = 'INVALID';
          proposal.detail += `\n\nSchema check failed: ${s.errors.join('. ')}`;
        }
        break;
      case 'gate': {
        const word = s.decision === 'approve' ? 'APPROVED' : s.decision === 'deny' ? 'DENIED' : 'WAITING';
        const said =
          s.decision === 'approve'
            ? 'The person approved it, so the host runs it.'
            : s.decision === 'deny'
              ? 'The person denied it. The host does not run it and tells the model so.'
              : 'Waiting: nothing runs until a person approves or denies it.';
        push(
          {
            from: 'host',
            to: 'emp',
            kind: s.decision === 'deny' ? 'blocked' : 'request',
            stamp: word,
            text: `Approve ${callText(s.call)}?`,
            detail: `This tool changes data, so the host holds the call for a person to approve:\n${json({ name: s.call.name, arguments: s.call.arguments })}\n\n${said}`,
          },
          GATE,
        );
        break;
      }
      case 'call':
        push(
          {
            from: 'host',
            to: 'orders',
            kind: 'request',
            text: callText(s.call),
            detail: `The host runs the call:\n${json({ name: s.call.name, arguments: s.call.arguments })}`,
          },
          CALLED,
        );
        ran = true;
        break;
      case 'result': {
        const kind = s.result.isError ? 'error' : 'result',
          text = summary(s.result);
        const detail = `${s.result.isError ? 'isError: true\n' : ''}${s.result.content[0].text}`;
        if (ran)
          push(
            {
              from: 'orders',
              to: 'host',
              kind,
              text,
              detail,
              ...(s.result.isError ? { stamp: 'REFUSED' as const } : {}),
            },
            BACK,
          );
        push({ from: 'host', to: 'model', kind, text: ran ? `result: ${text}` : text, detail }, ON);
        break;
      }
      case 'cap':
        turn = s.turn;
        push(
          {
            from: 'model',
            to: 'host',
            kind: 'blocked',
            stamp: 'STOPPED',
            text: callText(s.call),
            detail: `The model asked for this call, but the host did not run it:\n${json({ name: s.call.name, arguments: s.call.arguments })}\n\n${s.text}`,
          },
          PROPOSE,
        );
        push(
          {
            from: 'host',
            to: 'emp',
            kind: 'error',
            text: `Stopped: cap of ${s.limit} call${s.limit === 1 ? '' : 's'}`,
            detail: s.text,
          },
          STOP,
        );
        break;
      case 'answer':
        push({ from: 'model', to: 'host', kind: 'result', text: s.text, detail: s.text });
        push({ from: 'host', to: 'emp', kind: 'result', text: s.text, detail: s.text });
        break;
      case 'norecord':
        push({ from: 'host', to: 'emp', kind: 'error', text: s.text, detail: `${s.text}\n${s.signature}` });
        break;
    }
  }
  return parallel(out).map(({ turn: _, phase: __, ...m }) => m);
}

/** Within a turn of several calls, order messages by phase (all proposals, then all calls, …) and batch each phase. */
function parallel(ms: Tagged[]): Tagged[] {
  const res: Tagged[] = [];
  for (let i = 0; i < ms.length; ) {
    let j = i;
    while (ms[i].turn !== undefined && j < ms.length && ms[j].turn === ms[i].turn) j++;
    if (j === i) {
      res.push(ms[i++]);
      continue;
    }
    const group = ms.slice(i, j);
    if (group.filter(m => m.phase === PROPOSE).length > 1) {
      group.sort((a, b) => a.phase! - b.phase!); // stable: calls keep their order within a phase
      // one batch per (turn, phase): the proposals are one batch, the calls the next, and so on
      for (const m of group)
        if (group.filter(n => n.phase === m.phase).length > 1) m.batch = m.turn! * (STOP + 1) + m.phase!;
    }
    res.push(...group);
    i = j;
  }
  return res;
}

const RESULT_TEXT: Record<string, (r: Record<string, any>) => string> = {
  'server/discover': r => `supports ${r.supportedVersions.join(', ')}`,
  'tools/list': r =>
    `${r.tools.length} tool${r.tools.length === 1 ? '' : 's'}: ${r.tools.map((t: { name: string }) => t.name).join(', ')}`,
  'resources/list': r =>
    `${r.resources.length} resource${r.resources.length === 1 ? '' : 's'}: ${r.resources.map((x: { name: string }) => x.name).join(', ')}`,
  'resources/read': r => `text of ${r.contents[0].uri.slice(r.contents[0].uri.lastIndexOf('/') + 1)}`,
  'prompts/list': r =>
    `${r.prompts.length} prompt${r.prompts.length === 1 ? '' : 's'}: ${r.prompts.map((p: { name: string }) => p.name).join(', ')}`,
  'prompts/get': r => `${r.messages.length} message from the template`,
  'tools/call': r => (r.isError ? r.content[0].text : 'tool result'),
};
const target = (p: Record<string, any> = {}) =>
  p.name ?? (typeof p.uri === 'string' ? p.uri.slice(p.uri.lastIndexOf('/') + 1) : '');

/** The JSON-RPC log as message cards: each request from the host's client to a server lane (named by the server),
 * each response back. The full JSON goes to the drawer. */
export function rpcMessages(log: LogEntry[], host = 'host'): Shown[] {
  const method = new Map<string, string>();
  return log.map(({ server, message: m }): Shown => {
    const detail = json(m);
    if ('method' in m) {
      method.set(`${server}#${m.id}`, m.method);
      return { from: host, to: server, kind: 'request', text: `${m.method} ${target(m.params)}`.trim(), detail };
    }
    if ('error' in m)
      return { from: server, to: host, kind: 'error', text: `error ${m.error.code}: ${m.error.message}`, detail };
    const how = RESULT_TEXT[method.get(`${server}#${m.id}`)!];
    return { from: server, to: host, kind: 'result', text: how ? how(m.result) : 'result', detail };
  });
}
