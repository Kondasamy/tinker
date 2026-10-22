// Dev host for /dev/canvas/: owns the canvas state like a chapter would and prints the outcome.
import { useState } from 'react';
import Canvas from './Canvas';
import { initialCanvas, unlockedThrough, type CanvasQuestion, type Outcome } from './state';
import ch3 from '../../../data/questions/ch3.json';

const question = ch3[0] as CanvasQuestion;

export default function CanvasDemo() {
  const [state, setState] = useState(() => initialCanvas(unlockedThrough('04-layers')));
  const [out, setOut] = useState<Outcome | null>(null);
  const a = out?.answer;
  return (
    <>
      <Canvas state={state} onChange={setState} question={question} allowBench onResult={setOut} />
      <section className="demo-out" aria-label="Result" data-verdict={a?.verdict ?? ''}>
        <p>
          <b>Q:</b> {question.query}
        </p>
        <p data-testid="context">
          {out?.record ? `${out.record.context.length} chunks reached the model` : 'No chunks reached the model'}
        </p>
        <p data-testid="answer">
          {!a
            ? '…'
            : a.verdict === 'norecord'
              ? 'No recorded answer for this exact setting.'
              : `${a.verdict.toUpperCase()}: ${a.text}`}
        </p>
      </section>
    </>
  );
}
