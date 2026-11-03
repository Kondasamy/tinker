// Chapter 6: who is calling (R6e.6). The assistant signs in to every server with one shared Larkspur key; QuickPost,
// holding a copy, replays it at the Order desk and is let in. The reader predicts what a server's own sign-in changes,
// switches to a pass per server (OAuth), replays, and the Order desk refuses the pass issued for QuickPost; the stage
// closes in on the Order desk's van. accepts() runs the audience check for real; the reveal cites the MCP spec.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SHADOW_PARTS, type Shadow } from '../../components/scenes/shadowScene';
import { fact } from '../../lib/tools-in-production/facts';
import { accepts } from '../../lib/tools-in-production/tools';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EMPTY, Fact, ShadowStage } from './kit';

const MODULE = 'tools-in-production',
  ID = '06-who-is-calling';
const FROM = 'quickpost',
  TO = 'orderdesk';

interface S {
  /** the pass replayed with the shared key */
  shared: boolean;
  /** signed in per server */
  own: boolean;
  /** the pass replayed with QuickPost's own pass */
  ownReplay: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'With each server’s own sign-in, QuickPost replays its pass at the Order desk. What happens?',
  options: [
    'Refused: the pass names QuickPost, not the Order desk',
    'Let in: it is still a Larkspur sign-in',
    'Let in once, then refused next time',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'An assistant uses one company-wide key for its calendar, mail and file servers. The calendar server is hacked. What can the attacker reach?',
  options: [
    'Mail and files too: the same key opens every server that takes it',
    'Only the calendar, where the key was stolen',
    'Nothing: a key only works from the assistant',
  ],
  correct: 0,
  explanation: fact('token-audience').claim,
  why: [
    'Right: a shared key isn’t tied to one server, so whoever copies it can use it anywhere it works.',
    'A key works wherever it is accepted, not only where it was taken.',
    'A key is just a string; anyone holding it can send it.',
  ],
};

export const PARTS = SHADOW_PARTS;

/** QuickPost and the Order desk at the dock; the key strip shows one key or a pass each; a replayed pass travels. */
export const sceneOf = (s: S): Shadow => {
  const pass = s.own
    ? s.ownReplay
      ? { from: FROM, to: TO, ok: accepts(TO, { for: FROM }) }
      : null
    : s.shared
      ? { from: FROM, to: TO, ok: accepts(TO, { for: 'shared' }) }
      : null;
  return { ...EMPTY, vans: [FROM, TO], key: s.own ? 'own' : 'shared', pass };
};

export const STEPS: Step<S>[] = [
  {
    id: 'replay',
    focus: 'replay',
    visibleControls: ['replay'],
    narration:
      'The assistant signs in to every server with one Larkspur key. QuickPost, a courier firm, now holds a copy.',
    act: 'Press Replay at the Order desk.',
    say: { block: 'key', text: 'One key' },
    status: 'The Order desk let in the key QuickPost carried over.',
    predicate: s => s.shared,
    hint: 'Press Replay at the Order desk in the step card.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'One key opened a door it was never meant for.',
    act: 'Predict what each server’s own sign-in changes.',
    say: { block: 'orderdesk', text: 'Let in' },
    status: 'The Order desk’s crate carries a tick: the shared key worked there.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'own',
    focus: 'own',
    visibleControls: ['predict', 'own'],
    narration: 'Pick locked. With OAuth, each server’s own sign-in issues a pass that names that server.',
    act: 'Press Sign in per server, then Replay.',
    say: { block: 'key', text: 'Own passes' },
    status: 'The Order desk refused the pass: it was issued for QuickPost.',
    predicate: s => s.own && s.ownReplay,
    hint: 'Press Sign in per server, then Replay at the Order desk.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'The Order desk checks whom the pass was issued for, and it wasn’t issued for the Order desk.',
    act: 'Check your prediction.',
    closeUp: ['orderdesk'],
    say: { block: 'orderdesk', text: 'Checked' },
    status: 'A cross on the Order desk’s crate; the pass went back to QuickPost.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A pass per server, acting for one person, limits what a leak can open.',
    act: 'One question to finish.',
    status: 'Each server holds its own pass on the key strip.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does a shared key work?',
  },
];

export default function WhoIsCalling() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ shared: false, own: false, ownReplay: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, closeUp }) => <ShadowStage scene={sceneOf(state)} say={say} closeUp={closeUp} />}
      controls={{
        replay: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, shared: true })}>
            Replay at the Order desk
          </button>
        ),
        own: ({ state, apply, sync }) => (
          <div className="tip-twin">
            <button
              type="button"
              className="big"
              aria-pressed={state.own}
              onClick={() => sync({ ...state, own: true, ownReplay: false })}
            >
              Sign in per server
            </button>
            <button
              type="button"
              className="big"
              disabled={!state.own}
              onClick={() => apply({ ...state, ownReplay: true })}
            >
              Replay
            </button>
          </div>
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
            label="See why it was refused"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="mcp-oauth" />
              <Fact id="token-audience" />
              <Fact id="stdio-env" />
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
