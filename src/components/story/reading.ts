// The reader's Pictures / Words choice, shared with the module intros (ReadingMode.astro): data-reading on <html>,
// remembered in localStorage `tinker-reading`. A change is announced with a `tinker-reading` event. With no choice set
// (no script, no clip on the page) nothing folds.
import { useSyncExternalStore } from 'react';

export type Reading = 'visual' | 'words';

const subscribe = (f: () => void) => {
  window.addEventListener('tinker-reading', f);
  return () => window.removeEventListener('tinker-reading', f);
};

/** true unless the reader chose Pictures */
export const useWords = () =>
  useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.reading !== 'visual',
    () => true,
  );

export function setReading(m: Reading) {
  document.documentElement.dataset.reading = m;
  try {
    localStorage.setItem('tinker-reading', m);
  } catch {}
  window.dispatchEvent(new CustomEvent('tinker-reading'));
}
