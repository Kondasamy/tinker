// Before GenAI's help counter (U3): the scene and the flat view read one run, so the stations lit in the picture are the
// lanes that answered in the flat view; a fallback shows by shape (the kiosk's sorry card raised, the sorter's card in
// its reject tray) and by the flat view's pill. Every part a callout names is drawn; no sentence enters the picture.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  KIOSK_BOARD,
  KIOSK_PARTS,
  type KioskOpts,
  kioskFlat,
  kioskLabel,
  kioskScene,
  outcomes,
  PREDICT_BOARD,
  PREDICT_PARTS,
  predictScene,
} from '../../src/components/scenes/kioskScene';
import { MESSAGES, messageOf, run } from '../../src/lib/before-genai/bots';

const draw = (o: KioskOpts) =>
  renderToString(createElement(IsoStage, { board: KIOSK_BOARD, scene: kioskScene(o), label: kioskLabel(o) }));
const lit = (svg: string) => [...svg.matchAll(/data-station="(\w+)" data-lit="1"/g)].map(m => m[1]).sort();
const answering = (svg: string) =>
  [...svg.matchAll(/data-lane-state="(\w+)" data-outcome="answered"/g)].map(m => m[1]).sort();
const outcomeOf = (svg: string, lane: string) =>
  svg.match(new RegExp(`data-lane-state="${lane}" data-outcome="([\\w ]+)"`))?.[1];

describe('the help counter', () => {
  it('draws every part a callout may name', () => {
    const o = { run: run(messageOf('where-order')) };
    for (const part of KIOSK_PARTS) expect(draw({ ...o, say: { block: part, text: 'Here' } }), part).toContain('Here');
  });

  it('lights the stations that answered, the same lanes the flat view marks answered, for every message', () => {
    for (const m of MESSAGES) {
      const r = run(m),
        svg = draw({ run: r });
      for (const phone of [false, true]) expect(lit(svg), m.id).toEqual(answering(kioskFlat(r, phone).svg));
      expect(lit(svg)).toEqual(
        (Object.entries(outcomes(r)) as [string, string][])
          .filter(([, o]) => o === 'answered')
          .map(([k]) => k)
          .sort(),
      );
      expect(svg).not.toContain('NaN');
      expect(kioskFlat(r, true).svg + kioskFlat(r, false).svg).not.toContain('NaN');
    }
  });

  it('shows a scripted fallback as the raised sorry card and the flat view’s fell-back pill', () => {
    const r = run(messageOf('parcel'));
    expect(r.scripted.answered).toBe(false);
    const svg = draw({ run: r });
    expect(svg).toMatch(/data-part="cards" data-raised="sorry"/);
    expect(outcomeOf(kioskFlat(r, false).svg, 'script')).toBe('fell back');
    expect(kioskFlat(r, false).svg).toContain('FELL BACK');
    const ok = run(messageOf('where-order'));
    expect(draw({ run: ok })).toMatch(/data-part="cards" data-raised="track"/);
  });

  it('shows a sorter fallback as every bin empty, the card in the reject tray', () => {
    const r = run(messageOf('off-list'));
    expect(r.intent.answered).toBe(false);
    const svg = draw({ run: r });
    expect(svg).toMatch(/data-part="sorter" data-bin="reject"/);
    expect(outcomeOf(kioskFlat(r, true).svg, 'sorter')).toBe('fell back');
    const ok = run(messageOf('where-order'));
    expect(draw({ run: ok })).toMatch(new RegExp(`data-part="sorter" data-bin="${ok.intent.intent}"`));
  });

  it('never puts the message or a reply sentence in either view', () => {
    for (const m of MESSAGES) {
      const r = run(m),
        all = draw({ run: r }) + kioskFlat(r, false).svg + kioskFlat(r, true).svg;
      for (const s of [m.text, r.scripted.reply, r.intent.reply]) expect(all).not.toContain(s.slice(0, 12));
    }
  });

  it('draws the predictive-AI pieces and every part they name', () => {
    for (const part of PREDICT_PARTS) {
      const svg = renderToString(
        createElement(IsoStage, {
          board: PREDICT_BOARD,
          scene: predictScene({ spam: 0.9, say: { block: part, text: 'Here' } }),
          label: '',
        }),
      );
      expect(svg, part).toContain('Here');
      expect(svg).not.toContain('NaN');
    }
  });
});
