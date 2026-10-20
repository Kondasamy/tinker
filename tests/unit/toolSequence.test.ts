import { describe, it, expect } from 'vitest';
import { transcript } from '../../src/components/scenes/toolSequence';
import { run } from '../../src/lib/tools/host';
import { RECORDINGS } from '../../src/lib/tools/turns';
import { flatScene, type Lane } from '../../src/lib/iso/flat';

const seq = (id: string, setup = {}) => transcript(RECORDINGS[id], run(RECORDINGS[id], setup));
const path = (ms: ReturnType<typeof seq>) => ms.map(m => `${m.from}>${m.to}:${m.kind}${m.stamp ? ':' + m.stamp : ''}`);

describe('transcript: a host run as message cards', () => {
  it('no tools: the question goes in, a guess comes out, the order system is never reached', () => {
    const ms = seq('no-tools');
    expect(path(ms)).toEqual(['emp>host:request', 'host>model:request', 'model>host:result', 'host>emp:result']);
    expect(ms[1].text).toBe('question, no tools');
    expect(ms.some(m => m.to === 'orders')).toBe(false);
  });

  it('a clear description: the model proposes get_order, the host runs it and forwards the result', () => {
    const ms = seq('order-status', { desc: 'clear' });
    expect(path(ms)).toEqual(['emp>host:request', 'host>model:request', 'model>host:request', 'host>orders:request', 'orders>host:result', 'host>model:result', 'model>host:result', 'host>emp:result']);
    expect(ms[2].text).toBe('get_order(order_id: 1042)');
    expect(ms[4].text).toBe('order 1042: delivered');
  });

  it('a vague description: no call at all', () => {
    expect(seq('order-status', { desc: 'vague' }).some(m => m.from === 'model' && m.kind === 'request')).toBe(false);
  });

  it('a string id is stamped INVALID and its error goes straight back to the model, unrun', () => {
    const ms = seq('invalid-arg');
    expect(ms[2]).toMatchObject({ text: 'get_order(order_id: "1042")', stamp: 'INVALID' });
    expect(ms[3]).toMatchObject({ from: 'host', to: 'model', kind: 'error' });
    expect(ms[3].detail).toContain('isError: true');
    expect(ms.filter(m => m.to === 'orders')).toHaveLength(1);   // only the retry runs
  });

  it('the ownership check turns a valid wrong id into an error result from the order system', () => {
    expect(seq('wrong-id', { check: false }).some(m => m.stamp || m.kind === 'error')).toBe(false);
    const checked = seq('wrong-id', { check: true });
    expect(checked.find(m => m.from === 'orders' && m.kind === 'error')?.text).toContain('belongs to another customer');
  });

  it('untrusted text stays text in the figure (KTD12)', () => {
    const lanes: Lane[] = [{ id: 'emp', name: 'Employee' }, { id: 'host', name: 'Host app' }];
    const svg = flatScene(lanes, [{ from: 'emp', to: 'host', kind: 'request', text: '<img src=x onerror=alert(1)>' }]).svg;
    expect(svg).not.toContain('<img');
  });
});
