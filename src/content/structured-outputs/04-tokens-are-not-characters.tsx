// Chapter 4: tokens are not characters. Under a schema with a free note capped at 8 characters, the mask runs every byte
// of every token through the grammar, so near the cap long tokens are blocked while short ones still fit. Then token
// healing on a prompt that ends in a space. Every count is read off the live run.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import type { Model } from '../../lib/lm/model';
import { VOCAB_SIZE, pieceBytes } from '../../lib/lm/bpe';
import { heal } from '../../lib/structured-outputs/decode';
import { HEAL, SCHEMAS, play, run } from '../../lib/structured-outputs/prompts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { STENCIL_PARTS } from '../../components/scenes/stencilScene';
import { CTX, Fact, PinnedStage, Waiting, pct, piece, useModel, whenLoaded, type View } from './kit';

const MODULE = 'structured-outputs',
  ID = '04-tokens-are-not-characters';
export const RUN = run('note');
export const PARTS = STENCIL_PARTS;
export const CAP = SCHEMAS.note.properties.note.maxLength!;
const decoded = (model: Model) => play(model, RUN).decoded;

/** Room left in the note before step i (null outside the note's string). */
function room(model: Model, i: number): number | null {
  const s = decoded(model).steps[i]?.state;
  if (s?.part !== 1 || !s.buf.startsWith('"')) return null;
  return CAP - (s.buf.length - 1);
}
/** The first step with two characters of room or less (but not none), and the step before it. */
export function capStep(model: Model) {
  const d = decoded(model);
  const at = d.steps.findIndex((_, i) => {
    const r = room(model, i);
    return r !== null && r > 0 && r <= 2;
  });
  return {
    at,
    room: room(model, at)!,
    allowed: d.steps[at].allowed.length,
    before: d.steps[at - 1].allowed.length,
    beforeRoom: room(model, at - 1),
  };
}
/** 0: any first character, 1: only tokens that fit whole, 2: only the quote. */
export function answerOf(model: Model) {
  const d = decoded(model),
    { at, room: r } = capStep(model),
    ids = d.steps[at].allowed;
  const len = (id: number) => (pieceBytes(id)[0] === 0x22 ? 0 : pieceBytes(id).length);
  if (ids.every(id => pieceBytes(id)[0] === 0x22)) return 2;
  return ids.every(id => len(id) <= r) ? 1 : 0;
}

interface S {
  p1: number | null;
  revealed: boolean;
  at: number;
  view: View;
  healed: boolean;
  quiz: number | null;
}

const P1 = {
  question: `The schema gives the note at most ${CAP} characters. The model has written some, and two characters of room are left. Which tokens can the mask still allow?`,
  options: [
    'Any token whose first character is allowed',
    'Only tokens that fit whole: one or two characters long (and the closing quote)',
    'Only the closing quote',
  ],
};

export const QUIZ = {
  question:
    'A schema says a field holds digits only. Larkspur’s tokenizer has a token “30” and a token “ 30” (with a space). Which can the mask allow inside the number?',
  options: [
    'Both: each one contains digits',
    '“30”: every byte is a digit; “ 30” starts with a space, which the number doesn’t allow',
    'Neither: the mask works on single characters only',
    '“ 30”, because a space is ignored',
  ],
  correct: 1,
  explanation: 'The mask runs every byte of a token through the grammar. One bad byte anywhere blocks the whole token.',
  why: [
    'Containing digits isn’t enough: every byte has to fit, and the space in “ 30” doesn’t.',
    'Right: a token is allowed only if all of its bytes keep the grammar happy, in order.',
    'The mask judges whole tokens, of any length, by feeding their bytes through one at a time; that is how it allowed multi-character tokens in the note.',
    'Nothing is ignored: this grammar allows no whitespace at all, so a token starting with a space is blocked inside a number.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A free note now, with a length cap of ${CAP} characters so it always closes inside the ${CTX}-token window.`,
    act: 'Predict first.',
    say: { block: 'plate', text: `Cap: ${CAP} chars` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in. The mask runs every byte of a token through the schema, one by one.',
    act: 'Jump to two characters left.',
    predicate: whenLoaded(s => s.revealed),
    hint: 'Press the button.',
  },
  {
    id: 'heal',
    focus: 'heal',
    visibleControls: ['out1', 'heal'],
    narration:
      'In training, a space starts the next word’s token (“ days”), so a trailing space is a split the model rarely saw.',
    act: 'Apply token healing.',
    predicate: whenLoaded(s => s.healed),
    hint: 'Press “Heal the prompt”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['healed', 'quiz'],
    narration:
      'Both fixes come from one fact: the model writes tokens, so rules written in characters must be checked against whole tokens.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many of a token’s bytes does the mask check?',
  },
];

function Healed() {
  const { model } = useModel();
  if (!model) return <Waiting />;
  const h = heal(model, HEAL.prompt);
  const list = (cs: typeof h.plain) => cs.map(c => `${piece(c.text)} ${pct(c.p)}`).join(', ');
  return (
    <div data-testid="healed">
      <p className="tc-status">{`Read as typed, the last token is ${piece(h.removed.text)} on its own. Likeliest next: ${list(h.plain)}.`}</p>
      <p className="tc-status">{`Healed (back up over ${piece(h.removed.text)}; the next token must start with it): ${list(h.healed)}.`}</p>
    </div>
  );
}

export default function TokensAreNotCharacters() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ p1: null, revealed: false, at: 0, view: 'scene', healed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <PinnedStage
          say={say}
          id={RUN.id}
          at={state.at}
          locked={state.p1 === null}
          view={state.view}
          onView={v => sync({ ...state, view: v })}
          caption={`The schema: one field, note, free text up to ${CAP} characters (maxLength, this site’s addition to the subset).`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <>
            <button
              type="button"
              className="chip"
              disabled={!model}
              onClick={() => apply({ ...state, revealed: true, at: capStep(model!).at, view: 'mask' })}
            >
              Jump to two characters left
            </button>
            {!model && <Waiting />}
          </>
        ),
        out1: ({ state }) => {
          if (!model) return <Waiting />;
          const c = capStep(model);
          return (
            <>
              <Outcome {...P1} prediction={state.p1} outcome={answerOf(model)} />
              <p
                className="tc-status"
                data-testid="cap"
              >{`With ${c.beforeRoom} characters of room, ${c.before} of ${VOCAB_SIZE} tokens were allowed. With ${c.room} left, ${c.allowed}: every token longer than the room is blocked, even when its first character would fit. The mask runs each token’s bytes through the schema, one by one.`}</p>
            </>
          );
        },
        heal: ({ state, apply }) => (
          <>
            <p className="tc-status">{`The prompt: “${HEAL.prompt}”, ending in a space.`}</p>
            <button type="button" className="big" disabled={!model} onClick={() => apply({ ...state, healed: true })}>
              Heal the prompt
            </button>
            {!model && <Waiting />}
          </>
        ),
        healed: () => <Healed />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
            <Fact id="anthropic-limits" />
            <Fact id="token-healing" />
            <Fact id="xgrammar" />
          </>
        ),
      }}
    />
  );
}
