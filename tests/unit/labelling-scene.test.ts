// @vitest-environment happy-dom
// Who labels the data's stage (U8): every part a callout names is drawn; five holes whose tallies are the frozen
// labels agree.ts counts; number keys 1–5 (while the control has focus) and clicks file the ticket; with reduced
// motion the slips land without the drop; one polite read-out; the Matrix tab's kappa is agree.ts's.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  LABEL_PARTS,
  RACK_BOARD,
  type RackOpts,
  rackLabel,
  rackScene,
  tallyIn,
} from '../../src/components/scenes/pigeonholeScene';
import { AgreementMatrix, picksOf, RackStage, SortTicket, tallyOf } from '../../src/content/labelling/kit';
import { kappa, matrix } from '../../src/lib/labelling/agree';
import { INTENT_IDS, INTENTS, type Intent, labelsOf, POOL, ticketOf } from '../../src/lib/labelling/story';
import pinned from '../../data/labelling/pinned.json' with { type: 'json' };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const draw = (o: RackOpts) =>
  renderToString(createElement(IsoStage, { board: RACK_BOARD, scene: rackScene(o), label: rackLabel(o) }));
const three = ticketOf(pinned.threeWay);
/** Labels are in ticket order, and the pool is the first tickets. */
const TICKET_AT = (id: string) => POOL.findIndex(t => t.id === id);
const holes = (svg: string) =>
  Object.fromEntries([...svg.matchAll(/data-part="hole" data-intent="(\w+)" data-n="(\d+)"/g)].map(m => [m[1], +m[2]]));
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>('../../src/content/labelling/[0-9]*.tsx', {
  eager: true,
});

describe('the sorting room', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const full: RackOpts = { ticket: three, guide: true, model: true, gold: 3 };
    for (const part of LABEL_PARTS)
      expect(draw({ ...full, say: { block: part, text: 'Here' } }), part).toContain('Here');
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    for (const b of used) expect(LABEL_PARTS).toContain(b);
  });

  it('has five holes in rack order, and the three-way ticket lands one slip in each of three', () => {
    const picks = picksOf(three.id, false),
      svg = draw({ ticket: three, picks });
    expect(Object.keys(holes(svg))).toEqual(INTENT_IDS);
    expect(new Set(Object.values(picks)).size).toBe(3);
    expect(Object.values(holes(svg)).sort()).toEqual([0, 0, 1, 1, 1]);
    for (const p of Object.values(picks)) expect(holes(svg)[p]).toBe(1);
  });

  it('tallies the pool as agree.ts counts it: one labeller’s tally is a row of the matrix, the other’s a column', () => {
    const ids = POOL.map(t => t.id);
    for (const guided of [false, true]) {
      const [rosa, mira] = (['rosa', 'mira'] as const).map(l => POOL.map(t => labelsOf(l, guided)[TICKET_AT(t.id)]));
      const m = matrix(rosa, mira, INTENT_IDS);
      const rows = m.map(r => r.reduce((a, b) => a + b, 0)),
        cols = INTENT_IDS.map((_, j) => m.reduce((a, r) => a + r[j], 0));
      expect(INTENT_IDS.map(i => tallyOf(ids, guided, ['rosa'])[i])).toEqual(rows);
      expect(INTENT_IDS.map(i => tallyOf(ids, guided, ['mira'])[i])).toEqual(cols);
      const all = tallyOf(ids, guided);
      expect(holes(draw({ tally: all }))).toEqual(all);
      expect(Object.values(all).reduce((a, b) => a + b, 0)).toBe(3 * ids.length);
    }
  });

  it('adds this ticket’s picks to earlier tallies, caps the slips drawn, and drops only with drop on', () => {
    const tally = { refund: 40 } as Partial<Record<Intent, number>>,
      picks = picksOf(three.id, false);
    expect(tallyIn({ tally, picks }).refund).toBe(40 + Object.values(picks).filter(p => p === 'refund').length);
    expect(draw({ tally, picks, drop: true })).toContain('class="slip drop"');
    expect(draw({ tally, picks })).not.toContain('class="slip drop"');
  });

  it('marks the reader’s hole, the vote, the gold ticket and the flag; escapes pill text', () => {
    const svg = draw({ ticket: { id: 't016', gold: true }, mine: 'return', vote: 'refund', flag: 'tom', gold: 2 });
    expect(svg).toContain('class="mine"');
    expect(svg).toContain('data-gold="1"');
    expect(svg).toContain('data-part="flag"');
    expect(svg).toContain('data-part="gold" data-n="2"');
    expect(draw({ ticket: three, say: { block: 'ticket', text: '<b>x' } })).not.toContain('<b>x');
    expect(draw({ ticket: { id: '"><b>', gold: false } })).not.toContain('"><b>');
  });
});

