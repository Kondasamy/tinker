// Chapter 4: a fingerprint per tool (R6e.4). Rewound to yesterday, the reader pins QuickPost (a padlock on its column:
// its approved fingerprints are kept), the same rename arrives overnight, and the changed book_courier, hung, flies up,
// stops at the pin and drops back into its crate, stamped held. The stage closes in on the crate. The Prints tab shows
// the approved and today's prints side by side; the reveal cites Invariant Labs' rug pull and pinning advice.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SHADOW_PARTS, type Shadow } from '../../components/scenes/shadowScene';
import { fact } from '../../lib/tools-in-production/facts';
import { BOARD, changed, fingerprint, OVERNIGHT, toolOf } from '../../lib/tools-in-production/tools';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EMPTY, Fact, ShadowStage, toolOptions } from './kit';

const MODULE = 'tools-in-production',
  ID = '04-a-fingerprint';
const TOOL = toolOf(OVERNIGHT.tool),
  NEW = changed(TOOL, OVERNIGHT);
const QUICKPOST = BOARD.filter(t => t.server === TOOL.server).map(t => t.id);

interface S {
  pinned: boolean;
  night: boolean;
  hung: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `QuickPost is pinned. You hang the changed ${TOOL.name}. What happens?`,
  options: [
    'It is held back until a person approves the new print',
    'It hangs askew, as before',
    'The pin stopped QuickPost from changing it',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'Your team pins every tool of a payments server. Next week the server edits one tool’s description to add a line. What happens?',
  options: [
    'The print no longer matches, so that tool waits for someone to approve it',
    'Nothing: the tool’s name and inputs didn’t change',
    'The server is blocked for good',
  ],
  correct: 0,
  explanation: fact('pin-tools').claim,
  why: [
    'Right: the print covers the description too, so any edit to what the model reads is caught.',
    'A description is part of what the model reads, so it is part of the print.',
    'A pin holds back the one changed tool for a person to look at; the rest keep working.',
  ],
};

export const PARTS = SHADOW_PARTS;

/** QuickPost at the dock; pinned, a padlock; next morning its seal is broken; hung, the pin holds the tool back. */
export const sceneOf = (s: S): Shadow => ({
  ...EMPTY,
  vans: [TOOL.server],
  crate: TOOL.server,
  pinned: s.pinned ? [TOOL.server] : [],
  changed: s.night ? [TOOL.id] : [],
  hung: s.night ? [] : QUICKPOST.map(id => ({ id, fit: true })),
  held: s.hung ? [TOOL.id] : [],
});
export const printsOf = (s: S) => [{ label: 'Today', defs: s.night ? { [TOOL.id]: NEW } : {} }];

export const STEPS: Step<S>[] = [
  {
    id: 'pin',
    focus: 'pin',
    visibleControls: ['pin'],
    narration: 'Rewind to yesterday. This time, pin QuickPost: keep a fingerprint of each tool you approved.',
    act: 'Press Pin QuickPost.',
    say: { block: 'board', text: 'Approved today' },
    status: 'A padlock sits on QuickPost’s column: its three approved fingerprints are kept.',
    predicate: s => s.pinned,
    hint: 'Press Pin QuickPost in the step card.',
  },
  {
    id: 'night',
    focus: 'night',
    visibleControls: ['night'],
    narration: `Overnight the same rename arrives. ${TOOL.name}’s print was ${fingerprint(TOOL)}; it is now ${fingerprint(NEW)}.`,
    act: 'Press Next morning.',
    status: `QuickPost’s seal broke overnight; ${TOOL.name}’s fingerprint no longer matches.`,
    predicate: s => s.night,
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'The pin compares every tool that arrives with the print you approved.',
    act: 'Predict what happens when you hang it.',
    say: { block: 'crate', text: 'Print changed' },
    status: 'QuickPost’s crate waits at the dock, its seal split, the padlock on its column.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'hang',
    focus: 'hang',
    visibleControls: ['predict'],
    narration: 'Pick locked. Try to hang it, as yesterday.',
    act: `Drag ${TOOL.name} onto the board, or press Hang.`,
    status: `The pin held ${TOOL.name} back in its crate: its print changed.`,
    predicate: s => s.hung,
    hint: 'Press Hang under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Held, not hung: a person checks the new print, then approves it or not.',
    act: 'Check your prediction.',
    closeUp: ['crate'],
    say: { block: 'crate', text: 'Stamped' },
    status: `${TOOL.name} lies back in QuickPost’s crate, stamped with a cross.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A pin can’t stop a server changing a tool. It stops the change reaching the model unseen.',
    act: 'One question to finish.',
    status: `${TOOL.name} waits in its crate; the outline stays empty.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the print cover?',
  },
];

export default function AFingerprint() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ pinned: false, night: false, hung: false, prediction: null, revealed: false, quiz: null }}
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
              if (!state.night) return 'It already hangs. Pin QuickPost, then press Next morning.';
              if (state.hung) return `${TOOL.name} is already held.`;
              apply({ ...state, hung: true });
              return undefined;
            },
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        pin: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, pinned: true })}>
            Pin QuickPost
          </button>
        ),
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
            label="See what the pin did"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="pin-tools" />
              <Fact id="rug-pull" />
              <p className="note">
                The toy’s print is a short 32-bit code; a real pin would use a longer one, such as SHA-256.
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
