// Inference's stage (U16): the serving floor's state and pills, the timeline's layout and words, and the stage's
// loading, failed and ready frames.
import { afterAll, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  SERVE_PARTS,
  SERVE_BOARD,
  floorAt,
  serveLabel,
  serveReadouts,
  serveScene,
  serveState,
  type ServeOpts,
} from '../../src/components/scenes/serveScene';
import { laneName, serverTimeline, timelineLabel } from '../../src/components/scenes/serverTimeline';
import { InferenceStage, TimelineView, loadModel, setModelFiles } from '../../src/content/inference/kit';
import { OPEN, REQUESTS, serve } from '../../src/lib/inference/server';
import { fetchLoader } from '../../src/lib/rag/load';

const draw = (o: ServeOpts) =>
  renderToString(createElement(IsoStage, { board: SERVE_BOARD, scene: serveScene(o), label: serveLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
const run = serve(OPEN, { mode: 'continuous', cap: 8, kvRoomGB: 14 });
afterAll(() => setModelFiles(fetchLoader('/data/lm/')));

describe('the serving floor', () => {
  it('one seat per request the cap allows, lit by phase', () => {
    const svg = draw({ seats: ['prefill', 'decode', 'decode', 'empty'], queued: 3, kv: 0.42 });
    expect(count(svg, 'data-seat="prefill"')).toBe(1);
    expect(count(svg, 'data-seat="decode"')).toBe(2);
    expect(count(svg, 'data-seat="empty"')).toBe(1);
    expect(count(svg, 'class="waiting"')).toBe(3);
    expect(svg).toContain('data-filled="4"');
    expect(svg).toContain('KV CACHE · 42%');
  });

  it('the queue draws at most six envelopes; its pill counts them all', () => {
    const svg = draw({ seats: ['decode'], queued: 11, kv: 0 });
    expect(count(svg, 'class="waiting"')).toBe(6);
    expect(svg).toContain('QUEUE · 11');
  });

  it('at 390px only the server’s pill shows; the caption carries the counts', () => {
    const o: ServeOpts = { seats: ['prefill', 'decode'], queued: 2, kv: 0.5, draft: { drafted: 3, accepted: 1 } };
    const svg = draw({ ...o, scale: 2 });
    expect(count(svg, 'class="block-tag"')).toBe(1);
    expect(svg).toContain('>SERVER<');
    expect(serveReadouts(o)).toEqual(['2 of 2 seats busy', '2 waiting', 'KV cache 50% full', 'draft: 1 of 3 kept']);
  });

  it('the draft runner stands only for speculative decoding, its kept guesses lit', () => {
    expect(draw({ seats: ['decode'], queued: 0, kv: 0 })).not.toContain('data-prop="draft"');
    const svg = draw({ seats: ['decode'], queued: 0, kv: 0, draft: { drafted: 4, accepted: 2 } });
    expect(count(svg, 'data-kept="1"')).toBe(2);
    expect(count(svg, 'data-kept="0"')).toBe(2);
  });

  it('reads a server run: the busiest iteration by default, its seats from the run', () => {
    const f = floorAt(run),
      st = serveState(f);
    expect(st.cap).toBe(8);
    expect(st.prefill + st.decode).toBe(Math.max(...run.iterations.map(i => i.prefill.length + i.decode.length)));
    expect(serveState(floorAt(run, 0)).prefill).toBe(1);
  });

  it('says what it shows', () => {
    expect(serveLabel({ seats: ['empty'], queued: 0, kv: 0 })).toBe(
      'A serving floor: 0 requests waiting on the queue belt; a server rack with 1 batch seat, 0 reading a prompt and 0 writing a reply; the KV cache shelf beside it 0% full.',
    );
  });
});

describe('the server timeline', () => {
  it('one lane per request, phases in order, the scale fits the last finish', () => {
    const t = serverTimeline(run);
    expect(t.lanes).toHaveLength(REQUESTS.length);
    for (const l of t.lanes) {
      expect(l.queue.x + l.queue.w).toBeCloseTo(l.prefill.x, 6);
      expect(l.prefill.x + l.prefill.w).toBeCloseTo(l.decode.x, 6);
      expect(l.decode.x + l.decode.w).toBeLessThanOrEqual(t.w + 1e-6);
    }
    expect(serverTimeline(run, { phone: true }).w).toBeLessThan(t.w);
  });

  it('a lane’s read-out names its wait to first token and finish time', () => {
    const t = serverTimeline(run),
      name = laneName(t.lanes[0], t.lanes.length);
    expect(name).toMatch(
      /^Request 1 of 24 \(420 prompt tokens, 60 reply tokens\): arrived at 0\.00 s, waited \d+ ms for its first token, then [\d.]+ ms per token; finished at [\d.]+ s$/,
    );
    expect(timelineLabel(run)).toContain('continuous batching, batch cap 8');
  });

  it('draws focusable lanes, one in the tab order', () => {
    const html = renderToString(createElement(TimelineView, { result: run }));
    expect(count(html, 'role="listitem"')).toBe(24);
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(html).toContain('arrow keys');
  });
});

describe('the stage', () => {
  const show = () => ({ scene: { seats: ['decode' as const], queued: 0, kv: 0 }, caption: 'cap' });
  it('holds its frame with a loading pill, then Retry when a load fails, then the floor', async () => {
    setModelFiles(async () => new Promise<ArrayBuffer>(() => {}));
    expect(renderToString(createElement(InferenceStage, { weights: ['base'], show }))).toContain(
      'Loading Larkspur mini',
    );
    setModelFiles(async () => {
      throw new Error('offline');
    });
    await loadModel('base').catch(() => {});
    expect(renderToString(createElement(InferenceStage, { weights: ['base'], show }))).toContain('Retry');
    setModelFiles(async f => {
      const b = readFileSync('public/data/lm/' + f);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    });
    await loadModel('base');
    const html = renderToString(createElement(InferenceStage, { weights: ['base'], show }));
    expect(html).toContain('data-model="ready"');
    expect(html).toContain('data-prop="server"');
  });
  it('needs no model when it shows only the server, and escapes the caption', () => {
    const html = renderToString(
      createElement(InferenceStage, { show: () => ({ ...show(), caption: '<script>x</script>' }) }),
    );
    expect(html).toContain('data-prop="server"');
    expect(html).not.toContain('<script>x');
  });
});

describe("a step's callout on the picture", () => {
  const base: ServeOpts = {
    seats: ['prefill', 'decode', 'empty'],
    queued: 2,
    kv: 0.5,
    draft: { drafted: 4, accepted: 2 },
  };
  const callouts = (svg: string) => svg.split('class="callout"').length - 1;
  it.each(['server', 'queue', 'kv', 'draft'])('draws one lit callout over %s', part => {
    expect(SERVE_PARTS).toContain(part);
    const svg = draw({ ...base, say: { block: part, text: 'LOOK HERE' } });
    expect(callouts(svg)).toBe(1);
    expect(svg.slice(svg.indexOf('class="callout"'))).toContain('LOOK HERE');
  });
  it('draws none for a part the scene does not have', () => {
    expect(callouts(draw({ ...base, say: { block: 'nowhere', text: 'LOOK HERE' } }))).toBe(0);
  });
  it('with no callout the picture is unchanged', () => {
    expect(draw({ ...base, say: undefined })).toBe(draw(base));
    expect(draw({ ...base, say: { block: 'nowhere', text: 'X' } })).toBe(draw(base));
  });
  it('on phones a callout over 16 characters is dropped', () => {
    const at = (text: string) => callouts(draw({ ...base, scale: 2, say: { block: 'server', text } }));
    expect(at('SIXTEEN CHARS OK')).toBe(1);
    expect(at('SEVENTEEN CHARS X')).toBe(0);
  });
});
