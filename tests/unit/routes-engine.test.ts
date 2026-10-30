// Finding the way's searches over the hand-made town (U7): breadth-first, Dijkstra and A* with a weight, closures and
// jams. Every effect the chapters teach is pinned in data/routes/pinned.json and re-derived here (KTD7).
import { describe, expect, it } from 'vitest';
import pinned from '../../data/routes/pinned.json' with { type: 'json' };
import { astar } from '../../src/lib/routes/astar';
import { bfs } from '../../src/lib/routes/bfs';
import { dijkstra } from '../../src/lib/routes/dijkstra';
import {
  BRIDGES,
  CUSTOMER,
  DEPOT,
  JUNCTIONS,
  ROADS,
  closedOf,
  costOf,
  guess,
  junction,
  roadName,
} from '../../src/lib/routes/graph';
import { FREE, JAM_ROAD, flipAt, jamMinutesOf, jamOf } from '../../src/lib/routes/traffic';
import { CUT, DETOUR, FASTEST, ROUTE_BRIDGE, SHORTCUTS } from '../../src/lib/routes/story';

const P = pinned.effects;

describe('the town', () => {
  it('has about 30 junctions, unique names, and roads only between neighbouring junctions', () => {
    expect(JUNCTIONS).toHaveLength(30);
    expect(new Set(JUNCTIONS.map(j => j.name)).size).toBe(30);
    for (const r of ROADS) {
      const a = junction(r.a),
        b = junction(r.b);
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y), r.id).toBe(1);
      expect(r.min).toBeGreaterThan(0);
    }
    expect(BRIDGES).toHaveLength(2);
  });
  it('names a road the way the listbox does', () => {
    expect(roadName('bell-quay')).toBe('Bell to Quay, 3 min');
    expect(roadName(JAM_ROAD, jamOf(7))).toBe('Lock to Dock, 7 min');
  });
  it('A*’s guess never overestimates the real minutes to the customer, from any junction', () => {
    for (const j of JUNCTIONS) {
      const r = dijkstra({}, j.id, CUSTOMER);
      expect(guess(j.id, CUSTOMER), j.id).toBeLessThanOrEqual(r.minutes + 1e-9);
    }
  });
  it('drops unknown roads from a saved closure list', () => {
    expect(closedOf(['lock-weir', 'nowhere', 3, 'lock-weir'])).toEqual(['lock-weir']);
    expect(closedOf('x')).toEqual([]);
  });
});

describe('fewest roads against fewest minutes (chapter 2)', () => {
  it('breadth-first’s route has fewer roads but takes more minutes than Dijkstra’s, as pinned', () => {
    const b = bfs(),
      d = dijkstra();
    expect({ roads: b.roads.length, minutes: b.minutes, looked: b.looked }).toEqual(P.bfs);
    expect({ roads: d.roads.length, minutes: d.minutes, looked: d.looked }).toEqual(P.dijkstra);
    expect(b.roads.length).toBeLessThan(d.roads.length);
    expect(b.minutes).toBeGreaterThan(d.minutes);
  });
  it('no route with fewer roads exists than breadth-first’s', () => {
    // every junction's hop count is its settle order's: breadth-first settles in non-decreasing hops
    const hops = bfs().settles.map(s => s.g);
    expect(hops).toEqual([...hops].sort((a, b) => a - b));
  });
});

describe('Dijkstra and A* (chapters 3 and 4)', () => {
  it('Dijkstra settles junctions in non-decreasing minutes', () => {
    const gs = dijkstra().settles.map(s => s.g);
    for (let i = 1; i < gs.length; i++) expect(gs[i]).toBeGreaterThanOrEqual(gs[i - 1]);
    expect(dijkstra().path[0]).toBe(DEPOT);
    expect(dijkstra().path.at(-1)).toBe(CUSTOMER);
  });
  it('A* at weight 1 finds the same minutes and settles fewer junctions, as pinned', () => {
    const a = astar(1),
      d = dijkstra();
    expect({ minutes: a.minutes, looked: a.looked }).toEqual(P.astar);
    expect(a.minutes).toBe(d.minutes);
    expect(a.looked).toBeLessThan(d.looked);
  });
  it('A* at weight 1 matches Dijkstra’s minutes to every junction', () => {
    for (const j of JUNCTIONS) expect(astar(1, {}, DEPOT, j.id).minutes, j.id).toBe(dijkstra({}, DEPOT, j.id).minutes);
  });
  it('a heavier weight never costs more than weight × the fastest (weighted A*’s bound)', () => {
    for (const w of [1.5, 2, 3])
      for (const j of JUNCTIONS)
        expect(astar(w, {}, DEPOT, j.id).minutes).toBeLessThanOrEqual(w * dijkstra({}, DEPOT, j.id).minutes + 1e-9);
  });
  it('the frontier holds only unsettled junctions', () => {
    const r = dijkstra();
    r.settles.forEach((s, i) => {
      const done = new Set(r.settles.slice(0, i + 1).map(x => x.id));
      for (const o of s.frontier) expect(done.has(o.id)).toBe(false);
    });
  });
});

describe('closures and jams (chapters 1 and 5)', () => {
  it('closing the bridge on the route reroutes over the other bridge, as pinned', () => {
    expect(ROUTE_BRIDGE).toBe(P.bridge);
    expect(FASTEST.roads).toContain(ROUTE_BRIDGE);
    expect(DETOUR.found).toBe(true);
    expect(DETOUR.roads).not.toContain(ROUTE_BRIDGE);
    expect(DETOUR.minutes).toBe(P.detour);
    expect(costOf(ROUTE_BRIDGE, { closed: [ROUTE_BRIDGE] })).toBe(Infinity);
  });
  it('closing both bridges cuts the town: every search reports no route and holds the van', () => {
    expect(CUT.found).toBe(false);
    expect(CUT.path).toEqual([]);
    expect(bfs({ closed: BRIDGES }).found).toBe(false);
    expect(astar(2, { closed: BRIDGES }).found).toBe(false);
  });
  it('a pinned jam flips the route', () => {
    expect(flipAt()).toBe(P.flipAt);
    expect(dijkstra(jamOf(P.flipAt - 1)).roads).toContain(JAM_ROAD);
    expect(dijkstra(jamOf(P.flipAt)).roads).not.toContain(JAM_ROAD);
    expect(jamMinutesOf('x')).toBe(FREE);
  });
  it('a shortcut stores the fastest minutes between its ends', () => {
    for (const s of SHORTCUTS) expect(s.minutes).toBe(dijkstra({}, s.a, s.b).minutes);
  });
});
