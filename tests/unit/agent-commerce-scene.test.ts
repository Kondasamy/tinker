// @vitest-environment happy-dom
// When the buyer is an agent's stage (U20): every part a callout names is drawn; one slip, at most six stamps, each on
// its own field and matching shop.ts's verdict; changing the cap after signing fails the signature and cracks the seal;
// the form fills by keyboard, signs and sends; with reduced motion the stamps show without the hatch hop; the Task lane
// draws runTask's states; the one polite read-out names the verdict per field.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  HATCH_BOARD,
  HATCH_PARTS,
  type HatchOpts,
  hatchLabel,
  hatchLane,
  hatchPlot,
  hatchScene,
  MAX_CHECKS,
} from '../../src/components/scenes/hatchScene';
import { raised, SignSlip, verdictNote } from '../../src/content/agent-commerce/kit';
import { mandateOf, sign } from '../../src/lib/agent-commerce/mandate';
import { checkOrder, FIELDS, orderOf } from '../../src/lib/agent-commerce/shop';
import { SLIPS, sellerOf } from '../../src/lib/agent-commerce/story';
import { runTask } from '../../src/lib/agent-commerce/task';
import { TASK_TURNS } from '../../src/lib/agent-commerce/turns';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const draw = (o: HatchOpts) =>
  renderToString(createElement(IsoStage, { board: HATCH_BOARD, scene: hatchScene(o), label: hatchLabel(o) }));
const stamps = (svg: string) =>
  [...svg.matchAll(/data-field="([^"]+)" data-pass="([01])"/g)].map(m => ({ field: m[1], pass: m[2] === '1' }));
const chapters = import.meta.glob<{ STEPS: { say?: { block: string } }[] }>(
  '../../src/content/agent-commerce/[0-9]*.tsx',
  {
    eager: true,
  },
);
const verdictFor = async (terms: keyof typeof SLIPS, seller: string, tamper = false, spent: string[] = []) => {
  const s = await sign(mandateOf(SLIPS[terms], 'test-1'));
  const slip = tamper ? { ...s, mandate: { ...s.mandate, cap: raised(s.mandate.cap) } } : s;
  return checkOrder(slip, orderOf(sellerOf(seller)), spent);
};

