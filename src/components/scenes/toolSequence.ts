// Module 2's picture in one sequence: an employee asks, the model proposes a tool call, the host app runs it.
// Built from the recorded order-status turns and the order data, so the picture and the chapters never disagree.
import type { Lane, Msg } from '../../lib/iso/flat';
import { RECORDINGS } from '../../lib/tools/turns';
import { ORDERS } from '../../lib/tools/server';

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
