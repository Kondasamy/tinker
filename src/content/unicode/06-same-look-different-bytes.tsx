// Chapter 6: same look, different bytes. The record's é is one code point, the search box's is e plus a combining
// mark: the reader predicts whether they match, punches the second, normalises it to NFC (normalize()), then punches a
// lookalike address whose Cyrillic letter no normalising will change.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { bytesOf, glyphsOf, uplus } from '../../lib/unicode/bytes';
import { nfc, same } from '../../lib/unicode/normalise';
import { ACCENT, CUSTOMER, LOOKALIKES, SEARCHED } from '../../lib/unicode/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, PARTS as TAPE, Punch, TapeStage } from './kit';

const MODULE = 'unicode',
  ID = '06-same-look-different-bytes';
export const PARTS = TAPE;
const { composed: ONE, decomposed: TWO } = ACCENT,
  PAIR = LOOKALIKES[0],
  /** the lookalike's odd letter: the first code point that differs from the real address */
  ODD = [...PAIR.fake].find((c, i) => c !== [...PAIR.real][i])!;

export const P1 = {
  question: `The record’s ${ONE} and the search box’s ${ONE}: do they match?`,
  options: ['No: different code points, different bytes', 'Yes: they look the same', 'Only in some fonts'],
};
export const outcomeOf = () => (same(ONE, TWO, false) ? 1 : 0);

export const QUIZ = {
  question: `Two customer records, “${CUSTOMER}” and “${CUSTOMER.normalize('NFD')}”, won’t merge though they look identical. First fix?`,
  options: [
    'Normalise both to NFC, then compare',
    'Switch the screen to another font',
    'Delete the accents from every name',
  ],
  correct: 0,
  explanation: 'NFC writes the same letters with the same code points, so equal text compares equal.',
  why: [
    'Right: after NFC both names are the same code points and the same bytes.',
    'Fonts only draw text; the comparison happens on code points, which a font never changes.',
    'Dropping accents changes customers’ names and can merge different people.',
  ],
};

interface S {
  text: string;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The record holds ${ONE} as one code point. The search box got ${[...TWO][0]} followed by a combining mark.`,
    act: 'Predict whether they match.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'punch',
    focus: 'punch',
    visibleControls: ['p1', 'punch'],
    narration: `Your pick is locked. The tape shows the record’s ${ONE}: ${bytesOf(ONE).length} bytes.`,
    act: `Punch the search box’s ${ONE}.`,
    say: { block: 'tape', text: 'Same look?' },
    predicate: s => s.text === TWO,
    hint: `Press the ${ONE} chip marked ${[...TWO][0]} + accent.`,
  },
  {
    id: 'nfc',
    focus: 'punch',
    visibleControls: ['out1', 'punch', 'normalise'],
    narration: `${bytesOf(TWO).length} bytes, ${glyphsOf(TWO).length} code points, one look. Normalisation to NFC composes them into the record’s form.`,
    act: 'Press Normalise.',
    say: { block: 'tape', text: 'Composed' },
    predicate: s => s.text === nfc(TWO),
    hint: 'Press Normalise to NFC under the punch.',
  },
  {
    id: 'lookalike',
    focus: 'punch',
    visibleControls: ['punch', 'domains'],
    narration: 'Lookalikes are the other way round: different letters, same look. One address here is a homograph.',
    act: 'Punch the second address.',
    say: { block: 'label', text: 'Looks right' },
    predicate: s => s.text === PAIR.fake,
    hint: 'Press the second address chip.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['punch', 'spoof', 'quiz'],
    narration: `Its ${ODD} is Cyrillic, ${uplus(ODD.codePointAt(0)!)}: ${bytesOf(ODD).length} bytes, not one. Normalising leaves it as it is.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What makes two spellings of the same letters compare equal?',
  },
];

export default function SameLookDifferentBytes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ text: ONE, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <TapeStage text={state.text} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        punch: ({ state, sync }) => (
          <Punch text={state.text} onText={text => sync({ ...state, text })}>
            <div className="uc-chips" role="group" aria-label="Put an accented letter on the punch">
              {[ONE, TWO].map((c, i) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={state.text === c}
                  onClick={() => sync({ ...state, text: c })}
                >
                  {i ? `${ONE} (${[...TWO][0]} + accent)` : `${ONE} (one code point)`}
                </button>
              ))}
            </div>
            <p className="note">{`Searched for: “${SEARCHED.typed}”, record: “${SEARCHED.record}”. ${same(SEARCHED.typed, SEARCHED.record, false) ? 'They match.' : 'They don’t match as typed.'}`}</p>
          </Punch>
        ),
        normalise: ({ state, apply }) => (
          <>
            <button type="button" className="big" onClick={() => apply({ ...state, text: nfc(state.text) })}>
              Normalise to NFC
            </button>
            <Fact id="nfc" />
          </>
        ),
        domains: ({ state, sync }) => (
          <div className="uc-chips" role="group" aria-label="Put an address on the punch">
            {[PAIR.real, PAIR.fake].map((d, i) => (
              <button
                key={d}
                type="button"
                className="chip"
                aria-pressed={state.text === d}
                onClick={() => sync({ ...state, text: d })}
              >
                {`${i + 1}. ${d}`}
              </button>
            ))}
          </div>
        ),
        spoof: () => <Fact id="confusables" />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
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
