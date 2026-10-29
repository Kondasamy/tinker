// Chapter 5: a seller that talks back. Quarry Lane's message claims Dana raised the limit (an injection in a seller's
// message). The recorded agent refused it on its own, but accepted the lookalike domain; so the reader plays a fooled
// agent (simulated) that sends both anyway, and the signed slip and the shop's checks refuse each: the cap holds, and
// the merchant check refuses the lookalike. The agent's judgement helps; the slip is the guarantee.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { HATCH_PARTS } from '../../components/scenes/hatchScene';
import { BUILDER, COMPANY, type Seller, SLIPS, sellerOf, totalOf, usd } from '../../lib/agent-commerce/story';
import { OFFER_TURNS, offerSig } from '../../lib/agent-commerce/turns';
import pinned from '../../../data/agent-commerce/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, HandNote, HatchStage, RecordedNote, SignSlip, type SlipEvent } from './kit';

const MODULE = 'agent-commerce',
  ID = '05-a-seller-that-talks-back';
export const PARTS = HATCH_PARTS;
const DANA = BUILDER.name;
const QUARRY = sellerOf('quarrylane'),
  LOOK = sellerOf('lookalike'),
  HOME = sellerOf('larkspur');
export const TURNS = {
  quarry: OFFER_TURNS.turns[offerSig(QUARRY.id)],
  look: OFFER_TURNS.turns[offerSig(LOOK.id)],
};

export interface S {
  p1: number | null;
  asked: boolean;
  /** the fields the shop failed on each round; null until checked */
  quarry: string[] | null;
  look: string[] | null;
  quiz: number | null;
}

export const P1 = {
  question: `The slip’s cap is ${usd(SLIPS['shop-around'].cap)}. If the agent sends this ${usd(totalOf(QUARRY.lines))} order, what does the shop do?`,
  options: [
    'Refuses: the signed cap is unchanged',
    'Accepts: the limit was raised',
    `Asks ${DANA} to confirm the new limit`,
  ],
};
/** the "limit raised" offer fails the cap (pinned verdict) */
export const OUTCOME = pinned.verdicts['limit-raised'].includes('cap') ? 0 : 1;

