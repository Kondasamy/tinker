// @vitest-environment happy-dom
// The site's own drop-down: a combobox button and a list of options in place of a native <select>. It reads <option>
// children, opens by click or keys, picks by click or Enter, closes on Escape or a press elsewhere, reports the pick as
// e.target.value, and never fires for the value already chosen.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement as h, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Select from '../../src/components/story/Select';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Select', () => {
  let root: Root, host: HTMLElement, changes: string[];
  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    changes = [];
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });
  function Harness({ disabled = false }: { disabled?: boolean }) {
    const [v, setV] = useState('b');
    return h(
      'label',
      null,
      'Size',
      h(
        Select,
        {
          value: v,
          disabled,
          onChange: e => {
            changes.push(e.target.value);
            setV(e.currentTarget.value);
          },
        },
        h('option', { value: 'a' }, 'Apple'),
        h('option', { value: 'b' }, 'Banana'),
        h('option', { value: 'c' }, 'Cherry'),
      ),
    );
  }
  const button = () => host.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  const list = () => host.querySelector<HTMLElement>('[role="listbox"]')!;
  const options = () => [...host.querySelectorAll<HTMLElement>('[role="option"]')];
  const press = (key: string) =>
    act(() => {
      button().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    });

  it('shows the chosen option, closed, as a combobox with no native select', () => {
    act(() => root.render(h(Harness)));
    expect(host.querySelector('select')).toBeNull();
    expect(button().textContent).toBe('Banana');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().dataset.value).toBe('b');
    expect(list().hidden).toBe(true);
    expect(options().map(o => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
  });

  it('opens on click and picks an option, reporting its value once', () => {
    act(() => root.render(h(Harness)));
    act(() => button().click());
    expect(list().hidden).toBe(false);
    expect(button().getAttribute('aria-expanded')).toBe('true');
    act(() => options()[2].click());
    expect(changes).toEqual(['c']);
    expect(button().textContent).toBe('Cherry');
    expect(list().hidden).toBe(true);
  });

  it('picking the option already chosen fires no change', () => {
    act(() => root.render(h(Harness)));
    act(() => button().click());
    act(() => options()[1].click());
    expect(changes).toEqual([]);
    expect(list().hidden).toBe(true);
  });

  it('by keyboard: arrows open and move, Enter picks, Escape closes without a change', () => {
    act(() => root.render(h(Harness)));
    press('ArrowDown');
    expect(list().hidden).toBe(false);
    expect(button().getAttribute('aria-activedescendant')).toBe(options()[1].id);
    press('ArrowDown');
    press('ArrowDown');
    expect(button().getAttribute('aria-activedescendant')).toBe(options()[2].id);
    press('Enter');
    expect(changes).toEqual(['c']);
    press('ArrowUp');
    press('Home');
    press('Escape');
    expect(list().hidden).toBe(true);
    expect(changes).toEqual(['c']);
  });

  it('typing jumps to the option that starts with what was typed, a word at a time', () => {
    act(() => root.render(h(Harness)));
    press('Enter');
    press('a');
    press('Enter');
    expect(changes).toEqual(['a']);
    press('Enter');
    for (const k of 'che') press(k);
    press('Enter');
    expect(changes).toEqual(['a', 'c']);
  });

  it('a press elsewhere closes the list', () => {
    act(() => root.render(h(Harness)));
    act(() => button().click());
    act(() => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(list().hidden).toBe(true);
  });

  it('a disabled drop-down does not open', () => {
    act(() => root.render(h(Harness, { disabled: true })));
    expect(button().disabled).toBe(true);
    act(() => button().click());
    expect(list().hidden).toBe(true);
  });
});
