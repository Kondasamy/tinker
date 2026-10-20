// A teaching model of the Model Context Protocol (KTD11), not an SDK and not a conforming implementation:
// an in-browser object that answers MCP-shaped JSON-RPC 2.0 (stateless 2026-07-28 shape: no initialize handshake,
// every request carries its version in `_meta`) over a fake transport that records every message for the sequence figure.
import SERVER from '../../../data/tool-calling/server.json';
import ORDERS_JSON from '../../../data/tool-calling/orders.json';
import CALENDAR from '../../../data/tool-calling/calendar.json';
import META from '../../../data/corpus/meta.json';
import { validate, type Schema } from './schema';
import { MCP_VERSION } from './facts';

export const PROTOCOL_VERSION = MCP_VERSION;
const KEY = 'io.modelcontextprotocol/';

export interface Order {
  id: number;
  customer: string;
  items: { part: string; name: string; qty: number; price: number }[];
  total: number;
  status: 'processing' | 'shipped' | 'delivered';
  placed: string;
  delivered: string | null;
  note: string | null;
  /** fixture-only marker for the planted instruction; never sent to the model */
  injected?: boolean;
  refunds: { amount: number; reason: string }[];
}
export interface Tool {
  name: string;
  title: string;
  description: string;
  /** the vague wording chapter 2 starts from; never listed by the server */
  vague?: string;
  inputSchema: Schema;
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean };
}
export interface ToolResult {
  resultType: 'complete';
  content: { type: 'text'; text: string }[];
  isError: boolean;
  structuredContent?: Record<string, unknown>;
}
export type ServerId = keyof typeof SERVER.servers;
export interface ServerDef { name: string; title: string; tools: string[]; resources: string[]; prompts: string[] }
export interface Request { jsonrpc: '2.0'; id: number; method: string; params?: Record<string, any> }
export interface RpcErrorBody { code: number; message: string; data?: unknown }
export type Response =
  | { jsonrpc: '2.0'; id: number; result: Record<string, unknown> }
  | { jsonrpc: '2.0'; id: number; error: RpcErrorBody };
export interface LogEntry { server: string; message: Request | Response }

/** The imported fixtures. Read-only: every server works on its own copy. */
export const ORDERS = ORDERS_JSON as Order[];
// The JSON's inferred types are too narrow (empty lists infer never[]), so the shapes are declared above.
export const TOOLS = SERVER.tools as unknown as Tool[];
export const SERVERS: Record<ServerId, ServerDef> = SERVER.servers;

const DOCS = import.meta.glob<string>('/data/corpus/{refund-policy-2025,returns-faq-2022}.md', { query: '?raw', import: 'default', eager: true });
const uri = (doc: string) => `larkspur://policies/${doc}`;

class RpcError extends Error { constructor(public code: number, message: string, public data?: unknown) { super(message); } }
const invalid = (message: string) => new RpcError(-32602, message);
const money = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const text = (data: Record<string, unknown>): ToolResult => ({ resultType: 'complete', content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false, structuredContent: data });
/** A tool execution error: a normal result the model can read and correct from, not a protocol error. */
export const toolError = (message: string): ToolResult => ({ resultType: 'complete', content: [{ type: 'text', text: message }], isError: true });

export interface ServerOptions {
  /** the orders this server reads and refunds; defaults to a fresh copy of the fixture */
  orders?: Order[];
  /** issue_refund refuses any amount above this (least privilege); null or absent means no limit */
  refundLimit?: number | null;
  /** when set, order tools refuse orders that belong to anyone else */
  customer?: string;
}

