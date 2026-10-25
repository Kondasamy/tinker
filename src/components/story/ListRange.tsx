import { useId } from 'react';

/** A native range over a finite list: arrow keys step through it, and the output (and the slider's value text) say
 * the chosen item in words. Each module styles it through its own class. */
export function ListRange<T>({
  className,
  label,
  list,
  value,
  words,
  onChange,
}: {
  className: string;
  label: string;
  list: readonly T[];
  value: T;
  words: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const id = 'rng' + useId().replace(/[^\w-]/g, ''),
    i = Math.max(0, list.indexOf(value));
  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={list.length - 1}
        step={1}
        value={i}
        aria-valuetext={words(value)}
        onChange={e => onChange(list[Number(e.currentTarget.value)])}
      />
      <output htmlFor={id} aria-live="polite">
        {words(value)}
      </output>
    </div>
  );
}
