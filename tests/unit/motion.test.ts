// @vitest-environment happy-dom
// The living-scene layer (KTD2, KTD4, KTD6): useSceneMotion's t runs 0 → 1 once and holds, reduced motion and hidden
// tabs jump to the end with no start frame, an interrupt restarts from the state being moved to; a scene at rest equals
// its still; close-up zoom fits the part and eases back; hit targets share the twin's handler, snap back on a refusal
// and on Escape, and are inert while busy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement as h, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  calloutOf,
  closeUpZoom,
  lerp,
  lerpPt,
  lerpZoom,
  openness,
  pillScale,
  useCloseUp,
  useLivingStage,
  useSceneMotion,
} from '../../src/lib/iso/motion';
import HitLayer, { type Drag } from '../../src/lib/iso/hits';
import { SAMPLE_BOARD, SAMPLE_HITS, sampleScene, sampleStill, type Sample } from '../../src/dev/motion-fixture';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// a hand-driven clock: frames run only when the test says so
let now = 0,
  frames: FrameRequestCallback[] = [],
  reduced = false;
const tick = (ms: number) =>
  act(() => {
    now += ms;
    const run = frames;
    frames = [];
    for (const f of run) f(now);
  });

let root: Root, host: HTMLElement;
beforeEach(() => {
  now = 1000;
  frames = [];
  reduced = false;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames[id - 1] = () => {};
  });
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('reduce') && reduced,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type Seen = { state: string; prev: string; t: number };
function motionHarness(ms = 400) {
  const seen: Seen[] = [];
  let set: (s: string) => void = () => {};
  function Probe() {
    const [state, setState] = useState('a');
    set = setState;
    const { prev, t } = useSceneMotion(state, ms);
    seen.push({ state, prev, t });
    return null;
  }
  act(() => root.render(h(Probe)));
  const last = () => seen[seen.length - 1];
  return { seen, last, go: (s: string) => act(() => set(s)) };
}

describe('useSceneMotion', () => {
  it('starts at rest, then runs t from 0 to 1 over the duration and stays at 1', () => {
    const m = motionHarness(400);
    expect(m.last()).toEqual({ state: 'a', prev: 'a', t: 1 });
    m.go('b');
    expect(m.last()).toEqual({ state: 'b', prev: 'a', t: 0 });
    tick(200);
    expect(m.last().t).toBeCloseTo(0.5); // eased: ease(0.5) = 0.5
    tick(100);
    expect(m.last().t).toBeGreaterThan(0.5);
    expect(m.last().t).toBeLessThan(1);
    tick(100);
    expect(m.last()).toEqual({ state: 'b', prev: 'a', t: 1 });
    expect(frames).toEqual([]);
    tick(500);
    expect(m.last().t).toBe(1);
    expect(m.seen.every(s => s.t >= 0 && s.t <= 1)).toBe(true);
  });

  it('under reduced motion, a change lands at t = 1 on its first render, with no start frame', () => {
    reduced = true;
    const m = motionHarness();
    m.go('b');
    const forB = m.seen.filter(s => s.state === 'b');
    expect(forB.length).toBeGreaterThan(0);
    expect(forB.every(s => s.t === 1 && s.prev === 'b')).toBe(true);
    expect(frames).toEqual([]);
  });

  it('in a hidden tab, a change lands at once', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const m = motionHarness();
    m.go('b');
    expect(m.seen.filter(s => s.state === 'b').every(s => s.t === 1)).toBe(true);
  });

  it('an interrupt makes the state being moved to prev and restarts at 0, never past 1', () => {
    const m = motionHarness(400);
    m.go('b');
    tick(200);
    m.go('c');
    expect(m.last()).toEqual({ state: 'c', prev: 'b', t: 0 });
    tick(200);
    tick(200);
    tick(200);
    expect(m.last()).toEqual({ state: 'c', prev: 'b', t: 1 });
    expect(m.seen.every(s => s.t <= 1)).toBe(true);
  });
});

