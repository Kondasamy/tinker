// Chapter 7: same messages, three bots. Four fixed messages, one step each: the reader predicts which bots answer it
// (a locked Select), then sees all three replies. The script's and the sorter's outcomes run live; GenAI's comes from
// the recording (replies.json): a recorded reply counts as answered, and while none is recorded the reveal says so
// instead of comparing (R13). Nothing here quotes or predicts what a recorded reply says.
import { useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import Select from '../../components/story/Select';
import type { Say, Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { KIOSK_PARTS, outcomes } from '../../components/scenes/kioskScene';
import { messageOf, type Run, run } from '../../lib/before-genai/bots';
import { answerOf, OPTIONS, SHOWN } from './lessons';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { BeforeGenaiStage, Fact, Transcript, type View } from './kit';

const MODULE = 'before-genai',
  ID = '07-what-changed';
export const PARTS = KIOSK_PARTS;
export { answerOf, OPTIONS, SHOWN };
const RUNS = Object.fromEntries(SHOWN.map(id => [id, run(messageOf(id))])) as Record<string, Run>,
  IDLE = run(messageOf('where-order'));

export interface S {
  picks: Record<string, number>;
  quiz: number | null;
}
export const INITIAL: S = { picks: {}, quiz: null };

export const QUIZ = {
  question: 'What changed from the old bots to the GenAI assistant?',
  options: [
    'It writes a new reply instead of picking a written one',
    'It has a longer list of written replies',
    'It follows more keyword rules',
  ],
  correct: 0,
  explanation:
    'The old bots pick a reply people wrote ahead; GenAI writes a new one, so one model takes on many tasks.',
  why: [
    'Right: the old bots raise a card someone wrote, while a language model writes each reply word by word.',
    'It keeps no list of replies at all; it writes each one as it goes.',
    'It has no keyword rules; it learned from text, then from requests paired with answers.',
  ],
};

const picked = (id: string) => (s: S) => s.picks[id] !== undefined;
const ACT = 'Predict which bots answer.';
export const STEPS: Step<S>[] = [
  {
    id: 'refund',
    focus: SHOWN[0],
    visibleControls: [SHOWN[0]],
    narration:
      'Each message goes to all three bots. Script and sorter pick a written reply; the GenAI assistant writes its own.',
    act: ACT,
    say: { block: 'model', text: 'Writes a reply' },
    predicate: picked(SHOWN[0]),
  },
  {
    id: 'late',
    focus: SHOWN[1],
    visibleControls: [SHOWN[0], SHOWN[1]],
    narration: 'Refunds are on both old bots’ lists, so each raised its card. Next: a late delivery, in new words.',
    act: ACT,
    say: { block: 'cards', text: 'Picked a card' },
    predicate: picked(SHOWN[1]),
  },
  {
    id: 'poem',
    focus: SHOWN[2],
    visibleControls: [SHOWN[1], SHOWN[2]],
    narration:
      'The script missed it; the sorter knew its words from labelled tickets. Next, a request no help desk planned.',
    act: ACT,
    say: { block: 'sorter', text: 'Caught it' },
    predicate: picked(SHOWN[2]),
  },
  {
    id: 'spanish',
    focus: SHOWN[3],
    visibleControls: [SHOWN[2], SHOWN[3]],
    narration: 'No rule or bin covers a poem, so both old bots fell back. Last: chapter 1’s question, in Spanish.',
    act: ACT,
    say: { block: 'customer', text: 'In Spanish' },
    predicate: picked(SHOWN[3]),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: [SHOWN[3], 'facts', 'quiz'],
    narration:
      'Both old bots fell back: they only know English words. Old bots pick a written reply; GenAI writes a new one.',
    act: 'One question to finish.',
    say: { block: 'cards', text: 'Pick or write' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does each bot’s reply come from?',
  },
];

/** what happened to the two old bots, in words; GenAI's part is said apart, since it may not be recorded */
const oldBots = (r: Run) =>
  `the script ${r.scripted.answered ? 'answered' : 'fell back'}, the sorter ${r.intent.answered ? 'answered' : 'fell back'}`;

/** One message: the customer's line and the locked prediction; once picked, every bot's reply and the comparison. */
function Message({ id, s, apply, focused }: { id: string; s: S; apply: (s: S) => void; focused: boolean }) {
  const r = RUNS[id],
    pick = s.picks[id],
    done = pick !== undefined;
  return (
    <>
      <Transcript run={r} bots={done ? undefined : []} />
      <p className="bg-pick">
        <label>
          Which bots answer?{' '}
          <Select
            value={done ? String(pick) : ''}
            disabled={!focused || done}
            onChange={e => apply({ ...s, picks: { ...s.picks, [id]: Number(e.target.value) } })}
          >
            <option value="">Choose</option>
            {OPTIONS.map((o, i) => (
              <option key={o} value={i}>
                {o}
              </option>
            ))}
          </Select>
        </label>
      </p>
      {done &&
        (r.genai.recorded ? (
          <Outcome options={OPTIONS} prediction={pick} outcome={answerOf(r)} />
        ) : (
          <div className="feedback" role="status">
            <p>You predicted: {OPTIONS[pick]}</p>
            <p>{`What happened: ${oldBots(r)}. The GenAI reply isn’t recorded yet.`}</p>
          </div>
        ))}
    </>
  );
}

/** The stage opens on the side-by-side view here: this chapter's lesson is the three bots next to each other. */
function Stage({ r, say }: { r: Run; say?: Say }) {
  const [view, setView] = useState<View>('flat'),
    out = outcomes(r);
  return (
    <BeforeGenaiStage
      run={r}
      say={say}
      view={view}
      onView={setView}
      caption={`“${r.message.text}”: script ${out.script}, sorter ${out.sorter}, GenAI ${out.genai}.`}
    />
  );
}

export default function WhatChanged() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={INITIAL}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        // the last message the reader has predicted, so the picture never shows an outcome before the pick
        const last = SHOWN.filter(id => state.picks[id] !== undefined).at(-1);
        return <Stage r={last ? RUNS[last] : IDLE} say={say} />;
      }}
      controls={{
        ...Object.fromEntries(
          SHOWN.map(id => [
            id,
            (p: { state: S; apply: (s: S) => void; focused: boolean }) => (
              <Message id={id} s={p.state} apply={p.apply} focused={p.focused} />
            ),
          ]),
        ),
        facts: () => <Fact id="few-shot" />,
        quiz: ({ state, apply, sync }) => (
          <Quiz
            {...QUIZ}
            unsure
            value={state.quiz}
            onAnswer={(_, q) => apply({ ...state, quiz: q })}
            onUnsure={() => sync({ ...state, quiz: UNSURE })}
          />
        ),
      }}
    />
  );
}
