// The deterministic agent loop (KTD1–KTD7): plan, approve, think, act, observe, compact. The step budget, the context
// budget, the repeat detector, compaction and delegation are host rules computed here; only the model's turns are recorded.
import AGENT from '../../../data/agents/server.json';
import CASES from '../../../data/agents/cases.json';
import { validate } from '../tools/schema';
import { connect, createServer, orderHandlers, ORDERS, TOOLS, text, toolError, type Bundle, type LogEntry, type Order, type ServerDef, type Tool, type ToolResult } from '../tools/server';
import { BYTES_PER_TOKEN } from '../scale';
import { money } from '../format';
import { lookup, NORECORD, signature, type Call, type Mem, type PlanState, type Recording } from './turns';

export type AgentServerId = keyof typeof AGENT.servers;
export const AGENT_SERVERS: Record<AgentServerId, ServerDef> = AGENT.servers;
/** Every tool the agent servers list: Tool calling's order tools plus the warehouse, carrier and mail tools. */
export const AGENT_TOOLS: Tool[] = [...TOOLS, ...(AGENT.tools as unknown as Tool[])];
/** The storm case's five orders (assumption: delivered, no planted notes); Tool calling's orders stay as they are. */
export const CASE_ORDERS = CASES.orders as Order[];
const SHIPMENTS: Record<string, { carrier: string; timeout: boolean }> = CASES.shipments;
export interface Email { order_id: number; to: string; body: string }

