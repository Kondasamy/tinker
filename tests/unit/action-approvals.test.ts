// Approvals and permissions' engine (KTD3): a hand-written week of mail through the toll booth. Dye follows what the
// assistant read, a running total stops what adds up, and a pass runs out. Every taught effect is pinned in
// data/action-approvals/pinned.json and re-derived here, so the copy can't drift from the engine.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import { closeUpZoom, type Art } from '../../src/lib/iso/motion';
import {
  TOLL_BOARD,
  TOLL_PARTS,
  partBox,
  tollPills,
  tollScene,
  tollStill,
  type Toll,
} from '../../src/components/scenes/tollScene';
import { replay, tollOf } from '../../src/content/action-approvals/kit';
import { WINNERS as BENCH_WINNERS, SOLUTION } from '../../src/content/action-approvals/07-workbench';
import PINNED from '../../data/action-approvals/pinned.json' with { type: 'json' };
import RUN from '../../data/action-approvals/run.json' with { type: 'json' };
import {
  EMPTY,
  POLICIES,
  WEEK,
  WINNERS,
  arrive,
  decide,
  dyeOf,
  isWinner,
  letterOf,
  minds,
  passFor,
  simulate,
  wait,
  waiting,
  type Policy,
  type Turn,
} from '../../src/lib/action-approvals/gate';

const ASK_DYED: Policy = { ask: 'dyed', budget: null, expiry: 'hour' };

describe('the dye', () => {
  it('reaches every action written after the email was read, and none written before', () => {
    const dye = dyeOf(RUN.turns as Turn[]);
    expect(dye).toEqual(PINNED.dye);
    const readAt = RUN.turns.findIndex(t => 'read' in t && t.read === 'fake-88');
    RUN.turns.forEach((t, i) => {
      if ('write' in t && t.write) expect(dye[t.write].includes('fake-88'), t.write).toBe(i > readAt);
    });
  });

  it('marks every action from mail, and never Rosa’s own request', () => {
    let d = EMPTY;
    for (const l of WEEK) {
      d = arrive(d, l, { ask: 'none', budget: null, expiry: 'hour' });
      expect(d.slips.at(-1)!.dyed, l.id).toBe(l.who !== 'rosa');
    }
  });

  it('with two minds no action comes from the email’s words', () => {
    const one = minds('one', [letterOf('fake-88')]),
      two = minds('two', [letterOf('fake-88')]);
    expect(one.some(a => a.kind === 'refund' && a.order === 88)).toBe(true);
    expect(two.some(a => a.kind === 'refund')).toBe(false);
    expect(two.every(a => a.to === 'rosa')).toBe(true);
    expect(two.find(a => a.kind === 'summary')!.dyed).toBe(true);
  });
});

describe('the running total', () => {
  it('lets the first two £60 refunds through and stops the pinned third against the day’s budget', () => {
    const p: Policy = { ask: 'dyed', budget: PINNED.budget.limit, expiry: 'hour' };
    let d = EMPTY;
    for (const id of ['split-a', 'split-b', 'split-c']) {
      d = arrive(d, letterOf(id), p);
      if (waiting(d)) d = decide(d, true);
    }
    expect(d.slips.map(s => [s.id, s.fate, s.why ?? null])).toEqual(PINNED.budget.slips);
    expect(d.spent[2]).toBe(PINNED.budget.spent);
  });

  it('no single £60 refund is over the limit on its own', () => {
    for (const id of ['split-a', 'split-b', 'split-c']) expect(letterOf(id).amount).toBeLessThan(PINNED.budget.limit);
  });
});

describe('passes', () => {
  it('a yes covers one order, for one hour, then refuses', () => {
    let d = arrive(EMPTY, letterOf('saw-41'), ASK_DYED, 10);
    expect(waiting(d)?.id).toBe('saw-41');
    d = decide(d, true);
    expect(passFor(d.passes, 41, d.now, 'hour')).toBe('ok');
    expect(passFor(d.passes, 88, d.now, 'hour')).toBe('other-order');
    d = wait(d, 1);
    expect(passFor(d.passes, 41, d.now, 'hour')).toBe('expired');
    expect(passFor(d.passes, 41, d.now, 'forever')).toBe('ok');
    d = arrive(d, letterOf('reuse-41'), ASK_DYED, d.now);
    expect(waiting(d)?.id).toBe('reuse-41');
  });

  it('a pass that never expires waves the second order-41 refund through', () => {
    let d = arrive(EMPTY, letterOf('saw-41'), { ...ASK_DYED, expiry: 'forever' }, 10);
    d = decide(d, true);
    d = arrive(wait(d, 48), letterOf('reuse-41'), { ...ASK_DYED, expiry: 'forever' }, 58);
    expect(d.slips.at(-1)).toMatchObject({ id: 'reuse-41', fate: 'paid', byPass: true });
  });
});

