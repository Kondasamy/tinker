// The sandboxing precise view: one run as flat lanes (agent, sandbox, files, network), one card per run step, in order.
// The glass-room picture (sandboxScene) reads the same steps, so the two never disagree. A call a boundary stopped is a
// dashed card stamped REFUSED, the same stamp Guardrails uses (no new stamp in flat.ts).
import type { Lane } from '../../lib/iso/flat';
import type { Run, Step } from '../../lib/sandboxing/loop';
import { callText, json, outcome, plural, type Shown } from './toolSequence';

/** The Steps tab's lanes. The agent proposes; the sandbox host runs the check; files and the network are the boundaries. */
export const sandboxLanes = (): Lane[] =>
  [{ id: 'model', name: 'Agent' }, { id: 'host', name: 'Sandbox' }, { id: 'files', name: 'Files' }, { id: 'net', name: 'Network' }];

/** Which lane a tool runs on: fetch crosses the network; read/write touch files; run stays on the host. */
export const laneOf = (tool: string) => (tool === 'fetch' ? 'net' : tool === 'read_file' || tool === 'write_file' ? 'files' : 'host');

/** One card per step. A blocked call is drawn toward the boundary it hit (files or network), stamped REFUSED. Full
 * text goes to `detail` (the drawer); every string here is escaped by the drawing that shows it. */
export function sandboxMessages(r: Run): Shown[] {
  let ran: string | null = null;
  return r.steps.map((s: Step): Shown => {
    switch (s.kind) {
      case 'start':
        return { from: 'host', to: 'model', kind: 'request', text: `the task + ${plural(s.tools.length, 'tool')}`,
          detail: `The task, and these tools:\n${json(s.tools.map((t) => t.name))}` };
      case 'proposal':
        ran = null;
        return { from: 'model', to: 'host', kind: 'request', text: callText(s.call), detail: `${s.text}\n\n${json({ name: s.call.name, arguments: s.call.arguments })}` };
      case 'validation':
        return s.errors.length
          ? { from: 'host', to: 'host', kind: 'error', stamp: 'INVALID', text: `schema check: ${s.call.name}`, detail: `Schema check failed: ${s.errors.join('. ')}` }
          : { from: 'host', to: 'host', kind: 'result', text: `schema check: ${s.call.name} ok`, detail: 'The arguments match the tool’s input schema.' };
      case 'approval':
        return { from: 'host', to: 'host', kind: s.decision === 'deny' ? 'blocked' : 'result', stamp: s.decision === 'deny' ? 'DENIED' : 'APPROVED',
          text: `a person checks ${s.call.name}`, detail: `A person is asked because the request would cross the sandbox boundary. They chose: ${s.decision}.` };
      case 'blocked':
        return { from: 'host', to: laneOf(s.call.name), kind: 'blocked', stamp: 'REFUSED', text: `${s.by}: ${s.call.name} stopped`, detail: s.text };
      case 'call':
        ran = laneOf(s.call.name);
        return { from: 'host', to: ran, kind: 'request', text: callText(s.call), detail: `The sandbox runs the call:\n${json({ name: s.call.name, arguments: s.call.arguments })}` };
      case 'result': {
        const from = ran ?? 'host';
        ran = null;
        return { from, to: from === 'host' ? 'model' : 'host', kind: s.outcome === 'ok' ? 'result' : 'error', text: outcome(s.key), detail: s.text };
      }
      case 'answer':
        return { from: 'model', to: 'host', kind: 'result', text: s.text, detail: s.text };
      case 'budget':
        return { from: 'host', to: 'host', kind: 'error', stamp: 'STOPPED', text: s.text, detail: s.text };
      case 'norecord':
        return { from: 'host', to: 'host', kind: 'error', text: s.text, detail: `${s.text}\n${s.signature}` };
    }
  });
}
