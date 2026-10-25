// Chapter 2: the remembered answer. Tomas visited minutes ago; the reader sets Larkspur's DNS TTL, predicts what a
// short one costs him, then sees what a day-long one does when the shop moves to a new address.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { NEW_ADDRESS, TTLS, customerOf, oldFor, runOf, ttlName } from '../../lib/web-requests/sim';
import { TOWN_PARTS, townAt } from '../../components/scenes/townScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, SimNote, WebStage, msOf } from './kit';

const MODULE = 'web-requests',
  ID = '02-the-remembered-answer';
export const PARTS = TOWN_PARTS;
const TOMAS = customerOf('tomas');
const AGO = TOMAS.lastVisitMin!;
const [, SHORT, HOUR, DAY] = TTLS;
export const runAt = (ttl: number) => runOf('tomas', { ttl, http: '2' });
const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

export const P1 = {
  question: `With a ${ttlName(SHORT)} TTL, what happens when ${TOMAS.name} opens the shop again?`,
  options: [
    'Nothing changes: he visited recently',
    'His resolver asks Larkspur’s office again: one more round trip',
    'His resolver starts again from the root',
  ],
};
export function outcomeOf(): number {
  const a = runAt(SHORT).asked;
  return a.length === 0 ? 0 : a.length === 1 ? 1 : 2;
}

export const QUIZ = {
  question: 'A bakery sets its DNS TTL to a week to save lookups. Next month it moves to a new web host. What happens?',
  options: [
    'Some visitors keep reaching the old host for up to a week',
    'Everyone reaches the new host at once: DNS changes are instant',
    'Nobody can reach the bakery for a week',
  ],
  correct: 0,
  explanation: 'A remembered answer is used unchecked until its TTL runs out, even after the address changes.',
  why: [
    'Right: resolvers that remembered the old address keep using it until their copy expires.',
    'Resolvers don’t hear about a change; they only ask again once the TTL runs out.',
    'Resolvers that hadn’t remembered the answer ask afresh and get the new host straight away.',
  ],
};

interface S {
  ttl: number;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'hour',
    focus: 'ttl',
    visibleControls: ['ttl'],
    narration: `${TOMAS.name} visited ${AGO} minutes ago. His resolver keeps a cache of answers, each for its TTL.`,
    act: `Set the TTL to ${ttlName(HOUR)}.`,
    say: { block: 'house', text: 'Remembered' },
    predicate: s => s.ttl === HOUR,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Remembered: no directory office asked, and the page took ${msOf(runAt(HOUR).total)}.`,
    act: `Predict what a ${ttlName(SHORT)} TTL does.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'short',
    focus: 'ttl',
    visibleControls: ['p1', 'ttl'],
    narration: 'Your pick is locked.',
    act: `Set the TTL to ${ttlName(SHORT)}.`,
    predicate: s => s.ttl === SHORT && s.p1 !== null,
  },
  {
    id: 'move',
    focus: 'ttl',
    visibleControls: ['out1', 'ttl', 'move'],
    narration: `Now Larkspur moves the shop to ${NEW_ADDRESS}. A remembered answer still sends customers to the old one.`,
    act: `Set the TTL to ${ttlName(DAY)}.`,
    say: { block: 'shop', text: 'Old address' },
    predicate: s => s.ttl === DAY,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['move', 'quiz'],
    narration: 'A long TTL saves round trips but delays every move. Pick it for how often the address changes.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a resolver hear about a change, or only ask again when its copy runs out?',
  },
];

function Move({ ttl }: { ttl: number }) {
  return (
    <table className="tc-ledger">
      <caption>{`If the shop moved now, ${TOMAS.name} could reach the old address for…`}</caption>
      <thead>
        <tr>
          <th scope="col">TTL</th>
          <th scope="col">Lookup now</th>
          <th scope="col">Old address for</th>
        </tr>
      </thead>
      <tbody>
        {TTLS.map(t => (
          <tr key={t} data-ttl={t} aria-current={t === ttl ? 'true' : undefined}>
            <th scope="row">{ttlName(t)}</th>
            <td>{runAt(t).dnsCached ? 'remembered' : msOf(runAt(t).phases[0].end)}</td>
            <td className={oldFor(t, AGO) > 60 ? 'bad' : 'ok'}>{minutes(oldFor(t, AGO))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TheRememberedAnswer() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ttl: SHORT, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = runAt(state.ttl);
        return (
          <WebStage
            say={say}
            show={{
              town: townAt(r),
              run: r,
              caption: r.dnsCached
                ? `TTL ${ttlName(state.ttl)}: the answer was remembered. Page in ${msOf(r.total)}.`
                : `TTL ${ttlName(state.ttl)}: the answer had run out, so Larkspur’s office was asked. Page in ${msOf(r.total)}.`,
            }}
          />
        );
      }}
      controls={{
        ttl: ({ state, apply }) => (
          <div className="wr-range">
            <label htmlFor="wr-ttl">{`Larkspur’s DNS TTL: ${ttlName(state.ttl)}`}</label>
            <input
              id="wr-ttl"
              type="range"
              min={0}
              max={TTLS.length - 1}
              step={1}
              value={(TTLS as readonly number[]).indexOf(state.ttl)}
              aria-valuetext={ttlName(state.ttl)}
              onChange={e => apply({ ...state, ttl: TTLS[Number(e.target.value)] })}
            />
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="dns-ttl" />
          </>
        ),
        move: ({ state }) => (
          <>
            <Move ttl={state.ttl} />
            <SimNote />
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
