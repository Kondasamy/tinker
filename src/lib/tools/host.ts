// The deterministic host loop (KTD10, R18): send the tool list, read the recorded model turn, validate its
// arguments, apply the approval gate, run the call on the MCP-shaped server, append the result, fetch the next turn.
// Only the model's turns are recorded; everything else here is computed, so every control changes the outcome honestly.
import { validate } from './schema';
import { connect, createServer, describe, ORDERS, SERVERS, toolError, type LogEntry, type Order, type ServerId, type Tool, type ToolResult } from './server';
import { lookup, NORECORD, signature, type Call, type Desc, type Recording } from './turns';

export type Decision = 'approve' | 'deny';
export interface Setup {
  desc: Desc;
  /** approval gate: calls to tools that change data wait for a person */
  gate: boolean;
  /** most tool calls one request may make */
  cap: number;
  /** issue_refund's refund limit in dollars; null = none */
  limit: number | null;
  /** order tools refuse orders that belong to another customer */
  check: boolean;
  /** the gate's answer, fixed or per call; undefined leaves the call waiting */
  decide?: Decision | ((call: Call) => Decision | undefined);
}
export const DEFAULTS: Setup = { desc: 'clear', gate: false, cap: 6, limit: null, check: false };

/** The finite values each scenario's chapter controls can take; the coverage test runs every combination. */
export type Domain = { [K in keyof Setup]?: K extends 'decide' ? Decision[] : Setup[K][] };
// limit: none, one that fits a normal refund ($310) but not a planted one ($5,000), and one below both
const SAFETY: Domain = { gate: [false, true], decide: ['approve', 'deny'], limit: [null, 500, 100] };
export const DOMAINS: Record<string, Domain> = {
  'no-tools': {},
  'order-status': { desc: ['clear', 'vague'] },
  'invalid-arg': {},
  'wrong-id': { check: [false, true] },
  parallel: { cap: [1, 6] },
  // chapter 4's call-cap stepper, highest first: the default, just enough for the refund, too few
  'refund-sequence': { cap: [6, 2, 1] },
  'refund-gate': SAFETY,
  injection: SAFETY,
};

/** Every combination of a domain's values: one object per pick of one value for each key. */
export function combosOf<S>(d: { [k: string]: unknown[] | undefined }): Partial<S>[] {
  return Object.entries(d).reduce<Partial<S>[]>(
    (acc, [k, vals]) => acc.flatMap((s) => (vals ?? []).map((v) => ({ ...s, [k]: v }))), [{}]);
}
/** A call's history key: its name, and its order id when it has one, e.g. `get_order:1042`. */
export const keyOf = (c: Call) => [c.name, ...(c.arguments.order_id === undefined ? [] : [c.arguments.order_id])].join(':');
/** Every combination of a scenario's domain values. */
export const combos = (id: string) => combosOf<Setup>(DOMAINS[id]);

export type Step =
  | { kind: 'send'; tools: Tool[] }
  | { kind: 'proposal'; turn: number; call: Call; text: string }
  | { kind: 'validation'; call: Call; errors: string[] }
  | { kind: 'gate'; call: Call; decision: Decision | 'pending' }
  | { kind: 'call'; call: Call }
  | { kind: 'result'; call: Call; result: ToolResult }
  | { kind: 'answer'; text: string }
  | { kind: 'cap'; turn: number; call: Call; limit: number; text: string }
  | { kind: 'norecord'; signature: string; text: string };
export interface Run {
  status: 'done' | 'waiting' | 'capped' | 'norecord';
  steps: Step[];
  /** this run's copy of the orders, refunds included (the ledger) */
  orders: Order[];
  /** every JSON-RPC message, in order */
  log: LogEntry[];
  /** the signature looked up before each model turn */
  signatures: string[];
}
/** A run's steps of one kind, in order. */
export const stepsOf = <S extends { kind: string }, K extends S['kind']>(r: { steps: S[] }, kind: K) =>
  r.steps.filter((s): s is Extract<S, { kind: K }> => s.kind === kind);
