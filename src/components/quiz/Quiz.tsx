import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { feedback, UNSURE } from '../../lib/recall';

interface Props {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  /** one line per option, naming the misconception behind each wrong answer; missing lines fall back to `explanation` */
  why?: string[];
  /** offer "I'm not sure": shows the answer, unstamped, and calls `onUnsure` (wire it to the runner's `sync`, so it is never a miss) */
  unsure?: boolean;
  /** Pass to control the pick from outside (e.g. so Reset clears it); omit to let the quiz own it. `UNSURE` means "not sure". */
  value?: number | null;
  /** the first pick sticks (a recap records one answer per question) */
  locked?: boolean;
  onAnswer?: (right: boolean, index: number) => void;
  onUnsure?: () => void;
}

interface ChoicesProps {
  question: string;
  options: string[];
  pick: number | null;
  /** a prediction: the first pick sticks */
  locked?: boolean;
  onPick: (index: number) => void;
  children: ReactNode;
}

/** Options as a radio group (arrow keys move between them), with feedback in a live region that takes focus after a pick. */
export function Choices({ question, options, pick, locked, onPick, children }: ChoicesProps) {
  const fb = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState(0);
  useEffect(() => {
    if (picked) fb.current?.focus();
  }, [picked]);
  const frozen = locked && pick !== null;
  const choose = (i: number) => {
    if (frozen) return;
    onPick(i);
    setPicked(n => n + 1);
  };
  const arrows = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const all = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
    all[(all.indexOf(document.activeElement as HTMLElement) + d + all.length) % all.length]?.focus();
  };
  return (
    <fieldset className="quiz">
      <legend>{question}</legend>
      <div className="opts" role="radiogroup" aria-label={question} onKeyDown={arrows}>
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            role="radio"
            className="chip"
            aria-checked={pick === i}
            aria-disabled={(frozen && pick !== i) || undefined}
            onClick={() => choose(i)}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="feedback" aria-live="polite" tabIndex={-1} ref={fb}>
        {pick !== null && children}
      </div>
    </fieldset>
  );
}

export default function Quiz({
  question,
  options,
  correct,
  explanation,
  why,
  unsure,
  value,
  locked,
  onAnswer,
  onUnsure,
}: Props) {
  const [own, setPick] = useState<number | null>(null);
  const pick = value === undefined ? own : value;
  const shown = unsure ? [...options, 'I’m not sure'] : options;
  const f = feedback({ options, correct, explanation, why }, pick);
  return (
    <Choices
      question={question}
      options={shown}
      pick={pick === UNSURE ? options.length : pick}
      locked={locked}
      onPick={i => {
        if (i === options.length) {
          setPick(UNSURE);
          onUnsure?.();
        } else {
          setPick(i);
          onAnswer?.(i === correct, i);
        }
      }}
    >
      {f?.stamp && <span className={`stamp ${f.stamp === 'RIGHT' ? 'correct' : 'wrong'}`}>{f.stamp}</span>}
      {f?.answer && (
        <p>
          <strong>The answer:</strong> {f.answer}
        </p>
      )}
      <p>{f?.text}</p>
    </Choices>
  );
}
