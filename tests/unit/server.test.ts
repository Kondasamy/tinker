import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { connect, createServer, PROTOCOL_VERSION, TOOLS, type Response } from '../../src/lib/tools/server';

const ok = (r: Response) => {
  if (!('result' in r)) throw new Error(JSON.stringify(r));
  return r.result as any;
};
const err = (r: Response) => {
  if (!('error' in r)) throw new Error(JSON.stringify(r));
  return r.error;
};
const meta = {
  'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
  'io.modelcontextprotocol/clientCapabilities': {},
};

describe('MCP-shaped server', () => {
  it('server/discover returns the supported versions and capabilities', () => {
    const c = connect(createServer('orders'));
    const r = ok(c.request('server/discover'));
    expect(r.resultType).toBe('complete');
    expect(r.supportedVersions).toContain(PROTOCOL_VERSION);
    expect(r.capabilities).toEqual({ tools: {}, resources: {}, prompts: {} });
    expect(r.serverInfo.name).toBe('larkspur-orders');
    expect(err(c.request('initialize')).code).toBe(-32601);
  });

  it('tools/list returns every tool with its schema', () => {
    const tools = [
      ...ok(connect(createServer('orders')).request('tools/list')).tools,
      ...ok(connect(createServer('calendar')).request('tools/list')).tools,
    ];
    expect(tools.map((t: any) => t.name).sort()).toEqual(TOOLS.map(t => t.name).sort());
    for (const t of tools) {
      expect(t.inputSchema.type).toBe('object');
      expect(t.description).toBeTruthy();
      expect(t).not.toHaveProperty('vague');
    }
  });

  it('tools/call for an unknown tool returns a JSON-RPC error', () => {
    const e = err(connect(createServer('orders')).request('tools/call', { name: 'delete_everything', arguments: {} }));
    expect(e).toEqual({ code: -32602, message: 'Unknown tool: delete_everything' });
    // A tool that lives on another server is unknown here too.
    expect(
      err(
        connect(createServer('orders')).request('tools/call', {
          name: 'get_calendar',
          arguments: { date: '2026-10-21' },
        }),
      ).code,
    ).toBe(-32602);
  });

  it('tools/call runs a tool; bad input and business rules come back as tool errors', () => {
    const c = connect(createServer('orders', { refundLimit: 100 }));
    const r = ok(c.request('tools/call', { name: 'get_order', arguments: { order_id: 1042 } }));
    expect(r).toMatchObject({ resultType: 'complete', isError: false, structuredContent: { id: 1042, total: 310 } });
    expect(JSON.parse(r.content[0].text).customer).toBe('Hollis Hardware');
    const bad = ok(c.request('tools/call', { name: 'get_order', arguments: { order_id: '1042' } }));
    expect(bad).toMatchObject({ isError: true, content: [{ type: 'text', text: 'order_id must be an integer' }] });
    const over = ok(
      c.request('tools/call', { name: 'issue_refund', arguments: { order_id: 1042, amount: 310, reason: 'damaged' } }),
    );
    expect(over.isError).toBe(true);
    expect(over.content[0].text).toMatch(/limit/);
    expect(ok(c.request('tools/call', { name: 'get_order', arguments: { order_id: 1999 } })).isError).toBe(true);
    expect(
      ok(
        connect(createServer('calendar')).request('tools/call', {
          name: 'get_calendar',
          arguments: { date: '2026-10-21' },
        }),
      ).structuredContent.events,
    ).toHaveLength(2);
  });

  it('a request without the required _meta fields is rejected; an unsupported version names both', () => {
    const s = createServer('orders');
    expect(s.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32602 },
    });
    expect(
      s.handle({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: { _meta: { 'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION } },
      }),
    ).toMatchObject({ id: 2, error: { code: -32602 } });
    const old = s.handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
      params: { _meta: { ...meta, 'io.modelcontextprotocol/protocolVersion': '2025-11-25' } },
    });
    expect(old).toMatchObject({
      id: 3,
      error: { code: -32022, data: { supported: [PROTOCOL_VERSION], requested: '2025-11-25' } },
    });
  });

  it('every message carries jsonrpc "2.0" and a matching id', () => {
    const c = connect(createServer('orders'));
    c.request('server/discover');
    c.request('tools/list');
    c.request('tools/call', { name: 'get_order', arguments: { order_id: 1047 } });
    c.request('tools/call', { name: 'nope', arguments: {} });
    c.request('resources/list');
    c.request('prompts/get', { name: 'refund_request', arguments: { order_id: '1042', reason: 'damaged' } });
    expect(c.log).toHaveLength(12);
    for (let i = 0; i < c.log.length; i += 2) {
      const [req, res] = [c.log[i].message, c.log[i + 1].message];
      expect(req.jsonrpc).toBe('2.0');
      expect(res.jsonrpc).toBe('2.0');
      expect(res.id).toBe(req.id);
      expect('method' in req && req.params?._meta).toBeTruthy();
    }
    expect(new Set(c.log.map(l => l.message.id)).size).toBe(6);
  });

  it('resources/read returns the policy text from the corpus', () => {
    const c = connect(createServer('orders'));
    const { resources } = ok(c.request('resources/list'));
    expect(resources.map((r: any) => r.title)).toEqual(['Refund Policy', 'Returns FAQ']);
    const r = ok(c.request('resources/read', { uri: resources[0].uri }));
    expect(r.contents[0]).toMatchObject({
      uri: resources[0].uri,
      mimeType: 'text/markdown',
      text: readFileSync('data/corpus/refund-policy-2025.md', 'utf8'),
    });
    expect(err(c.request('resources/read', { uri: 'larkspur://policies/salaries' })).code).toBe(-32602);
    expect(ok(connect(createServer('calendar')).request('resources/list')).resources).toEqual([]);
  });

  it('prompts/get fills the refund request template', () => {
    const c = connect(createServer('orders'));
    expect(ok(c.request('prompts/list')).prompts.map((p: any) => p.name)).toEqual(['refund_request']);
    const p = ok(
      c.request('prompts/get', {
        name: 'refund_request',
        arguments: { order_id: '1042', reason: 'it arrived damaged' },
      }),
    );
    expect(p.messages[0].role).toBe('user');
    expect(p.messages[0].content.text).toContain('order 1042 because: it arrived damaged');
    expect(err(c.request('prompts/get', { name: 'refund_request', arguments: { order_id: '1042' } })).code).toBe(
      -32602,
    );
    expect(err(c.request('prompts/get', { name: 'nope' })).code).toBe(-32602);
  });

  it('every result says resultType "complete"', () => {
    const c = connect(createServer('orders'));
    for (const m of ['server/discover', 'tools/list', 'resources/list', 'prompts/list'])
      expect(ok(c.request(m)).resultType).toBe('complete');
  });
});
