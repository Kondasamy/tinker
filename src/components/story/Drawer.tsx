import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props { title: string; onClose: () => void; focusKey: number; sheet?: boolean; children: ReactNode }

/** Non-modal panel for supporting views (answer, evidence, chunks). Beside the card on desktop, below it on phones;
 * `sheet` (opened from a message card) makes it a bottom sheet on phones (R21). */
export default function Drawer({ title, onClose, focusKey, sheet, children }: Props) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | SVGElement | null>(null);
  // Learner-opened (Inspect, a message card) moves focus in, and closing returns it; step-opened leaves focus on the control in use.
  useEffect(() => {
    if (!focusKey) return;
    opener.current = document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement ? document.activeElement : null;
    heading.current?.focus();
  }, [focusKey]);
  const close = () => {
    const o = opener.current, msg = o?.getAttribute('data-msg');
    onClose();
    if (!o) return;
    // a redrawn figure replaces its cards: fall back to the visible card for the same message
    requestAnimationFrame(() => {
      const back = o.isConnected ? o : msg == null ? null
        : [...document.querySelectorAll<SVGElement>(`[data-msg="${msg}"][role="button"]`)].find(el => el.getClientRects().length);
      back?.focus();
    });
  };
  return (
    <aside className={`drawer${sheet ? ' sheet' : ''}`} aria-labelledby={id} onKeyDown={e => e.key === 'Escape' && close()}>
      <header>
        <h2 id={id} ref={heading} tabIndex={-1}>{title}</h2>
        <button type="button" className="chip" onClick={close} aria-label={`Close ${title}`}>×</button>
      </header>
      {children}
    </aside>
  );
}
