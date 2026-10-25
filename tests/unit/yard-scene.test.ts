// The switchyard and the latency board (U14): both read off one run, so the picture and the board never disagree.
import { describe, expect, it } from 'vitest';
import {
  yardAt,
  yardLabel,
  yardScene,
  yardState,
  MAX_SHEDS,
  YARD_PARTS,
  idleYard,
} from '../../src/components/scenes/yardScene';
import { EDGES, histogram, latencyBoard, percentilesText } from '../../src/components/scenes/latencyBoard';
import { percentile } from '../../src/lib/load-balancing/percentile';
import { ASSUMPTIONS, SERVERS, policyOf, simulate } from '../../src/lib/load-balancing/sim';

const run = simulate(policyOf({ rule: 'least', states: { cedar: 'dead', dogwood: 'gray' }, checks: 2 }));
const ctx = { top: [] } as never;

describe('the latency board', () => {
  it('at the end of a run its bars are the run’s histogram, and the p99 marker sits at the computed p99', () => {
    const b = latencyBoard(run, run.end),
      ms = run.served.map(s => s.ms);
    expect(b.bars.map(x => x.count)).toEqual(histogram(ms));
    expect(b.bars.reduce((a, x) => a + x.count, 0)).toBe(run.served.length);
    expect(b.marker!.ms).toBe(percentile(ms, 99));
    expect(b.p99).toBe(run.p99);
  });
  it('fills as requests land: empty at the start, never shrinking, and the marker moves', () => {
    expect(latencyBoard(run, 0).landed).toBe(0);
    expect(latencyBoard(run, 0).marker).toBeNull();
    let last = latencyBoard(run, 0).bars.map(x => x.h);
    for (let t = 200; t <= run.end; t += 200) {
      const now = latencyBoard(run, t).bars.map(x => x.h);
      expect(now.every((h, i) => h >= last[i])).toBe(true);
      last = now;
    }
  });
  it('the read-out gives the percentiles as text', () => {
    const b = latencyBoard(run, run.end);
    expect(percentilesText(b)).toBe(
      `p50 ${Math.round(run.p50).toLocaleString('en-US')} ms, p99 ${Math.round(run.p99).toLocaleString('en-US')} ms, over ${run.served.length} requests.`,
    );
    expect(percentilesText(latencyBoard(run, 0))).toMatch(/^No requests/);
    expect(EDGES[0]).toBe(0);
  });
});

describe('the switchyard', () => {
  it('draws at most 6 sheds, one per server', () => {
    const many = {
      ...idleYard(4, 'x'),
      sheds: Array.from({ length: 9 }, (_, i) => ({ ...idleYard(1, 'x').sheds[0], id: `s${i}` })),
    };
    expect(yardState(many).sheds).toBe(MAX_SHEDS);
    expect(yardScene(many)(ctx).match(/data-prop="s\d"/g)).toHaveLength(MAX_SHEDS);
    expect(yardState(yardAt(run, run.end, 'x')).sheds).toBe(SERVERS.length);
  });
  it('shows trouble from the trouble time: the dead shed pulled with a barrier, the gray one passing its check', () => {
    const before = yardAt(run, ASSUMPTIONS.troubleAtMs - 1, 'x'),
      after = yardAt(run, run.end, 'x');
    expect(before.sheds.map(s => s.state)).toEqual(['fine', 'fine', 'fine', 'fine']);
    expect(yardState(after).lamps).toEqual(['pass', 'pass', 'miss', 'pass']);
    expect(yardState(after).barriers).toEqual(['cedar']);
    expect(yardScene(after)(ctx)).toContain('class="barrier"');
  });
  it('carts on a spur are the requests waiting there, four at most', () => {
    const busy = run.served.find(s => s.t > 2000)!.t,
      y = yardAt(run, busy, 'x');
    expect(yardState(y).carts).toEqual(y.sheds.map(s => Math.min(4, s.waiting)));
  });
  it('exports a part per shed and the switch; pills escape their text and name the state', () => {
    expect(YARD_PARTS).toEqual(['switch', 'ash', 'birch', 'cedar', 'dogwood']);
    const o = { ...idleYard(2, '<b>'), say: { block: 'ash', text: 'Here' } };
    const svg = yardScene(o)(ctx);
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('class="callout"');
    expect(yardLabel(yardAt(run, run.end, 'Least outstanding'))).toContain('Dogwood: slow but answering');
  });
});
