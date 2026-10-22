// Module 5's precise view: one guardrails run as flat lanes (model, host, tools, mail), one card per run step, in order.
// The mailroom picture (guardScene) reads the same steps, so the two never disagree.
import type { Lane } from '../../lib/iso/flat';
import type { Run, Step } from '../../lib/guardrails/loop';
import { callText, json, outcome, plural, type Shown } from './toolSequence';

/** The Steps tab's lanes. Ids match the back office's stations (host, model, orders); mail is the inbox and the way out. */
export const guardLanes = (host = 'Host app'): Lane[] => [
  { id: 'model', name: 'Model' },
  { id: 'host', name: host },
  { id: 'orders', name: 'Tools' },
  { id: 'mail', name: 'Mail' },
];

/** Mail tools run on the mail lane; reply too (it goes back to the sender). The rest are records and orders. */
export const laneOf = (tool: string) => (['read_inbox', 'send_email', 'reply'].includes(tool) ? 'mail' : 'orders');

const FORM = { full: 'email', quarantined: 'email (held)', refused: 'email (turned away)' } as const;

/** One card per step. Results come back from the lane that ran them; host-only steps (schema check, approval, output
 * filter, a budget stop) stay on the host's lane. A blocked call is drawn toward where it was going, stamped REFUSED.
 * Full text goes to `detail` (the drawer); every string here is escaped by the drawing that shows it. */
export function guardMessages(r: Run): Shown[] {
  let ran: string | null = null;
  return r.steps.map((s: Step): Shown => {
    switch (s.kind) {
      case 'send':
        return {
          from: 'host',
          to: 'model',
          kind: 'request',
          text: `${FORM[s.mail]} + ${plural(s.tools.length, 'tool')}`,
          detail: `The task (the email is ${s.mail}), and these tools:\n${json(s.tools)}`,
        };
      case 'proposal':
        ran = null;
        return {
          from: 'model',
          to: 'host',
          kind: 'request',
          text: callText(s.call),
          detail: `${s.text}\n\n${json({ name: s.call.name, arguments: s.call.arguments })}`,
        };
      case 'validation':
        return s.errors.length
          ? {
              from: 'host',
              to: 'host',
              kind: 'error',
              stamp: 'INVALID',
              text: `schema check: ${s.call.name}`,
              detail: `Schema check failed: ${s.errors.join('. ')}`,
            }
          : {
              from: 'host',
              to: 'host',
              kind: 'result',
              text: `schema check: ${s.call.name} ok`,
              detail: 'The arguments match the tool’s input schema.',
            };
      case 'approval':
        return {
          from: 'host',
          to: 'host',
          kind: s.decision === 'deny' ? 'blocked' : 'result',
          stamp: s.decision === 'deny' ? 'DENIED' : 'APPROVED',
          text: `a person checks ${s.call.name}`,
          detail: `A person reads it before it is sent:\n${json(s.call.arguments)}\n\nThe person chose: ${s.decision}.`,
        };
      case 'blocked':
        return {
          from: 'host',
          to: laneOf(s.call.name),
          kind: 'blocked',
          stamp: 'REFUSED',
          text: `${s.by}: ${s.call.name} stopped`,
          detail: s.text,
        };
      case 'call':
        ran = laneOf(s.call.name);
        return {
          from: 'host',
          to: ran,
          kind: 'request',
          text: callText(s.call),
          detail: `The host runs the call:\n${json({ name: s.call.name, arguments: s.call.arguments })}`,
        };
      case 'result': {
        const from = ran ?? 'host';
        ran = null;
        return {
          from,
          to: from === 'host' ? 'model' : 'host',
          kind: s.result.isError ? 'error' : 'result',
          text: outcome(s.key),
          detail: `${s.result.isError ? 'isError: true\n' : ''}${s.result.content[0].text}`,
        };
      }
      case 'filter':
        return {
          from: 'host',
          to: 'host',
          kind: 'result',
          text: `output filter: ${plural(s.removed.length, 'link')} removed`,
          detail: `Removed:\n${s.removed.join('\n')}`,
        };
      case 'answer':
        return { from: 'model', to: 'host', kind: 'result', text: s.text, detail: s.text };
      case 'budget':
        return { from: 'host', to: 'host', kind: 'error', stamp: 'STOPPED', text: s.text, detail: s.text };
      case 'norecord':
        return { from: 'host', to: 'host', kind: 'error', text: s.text, detail: `${s.text}\n${s.signature}` };
    }
  });
}
