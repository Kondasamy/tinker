// Chapter 4: being interrupted. Dana asks for a delivery slot; the reader picks where she cuts in (no sound needed),
// first with the line talking over her, then with barge-in on: the host stops, and the history keeps only the parts said
// before she spoke. The follow-up replies are recorded per what the model was told.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DEFAULT_LINE, POINTS, partOf, runCall, type Point } from '../../lib/voice/engine';
import { lineOf, textOf } from '../../lib/voice/script';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { PHONE_PARTS } from '../../components/scenes/phoneScene';
import { Fact, RecordedNote, Say, Toggle, Transcript, VoiceStage, segmentsOf, type View } from './kit';

const MODULE = 'voice',
  ID = '04-being-interrupted';
const BASE = { ...DEFAULT_LINE, streaming: true, silence: 800 as const };
const runOf = (point: Point, bargeIn: boolean) => runCall('slots', { ...BASE, point, bargeIn });
const REPLY = 'slots-reply',
  PIECES = lineOf(REPLY).parts;
export const PARTS = PHONE_PARTS;

interface S {
  asked: boolean;
  point: Point | null;
  p1: number | null;
  bargeIn: boolean;
  view: View;
  quiz: number | null;
}

const P1 = {
  question:
    'Turn barge-in on: the line stops speaking as soon as Dana starts. What should the model’s history say the assistant said?',
  options: [
    'The whole reply, as the model wrote it',
    'Only the part spoken before Dana cut in',
    'Nothing: an interrupted reply doesn’t count',
  ],
};
/** read off the recording: how much of the reply the history keeps */
export const outcome = (p: Point) => {
  const kept = runOf(p, true).recording.turns.find(t => t.clip === REPLY)!.kept!;
  return kept === PIECES.length ? 0 : kept > 0 ? 1 : 2;
};

export const QUIZ = {
  question:
    'A cinema’s phone assistant is cut off while listing showtimes, after “six fifteen”. Its history still holds all four times it wrote. What goes wrong next?',
  options: [
    'Nothing: the model has the full list',
    'The model may refer to times the caller never heard',
    'The call drops',
  ],
  correct: 1,
  explanation: 'The history should match what the caller heard; anything beyond the cut was never said.',
  why: [
    'Having the full list is the problem: the model thinks the caller heard it too.',
    'Right: it might offer “the eight o’clock one, then?”, a time never spoken, so keep only what was said.',
    'An interruption doesn’t end the call; the next turn just starts from the wrong place.',
  ],
};

const where = (p: Point) => `During “${PIECES[partOf(p)].text.replace(/,$/, '')}”`;

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: 'The assistant reads Dana’s delivery slots out one by one.',
    act: 'Let her ask.',
    say: { block: 'mouth', text: 'Reads slots out' },
    predicate: s => s.asked,
  },
  {
    id: 'point',
    focus: 'point',
    visibleControls: ['reply', 'point'],
    narration: 'The line has no barge-in yet: it keeps talking and isn’t listening.',
    act: 'Pick where Dana cuts in; no sound needed.',
    say: { block: 'mouth', text: 'Keeps talking' },
    predicate: s => s.point !== null,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['talkedOver', 'p1'],
    narration:
      'Dana’s words never reached the model, so it offers the slot she ruled out. Its next turn reads the history.',
    act: 'Predict what it should keep.',
    say: { block: 'model', text: 'Never heard her' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'bargein',
    focus: 'bargein',
    visibleControls: ['p1', 'bargein'],
    narration: 'Your pick is locked.',
    act: 'Turn barge-in on, then compare where Dana cuts in.',
    predicate: s => s.bargeIn,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['outcome', 'quiz'],
    narration: 'The line stopped and heard Dana; its history keeps only what was said.',
    act: 'One question to finish.',
    say: { block: 'model', text: 'Said part only' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the model believe the caller heard?',
  },
];

export default function BeingInterrupted() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: false, point: null, p1: null, bargeIn: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, focus, say }) => {
        const r = state.point ? runOf(state.point, state.bargeIn) : null;
        return (
          <VoiceStage
            step={focus}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            shown={{
              phone: !state.asked
                ? { stage: 'idle' }
                : r
                  ? { stage: 'reply', interrupt: true, stopped: state.bargeIn }
                  : { stage: 'reply' },
              timeline: r ? segmentsOf(r, state.point!) : undefined,
              caption: !state.asked
                ? 'The phone desk, waiting for Dana.'
                : !r
                  ? 'The assistant reads the slots out.'
                  : state.bargeIn
                    ? `Barge-in on: the line stops when Dana speaks, and keeps “${textOf(REPLY, partOf(state.point!))} —”.`
                    : 'No barge-in: the reply plays on over Dana, and her words are lost.',
            }}
          />
        );
      }}
      controls={{
        ask: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, asked: true })}>
            Dana asks for a slot
          </button>
        ),
        reply: () => (
          <>
            <Say clip="slots-caller" />
            <Say clip={REPLY} />
          </>
        ),
        point: ({ state, apply }) => (
          <div className="vo-row" role="group" aria-label="Where Dana cuts in">
            {POINTS.map(p => (
              <button
                key={p}
                type="button"
                className="chip"
                aria-pressed={state.point === p}
                onClick={() => apply({ ...state, point: p, view: 'timeline' })}
              >
                {where(p)}
              </button>
            ))}
          </div>
        ),
        talkedOver: ({ state }) => <Transcript run={runOf(state.point ?? 'stop-3', false)} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        bargein: ({ state, sync }) => (
          <>
            <div className="vo-row">
              <Toggle label="Barge-in" on={state.bargeIn} onChange={v => sync({ ...state, bargeIn: v })} />
            </div>
            <div className="vo-row" role="group" aria-label="Where Dana cuts in">
              {POINTS.map(p => (
                <button
                  key={p}
                  type="button"
                  className="chip"
                  aria-pressed={state.point === p}
                  onClick={() => sync({ ...state, point: p })}
                >
                  {where(p)}
                </button>
              ))}
            </div>
            <Transcript run={runOf(state.point ?? 'stop-3', state.bargeIn)} />
          </>
        ),
        outcome: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome(state.point ?? 'stop-3')} />
            <Transcript run={runOf(state.point ?? 'stop-3', true)} />
            <Fact id="gemini-interrupt" />
            <RecordedNote />
          </>
        ),
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
