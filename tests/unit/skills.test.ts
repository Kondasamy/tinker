// Skills' engine (KTD3): a small word-overlap scorer stands in for the model's pick, and every taught effect is pinned
// in data/skills/pinned.json and re-derived here, so the copy can't drift from the engine.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import type { Art } from '../../src/lib/iso/motion';
import {
  CAROUSEL_BOARD,
  CAROUSEL_PARTS,
  carouselPills,
  carouselScene,
  carouselStill,
  partBox,
  type Carousel,
} from '../../src/components/scenes/carouselScene';
import { closeUpZoom } from '../../src/lib/iso/motion';
import { barsOf, carouselOf } from '../../src/content/skills/kit';
import { WINNERS, OPTIONS } from '../../src/content/skills/03-picking-the-binder';
import PINNED from '../../data/skills/pinned.json' with { type: 'json' };
import {
  LABELS,
  PAGES,
  PROMPT_WORDS,
  REQUESTS,
  SKILLS,
  labelsWith,
  pick,
  score,
  stems,
  wordsLoaded,
} from '../../src/lib/skills/skills';

describe('the label scorer', () => {
  it('reduces words to plain stems, dropping filler', () => {
    expect([...stems('The deliveries were dented, I returned them')]).toEqual(['delivery', 'dent', 'return']);
  });

  it('picks the pinned skill for each of the twelve requests, with the sharp labels', () => {
    expect(REQUESTS).toHaveLength(12);
    expect(Object.fromEntries(REQUESTS.map(r => [r.id, pick(r.id)]))).toEqual(PINNED.picks);
    for (const r of REQUESTS) expect(pick(r.id), r.id).toBe(r.skill);
  });

  it('never picks a vague label: the pinned case loses to a specific one', () => {
    const vague = labelsWith(['warranty']);
    expect(pick(PINNED.vague.request, vague)).toBe(PINNED.vague.vaguePick);
    expect(pick(PINNED.vague.request)).toBe(PINNED.vague.sharpPick);
    const r = REQUESTS.find(x => x.id === PINNED.vague.request)!;
    expect(score(r.text, vague.warranty)).toBe(0);
    expect(score(r.text, LABELS.warranty)).toBeGreaterThan(0);
  });

  it('only the sharp label of chapter 3’s drafts gets the warranty binder picked', () => {
    const drafts = SKILLS.find(s => s.id === 'warranty')!.drafts!;
    for (const d of drafts) expect(pick(PINNED.vague.request, { ...LABELS, warranty: d }), d).toBeNull();
  });

  it('a tie goes to the binder met first on the carousel', () => {
    expect(pick('drill', { ...LABELS, refunds: LABELS.warranty })).toBe('refunds');
  });
});

describe('words loaded', () => {
  it('the long prompt loads every binder for every request: the pinned total, 40 pages', () => {
    expect(PROMPT_WORDS).toBe(PINNED.words.prompt);
    expect(PAGES).toBe(PINNED.pages);
    for (const r of REQUESTS) expect(wordsLoaded('prompt', pick(r.id))).toBe(PROMPT_WORDS);
  });

  it('with skills, a request loads every label plus its one binder', () => {
    expect(Object.fromEntries(REQUESTS.map(r => [r.id, wordsLoaded('skills', pick(r.id))]))).toEqual(
      PINNED.words.skills,
    );
    for (const r of REQUESTS) expect(wordsLoaded('skills', pick(r.id))).toBeLessThan(PROMPT_WORDS / 4);
    expect(wordsLoaded('skills', null)).toBe(PINNED.words.labelsOnly);
    expect(SKILLS).toHaveLength(6);
  });
});