describe('the week (workbench)', () => {
  it('re-derives every policy’s pinned score', () => {
    const got = Object.fromEntries(
      POLICIES.map(p => {
        const r = simulate(p);
        return [`${p.ask}/${p.budget ?? 'none'}/${p.expiry}`, [r.harm.stopped, r.good.paid, r.prompts]];
      }),
    );
    expect(got).toEqual(PINNED.week);
  });

  it('asking about everything wears the approver out, and the fourth prompt of the day lets the fake refund through', () => {
    const r = simulate({ ask: 'all', budget: null, expiry: 'hour' });
    expect(r.desk.slips.find(s => s.id === 'fake-88')!.fate).toBe('paid');
  });

  it('WINNERS recompute: every winning policy stops all harm, pays all good refunds, with the fewest prompts', () => {
    const score = POLICIES.map(p => ({ p, r: simulate(p) }));
    const clean = score.filter(({ r }) => r.harm.stopped === r.harm.total && r.good.paid === r.good.total);
    const fewest = Math.min(...clean.map(c => c.r.prompts));
    expect(WINNERS).toEqual(clean.filter(c => c.r.prompts === fewest).map(c => c.p));
    expect(WINNERS).toEqual(PINNED.winners);
    for (const p of POLICIES) expect(isWinner(p), JSON.stringify(p)).toBe(WINNERS.some(w => w === p));
  });
});

describe('the toll scene', () => {
  const draw = (scene: Art, moving?: Art) =>
    renderToString(createElement(IsoStage, { board: TOLL_BOARD, scene, moving, label: '' }));
  const P: Policy = { ask: 'dyed', budget: 150, expiry: 'hour' };
  const at = (log: Parameters<typeof replay>[1], dye = true, mail = 2): Toll =>
    tollOf(replay(P, log, 1), { p: P, dye, mail });
  const empty = at([], true, 3),
    waits = at([{ l: 'split-a' }]),
    paid = at([{ l: 'split-a' }, { yes: true }]),
    stopped = at([{ l: 'split-a' }, { yes: true }, { l: 'split-b' }, { yes: true }, { l: 'split-c' }]),
    expired = tollOf(replay(ASK_DYED, [{ l: 'saw-41' }, { yes: true }, { wait: 1 }]), {
      p: ASK_DYED,
      dye: true,
      mail: 1,
    }),
    two: Toll = { ...empty, two: true, tray: [true], slips: [{ id: 's', dyed: true, at: 'desk', kind: 'summary' }] };
  const moves: [string, Toll, Toll][] = [
    ['a letter in, its refund to the barrier', empty, waits],
    ['the hourglass flips, the refund pays', waits, paid],
    ['a refund stopped by the budget', at([{ l: 'split-a' }, { yes: true }, { l: 'split-b' }, { yes: true }]), stopped],
    [
      'the sand runs out',
      tollOf(replay(ASK_DYED, [{ l: 'saw-41' }, { yes: true }]), { p: ASK_DYED, dye: true, mail: 1 }),
      expired,
    ],
    ['the reader reads', { ...empty, two: true }, two],
  ];

  it('ends on its still: at t = 1 every move draws exactly the picture at rest (the reduced-motion frame)', () => {
    for (const [what, a, b] of moves) {
      const end = tollScene(a, b, 1, { zoomT: 0 });
      expect(end.moving, what).toBe('');
      expect(draw(end.still), what).toBe(draw(tollStill(b)));
    }
  });

  it('draws every frame of every move with no NaN, the pieces in flight in the moving layer', () => {
    for (const [what, a, b] of moves)
      for (const t of [0, 0.2, 0.4, 0.6, 0.8, 0.95]) {
        const f = tollScene(a, b, t, { zoomT: 0 });
        const svg = draw(f.still, f.moving);
        expect(svg, `${what} at ${t}`).not.toContain('NaN');
        expect(svg, `${what} at ${t}`).toContain('iso-moving');
      }
  });

  it('the end state shows what the motion showed: dye, where each slip landed, spent sand', () => {
    expect(draw(tollStill(waits))).toContain('data-slip="split-a" data-at="gate" data-dyed="1"');
    expect(draw(tollStill(paid))).toContain('data-slip="split-a" data-at="paid"');
    expect(draw(tollStill(stopped))).toContain('data-slip="split-c" data-at="stopped"');
    expect(draw(tollStill(paid))).toContain('data-pipe="out" data-dyed="1"');
    expect(draw(tollStill(expired))).toContain('data-glass="out"');
    expect(draw(tollStill(at([{ l: 'split-a' }], false)))).not.toContain('data-dyed="1"');
  });

  it('pills are text only through esc, and hide all but the close-up part’s while zoomed', () => {
    const all = tollPills(stopped, { zoomT: 0 });
    expect(all).toContain('PAID 2');
    expect(all).toContain('STOPPED 1');
    const zoomed = tollPills(stopped, { zoomT: 1, closeUp: ['coins'] });
    expect(zoomed.match(/class="block-tag"/g)).toHaveLength(1);
  });

  it('closes in on every part within the 2.2× cap', () => {
    for (const p of TOLL_PARTS) {
      const z = closeUpZoom(TOLL_BOARD, partBox(p, stopped));
      expect(z.k, p).toBeGreaterThanOrEqual(1);
      expect(z.k, p).toBeLessThanOrEqual(2.2);
    }
  });
});

describe('chapter 7', () => {
  it('Show me applies a winner, and the bench’s winners are the engine’s', () => {
    expect(BENCH_WINNERS).toBe(WINNERS);
    expect(isWinner(SOLUTION)).toBe(true);
  });
});
