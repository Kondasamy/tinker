import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props { title: string; onClose: () => void; focusKey: number; children: ReactNode }

/** Non-modal panel for supporting views (answer, evidence, chunks). Beside the card on desktop, below it on phones. */
export default function Drawer({ title, onClose, focusKey, children }: Props) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  // Learner-opened (Inspect) moves focus in; step-opened leaves focus on the control in use.
  useEffect(() => { if (focusKey) heading.current?.focus(); }, [focusKey]);
  return (
    <aside className="drawer" aria-labelledby={id} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <header>
        <h2 id={id} ref={heading} tabIndex={-1}>{title}</h2>
        <button type="button" className="chip" onClick={onClose} aria-label={`Close ${title}`}>×</button>
      </header>
      {children}
    </aside>
  );
}