describe('interpolation helpers', () => {
  it('lerps numbers and points, and openness eases a part between shut and open', () => {
    expect(lerp(2, 6, 0.25)).toBe(3);
    expect(lerpPt([0, 0, 0], [10, 20, 30], 0.5)).toEqual([5, 10, 15]);
    expect(openness(false, true, 0)).toBe(0);
    expect(openness(false, true, 1)).toBe(1);
    expect(openness(true, false, 0.25)).toBe(0.75);
    expect(openness(true, true, 0.3)).toBe(1);
  });

  it('pills: all shown at rest (scale 2 on phones); while zoomed only the close-up part, growing to 2 with the zoom', () => {
    expect(pillScale('pad-a', { zoomT: 0 })).toBe(1);
    expect(pillScale('pad-a', { zoomT: 0, phone: true })).toBe(2);
    expect(pillScale('pad-a', { zoomT: 0.4, closeUp: ['pad-a'] })).toBeCloseTo(1.4);
    expect(pillScale('pad-a', { zoomT: 1, closeUp: ['pad-a'] })).toBe(2);
    expect(pillScale('pad-a', { zoomT: 0.4, closeUp: ['pad-a'], phone: true })).toBe(2);
    expect(pillScale('pad-b', { zoomT: 0.4, closeUp: ['pad-a'] })).toBe(0);
  });

  it('a close-up zoom fits the part at most 2.2× and at most 70% of the frame; no part, no zoom', () => {
    const small = closeUpZoom(SAMPLE_BOARD, [
      [10, 10, 0],
      [14, 14, 4],
    ]);
    expect(small.k).toBe(2.2);
    const [, , X, Y] = SAMPLE_BOARD;
    const whole = closeUpZoom(
      SAMPLE_BOARD,
      [0, X].flatMap(x => [0, Y].flatMap(y => [0, 55].map(z => [x, y, z]))),
    );
    expect(whole.k).toBe(1);
    for (const z of [small, whole]) {
      expect(z.u).toBeGreaterThanOrEqual(0);
      expect(z.u).toBeLessThanOrEqual(1);
    }
    expect(lerpZoom(undefined, small, 0)).toEqual({ k: 1, u: small.u, v: small.v });
    expect(lerpZoom(undefined, small, 1)).toEqual(small);
    expect(lerpZoom(small, undefined, 1)).toEqual({ k: 1, u: small.u, v: small.v });
  });
});

describe('useCloseUp', () => {
  const Z = { k: 2, u: 0.3, v: 0.6 };
  function harness() {
    const seen: { k: number; zoomT: number }[] = [];
    let set: (p: { z?: typeof Z; s: string }) => void = () => {};
    function Probe() {
      const [p, setP] = useState<{ z?: typeof Z; s: string }>({ s: 'a' });
      set = setP;
      const { zoom, zoomT } = useCloseUp(p.z, p.s, 400);
      seen.push({ k: zoom?.k ?? 1, zoomT });
      return null;
    }
    act(() => root.render(h(Probe)));
    return { seen, last: () => seen[seen.length - 1], go: (p: { z?: typeof Z; s: string }) => act(() => set(p)) };
  }

  it('eases in to the close-up, and any state change pulls back at once (the same render)', () => {
    const m = harness();
    m.go({ z: Z, s: 'reveal' });
    expect(m.last()).toEqual({ k: 1, zoomT: 0 });
    tick(400);
    expect(m.last()).toEqual({ k: 2, zoomT: 1 });
    m.go({ z: Z, s: 'reader acted' });
    expect(m.last()).toEqual({ k: 2, zoomT: 1 }); // pulling back starts from where it is
    tick(400);
    expect(m.last()).toEqual({ k: 1, zoomT: 0 });
  });

  it('with reduced motion, cuts', () => {
    reduced = true;
    const m = harness();
    m.go({ z: Z, s: 'reveal' });
    expect(m.last()).toEqual({ k: 2, zoomT: 1 });
  });
});

