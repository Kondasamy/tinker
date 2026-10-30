// @vitest-environment happy-dom
// The live barrel keeps the last KEEP requests; a burst's tally must still count that burst once history is trimmed.
import { afterEach, describe, expect, it } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FloodControls, type Live, NO_LIVE } from '../../src/content/rate-limits/kit';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null,
  host: HTMLElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = host = null;
});

function mount(start: Live) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  function Harness() {
    const [live, setLive] = useState(start);
    return createElement(FloodControls, { live, onLive: setLive });
  }
  act(() => root!.render(createElement(Harness)));
  return host;
}

describe('the flood tally', () => {
  it('counts a Send 10 burst even when 400 older requests fill the kept history', () => {
    const now = Date.now(),
      t0 = now - 10 * 60_000;
    // 400 requests long ago, a second apart: the barrel has long refilled
    const full: Live = { ...NO_LIVE, t0, sent: Array.from({ length: 400 }, (_, i) => i * 1000) };
    const el = mount(full);
    const send = [...el.querySelectorAll('button')].find(b => b.textContent === 'Send 10')!;
    act(() => send.click());
    expect(el.querySelector('[role="status"]')!.textContent).toMatch(/Sent 10:/);
  });
});