describe('the carousel scene', () => {
  const draw = (scene: Art, moving?: Art) =>
    renderToString(createElement(IsoStage, { board: CAROUSEL_BOARD, scene, moving, label: '' }));
  const empty = carouselOf('skills', []),
    refund = carouselOf('skills', [{ ticket: 'refund-saw' }]),
    label = carouselOf('skills', [{ ticket: 'refund-saw' }, { ticket: 'print-label' }]),
    pile = carouselOf('prompt', [{ ticket: 'refund-saw' }]),
    none = carouselOf('skills', [{ ticket: 'drill', swap: { warranty: 'Helps with tools.' } }]);
  const moves: [string, Carousel, Carousel][] = [
    ['a binder out', empty, refund],
    ['one binder home, another out', refund, label],
    ['every binder onto the desk', carouselOf('prompt', []), pile],
    ['no match', empty, none],
  ];

  it('ends on its still: at t = 1 every move draws exactly the picture at rest', () => {
    for (const [what, a, b] of moves) {
      const end = carouselScene(a, b, 1, { zoomT: 0 });
      expect(end.moving, what).toBe('');
      expect(draw(end.still), what).toBe(draw(carouselStill(b)));
    }
  });

  it('draws every frame of every move with no NaN, the pieces in flight in the moving layer', () => {
    for (const [what, a, b] of moves)
      for (const t of [0, 0.2, 0.4, 0.6, 0.8, 0.95]) {
        const f = carouselScene(a, b, t, { zoomT: 0 });
        const svg = draw(f.still, f.moving);
        expect(svg, `${what} at ${t}`).not.toContain('NaN');
        expect(svg, `${what} at ${t}`).toContain('iso-moving');
      }
  });

  it('opens the picked binder, piles every binder in the long prompt, and none on no match', () => {
    expect(draw(carouselStill(refund)).match(/data-at="desk"/g)).toHaveLength(1);
    expect(draw(carouselStill(refund))).toContain('data-binder="refunds" data-at="desk"');
    expect(draw(carouselStill(pile)).match(/data-at="desk"/g)).toHaveLength(SKILLS.length);
    expect(draw(carouselStill(none))).not.toContain('data-at="desk"');
  });

  it('names and rings the answer’s binder only while closed in on it, so the prediction step never gives it away', () => {
    const lit = carouselOf('prompt', [{ ticket: 'refund-saw' }], 'refunds');
    expect(draw(carouselStill(lit))).not.toContain('data-lit');
    expect(draw(carouselStill(lit))).not.toContain('>REFUNDS<');
    const zoomed = draw(carouselStill(lit, { zoomT: 1, closeUp: ['binder', 'desk'] }));
    expect(zoomed).toContain('data-binder="refunds" data-at="desk" data-open="1" data-lit="1"');
    expect(zoomed).toContain('data-glow="1"');
    expect(zoomed).toContain('>REFUNDS<');
  });

  it('leaves every ticket of the long prompt under the pile, and lights the slot a picked binder left', () => {
    const two = carouselOf('prompt', [{ ticket: 'refund-saw' }, { ticket: 'print-label' }]);
    expect(draw(carouselStill(two)).match(/data-ticket/g)).toHaveLength(3); // two on the desk, one on the tray
    expect(draw(carouselStill(two))).toContain('2 TICKETS · 20,000 WORDS EACH');
    expect(draw(carouselStill(refund))).toContain('data-slot="lit"');
    expect(draw(carouselStill(none))).not.toContain('data-slot="lit"');
  });

  it('draws its pills apart when the stage asks (bare), and waits mid-motion to name the binder', () => {
    expect(draw(carouselStill({ ...refund, bare: true }))).not.toContain('block-tag');
    const pills = (o: { moving?: boolean }) =>
      renderToString(
        createElement(IsoStage, {
          board: CAROUSEL_BOARD,
          scene: () => carouselPills(refund, { zoomT: 0 }, o),
          label: '',
        }),
      );
    expect(pills({})).toContain('>REFUNDS<');
    expect(pills({ moving: true })).not.toContain('>REFUNDS<');
  });

  it('closes in on every part within the 2.2× cap', () => {
    for (const p of CAROUSEL_PARTS) {
      const z = closeUpZoom(CAROUSEL_BOARD, partBox(p, pile));
      expect(z.k, p).toBeGreaterThanOrEqual(1);
      expect(z.k, p).toBeLessThanOrEqual(2.2);
    }
  });

  it('the Words tab reads the same totals as the pins', () => {
    expect(barsOf('skills', [{ ticket: 'refund-saw' }])[0].words).toBe(PINNED.words.skills['refund-saw']);
    expect(barsOf('prompt', [{ ticket: 'print-label' }])[0].words).toBe(PINNED.words.prompt);
  });
});

describe('chapter 3', () => {
  it('accepts every description that gets the warranty binder picked, and only the sharp one does', () => {
    expect(WINNERS).toEqual([OPTIONS.length - 1]);
  });
});

// Chapter 7's workbench WINNERS recompute here once chapter 7 exists.