describe('sort the ticket, live', () => {
  let root: Root, host: HTMLElement;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });
  const motion = (reduce: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: reduce && q.includes('reduce'),
      addEventListener() {},
      removeEventListener() {},
    }));
  function Harness({ onFiled }: { onFiled: (i: Intent) => void }) {
    const [filed, setFiled] = useState<Intent | null>(null);
    const picks = filed ? picksOf(three.id, false) : undefined;
    return createElement(
      RackStage,
      { rack: { ticket: three, picks, mine: filed, drop: !!filed }, caption: 'x' },
      createElement(SortTicket, {
        ticket: three,
        filed,
        picks,
        onFile: (i: Intent) => {
          onFiled(i);
          setFiled(i);
        },
      }),
    );
  }

  it('files by number key only while the control has focus; the one read-out names each pick', () => {
    motion(false);
    const seen: Intent[] = [];
    act(() => root.render(createElement(Harness, { onFiled: i => seen.push(i) })));
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(host.querySelector('[role="status"]')!.textContent).toBe('');
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });
    expect(seen).toEqual([]);
    const first = host.querySelector<HTMLButtonElement>('.lb-holes button')!;
    first.focus();
    act(() => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });
    expect(seen).toEqual([INTENTS[2].id]);
    // filed: locked, and the slips drop into their holes
    act(() => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    });
    expect(seen).toHaveLength(1);
    const said = host.querySelector('[role="status"]')!.textContent!;
    expect(said).toContain(`You filed it under ${INTENTS[2].name}.`);
    for (const p of Object.values(picksOf(three.id, false)))
      expect(said).toContain(INTENTS.find(i => i.id === p)!.name);
    expect(host.querySelectorAll('.slip.drop')).toHaveLength(3);
    expect(holes(host.innerHTML)).toEqual(tallyIn({ picks: picksOf(three.id, false) }));
  });

  it('files by click; with reduced motion the tallies update without the drop', () => {
    motion(true);
    const seen: Intent[] = [];
    act(() => root.render(createElement(Harness, { onFiled: i => seen.push(i) })));
    act(() => host.querySelectorAll<HTMLButtonElement>('.lb-holes button')[4].click());
    expect(seen).toEqual([INTENTS[4].id]);
    expect(host.querySelectorAll('.slip.drop')).toHaveLength(0);
    expect(holes(host.innerHTML)).toEqual(tallyIn({ picks: picksOf(three.id, false) }));
  });

  it('the Matrix tab shows agree.ts’s matrix and kappa', () => {
    act(() => root.render(createElement(AgreementMatrix, { pair: ['rosa', 'mira'], guided: false })));
    const k = Number(host.querySelector('[data-kappa]')!.getAttribute('data-kappa'));
    expect(k).toBeCloseTo(pinned.kappa.before['rosa-mira'], 12);
    const rosa = POOL.map(t => labelsOf('rosa', false)[TICKET_AT(t.id)]),
      mira = POOL.map(t => labelsOf('mira', false)[TICKET_AT(t.id)]);
    expect(k).toBe(kappa(rosa, mira));
    const cells = [...host.querySelectorAll('tbody td')].map(td => Number(td.textContent));
    expect(cells).toEqual(matrix(rosa, mira, INTENT_IDS).flat());
    expect(host.querySelectorAll('td.agree')).toHaveLength(INTENTS.length);
  });
});
