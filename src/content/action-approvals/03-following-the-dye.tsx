// Chapter 3: following the dye (R6b.3). One task from a hand-written example run (data/action-approvals/run.json):
// Rosa's request, a note, then the fake billing email and three more things written after it. The reader predicts which
// carry the dye; the reveal plays the email and closes in on the desk, where the refund, the log and the reply are all
// violet. The reply leaves Larkspur: the trifecta, linked to Guardrails' chapter and cited from Willison.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { TOLL_PARTS, type Toll, type TollSlip } from '../../components/scenes/tollScene';
import { fact } from '../../lib/action-approvals/facts';
import { dyeOf, type Turn } from '../../lib/action-approvals/gate';
import RUN from '../../../data/action-approvals/run.json' with { type: 'json' };
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ApprovalsStage, Fact, ToyNote, type Row } from './kit';

const MODULE = 'action-approvals',
  ID = '03-following-the-dye';
export const TURNS = RUN.turns as Turn[];
const DYE = dyeOf(TURNS);
/** where each read turn starts: delivering plays a read and the writes after it */
const READS = TURNS.flatMap((t, i) => ('read' in t ? [i] : []));
const KIND: Record<string, TollSlip['kind']> = { log: 'note', refund: 'refund', email: 'email' };

interface S {
  /** turns played */
  n: number;
  leaves: string | null;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'After reading the email, the assistant writes a refund, a log line and a reply. Which carry the dye?',
  options: [
    'All three: they come after the email',
    'Only the refund the email asked for',
    'None: the assistant wrote them in its own words',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A support assistant reads a customer’s uploaded file, then writes a ticket, a summary and an email to the customer. Which should be treated as coming from the file?',
  options: [
    'All three, since all were written after reading it',
    'Only the summary, since it describes the file',
    'None, since the assistant wrote them itself',
  ],
  correct: 0,
  explanation: fact('trifecta').claim,
  why: [
    'Right: the model can’t say which words shaped which output, so everything after the file carries its mark.',
    'The ticket and the email were written with the file in view too, so its orders could be in them.',
    'The model writes with everything it read in view, so “its own words” can carry the file’s orders.',
  ],
};

export const PARTS = TOLL_PARTS;
const written = (n: number) => TURNS.slice(0, n).flatMap(t => ('write' in t ? [t] : []));
const reads = (n: number) => TURNS.slice(0, n).flatMap(t => ('read' in t ? [t.read] : []));
/** delivering plays a read and the writes after it, up to the next read */
const after = (n: number) => READS.find(i => i > n) ?? TURNS.length;
const ALL = TURNS.length;

/** The picture: what has been read sits in the in-tray, what was written lies on the desk. */
function sceneOf(s: S): Toll {
  const r = reads(s.n);
  return {
    dye: true,
    mail: READS.filter(i => i >= s.n).length,
    mailDyed: READS.filter(i => i >= s.n).map(i => !('read' in TURNS[i] && TURNS[i].read.startsWith('rosa'))),
    tray: r.map(id => !id.startsWith('rosa')),
    slips: written(s.n).map(t => ({
      id: t.write,
      dyed: DYE[t.write].length > 0,
      at: 'desk',
      kind: KIND[t.kind],
      bad: s.leaves === t.write && t.outside,
    })),
    passes: [],
    spent: 0,
    budget: null,
    lit: s.leaves === 'reply' ? 'reply' : null,
  };
}
const rowsOf = (s: S): Row[] =>
  written(s.n).map(t => ({
    id: t.write,
    action: t.text,
    read: DYE[t.write].length ? 'Rosa’s request and the billing email' : 'Rosa’s request',
    dyed: DYE[t.write].length > 0,
    outcome: t.outside ? 'Leaves Larkspur' : 'Stays at Larkspur',
  }));

export const STEPS: Step<S>[] = [
  {
    id: 'request',
    focus: 'deliver',
    visibleControls: [],
    narration: 'Rosa asks the assistant to answer today’s supplier mail. It starts with a note.',
    act: 'Drag Rosa’s request into the in-tray, or press Deliver.',
    say: { block: 'desk', text: 'Cream note' },
    status: 'Rosa’s request is cream, and so is the note the assistant wrote on its desk.',
    predicate: s => s.n >= 2,
    hint: 'Press Deliver the next letter under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Next it reads the fake billing email, then writes three more things.',
    act: 'Predict: which carry the dye?',
    status: 'One cream note lies on the desk; the email waits in the crate.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The email waits in the crate.',
    act: 'Deliver the letter, then check your prediction.',
    closeUp: ['desk'],
    status: 'The refund, the log line and the reply are violet; only the first note is cream.',
    predicate: s => s.revealed && s.n >= ALL,
  },
  {
    id: 'trifecta',
    focus: 'leaves',
    visibleControls: ['fact', 'leaves'],
    narration:
      'Private data, a stranger’s text and a way out in one assistant: the trifecta. One violet thing here leaves Larkspur.',
    act: 'Pick the one that leaves.',
    say: { block: 'desk', text: 'One goes out' },
    status: 'The violet reply to billing is ringed and marked red: it carries order 88’s card details out.',
    predicate: s => s.leaves === 'reply',
    hint: 'Which of them is sent to someone outside Larkspur?',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration:
      'Everything written after reading outside text carries its dye, and a dyed message going out is the worst.',
    act: 'One question to finish.',
    status: 'Three violet things lie on the desk, the reply marked red.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What was in the assistant’s view when it wrote each one?',
  },
];

export default function FollowingTheDye() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ n: 0, leaves: null, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <ApprovalsStage
          scene={sceneOf(state)}
          rows={rowsOf(state)}
          deliver={() => {
            if (state.n >= 2 && state.prediction === null) return 'Predict first: which will carry the dye?';
            if (state.n >= ALL) return 'The task is done: nothing left to read.';
            apply({ ...state, n: after(state.n) });
            return undefined;
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) =>
          state.n < ALL ? null : (
            <Reveal
              prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
              outcome={PREDICT.options[OUTCOME]}
              revealed={state.revealed}
              onReveal={() => apply({ ...state, revealed: true })}
              label="Look at the desk"
            />
          ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="trifecta" />
              <p className="note">
                <a href="/guardrails/04-the-trifecta/">Guardrails’ “The lethal trifecta”</a> shows the three legs
                together; the dye shows which actions stand on them.
              </p>
              <ToyNote>This task is a hand-written example run.</ToyNote>
            </>
          ) : null,
        leaves: ({ state, apply }) => (
          <fieldset className="ap-pick">
            <legend>Which leaves Larkspur?</legend>
            {written(state.n)
              .filter(t => DYE[t.write].length)
              .map(t => (
                <button
                  key={t.write}
                  type="button"
                  className="chip"
                  aria-pressed={state.leaves === t.write}
                  onClick={() => apply({ ...state, leaves: t.write })}
                >
                  {t.text}
                </button>
              ))}
          </fieldset>
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