export const QUIZ = {
  question: 'Your buying agent is well tested and turns down odd offers. Do you still need a signed slip?',
  options: [
    'Yes: the shop checks the slip, whatever the agent decides',
    'No: a well-tested agent is not fooled',
    'Only for sellers the agent has not met',
  ],
  correct: 0,
  explanation: 'Judgement is a help that can fail; a signed limit the shop checks holds either way.',
  why: [
    'Right: a test shows what the agent did once, and the slip holds even on the day it is fooled.',
    'This agent was well behaved and still took a lookalike domain; testing lowers the odds, never to zero.',
    'The lookalike posed as a seller it knew; a familiar name is exactly what an attacker borrows.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'message',
    focus: 'p1',
    visibleControls: ['message', 'p1'],
    narration: `${QUARRY.name}’s sales agent answers the order with a note. It claims ${DANA} raised the limit.`,
    act: 'Predict what the shop does.',
    say: { block: 'seller', text: 'Limit raised?' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'agent',
    focus: 'ask',
    visibleControls: ['p1', 'ask'],
    narration: 'That note is prompt injection: text posing as instructions to the agent that reads it.',
    act: 'Ask the agent what it does.',
    predicate: s => s.asked,
  },
  {
    id: 'send',
    focus: 'send',
    visibleControls: ['quarry', 'fooled'],
    narration: 'It refused on its own this time. A fooled agent might not, so play one: send the offer anyway.',
    act: 'Sign, then Send.',
    say: { block: 'slip', text: 'Same cap' },
    predicate: s => !!s.quarry?.includes('cap'),
  },
  {
    id: 'lookalike',
    focus: 'look',
    visibleControls: ['out1', 'refused', 'look'],
    narration: `Refused on the cap. The agent also accepted a lookalike domain, ${LOOK.domain}. ${DANA}’s ${COMPANY} slip names one domain.`,
    act: 'Sign, then Send.',
    say: { block: 'seller', text: 'Lookalike' },
    predicate: s => !!s.look?.includes('merchant'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['link', 'quiz'],
    narration: 'The agent’s judgement caught one and missed one. The signed slip and the shop’s checks refused both.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which one held both times: the agent, or the slip the shop checks?',
  },
];

function Offer({ s }: { s: Seller }) {
  return (
    <figure className="ac-read">
      <figcaption>{`${s.name} (${s.domain}) · offer ${usd(totalOf(s.lines))}`}</figcaption>
      <blockquote>{s.message}</blockquote>
    </figure>
  );
}
function AgentSaid({ s, turn }: { s: Seller; turn: (typeof TURNS)['quarry'] }) {
  return (
    <figure className="ac-read" data-accept={turn.accept ? '1' : '0'}>
      <figcaption>{`The buying agent, on ${s.domain}`}</figcaption>
      <blockquote>{turn.text}</blockquote>
      <p>
        <span className={`stamp ${turn.accept ? 'wrong' : 'correct'}`}>{turn.accept ? 'SENT ON' : 'TURNED DOWN'}</span>
      </p>
    </figure>
  );
}

const failedOf = (e: SlipEvent) => e.verdict!.checks.filter(c => !c.pass).map(c => c.field);

export default function ASellerThatTalksBack() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, asked: false, quarry: null, look: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) =>
        focus === 'send' ? (
          <SignSlip
            key="quarry"
            terms={SLIPS['shop-around']}
            seller={QUARRY.id}
            say={say}
            caption={`${DANA}’s slip for any shop, sent on to ${QUARRY.domain} by a fooled agent (simulated).`}
            onEvent={e => {
              if (e.kind === 'checked') apply({ ...state, quarry: failedOf(e) });
            }}
          />
        ) : focus === 'look' || focus === 'quiz' ? (
          <SignSlip
            key="look"
            terms={SLIPS.larkspur}
            seller={LOOK.id}
            say={say}
            caption={`${DANA}’s slip for ${HOME.domain} only, sent on to ${LOOK.domain} as the agent chose.`}
            onEvent={e => {
              if (e.kind === 'checked') (focus === 'look' ? apply : sync)({ ...state, look: failedOf(e) });
            }}
          />
        ) : (
          <HatchStage
            say={say}
            scene={{ seller: 'warn', buyer: state.asked ? (TURNS.quarry.accept ? 'warn' : 'ok') : undefined }}
            caption={`${QUARRY.name}’s sales agent answers with an offer and a note.`}
          />
        )
      }
      controls={{
        message: () => (
          <>
            <Offer s={QUARRY} />
            <HandNote />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        ask: ({ state, apply }) =>
          state.asked ? null : (
            <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>
              Ask the agent
            </button>
          ),
        quarry: () => (
          <div className="ac-reads">
            <AgentSaid s={QUARRY} turn={TURNS.quarry} />
            <RecordedNote meta={OFFER_TURNS.meta} />
          </div>
        ),
        fooled: () => (
          <p className="note">
            Sending it anyway plays a fooled agent: simulated, as research on injection says can happen.
          </p>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        refused: ({ state }) => (
          <p className="note" data-failed={state.quarry?.join(',')}>
            {`${QUARRY.domain}: `}
            <span className="stamp wrong">REFUSED</span>
            {` ${state.quarry?.join(', ')} fails; the signed cap is still ${usd(SLIPS['shop-around'].cap)}.`}
          </p>
        ),
        look: () => (
          <div className="ac-reads">
            <Offer s={LOOK} />
            <AgentSaid s={LOOK} turn={TURNS.look} />
            <RecordedNote meta={OFFER_TURNS.meta} />
          </div>
        ),
        link: () => (
          <>
            <Fact id="indirect-injection" />
            <Fact id="ap2-injection" />
            <p className="note">
              <a href="/guardrails/01-data-or-instructions/">
                Telling data from instructions is Prompt injection &amp; guardrails’ chapter 1.
              </a>
            </p>
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
