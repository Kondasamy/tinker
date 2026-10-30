// Rate limits' rain barrel (KTD8): what the picture shows is read off the run (level, couriers, the turned away), it
// caps the couriers drawn with a count pill for the rest, escapes its pills, and every callout part is drawn.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  BARREL_BOARD,
  BARREL_PARTS,
  MAX_COURIERS,
  barrelAt,
  barrelCard,
  barrelLabel,
  barrelScene,
  barrelView,
  type BarrelOpts,
} from '../../src/components/scenes/barrelScene';
import { SCENES, runOf } from '../../src/lib/rate-limits/sim';

const draw = (o: BarrelOpts) =>
  renderToString(createElement(IsoStage, { board: BARREL_BOARD, scene: barrelScene(o), label: barrelLabel(o) }));

describe('the barrel picture', () => {
  it('no limit draws no barrel; the flood caps the couriers and the server shows down', () => {
    const o = barrelAt(runOf(SCENES.flood), 6000);
    expect(o.barrels).toEqual([]);
    expect(o.down).toBe(true);
    const v = barrelView(o);
    expect(v.couriers).toBe(MAX_COURIERS);
    expect(v.more).toBeGreaterThan(0);
    const svg = draw(o);
    expect(svg).toContain('data-down="1"');
    expect(svg).toContain(`+${v.more}`);
    expect(svg).not.toContain('data-prop="barrel"');
  });
  it('the card: an empty barrel, its tap shut, couriers turned away with Retry-After', () => {
    const o = barrelCard(1.2);
    expect(o.barrels[0].level).toBeLessThan(1);
    expect(o.refused).toBeGreaterThan(0);
    expect(o.retryAfter).toBe(2);
    const svg = draw(o);
    expect(svg).toContain('class="tap shut"');
    expect(svg).toContain('429 · WAIT 2 S');
  });
  it('one barrel per key stands a barrel for each partner', () => {
    const o = barrelAt(runOf(SCENES.perKey), 5000);
    expect(o.barrels.map(b => b.key)).toEqual(['oakmoor', 'web', 'quickfix']);
    expect(draw(o).match(/data-prop="barrel"/g)).toHaveLength(3);
  });
  it('a fixed window is topped up just after the minute', () => {
    const r = runOf(SCENES.edge);
    expect(barrelAt(r, 59_999).barrels[0].level).toBe(0);
    expect(barrelAt(r, 60_000).gush).toBe(true);
  });
  it('every callout part draws, on desktop and phone', () => {
    for (const part of BARREL_PARTS)
      for (const scale of [1.2, 2]) {
        const o = { ...barrelCard(scale), say: { block: part, text: 'Here' } };
        expect(draw(o), `${part} at ${scale}`).toContain('class="callout"');
      }
  });
  it('escapes its pills', () => {
    const o = barrelCard();
    const svg = draw({ ...o, barrels: [{ ...o.barrels[0], key: 'x', name: '<b>Evil' }] });
    expect(svg).toContain('&lt;B&gt;EVIL');
    expect(svg).not.toContain('<B>');
  });
});