/** The text of a run's first answer, or '' when it never answered. */
export const answerOf = (r: { steps: { kind: string; text?: string }[] }) => r.steps.find((s) => s.kind === 'answer')?.text ?? '';

const INJECTED = ORDERS.filter((o) => o.injected).map((o) => o.note!);

export function run(rec: Recording, setup: Partial<Setup> = {}): Run {
  const s = { ...DEFAULTS, ...setup };
  const orders = structuredClone(ORDERS), log: LogEntry[] = [], steps: Step[] = [], signatures: string[] = [];
  const opts = { orders, refundLimit: s.limit, customer: s.check ? rec.customer : undefined };
  const ids = (Object.keys(SERVERS) as ServerId[]).filter((id) => SERVERS[id].tools.some((t) => rec.tools.includes(t)));
  const owner = new Map<string, ReturnType<typeof connect>>();
  const listed: Tool[] = [];
  for (const id of ids) {
    const client = connect(createServer(id, opts), log);
    const res = client.request('tools/list');
    if ('result' in res) for (const t of res.result.tools as Tool[]) if (rec.tools.includes(t.name)) { owner.set(t.name, client); listed.push(t); }
  }
  const tools = rec.tools.map((n) => describe(listed.find((t) => t.name === n)!, s.desc));
  steps.push({ kind: 'send', tools });

  const done = (status: Run['status']): Run => ({ status, steps, orders, log, signatures });
  let last: string[] = [], injection = false, calls = 0;
  for (let turnNo = 0; ; turnNo++) {
    const sig = signature({ tools: rec.tools, desc: s.desc, gate: s.gate, last, injection });
    signatures.push(sig);
    const turn = lookup(rec, sig);
    if (turn === NORECORD) {
      steps.push({ kind: 'norecord', signature: sig, text: 'No recording for this setup: the model’s turn here was never recorded, so the run stops.' });
      return done('norecord');
    }
    if (!turn.calls?.length) { steps.push({ kind: 'answer', text: turn.text }); return done('done'); }
    last = [];
    for (const call of turn.calls) {
      if (calls >= s.cap) {
        steps.push({ kind: 'cap', turn: turnNo, call, limit: s.cap, text: `Stopped: too many calls. This host allows ${s.cap} tool call${s.cap === 1 ? '' : 's'} per request.` });
        return done('capped');
      }
      calls++;
      steps.push({ kind: 'proposal', turn: turnNo, call, text: turn.text });
      const tool = tools.find((t) => t.name === call.name);
      const errors = tool ? validate(tool.inputSchema, call.arguments) : [`${call.name} is not one of the tools this host offers`];
      steps.push({ kind: 'validation', call, errors });
      let result: ToolResult | undefined, outcome = 'invalid';
      if (errors.length) result = toolError(errors.join('. '));
      else if (s.gate && !tool!.annotations.readOnlyHint) {
        const decision = typeof s.decide === 'function' ? s.decide(call) : s.decide;
        steps.push({ kind: 'gate', call, decision: decision ?? 'pending' });
        if (!decision) return done('waiting');
        if (decision === 'deny') { result = toolError('The person reviewing this call denied it. Nothing ran.'); outcome = 'denied'; }
      }
      if (!result) {
        steps.push({ kind: 'call', call });
        const res = owner.get(call.name)!.request('tools/call', { name: call.name, arguments: call.arguments });
        result = 'result' in res ? (res.result as unknown as ToolResult) : toolError(res.error.message);
        outcome = result.isError ? 'error' : 'ok';
        injection ||= !result.isError && result.content.some((c) => INJECTED.some((n) => c.text.includes(n)));
      }
      steps.push({ kind: 'result', call, result });
      const orderId = call.arguments.order_id;
      last.push([call.name, ...(orderId === undefined ? [] : [orderId]), outcome].join(':'));
    }
  }
}
