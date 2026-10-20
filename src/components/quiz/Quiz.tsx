import { useState } from 'react';

interface Props {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  /** Pass to control the pick from outside (e.g. so Reset clears it); omit to let the quiz own it. */
  value?: number | null;
  onAnswer?: (right: boolean, index: number) => void;
}

export default function Quiz({ question, options, correct, explanation, value, onAnswer }: Props) {
  const [own, setPick] = useState<number | null>(null);
  const pick = value === undefined ? own : value;
  const right = pick === correct;
  return (
    <fieldset className="quiz">
      <legend>{question}</legend>
      <div className="opts">
        {options.map((o, i) => (
          <button key={o} type="button" className="chip" aria-pressed={pick === i}
            onClick={() => { setPick(i); onAnswer?.(i === correct, i); }}>{o}</button>
        ))}
      </div>
      {pick !== null && (
        <div className="feedback" role="status">
          <span className={`stamp ${right ? 'correct' : 'wrong'}`}>{right ? 'RIGHT' : 'NOT QUITE'}</span>
          <p>{explanation}</p>
        </div>
      )}
    </fieldset>
  );
}
