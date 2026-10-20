// Module 3's precise view: one agent run as flat lanes (model, host, tools, and helpers when the run delegates), one
// card per run step, in order. The back-office picture (agentScene) reads the same cards, so the two never disagree.
import type { Lane } from '../../lib/iso/flat';
import type { Run, Step } from '../../lib/agents/loop';
import { callText, json, outcome, plural, type Shown } from './toolSequence';

/** The Steps tab's lanes. Ids match the back office's stations (host, model, orders), so the picture can read the cards. */
export const agentLanes = (r: Run, host = 'Host app'): Lane[] => [
  { id: 'model', name: 'Model' }, { id: 'host', name: host }, { id: 'orders', name: 'Tools' },
  ...(r.steps.some(s => s.kind === 'helper') ? [{ id: 'helpers', name: 'Helpers' }] : []),
];

const DECIDED = { approve: 'APPROVED', reject: 'DENIED', pending: 'WAITING' } as const;

/** One card per step. Results come back from the tool (or helper) that ran them; host-only steps (the schema check,
 * the repeat detector, compaction, a budget stop) stay on the host's lane. Full text goes to `detail` (the drawer). */
export function agentMessages(r: Run): Shown[] {
  let ran: 'orders' | 'helpers' | null = null;
  return r.steps.map((s: Step): Shown => {
    switch (s.kind) {
      case 'send':
        return { from: 'host', to: 'model', kind: 'request', text: `task + ${plural(s.tools.length, 'tool')}`, detail: `The task, and these tools:\n${json(s.tools)}` };
      case 'plan':
        return { from: 'model', to: 'host', kind: 'request', text: `plan: ${plural(s.items.length, 'step')}`, detail: `${s.text}\n\n${s.items.map((i, n) => `${n + 1}. ${i}`).join('\n')}` };
      case 'approval':
        return {
          from: 'host', to: 'model', kind: s.decision === 'reject' ? 'blocked' : 'request', stamp: DECIDED[s.decision],
          text: s.items.length === 1 ? `approve ${s.items[0]}?` : `approve the ${plural(s.items.length, 'step')} plan?`,
          detail: `A person reads it before anything runs:\n${s.items.join('\n')}\n\n${s.decision === 'pending' ? 'Waiting for a person.' : `The person chose: ${s.decision}.`}`,
        };
      case 'proposal':
        ran = null;
        return { from: 'model', to: 'host', kind: 'request', text: callText(s.call), detail: `${s.text}\n\n${json({ name: s.call.name, arguments: s.call.arguments })}` };
      case 'validation':
        return s.errors.length
          ? { from: 'host', to: 'host', kind: 'error', stamp: 'INVALID', text: `schema check: ${s.call.name}`, detail: `Schema check failed: ${s.errors.join('. ')}` }
          : { from: 'host', to: 'host', kind: 'result', text: `schema check: ${s.call.name} ok`, detail: 'The arguments match the tool’s input schema.' };
      case 'call':
        ran = 'orders';
        return { from: 'host', to: 'orders', kind: 'request', text: callText(s.call), detail: `The host runs the call:\n${json({ name: s.call.name, arguments: s.call.arguments })}` };
      case 'helper':
        ran = 'helpers';
        return { from: 'host', to: 'helpers', kind: 'request', text: callText(s.call),
          detail: `A helper starts with a clean context and works order ${s.call.arguments.order_id} alone (${s.run.status}, ${plural(s.run.steps.length, 'step')}).` };
      case 'repeat':
        return { from: 'host', to: 'host', kind: 'blocked', stamp: 'STOPPED', text: `${s.call.name} failed ${s.times}× the same way`, detail: `The repeat detector stopped ${callText(s.call)}: it failed the same way ${s.times} times in a row.` };
      case 'result': {
        const kind = s.result.isError ? 'error' : 'result', detail = `${s.result.isError ? 'isError: true\n' : ''}${s.result.content[0].text}`;
        const from = ran ?? 'host';
        ran = null;
        return { from, to: from === 'host' ? 'model' : 'host', kind, text: outcome(s.key), detail };
      }
      case 'compact':
        return { from: 'host', to: 'host', kind: 'result', text: `compacted ${s.dropped.length} ${s.dropped.length === 1 ? 'entry' : 'entries'}`,
          detail: `${s.summary}${s.pins.length ? `\n\nPinned:\n${s.pins.join('\n')}` : ''}` };
      case 'answer':
        return { from: 'model', to: 'host', kind: 'result', text: s.text, detail: s.text };
      case 'budget': case 'halt':
        return { from: 'host', to: 'host', kind: 'error', stamp: 'STOPPED', text: s.text, detail: s.text };
      case 'norecord':
        return { from: 'host', to: 'host', kind: 'error', text: s.text, detail: `${s.text}\n${s.signature}` };
    }
  });
}
