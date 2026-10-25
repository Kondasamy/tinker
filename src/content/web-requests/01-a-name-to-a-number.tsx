// Chapter 1: a name to a number. Ines's first visit: the reader asks each directory office in turn (root, .example,
// Larkspur's), predicting how many it takes, then reads the lookup's round trips off the waterfall.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ADDRESS, SITE, customerOf, runOf } from '../../lib/web-requests/sim';
import { TOWN_PARTS, townAt } from '../../components/scenes/townScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, SimNote, WebStage, msOf, type View } from './kit';

const MODULE = 'web-requests',
  ID = '01-a-name-to-a-number';
export const PARTS = TOWN_PARTS;
const INES = customerOf('ines');
export const RUN = runOf('ines');
/** the directory's share of the load: every office asked, back to back */
export const LOOKUP = RUN.phases.filter(p => p.kind === 'dns');
const lookupMs = LOOKUP.at(-1)!.end;
const NEXT = ['Ask the root', 'Ask the .example office', `Ask ${SITE}’s office`];

export const P1 = {
  question: `How many offices will ${INES.name}’s resolver ask before it has the shop’s address?`,
  options: [
    'One: the root knows every address',
    'Three: the root, .example, then Larkspur’s own office',
    'Hundreds: one for every computer on the way',
  ],
};
export const outcomeOf = () => (LOOKUP.length === 3 ? 1 : LOOKUP.length === 1 ? 0 : 2);

export const QUIZ = {
  question:
    'A café opens a brand-new site, cafe.example. Its first visitor’s resolver remembers nothing. Where does the lookup start?',
  options: [
    'At the root, which refers it to the .example office',
    'At cafe.example’s own server, directly',
    'At the café’s web host, found by its name',
  ],
  correct: 0,
  explanation: 'A resolver that knows nothing starts at the root and follows each referral down.',
  why: [
    'Right: the root doesn’t know the café, but knows which office runs .example.',
    'Reaching the café’s server needs its address, which is the very thing being looked up.',
    'Finding the host by name is the same lookup again, so it can’t be where the lookup starts.',
  ],
};

interface S {
  asked: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'root',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: `${INES.name} types ${SITE}. Her browser needs the shop’s IP address. Her resolver looks it up in DNS, office by office.`,
    act: 'Ask the root.',
    say: { block: 'root', text: 'Asked first' },
    predicate: s => s.asked >= 1,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The root doesn’t know the shop. Its reply is a referral: ask the .example office.',
    act: 'Predict how many offices it takes.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'rest',
    focus: 'ask',
    visibleControls: ['p1', 'ask'],
    narration: 'Your pick is locked.',
    act: 'Ask until the address comes back.',
    say: { block: 'nameserver', text: 'Knows the shop' },
    predicate: s => s.asked >= LOOKUP.length,
  },
  {
    id: 'fall',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `The answer is ${ADDRESS}. Each office was a round trip: ${msOf(lookupMs)} before the browser even reaches the shop.`,
    act: 'Open the Waterfall tab.',
    predicate: s => s.view === 'fall',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'A name is a question; the directory answers it one office at a time.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a resolver need before it can reach any server directly?',
  },
];

export default function ANameToANumber() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <WebStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={{
            town: townAt(RUN, state.asked),
            run: state.asked >= LOOKUP.length ? RUN : undefined,
            caption: state.asked
              ? `${state.asked} of ${LOOKUP.length} offices asked: ${msOf(LOOKUP[state.asked - 1].end)} so far.`
              : `${INES.name} has typed ${SITE}.`,
          }}
        />
      )}
      controls={{
        ask: ({ state, apply }) =>
          state.asked < LOOKUP.length ? (
            <button type="button" className="chip" onClick={() => apply({ ...state, asked: state.asked + 1 })}>
              {NEXT[state.asked]}
            </button>
          ) : (
            <p className="tc-status">{`Address found: ${ADDRESS}.`}</p>
          ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="dns-tree" />
            <SimNote />
          </>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'fall' })}>
            Open the Waterfall tab
          </button>
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