describe('useLivingStage', () => {
  type In = { s: Sample; closeUp?: string[] };
  function harness(moves?: (a: Sample, b: Sample) => boolean) {
    const seen: { t: number; k: number; busy: boolean }[] = [];
    let set: (p: In) => void = () => {};
    function Probe() {
      const [p, setP] = useState<In>({ s: { spot: 'pad-a', open: false } });
      set = setP;
      const st = useLivingStage({
        scene: sampleScene,
        state: { ...p.s }, // a new object every render, as StepRunner's stages build them
        moves,
        ms: 400,
        board: SAMPLE_BOARD,
        closeUp: p.closeUp,
        partBox: () => [
          [26, 26, 0],
          [34, 34, 10],
        ],
      });
      seen.push({ t: st.t, k: st.zoom?.k ?? 1, busy: st.busy });
      return null;
    }
    act(() => root.render(h(Probe)));
    return { seen, last: () => seen[seen.length - 1], go: (p: In) => act(() => set(p)) };
  }
  const A: Sample = { spot: 'pad-a', open: false },
    B: Sample = { spot: 'pad-b', open: false };

  it('a new object with the same key neither restarts the motion nor pulls back the close-up', () => {
    const m = harness();
    m.go({ s: A, closeUp: ['crate'] });
    tick(500);
    expect(m.last()).toMatchObject({ t: 1, k: 2.2 });
    m.go({ s: { ...A }, closeUp: ['crate'] }); // e.g. a quiz pick: the picture's state is unchanged
    expect(m.last()).toMatchObject({ t: 1, k: 2.2 });
    expect(frames).toEqual([]);
  });

  it('a change moves() says moves nothing lands at once, targets live', () => {
    const m = harness(() => false);
    m.go({ s: { ...A, open: true } });
    expect(m.last()).toEqual({ t: 1, k: 1, busy: false });
  });

  it('the close-up waits for the motion to land, then zooms', () => {
    const m = harness();
    m.go({ s: B, closeUp: ['crate'] });
    expect(m.last()).toMatchObject({ t: 0, k: 1, busy: true });
    tick(200);
    expect(m.last().k).toBe(1);
    tick(200);
    expect(m.last()).toMatchObject({ t: 1, k: 1 });
    tick(500);
    expect(m.last()).toMatchObject({ t: 1, k: 2.2, busy: true });
  });

  it('callouts hide while zoomed', () => {
    const say = { block: 'pad-a', text: 'Here' };
    expect(calloutOf(say, { zoomT: 0 })).toBe(say);
    expect(calloutOf(say, { zoomT: 0.1 })).toBeUndefined();
  });
});

describe('scenes', () => {
  const draw = (still: unknown, moving?: unknown) =>
    renderToString(h(IsoStage, { board: SAMPLE_BOARD, scene: still, moving, label: 'Sample' } as never));

  it('scene(s, s, 1, { zoomT: 0 }) equals the still, with an empty moving layer', () => {
    for (const s of [
      { spot: 'pad-a', open: false },
      { spot: 'pad-b', open: true },
    ] as Sample[]) {
      const sc = sampleScene(s, s, 1, { zoomT: 0 });
      expect(draw(sc.still, sc.moving)).toBe(draw(sampleStill(s)));
    }
  });

  it('mid-motion the crate is drawn only in the unfiltered moving layer', () => {
    const a: Sample = { spot: 'pad-a', open: false },
      b: Sample = { spot: 'pad-b', open: false };
    const html = draw(sampleScene(a, b, 0.5, { zoomT: 0 }).still, sampleScene(a, b, 0.5, { zoomT: 0 }).moving);
    const [filtered, moving] = html.split('class="iso-moving"');
    expect(moving).toContain('data-prop="crate"');
    expect(filtered).not.toContain('data-prop="crate"');
  });

  it('IsoStage without `moving` draws no moving layer', () => {
    expect(draw(sampleStill({ spot: 'pad-a', open: false }))).not.toContain('iso-moving');
  });
});

