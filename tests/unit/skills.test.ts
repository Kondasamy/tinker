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
import { barsOf, benchCarousel, carouselOf } from '../../src/content/skills/kit';
import { WINNERS as FIGHT_WINNERS, OPTIONS as FIGHT_OPTIONS } from '../../src/content/skills/05-two-skills-fight';
import { WINNERS, OPTIONS } from '../../src/content/skills/03-picking-the-binder';
import PINNED from '../../data/skills/pinned.json' with { type: 'json' };
import {
  BENCH_START,
  benchOptions,
  benchScore,
  WINNERS as BENCH_WINNERS,
  winnersOf,
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
  const script = (use: 'read' | 'run') => carouselOf('skills', [{ ticket: 'refund-days', script: use }]);
  const out = (o: Carousel['outsider']) => ({ ...carouselOf('skills', []), outsider: o });
  const moves: [string, Carousel, Carousel][] = [
    ['the script read in', empty, script('read')],
    [
      'the script run',
      script('read'),
      carouselOf('skills', [
        { ticket: 'refund-days', script: 'read' },
        { ticket: 'refund-days', script: 'run' },
      ]),
    ],
    ['the downloaded binder opened', out('boxed'), out('open')],
    ['the downloaded binder binned', out('open'), out('binned')],
    ['a workbench run', benchCarousel(BENCH_START, 1), benchCarousel(BENCH_WINNERS[0], 2)],
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

  it('draws the script as code pages when read, as a stamp and a slip when run', () => {
    expect(draw(carouselStill(script('read')))).toContain('data-use="read"');
    expect(draw(carouselStill(script('read')))).not.toContain('data-slip');
    const ran = draw(carouselStill(carouselOf('skills', [{ ticket: 'refund-days', script: 'run' }])));
    expect(ran).toContain('data-use="run"');
    expect(ran).toContain('data-slip="1"');
  });

  it('shows the downloaded binder shut, open with its hidden page, then in the bin', () => {
    expect(draw(carouselStill(out('boxed')))).toContain('data-part="outsider" data-open="0"');
    expect(draw(carouselStill(out('open')))).toContain('data-part="outsider" data-open="1"');
    const binned = draw(carouselStill(out('binned')));
    expect(binned).not.toContain('data-part="outsider"');
    expect(binned).toContain('>REFUSED<');
  });

  it('marks each spine after a workbench run: all green for a winner, some red for the drafts', () => {
    const win = draw(carouselStill(benchCarousel(BENCH_WINNERS[0], 1)));
    expect(win.match(/data-mark="ok"/g)).toHaveLength(SKILLS.length);
    expect(draw(carouselStill(benchCarousel(BENCH_START, 1)))).toContain('data-mark="bad"');
    expect(win).toContain(`>${REQUESTS.length} OF ${REQUESTS.length} RIGHT<`);
  });

  it('fans the tickets asked beside the open binder (three at most), the newest outlined', () => {
    const three = draw(
      carouselStill(
        carouselOf(
          'skills',
          ['refund-saw', 'swap-boots', 'tiles'].map(t => ({ ticket: t })),
        ),
      ),
    );
    expect(three.match(/data-ticket/g)).toHaveLength(4); // three fanned, one on the tray
    expect(three.match(/data-fresh/g)).toHaveLength(1);
    expect(draw(carouselStill(refund))).not.toContain('data-fresh');
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

describe('chapter 4: a script runs, it is not read', () => {
  it('reading the refund script loads its code; running it loads only its output (pinned)', () => {
    expect(wordsLoaded('skills', 'refunds', LABELS, 'read')).toBe(PINNED.script.read);
    expect(wordsLoaded('skills', 'refunds', LABELS, 'run')).toBe(PINNED.script.run);
    expect(PINNED.script.run - wordsLoaded('skills', 'refunds')).toBeLessThan(50);
  });
});

describe('chapter 5: two labels fight', () => {
  it('a blurry Damaged label steals the warranty ticket and loses its own; sharpened, both go right (pinned)', () => {
    const blurry = { ...LABELS, damaged: SKILLS.find(s => s.id === 'damaged')!.blurry! };
    expect(pick(PINNED.fight.request, blurry)).toBe(PINNED.fight.blurryPick);
    expect(pick(PINNED.fight.own, blurry)).toBe(PINNED.fight.ownBlurryPick);
    expect(pick(PINNED.fight.request)).toBe(PINNED.fight.sharpPick);
    expect(pick(PINNED.fight.own)).toBe('damaged');
    expect(PINNED.fight.blurryPick).not.toBe(PINNED.fight.sharpPick);
  });
});

describe('chapter 5’s puzzle', () => {
  it('accepts only the sharp Damaged label', () => {
    expect(FIGHT_WINNERS).toEqual([FIGHT_OPTIONS.length - 1]);
  });
});

describe('chapter 7: the workbench', () => {
  it('scores every label set on right picks and words loaded; the start is pinned', () => {
    expect(benchScore(BENCH_START)).toEqual(PINNED.bench.start);
    expect(benchScore(SKILLS.map(s => benchOptions(s.id).length - 1))).toEqual(PINNED.bench.sharp);
  });

  it('recomputes WINNERS over all label sets: the most right picks, then the fewest words', () => {
    expect(winnersOf()).toEqual(BENCH_WINNERS);
    expect(BENCH_WINNERS.map(w => w.join(''))).toEqual(PINNED.bench.winners);
    expect(BENCH_WINNERS.some(w => w.join() === BENCH_START.join())).toBe(false);
  });
});
