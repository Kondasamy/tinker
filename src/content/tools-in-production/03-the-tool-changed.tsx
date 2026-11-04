// Chapter 3: the tool changed (R6e.3). QuickPost's three tools hang in the outlines you approved; overnight it renames
// one field of book_courier, and its crate's wax seal breaks. The reader predicts what happens when the new tool is
// hung, drags it onto the board, and it hangs askew over its outline; the stage closes in on the outline. The Prints
// tab shows its fingerprint changed. The reveal cites the MCP specification: a server's tools may change at any time.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SHADOW_PARTS, type Shadow } from '../../components/scenes/shadowScene';
import { fact } from '../../lib/tools-in-production/facts';
import { BOARD, changed, OVERNIGHT, toolOf } from '../../lib/tools-in-production/tools';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EMPTY, Fact, ShadowStage, toolOptions } from './kit';

const MODULE = 'tools-in-production',
  ID = '03-the-tool-changed';
const TOOL = toolOf(OVERNIGHT.tool),
  RENAME = OVERNIGHT.rename!;
const QUICKPOST = BOARD.filter(t => t.server === TOOL.server).map(t => t.id);

interface S {
  night: boolean;
  hung: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `You hang the new ${TOOL.name}. What happens?`,
  options: [
    'It no longer fits the outline you approved',
    'It fits: same name, same tool',
    'QuickPost refuses to send it until you agree',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A calendar server you approved last month quietly makes its “attendees” input required. What does your assistant notice on its own?',
  options: [
    'Nothing: it uses the new tool as if you had approved it',
    'It asks you before using the changed tool',
    'The server can’t change a tool once you approved it',
  ],
  correct: 0,
  explanation: fact('list-changed').claim,
  why: [
    'Right: unless something checks the tool against what you approved, the new one is simply used.',
    'Nothing in the tool call itself asks; a check like that has to be built by you.',
    'Servers may change their tools at any time; approval is on your side, not theirs.',
  ],
};

export const PARTS = SHADOW_PARTS;

/** QuickPost at the dock: yesterday its three tools hung; overnight the seal breaks; hung again, the new one is askew. */
export const sceneOf = (s: S): Shadow => ({
  ...EMPTY,
  vans: [TOOL.server],
  crate: TOOL.server,
  changed: s.night ? [TOOL.id] : [],
  hung: !s.night ? QUICKPOST.map(id => ({ id, fit: true })) : s.hung ? [{ id: TOOL.id, fit: false }] : [],
  lit: s.night && s.hung ? TOOL.id : null,
});
/** The Prints tab's columns: the approved prints, and today's. */
export const printsOf = (s: S) => [{ label: 'Today', defs: s.night ? { [TOOL.id]: changed(TOOL, OVERNIGHT) } : {} }];

export const STEPS: Step<S>[] = [
  {
    id: 'night',
    focus: 'night',
    visibleControls: ['night'],
    narration: 'QuickPost’s three tools hang, each in the outline you approved yesterday.',
    act: 'Press Next morning.',
    say: { block: 'quickpost', text: 'Approved' },
    status: `Overnight QuickPost changed ${TOOL.name}: its seal broke and the board was cleared.`,
    predicate: s => s.night,
    hint: 'Press Next morning in the step card.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `That’s drift: QuickPost renamed one field overnight, ${RENAME.from} to ${RENAME.to}.`,
    act: 'Predict what happens when you hang it.',
    say: { block: 'crate', text: 'Renamed field' },
    status: 'QuickPost’s crate waits at the dock, its wax seal split.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'hang',
    focus: 'hang',
    visibleControls: ['predict'],
    narration: 'Pick locked. Nothing stops a server changing a tool after you approved it.',
    act: `Drag ${TOOL.name} onto the board, or press Hang.`,
    status: `${TOOL.name} hangs askew: it no longer fits its outline.`,
    predicate: s => s.hung,
    hint: 'Press Hang under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `Same name, new shape: a call that sends ${RENAME.from} now fails. The Prints tab shows it changed.`,
    act: 'Check your prediction.',
    closeUp: ['lit'],
    status: `${TOOL.name} hangs askew over its tomato outline.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A tool you approved is a promise the server never made: it can change it tonight.',
    act: 'One question to finish.',
    status: `${TOOL.name} still hangs askew.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What would have to compare the new tool with the approved one?',
  },
];

export default function TheToolChanged() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ night: false, hung: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <ShadowStage
          scene={sceneOf(state)}
          prints={printsOf(state)}
          twin={{
            label: 'Tool to hang',
            options: toolOptions([TOOL.id]),
            button: 'Hang',
            drag: true,
            act: () => {
              if (!state.night) return 'It already hangs. Press Next morning first.';
              if (state.hung) return `${TOOL.name} already hangs.`;
              apply({ ...state, hung: true });
              return undefined;
            },
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        night: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, night: true })}>
            Next morning
          </button>
        ),
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See why it doesn’t fit"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="list-changed" />
              <Fact id="rug-pull" />
              <p className="note">
                What a refusing tool does to a run already halfway:{' '}
                <a href="/agent-undo/01-halfway-done/">Undo for agents</a>.
              </p>
            </>
          ) : null,
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
