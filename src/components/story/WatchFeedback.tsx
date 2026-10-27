// The Watch pilot's one signal (R11): after a watched chapter, "Was Watch better?" Yes / No. One click sends the
// module, chapter and answer to FormSubmit and nothing else; the answer is kept so the question never comes back.
import { useState } from 'react';
import { FORM_AJAX } from '../../lib/site';

const KEY = 'tinker-watch-feedback';
type Answer = 'yes' | 'no';

function answers(): Record<string, Answer> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export const answered = (module: string, chapter: string) => `${module}/${chapter}` in answers();

export function keep(module: string, chapter: string, answer: Answer) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...answers(), [`${module}/${chapter}`]: answer }));
  } catch {}
}

export default function WatchFeedback({ module, chapter }: { module: string; chapter: string }) {
  const [state, setState] = useState<'ask' | 'sent' | 'hidden'>(() => (answered(module, chapter) ? 'hidden' : 'ask'));
  if (state === 'hidden') return null;
  const send = (answer: Answer) => {
    keep(module, chapter, answer);
    setState('sent');
    fetch(FORM_AJAX, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ module, chapter, answer }),
    }).catch(() => {}); // a failed send is ignored: the answer is a pilot signal, never in the reader's way
  };
  return (
    <div className="watch-feedback" role="group" aria-label="Was Watch better?">
      {state === 'sent' ? (
        <p role="status">Thanks</p>
      ) : (
        <>
          <p aria-hidden="true">Was Watch better?</p>
          <button type="button" className="chip" onClick={() => send('yes')}>
            Yes
          </button>
          <button type="button" className="chip" onClick={() => send('no')}>
            No
          </button>
        </>
      )}
    </div>
  );
}
