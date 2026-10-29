// Chapter 1: can you tell? One customer question, a hand-written reply and a real model's recorded reply side by side
// (data/watermarks/human.json and machine.json, labelled where they show). The reader guesses which is the model's,
// then predicts how AI-text detectors do on people's own writing: the cited finding (Liang et al.) is the reveal.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { longDate } from '../../lib/format';
import { encode } from '../../lib/lm/bpe';
import { UV_PARTS } from '../../components/scenes/uvScene';
import { HUMAN, MACHINE, MACHINE_META } from '../../lib/watermarks/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, UvStage } from './kit';

const MODULE = 'watermarks',
  ID = '01-can-you-tell';
export const PARTS = UV_PARTS;
/** The pair the reader judges: one question, answered by a person and by the recorded model. */
const PAIR_ID = 'h02';
const PERSON = HUMAN.find(h => h.id === PAIR_ID)!,
  MODEL = MACHINE.find(m => m.id === PAIR_ID)!;
/** Reply A is the model's. */
export const REPLIES = [
  { name: 'Reply A', text: MODEL.reply, by: `recorded from ${MACHINE_META.model}, ${longDate(MACHINE_META.accessed)}` },
  { name: 'Reply B', text: PERSON.reply, by: `hand-written for this site, as ${PERSON.by} on Larkspur’s team` },
];
const PAGE = encode(MODEL.reply).slice(0, 64);

export interface S {
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Which reply did the model write?',
  options: ['Reply A', 'Reply B', 'I can’t tell'],
};
export const P2 = {
  question: 'Detectors were tested on essays people wrote. Whose did they often call AI-made?',
  options: ['Non-native English writers’', 'Native English writers’', 'Hardly anyone’s'],
};
/** What Liang et al. found (facts.json, detector-bias). */
export const OUTCOME2 = 0;

export const QUIZ = {
  question: 'A teacher’s detector flags a student’s essay as AI-written. What can the teacher conclude?',
  options: [
    'Not much: with no mark to find, a detector only guesses',
    'The student used a model',
    'The essay is too fluent for a person',
  ],
  correct: 0,
  explanation: 'A detector judges style, and careful or non-native writers can share a model’s plain style.',
  why: [
    'Right: without a mark put in on purpose, a detector reads only style, and people write in every style.',
    'Detectors have flagged essays people wrote, most often by non-native English writers.',
    'Fluent, plain writing is what careful people produce too; it is no proof of a model.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'guess',
    focus: 'p1',
    visibleControls: ['pair', 'p1'],
    narration: 'One customer question, two replies: one written by a person, one recorded from a large model.',
    act: 'Pick the model’s reply.',
    say: { block: 'page', text: 'Who wrote it?' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'detectors',
    focus: 'p2',
    visibleControls: ['pair', 'out1', 'p2'],
    narration: 'Reply A was the model. Good model text has no tell a reader can see. Could a detector see one?',
    act: 'Predict first.',
    predicate: s => s.p2 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'quiz'],
    narration: 'A detector without a mark can only guess. Larkspur wants a watermark: a pattern it puts in on purpose.',
    act: 'One question to finish.',
    say: { block: 'clerk', text: 'Can’t prove it' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What is a detector looking at, when there is no mark to find?',
  },
];

function Pair({ open }: { open: boolean }) {
  return (
    <section className="wm-pair" aria-label="Two replies">
      <p className="wm-q">{`“${PERSON.question}”`}</p>
      {REPLIES.map(r => (
        <article key={r.name} className="wm-reply">
          <h3>{r.name}</h3>
          <p>{r.text}</p>
          {open && <p className="note">{r.by}</p>}
        </article>
      ))}
      {!open && <p className="note">One is hand-written for this site; one was recorded once from a real model.</p>}
    </section>
  );
}

export default function CanYouTell() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ say }) => (
        <UvStage
          say={say}
          ids={PAGE}
          prompt={PERSON.question}
          lamp={null}
          caption="Reply A on the light table, the lamp parked: there is no mark to look for."
        />
      )}
      controls={{
        pair: ({ state }) => <Pair open={state.p1 !== null} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={0} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out2: ({ state }) => (
          <>
            <Outcome {...P2} prediction={state.p2} outcome={OUTCOME2} />
            <Fact id="detector-bias" />
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