export function createServer(id: ServerId, opts: ServerOptions = {}) {
  const def = SERVERS[id], orders = opts.orders ?? structuredClone(ORDERS);
  const tools = TOOLS.filter((t) => def.tools.includes(t.name));
  const info = { name: def.name, title: def.title, version: '1.0.0' };

  const view = ({ injected: _, ...o }: Order) => structuredClone(o);
  function find(orderId: number): Order | string {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return `There is no order ${orderId}.`;
    if (opts.customer && o.customer !== opts.customer) return `Order ${orderId} belongs to another customer, not ${opts.customer}.`;
    return o;
  }
  const RUN: Record<string, (a: any) => ToolResult> = {
    get_order: ({ order_id }) => { const o = find(order_id); return typeof o === 'string' ? toolError(o) : text(view(o)); },
    list_orders_for_customer: ({ customer }) =>
      text({ orders: orders.filter((o) => o.customer === customer).sort((a, b) => b.placed.localeCompare(a.placed)).map(view) }),
    issue_refund: ({ order_id, amount, reason }) => {
      const o = find(order_id);
      if (typeof o === 'string') return toolError(o);
      if (opts.refundLimit != null && amount > opts.refundLimit)
        return toolError(`A refund of ${money(amount)} is over this tool's limit of ${money(opts.refundLimit)}. Nothing was refunded.`);
      o.refunds.push({ amount, reason });
      return text({ order_id, amount, reason, refunded_total: o.refunds.reduce((s, r) => s + r.amount, 0) });
    },
    get_calendar: ({ date }) => text({ date, events: CALENDAR.filter((e) => e.date === date) }),
  };

  const METHODS: Record<string, (p: Record<string, any>) => Record<string, unknown>> = {
    'server/discover': () => ({ supportedVersions: [PROTOCOL_VERSION], capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: info }),
    'tools/list': () => ({ tools: tools.map(({ vague: _, ...t }) => t) }),
    'tools/call': ({ name, arguments: args = {} }) => {
      const tool = tools.find((t) => t.name === name);
      if (!tool) throw invalid(`Unknown tool: ${name}`);
      const errors = validate(tool.inputSchema, args);
      return { ...(errors.length ? toolError(errors.join('. ')) : RUN[name](args)) };
    },
    'resources/list': () => ({
      resources: def.resources.map((doc) => ({ uri: uri(doc), name: doc, title: META.find((m) => m.id === doc)!.title, mimeType: 'text/markdown' })),
    }),
    'resources/read': ({ uri: u }) => {
      const doc = def.resources.find((d) => uri(d) === u);
      if (!doc) throw invalid(`Resource not found: ${u}`);
      return { contents: [{ uri: u, mimeType: 'text/markdown', text: DOCS[`/data/corpus/${doc}.md`] }] };
    },
    'prompts/list': () => ({ prompts: SERVER.prompts.filter((p) => def.prompts.includes(p.name)).map(({ template: _, ...p }) => p) }),
    'prompts/get': ({ name, arguments: args = {} }) => {
      const p = SERVER.prompts.find((x) => x.name === name && def.prompts.includes(name));
      if (!p) throw invalid(`Unknown prompt: ${name}`);
      const missing = p.arguments.find((a) => a.required && !(a.name in args));
      if (missing) throw invalid(`Missing argument: ${missing.name}`);
      return { description: p.description, messages: [{ role: 'user', content: { type: 'text', text: p.template.replace(/\{(\w+)\}/g, (_, k) => String(args[k])) } }] };
    },
  };

  function handle(req: Request): Response {
    const reply = (body: { result: Record<string, unknown> } | { error: RpcErrorBody }): Response => ({ jsonrpc: '2.0', id: req.id, ...body });
    try {
      const { _meta: m, ...params } = req.params ?? {};
      if (!m?.[KEY + 'protocolVersion'] || !m[KEY + 'clientCapabilities'])
        throw invalid(`Every request needs _meta with ${KEY}protocolVersion and ${KEY}clientCapabilities`);
      if (m[KEY + 'protocolVersion'] !== PROTOCOL_VERSION)
        throw new RpcError(-32022, 'Unsupported protocol version', { supported: [PROTOCOL_VERSION], requested: m[KEY + 'protocolVersion'] });
      const method = METHODS[req.method];
      if (!method) throw new RpcError(-32601, `Method not found: ${req.method}`);
      return reply({ result: { resultType: 'complete', ...method(params) } });
    } catch (e) {
      if (!(e instanceof RpcError)) throw e;
      return reply({ error: { code: e.code, message: e.message, ...(e.data === undefined ? {} : { data: e.data }) } });
    }
  }
  return { info, orders, handle };
}
export type Server = ReturnType<typeof createServer>;

/** The client side of the fake transport: numbers each request, stamps `_meta`, and logs both directions. */
export function connect(server: Server, log: LogEntry[] = []) {
  let id = 0;
  function request(method: string, params: Record<string, unknown> = {}): Response {
    const _meta = { [KEY + 'protocolVersion']: PROTOCOL_VERSION, [KEY + 'clientCapabilities']: {}, [KEY + 'clientInfo']: { name: 'larkspur-assistant', version: '1.0.0' } };
    const req: Request = { jsonrpc: '2.0', id: ++id, method, params: { ...params, _meta } };
    log.push({ server: server.info.name, message: req });
    const res = server.handle(req);
    log.push({ server: server.info.name, message: res });
    return res;
  }
  return { server, log, request };
}