describe('hit targets', () => {
  function stage(o: { busy?: boolean; refuse?: string } = {}) {
    const calls: string[] = [],
      drags: (Drag | null)[] = [];
    let status = '';
    // the one handler: the twin button and the in-picture drag both call it
    const handle = (part: string, to?: string | null) => {
      calls.push(`${part}→${to}`);
      if (o.refuse) return (status = o.refuse);
      status = `${part} on ${to}`;
    };
    function Stage() {
      return h(
        'div',
        null,
        h(
          IsoStage,
          { board: SAMPLE_BOARD, scene: sampleStill({ spot: 'pad-a', open: false }), label: 'Sample' },
          h(HitLayer, {
            board: SAMPLE_BOARD,
            hits: SAMPLE_HITS,
            busy: o.busy,
            act: handle,
            onDrag: d => drags.push(d),
          }),
        ),
        h('button', { type: 'button', onClick: () => handle('crate', 'pad-b') }, 'Move to B'),
      );
    }
    act(() => root.render(h(Stage)));
    const hit = (p: string) => host.querySelector<SVGElement>(`[data-hit="${p}"]`)!;
    const centre = (p: string) => {
      const r = hit(p).querySelector('rect')!;
      return {
        x: +r.getAttribute('x')! + +r.getAttribute('width')! / 2,
        y: +r.getAttribute('y')! + +r.getAttribute('height')! / 2,
      };
    };
    const fire = (el: Element, type: string, at: { x: number; y: number }) =>
      act(() => {
        el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: at.x, clientY: at.y, pointerId: 1 }));
      });
    const dragTo = (to: string, finish = true) => {
      const crate = hit('crate').querySelector('rect')!;
      fire(crate, 'pointerdown', centre('crate'));
      fire(crate, 'pointermove', centre(to));
      if (finish) fire(crate, 'pointerup', centre(to));
    };
    return { calls, drags, status: () => status, hit, dragTo, fire, centre };
  }

  it('are hidden from assistive tech, one transparent group per part, at least 44 px at 390', () => {
    const s = stage();
    expect(host.querySelector('.iso-hits')!.getAttribute('aria-hidden')).toBe('true');
    for (const t of SAMPLE_HITS) {
      const r = s.hit(t.part).querySelector('rect')!;
      expect(r.getAttribute('fill')).toBe('transparent');
      expect(+r.getAttribute('width')!).toBeGreaterThan(0);
    }
  });

  it('a drag onto a target calls the same handler, with the same arguments, as the twin button', () => {
    const s = stage();
    s.dragTo('pad-b');
    act(() => host.querySelector('button')!.click());
    expect(s.calls).toEqual(['crate→pad-b', 'crate→pad-b']);
    expect(s.drags.at(-1)).toBeNull();
  });

  it('follows the pointer and lights a legal target while dragging', () => {
    const s = stage();
    s.dragTo('pad-b', false);
    const d = s.drags.at(-1)!;
    expect(d.part).toBe('crate');
    expect(d.over).toBe('pad-b');
    expect(Math.hypot(d.dx, d.dy)).toBeGreaterThan(0);
    expect(s.hit('pad-b').getAttribute('data-state')).toBe('glow');
    expect(s.hit('crate').getAttribute('data-state')).toBe('dragging');
  });

  it('an illegal drop snaps back and the handler’s reason is the status', () => {
    const s = stage({ refuse: 'Pad B is full.' });
    s.dragTo('pad-b');
    expect(s.calls).toEqual(['crate→pad-b']);
    expect(s.status()).toBe('Pad B is full.');
    expect(s.drags.at(-1)).toBeNull();
    expect(s.hit('crate').getAttribute('data-state')).toBe('idle');
  });

  it('a drop on no target calls the handler with null, so it can say why', () => {
    const s = stage({ refuse: 'Drop it on a pad.' });
    const crate = s.hit('crate').querySelector('rect')!;
    const off = { x: s.centre('crate').x, y: s.centre('crate').y + 400 };
    s.fire(crate, 'pointerdown', s.centre('crate'));
    s.fire(crate, 'pointermove', off);
    s.fire(crate, 'pointerup', off);
    expect(s.calls).toEqual(['crate→null']);
    expect(s.status()).toBe('Drop it on a pad.');
    expect(s.drags.at(-1)).toBeNull();
  });

  it('Escape cancels a drag: it snaps back and nothing is called', () => {
    const s = stage();
    s.dragTo('pad-b', false);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(s.drags.at(-1)).toBeNull();
    s.fire(s.hit('crate').querySelector('rect')!, 'pointerup', s.centre('pad-b'));
    expect(s.calls).toEqual([]);
  });

  it('pointercancel cancels too', () => {
    const s = stage();
    s.dragTo('pad-b', false);
    s.fire(s.hit('crate').querySelector('rect')!, 'pointercancel', s.centre('pad-b'));
    expect(s.drags.at(-1)).toBeNull();
    expect(s.calls).toEqual([]);
  });

  it('is inert while busy (moving or zoomed); the twin stays live', () => {
    const s = stage({ busy: true });
    s.dragTo('pad-b');
    expect(s.calls).toEqual([]);
    act(() => host.querySelector('button')!.click());
    expect(s.calls).toEqual(['crate→pad-b']);
  });
});
