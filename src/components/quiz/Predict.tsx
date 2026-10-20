// Predict, then reveal (KTD6, R9). The prediction step's predicate is "a prediction exists" (`s.prediction !== null`);
// the next step shows `Reveal`, which advances on the reveal and compares the prediction with what happened.
// The chapter keeps the stage neutral until the reveal. The pick lives in chapter state, so a reload restores the lock.
import { Choices } from './Quiz';

interface Props {
  question: string;
  options: string[];
  /** the locked pick, from chapter state */
  value: number | null;
  onPredict?: (index: number) => void;
}

export default function Predict({ question, options, value, onPredict }: Props) {
  return (
    <Choices question={question} options={options} pick={value} locked onPick={i => onPredict?.(i)}>
      {value !== null && <p><strong>You predicted: {options[value]}</strong></p>}
    </Choices>
  );
}

interface RevealProps {
  prediction: string | null;
  outcome: string;
  revealed: boolean;
  onReveal: () => void;
  label?: string;
}

export function Reveal({ prediction, outcome, revealed, onReveal, label = 'Show what happens' }: RevealProps) {
  if (!revealed) return <button type="button" className="chip" onClick={onReveal}>{label}</button>;
  const same = prediction === outcome;
  return (
    <div className="feedback" role="status">
      <span className={`stamp ${same ? 'correct' : 'neutral'}`}>{same ? 'AS YOU PREDICTED' : 'NOT WHAT YOU PREDICTED'}</span>
      <p>You predicted: {prediction ?? 'nothing'}</p>
      <p>What happened: {outcome}</p>
    </div>
  );
}