describe('the trading hatch', () => {
  it('draws every part a callout may name, and every callout the chapters use is one of them', () => {
    const o: HatchOpts = { slip: { at: 'seller', signed: true }, token: 'live' };
    for (const part of HATCH_PARTS) expect(draw({ ...o, say: { block: part, text: 'Here' } })).toContain('Here');
    for (const at of ['buyer', 'hatch'] as const)
      for (const part of ['slip', 'seal'])
        expect(draw({ slip: { at, signed: true }, say: { block: part, text: 'Here' } })).toContain('Here');
    // no slip, no slip callout; no token, no token callout
    expect(draw({ say: { block: 'slip', text: 'Here' } })).not.toContain('Here');
    expect(draw({ say: { block: 'token', text: 'Here' } })).not.toContain('Here');
    const all: string[] = [...HATCH_PARTS];
    const used = Object.values(chapters).flatMap(m => m.STEPS.flatMap(s => (s.say ? [s.say.block] : [])));
    for (const b of used) expect(all).toContain(b);
  });

  it('draws the builder, both machines, the satchel and the hatch from the kit', () => {
    const svg = draw({});
    for (const part of ['builder', 'buyer', 'seller', 'satchel']) expect(svg).toContain(`data-part="${part}"`);
    expect(svg).toContain('data-kit="model"');
    expect(svg).toContain('class="person"');
    expect(svg).toContain('class="shutter"');
    expect(hatchPlot(40, 40, [])).toContain('data-part="slip"');
  });

  it('stamps each field as shop.ts checks it: one slip, at most six stamps, every case', async () => {
    const cases = [
      await verdictFor('larkspur', 'larkspur'),
      await verdictFor('larkspur', 'larkspur', true),
      await verdictFor('shop-around', 'quarrylane'),
      await verdictFor('shop-around', 'ridgeback'),
      await verdictFor('larkspur', 'lookalike'),
      await verdictFor('larkspur', 'backorder'),
      await verdictFor('larkspur', 'larkspur', false, ['test-1']),
    ];
    expect(cases.map(v => v.checks.filter(c => !c.pass).map(c => c.field))).toEqual([
      [],
      ['signature'],
      ['cap'],
      ['items'],
      ['merchant'],
      ['expiry'],
      ['nonce'],
    ]);
    for (const v of cases) {
      const svg = draw({ slip: { at: 'seller', signed: true, checks: v.checks } });
      expect(svg.match(/data-part="slip"/g)).toHaveLength(1);
      const got = stamps(svg);
      expect(got.length).toBeLessThanOrEqual(MAX_CHECKS);
      expect(got).toEqual(v.checks.map(c => ({ field: c.field, pass: c.pass })));
      // each stamp on its own field's row, in FIELDS order
      expect(got.map(s => s.field)).toEqual([...FIELDS]);
      expect(svg).toContain(v.ok ? 'ACCEPTED' : 'REFUSED');
      expect(svg).toContain(`data-seal="${v.checks[0].pass ? 'whole' : 'broken'}"`);
    }
    // an unchecked slip carries no stamps; an unsigned one no seal
    expect(stamps(draw({ slip: { at: 'buyer', signed: true } }))).toEqual([]);
    expect(draw({ slip: { at: 'buyer', signed: false } })).not.toContain('data-part="seal"');
  });

  it('draws a spent token punched', () => {
    expect(draw({ token: 'spent' })).toContain('data-token="spent"');
    expect(hatchLabel({ token: 'spent' })).toContain('spent');
  });

  it('the Task lane draws runTask’s states in order, stamped by how each ends', () => {
    for (const [req, cancel] of [
      ['clear', false],
      ['vague', false],
      ['vague', true],
    ] as const) {
      const states = runTask(TASK_TURNS, req, cancel).states;
      for (const phone of [false, true]) {
        const lane = hatchLane(states, { phone });
        expect([...lane.svg.matchAll(/data-state="([^"]+)"/g)].map(m => m[1])).toEqual(states);
        expect(lane.svg.match(/class="arrow"/g)).toHaveLength(states.length - 1);
      }
    }
    expect(hatchLane(['submitted', 'working', 'input-required']).svg).toContain('WAITING');
  });
});

describe('sign the slip, live', () => {
  let root: Root, host: HTMLElement;
  const reduce = (on: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: on && q.includes('reduce'),
      addEventListener() {},
      removeEventListener() {},
    }));
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
  const button = (t: string) => [...host.querySelectorAll('button')].find(b => b.textContent === t);
  const status = () => host.querySelectorAll('[role="status"]');
  const at = () => host.querySelector('[data-slip]')?.getAttribute('data-slip');
  const press = async (t: string) => {
    const b = button(t);
    expect(b, t).toBeTruthy();
    // every control is a native button, so Enter and Space press it
    expect(b!.getAttribute('type')).toBe('button');
    await act(async () => b!.click());
  };
  const key = (el: Element, k: string) =>
    act(() => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    });

  it('the keyboard fills the form; Sign seals it, Send stamps it; Change the cap fails the signature', async () => {
    reduce(true);
    act(() => root.render(createElement(SignSlip, { caption: 'x' })));
    expect(status()).toHaveLength(1);
    expect(status()[0].getAttribute('aria-live')).toBe('polite');
    expect(host.querySelector('select')).toBeNull();
    // the cap, by keyboard: open, one down, pick
    const cap = host.querySelector('[role="combobox"]')!;
    key(cap, 'ArrowDown');
    key(cap, 'ArrowDown');
    key(cap, 'Enter');
    expect(cap.getAttribute('data-value')).toBe('150000');
    await press('Sign');
    await vi.waitFor(() => expect(status()[0].textContent).toContain('Signed by Dana Reyes: up to $1,500.00'));
    expect(cap.hasAttribute('disabled')).toBe(true);
    expect(host.querySelector('[data-seal="whole"]')).toBeTruthy();
    await press('Send');
    await vi.waitFor(() => expect(status()[0].textContent).toBe('Accepted: all 6 checks pass.'));
    expect(at()).toBe('seller');
    expect(stamps(host.innerHTML).every(s => s.pass)).toBe(true);
    // the same slip again: its nonce is spent
    await press('Send again');
    await vi.waitFor(() => expect(status()[0].textContent).toContain('nonce fails'));
    // tamper: the cap changes after signing, the signature no longer matches
    await press('Change the cap');
    expect(button('Change the cap')!.getAttribute('aria-pressed')).toBe('true');
    expect(status()[0].textContent).toBe(
      'Cap changed to $3,000.00 after signing; the signature still covers $1,500.00.',
    );
    expect(at()).toBe('buyer');
    await press('Send');
    await vi.waitFor(() => expect(at()).toBe('seller'));
    const got = stamps(host.innerHTML);
    expect(got.find(s => s.field === 'signature')?.pass).toBe(false);
    expect(host.querySelector('[data-seal="broken"]')).toBeTruthy();
    expect(status()[0].textContent).toMatch(/^Refused: signature fails \(not Dana Reyes’s signature on these terms\)/);
  });

  it('without reduced motion the slip passes through the hatch first; with it, the stamps show at once', async () => {
    reduce(false);
    act(() => root.render(createElement(SignSlip, { caption: 'x' })));
    await press('Sign');
    await vi.waitFor(() => expect(button('Send')).toBeTruthy());
    await press('Send');
    await vi.waitFor(() => expect(at()).toBe('hatch'));
    expect(stamps(host.innerHTML)).toEqual([]);
    expect(status()[0].textContent).toBe('Sent through the hatch to larkspur.example.');
    await vi.waitFor(() => expect(at()).toBe('seller'));
    expect(stamps(host.innerHTML)).toHaveLength(MAX_CHECKS);

    act(() => root.unmount());
    root = createRoot(host);
    reduce(true);
    act(() =>
      root.render(createElement(SignSlip, { caption: 'x', terms: SLIPS['shop-around'], seller: 'quarrylane' })),
    );
    await press('Sign');
    await vi.waitFor(() => expect(button('Send')).toBeTruthy());
    const seen: (string | null | undefined)[] = [];
    const watch = new MutationObserver(() => seen.push(at()));
    watch.observe(host, { subtree: true, attributes: true, attributeFilter: ['data-slip'] });
    await press('Send');
    await vi.waitFor(() => expect(at()).toBe('seller'));
    watch.disconnect();
    expect(seen).not.toContain('hatch');
    const v = await verdictFor('shop-around', 'quarrylane');
    expect(status()[0].textContent).toBe(verdictNote(v));
  });

  it('a double Send records one order: the second click waits for the first, then finds the nonce spent', async () => {
    reduce(true);
    const checked: boolean[] = [];
    const onEvent = (e: { kind: string; verdict?: { ok: boolean } }) => {
      if (e.kind === 'checked') checked.push(e.verdict!.ok);
    };
    act(() => root.render(createElement(SignSlip, { caption: 'x', onEvent })));
    await press('Sign');
    await vi.waitFor(() => expect(button('Send')).toBeTruthy());
    await act(async () => {
      button('Send')!.click();
      button('Send')!.click();
    });
    await vi.waitFor(() => expect(checked).toEqual([true]));
    await press('Send again');
    await vi.waitFor(() => expect(checked).toEqual([true, false]));
    expect(status()[0].textContent).toContain('nonce fails');
  });

  it('offers the Task tab when given states', async () => {
    reduce(true);
    const states = runTask(TASK_TURNS, 'vague').states;
    act(() => root.render(createElement(SignSlip, { caption: 'x', states })));
    await press('Task');
    expect([...host.querySelectorAll('.ac-wide [data-state]')].map(g => g.getAttribute('data-state'))).toEqual(states);
  });
});
