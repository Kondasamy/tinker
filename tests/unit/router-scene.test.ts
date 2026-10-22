// The apprentice's bench, the frontier chart and the Small models stage (U12).
import { afterAll, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  ROUTER_BOARD,
  routerLabel,
  routerScene,
  routerState,
  type RouterOpts,
} from '../../src/components/scenes/routerScene';
import { frontierChart, frontierLabel, pointWords } from '../../src/components/scenes/frontierChart';
import { frontier } from '../../src/lib/small-models/router';
import { bothNow, FrontierChart, SmallStage, STUDENT_SERIES, type Shown } from '../../src/content/small-models/kit';
import { loadModel, setModelFiles } from '../../src/content/fine-tuning/kit';
import { fetchLoader } from '../../src/lib/rag/load';
import type { Meta } from '../../src/lib/lm/load';

const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const disk = async (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const draw = (o: RouterOpts) =>
  renderToString(createElement(IsoStage, { board: ROUTER_BOARD, scene: routerScene(o), label: routerLabel(o) }));
const count = (s: string, x: string) => s.split(x).length - 1;
afterAll(() => setModelFiles(fetchLoader('/data/lm/')));

describe('the apprentice’s bench', () => {
  it('distill mode names Larkspur mini and its student; the chute carries lessons when lit', () => {
    const svg = draw({ mode: 'distill', lessons: true, lit: 'both' });
    for (const x of ['LARKSPUR MINI', 'STUDENT', 'LESSONS']) expect(svg).toContain(x);
    expect(svg).toContain('class="chute" data-on="1"');
    expect(routerLabel({ mode: 'distill', lessons: true, lit: 'both' })).toContain('Lessons run down the chute');
    expect(draw({ mode: 'distill' })).toContain('class="chute" data-on="0"');
  });
  it('route mode lights one belt per route; up lights the small belt and the fallback chute', () => {
    expect(routerState({ mode: 'route', route: 'large' })).toMatchObject({
      belts: { large: true, small: false },
      chute: { on: false },
    });
    expect(routerState({ mode: 'route', route: 'small' })).toMatchObject({
      belts: { large: false, small: true },
      chute: { on: false },
      big: { on: false },
    });
    const up = routerState({ mode: 'route', route: 'up' });
    expect(up).toMatchObject({
      belts: { small: true },
      chute: { on: true, name: 'FALLBACK' },
      big: { on: true },
      small: { on: true },
    });
    const svg = draw({ mode: 'route', route: 'up', threshold: 0.9 });
    expect(svg).toContain('data-belt="small" data-on="1"');
    expect(svg).toContain('data-belt="large" data-on="0"');
    expect(svg).toContain('BELOW 0.9');
    expect(routerLabel({ mode: 'route', route: 'up', threshold: 0.9 })).toContain('fallback chute');
  });
  it('the router lever leans toward the belt it sends to', () => {
    expect(draw({ mode: 'route', route: 'large' })).toContain('data-lean="-1"');
    expect(draw({ mode: 'route', route: 'small' })).toContain('data-lean="1"');
    expect(draw({ mode: 'route' })).toContain('data-lean="0"');
  });
  it('phones keep the models’ pills and drop the idle router and chute pills', () => {
    const svg = draw({ mode: 'route', scale: 2.2 });
    expect(svg).toContain('LARGE');
    expect(svg).not.toContain('>ROUTER<');
    expect(svg).not.toContain('FALLBACK');
    expect(svg).not.toMatch(/NaN|Infinity/);
  });
});

describe('the frontier chart', () => {
  const pts = frontier();
  it('one marker per point, all-large as a square; no NaN', () => {
    const { svg, points } = frontierChart({ points: pts });
    expect(count(svg, 'class="pt"')).toBe(pts.length);
    expect(svg).toContain('<rect class="pt" data-point="all-large"');
    expect(points.map(p => p.id)).toEqual(pts.map(p => p.id));
    for (const x of ['>COST<', '>RIGHT<']) expect(svg).toContain(x);
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
    expect(frontierChart({ points: [] }).svg).not.toMatch(/NaN|Infinity/);
    expect(frontierLabel([])).toContain('no points');
  });
  it('a point reads out its quality and cost', () => {
    const p = pts.find(x => x.threshold === 0.9)!;
    expect(pointWords(p)).toBe(
      `Router, up below 0.9: ${p.right} of ${p.of} right, cost ${Math.round(p.cost * 10) / 10}, ${p.up} sent up`,
    );
  });
  it('the stage’s chart: one tab stop, a marker per point, the chosen point read out', () => {
    const html = renderToString(createElement(FrontierChart, { points: pts, at: 't0.9' }));
    expect(count(html, 'class="ft-mark"')).toBe(pts.length);
    expect(count(html, 'tabindex="0"')).toBe(1);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(pointWords(pts.find(x => x.id === 't0.9')!));
  });
  it('the student’s loss curve is meta.json’s', () => {
    expect(STUDENT_SERIES[0].points.map(p => p.loss)).toEqual(meta.student!.lossCurve.map(p => p.train));
  });
});

describe('escaping', () => {
  it('captions never become markup', () => {
    const evil = '<script>alert(1)</script>';
    const html = renderToString(
      createElement(SmallStage, { show: (): Shown => ({ scene: { mode: 'route' }, caption: evil }) }),
    );
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('a stage that needs both models', () => {
  const show = (): Shown => ({ scene: { mode: 'distill' }, caption: 'both in' });
  it('holds its frame with a loading pill while either model loads; predicates see no models', async () => {
    setModelFiles(disk);
    await loadModel('base');
    expect(bothNow()).toBeUndefined();
    const html = renderToString(createElement(SmallStage, { show, models: true }));
    expect(html).toContain('Loading Larkspur mini');
    expect(html).toContain('class="tc-frame"');
    expect(html).not.toContain('both in');
    await loadModel('student');
    expect(bothNow()).toBeTruthy();
    expect(renderToString(createElement(SmallStage, { show, models: true }))).toContain('both in');
  });
  it('a failed load shows Retry', async () => {
    setModelFiles(async f => {
      if (f === 'student.bin') throw new Error('offline');
      return disk(f);
    });
    await loadModel('base');
    await expect(loadModel('student')).rejects.toThrow('offline');
    expect(renderToString(createElement(SmallStage, { show, models: true }))).toContain('Retry');
  });
});
