// The forecaster's booth (U21): every part a callout may name is drawn, each jar's marbles follow its bin's counts, the
// dial re-sorts guesses between jars without losing any, the diagram's points are the score's bins, and phone pills keep
// only percentages.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { withFrame } from '../../src/lib/iso/core.js';
import { JAR_PARTS, MARBLES, jarPlaces, jarScene, marblesOf, type JarOpts } from '../../src/components/scenes/jarScene';
import { reliabilityChart } from '../../src/components/scenes/reliabilityChart';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { TEMPERATURES, half, measure, report } from '../../src/lib/calibration/measure';

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const tuned = measure(parseModel(meta, disk('finetuned.bin')));
const top = [
  [0, 0, 4],
  [150, 0, 4],
  [150, 150, 4],
  [0, 150, 4],
];
const draw = (o: JarOpts) => withFrame({}, () => jarScene(o)({ top }));

describe('the booth', () => {
  const jars = report(tuned).jars;
  it('draws every part a callout may name, and each callout lands', () => {
    for (const part of JAR_PARTS) {
      const svg = draw({
        jars,
        T: 1,
        temps: TEMPERATURES,
        threshold: 0.5,
        handed: 3,
        slate: 'ECE 0.27',
        say: { block: part, text: 'Here' },
      });
      expect(svg, part).toContain('class="callout"');
    }
  });
  it('each jar holds 20 marbles split by its counts', () => {
    const svg = draw({ jars });
    for (const [i, b] of jars.entries()) {
      const m = marblesOf(b);
      expect(m.mint + m.tomato).toBe(MARBLES);
      expect(Math.abs(m.mint / MARBLES - b.right / b.n)).toBeLessThanOrEqual(0.5 / MARBLES);
      expect(svg).toContain(`data-jar="${i}" data-n="${b.n}" data-right="${b.right}" data-mint="${m.mint}"`);
    }
  });
  it('a dial change moves guesses between jars and never changes the total', () => {
    const test = half(tuned, 'test'),
      a = report(test, 1).jars,
      b = report(test, 1.5).jars;
    expect(a.map(j => j.n)).not.toEqual(b.map(j => j.n));
    expect(a.reduce((n, j) => n + j.n, 0)).toBe(test.length);
    expect(b.reduce((n, j) => n + j.n, 0)).toBe(test.length);
  });
  it('jars keep their order on the shelf and never crowd', () => {
    const u = jarPlaces(jars);
    for (let i = 1; i < u.length; i++) expect(u[i] - u[i - 1]).toBeGreaterThanOrEqual(23.99);
  });
  it('the diagram’s points are the score’s bins', () => {
    expect(reliabilityChart(jars).points.map(p => p.bin)).toEqual(jars);
  });
  it('on phones the jar pills keep only percentages; wide ones add the count', () => {
    const wide = draw({ jars, scale: 1.25 }),
      phone = draw({ jars, scale: 2 });
    expect(wide).toMatch(/>\d+% · \d+</);
    expect(phone).not.toMatch(/>\d+% · \d+</);
    expect(phone).toMatch(/>\d+%</);
  });
});
