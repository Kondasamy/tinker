// Chapter 4: the wait. Time to first word plus the reply's words at each machine's pace (hand-set speeds). The reader
// predicts when A's reply is finished, then slides the wait poise until the beam tips away from A. Cites NVIDIA's
// definitions; links Inference, where the pace comes from.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { STEELYARD_PARTS } from '../../components/scenes/steelyardScene';
import { REPLY, machineOf } from '../../lib/choosing-models/machines';
import { secs, wholeReply } from '../../lib/choosing-models/price';
import { rowsOf, weigh, type Weights } from '../../lib/choosing-models/score';
import { qualityText } from '../../lib/choosing-models/story';
import pinned from '../../../data/choosing-models/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, MachinesNote, SteelyardStage } from './kit';

const MODULE = 'choosing-models',
  ID = '04-the-wait';
export const PARTS = STEELYARD_PARTS;
const ROWS = rowsOf('larkspur');
const Q = qualityText('larkspur');
const A = machineOf('A'),
  C = machineOf('C');
/** A's whole reply, rounded to the second, and two wrong guesses either side */
export const WHOLE_A = Math.round(wholeReply(A, REPLY));
export const START: Weights = { quality: 2, cost: 0, wait: 0 };

export interface S {
  w: Weights;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `Machine A’s first word comes after ${secs(A.ttft)}. When is its whole reply written?`,
  options: [`After about ${Math.ceil(A.ttft)} s`, `After about ${WHOLE_A * 4} s`, `After about ${WHOLE_A} s`],
};
export const OUTCOME = 2;

export const QUIZ = {
  question: 'A model writes long overnight reports that nobody watches being written. Which wait matters?',
  options: [
    'The time to the whole report, if any',
    'The time to its first word',
    'Neither the first word nor the whole: only words per second',
  ],
  correct: 0,
  explanation: 'Nobody watches it stream, so only when the whole report is done can matter.',
  why: [
    'Right: with nobody watching, only the finished report counts, and overnight even that may not.',
    'The first word matters to someone watching a reply stream in, and nobody is.',
    'Words per second is only half the whole wait; the first word’s delay adds to it.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Larkspur shows replies by streaming them. The customer first waits the time to first word, then reads ${REPLY.words} words as they come.`,
    act: 'Predict first.',
    say: { block: 'machine-a', text: 'Slowest start' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'slide',
    focus: 'weights',
    visibleControls: ['out1'],
    narration: `At its words per second, A finishes in ${secs(wholeReply(A, REPLY))}; C, starting in ${secs(C.ttft)}, in ${secs(wholeReply(C, REPLY))}.`,
    act: 'Slide Wait until the beam tips.',
    say: { block: 'wait', text: 'Wait' },
    predicate: s => weigh(ROWS, s.w).winner !== 'A' && weigh(ROWS, s.w).winner !== null,
    hint: `Try Wait at ${pinned.waitTip}.`,
    solution: s => ({ ...s, w: { ...s.w, wait: pinned.waitTip ?? 1 } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'inference', 'quiz'],
    narration: 'Streaming hides some of the wait, never all of it: the first word sets how fast it feels.',
    act: 'One question to finish.',
    say: { block: 'pan', text: 'Fast reply' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who is watching the words arrive?',
  },
];

export default function TheWait() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ w: START, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <SteelyardStage
          rows={ROWS}
          weights={state.w}
          only={['quality', 'wait']}
          onWeights={state.p1 === null ? undefined : w => (focus === 'weights' ? apply : sync)({ ...state, w })}
          quality={Q}
          pills={Q.pills}
          say={say}
          step={focus}
          caption={`Whole reply: ${ROWS.map(r => `${r.id} ${secs(r.wait)}`).join(', ')}. Hand-set speeds.`}
        >
          <MachinesNote />
        </SteelyardStage>
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => <Fact id="ttft" />,
        inference: () => (
          <p className="note">
            <a href="/inference/01-prefill-and-decode/">
              Where both waits come from: chapter 1 of the module on serving models.
            </a>
          </p>
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
