// @vitest-environment happy-dom
// The step runner, mounted: a finished step's log line (its label, else its narration) and the "Why?" fold, which the
// reading mode opens (Words) or leaves closed (Pictures).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import StepRunner from '../../src/components/story/StepRunner';
import type { Step } from '../../src/components/story/steps';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface S {
  n: number;
}
const STEPS: Step<S>[] = [
  {
    id: 'a',
    narration: 'A long first narration',
    label: 'First step',
    more: 'Because <b>x</b>',
    visibleControls: ['go'],
    predicate: s => s.n >= 1,
  },
  { id: 'b', narration: 'Second narration', visibleControls: ['go'], predicate: s => s.n >= 2 },
  { id: 'c', narration: 'Last', visibleControls: [], predicate: () => false },
];

let root: Root, host: HTMLElement;
beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  delete document.documentElement.dataset.reading;
});

const mount = () =>
  act(() =>
    root.render(
      createElement(StepRunner<S>, {
        chapter: 'x',
        steps: STEPS,
        initial: { n: 0 },
        stage: () => null,
        controls: {
          go: ({ state, apply }) =>
            createElement('button', { type: 'button', onClick: () => apply({ n: state.n + 1 }) }, 'go'),
        },
      }),
    ),
  );
const go = () => act(() => (host.querySelector('[data-control="go"] button') as HTMLButtonElement).click());
const log = () => [...host.querySelectorAll('.log li')].map(li => li.textContent);
const why = () => host.querySelector('.card details.why') as HTMLDetailsElement | null;

describe('story-so-far log', () => {
  it('shows a finished step’s label, not its narration', () => {
    mount();
    go();
    expect(log()).toEqual(['First step']);
  });
  it('falls back to the narration when a step has no label', () => {
    mount();
    go();
    go();
    expect(log()).toEqual(['First step', 'Second narration']);
  });
});

describe('Why? fold', () => {
  it('renders a step’s more as literal text under a Why? summary', () => {
    mount();
    expect(why()?.querySelector('summary')?.textContent).toBe('Why?');
    expect(why()?.textContent).toContain('Because <b>x</b>');
    expect(why()?.querySelector('b')).toBeNull();
  });
  it('renders no fold for a step without more', () => {
    mount();
    go();
    expect(why()).toBeNull();
  });
  it('is closed in Pictures mode and open in Words mode', () => {
    document.documentElement.dataset.reading = 'visual';
    mount();
    expect(why()?.open).toBe(false);
    act(() => {
      document.documentElement.dataset.reading = 'words';
      window.dispatchEvent(new CustomEvent('tinker-reading'));
    });
    expect(why()?.open).toBe(true);
  });
  it('is open when no reading mode is set (no script ran, everything shows)', () => {
    mount();
    expect(why()?.open).toBe(true);
  });
});