/** The host-defined tool (KTD7): never sent to a server; the loop runs it as a nested run with its own context. */
export const DELEGATE: Tool = {
  name: 'delegate',
  title: 'Hand to a helper',
  description: 'Hand one order to a helper agent. The helper starts with a clean context, works the order on its own and replies with one line.',
  inputSchema: {
    type: 'object',
    properties: {
      order_id: { type: 'integer', description: 'The order the helper works on.', minimum: 1000, maximum: 9999 },
      task: { type: 'string', description: 'What the helper should do.' },
    },
    required: ['order_id', 'task'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
};

/** The agent servers over one run's own stock and sent-mail ledger. */
function bundle(stock: Record<string, number>, mail: Email[]): Bundle {
  return {
    servers: AGENT_SERVERS,
    tools: AGENT_TOOLS,
    handlers: (orders, opts) => {
      const find = (id: number) => orders.find((o) => o.id === id);
      const none = (id: number) => toolError(`There is no order ${id}.`);
      return {
        ...orderHandlers(orders, opts),
        check_stock: ({ order_id }) => {
          const o = find(order_id);
          if (!o) return none(order_id);
          const items = o.items.map((i) => ({ part: i.part, name: i.name, qty: i.qty, on_hand: stock[i.part] ?? 0 }));
          return text({ order_id, items, in_stock: items.every((i) => i.on_hand >= i.qty) });
        },
        create_replacement: ({ order_id }) => {
          const o = find(order_id);
          if (!o) return none(order_id);
          const out = o.items.find((i) => (stock[i.part] ?? 0) < i.qty);
          if (out) return toolError(`${out.name} is out of stock, so no replacement was shipped.`);
          for (const i of o.items) stock[i.part] -= i.qty;
          return text({ order_id, replacement: 'shipped', items: o.items.map(({ part, qty }) => ({ part, qty })) });
        },
        track_shipment: ({ order_id }) => {
          const o = find(order_id), s = SHIPMENTS[order_id];
          if (!o) return none(order_id);
          if (!s || o.status !== 'shipped') return toolError(`Order ${order_id} is not out with a carrier.`);
          return s.timeout ? toolError(`${s.carrier} did not answer in time. The tracking lookup timed out.`) : text({ order_id, carrier: s.carrier, status: 'in transit' });
        },
        send_email: ({ order_id, body }) => {
          const o = find(order_id);
          if (!o) return none(order_id);
          mail.push({ order_id, to: o.customer, body });
          return text({ order_id, to: o.customer, sent: true });
        },
      };
    },
  };
}

export type Decision = 'approve' | 'reject';
export interface Setup {
  /** which of the recording's asks this run works; defaults to the first */
  case: string;
  /** script: Larkspur's fixed code path, no model turns; agent: the model picks every step */
  mode: 'script' | 'agent';
  /** whether the warehouse holds the damaged case's printer (part WR-4) */
  stock: 'in' | 'out';
  /** the model writes a plan before it acts */
  plan: boolean;
  /** none: plans run as written; plan: a person approves each plan, and any call outside it (KTD11) */
  approval: 'none' | 'plan';
  /** the person's answers, in order; once they run out, the run waits */
  decide: Decision[];
  /** step budget: the most model turns one run may take (host) */
  steps: number;
  /** repeat detector: stop a call that failed the same way this many times in a row; null = off (host, KTD6) */
  repeat: number | null;
  mem: Mem;
  /** context budget in tokens: the most one turn's input may hold (host, KTD12) */
  context: number;
  /** offer the delegate tool, so the model can hand orders to helpers */
  helpers: boolean;
}
/** The Larkspur host's context budget: a setting this host chooses, not any model's real window (KTD12). */
export const CONTEXT = 3000;
/** summary and pinned memory compact the history once it holds more than this many tokens */
export const COMPACT_AT = 900;
export const DEFAULTS: Omit<Setup, 'case'> = {
  mode: 'agent', stock: 'in', plan: false, approval: 'none', decide: [], steps: 12, repeat: 3, mem: 'full', context: CONTEXT, helpers: false,
};

/** The finite values each scenario's chapter controls can take; the coverage test runs every combination. */
export type Domain = { [K in keyof Setup]?: Setup[K][] };
const DECISIONS: Decision[][] = [['approve'], ['reject', 'approve'], ['reject', 'reject']];
export const DOMAINS: Record<string, Domain> = {
  '01-workflow-or-agent': { case: ['refund', 'damaged'], stock: ['in', 'out'], mode: ['script', 'agent'] },
  '02-the-loop': {},
  // the stock surprise is the point of the damaged case here, so its printer is always out
  '03-plans': { case: ['damaged', 'planted'], stock: ['out'], plan: [false, true], approval: ['none', 'plan'], decide: DECISIONS },
  // chapter 4's step budget, highest first; the detector off or at its default
  '04-budgets': { steps: [12, 8, 4], repeat: [null, 3] },
  '05-memory': { mem: ['full', 'summary', 'pinned'] },
  '06-sub-agents': { helpers: [false, true] },
};
/** The workbench (chapter 7): per case, each chapter's controls for it, over that chapter's recording. */
export const WORKBENCH_DOMAINS: Record<string, { scenario: string; domain: Domain }[]> = {
  refund: [{ scenario: '01-workflow-or-agent', domain: { case: ['refund'], mode: ['script', 'agent'] } }],
  damaged: [
    { scenario: '01-workflow-or-agent', domain: { case: ['damaged'], stock: ['in', 'out'], mode: ['script', 'agent'] } },
    { scenario: '03-plans', domain: { case: ['damaged'], stock: ['out'], plan: [false, true], approval: ['none', 'plan'], decide: DECISIONS } },
  ],
  planted: [{ scenario: '03-plans', domain: { case: ['planted'], plan: [false, true], approval: ['none', 'plan'], decide: DECISIONS } }],
  timeout: [{ scenario: '04-budgets', domain: DOMAINS['04-budgets'] }],
  storm: [{ scenario: '05-memory', domain: DOMAINS['05-memory'] }, { scenario: '06-sub-agents', domain: DOMAINS['06-sub-agents'] }],
};

/** Every combination of a domain's values. */
export function combos(d: Domain): Partial<Setup>[] {
  return Object.entries(d).reduce<Partial<Setup>[]>(
    (acc, [k, vals]) => acc.flatMap((s) => (vals as unknown[]).map((v) => ({ ...s, [k]: v }))), [{}]);
}

export type Step =
  | { kind: 'send'; tools: Tool[] }
  | { kind: 'plan'; turn: number; items: string[]; text: string }
  /** a person's answer on a plan, or on a call outside the approved plan */
  | { kind: 'approval'; items: string[]; decision: Decision | 'pending' }
  | { kind: 'proposal'; turn: number; call: Call; text: string }
  | { kind: 'validation'; call: Call; errors: string[] }
  | { kind: 'call'; call: Call }
  | { kind: 'helper'; call: Call; run: Run }
  | { kind: 'repeat'; call: Call; times: number }
  | { kind: 'result'; call: Call; result: ToolResult; key: string }
  | { kind: 'compact'; dropped: string[]; summary: string; pins: string[] }
  | { kind: 'answer'; turn: number; text: string }
  | { kind: 'budget'; text: string }
  | { kind: 'halt'; call: Call; text: string }
  | { kind: 'norecord'; signature: string; text: string };
/** One model turn's tokens (KTD5): input is the whole context, re-sent every turn; output is the turn's text, plan and calls. */
export interface Meter { turn: number; context: string; reply: string; input: number; output: number }
export interface Run {
  /** failed: script mode only, a step the script did not foresee went wrong */
  status: 'done' | 'stuck' | 'out-of-budget' | 'waiting' | 'norecord' | 'failed';
  steps: Step[];
  /** this run's copy of the orders, refunds included */
  orders: Order[];
  /** every email sent, in order */
  mail: Email[];
  /** every JSON-RPC message, in order */
  log: LogEntry[];
  /** the signature looked up before each model turn (a helper's are in its own run) */
  signatures: string[];
  meter: Meter[];
}
export const stepsOf = <K extends Step['kind']>(r: Run, kind: K) => r.steps.filter((s): s is Extract<Step, { kind: K }> => s.kind === kind);
export const answerOf = (r: Run) => stepsOf(r, 'answer')[0]?.text ?? '';
export const tokens = (s: string) => Math.ceil(new TextEncoder().encode(s).length / BYTES_PER_TOKEN);
/** All tokens a run used, its helpers' included. */
export const totalTokens = (r: Run): number =>
  r.meter.reduce((n, m) => n + m.input + m.output, 0) + stepsOf(r, 'helper').reduce((n, h) => n + totalTokens(h.run), 0);

export const SYSTEM = 'You are the Larkspur Supply Co. support assistant. Work the case with the tools listed until it is done, then say so in one short answer.';
const keyOf = (c: Call) => [c.name, ...(c.arguments.order_id === undefined ? [] : [c.arguments.order_id])].join(':');

interface World { orders: Order[]; mail: Email[]; log: LogEntry[]; client: Map<string, ReturnType<typeof connect>>; listed: Tool[] }

export function run(rec: Recording, setup: Partial<Setup> = {}): Run {
  const s: Setup = { ...DEFAULTS, case: Object.keys(rec.asks)[0], ...setup };
  const orders = structuredClone([...ORDERS, ...CASE_ORDERS]), mail: Email[] = [], log: LogEntry[] = [];
  const stock = { ...CASES.stock, 'WR-4': s.stock === 'in' ? CASES.stock['WR-4'] : 0 };
  const b = bundle(stock, mail), client = new Map<string, ReturnType<typeof connect>>(), listed: Tool[] = [];
  for (const id of Object.keys(AGENT_SERVERS)) {
    if (!b.servers[id].tools.some((t) => rec.tools.includes(t))) continue;
    const c = connect(createServer(id, { orders }, b), log);
    const res = c.request('tools/list');
    if ('result' in res) for (const t of res.result.tools as Tool[]) if (rec.tools.includes(t.name)) { client.set(t.name, c); listed.push(t); }
  }
  const w: World = { orders, mail, log, client, listed };
  return s.mode === 'script' ? script(s, w) : agent(rec, s, w);
}

// Larkspur's fixed code path for the two routine cases: the same calls every time, and no step for a surprise.
const SCRIPTS: Record<string, { order: number; calls: string[] }> = {
  refund: { order: 1024, calls: ['get_order', 'issue_refund', 'send_email'] },
  damaged: { order: 1042, calls: ['get_order', 'create_replacement', 'send_email'] },
};
function script(s: Setup, w: World): Run {
  const steps: Step[] = [], { order, calls } = SCRIPTS[s.case];
  const end = (status: Run['status']): Run => ({ status, steps, orders: w.orders, mail: w.mail, log: w.log, signatures: [], meter: [] });
  const o = w.orders.find((x) => x.id === order)!;
  const ARGS: Record<string, Record<string, unknown>> = {
    get_order: { order_id: order },
    issue_refund: { order_id: order, amount: o.total, reason: 'customer_request' },
    create_replacement: { order_id: order },
    send_email: { order_id: order, body: s.case === 'refund'
      ? `Hello ${o.customer}, we have refunded ${money(o.total)} on order ${order}. Larkspur Supply Co.`
      : `Hello ${o.customer}, a replacement for order ${order} is on its way. Larkspur Supply Co.` },
  };
  for (const [i, name] of calls.entries()) {
    const call: Call = { id: `step_${i + 1}`, name, arguments: ARGS[name] };
    steps.push({ kind: 'call', call });
    const res = w.client.get(name)!.request('tools/call', { name, arguments: call.arguments });
    const result = 'result' in res ? (res.result as unknown as ToolResult) : toolError(res.error.message);
    steps.push({ kind: 'result', call, result, key: `${keyOf(call)}:${result.isError ? 'error' : 'ok'}` });
    if (result.isError) {
      steps.push({ kind: 'halt', call, text: `The script stopped: ${name} failed, and the script has no step for that.` });
      return end('failed');
    }
  }
  return end('done');
}

function agent(rec: Recording, s: Setup, w: World): Run {
  const steps: Step[] = [], signatures: string[] = [], meter: Meter[] = [];
  const names = s.helpers ? [...rec.tools, DELEGATE.name] : rec.tools;
  const tools = names.map((n) => (n === DELEGATE.name ? DELEGATE : w.listed.find((t) => t.name === n)!));
  steps.push({ kind: 'send', tools });
  const end = (status: Run['status']): Run => ({ status, steps, orders: w.orders, mail: w.mail, log: w.log, signatures, meter });
  const fixed = [SYSTEM, `Tools: ${JSON.stringify(tools)}`, `Task: ${rec.asks[s.case]}`];

  // hist is what the signature sees; msgs is the same history as the model reads it
  let hist: string[] = [], msgs: string[] = [], plan: PlanState = s.plan ? 'on' : 'off', compacted = false, d = 0;
  const pins: string[] = [], approved = new Set<string>();
  // the repeat detector's memory, and the turn it fired on
  let same = '', times = 0, stopped: number | null = null;
  for (let turnNo = 0; ; turnNo++) {
    if (turnNo >= s.steps) { steps.push({ kind: 'budget', text: `Stopped: out of steps. This host allows ${s.steps} steps per run.` }); return end('out-of-budget'); }
    const context = [...fixed, ...(compacted && pins.length ? [`Pinned: ${pins.join(' ')}`] : []), ...msgs].join('\n');
    const input = tokens(context);
    if (input > s.context) { steps.push({ kind: 'budget', text: `Stopped: this turn needs ${input} tokens of context, over the host's budget of ${s.context}.` }); return end('out-of-budget'); }
    const sig = signature({ case: s.case, tools: names, plan, mem: s.mem, hist });
    signatures.push(sig);
    const turn = lookup(rec, sig);
    if (turn === NORECORD) {
      steps.push({ kind: 'norecord', signature: sig, text: 'No recording for this setup: the model’s turn here was never recorded, so the run stops.' });
      return end('norecord');
    }
    const reply = [turn.text, ...(turn.plan ? [JSON.stringify(turn.plan)] : []), ...(turn.calls ? [JSON.stringify(turn.calls)] : [])].join('\n');
    meter.push({ turn: turnNo, context, reply, input, output: tokens(reply) });
    msgs.push(reply);

    if (turn.plan) {
      steps.push({ kind: 'plan', turn: turnNo, items: turn.plan, text: turn.text });
      let decision: Decision | undefined = 'approve';
      if (s.approval === 'plan') {
        decision = s.decide[d++];
        steps.push({ kind: 'approval', items: turn.plan, decision: decision ?? 'pending' });
        if (!decision) return end('waiting');
      }
      plan = decision === 'approve' ? 'approved' : 'rejected';
      if (plan === 'approved') { approved.clear(); turn.plan.forEach((i) => approved.add(i)); }
      hist.push(`plan:${plan}`);
      msgs.push(`The plan was ${plan}.`);
      continue;
    }
    if (!turn.calls?.length) { steps.push({ kind: 'answer', turn: turnNo, text: turn.text }); return end(stopped === null ? 'done' : 'stuck'); }

    for (const call of turn.calls) {
      steps.push({ kind: 'proposal', turn: turnNo, call, text: turn.text });
      const tool = tools.find((t) => t.name === call.name);
      const errors = tool ? validate(tool.inputSchema, call.arguments) : [`${call.name} is not one of the tools this host offers`];
      steps.push({ kind: 'validation', call, errors });
      const key = keyOf(call);
      let result: ToolResult | undefined, outcome = 'invalid';
      if (errors.length) result = toolError(errors.join('. '));
      else if (s.approval === 'plan' && plan === 'approved' && !approved.has(key)) {
        // a call outside the approved plan goes back to the person (KTD11)
        const decision = s.decide[d++];
        steps.push({ kind: 'approval', items: [key], decision: decision ?? 'pending' });
        if (!decision) return end('waiting');
        if (decision === 'reject') { result = toolError('The person reviewing the plan rejected this call. Nothing ran.'); outcome = 'rejected'; }
        else approved.add(key);
      }
      if (!result && call.name === DELEGATE.name) {
        const helper = agent(rec, { ...s, case: `order-${call.arguments.order_id}`, helpers: false, plan: false, mem: 'full' }, w);
        steps.push({ kind: 'helper', call, run: helper });
        result = helper.status === 'done' ? text({ order_id: call.arguments.order_id, report: answerOf(helper) }) : toolError(`The helper stopped without finishing (${helper.status}).`);
        outcome = result.isError ? 'error' : 'ok';
      } else if (!result) {
        steps.push({ kind: 'call', call });
        const res = w.client.get(call.name)!.request('tools/call', { name: call.name, arguments: call.arguments });
        result = 'result' in res ? (res.result as unknown as ToolResult) : toolError(res.error.message);
        // check_stock's answer is the one thing the model branches on, so its outcome says in or out
        outcome = result.isError ? 'error' : call.name === 'check_stock' ? (result.structuredContent!.in_stock ? 'in' : 'out') : 'ok';
        const note = call.name === 'get_order' && result.structuredContent?.note;
        if (note && s.mem === 'pinned') pins.push(`Order ${call.arguments.order_id}, the customer's note: "${note}"`);
      }
      // the repeat detector (KTD6): the same failing call, the same way, N times in a row
      const now = JSON.stringify([call.name, call.arguments, outcome]);
      times = now === same ? times + 1 : 1;
      same = now;
      if (s.repeat && result.isError && times >= s.repeat) {
        steps.push({ kind: 'repeat', call, times });
        result = toolError(`Stopped: this call failed the same way ${times} times in a row, so the host will not run it again.`);
        outcome = 'stopped';
        stopped ??= turnNo;
      }
      steps.push({ kind: 'result', call, result, key: `${key}:${outcome}` });
      hist.push(`${key}:${outcome}`);
      msgs.push(result.content[0].text);
    }
    // the turn after the detector fires is the model's last: its calls run, then the run ends stuck
    if (stopped !== null && turnNo > stopped) return end('stuck');

    if (s.mem !== 'full' && tokens(msgs.join('\n')) > COMPACT_AT) {
      const summary = `Summary of the work so far (older messages were dropped to save context): ${hist.map((k) => k.replaceAll(':', ' ')).join('; ')}.`;
      steps.push({ kind: 'compact', dropped: hist, summary, pins: s.mem === 'pinned' ? [...pins] : [] });
      hist = ['summary'];
      msgs = [summary];
      compacted = true;
    }
  }
}
