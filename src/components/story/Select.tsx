// A drop-down drawn in the site's own ink, never the system's native picker. It takes the same <option> children and
// gives onChange the same `e.target.value` / `e.currentTarget.value` as a native select, so a call site swaps only the tag.
// ARIA's select-only combobox: the button keeps focus, the list follows it with aria-activedescendant. Spans only, so
// it sits inside a <label> or <p> without breaking hydration; a wrapping <label> still names it.
import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './select.css';

type Change = { target: { value: string }; currentTarget: { value: string } };
type Props = {
  value: string | number;
  onChange?: (e: Change) => void;
  children: ReactNode;
  id?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};
type Opt = { value: string; label: ReactNode; text: string };

const textOf = (n: ReactNode): string =>
  Children.toArray(n)
    .map(c => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
    .join('');

export default function Select({ value, onChange, children, id, disabled, className, ...aria }: Props) {
  const listId = useId();
  const box = useRef<HTMLSpanElement>(null);
  const opts: Opt[] = Children.toArray(children).flatMap(c =>
    isValidElement<{ value?: string | number; children?: ReactNode }>(c) && c.type === 'option'
      ? [
          {
            value: String(c.props.value ?? textOf(c.props.children)),
            label: c.props.children,
            text: textOf(c.props.children),
          },
        ]
      : [],
  );
  const at = Math.max(
    0,
    opts.findIndex(o => o.value === String(value)),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(at);

  // a press anywhere else closes the list, as a native picker does
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const show = () => {
    setActive(at);
    setOpen(true);
  };
  const pick = (i: number) => {
    setOpen(false);
    const v = opts[i]?.value;
    if (v !== undefined && v !== String(value)) onChange?.({ target: { value: v }, currentTarget: { value: v } });
  };
  const key = (e: React.KeyboardEvent) => {
    const last = opts.length - 1;
    const move = (i: number) => {
      e.preventDefault();
      setActive(Math.min(last, Math.max(0, i)));
    };
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === 'ArrowDown') move(active + 1);
    else if (e.key === 'ArrowUp') move(active - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(last);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1) {
      // typing a letter jumps to the next option that starts with it
      const k = e.key.toLowerCase();
      const next = [...opts.slice(active + 1), ...opts.slice(0, active + 1)].find(o =>
        o.text.toLowerCase().startsWith(k),
      );
      if (next) move(opts.indexOf(next));
    }
  };

  return (
    <span className={`sel${className ? ` ${className}` : ''}`} ref={box}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        data-value={String(value)}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={key}
        {...aria}
      >
        <span className="sel-value">{opts[at]?.label}</span>
      </button>
      <span className="sel-list" id={listId} role="listbox" hidden={!open}>
        {opts.map((o, i) => (
          // biome-ignore lint/a11y/useFocusableInteractive: options are reached through aria-activedescendant, never focused
          <span
            key={o.value}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === at}
            data-value={o.value}
            data-active={open && i === active ? '' : undefined}
            onPointerDown={e => e.preventDefault()}
            onPointerEnter={() => setActive(i)}
            onClick={e => {
              // inside a <label>, the click would otherwise reach the button again and reopen the list
              e.preventDefault();
              pick(i);
            }}
          >
            {o.label}
          </span>
        ))}
      </span>
    </span>
  );
}
