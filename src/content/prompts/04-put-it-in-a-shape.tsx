// Chapter 4: put it in a shape. The reader predicts whether the JSON card's reply will parse, clips the three-line
// list (a shape people read), then JSON for the router: the recorded reply parses and routes to the right team.
// Links Structured outputs, where the model is made to obey a schema instead of asked.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DOCKET_PARTS } from '../../components/scenes/docketScene';
import { START } from '../../lib/prompts/assemble';
import type { Docket } from '../../lib/prompts/cards';
import { Outcome } from '../tool-calling/kit';
import { DocketStage, captionOf, type View } from './kit';

const MODULE = 'prompts',
  ID = '04-put-it-in-a-shape';
export const PARTS = DOCKET_PARTS;

export interface S {
  d: Docket;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'You clip the JSON card. Can the router read the reply?',
  options: [
    'Yes: it parses, with the right team',
    'It parses, but names the wrong team',
    'No: chatty text creeps in around it',
  ],
};
/** it parses and routes right, in this one recording (the chapter test checks it) */
export const OUTCOME = 0;

export const QUIZ = {
  question:
    'An app reads a model’s JSON. About one reply in fifty starts with “Sure! Here it is:”. What fixes it for good?',
  options: [
    'Parse strictly, and use structured outputs where the model offers them',
    'Ask for JSON more firmly in the prompt',
    'Always cut the reply’s first line',
  ],
  correct: 0,
  explanation: 'A format line asks; only a checked parse, or a model held to a schema, makes it certain.',
  why: [
    'Right: a strict parse catches the bad reply, and structured outputs stop the model writing one.',
    'Firmer wording makes it rarer, never impossible: the model can still add text.',
    'Most replies have no extra line, so cutting one breaks the good JSON.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The reply is prose. A format line says what shape the reply must take.',
    act: 'Predict first.',
    say: { block: 'slip', text: 'Just prose' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'list',
    focus: 'docket',
    visibleControls: [],
    narration: 'Locked in. Start with a shape people read: three lines.',
    act: 'Clip Three-line list.',
    predicate: s => s.d.format === 'list',
    hint: 'Press the Three-line list card under the picture.',
    solution: s => ({ ...s, d: { ...s.d, format: 'list' } }),
  },
  {
    id: 'json',
    focus: 'docket',
    visibleControls: [],
    narration: 'The list held. But the router needs named fields: JSON, with the team and the reply.',
    act: 'Clip JSON for the router.',
    say: { block: 'format', text: 'Three lines' },
    predicate: s => s.d.format === 'json',
    hint: 'Press the JSON for the router card under the picture.',
    solution: s => ({ ...s, d: { ...s.d, format: 'json' } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'schema', 'quiz'],
    narration: 'The router could parse it, team and all. But a format line only asks; this was one recorded reply.',
    act: 'One question to finish.',
    say: { block: 'format', text: 'JSON' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which fix stops the extra text, not just most of it?',
  },
];

export default function PutItInAShape() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ d: START[ID], view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <DocketStage
          chapter={ID}
          docket={state.d}
          onDocket={d => (focus === 'docket' ? apply : sync)({ ...state, d })}
          view={state.view}
          onView={view => sync({ ...state, view })}
          say={say}
          step={focus}
          caption={captionOf(ID, state.d)}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        schema: () => (
          <p className="note">
            <a href="/structured-outputs/01-asking-nicely/">
              Structured outputs shows how a model is held to a schema instead of asked.
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
